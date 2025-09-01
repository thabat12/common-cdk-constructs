// Constants for CDK Fargate Scaffold

/**
 * Default values for common configurations
 */
export const DEFAULTS = {
  // Fargate resources
  CPU: 256,
  MEMORY: 512,
  DESIRED_COUNT: 1,
  MAX_CAPACITY: 5,
  MIN_CAPACITY: 1,

  // Ports
  CONTAINER_PORT: 80,
  HEALTH_CHECK_PORT: 80,

  // Health checks
  HEALTH_CHECK_PATH: '/health',
  HEALTH_CHECK_INTERVAL: 30,
  HEALTH_CHECK_TIMEOUT: 5,
  HEALTH_CHECK_RETRIES: 3,
  HEALTH_CHECK_START_PERIOD: 60,

  // Auto-scaling
  TARGET_CPU_UTILIZATION: 70,
  TARGET_MEMORY_UTILIZATION: 80,
  SCALE_IN_COOLDOWN: 60,
  SCALE_OUT_COOLDOWN: 60,

  // Monitoring
  LOG_RETENTION_DAYS: 7,
  ENABLE_CONTAINER_INSIGHTS: true,
  ENABLE_XRAY: false,

  // VPC
  VPC_CIDR: '10.0.0.0/16',
  MAX_AZS: 2,
  NAT_GATEWAYS: 1,
  SUBNET_CIDR_MASK: 24,

  // Tags
  MANAGED_BY: 'CDK',
  CREATED_BY: 'cdk-fargate-scaffold',
} as const;

/**
 * Valid Fargate CPU values
 */
export const VALID_CPU_VALUES = [256, 512, 1024, 2048, 4096] as const;

/**
 * Valid Fargate memory values
 */
export const VALID_MEMORY_VALUES = [
  512, 1024, 2048, 3072, 4096, 5120, 6144, 7168, 8192,
] as const;

/**
 * Valid log retention values
 */
export const VALID_LOG_RETENTION_DAYS = [
  1, 3, 5, 7, 14, 30, 60, 90, 120, 150, 180, 365, 400, 545, 731, 1827, 3653,
] as const;

/**
 * Environment names
 */
export const ENVIRONMENTS = ['dev', 'staging', 'production'] as const;

/**
 * Resource types
 */
export const RESOURCE_TYPES = {
  VPC: 'vpc',
  CLUSTER: 'cluster',
  SERVICE: 'service',
  REPOSITORY: 'repository',
  LOAD_BALANCER: 'loadbalancer',
  TARGET_GROUP: 'targetgroup',
  LOG_GROUP: 'loggroup',
  SECURITY_GROUP: 'securitygroup',
} as const;

/**
 * AWS service endpoints for VPC endpoints
 */
export const VPC_ENDPOINT_SERVICES = [
  'ECR',
  'ECR_DOCKER',
  'CLOUDWATCH_LOGS',
  'CLOUDWATCH_MONITORING',
  'SECRETS_MANAGER',
  'SSM',
  'SSM_MESSAGES',
  'EC2_MESSAGES',
] as const;

/**
 * Error messages
 */
export const ERROR_MESSAGES = {
  MISSING_ENV_VARS: 'Missing required environment variables',
  INVALID_CPU: 'Invalid CPU value',
  INVALID_MEMORY: 'Invalid memory value',
  INVALID_CPU_MEMORY_RATIO: 'Invalid CPU to memory ratio',
  INVALID_ENVIRONMENT: 'Invalid environment',
  INVALID_LOG_RETENTION: 'Invalid log retention days',
  CONFIGURATION_VALIDATION_FAILED: 'Environment configuration validation failed',
} as const;

/**
 * Success messages
 */
export const SUCCESS_MESSAGES = {
  DEPLOYMENT_COMPLETED: 'Deployment completed successfully',
  IMAGE_DEPLOYED: 'Docker image deployed successfully',
  STACK_DEPLOYED: 'CDK stack deployed successfully',
  RESOURCES_CREATED: 'Resources created successfully',
} as const;

/**
 * File paths and names
 */
export const PATHS = {
  ENV_FILE: '.env',
  ENV_EXAMPLE: 'env.example',
  DOCKERFILE: 'Dockerfile',
  CDK_OUT: 'cdk.out',
  DIST: 'dist',
  SRC: 'src',
  CONSTRUCTS: 'src/constructs',
  STACKS: 'src/stacks',
  UTILS: 'src/utils',
  TYPES: 'src/types',
  CONSTANTS: 'src/constants',
} as const;
