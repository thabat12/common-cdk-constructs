#!/usr/bin/env node
import 'source-map-support/register';
import * as cdk from 'aws-cdk-lib';
import * as dotenv from 'dotenv';
import { AppStack } from '../stacks/app-stack';

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

// Create the application stack
const appStack = new AppStack(app, `${environmentConfig.appName}-${environment}-stack`, {
  env: {
    account: environmentConfig.awsAccountId,
    region: environmentConfig.awsRegion,
  },
  ...environmentConfig,
  description: `${environmentConfig.appName} Fargate service stack for ${environment} environment`,
});

// Add stack tags
cdk.Tags.of(appStack).add('Environment', environment);
cdk.Tags.of(appStack).add('CostCenter', environmentConfig.costCenter);
cdk.Tags.of(appStack).add('Project', environmentConfig.appName);
cdk.Tags.of(appStack).add('ManagedBy', 'CDK');

// Output deployment information
console.log('🚀 Deploying CDK Fargate Scaffold');
console.log('=====================================');
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
console.log('=====================================');

// Add context information
app.node.setContext('environment', environment);
app.node.setContext('appName', environmentConfig.appName);

// Synthesize the app
app.synth();
