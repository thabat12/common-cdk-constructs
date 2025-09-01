import * as cdk from 'aws-cdk-lib';
import * as codepipeline from 'aws-cdk-lib/aws-codepipeline';
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
        connectionArn?: string;
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
    tags?: {
        [key: string]: string;
    };
}
export declare class CICDStack extends cdk.Stack {
    readonly pipeline: codepipeline.Pipeline;
    readonly buildProject: codebuild.PipelineProject;
    readonly artifactBucket: s3.Bucket;
    constructor(scope: Construct, id: string, props: CICDStackProps);
    /**
     * Add approval stage to the pipeline
     */
    addApprovalStage(stageName: string, notificationTopic?: string): void;
    /**
     * Add custom stage to the pipeline
     */
    addCustomStage(stageName: string, actions: codepipeline.IAction[]): void;
    /**
     * Grant permissions to the build project
     */
    grantBuildPermissions(permissions: iam.PolicyStatement): void;
}
