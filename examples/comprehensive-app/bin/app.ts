#!/usr/bin/env node
import 'source-map-support/register';
import * as cdk from 'aws-cdk-lib';
import * as dotenv from 'dotenv';
import {
  VPCStack,
  SecurityStack,
  FargateService,
  MonitoringStack,
  DatabaseStack,
  CICDStack,
} from '@thabat12/cdk-fargate-scaffold';

// Load environment variables
dotenv.config();

const app = new cdk.App();

// Get environment from context or environment variable
const environment = app.node.tryGetContext('environment') || process.env.ENVIRONMENT || 'dev';

// Get configuration from context
const config = app.node.tryGetContext(environment) || {};

// Validate required environment variables
const requiredEnvVars = ['APP_NAME', 'AWS_REGION', 'AWS_ACCOUNT_ID'];
const missingEnvVars = requiredEnvVars.filter(envVar => !process.env[envVar]);

if (missingEnvVars.length > 0) {
  throw new Error(`Missing required environment variables: ${missingEnvVars.join(', ')}`);
}

// Get environment variables with defaults
const environmentConfig = {
  appName: process.env.APP_NAME!,
  dockerImage: process.env.DOCKER_IMAGE || process.env.APP_NAME!,
  environment,
  awsRegion: process.env.AWS_REGION!,
  awsAccountId: process.env.AWS_ACCOUNT_ID!,
  fargateCpu: parseInt(config.fargateCpu || process.env.FARGATE_CPU || '256'),
  fargateMemory: parseInt(config.fargateMemory || process.env.FARGATE_MEMORY || '512'),
  desiredCount: parseInt(config.desiredCount || process.env.DESIRED_COUNT || '1'),
  autoScalingMaxCapacity: parseInt(config.autoScalingMaxCapacity || process.env.AUTO_SCALING_MAX_CAPACITY || '5'),
  enableContainerInsights: config.enableContainerInsights !== false,
  enableXRay: config.enableXRay === true,
  logRetentionDays: parseInt(config.logRetentionDays || process.env.LOG_RETENTION_DAYS || '7'),
  costCenter: config.costCenter || process.env.COST_CENTER || environment,
  tags: config.tags || {},
};

// Create the VPC stack
const vpcStack = new VPCStack(app, `${environmentConfig.appName}-${environment}-vpc-stack`, {
  env: {
    account: environmentConfig.awsAccountId,
    region: environmentConfig.awsRegion,
  },
  vpcCidr: config.vpcCidr || '10.0.0.0/16',
  maxAzs: config.maxAzs || 2,
  natGateways: config.natGateways || 1,
  tags: {
    ...environmentConfig.tags,
    Environment: environment,
    CostCenter: environmentConfig.costCenter,
    Project: environmentConfig.appName,
  },
});

// Create the security stack
const securityStack = new SecurityStack(app, `${environmentConfig.appName}-${environment}-security-stack`, {
  env: {
    account: environmentConfig.awsAccountId,
    region: environmentConfig.awsRegion,
  },
  vpc: vpcStack.vpc,
  appName: environmentConfig.appName,
  environment,
  enableKms: true,
  createDefaultSecurityGroups: true,
  tags: {
    ...environmentConfig.tags,
    Environment: environment,
    CostCenter: environmentConfig.costCenter,
    Project: environmentConfig.appName,
  },
});

// Create the monitoring stack
const monitoringStack = new MonitoringStack(app, `${environmentConfig.appName}-${environment}-monitoring-stack`, {
  env: {
    account: environmentConfig.awsAccountId,
    region: environmentConfig.awsRegion,
  },
  appName: environmentConfig.appName,
  environment,
  enableDetailedMonitoring: true,
  enableSnsNotifications: true,
  notificationEmails: process.env.NOTIFICATION_EMAILS?.split(',') || [],
  enableXRay: environmentConfig.enableXRay,
  logRetentionDays: environmentConfig.logRetentionDays,
  tags: {
    ...environmentConfig.tags,
    Environment: environment,
    CostCenter: environmentConfig.costCenter,
    Project: environmentConfig.appName,
  },
});

// Create the database stack (optional)
const enableDatabase = process.env.ENABLE_DATABASE === 'true';
let databaseStack: DatabaseStack | undefined;

if (enableDatabase) {
  databaseStack = new DatabaseStack(app, `${environmentConfig.appName}-${environment}-database-stack`, {
    env: {
      account: environmentConfig.awsAccountId,
      region: environmentConfig.awsRegion,
    },
    vpc: vpcStack.vpc,
    appName: environmentConfig.appName,
    environment,
    enableRds: process.env.ENABLE_RDS === 'true',
    enableDynamoDb: process.env.ENABLE_DYNAMODB === 'true',
    kmsKey: securityStack.kmsKey,
    tags: {
      ...environmentConfig.tags,
      Environment: environment,
      CostCenter: environmentConfig.costCenter,
      Project: environmentConfig.appName,
    },
  });
}

// Create the Fargate service
const fargateService = new FargateService(app, `${environmentConfig.appName}-${environment}-fargate-service`, {
  vpc: vpcStack.vpc,
  image: environmentConfig.dockerImage,
  serviceName: environmentConfig.appName,
  cpu: environmentConfig.fargateCpu,
  memory: environmentConfig.fargateMemory,
  desiredCount: environmentConfig.desiredCount,
  maxCapacity: environmentConfig.autoScalingMaxCapacity,
  enableAutoScaling: true,
  enableLoadBalancer: true,
  enableContainerInsights: environmentConfig.enableContainerInsights,
  enableXRay: environmentConfig.enableXRay,
  logRetentionDays: environmentConfig.logRetentionDays,
  securityGroups: securityStack.defaultSecurityGroup ? [securityStack.defaultSecurityGroup] : undefined,
  vpcSubnets: {
    subnetType: cdk.aws_ec2.SubnetType.PRIVATE_WITH_EGRESS,
  },
  tags: {
    ...environmentConfig.tags,
    Environment: environment,
    CostCenter: environmentConfig.costCenter,
    Project: environmentConfig.appName,
  },
});

// Grant database permissions if database is enabled
if (databaseStack) {
  if (databaseStack.dynamoDbTable) {
    databaseStack.grantReadWriteData(fargateService.taskDefinition.taskRole);
  }
  if (databaseStack.rdsInstance) {
    databaseStack.grantRdsPermissions(fargateService.taskDefinition.taskRole);
  }
}

// Create the CI/CD stack (optional)
const enableCICD = process.env.ENABLE_CICD === 'true';
let cicdStack: CICDStack | undefined;

if (enableCICD) {
  cicdStack = new CICDStack(app, `${environmentConfig.appName}-${environment}-cicd-stack`, {
    env: {
      account: environmentConfig.awsAccountId,
      region: environmentConfig.awsRegion,
    },
    appName: environmentConfig.appName,
    environment,
    sourceRepository: {
      owner: process.env.GITHUB_OWNER || 'your-org',
      repository: process.env.GITHUB_REPO || environmentConfig.appName,
      branch: process.env.GITHUB_BRANCH || 'main',
      connectionArn: process.env.CODESTAR_CONNECTION_ARN,
    },
    ecrRepository: fargateService.ecrRepository,
    ecsCluster: fargateService.cluster,
    ecsService: fargateService.service,
    enableTesting: true,
    enableDeployment: true,
    buildEnvironment: {
      NODE_ENV: environment,
      BUILD_ENV: environment,
    },
    tags: {
      ...environmentConfig.tags,
      Environment: environment,
      CostCenter: environmentConfig.costCenter,
      Project: environmentConfig.appName,
    },
  });
}

// Add stack dependencies
if (databaseStack) {
  databaseStack.addDependency(vpcStack);
  databaseStack.addDependency(securityStack);
}

if (cicdStack) {
  cicdStack.addDependency(fargateService);
}

// Add stack tags
[vpcStack, securityStack, monitoringStack, fargateService].forEach(stack => {
  cdk.Tags.of(stack).add('Environment', environment);
  cdk.Tags.of(stack).add('CostCenter', environmentConfig.costCenter);
  cdk.Tags.of(stack).add('Project', environmentConfig.appName);
  cdk.Tags.of(stack).add('ManagedBy', 'CDK');
});

if (databaseStack) {
  cdk.Tags.of(databaseStack).add('Environment', environment);
  cdk.Tags.of(databaseStack).add('CostCenter', environmentConfig.costCenter);
  cdk.Tags.of(databaseStack).add('Project', environmentConfig.appName);
  cdk.Tags.of(databaseStack).add('ManagedBy', 'CDK');
}

if (cicdStack) {
  cdk.Tags.of(cicdStack).add('Environment', environment);
  cdk.Tags.of(cicdStack).add('CostCenter', environmentConfig.costCenter);
  cdk.Tags.of(cicdStack).add('Project', environmentConfig.appName);
  cdk.Tags.of(cicdStack).add('ManagedBy', 'CDK');
}

// Output deployment information
console.log('🚀 Deploying comprehensive application with CDK Fargate Scaffold');
console.log('==============================================================');
console.log(`Application: ${environmentConfig.appName}`);
console.log(`Environment: ${environment}`);
console.log(`Region: ${environmentConfig.awsRegion}`);
console.log(`Account: ${environmentConfig.awsAccountId}`);
console.log(`Docker Image: ${environmentConfig.dockerImage}`);
console.log(`Fargate CPU: ${environmentConfig.fargateCpu}`);
console.log(`Fargate Memory: ${environmentConfig.fargateMemory} MB`);
console.log(`Desired Count: ${environmentConfig.desiredCount}`);
console.log(`Max Capacity: ${environmentConfig.autoScalingMaxCapacity}`);
console.log(`Container Insights: ${environmentConfig.enableContainerInsights}`);
console.log(`X-Ray Tracing: ${environmentConfig.enableXRay}`);
console.log(`Log Retention: ${environmentConfig.logRetentionDays} days`);
console.log(`Cost Center: ${environmentConfig.costCenter}`);
console.log(`Database Enabled: ${enableDatabase}`);
console.log(`CI/CD Enabled: ${enableCICD}`);
console.log('==============================================================');

// Add context information
app.node.setContext('environment', environment);
app.node.setContext('appName', environmentConfig.appName);

// Synthesize the app
app.synth();
