"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || function (mod) {
    if (mod && mod.__esModule) return mod;
    var result = {};
    if (mod != null) for (var k in mod) if (k !== "default" && Object.prototype.hasOwnProperty.call(mod, k)) __createBinding(result, mod, k);
    __setModuleDefault(result, mod);
    return result;
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.CICDStack = void 0;
const cdk = __importStar(require("aws-cdk-lib"));
const codepipeline = __importStar(require("aws-cdk-lib/aws-codepipeline"));
const codepipeline_actions = __importStar(require("aws-cdk-lib/aws-codepipeline-actions"));
const codebuild = __importStar(require("aws-cdk-lib/aws-codebuild"));
const iam = __importStar(require("aws-cdk-lib/aws-iam"));
const s3 = __importStar(require("aws-cdk-lib/aws-s3"));
class CICDStack extends cdk.Stack {
    constructor(scope, id, props) {
        super(scope, id, props);
        const enableTesting = props.enableTesting ?? true;
        const enableDeployment = props.enableDeployment ?? true;
        // Create S3 bucket for artifacts
        this.artifactBucket = new s3.Bucket(this, 'ArtifactBucket', {
            bucketName: `${props.appName}-${props.environment}-artifacts-${cdk.Stack.of(this).account}`,
            versioned: true,
            removalPolicy: cdk.RemovalPolicy.DESTROY,
            autoDeleteObjects: true,
            encryption: s3.BucketEncryption.S3_MANAGED,
            blockPublicAccess: s3.BlockPublicAccess.BLOCK_ALL,
        });
        // Create CodeBuild project
        this.buildProject = new codebuild.PipelineProject(this, 'BuildProject', {
            projectName: `${props.appName}-${props.environment}-build`,
            environment: {
                buildImage: codebuild.LinuxBuildImage.STANDARD_7_0,
                privileged: true,
                computeType: codebuild.ComputeType.SMALL,
            },
            environmentVariables: {
                APP_NAME: {
                    value: props.appName,
                    type: codebuild.BuildEnvironmentVariableType.PLAINTEXT,
                },
                ENVIRONMENT: {
                    value: props.environment,
                    type: codebuild.BuildEnvironmentVariableType.PLAINTEXT,
                },
                ...props.buildEnvironment,
            },
            buildSpec: codebuild.BuildSpec.fromObject({
                version: '0.2',
                phases: {
                    pre_build: {
                        commands: [
                            'echo Logging in to Amazon ECR...',
                            'aws --version',
                            'aws ecr get-login-password --region $AWS_DEFAULT_REGION | docker login --username AWS --password-stdin $AWS_ACCOUNT_ID.dkr.ecr.$AWS_DEFAULT_REGION.amazonaws.com',
                            'COMMIT_HASH=$(echo $CODEBUILD_RESOLVED_SOURCE_VERSION | cut -c 1-7)',
                            'IMAGE_TAG=${COMMIT_HASH:=latest}',
                        ],
                    },
                    build: {
                        commands: [
                            'echo Build started on `date`',
                            'echo Building the Docker image...',
                            'docker build -t $APP_NAME:$IMAGE_TAG .',
                            'docker tag $APP_NAME:$IMAGE_TAG $AWS_ACCOUNT_ID.dkr.ecr.$AWS_DEFAULT_REGION.amazonaws.com/$APP_NAME:$IMAGE_TAG',
                            'docker tag $APP_NAME:$IMAGE_TAG $AWS_ACCOUNT_ID.dkr.ecr.$AWS_DEFAULT_REGION.amazonaws.com/$APP_NAME:latest',
                        ],
                    },
                    post_build: {
                        commands: [
                            'echo Build completed on `date`',
                            'echo Pushing the Docker image...',
                            'docker push $AWS_ACCOUNT_ID.dkr.ecr.$AWS_DEFAULT_REGION.amazonaws.com/$APP_NAME:$IMAGE_TAG',
                            'docker push $AWS_ACCOUNT_ID.dkr.ecr.$AWS_DEFAULT_REGION.amazonaws.com/$APP_NAME:latest',
                            'echo Writing image definitions file...',
                            'printf \'[{"name":"%s","imageUri":"%s"}]\' $APP_NAME $AWS_ACCOUNT_ID.dkr.ecr.$AWS_DEFAULT_REGION.amazonaws.com/$APP_NAME:$IMAGE_TAG > imagedefinitions.json',
                        ],
                    },
                },
                artifacts: {
                    files: ['imagedefinitions.json'],
                },
            }),
            cache: codebuild.Cache.local(codebuild.LocalCacheMode.DOCKER_LAYER),
        });
        // Grant permissions to build project
        this.buildProject.addToRolePolicy(new iam.PolicyStatement({
            effect: iam.Effect.ALLOW,
            actions: [
                'ecr:GetAuthorizationToken',
                'ecr:BatchCheckLayerAvailability',
                'ecr:GetDownloadUrlForLayer',
                'ecr:BatchGetImage',
                'ecr:PutImage',
                'ecr:InitiateLayerUpload',
                'ecr:UploadLayerPart',
                'ecr:CompleteLayerUpload',
            ],
            resources: ['*'],
        }));
        // Create CodePipeline
        this.pipeline = new codepipeline.Pipeline(this, 'Pipeline', {
            pipelineName: `${props.appName}-${props.environment}-pipeline`,
            artifactBucket: this.artifactBucket,
            crossAccountKeys: false,
        });
        // Source stage
        const sourceOutput = new codepipeline.Artifact();
        const sourceAction = new codepipeline_actions.CodeStarConnectionsSourceAction({
            actionName: 'Source',
            owner: props.sourceRepository.owner,
            repo: props.sourceRepository.repository,
            branch: props.sourceRepository.branch,
            connectionArn: props.sourceRepository.connectionArn || '',
            output: sourceOutput,
        });
        this.pipeline.addStage({
            stageName: 'Source',
            actions: [sourceAction],
        });
        // Build stage
        const buildOutput = new codepipeline.Artifact();
        const buildAction = new codepipeline_actions.CodeBuildAction({
            actionName: 'Build',
            project: this.buildProject,
            input: sourceOutput,
            outputs: [buildOutput],
            environmentVariables: {
                AWS_ACCOUNT_ID: {
                    value: cdk.Stack.of(this).account,
                    type: codebuild.BuildEnvironmentVariableType.PLAINTEXT,
                },
            },
        });
        this.pipeline.addStage({
            stageName: 'Build',
            actions: [buildAction],
        });
        // Testing stage (if enabled)
        if (enableTesting) {
            const testProject = new codebuild.PipelineProject(this, 'TestProject', {
                projectName: `${props.appName}-${props.environment}-test`,
                environment: {
                    buildImage: codebuild.LinuxBuildImage.STANDARD_7_0,
                    computeType: codebuild.ComputeType.SMALL,
                },
                buildSpec: codebuild.BuildSpec.fromObject({
                    version: '0.2',
                    phases: {
                        install: {
                            'runtime-versions': {
                                nodejs: '18',
                            },
                            commands: [
                                'npm install -g npm@latest',
                            ],
                        },
                        pre_build: {
                            commands: [
                                'echo Installing dependencies...',
                                'npm ci',
                            ],
                        },
                        build: {
                            commands: [
                                'echo Running tests...',
                                'npm test',
                                'echo Running linting...',
                                'npm run lint',
                                'echo Running type checking...',
                                'npm run build',
                            ],
                        },
                    },
                }),
            });
            const testAction = new codepipeline_actions.CodeBuildAction({
                actionName: 'Test',
                project: testProject,
                input: sourceOutput,
            });
            this.pipeline.addStage({
                stageName: 'Test',
                actions: [testAction],
            });
        }
        // Deploy stage (if enabled and ECS service provided)
        if (enableDeployment && props.ecsService) {
            const deployAction = new codepipeline_actions.EcsDeployAction({
                actionName: 'Deploy',
                service: props.ecsService,
                imageFile: buildOutput.atPath('imagedefinitions.json'),
                deploymentTimeout: cdk.Duration.minutes(60),
            });
            this.pipeline.addStage({
                stageName: 'Deploy',
                actions: [deployAction],
            });
        }
        // Add tags
        if (props.tags) {
            Object.entries(props.tags).forEach(([key, value]) => {
                cdk.Tags.of(this).add(key, value);
            });
        }
        // Add default tags
        cdk.Tags.of(this).add('Name', `${props.appName}-${props.environment}-cicd`);
        cdk.Tags.of(this).add('Purpose', 'CI/CD Pipeline');
        cdk.Tags.of(this).add('ManagedBy', 'CDK');
        // Outputs
        new cdk.CfnOutput(this, 'PipelineName', {
            value: this.pipeline.pipelineName,
            description: 'CodePipeline name',
            exportName: `${props.appName}-${props.environment}-PipelineName`,
        });
        new cdk.CfnOutput(this, 'PipelineArn', {
            value: this.pipeline.pipelineArn,
            description: 'CodePipeline ARN',
            exportName: `${props.appName}-${props.environment}-PipelineArn`,
        });
        new cdk.CfnOutput(this, 'BuildProjectName', {
            value: this.buildProject.projectName,
            description: 'CodeBuild project name',
            exportName: `${props.appName}-${props.environment}-BuildProjectName`,
        });
        new cdk.CfnOutput(this, 'ArtifactBucketName', {
            value: this.artifactBucket.bucketName,
            description: 'S3 artifact bucket name',
            exportName: `${props.appName}-${props.environment}-ArtifactBucketName`,
        });
    }
    /**
     * Add approval stage to the pipeline
     */
    addApprovalStage(stageName, notificationTopic) {
        const approvalAction = new codepipeline_actions.ManualApprovalAction({
            actionName: 'Approve',
            notificationTopic: notificationTopic ? undefined : undefined,
            externalEntityLink: 'https://console.aws.amazon.com/codepipeline/',
        });
        this.pipeline.addStage({
            stageName,
            actions: [approvalAction],
        });
    }
    /**
     * Add custom stage to the pipeline
     */
    addCustomStage(stageName, actions) {
        this.pipeline.addStage({
            stageName,
            actions,
        });
    }
    /**
     * Grant permissions to the build project
     */
    grantBuildPermissions(permissions) {
        this.buildProject.addToRolePolicy(permissions);
    }
}
exports.CICDStack = CICDStack;
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiY2ljZC1zdGFjay5qcyIsInNvdXJjZVJvb3QiOiIiLCJzb3VyY2VzIjpbIi4uLy4uLy4uL3NyYy9jb25zdHJ1Y3RzL2NpY2QvY2ljZC1zdGFjay50cyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiOzs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7OztBQUFBLGlEQUFtQztBQUNuQywyRUFBNkQ7QUFDN0QsMkZBQTZFO0FBQzdFLHFFQUF1RDtBQUN2RCx5REFBMkM7QUFDM0MsdURBQXlDO0FBa0V6QyxNQUFhLFNBQVUsU0FBUSxHQUFHLENBQUMsS0FBSztJQUt0QyxZQUFZLEtBQWdCLEVBQUUsRUFBVSxFQUFFLEtBQXFCO1FBQzdELEtBQUssQ0FBQyxLQUFLLEVBQUUsRUFBRSxFQUFFLEtBQUssQ0FBQyxDQUFDO1FBRXhCLE1BQU0sYUFBYSxHQUFHLEtBQUssQ0FBQyxhQUFhLElBQUksSUFBSSxDQUFDO1FBQ2xELE1BQU0sZ0JBQWdCLEdBQUcsS0FBSyxDQUFDLGdCQUFnQixJQUFJLElBQUksQ0FBQztRQUV4RCxpQ0FBaUM7UUFDakMsSUFBSSxDQUFDLGNBQWMsR0FBRyxJQUFJLEVBQUUsQ0FBQyxNQUFNLENBQUMsSUFBSSxFQUFFLGdCQUFnQixFQUFFO1lBQzFELFVBQVUsRUFBRSxHQUFHLEtBQUssQ0FBQyxPQUFPLElBQUksS0FBSyxDQUFDLFdBQVcsY0FBYyxHQUFHLENBQUMsS0FBSyxDQUFDLEVBQUUsQ0FBQyxJQUFJLENBQUMsQ0FBQyxPQUFPLEVBQUU7WUFDM0YsU0FBUyxFQUFFLElBQUk7WUFDZixhQUFhLEVBQUUsR0FBRyxDQUFDLGFBQWEsQ0FBQyxPQUFPO1lBQ3hDLGlCQUFpQixFQUFFLElBQUk7WUFDdkIsVUFBVSxFQUFFLEVBQUUsQ0FBQyxnQkFBZ0IsQ0FBQyxVQUFVO1lBQzFDLGlCQUFpQixFQUFFLEVBQUUsQ0FBQyxpQkFBaUIsQ0FBQyxTQUFTO1NBQ2xELENBQUMsQ0FBQztRQUVILDJCQUEyQjtRQUMzQixJQUFJLENBQUMsWUFBWSxHQUFHLElBQUks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Q25FLENBQUMsQ0FBQztRQUVILElBQUksQ0FBQyxRQUFRLENBQUMsUUFBUSxDQUFDO1lBQ3JCLFNBQVM7WUFDVCxPQUFPLEVBQUUsQ0FBQyxjQUFjLENBQUM7U0FDMUIsQ0FBQyxDQUFDO0lBQ0wsQ0FBQztJQUVEOztPQUVHO0lBQ0ksY0FBYyxDQUFDLFNBQWlCLEVBQUUsT0FBK0I7UUFDdEUsSUFBSSxDQUFDLFFBQVEsQ0FBQyxRQUFRLENBQUM7WUFDckIsU0FBUztZQUNULE9BQU87U0FDUixDQUFDLENBQUM7SUFDTCxDQUFDO0lBRUQ7O09BRUc7SUFDSSxxQkFBcUIsQ0FBQyxXQUFnQztRQUMzRCxJQUFJLENBQUMsWUFBWSxDQUFDLGVBQWUsQ0FBQyxXQUFXLENBQUMsQ0FBQztJQUNqRCxDQUFDO0NBQ0Y7QUFwUkQsOEJBb1JDIiwic291cmNlc0NvbnRlbnQiOlsiaW1wb3J0ICogYXMgY2RrIGZyb20gJ2F3cy1jZGstbGliJztcbmltcG9ydCAqIGFzIGNvZGVwaXBlbGluZSBmcm9tICdhd3MtY2RrLWxpYi9hd3MtY29kZXBpcGVsaW5lJztcbmltcG9ydCAqIGFzIGNvZGVwaXBlbGluZV9hY3Rpb25zIGZyb20gJ2F3cy1jZGstbGliL2F3cy1jb2RlcGlwZWxpbmUtYWN0aW9ucyc7XG5pbXBvcnQgKiBhcyBjb2RlYnVpbGQgZnJvbSAnYXdzLWNkay1saWIvYXdzLWNvZGVidWlsZCc7XG5pbXBvcnQgKiBhcyBpYW0gZnJvbSAnYXdzLWNkay1saWIvYXdzLWlhbSc7XG5pbXBvcnQgKiBhcyBzMyBmcm9tICdhd3MtY2RrLWxpYi9hd3MtczMnO1xuaW1wb3J0ICogYXMgZWNyIGZyb20gJ2F3cy1jZGstbGliL2F3cy1lY3InO1xuaW1wb3J0ICogYXMgZWNzIGZyb20gJ2F3cy1jZGstbGliL2F3cy1lY3MnO1xuaW1wb3J0IHsgQ29uc3RydWN0IH0gZnJvbSAnY29uc3RydWN0cyc7XG5cbmV4cG9ydCBpbnRlcmZhY2UgQ0lDRFN0YWNrUHJvcHMgZXh0ZW5kcyBjZGsuU3RhY2tQcm9wcyB7XG4gIC8qKlxuICAgKiBBcHBsaWNhdGlvbiBuYW1lIGZvciByZXNvdXJjZSBuYW1pbmdcbiAgICovXG4gIGFwcE5hbWU6IHN0cmluZztcbiAgXG4gIC8qKlxuICAgKiBFbnZpcm9ubWVudCBuYW1lXG4gICAqL1xuICBlbnZpcm9ubWVudDogc3RyaW5nO1xuICBcbiAgLyoqXG4gICAqIFNvdXJjZSByZXBvc2l0b3J5IGluZm9ybWF0aW9uXG4gICAqL1xuICBzb3VyY2VSZXBvc2l0b3J5OiB7XG4gICAgb3duZXI6IHN0cmluZztcbiAgICByZXBvc2l0b3J5OiBzdHJpbmc7XG4gICAgYnJhbmNoOiBzdHJpbmc7XG4gICAgY29ubmVjdGlvbkFybj86IHN0cmluZzsgLy8gRm9yIENvZGVTdGFyIGNvbm5lY3Rpb25zXG4gIH07XG4gIFxuICAvKipcbiAgICogRUNSIHJlcG9zaXRvcnkgZm9yIERvY2tlciBpbWFnZXNcbiAgICovXG4gIGVjclJlcG9zaXRvcnk/OiBlY3IuSVJlcG9zaXRvcnk7XG4gIFxuICAvKipcbiAgICogRUNTIGNsdXN0ZXIgZm9yIGRlcGxveW1lbnRcbiAgICovXG4gIGVjc0NsdXN0ZXI/OiBlY3MuSUNsdXN0ZXI7XG4gIFxuICAvKipcbiAgICogRUNTIHNlcnZpY2UgZm9yIGRlcGxveW1lbnRcbiAgICovXG4gIGVjc1NlcnZpY2U/OiBlY3MuSUZhcmdhdGVTZXJ2aWNlO1xuICBcbiAgLyoqXG4gICAqIFdoZXRoZXIgdG8gZW5hYmxlIGF1dG9tYXRlZCB0ZXN0aW5nXG4gICAqIEBkZWZhdWx0IHRydWVcbiAgICovXG4gIGVuYWJsZVRlc3Rpbmc/OiBib29sZWFuO1xuICBcbiAgLyoqXG4gICAqIFdoZXRoZXIgdG8gZW5hYmxlIGF1dG9tYXRlZCBkZXBsb3ltZW50XG4gICAqIEBkZWZhdWx0IHRydWVcbiAgICovXG4gIGVuYWJsZURlcGxveW1lbnQ/OiBib29sZWFuO1xuICBcbiAgLyoqXG4gICAqIEJ1aWxkIGVudmlyb25tZW50IHZhcmlhYmxlc1xuICAgKi9cbiAgYnVpbGRFbnZpcm9ubWVudD86IHtcbiAgICBba2V5OiBzdHJpbmddOiBzdHJpbmc7XG4gIH07XG4gIFxuICAvKipcbiAgICogVGFncyB0byBhcHBseSB0byByZXNvdXJjZXNcbiAgICovXG4gIHRhZ3M/OiB7IFtrZXk6IHN0cmluZ106IHN0cmluZyB9O1xufVxuXG5leHBvcnQgY2xhc3MgQ0lDRFN0YWNrIGV4dGVuZHMgY2RrLlN0YWNrIHtcbiAgcHVibGljIHJlYWRvbmx5IHBpcGVsaW5lOiBjb2RlcGlwZWxpbmUuUGlwZWxpbmU7XG4gIHB1YmxpYyByZWFkb25seSBidWlsZFByb2plY3Q6IGNvZGVidWlsZC5QaXBlbGluZVByb2plY3Q7XG4gIHB1YmxpYyByZWFkb25seSBhcnRpZmFjdEJ1Y2tldDogczMuQnVja2V0O1xuXG4gIGNvbnN0cnVjdG9yKHNjb3BlOiBDb25zdHJ1Y3QsIGlkOiBzdHJpbmcsIHByb3BzOiBDSUNEU3RhY2tQcm9wcykge1xuICAgIHN1cGVyKHNjb3BlLCBpZCwgcHJvcHMpO1xuXG4gICAgY29uc3QgZW5hYmxlVGVzdGluZyA9IHByb3BzLmVuYWJsZVRlc3RpbmcgPz8gdHJ1ZTtcbiAgICBjb25zdCBlbmFibGVEZXBsb3ltZW50ID0gcHJvcHMuZW5hYmxlRGVwbG95bWVudCA/PyB0cnVlO1xuXG4gICAgLy8gQ3JlYXRlIFMzIGJ1Y2tldCBmb3IgYXJ0aWZhY3RzXG4gICAgdGhpcy5hcnRpZmFjdEJ1Y2tldCA9IG5ldyBzMy5CdWNrZXQodGhpcywgJ0FydGlmYWN0QnVja2V0Jywge1xuICAgICAgYnVja2V0TmFtZTogYCR7cHJvcHMuYXBwTmFtZX0tJHtwcm9wcy5lbnZpcm9ubWVudH0tYXJ0aWZhY3RzLSR7Y2RrLlN0YWNrLm9mKHRoaXMpLmFjY291bnR9YCxcbiAgICAgIHZlcnNpb25lZDogdHJ1ZSxcbiAgICAgIHJlbW92YWxQb2xpY3k6IGNkay5SZW1vdmFsUG9saWN5LkRFU1RST1ksXG4gICAgICBhdXRvRGVsZXRlT2JqZWN0czogdHJ1ZSxcbiAgICAgIGVuY3J5cHRpb246IHMzLkJ1Y2tldEVuY3J5cHRpb24uUzNfTUFOQUdFRCxcbiAgICAgIGJsb2NrUHVibGljQWNjZXNzOiBzMy5CbG9ja1B1YmxpY0FjY2Vzcy5CTE9DS19BTEwsXG4gICAgfSk7XG5cbiAgICAvLyBDcmVhdGUgQ29kZUJ1aWxkIHByb2plY3RcbiAgICB0aGlzLmJ1aWxkUHJvamVjdCA9IG5ldyBjb2RlYnVpbGQuUGlwZWxpbmVQcm9qZWN0KHRoaXMsICdCdWlsZFByb2plY3QnLCB7XG4gICAgICBwcm9qZWN0TmFtZTogYCR7cHJvcHMuYXBwTmFtZX0tJHtwcm9wcy5lbnZpcm9ubWVudH0tYnVpbGRgLFxuICAgICAgZW52aXJvbm1lbnQ6IHtcbiAgICAgICAgYnVpbGRJbWFnZTogY29kZWJ1aWxkLkxpbnV4QnVpbGRJbWFnZS5TVEFOREFSRF83XzAsXG4gICAgICAgIHByaXZpbGVnZWQ6IHRydWUsIC8vIFJlcXVpcmVkIGZvciBEb2NrZXIgYnVpbGRzXG4gICAgICAgIGNvbXB1dGVUeXBlOiBjb2RlYnVpbGQuQ29tcHV0ZVR5cGUuU01BTEwsXG4gICAgICB9LFxuICAgICAgZW52aXJvbm1lbnRWYXJpYWJsZXM6IHtcbiAgICAgICAgQVBQX05BTUU6IHtcbiAgICAgICAgICB2YWx1ZTogcHJvcHMuYXBwTmFtZSxcbiAgICAgICAgICB0eXBlOiBjb2RlYnVpbGQuQnVpbGRFbnZpcm9ubWVudFZhcmlhYmxlVHlwZS5QTEFJTlRFWFQsXG4gICAgICAgIH0sXG4gICAgICAgIEVOVklST05NRU5UOiB7XG4gICAgICAgICAgdmFsdWU6IHByb3BzLmVudmlyb25tZW50LFxuICAgICAgICAgIHR5cGU6IGNvZGVidWlsZC5CdWlsZEVudmlyb25tZW50VmFyaWFibGVUeXBlLlBMQUlOVEVYVCxcbiAgICAgICAgfSxcbiAgICAgICAgLi4ucHJvcHMuYnVpbGRFbnZpcm9ubWVudCxcbiAgICAgIH0sXG4gICAgICBidWlsZFNwZWM6IGNvZGVidWlsZC5CdWlsZFNwZWMuZnJvbU9iamVjdCh7XG4gICAgICAgIHZlcnNpb246ICcwLjInLFxuICAgICAgICBwaGFzZXM6IHtcbiAgICAgICAgICBwcmVfYnVpbGQ6IHtcbiAgICAgICAgICAgIGNvbW1hbmRzOiBbXG4gICAgICAgICAgICAgICdlY2hvIExvZ2dpbmcgaW4gdG8gQW1hem9uIEVDUi4uLicsXG4gICAgICAgICAgICAgICdhd3MgLS12ZXJzaW9uJyxcbiAgICAgICAgICAgICAgJ2F3cyBlY3IgZ2V0LWxvZ2luLXBhc3N3b3JkIC0tcmVnaW9uICRBV1NfREVGQVVMVF9SRUdJT04gfCBkb2NrZXIgbG9naW4gLS11c2VybmFtZSBBV1MgLS1wYXNzd29yZC1zdGRpbiAkQVdTX0FDQ09VTlRfSUQuZGtyLmVjci4kQVdTX0RFRkFVTFRfUkVHSU9OLmFtYXpvbmF3cy5jb20nLFxuICAgICAgICAgICAgICAnQ09NTUlUX0hBU0g9JChlY2hvICRDT0RFQlVJTERfUkVTT0xWRURfU09VUkNFX1ZFUlNJT04gfCBjdXQgLWMgMS03KScsXG4gICAgICAgICAgICAgICdJTUFHRV9UQUc9JHtDT01NSVRfSEFTSDo9bGF0ZXN0fScsXG4gICAgICAgICAgICBdLFxuICAgICAgICAgIH0sXG4gICAgICAgICAgYnVpbGQ6IHtcbiAgICAgICAgICAgIGNvbW1hbmRzOiBbXG4gICAgICAgICAgICAgICdlY2hvIEJ1aWxkIHN0YXJ0ZWQgb24gYGRhdGVgJyxcbiAgICAgICAgICAgICAgJ2VjaG8gQnVpbGRpbmcgdGhlIERvY2tlciBpbWFnZS4uLicsXG4gICAgICAgICAgICAgICdkb2NrZXIgYnVpbGQgLXQgJEFQUF9OQU1FOiRJTUFHRV9UQUcgLicsXG4gICAgICAgICAgICAgICdkb2NrZXIgdGFnICRBUFBfTkFNRTokSU1BR0VfVEFHICRBV1NfQUNDT1VOVF9JRC5ka3IuZWNyLiRBV1NfREVGQVVMVF9SRUdJT04uYW1hem9uYXdzLmNvbS8kQVBQX05BTUU6JElNQUdFX1RBRycsXG4gICAgICAgICAgICAgICdkb2NrZXIgdGFnICRBUFBfTkFNRTokSU1BR0VfVEFHICRBV1NfQUNDT1VOVF9JRC5ka3IuZWNyLiRBV1NfREVGQVVMVF9SRUdJT04uYW1hem9uYXdzLmNvbS8kQVBQX05BTUU6bGF0ZXN0JyxcbiAgICAgICAgICAgIF0sXG4gICAgICAgICAgfSxcbiAgICAgICAgICBwb3N0X2J1aWxkOiB7XG4gICAgICAgICAgICBjb21tYW5kczogW1xuICAgICAgICAgICAgICAnZWNobyBCdWlsZCBjb21wbGV0ZWQgb24gYGRhdGVgJyxcbiAgICAgICAgICAgICAgJ2VjaG8gUHVzaGluZyB0aGUgRG9ja2VyIGltYWdlLi4uJyxcbiAgICAgICAgICAgICAgJ2RvY2tlciBwdXNoICRBV1NfQUNDT1VOVF9JRC5ka3IuZWNyLiRBV1NfREVGQVVMVF9SRUdJT04uYW1hem9uYXdzLmNvbS8kQVBQX05BTUU6JElNQUdFX1RBRycsXG4gICAgICAgICAgICAgICdkb2NrZXIgcHVzaCAkQVdTX0FDQ09VTlRfSUQuZGtyLmVjci4kQVdTX0RFRkFVTFRfUkVHSU9OLmFtYXpvbmF3cy5jb20vJEFQUF9OQU1FOmxhdGVzdCcsXG4gICAgICAgICAgICAgICdlY2hvIFdyaXRpbmcgaW1hZ2UgZGVmaW5pdGlvbnMgZmlsZS4uLicsXG4gICAgICAgICAgICAgICdwcmludGYgXFwnW3tcIm5hbWVcIjpcIiVzXCIsXCJpbWFnZVVyaVwiOlwiJXNcIn1dXFwnICRBUFBfTkFNRSAkQVdTX0FDQ09VTlRfSUQuZGtyLmVjci4kQVdTX0RFRkFVTFRfUkVHSU9OLmFtYXpvbmF3cy5jb20vJEFQUF9OQU1FOiRJTUFHRV9UQUcgPiBpbWFnZWRlZmluaXRpb25zLmpzb24nLFxuICAgICAgICAgICAgXSxcbiAgICAgICAgICB9LFxuICAgICAgICB9LFxuICAgICAgICBhcnRpZmFjdHM6IHtcbiAgICAgICAgICBmaWxlczogWydpbWFnZWRlZmluaXRpb25zLmpzb24nXSxcbiAgICAgICAgfSxcbiAgICAgIH0pLFxuICAgICAgY2FjaGU6IGNvZGVidWlsZC5DYWNoZS5sb2NhbChjb2RlYnVpbGQuTG9jYWxDYWNoZU1vZGUuRE9DS0VSX0xBWUVSKSxcbiAgICB9KTtcblxuICAgIC8vIEdyYW50IHBlcm1pc3Npb25zIHRvIGJ1aWxkIHByb2plY3RcbiAgICB0aGlzLmJ1aWxkUHJvamVjdC5hZGRUb1JvbGVQb2xpY3koXG4gICAgICBuZXcgaWFtLlBvbGljeVN0YXRlbWVudCh7XG4gICAgICAgIGVmZmVjdDogaWFtLkVmZmVjdC5BTExPVyxcbiAgICAgICAgYWN0aW9uczogW1xuICAgICAgICAgICdlY3I6R2V0QXV0aG9yaXphdGlvblRva2VuJyxcbiAgICAgICAgICAnZWNyOkJhdGNoQ2hlY2tMYXllckF2YWlsYWJpbGl0eScsXG4gICAgICAgICAgJ2VjcjpHZXREb3dubG9hZFVybEZvckxheWVyJyxcbiAgICAgICAgICAnZWNyOkJhdGNoR2V0SW1hZ2UnLFxuICAgICAgICAgICdlY3I6UHV0SW1hZ2UnLFxuICAgICAgICAgICdlY3I6SW5pdGlhdGVMYXllclVwbG9hZCcsXG4gICAgICAgICAgJ2VjcjpVcGxvYWRMYXllclBhcnQnLFxuICAgICAgICAgICdlY3I6Q29tcGxldGVMYXllclVwbG9hZCcsXG4gICAgICAgIF0sXG4gICAgICAgIHJlc291cmNlczogWycqJ10sXG4gICAgICB9KVxuICAgICk7XG5cbiAgICAvLyBDcmVhdGUgQ29kZVBpcGVsaW5lXG4gICAgdGhpcy5waXBlbGluZSA9IG5ldyBjb2RlcGlwZWxpbmUuUGlwZWxpbmUodGhpcywgJ1BpcGVsaW5lJywge1xuICAgICAgcGlwZWxpbmVOYW1lOiBgJHtwcm9wcy5hcHBOYW1lfS0ke3Byb3BzLmVudmlyb25tZW50fS1waXBlbGluZWAsXG4gICAgICBhcnRpZmFjdEJ1Y2tldDogdGhpcy5hcnRpZmFjdEJ1Y2tldCxcbiAgICAgIGNyb3NzQWNjb3VudEtleXM6IGZhbHNlLFxuICAgIH0pO1xuXG4gICAgLy8gU291cmNlIHN0YWdlXG4gICAgY29uc3Qgc291cmNlT3V0cHV0ID0gbmV3IGNvZGVwaXBlbGluZS5BcnRpZmFjdCgpO1xuICAgIGNvbnN0IHNvdXJjZUFjdGlvbiA9IG5ldyBjb2RlcGlwZWxpbmVfYWN0aW9ucy5Db2RlU3RhckNvbm5lY3Rpb25zU291cmNlQWN0aW9uKHtcbiAgICAgIGFjdGlvbk5hbWU6ICdTb3VyY2UnLFxuICAgICAgb3duZXI6IHByb3BzLnNvdXJjZVJlcG9zaXRvcnkub3duZXIsXG4gICAgICByZXBvOiBwcm9wcy5zb3VyY2VSZXBvc2l0b3J5LnJlcG9zaXRvcnksXG4gICAgICBicmFuY2g6IHByb3BzLnNvdXJjZVJlcG9zaXRvcnkuYnJhbmNoLFxuICAgICAgY29ubmVjdGlvbkFybjogcHJvcHMuc291cmNlUmVwb3NpdG9yeS5jb25uZWN0aW9uQXJuIHx8ICcnLFxuICAgICAgb3V0cHV0OiBzb3VyY2VPdXRwdXQsXG4gICAgfSk7XG5cbiAgICB0aGlzLnBpcGVsaW5lLmFkZFN0YWdlKHtcbiAgICAgIHN0YWdlTmFtZTogJ1NvdXJjZScsXG4gICAgICBhY3Rpb25zOiBbc291cmNlQWN0aW9uXSxcbiAgICB9KTtcblxuICAgIC8vIEJ1aWxkIHN0YWdlXG4gICAgY29uc3QgYnVpbGRPdXRwdXQgPSBuZXcgY29kZXBpcGVsaW5lLkFydGlmYWN0KCk7XG4gICAgY29uc3QgYnVpbGRBY3Rpb24gPSBuZXcgY29kZXBpcGVsaW5lX2FjdGlvbnMuQ29kZUJ1aWxkQWN0aW9uKHtcbiAgICAgIGFjdGlvbk5hbWU6ICdCdWlsZCcsXG4gICAgICBwcm9qZWN0OiB0aGlzLmJ1aWxkUHJvamVjdCxcbiAgICAgIGlucHV0OiBzb3VyY2VPdXRwdXQsXG4gICAgICBvdXRwdXRzOiBbYnVpbGRPdXRwdXRdLFxuICAgICAgZW52aXJvbm1lbnRWYXJpYWJsZXM6IHtcbiAgICAgICAgQVdTX0FDQ09VTlRfSUQ6IHtcbiAgICAgICAgICB2YWx1ZTogY2RrLlN0YWNrLm9mKHRoaXMpLmFjY291bnQsXG4gICAgICAgICAgdHlwZTogY29kZWJ1aWxkLkJ1aWxkRW52aXJvbm1lbnRWYXJpYWJsZVR5cGUuUExBSU5URVhULFxuICAgICAgICB9LFxuICAgICAgfSxcbiAgICB9KTtcblxuICAgIHRoaXMucGlwZWxpbmUuYWRkU3RhZ2Uoe1xuICAgICAgc3RhZ2VOYW1lOiAnQnVpbGQnLFxuICAgICAgYWN0aW9uczogW2J1aWxkQWN0aW9uXSxcbiAgICB9KTtcblxuICAgIC8vIFRlc3Rpbmcgc3RhZ2UgKGlmIGVuYWJsZWQpXG4gICAgaWYgKGVuYWJsZVRlc3RpbmcpIHtcbiAgICAgIGNvbnN0IHRlc3RQcm9qZWN0ID0gbmV3IGNvZGVidWlsZC5QaXBlbGluZVByb2plY3QodGhpcywgJ1Rlc3RQcm9qZWN0Jywge1xuICAgICAgICBwcm9qZWN0TmFtZTogYCR7cHJvcHMuYXBwTmFtZX0tJHtwcm9wcy5lbnZpcm9ubWVudH0tdGVzdGAsXG4gICAgICAgIGVudmlyb25tZW50OiB7XG4gICAgICAgICAgYnVpbGRJbWFnZTogY29kZWJ1aWxkLkxpbnV4QnVpbGRJbWFnZS5TVEFOREFSRF83XzAsXG4gICAgICAgICAgY29tcHV0ZVR5cGU6IGNvZGVidWlsZC5Db21wdXRlVHlwZS5TTUFMTCxcbiAgICAgICAgfSxcbiAgICAgICAgYnVpbGRTcGVjOiBjb2RlYnVpbGQuQnVpbGRTcGVjLmZyb21PYmplY3Qoe1xuICAgICAgICAgIHZlcnNpb246ICcwLjInLFxuICAgICAgICAgIHBoYXNlczoge1xuICAgICAgICAgICAgaW5zdGFsbDoge1xuICAgICAgICAgICAgICAncnVudGltZS12ZXJzaW9ucyc6IHtcbiAgICAgICAgICAgICAgICBub2RlanM6ICcxOCcsXG4gICAgICAgICAgICAgIH0sXG4gICAgICAgICAgICAgIGNvbW1hbmRzOiBbXG4gICAgICAgICAgICAgICAgJ25wbSBpbnN0YWxsIC1nIG5wbUBsYXRlc3QnLFxuICAgICAgICAgICAgICBdLFxuICAgICAgICAgICAgfSxcbiAgICAgICAgICAgIHByZV9idWlsZDoge1xuICAgICAgICAgICAgICBjb21tYW5kczogW1xuICAgICAgICAgICAgICAgICdlY2hvIEluc3RhbGxpbmcgZGVwZW5kZW5jaWVzLi4uJyxcbiAgICAgICAgICAgICAgICAnbnBtIGNpJyxcbiAgICAgICAgICAgICAgXSxcbiAgICAgICAgICAgIH0sXG4gICAgICAgICAgICBidWlsZDoge1xuICAgICAgICAgICAgICBjb21tYW5kczogW1xuICAgICAgICAgICAgICAgICdlY2hvIFJ1bm5pbmcgdGVzdHMuLi4nLFxuICAgICAgICAgICAgICAgICducG0gdGVzdCcsXG4gICAgICAgICAgICAgICAgJ2VjaG8gUnVubmluZyBsaW50aW5nLi4uJyxcbiAgICAgICAgICAgICAgICAnbnBtIHJ1biBsaW50JyxcbiAgICAgICAgICAgICAgICAnZWNobyBSdW5uaW5nIHR5cGUgY2hlY2tpbmcuLi4nLFxuICAgICAgICAgICAgICAgICducG0gcnVuIGJ1aWxkJyxcbiAgICAgICAgICAgICAgXSxcbiAgICAgICAgICAgIH0sXG4gICAgICAgICAgfSxcbiAgICAgICAgfSksXG4gICAgICB9KTtcblxuICAgICAgY29uc3QgdGVzdEFjdGlvbiA9IG5ldyBjb2RlcGlwZWxpbmVfYWN0aW9ucy5Db2RlQnVpbGRBY3Rpb24oe1xuICAgICAgICBhY3Rpb25OYW1lOiAnVGVzdCcsXG4gICAgICAgIHByb2plY3Q6IHRlc3RQcm9qZWN0LFxuICAgICAgICBpbnB1dDogc291cmNlT3V0cHV0LFxuICAgICAgfSk7XG5cbiAgICAgIHRoaXMucGlwZWxpbmUuYWRkU3RhZ2Uoe1xuICAgICAgICBzdGFnZU5hbWU6ICdUZXN0JyxcbiAgICAgICAgYWN0aW9uczogW3Rlc3RBY3Rpb25dLFxuICAgICAgfSk7XG4gICAgfVxuXG4gICAgLy8gRGVwbG95IHN0YWdlIChpZiBlbmFibGVkIGFuZCBFQ1Mgc2VydmljZSBwcm92aWRlZClcbiAgICBpZiAoZW5hYmxlRGVwbG95bWVudCAmJiBwcm9wcy5lY3NTZXJ2aWNlKSB7XG4gICAgICBjb25zdCBkZXBsb3lBY3Rpb24gPSBuZXcgY29kZXBpcGVsaW5lX2FjdGlvbnMuRWNzRGVwbG95QWN0aW9uKHtcbiAgICAgICAgYWN0aW9uTmFtZTogJ0RlcGxveScsXG4gICAgICAgIHNlcnZpY2U6IHByb3BzLmVjc1NlcnZpY2UgYXMgZWNzLkZhcmdhdGVTZXJ2aWNlLFxuICAgICAgICBpbWFnZUZpbGU6IGJ1aWxkT3V0cHV0LmF0UGF0aCgnaW1hZ2VkZWZpbml0aW9ucy5qc29uJyksXG4gICAgICAgIGRlcGxveW1lbnRUaW1lb3V0OiBjZGsuRHVyYXRpb24ubWludXRlcyg2MCksXG4gICAgICB9KTtcblxuICAgICAgdGhpcy5waXBlbGluZS5hZGRTdGFnZSh7XG4gICAgICAgIHN0YWdlTmFtZTogJ0RlcGxveScsXG4gICAgICAgIGFjdGlvbnM6IFtkZXBsb3lBY3Rpb25dLFxuICAgICAgfSk7XG4gICAgfVxuXG4gICAgLy8gQWRkIHRhZ3NcbiAgICBpZiAocHJvcHMudGFncykge1xuICAgICAgT2JqZWN0LmVudHJpZXMocHJvcHMudGFncykuZm9yRWFjaCgoW2tleSwgdmFsdWVdKSA9PiB7XG4gICAgICAgIGNkay5UYWdzLm9mKHRoaXMpLmFkZChrZXksIHZhbHVlKTtcbiAgICAgIH0pO1xuICAgIH1cblxuICAgIC8vIEFkZCBkZWZhdWx0IHRhZ3NcbiAgICBjZGsuVGFncy5vZih0aGlzKS5hZGQoJ05hbWUnLCBgJHtwcm9wcy5hcHBOYW1lfS0ke3Byb3BzLmVudmlyb25tZW50fS1jaWNkYCk7XG4gICAgY2RrLlRhZ3Mub2YodGhpcykuYWRkKCdQdXJwb3NlJywgJ0NJL0NEIFBpcGVsaW5lJyk7XG4gICAgY2RrLlRhZ3Mub2YodGhpcykuYWRkKCdNYW5hZ2VkQnknLCAnQ0RLJyk7XG5cbiAgICAvLyBPdXRwdXRzXG4gICAgbmV3IGNkay5DZm5PdXRwdXQodGhpcywgJ1BpcGVsaW5lTmFtZScsIHtcbiAgICAgIHZhbHVlOiB0aGlzLnBpcGVsaW5lLnBpcGVsaW5lTmFtZSxcbiAgICAgIGRlc2NyaXB0aW9uOiAnQ29kZVBpcGVsaW5lIG5hbWUnLFxuICAgICAgZXhwb3J0TmFtZTogYCR7cHJvcHMuYXBwTmFtZX0tJHtwcm9wcy5lbnZpcm9ubWVudH0tUGlwZWxpbmVOYW1lYCxcbiAgICB9KTtcblxuICAgIG5ldyBjZGsuQ2ZuT3V0cHV0KHRoaXMsICdQaXBlbGluZUFybicsIHtcbiAgICAgIHZhbHVlOiB0aGlzLnBpcGVsaW5lLnBpcGVsaW5lQXJuLFxuICAgICAgZGVzY3JpcHRpb246ICdDb2RlUGlwZWxpbmUgQVJOJyxcbiAgICAgIGV4cG9ydE5hbWU6IGAke3Byb3BzLmFwcE5hbWV9LSR7cHJvcHMuZW52aXJvbm1lbnR9LVBpcGVsaW5lQXJuYCxcbiAgICB9KTtcblxuICAgIG5ldyBjZGsuQ2ZuT3V0cHV0KHRoaXMsICdCdWlsZFByb2plY3ROYW1lJywge1xuICAgICAgdmFsdWU6IHRoaXMuYnVpbGRQcm9qZWN0LnByb2plY3ROYW1lLFxuICAgICAgZGVzY3JpcHRpb246ICdDb2RlQnVpbGQgcHJvamVjdCBuYW1lJyxcbiAgICAgIGV4cG9ydE5hbWU6IGAke3Byb3BzLmFwcE5hbWV9LSR7cHJvcHMuZW52aXJvbm1lbnR9LUJ1aWxkUHJvamVjdE5hbWVgLFxuICAgIH0pO1xuXG4gICAgbmV3IGNkay5DZm5PdXRwdXQodGhpcywgJ0FydGlmYWN0QnVja2V0TmFtZScsIHtcbiAgICAgIHZhbHVlOiB0aGlzLmFydGlmYWN0QnVja2V0LmJ1Y2tldE5hbWUsXG4gICAgICBkZXNjcmlwdGlvbjogJ1MzIGFydGlmYWN0IGJ1Y2tldCBuYW1lJyxcbiAgICAgIGV4cG9ydE5hbWU6IGAke3Byb3BzLmFwcE5hbWV9LSR7cHJvcHMuZW52aXJvbm1lbnR9LUFydGlmYWN0QnVja2V0TmFtZWAsXG4gICAgfSk7XG4gIH1cblxuICAvKipcbiAgICogQWRkIGFwcHJvdmFsIHN0YWdlIHRvIHRoZSBwaXBlbGluZVxuICAgKi9cbiAgcHVibGljIGFkZEFwcHJvdmFsU3RhZ2Uoc3RhZ2VOYW1lOiBzdHJpbmcsIG5vdGlmaWNhdGlvblRvcGljPzogc3RyaW5nKTogdm9pZCB7XG4gICAgY29uc3QgYXBwcm92YWxBY3Rpb24gPSBuZXcgY29kZXBpcGVsaW5lX2FjdGlvbnMuTWFudWFsQXBwcm92YWxBY3Rpb24oe1xuICAgICAgYWN0aW9uTmFtZTogJ0FwcHJvdmUnLFxuICAgICAgbm90aWZpY2F0aW9uVG9waWM6IG5vdGlmaWNhdGlvblRvcGljID8gdW5kZWZpbmVkIDogdW5kZWZpbmVkLCAvLyBUT0RPOiBBZGQgU05TIHRvcGljIHN1cHBvcnRcbiAgICAgIGV4dGVybmFsRW50aXR5TGluazogJ2h0dHBzOi8vY29uc29sZS5hd3MuYW1hem9uLmNvbS9jb2RlcGlwZWxpbmUvJyxcbiAgICB9KTtcblxuICAgIHRoaXMucGlwZWxpbmUuYWRkU3RhZ2Uoe1xuICAgICAgc3RhZ2VOYW1lLFxuICAgICAgYWN0aW9uczogW2FwcHJvdmFsQWN0aW9uXSxcbiAgICB9KTtcbiAgfVxuXG4gIC8qKlxuICAgKiBBZGQgY3VzdG9tIHN0YWdlIHRvIHRoZSBwaXBlbGluZVxuICAgKi9cbiAgcHVibGljIGFkZEN1c3RvbVN0YWdlKHN0YWdlTmFtZTogc3RyaW5nLCBhY3Rpb25zOiBjb2RlcGlwZWxpbmUuSUFjdGlvbltdKTogdm9pZCB7XG4gICAgdGhpcy5waXBlbGluZS5hZGRTdGFnZSh7XG4gICAgICBzdGFnZU5hbWUsXG4gICAgICBhY3Rpb25zLFxuICAgIH0pO1xuICB9XG5cbiAgLyoqXG4gICAqIEdyYW50IHBlcm1pc3Npb25zIHRvIHRoZSBidWlsZCBwcm9qZWN0XG4gICAqL1xuICBwdWJsaWMgZ3JhbnRCdWlsZFBlcm1pc3Npb25zKHBlcm1pc3Npb25zOiBpYW0uUG9saWN5U3RhdGVtZW50KTogdm9pZCB7XG4gICAgdGhpcy5idWlsZFByb2plY3QuYWRkVG9Sb2xlUG9saWN5KHBlcm1pc3Npb25zKTtcbiAgfVxufVxuIl19