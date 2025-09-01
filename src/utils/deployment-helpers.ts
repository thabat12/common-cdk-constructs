import * as cdk from 'aws-cdk-lib';
import * as ec2 from 'aws-cdk-lib/aws-ec2';
import * as ecs from 'aws-cdk-lib/aws-ecs';

/**
 * Utility functions for common deployment operations
 */

/**
 * Get environment-specific configuration from CDK context
 */
export function getEnvironmentConfig(scope: cdk.Construct, environment: string): any {
  return scope.node.tryGetContext(environment) || {};
}

/**
 * Create a standard set of tags for resources
 */
export function createStandardTags(
  project: string,
  environment: string,
  costCenter: string,
  additionalTags?: { [key: string]: string }
): { [key: string]: string } {
  const tags = {
    Project: project,
    Environment: environment,
    CostCenter: costCenter,
    ManagedBy: 'CDK',
    CreatedBy: 'cdk-fargate-scaffold',
    ...additionalTags,
  };

  return tags;
}

/**
 * Apply tags to a CDK construct
 */
export function applyTags(
  construct: cdk.Construct,
  tags: { [key: string]: string }
): void {
  Object.entries(tags).forEach(([key, value]) => {
    cdk.Tags.of(construct).add(key, value);
  });
}

/**
 * Get subnet selection for a specific environment
 */
export function getSubnetSelection(
  environment: string,
  subnetType: ec2.SubnetType = ec2.SubnetType.PRIVATE_WITH_EGRESS
): ec2.SubnetSelection {
  return {
    subnetType,
  };
}

/**
 * Create a security group with common rules
 */
export function createSecurityGroup(
  scope: cdk.Construct,
  id: string,
  vpc: ec2.IVpc,
  description: string,
  allowHttp: boolean = true,
  allowHttps: boolean = true
): ec2.SecurityGroup {
  const securityGroup = new ec2.SecurityGroup(scope, id, {
    vpc,
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

  return securityGroup;
}

/**
 * Validate required environment variables
 */
export function validateEnvironmentVariables(
  requiredVars: string[],
  env: NodeJS.ProcessEnv
): void {
  const missingVars = requiredVars.filter(envVar => !env[envVar]);

  if (missingVars.length > 0) {
    throw new Error(
      `Missing required environment variables: ${missingVars.join(', ')}`
    );
  }
}

/**
 * Get Fargate resource configuration with defaults
 */
export function getFargateConfig(
  environment: string,
  config: any,
  env: NodeJS.ProcessEnv
): {
  cpu: number;
  memory: number;
  desiredCount: number;
  maxCapacity: number;
} {
  return {
    cpu: parseInt(config.fargateCpu || env.FARGATE_CPU || '256'),
    memory: parseInt(config.fargateMemory || env.FARGATE_MEMORY || '512'),
    desiredCount: parseInt(config.desiredCount || env.DESIRED_COUNT || '1'),
    maxCapacity: parseInt(
      config.autoScalingMaxCapacity || env.AUTO_SCALING_MAX_CAPACITY || '5'
    ),
  };
}

/**
 * Create CloudWatch outputs for common resources
 */
export function createCommonOutputs(
  scope: cdk.Stack,
  appName: string,
  environment: string,
  vpc: ec2.IVpc,
  fargateService: ecs.FargateService
): void {
  new cdk.CfnOutput(scope, 'AppName', {
    value: appName,
    description: 'Application name',
    exportName: `${appName}-AppName`,
  });

  new cdk.CfnOutput(scope, 'Environment', {
    value: environment,
    description: 'Deployment environment',
    exportName: `${appName}-Environment`,
  });

  new cdk.CfnOutput(scope, 'VPCId', {
    value: vpc.vpcId,
    description: 'VPC ID',
    exportName: `${appName}-VPCId`,
  });

  new cdk.CfnOutput(scope, 'ServiceName', {
    value: fargateService.serviceName,
    description: 'Fargate service name',
    exportName: `${appName}-ServiceName`,
  });
}
