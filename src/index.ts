// CDK Fargate Scaffold - Main Package Entry Point
// This file exports all the reusable constructs and utilities

// Base Infrastructure Constructs
export { VPCStack } from './constructs/base/vpc-stack';
export type { VPCStackProps } from './constructs/base/vpc-stack';

export { SecurityStack } from './constructs/base/security-stack';
export type { SecurityStackProps } from './constructs/base/security-stack';

// Fargate Service Constructs
export { FargateService } from './constructs/fargate/fargate-service';
export type { FargateServiceProps } from './constructs/fargate/fargate-service';

// Application Stack
export { AppStack } from './stacks/app-stack';
export type { AppStackProps } from './stacks/app-stack';

// Monitoring and Observability
export { MonitoringStack } from './constructs/monitoring/monitoring-stack';
export type { MonitoringStackProps } from './constructs/monitoring/monitoring-stack';

// Database Constructs
export { DatabaseStack } from './constructs/database/database-stack';
export type { DatabaseStackProps } from './constructs/database/database-stack';

// CI/CD Constructs
export { CICDStack } from './constructs/cicd/cicd-stack';
export type { CICDStackProps } from './constructs/cicd/cicd-stack';

// Utility Functions
export * from './utils/deployment-helpers';
export * from './utils/configuration-helpers';

// Types
export * from './types';

// Constants
export * from './constants';

// Re-export commonly used CDK constructs for convenience
export * from 'aws-cdk-lib';
export * from 'constructs';
