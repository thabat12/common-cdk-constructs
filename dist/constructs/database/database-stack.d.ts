import * as cdk from 'aws-cdk-lib';
import * as ec2 from 'aws-cdk-lib/aws-ec2';
import * as rds from 'aws-cdk-lib/aws-rds';
import * as dynamodb from 'aws-cdk-lib/aws-dynamodb';
import * as iam from 'aws-cdk-lib/aws-iam';
import * as kms from 'aws-cdk-lib/aws-kms';
import { Construct } from 'constructs';
export interface DatabaseStackProps extends cdk.StackProps {
    /**
     * The VPC where database resources will be created
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
     * Whether to enable RDS
     * @default false
     */
    enableRds?: boolean;
    /**
     * Whether to enable DynamoDB
     * @default false
     */
    enableDynamoDb?: boolean;
    /**
     * RDS instance type
     * @default t3.micro
     */
    rdsInstanceType?: ec2.InstanceType;
    /**
     * RDS database name
     * @default appdb
     */
    rdsDatabaseName?: string;
    /**
     * RDS master username
     * @default admin
     */
    rdsMasterUsername?: string;
    /**
     * DynamoDB billing mode
     * @default PAY_PER_REQUEST
     */
    dynamoDbBillingMode?: dynamodb.BillingMode;
    /**
     * DynamoDB removal policy
     * @default DESTROY
     */
    dynamoDbRemovalPolicy?: cdk.RemovalPolicy;
    /**
     * KMS key for encryption
     */
    kmsKey?: kms.IKey;
    /**
     * Tags to apply to resources
     */
    tags?: {
        [key: string]: string;
    };
}
export declare class DatabaseStack extends cdk.Stack {
    readonly rdsInstance?: rds.DatabaseInstance;
    readonly rdsCluster?: rds.DatabaseCluster;
    readonly dynamoDbTable?: dynamodb.Table;
    readonly databaseSecurityGroup?: ec2.SecurityGroup;
    constructor(scope: Construct, id: string, props: DatabaseStackProps);
    /**
     * Grant read permissions to a role
     */
    grantReadData(role: iam.IRole): void;
    /**
     * Grant write permissions to a role
     */
    grantWriteData(role: iam.IRole): void;
    /**
     * Grant read/write permissions to a role
     */
    grantReadWriteData(role: iam.IRole): void;
    /**
     * Grant RDS permissions to a role
     */
    grantRdsPermissions(role: iam.IRole): void;
}
