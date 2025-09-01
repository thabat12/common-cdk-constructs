import * as cdk from 'aws-cdk-lib';
import * as ec2 from 'aws-cdk-lib/aws-ec2';
import { Construct } from 'constructs';
import { FargateService } from '../constructs/fargate/fargate-service';
export interface AppStackProps extends cdk.StackProps {
    /**
     * The name of the application
     */
    appName: string;
    /**
     * The Docker image to deploy
     */
    dockerImage: string;
    /**
     * Environment (dev, staging, production)
     */
    environment: string;
    /**
     * CPU units for the Fargate task
     */
    fargateCpu: number;
    /**
     * Memory for the Fargate task in MiB
     */
    fargateMemory: number;
    /**
     * Desired number of tasks
     */
    desiredCount: number;
    /**
     * Maximum number of tasks for auto-scaling
     */
    autoScalingMaxCapacity: number;
    /**
     * Whether to enable container insights
     */
    enableContainerInsights: boolean;
    /**
     * Whether to enable X-Ray tracing
     */
    enableXRay: boolean;
    /**
     * Log retention days
     */
    logRetentionDays: number;
    /**
     * Cost center for tagging
     */
    costCenter: string;
    /**
     * Additional tags
     */
    tags?: {
        [key: string]: string;
    };
}
export declare class AppStack extends cdk.Stack {
    readonly vpc: ec2.IVpc;
    readonly fargateService: FargateService;
    constructor(scope: Construct, id: string, props: AppStackProps);
}
