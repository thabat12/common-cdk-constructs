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
  tags?: { [key: string]: string };
}

export class SecurityStack extends cdk.Stack {
  public readonly kmsKey?: kms.Key;
  public readonly defaultSecurityGroup?: ec2.SecurityGroup;
  public readonly appRole?: iam.Role;
  public readonly executionRole?: iam.Role;
  public readonly vpc: ec2.IVpc;

  constructor(scope: Construct, id: string, props: SecurityStackProps) {
    super(scope, id, props);

    this.vpc = props.vpc;
    const enableKms = props.enableKms ?? true;
    const createDefaultSecurityGroups = props.createDefaultSecurityGroups ?? true;

    // Create KMS key for encryption if enabled
    if (enableKms) {
      this.kmsKey = new kms.Key(this, 'EncryptionKey', {
        alias: `${props.appName}-${props.environment}-key`,
        description: `Encryption key for ${props.appName} ${props.environment} environment`,
        enableKeyRotation: true,
        pendingWindow: cdk.Duration.days(7),
        removalPolicy: cdk.RemovalPolicy.DESTROY,
      });

      // Add key policy for CloudWatch logs
      this.kmsKey.addToResourcePolicy(
        new iam.PolicyStatement({
          effect: iam.Effect.ALLOW,
          principals: [new iam.ServicePrincipal('logs.amazonaws.com')],
          actions: ['kms:Decrypt', 'kms:GenerateDataKey'],
          resources: ['*'],
          conditions: {
            StringEquals: {
              'kms:ViaService': `logs.${cdk.Stack.of(this).region}.amazonaws.com`,
            },
          },
        })
      );
    }

    // Create default security group if enabled
    if (createDefaultSecurityGroups) {
      this.defaultSecurityGroup = new ec2.SecurityGroup(this, 'DefaultSecurityGroup', {
        vpc: props.vpc,
        description: `Default security group for ${props.appName}`,
        allowAllOutbound: true,
      });

      // Allow HTTP and HTTPS from anywhere (can be restricted later)
      this.defaultSecurityGroup.addIngressRule(
        ec2.Peer.anyIpv4(),
        ec2.Port.tcp(80),
        'Allow HTTP traffic'
      );

      this.defaultSecurityGroup.addIngressRule(
        ec2.Peer.anyIpv4(),
        ec2.Port.tcp(443),
        'Allow HTTPS traffic'
      );

      // Allow SSH from VPC CIDR (for debugging)
      this.defaultSecurityGroup.addIngressRule(
        ec2.Peer.ipv4(props.vpc.vpcCidrBlock),
        ec2.Port.tcp(22),
        'Allow SSH from VPC'
      );
    }

    // Create application role
    this.appRole = new iam.Role(this, 'AppRole', {
      roleName: `${props.appName}-${props.environment}-app-role`,
      assumedBy: new iam.ServicePrincipal('ecs-tasks.amazonaws.com'),
      description: `Application role for ${props.appName} ${props.environment}`,
    });

    // Create execution role
    this.executionRole = new iam.Role(this, 'ExecutionRole', {
      roleName: `${props.appName}-${props.environment}-execution-role`,
      assumedBy: new iam.ServicePrincipal('ecs-tasks.amazonaws.com'),
      description: `Execution role for ${props.appName} ${props.environment}`,
      managedPolicies: [
        iam.ManagedPolicy.fromAwsManagedPolicyName('service-role/AmazonECSTaskExecutionRolePolicy'),
      ],
    });

    // Grant basic permissions to app role
    this.appRole?.addToPolicy(
      new iam.PolicyStatement({
        effect: iam.Effect.ALLOW,
        actions: [
          'logs:CreateLogGroup',
          'logs:CreateLogStream',
          'logs:PutLogEvents',
          'logs:DescribeLogStreams',
        ],
        resources: ['*'],
      })
    );

    // Grant KMS permissions if key exists
    if (this.kmsKey) {
      this.appRole?.addToPolicy(
        new iam.PolicyStatement({
          effect: iam.Effect.ALLOW,
          actions: [
            'kms:Decrypt',
            'kms:GenerateDataKey',
            'kms:DescribeKey',
          ],
          resources: [this.kmsKey.keyArn],
        })
      );

      this.executionRole?.addToPolicy(
        new iam.PolicyStatement({
          effect: iam.Effect.ALLOW,
          actions: [
            'kms:Decrypt',
            'kms:GenerateDataKey',
            'kms:DescribeKey',
          ],
          resources: [this.kmsKey.keyArn],
        })
      );
    }

    // Add tags
    if (props.tags) {
      Object.entries(props.tags).forEach(([key, value]) => {
        cdk.Tags.of(this).add(key, value);
      });
    }

    // Add default tags
    cdk.Tags.of(this).add('Name', `${props.appName}-${props.environment}-security`);
    cdk.Tags.of(this).add('Purpose', 'Security Infrastructure');
    cdk.Tags.of(this).add('ManagedBy', 'CDK');

    // Outputs
    if (this.kmsKey) {
      new cdk.CfnOutput(this, 'KMSKeyId', {
        value: this.kmsKey.keyId,
        description: 'KMS Key ID',
        exportName: `${props.appName}-${props.environment}-KMSKeyId`,
      });

      new cdk.CfnOutput(this, 'KMSKeyArn', {
        value: this.kmsKey.keyArn,
        description: 'KMS Key ARN',
        exportName: `${props.appName}-${props.environment}-KMSKeyArn`,
      });
    }

    if (this.defaultSecurityGroup) {
      new cdk.CfnOutput(this, 'DefaultSecurityGroupId', {
        value: this.defaultSecurityGroup.securityGroupId,
        description: 'Default Security Group ID',
        exportName: `${props.appName}-${props.environment}-DefaultSecurityGroupId`,
      });
    }

    if (this.appRole) {
      new cdk.CfnOutput(this, 'AppRoleArn', {
        value: this.appRole.roleArn,
        description: 'Application Role ARN',
        exportName: `${props.appName}-${props.environment}-AppRoleArn`,
      });
    }

    if (this.executionRole) {
      new cdk.CfnOutput(this, 'ExecutionRoleArn', {
        value: this.executionRole.roleArn,
        description: 'Execution Role ARN',
        exportName: `${props.appName}-${props.environment}-ExecutionRoleArn`,
      });
    }
  }

  /**
   * Grant additional permissions to the application role
   */
  public grantAppRole(permissions: iam.PolicyStatement): void {
    this.appRole?.addToPolicy(permissions);
  }

  /**
   * Grant additional permissions to the execution role
   */
  public grantExecutionRole(permissions: iam.PolicyStatement): void {
    this.executionRole?.addToPolicy(permissions);
  }

  /**
   * Create a custom security group
   */
  public createSecurityGroup(
    id: string,
    description: string,
    allowHttp: boolean = true,
    allowHttps: boolean = true,
    allowSsh: boolean = false
  ): ec2.SecurityGroup {
    const securityGroup = new ec2.SecurityGroup(this, id, {
      vpc: this.vpc,
      description,
      allowAllOutbound: true,
    });

    if (allowHttp) {
      securityGroup.addIngressRule(
        ec2.Peer.anyIpv4(),
        ec2.Port.tcp(80),
        'Allow HTTP traffic'
      );
    }

    if (allowHttps) {
      securityGroup.addIngressRule(
        ec2.Peer.anyIpv4(),
        ec2.Port.tcp(443),
        'Allow HTTPS traffic'
      );
    }

    if (allowSsh) {
      securityGroup.addIngressRule(
        ec2.Peer.ipv4(this.vpc.vpcCidrBlock),
        ec2.Port.tcp(22),
        'Allow SSH from VPC'
      );
    }

    return securityGroup;
  }
}
