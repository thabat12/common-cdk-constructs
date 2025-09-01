import { Construct } from 'constructs';
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
    tags: {
        [key: string]: string;
    };
}
/**
 * Default environment configurations
 */
export declare const DEFAULT_ENVIRONMENTS: {
    [key: string]: EnvironmentConfig;
};
/**
 * Get environment configuration with defaults
 */
export declare function getEnvironmentConfigFromContext(scope: Construct, environment: string): EnvironmentConfig;
/**
 * Validate environment configuration
 */
export declare function validateEnvironmentConfig(config: EnvironmentConfig): void;
/**
 * Create CDK context for an environment
 */
export declare function createCdkContext(environment: string, config: EnvironmentConfig): {
    [key: string]: any;
};
/**
 * Get resource naming convention
 */
export declare function getResourceName(baseName: string, environment: string, resourceType: string): string;
/**
 * Get cost allocation tags
 */
export declare function getCostAllocationTags(project: string, environment: string, costCenter: string): {
    [key: string]: string;
};
/**
 * Parse environment variables with defaults
 */
export declare function parseEnvironmentVariables(env: {
    [key: string]: string | undefined;
}, defaults: {
    [key: string]: string;
}): {
    [key: string]: string;
};
/**
 * Get Fargate resource limits
 */
export declare function getFargateResourceLimits(): {
    cpu: {
        min: number;
        max: number;
        valid: number[];
    };
    memory: {
        min: number;
        max: number;
        valid: number[];
    };
};
/**
 * Validate Fargate resource configuration
 */
export declare function validateFargateResources(cpu: number, memory: number): void;
