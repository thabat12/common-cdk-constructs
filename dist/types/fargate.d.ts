import * as ec2 from 'aws-cdk-lib/aws-ec2';
import * as ecs from 'aws-cdk-lib/aws-ecs';
import * as ecr from 'aws-cdk-lib/aws-ecr';
/**
 * Fargate service configuration interface
 */
export interface FargateServiceConfig {
    /**
     * The VPC where the service will be deployed
     */
    vpc: ec2.IVpc;
    /**
     * The Docker image to deploy
     */
    image: string | ecr.IRepository;
    /**
     * The name of the service
     */
    serviceName: string;
    /**
     * CPU units for the task
     */
    cpu?: number;
    /**
     * Memory for the task in MiB
     */
    memory?: number;
    /**
     * Desired number of tasks
     */
    desiredCount?: number;
    /**
     * Maximum number of tasks for auto-scaling
     */
    maxCapacity?: number;
    /**
     * Minimum number of tasks for auto-scaling
     */
    minCapacity?: number;
    /**
     * Port that the container exposes
     */
    containerPort?: number;
    /**
     * Health check path for the load balancer
     */
    healthCheckPath?: string;
    /**
     * Environment variables for the container
     */
    environment?: {
        [key: string]: string;
    };
    /**
     * Secrets for the container
     */
    secrets?: {
        [key: string]: ecs.Secret;
    };
    /**
     * Whether to enable auto-scaling
     */
    enableAutoScaling?: boolean;
    /**
     * Whether to enable load balancing
     */
    enableLoadBalancer?: boolean;
    /**
     * Whether to enable container insights
     */
    enableContainerInsights?: boolean;
    /**
     * Whether to enable X-Ray tracing
     */
    enableXRay?: boolean;
    /**
     * Log retention days
     */
    logRetentionDays?: number;
    /**
     * Auto-scaling target CPU utilization percentage
     */
    targetCpuUtilization?: number;
    /**
     * Auto-scaling target memory utilization percentage
     */
    targetMemoryUtilization?: number;
    /**
     * Tags to apply to resources
     */
    tags?: {
        [key: string]: string;
    };
    /**
     * Security groups to assign to the service
     */
    securityGroups?: ec2.ISecurityGroup[];
    /**
     * Subnet selection for the service
     */
    vpcSubnets?: ec2.SubnetSelection;
}
/**
 * Fargate service result interface
 */
export interface FargateServiceResult {
    /**
     * The Fargate service
     */
    service: ecs.FargateService;
    /**
     * The ECS cluster
     */
    cluster: ecs.Cluster;
    /**
     * The task definition
     */
    taskDefinition: ecs.FargateTaskDefinition;
    /**
     * The load balancer (if enabled)
     */
    loadBalancer?: ecs.IFargateService;
    /**
     * The target group (if load balancer enabled)
     */
    targetGroup?: ecs.IFargateService;
    /**
     * The ECR repository (if created)
     */
    ecrRepository?: ecr.Repository;
    /**
     * The log group
     */
    logGroup: ecs.IFargateService;
    /**
     * The auto-scaling object (if enabled)
     */
    scaling?: ecs.ScalableTaskCount;
}
/**
 * Fargate resource limits
 */
export interface FargateResourceLimits {
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
}
/**
 * Auto-scaling configuration
 */
export interface AutoScalingConfig {
    /**
     * Minimum capacity
     */
    minCapacity: number;
    /**
     * Maximum capacity
     */
    maxCapacity: number;
    /**
     * Target CPU utilization
     */
    targetCpuUtilization: number;
    /**
     * Target memory utilization
     */
    targetMemoryUtilization: number;
    /**
     * Scale in cooldown
     */
    scaleInCooldown: number;
    /**
     * Scale out cooldown
     */
    scaleOutCooldown: number;
}
