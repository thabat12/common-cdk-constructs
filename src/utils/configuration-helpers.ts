import * as cdk from 'aws-cdk-lib';

/**
 * Configuration helper utilities for managing environment-specific settings
 */

/**
 * Environment configuration interface
 */
export interface EnvironmentConfig {
  environment: string;
  vpcCidr: string;
  maxAzs: number;
  natGateways: number;
  fargateCpu: string;
  fargateMemory: string;
  desiredCount: number;
  autoScalingMaxCapacity: number;
  enableContainerInsights: boolean;
  enableXRay: boolean;
  logRetentionDays: number;
  costCenter: string;
  tags: { [key: string]: string };
}

/**
 * Default environment configurations
 */
export const DEFAULT_ENVIRONMENTS: { [key: string]: EnvironmentConfig } = {
  dev: {
    environment: 'dev',
    vpcCidr: '10.0.0.0/16',
    maxAzs: 2,
    natGateways: 1,
    fargateCpu: '256',
    fargateMemory: '512',
    desiredCount: 1,
    autoScalingMaxCapacity: 2,
    enableContainerInsights: true,
    enableXRay: false,
    logRetentionDays: 7,
    costCenter: 'dev',
    tags: {
      Environment: 'dev',
      CostCenter: 'dev',
      Project: 'scaffold',
    },
  },
  staging: {
    environment: 'staging',
    vpcCidr: '10.1.0.0/16',
    maxAzs: 2,
    natGateways: 1,
    fargateCpu: '512',
    fargateMemory: '1024',
    desiredCount: 2,
    autoScalingMaxCapacity: 5,
    enableContainerInsights: true,
    enableXRay: true,
    logRetentionDays: 14,
    costCenter: 'staging',
    tags: {
      Environment: 'staging',
      CostCenter: 'staging',
      Project: 'scaffold',
    },
  },
  production: {
    environment: 'production',
    vpcCidr: '10.2.0.0/16',
    maxAzs: 3,
    natGateways: 3,
    fargateCpu: '1024',
    fargateMemory: '2048',
    desiredCount: 3,
    autoScalingMaxCapacity: 10,
    enableContainerInsights: true,
    enableXRay: true,
    logRetentionDays: 30,
    costCenter: 'production',
    tags: {
      Environment: 'production',
      CostCenter: 'production',
      Project: 'scaffold',
    },
  },
};

/**
 * Get environment configuration with defaults
 */
export function getEnvironmentConfig(
  scope: cdk.Construct,
  environment: string
): EnvironmentConfig {
  const contextConfig = scope.node.tryGetContext(environment) || {};
  const defaultConfig = DEFAULT_ENVIRONMENTS[environment] || DEFAULT_ENVIRONMENTS.dev;

  return {
    ...defaultConfig,
    ...contextConfig,
    environment,
  };
}

/**
 * Validate environment configuration
 */
export function validateEnvironmentConfig(
  config: EnvironmentConfig
): void {
  const errors: string[] = [];

  if (!config.environment) {
    errors.push('Environment is required');
  }

  if (!config.vpcCidr) {
    errors.push('VPC CIDR is required');
  }

  if (config.maxAzs < 1 || config.maxAzs > 6) {
    errors.push('Max AZs must be between 1 and 6');
  }

  if (config.natGateways < 1 || config.natGateways > config.maxAzs) {
    errors.push('NAT gateways must be between 1 and max AZs');
  }

  if (config.desiredCount < 1) {
    errors.push('Desired count must be at least 1');
  }

  if (config.autoScalingMaxCapacity < config.desiredCount) {
    errors.push('Max capacity must be at least desired count');
  }

  if (errors.length > 0) {
    throw new Error(`Environment configuration validation failed:\n${errors.join('\n')}`);
  }
}

/**
 * Create CDK context for an environment
 */
export function createCdkContext(
  environment: string,
  config: EnvironmentConfig
): { [key: string]: any } {
  return {
    environment,
    [environment]: config,
  };
}

/**
 * Get resource naming convention
 */
export function getResourceName(
  baseName: string,
  environment: string,
  resourceType: string
): string {
  return `${baseName}-${environment}-${resourceType}`;
}

/**
 * Get cost allocation tags
 */
export function getCostAllocationTags(
  project: string,
  environment: string,
  costCenter: string
): { [key: string]: string } {
  return {
    Project: project,
    Environment: environment,
    CostCenter: costCenter,
    ManagedBy: 'CDK',
    CreatedBy: 'cdk-fargate-scaffold',
  };
}

/**
 * Parse environment variables with defaults
 */
export function parseEnvironmentVariables(
  env: NodeJS.ProcessEnv,
  defaults: { [key: string]: string }
): { [key: string]: string } {
  const result: { [key: string]: string } = {};

  Object.entries(defaults).forEach(([key, defaultValue]) => {
    result[key] = env[key] || defaultValue;
  });

  return result;
}

/**
 * Get Fargate resource limits
 */
export function getFargateResourceLimits(): {
  cpu: { min: number; max: number; valid: number[] };
  memory: { min: number; max: number; valid: number[] };
} {
  return {
    cpu: {
      min: 256,
      max: 4096,
      valid: [256, 512, 1024, 2048, 4096],
    },
    memory: {
      min: 512,
      max: 8192,
      valid: [512, 1024, 2048, 3072, 4096, 5120, 6144, 7168, 8192],
    },
  };
}

/**
 * Validate Fargate resource configuration
 */
export function validateFargateResources(
  cpu: number,
  memory: number
): void {
  const limits = getFargateResourceLimits();

  if (!limits.cpu.valid.includes(cpu)) {
    throw new Error(
      `Invalid CPU value: ${cpu}. Valid values: ${limits.cpu.valid.join(', ')}`
    );
  }

  if (!limits.memory.valid.includes(memory)) {
    throw new Error(
      `Invalid memory value: ${memory}. Valid values: ${limits.memory.valid.join(', ')}`
    );
  }

  // Validate CPU to memory ratio
  const ratio = memory / cpu;
  if (ratio < 1 || ratio > 4) {
    throw new Error(
      `Invalid CPU to memory ratio: ${ratio.toFixed(2)}. Must be between 1:1 and 1:4`
    );
  }
}
