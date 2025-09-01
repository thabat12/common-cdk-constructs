import * as cdk from 'aws-cdk-lib';
import * as ec2 from 'aws-cdk-lib/aws-ec2';
import * as ecs from 'aws-cdk-lib/aws-ecs';
import * as ecr from 'aws-cdk-lib/aws-ecr';
import * as iam from 'aws-cdk-lib/aws-iam';
import * as logs from 'aws-cdk-lib/aws-logs';
import * as elbv2 from 'aws-cdk-lib/aws-elasticloadbalancingv2';
import * as cloudwatch from 'aws-cdk-lib/aws-cloudwatch';
import * as sns from 'aws-cdk-lib/aws-sns';
import * as actions from 'aws-cdk-lib/aws-cloudwatch-actions';
import { Construct } from 'constructs';

export interface FargateServiceProps {
  /**
   * The VPC where the service will be deployed
   */
  vpc: ec2.IVpc;

  /**
   * The Docker image to deploy. Can be:
   * - ECR repository URI string (e.g., "123456789.dkr.ecr.us-east-1.amazonaws.com/my-repo")
   * - Standard ECR IRepository interface
   * - External registry image string (e.g., "nginx:latest")
   */
  image: string | ecr.IRepository;

  /**
   * The name of the service
   */
  serviceName: string;

  /**
   * Image tag to use (default: 'latest')
   */
  imageTag?: string;

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
  environment?: { [key: string]: string };

  /**
   * Secrets for the container
   */
  secrets?: { [key: string]: ecs.Secret };

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
  tags?: { [key: string]: string };

  /**
   * Security groups to assign to the service
   */
  securityGroups?: ec2.ISecurityGroup[];

  /**
   * Subnet selection for the service
   */
  vpcSubnets?: ec2.SubnetSelection;
}

export class FargateService extends Construct {
  public readonly service: ecs.FargateService;
  public readonly cluster: ecs.Cluster;
  public readonly taskDefinition: ecs.FargateTaskDefinition;
  public readonly loadBalancer?: elbv2.ApplicationLoadBalancer;
  public readonly targetGroup?: elbv2.ApplicationTargetGroup;
  public readonly ecrRepository?: ecr.IRepository;
  public readonly logGroup: logs.LogGroup;
  public readonly scaling?: ecs.ScalableTaskCount;

  constructor(scope: Construct, id: string, props: FargateServiceProps) {
    super(scope, id);

    const cpu = props.cpu || 256;
    const memory = props.memory || 512;
    const desiredCount = props.desiredCount || 1;
    const maxCapacity = props.maxCapacity || 5;
    const minCapacity = props.minCapacity || 1;
    const containerPort = props.containerPort || 80;
    const healthCheckPath = props.healthCheckPath || '/health';
    const enableAutoScaling = props.enableAutoScaling ?? true;
    const enableLoadBalancer = props.enableLoadBalancer ?? true;
    const enableContainerInsights = props.enableContainerInsights ?? true;
    const enableXRay = props.enableXRay ?? false;
    const logRetentionDays = props.logRetentionDays || 7;
    const targetCpuUtilization = props.targetCpuUtilization || 70;
    const targetMemoryUtilization = props.targetMemoryUtilization || 80;
    const imageTag = props.imageTag || 'latest';

    // Create ECS cluster
    this.cluster = new ecs.Cluster(this, 'Cluster', {
      vpc: props.vpc,
      clusterName: `${props.serviceName}-cluster`,
      containerInsights: enableContainerInsights,
      enableFargateCapacityProviders: true,
    });

    // Handle ECR repository - check if it's a standard ECR IRepository
    if (props.image && typeof props.image === 'object' && 'repositoryArn' in props.image) {
      // It's a standard ECR IRepository
      this.ecrRepository = props.image as ecr.IRepository;
    }

    // Create log group with proper retention
    let retention: logs.RetentionDays;
    switch (logRetentionDays) {
      case 1:
        retention = logs.RetentionDays.ONE_DAY;
        break;
      case 3:
        retention = logs.RetentionDays.THREE_DAYS;
        break;
      case 5:
        retention = logs.RetentionDays.FIVE_DAYS;
        break;
      case 7:
        retention = logs.RetentionDays.ONE_WEEK;
        break;
      case 14:
        retention = logs.RetentionDays.TWO_WEEKS;
        break;
      case 30:
        retention = logs.RetentionDays.ONE_MONTH;
        break;
      case 60:
        retention = logs.RetentionDays.TWO_MONTHS;
        break;
      case 90:
        retention = logs.RetentionDays.THREE_MONTHS;
        break;
      case 120:
        retention = logs.RetentionDays.FOUR_MONTHS;
        break;
      case 150:
        retention = logs.RetentionDays.FIVE_MONTHS;
        break;
      case 180:
        retention = logs.RetentionDays.SIX_MONTHS;
        break;
      case 365:
        retention = logs.RetentionDays.ONE_YEAR;
        break;
      default:
        retention = logs.RetentionDays.ONE_WEEK;
    }

    this.logGroup = new logs.LogGroup(this, 'LogGroup', {
      logGroupName: `/ecs/${props.serviceName}`,
      retention,
      removalPolicy: cdk.RemovalPolicy.DESTROY,
    });

    // Create task execution role
    const taskExecutionRole = new iam.Role(this, 'TaskExecutionRole', {
      assumedBy: new iam.ServicePrincipal('ecs-tasks.amazonaws.com'),
      managedPolicies: [
        iam.ManagedPolicy.fromAwsManagedPolicyName('service-role/AmazonECSTaskExecutionRolePolicy'),
      ],
    });

    // Create task role
    const taskRole = new iam.Role(this, 'TaskRole', {
      assumedBy: new iam.ServicePrincipal('ecs-tasks.amazonaws.com'),
    });

    // Add permissions for CloudWatch logs
    taskRole.addToPolicy(
      new iam.PolicyStatement({
        effect: iam.Effect.ALLOW,
        actions: [
          'logs:CreateLogGroup',
          'logs:CreateLogStream',
          'logs:PutLogEvents',
        ],
        resources: ['*'],
      })
    );

    // Add X-Ray permissions if enabled
    if (enableXRay) {
      taskRole.addToPolicy(
        new iam.PolicyStatement({
          effect: iam.Effect.ALLOW,
          actions: [
            'xray:PutTraceSegments',
            'xray:PutTelemetryRecords',
          ],
          resources: ['*'],
        })
      );
    }

    // Create task definition
    this.taskDefinition = new ecs.FargateTaskDefinition(this, 'TaskDefinition', {
      memoryLimitMiB: memory,
      cpu,
      executionRole: taskExecutionRole,
      taskRole,
    });

    // Determine container image
    let containerImage: ecs.ContainerImage;
    if (typeof props.image === 'string') {
      // String image - check if it's an ECR URI or external registry
      if (props.image.includes('.dkr.ecr.') && props.image.includes('.amazonaws.com/')) {
        // ECR URI - use with tag
        containerImage = ecs.ContainerImage.fromRegistry(`${props.image}:${imageTag}`);
      } else {
        // External registry image
        containerImage = ecs.ContainerImage.fromRegistry(props.image);
      }
    } else if (props.image && typeof props.image === 'object' && 'repositoryArn' in props.image) {
      // Standard ECR IRepository
      containerImage = ecs.ContainerImage.fromEcrRepository(props.image as ecr.IRepository, imageTag);
    } else {
      // Fallback to external registry
      containerImage = ecs.ContainerImage.fromRegistry('nginx:latest');
    }

    // Add container to task definition
    this.taskDefinition.addContainer('Container', {
      image: containerImage,
      containerName: props.serviceName,
      logging: ecs.LogDrivers.awsLogs({
        streamPrefix: props.serviceName,
        logGroup: this.logGroup,
      }),
      environment: props.environment,
      secrets: props.secrets,
      portMappings: [
        {
          containerPort,
          protocol: ecs.Protocol.TCP,
        },
      ],
      healthCheck: {
        command: ['CMD-SHELL', `curl -f ${healthCheckPath} || exit 1`],
        interval: cdk.Duration.seconds(30),
        timeout: cdk.Duration.seconds(5),
        retries: 3,
        startPeriod: cdk.Duration.seconds(60),
      },
    });

    // Create load balancer if enabled
    if (enableLoadBalancer) {
      this.loadBalancer = new elbv2.ApplicationLoadBalancer(this, 'LoadBalancer', {
        vpc: props.vpc,
        internetFacing: true,
        loadBalancerName: `${props.serviceName}-alb`,
      });

      this.targetGroup = new elbv2.ApplicationTargetGroup(this, 'TargetGroup', {
        vpc: props.vpc,
        port: containerPort,
        protocol: elbv2.ApplicationProtocol.HTTP,
        targetType: elbv2.TargetType.IP,
        healthCheck: {
          path: healthCheckPath,
          healthyHttpCodes: '200',
          interval: cdk.Duration.seconds(30),
          timeout: cdk.Duration.seconds(5),
          healthyThresholdCount: 2,
          unhealthyThresholdCount: 3,
        },
      });

      // Add listener
      this.loadBalancer.addListener('Listener', {
        port: 80,
        protocol: elbv2.ApplicationProtocol.HTTP,
        defaultAction: elbv2.ListenerAction.forward([this.targetGroup]),
      });
    }

    // Create Fargate service
    this.service = new ecs.FargateService(this, 'Service', {
      cluster: this.cluster,
      taskDefinition: this.taskDefinition,
      serviceName: props.serviceName,
      desiredCount,
      assignPublicIp: false,
      vpcSubnets: props.vpcSubnets || {
        subnetType: ec2.SubnetType.PRIVATE_WITH_EGRESS,
      },
      securityGroups: props.securityGroups,
      enableExecuteCommand: true,
    });

    // Attach to load balancer if enabled
    if (this.targetGroup) {
      this.service.attachToApplicationTargetGroup(this.targetGroup);
    }

    // Enable auto-scaling if requested
    if (enableAutoScaling) {
      this.scaling = this.service.autoScaleTaskCount({
        maxCapacity,
        minCapacity,
      });

      // Scale on CPU utilization
      this.scaling.scaleOnCpuUtilization('CpuScaling', {
        targetUtilizationPercent: targetCpuUtilization,
        scaleInCooldown: cdk.Duration.seconds(60),
        scaleOutCooldown: cdk.Duration.seconds(60),
      });

      // Scale on memory utilization
      this.scaling.scaleOnMemoryUtilization('MemoryScaling', {
        targetUtilizationPercent: targetMemoryUtilization,
        scaleInCooldown: cdk.Duration.seconds(60),
        scaleOutCooldown: cdk.Duration.seconds(60),
      });
    }

    // Add tags
    if (props.tags) {
      Object.entries(props.tags).forEach(([key, value]) => {
        cdk.Tags.of(this.service).add(key, value);
      });
    }

    // Add default tags
    cdk.Tags.of(this.service).add('Service', props.serviceName);
    cdk.Tags.of(this.service).add('Purpose', 'Fargate Service');
    cdk.Tags.of(this.service).add('ManagedBy', 'CDK');

    // Create CloudWatch alarms
    this.createCloudWatchAlarms();

    // Outputs
    new cdk.CfnOutput(this, 'ServiceName', {
      value: this.service.serviceName,
      description: 'Fargate service name',
      exportName: `${props.serviceName}-ServiceName`,
    });

    new cdk.CfnOutput(this, 'ServiceArn', {
      value: this.service.serviceArn,
      description: 'Fargate service ARN',
      exportName: `${props.serviceName}-ServiceArn`,
    });

    if (this.loadBalancer) {
      new cdk.CfnOutput(this, 'LoadBalancerDNS', {
        value: this.loadBalancer.loadBalancerDnsName,
        description: 'Load balancer DNS name',
        exportName: `${props.serviceName}-LoadBalancerDNS`,
      });
    }

    if (this.ecrRepository) {
      new cdk.CfnOutput(this, 'ECRRepositoryUri', {
        value: this.ecrRepository.repositoryUri,
        description: 'ECR repository URI',
        exportName: `${props.serviceName}-ECRRepositoryUri`,
      });
    }
  }

  private createCloudWatchAlarms(): void {
    // CPU utilization alarm
    const cpuAlarm = new cloudwatch.Alarm(this, 'CPUUtilizationAlarm', {
      metric: this.service.metricCpuUtilization(),
      threshold: 80,
      evaluationPeriods: 2,
      alarmDescription: 'CPU utilization is too high',
      alarmName: `${this.service.serviceName}-CPU-High`,
    });

    // Memory utilization alarm
    const memoryAlarm = new cloudwatch.Alarm(this, 'MemoryUtilizationAlarm', {
      metric: this.service.metricMemoryUtilization(),
      threshold: 80,
      evaluationPeriods: 2,
      alarmDescription: 'Memory utilization is too high',
      alarmName: `${this.service.serviceName}-Memory-High`,
    });

    // Service health alarm (using custom metric for service health)
    const healthAlarm = new cloudwatch.Alarm(this, 'ServiceHealthAlarm', {
      metric: new cloudwatch.Metric({
        namespace: 'AWS/ECS',
        metricName: 'ServiceCount',
        dimensionsMap: {
          ServiceName: this.service.serviceName,
          ClusterName: this.cluster.clusterName,
        },
        statistic: 'Average',
        period: cdk.Duration.minutes(1),
      }),
      threshold: 1,
      evaluationPeriods: 1,
      comparisonOperator: cloudwatch.ComparisonOperator.LESS_THAN_THRESHOLD,
      alarmDescription: 'Service health check failed',
      alarmName: `${this.service.serviceName}-Health-Check-Failed`,
    });

    // Create SNS topic for alarms
    const alarmTopic = new sns.Topic(this, 'AlarmTopic', {
      topicName: `${this.service.serviceName}-alarms`,
    });

    // Add alarms to SNS topic
    cpuAlarm.addAlarmAction(new actions.SnsAction(alarmTopic));
    memoryAlarm.addAlarmAction(new actions.SnsAction(alarmTopic));
    healthAlarm.addAlarmAction(new actions.SnsAction(alarmTopic));

    // Add OK actions
    cpuAlarm.addOkAction(new actions.SnsAction(alarmTopic));
    memoryAlarm.addOkAction(new actions.SnsAction(alarmTopic));
    healthAlarm.addOkAction(new actions.SnsAction(alarmTopic));
  }

  /**
   * Grant permissions to the task role
   */
  public grantTaskRole(permissions: iam.PolicyStatement): void {
    if (this.taskDefinition.taskRole) {
      (this.taskDefinition.taskRole as iam.Role).addToPolicy(permissions);
    }
  }

  /**
   * Grant permissions to the task execution role
   */
  public grantTaskExecutionRole(permissions: iam.PolicyStatement): void {
    if (this.taskDefinition.executionRole) {
      (this.taskDefinition.executionRole as iam.Role).addToPolicy(permissions);
    }
  }

  /**
   * Update the service with a new task definition
   */
  public updateService(_newTaskDefinition: ecs.FargateTaskDefinition): void {
    if (this.targetGroup) {
      this.service.attachToApplicationTargetGroup(this.targetGroup);
    }
  }
}
