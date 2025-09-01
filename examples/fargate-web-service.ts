import * as cdk from 'aws-cdk-lib';
import { Construct } from 'constructs';
import { VPCStack } from '../src/constructs/base/vpc-stack';
import { FargateService } from '../src/constructs/fargate/fargate-service';

/**
 * Fargate Web Service Example
 * 
 * This example demonstrates:
 * - VPC creation with production configuration
 * - Fargate service deployment with auto-scaling
 * - Load balancer integration
 * - Health checks and monitoring
 * 
 * All constructs used in this example have comprehensive unit tests.
 */
export class FargateWebServiceStack extends cdk.Stack {
  constructor(scope: Construct, id: string, props?: cdk.StackProps) {
    super(scope, id, props);

    // Create VPC with production configuration
    const vpc = new VPCStack(this, 'VPC', {
      vpcCidr: '10.0.0.0/16',
      maxAzs: 2,
      natGateways: 1,
      enableDnsSupport: true,
      enableDnsHostnames: true,
      tags: {
        Environment: 'production',
        Project: 'web-service',
        Purpose: 'Web service infrastructure',
      },
    });

    // Deploy Fargate service
    const webService = new FargateService(this, 'WebService', {
      vpc: vpc.vpc,
      image: 'my-web-service:latest', // Replace with your actual image
      serviceName: 'web-service',
      cpu: 256,
      memory: 512,
      desiredCount: 2,
      enableAutoScaling: true,
      maxCapacity: 5,
      minCapacity: 1,
      enableLoadBalancer: true,
      healthCheckPath: '/health',
      containerPort: 8080,
      enableContainerInsights: true,
      enableXRay: true,
      environment: {
        NODE_ENV: 'production',
        PORT: '8080',
        APP_NAME: 'web-service',
      },
      tags: {
        Environment: 'production',
        Project: 'web-service',
        Service: 'web-service',
      },
    });

    // Output the load balancer URL
    new cdk.CfnOutput(this, 'LoadBalancerURL', {
      value: `http://${webService.loadBalancer?.loadBalancerDnsName}`,
      description: 'Web service application URL',
      exportName: 'WebServiceLoadBalancerURL',
    });

    // Output the VPC ID
    new cdk.CfnOutput(this, 'VPCId', {
      value: vpc.vpc.vpcId,
      description: 'VPC ID',
      exportName: 'WebServiceVPCId',
    });

    // Output the service name
    new cdk.CfnOutput(this, 'ServiceName', {
      value: webService.service.serviceName,
      description: 'Fargate service name',
      exportName: 'WebServiceServiceName',
    });
  }
}
