import * as cdk from 'aws-cdk-lib';
import * as codepipeline from 'aws-cdk-lib/aws-codepipeline';
import * as codepipeline_actions from 'aws-cdk-lib/aws-codepipeline-actions';
import * as codebuild from 'aws-cdk-lib/aws-codebuild';
import * as iam from 'aws-cdk-lib/aws-iam';
import * as s3 from 'aws-cdk-lib/aws-s3';
import * as ecr from 'aws-cdk-lib/aws-ecr';
import * as ecs from 'aws-cdk-lib/aws-ecs';
import { Construct } from 'constructs';

export interface CICDStackProps extends cdk.StackProps {
  /**
   * Application name for resource naming
   */
  appName: string;
  
  /**
   * Environment name
   */
  environment: string;
  
  /**
   * Source repository information
   */
  sourceRepository: {
    owner: string;
    repository: string;
    branch: string;
    connectionArn?: string; // For CodeStar connections
  };
  
  /**
   * ECR repository for Docker images
   */
  ecrRepository?: ecr.IRepository;
  
  /**
   * ECS cluster for deployment
   */
  ecsCluster?: ecs.ICluster;
  
  /**
   * ECS service for deployment
   */
  ecsService?: ecs.IFargateService;
  
  /**
   * Whether to enable automated testing
   * @default true
   */
  enableTesting?: boolean;
  
  /**
   * Whether to enable automated deployment
   * @default true
   */
  enableDeployment?: boolean;
  
  /**
   * Build environment variables
   */
  buildEnvironment?: {
    [key: string]: string;
  };
  
  /**
   * Tags to apply to resources
   */
  tags?: { [key: string]: string };
}

export class CICDStack extends cdk.Stack {
  public readonly pipeline: codepipeline.Pipeline;
  public readonly buildProject: codebuild.PipelineProject;
  public readonly artifactBucket: s3.Bucket;

  constructor(scope: Construct, id: string, props: CICDStackProps) {
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
        privileged: true, // Required for Docker builds
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
    this.buildProject.addToRolePolicy(
      new iam.PolicyStatement({
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
      })
    );

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
        service: props.ecsService as ecs.FargateService,
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
  public addApprovalStage(stageName: string, notificationTopic?: string): void {
    const approvalAction = new codepipeline_actions.ManualApprovalAction({
      actionName: 'Approve',
      notificationTopic: notificationTopic ? undefined : undefined, // TODO: Add SNS topic support
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
  public addCustomStage(stageName: string, actions: codepipeline.IAction[]): void {
    this.pipeline.addStage({
      stageName,
      actions,
    });
  }

  /**
   * Grant permissions to the build project
   */
  public grantBuildPermissions(permissions: iam.PolicyStatement): void {
    this.buildProject.addToRolePolicy(permissions);
  }
}
