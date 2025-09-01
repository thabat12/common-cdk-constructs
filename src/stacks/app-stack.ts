import * as cdk from 'aws-cdk-lib';
import * as ec2 from 'aws-cdk-lib/aws-ec2';
import { Construct } from 'constructs';
import { VPCStack } from '../constructs/base/vpc-stack';
import { FargateService } from '../constructs/fargate/fargate-service';

export interface AppStackProps extends cdk.StackProps {
  /**
   * The name of the application
   */
  appName: string;

  /**
   * The Docker image to deploy
   */
  dockerImage: string;

  /**
   * Environment (dev, staging, production)
   */
  environment: string;

  /**
   * CPU units for the Fargate task
   */
  fargateCpu: number;

  /**
   * Memory for the Fargate task in MiB
   */
  fargateMemory: number;

  /**
   * Desired number of tasks
   */
  desiredCount: number;

  /**
   * Maximum number of tasks for auto-scaling
   */
  autoScalingMaxCapacity: number;

  /**
   * Whether to enable container insights
   */
  enableContainerInsights: boolean;

  /**
   * Whether to enable X-Ray tracing
   */
  enableXRay: boolean;

  /**
   * Log retention days
   */
  logRetentionDays: number;

  /**
   * Cost center for tagging
   */
  costCenter: string;

  /**
   * Additional tags
   */
  tags?: { [key: string]: string };
}

export class AppStack extends cdk.Stack {
  public readonly vpc: ec2.IVpc;
  public readonly fargateService: FargateService;

  constructor(scope: Construct, id: string, props: AppStackProps) {
    super(scope, id, props);

    // Create VPC using the reusable construct
    const vpcStack = new VPCStack(this, 'VPC', {
      vpcCidr: this.node.tryGetContext(props.environment)?.vpcCidr || '10.0.0.0/16',
      maxAzs: this.node.tryGetContext(props.environment)?.maxAzs || 2,
      natGateways: this.node.tryGetContext(props.environment)?.natGateways || 1,
      tags: {
        Environment: props.environment,
        CostCenter: props.costCenter,
        Project: props.appName,
        ...props.tags,
      },
    });

    this.vpc = vpcStack.vpc;

    // Create security group for the Fargate service
    const securityGroup = new ec2.SecurityGroup(this, 'ServiceSecurityGroup', {
      vpc: this.vpc,
      description: `Security group for ${props.appName} Fargate service`,
      allowAllOutbound: true,
    });

    // Allow inbound traffic on the container port
    securityGroup.addIngressRule(
      ec2.Peer.anyIpv4(),
      ec2.Port.tcp(80),
      'Allow HTTP traffic'
    );

    // Allow health check traffic
    securityGroup.addIngressRule(
      ec2.Peer.anyIpv4(),
      ec2.Port.tcp(80),
      'Allow health check traffic'
    );

    // Create Fargate service using the reusable construct
    this.fargateService = new FargateService(this, 'FargateService', {
      vpc: this.vpc,
      image: props.dockerImage,
      serviceName: props.appName,
      cpu: props.fargateCpu,
      memory: props.fargateMemory,
      desiredCount: props.desiredCount,
      maxCapacity: props.autoScalingMaxCapacity,
      minCapacity: props.desiredCount,
      containerPort: 80,
      healthCheckPath: '/health',
      environment: {
        ENVIRONMENT: props.environment,
        APP_NAME: props.appName,
        VERSION: '1.0.0',
        DEPLOYMENT_ID: Date.now().toString(),
      },
      enableAutoScaling: true,
      enableLoadBalancer: true,
      enableContainerInsights: props.enableContainerInsights,
      enableXRay: props.enableXRay,
      logRetentionDays: props.logRetentionDays,
      securityGroups: [securityGroup],
      vpcSubnets: {
        subnetType: ec2.SubnetType.PRIVATE_WITH_EGRESS,
      },
      tags: {
        Environment: props.environment,
        CostCenter: props.costCenter,
        Project: props.appName,
        Service: props.appName,
        ...props.tags,
      },
    });

    // Add tags to all resources
    cdk.Tags.of(this).add('Environment', props.environment);
    cdk.Tags.of(this).add('CostCenter', props.costCenter);
    cdk.Tags.of(this).add('Project', props.appName);
    cdk.Tags.of(this).add('ManagedBy', 'CDK');

    // Create outputs
    new cdk.CfnOutput(this, 'AppName', {
      value: props.appName,
      description: 'Application name',
      exportName: `${props.appName}-AppName`,
    });

    new cdk.CfnOutput(this, 'Environment', {
      value: props.environment,
      description: 'Deployment environment',
      exportName: `${props.appName}-Environment`,
    });

    new cdk.CfnOutput(this, 'VPCId', {
      value: this.vpc.vpcId,
      description: 'VPC ID',
      exportName: `${props.appName}-VPCId`,
    });

    new cdk.CfnOutput(this, 'ServiceName', {
      value: this.fargateService.service.serviceName,
      description: 'Fargate service name',
      exportName: `${props.appName}-ServiceName`,
    });

    new cdk.CfnOutput(this, 'LoadBalancerDNS', {
      value: this.fargateService.loadBalancer?.loadBalancerDnsName || 'N/A',
      description: 'Load balancer DNS name',
      exportName: `${props.appName}-LoadBalancerDNS`,
    });

    new cdk.CfnOutput(this, 'ECRRepositoryUri', {
      value: this.fargateService.ecrRepository?.repositoryUri || 'N/A',
      description: 'ECR repository URI',
      exportName: `${props.appName}-ECRRepositoryUri`,
    });

    new cdk.CfnOutput(this, 'LogGroupName', {
      value: this.fargateService.logGroup.logGroupName,
      description: 'CloudWatch log group name',
      exportName: `${props.appName}-LogGroupName`,
    });

    // Add cost allocation tags
    cdk.Tags.of(this).add('aws:cloudformation:stack-name', this.stackName);
    cdk.Tags.of(this).add('aws:cloudformation:stack-id', this.stackId);
  }
}
