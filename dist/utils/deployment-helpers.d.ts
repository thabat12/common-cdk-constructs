import * as cdk from 'aws-cdk-lib';
import * as ec2 from 'aws-cdk-lib/aws-ec2';
import * as ecs from 'aws-cdk-lib/aws-ecs';
import { Construct } from 'constructs';
/**
 * Utility functions for common deployment operations
 */
/**
 * Get environment-specific configuration from CDK context
 */
export declare function getEnvironmentConfig(scope: Construct, environment: string): any;
/**
 * Create a standard set of tags for resources
 */
export declare function createStandardTags(project: string, environment: string, costCenter: string, additionalTags?: {
    [key: string]: string;
}): {
    [key: string]: string;
};
/**
 * Apply tags to a CDK construct
 */
export declare function applyTags(construct: Construct, tags: {
    [key: string]: string;
}): void;
/**
 * Get subnet selection for a specific environment
 */
export declare function getSubnetSelection(environment: string, subnetType?: ec2.SubnetType): ec2.SubnetSelection;
/**
 * Create a security group with common rules
 */
export declare function createSecurityGroup(scope: Construct, id: string, vpc: ec2.IVpc, description: string, allowHttp?: boolean, allowHttps?: boolean): ec2.SecurityGroup;
/**
 * Validate required environment variables
 */
export declare function validateEnvironmentVariables(requiredVars: string[], env: {
    [key: string]: string | undefined;
}): void;
/**
 * Get Fargate resource configuration with defaults
 */
export declare function getFargateConfig(environment: string, config: any, env: {
    [key: string]: string | undefined;
}): {
    cpu: number;
    memory: number;
    desiredCount: number;
    maxCapacity: number;
};
/**
 * Create CloudWatch outputs for common resources
 */
export declare function createCommonOutputs(scope: cdk.Stack, appName: string, environment: string, vpc: ec2.IVpc, fargateService: ecs.FargateService): void;
