import * as cdk from 'aws-cdk-lib';
import { Construct } from 'constructs';
import { VPCStack, ECRRepository, FargateService } from '../src';

interface FargateWebServiceStackProps extends cdk.StackProps {
  environment?: 'dev' | 'staging' | 'production';
}

export class FargateWebServiceStack extends cdk.Stack {
  constructor(scope: Construct, id: string, props?: FargateWebServiceStackProps) {
    super(scope, id, props);

    const environment = props?.environment || 'dev';

    // Create VPC
    const vpc = new VPCStack(this, 'VPC', {
      maxAzs: 2,
      natGateways: 1,
    });

    // Create ECR Repository for the web service
    const webServiceRepo = new ECRRepository(this, 'WebServiceRepo', {
      repositoryName: `web-service-${environment}`,
      enableImageScanning: false, // Disable for cost savings
      maxImageCount: 3, // Keep only 3 images to save costs
      enableLifecyclePolicy: true,
    });

    // Create Fargate Service using the ECR repository URI
    const webService = new FargateService(this, 'WebService', {
      vpc: vpc.vpc,
      image: webServiceRepo.repositoryUri, // Use the repository URI string
      imageTag: 'latest', // Default tag, can be overridden
      serviceName: `web-service-${environment}`,
      cpu: 256,
      memory: 512,
      desiredCount: 1,
      containerPort: 80,
      healthCheckPath: '/health',
      enableAutoScaling: true,
      maxCapacity: 3,
      environment: {
        NODE_ENV: environment,
        PORT: '80',
      },
      tags: {
        Environment: environment,
        Service: 'web-service',
        Project: 'common-cdk-constructs',
      },
    });

    // Add outputs for easy reference
    new cdk.CfnOutput(this, 'ECRRepositoryUri', {
      value: webServiceRepo.repositoryUri,
      description: 'ECR Repository URI for Docker push',
      exportName: `${this.node.id}-ECRRepositoryUri`,
    });

    new cdk.CfnOutput(this, 'ECRRepositoryName', {
      value: webServiceRepo.repositoryName,
      description: 'ECR Repository Name',
      exportName: `${this.node.id}-ECRRepositoryName`,
    });

    new cdk.CfnOutput(this, 'LoadBalancerDNS', {
      value: webService.loadBalancer?.loadBalancerDnsName || 'No load balancer',
      description: 'Load Balancer DNS Name',
      exportName: `${this.node.id}-LoadBalancerDNS`,
    });

    new cdk.CfnOutput(this, 'ServiceName', {
      value: webService.service.serviceName,
      description: 'Fargate Service Name',
      exportName: `${this.node.id}-ServiceName`,
    });

    // Add Docker push instructions as outputs
    new cdk.CfnOutput(this, 'DockerPushCommands', {
      value: `# Docker Commands for ${webServiceRepo.repositoryName}:
# 1. Authenticate with ECR:
aws ecr get-login-password --region ${this.region} | docker login --username AWS --password-stdin ${webServiceRepo.repositoryUri}

# 2. Build multi-platform image:
docker buildx build --platform linux/amd64,linux/arm64 \\
  -t ${webServiceRepo.repositoryUri}:latest \\
  -t ${webServiceRepo.repositoryUri}:v1.0.0 \\
  --push .

# 3. Or build and push separately:
docker buildx build --platform linux/amd64 -t ${webServiceRepo.repositoryUri}:latest-amd64 .
docker buildx build --platform linux/arm64 -t ${webServiceRepo.repositoryUri}:latest-arm64 .
docker push ${webServiceRepo.repositoryUri}:latest-amd64
docker push ${webServiceRepo.repositoryUri}:latest-arm64

# 4. Tag and push latest:
docker tag ${webServiceRepo.repositoryUri}:latest-amd64 ${webServiceRepo.repositoryUri}:latest
docker push ${webServiceRepo.repositoryUri}:latest`,
      description: 'Docker push commands for ECR',
      exportName: `${this.node.id}-DockerPushCommands`,
    });
  }
}
