import * as cdk from 'aws-cdk-lib';
import * as iam from 'aws-cdk-lib/aws-iam';
import * as ec2 from 'aws-cdk-lib/aws-ec2';
import * as kms from 'aws-cdk-lib/aws-kms';
import { Construct } from 'constructs';
export interface SecurityStackProps extends cdk.StackProps {
    /**
     * The VPC where security resources will be created
     */
    vpc: ec2.IVpc;
    /**
     * Application name for resource naming
     */
    appName: string;
    /**
     * Environment name
     */
    environment: string;
    /**
     * Whether to enable KMS encryption
     * @default true
     */
    enableKms?: boolean;
    /**
     * Whether to create default security groups
     * @default true
     */
    createDefaultSecurityGroups?: boolean;
    /**
     * Tags to apply to resources
     */
    tags?: {
        [key: string]: string;
    };
}
export declare class SecurityStack extends cdk.Stack {
    readonly kmsKey?: kms.Key;
    readonly defaultSecurityGroup?: ec2.SecurityGroup;
    readonly appRole?: iam.Role;
    readonly executionRole?: iam.Role;
    readonly vpc: ec2.IVpc;
    constructor(scope: Construct, id: string, props: SecurityStackProps);
    /**
     * Grant additional permissions to the application role
     */
    grantAppRole(permissions: iam.PolicyStatement): void;
    /**
     * Grant additional permissions to the execution role
     */
    grantExecutionRole(permissions: iam.PolicyStatement): void;
    /**
     * Create a custom security group
     */
    createSecurityGroup(id: string, description: string, allowHttp?: boolean, allowHttps?: boolean, allowSsh?: boolean): ec2.SecurityGroup;
}
