import { Template } from 'aws-cdk-lib/assertions';
import { Stack } from 'aws-cdk-lib';
import { VPCStack } from '../vpc-stack';
import { createTestApp, setupTestEnv, cleanupTestEnv } from '../../../../test/utils';

describe('VPCStack', () => {
  let app: any;
  let stack: Stack;

  beforeEach(() => {
    setupTestEnv();
    app = createTestApp();
    stack = new Stack(app, 'TestStack');
  });

  afterEach(() => {
    cleanupTestEnv();
  });

  describe('Basic Configuration', () => {
    it('should create a VPC with default configuration', () => {
      // Arrange & Act
      const vpcStack = new VPCStack(stack, 'TestVPCStack', {
        maxAzs: 2,
        natGateways: 1,
      });

      // Assert
      const template = Template.fromStack(stack);
      
      // Should create VPC
      template.hasResource('AWS::EC2::VPC', {
        Properties: {
          CidrBlock: '10.0.0.0/16',
          EnableDnsHostnames: true,
          EnableDnsSupport: true,
        },
      });
      
      // Should create public subnets
      template.hasResource('AWS::EC2::Subnet', {
        Properties: {
          MapPublicIpOnLaunch: true,
        },
      });
      
      // Should create private subnets
      template.hasResource('AWS::EC2::Subnet', {
        Properties: {
          MapPublicIpOnLaunch: false,
        },
      });
      
      // Should create NAT Gateway
      template.hasResource('AWS::EC2::NatGateway', {});
      
      // Should create Internet Gateway
      template.hasResource('AWS::EC2::InternetGateway', {});
    });

    it('should use custom CIDR when provided', () => {
      // Arrange & Act
      const vpcStack = new VPCStack(stack, 'TestVPCStack', {
        maxAzs: 2,
        natGateways: 1,
        vpcCidr: '192.168.0.0/16',
      });

      // Assert
      const template = Template.fromStack(stack);
      template.hasResource('AWS::EC2::VPC', {
        Properties: {
          CidrBlock: '192.168.0.0/16',
        },
      });
    });

    it('should create correct number of subnets based on maxAzs', () => {
      // Arrange & Act
      const vpcStack = new VPCStack(stack, 'TestVPCStack', {
        maxAzs: 3,
        natGateways: 1,
      });

      // Assert
      const template = Template.fromStack(stack);
      
      // Should create 3 public subnets
      template.resourceCountIs('AWS::EC2::Subnet', 6); // 3 public + 3 private
    });

    it('should create correct number of NAT gateways', () => {
      // Arrange & Act
      const vpcStack = new VPCStack(stack, 'TestVPCStack', {
        maxAzs: 2,
        natGateways: 2,
      });

      // Assert
      const template = Template.fromStack(stack);
      
      // Should create 2 NAT gateways
      template.resourceCountIs('AWS::EC2::NatGateway', 2);
    });
  });

  describe('Network Configuration', () => {
    it('should create route tables correctly', () => {
      // Arrange & Act
      const vpcStack = new VPCStack(stack, 'TestVPCStack', {
        maxAzs: 2,
        natGateways: 1,
      });

      // Assert
      const template = Template.fromStack(stack);
      
      // Should create route tables
      template.hasResource('AWS::EC2::RouteTable', {});
      
      // Should create routes
      template.hasResource('AWS::EC2::Route', {});
    });

    it('should create VPC gateway endpoints by default', () => {
      // Arrange & Act
      const vpcStack = new VPCStack(stack, 'TestVPCStack', {
        maxAzs: 2,
        natGateways: 1,
      });

      // Assert
      const template = Template.fromStack(stack);
      
      // Should create VPC gateway endpoints for S3 and DynamoDB
      template.hasResource('AWS::EC2::VPCEndpoint', {});
      template.resourceCountIs('AWS::EC2::VPCEndpoint', 2); // S3 + DynamoDB
    });
  });

  describe('Security Configuration', () => {
    it('should create VPC with proper configuration', () => {
      // Arrange & Act
      const vpcStack = new VPCStack(stack, 'TestVPCStack', {
        maxAzs: 2,
        natGateways: 1,
      });

      // Assert
      const template = Template.fromStack(stack);
      
      // Should create VPC
      template.hasResource('AWS::EC2::VPC', {});
      
      // Should create subnets
      template.hasResource('AWS::EC2::Subnet', {});
      
      // Should create NAT gateway
      template.hasResource('AWS::EC2::NatGateway', {});
    });

    it('should create VPC Flow Logs by default', () => {
      // Arrange & Act
      const vpcStack = new VPCStack(stack, 'TestVPCStack', {
        maxAzs: 2,
        natGateways: 1,
      });

      // Assert
      const template = Template.fromStack(stack);
      
      // Should create VPC Flow Logs
      template.hasResource('AWS::Logs::LogGroup', {});
      template.hasResource('AWS::EC2::FlowLog', {});
    });
  });

  // Note: VPCStack is now a construct, not a stack, so it doesn't create outputs
  // Outputs are handled by the parent stack if needed

  describe('Integration', () => {
    it('should work with Fargate service', () => {
      // Arrange
      const vpcStack = new VPCStack(stack, 'TestVPCStack', {
        maxAzs: 2,
        natGateways: 1,
      });

      // Act - Create a simple Fargate service using the VPC
      const { FargateService } = require('../../fargate/fargate-service');
      const fargateService = new FargateService(stack, 'TestFargateService', {
        vpc: vpcStack.vpc,
        image: 'nginx:latest',
        serviceName: 'test-service',
      });

      // Assert
      const template = Template.fromStack(stack);
      
      // Should create all VPC resources
      template.hasResource('AWS::EC2::VPC', {});
      template.hasResource('AWS::EC2::Subnet', {});
      
      // Should create Fargate service resources
      template.hasResource('AWS::ECS::Cluster', {});
      template.hasResource('AWS::ECS::Service', {});
    });
  });
});
