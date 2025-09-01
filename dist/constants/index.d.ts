/**
 * Default values for common configurations
 */
export declare const DEFAULTS: {
    readonly CPU: 256;
    readonly MEMORY: 512;
    readonly DESIRED_COUNT: 1;
    readonly MAX_CAPACITY: 5;
    readonly MIN_CAPACITY: 1;
    readonly CONTAINER_PORT: 80;
    readonly HEALTH_CHECK_PORT: 80;
    readonly HEALTH_CHECK_PATH: "/health";
    readonly HEALTH_CHECK_INTERVAL: 30;
    readonly HEALTH_CHECK_TIMEOUT: 5;
    readonly HEALTH_CHECK_RETRIES: 3;
    readonly HEALTH_CHECK_START_PERIOD: 60;
    readonly TARGET_CPU_UTILIZATION: 70;
    readonly TARGET_MEMORY_UTILIZATION: 80;
    readonly SCALE_IN_COOLDOWN: 60;
    readonly SCALE_OUT_COOLDOWN: 60;
    readonly LOG_RETENTION_DAYS: 7;
    readonly ENABLE_CONTAINER_INSIGHTS: true;
    readonly ENABLE_XRAY: false;
    readonly VPC_CIDR: "10.0.0.0/16";
    readonly MAX_AZS: 2;
    readonly NAT_GATEWAYS: 1;
    readonly SUBNET_CIDR_MASK: 24;
    readonly MANAGED_BY: "CDK";
    readonly CREATED_BY: "cdk-fargate-scaffold";
};
/**
 * Valid Fargate CPU values
 */
export declare const VALID_CPU_VALUES: readonly [256, 512, 1024, 2048, 4096];
/**
 * Valid Fargate memory values
 */
export declare const VALID_MEMORY_VALUES: readonly [512, 1024, 2048, 3072, 4096, 5120, 6144, 7168, 8192];
/**
 * Valid log retention values
 */
export declare const VALID_LOG_RETENTION_DAYS: readonly [1, 3, 5, 7, 14, 30, 60, 90, 120, 150, 180, 365, 400, 545, 731, 1827, 3653];
/**
 * Environment names
 */
export declare const ENVIRONMENTS: readonly ["dev", "staging", "production"];
/**
 * Resource types
 */
export declare const RESOURCE_TYPES: {
    readonly VPC: "vpc";
    readonly CLUSTER: "cluster";
    readonly SERVICE: "service";
    readonly REPOSITORY: "repository";
    readonly LOAD_BALANCER: "loadbalancer";
    readonly TARGET_GROUP: "targetgroup";
    readonly LOG_GROUP: "loggroup";
    readonly SECURITY_GROUP: "securitygroup";
};
/**
 * AWS service endpoints for VPC endpoints
 */
export declare const VPC_ENDPOINT_SERVICES: readonly ["ECR", "ECR_DOCKER", "CLOUDWATCH_LOGS", "CLOUDWATCH_MONITORING", "SECRETS_MANAGER", "SSM", "SSM_MESSAGES", "EC2_MESSAGES"];
/**
 * Error messages
 */
export declare const ERROR_MESSAGES: {
    readonly MISSING_ENV_VARS: "Missing required environment variables";
    readonly INVALID_CPU: "Invalid CPU value";
    readonly INVALID_MEMORY: "Invalid memory value";
    readonly INVALID_CPU_MEMORY_RATIO: "Invalid CPU to memory ratio";
    readonly INVALID_ENVIRONMENT: "Invalid environment";
    readonly INVALID_LOG_RETENTION: "Invalid log retention days";
    readonly CONFIGURATION_VALIDATION_FAILED: "Environment configuration validation failed";
};
/**
 * Success messages
 */
export declare const SUCCESS_MESSAGES: {
    readonly DEPLOYMENT_COMPLETED: "Deployment completed successfully";
    readonly IMAGE_DEPLOYED: "Docker image deployed successfully";
    readonly STACK_DEPLOYED: "CDK stack deployed successfully";
    readonly RESOURCES_CREATED: "Resources created successfully";
};
/**
 * File paths and names
 */
export declare const PATHS: {
    readonly ENV_FILE: ".env";
    readonly ENV_EXAMPLE: "env.example";
    readonly DOCKERFILE: "Dockerfile";
    readonly CDK_OUT: "cdk.out";
    readonly DIST: "dist";
    readonly SRC: "src";
    readonly CONSTRUCTS: "src/constructs";
    readonly STACKS: "src/stacks";
    readonly UTILS: "src/utils";
    readonly TYPES: "src/types";
    readonly CONSTANTS: "src/constants";
};
