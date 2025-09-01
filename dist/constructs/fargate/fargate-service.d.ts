import * as ec2 from 'aws-cdk-lib/aws-ec2';
import * as ecs from 'aws-cdk-lib/aws-ecs';
import * as ecr from 'aws-cdk-lib/aws-ecr';
import * as iam from 'aws-cdk-lib/aws-iam';
import * as logs from 'aws-cdk-lib/aws-logs';
import * as elbv2 from 'aws-cdk-lib/aws-elasticloadbalancingv2';
import { Construct } from 'constructs';
export interface FargateServiceProps {
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
     * CPU units for the task (256 = 0.25 vCPU, 512 = 0.5 vCPU, 1024 = 1 vCPU, etc.)
     * @default 256
     */
    cpu?: number;
    /**
     * Memory for the task in MiB
     * @default 512
     */
    memory?: number;
    /**
     * Desired number of tasks
     * @default 1
     */
    desiredCount?: number;
    /**
     * Maximum number of tasks for auto-scaling
     * @default 5
     */
    maxCapacity?: number;
    /**
     * Minimum number of tasks for auto-scaling
     * @default 1
     */
    minCapacity?: number;
    /**
     * Port that the container exposes
     * @default 80
     */
    containerPort?: number;
    /**
     * Health check path for the load balancer
     * @default /health
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
     * @default true
     */
    enableAutoScaling?: boolean;
    /**
     * Whether to enable load balancing
     * @default true
     */
    enableLoadBalancer?: boolean;
    /**
     * Whether to enable container insights
     * @default true
     */
    enableContainerInsights?: boolean;
    /**
     * Whether to enable X-Ray tracing
     * @default false
     */
    enableXRay?: boolean;
    /**
     * Log retention days
     * @default 7
     */
    logRetentionDays?: number;
    /**
     * Auto-scaling target CPU utilization percentage
     * @default 70
     */
    targetCpuUtilization?: number;
    /**
     * Auto-scaling target memory utilization percentage
     * @default 80
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
export declare class FargateService extends Construct {
    readonly service: ecs.FargateService;
    readonly cluster: ecs.Cluster;
    readonly taskDefinition: ecs.FargateTaskDefinition;
    readonly loadBalancer?: elbv2.ApplicationLoadBalancer;
    readonly targetGroup?: elbv2.ApplicationTargetGroup;
    readonly ecrRepository?: ecr.Repository;
    readonly logGroup: logs.LogGroup;
    readonly scaling?: ecs.ScalableTaskCount;
    constructor(scope: Construct, id: string, props: FargateServiceProps);
    private createCloudWatchAlarms;
    /**
     * Grant permissions to the task role
     */
    grantTaskRole(permissions: iam.PolicyStatement): void;
    /**
     * Grant permissions to the task execution role
     */
    grantTaskExecutionRole(permissions: iam.PolicyStatement): void;
    /**
     * Update the service with a new task definition
     */
    updateService(newTaskDefinition: ecs.FargateTaskDefinition): void;
}
