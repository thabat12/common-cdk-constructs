// Common CDK Constructs Library - Main Package Entry Point
// This file exports all the reusable constructs and utilities

// Base Infrastructure Constructs
export { VPCStack } from './constructs/base/vpc-stack';
export type { VPCStackProps } from './constructs/base/vpc-stack';

export { SecurityStack } from './constructs/base/security-stack';
export type { SecurityStackProps } from './constructs/base/security-stack';

export { ECRRepository } from './constructs/base/ecr-repository';

// Fargate Service Constructs
export { FargateService } from './constructs/fargate/fargate-service';
export type { FargateServiceProps } from './constructs/fargate/fargate-service';

// Monitoring and Observability
export { MonitoringStack } from './constructs/monitoring/monitoring-stack';
export type { MonitoringStackProps } from './constructs/monitoring/monitoring-stack';

// CI/CD Constructs
export { CICDStack } from './constructs/cicd/cicd-stack';
export type { CICDStackProps } from './constructs/cicd/cicd-stack';

// Utility Functions
export { getEnvironmentConfig, getFargateConfig } from './utils/deployment-helpers';

// Types
export * from './types';

// Constants
export * from './constants';

// Re-export commonly used CDK constructs for convenience
export * from 'aws-cdk-lib';
export * from 'constructs';
