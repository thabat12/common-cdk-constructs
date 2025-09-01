import * as cdk from 'aws-cdk-lib';
import * as ec2 from 'aws-cdk-lib/aws-ec2';
import * as logs from 'aws-cdk-lib/aws-logs';
import { Construct } from 'constructs';

export interface VPCStackProps extends cdk.StackProps {
  /**
   * The CIDR block for the VPC
   * @default 10.0.0.0/16
   */
  vpcCidr?: string;
  
  /**
   * Maximum number of availability zones
   * @default 2
   */
  maxAzs?: number;
  
  /**
   * Number of NAT gateways
   * @default 1
   */
  natGateways?: number;
  
  /**
   * Whether to enable DNS support
   * @default true
   */
  enableDnsSupport?: boolean;
  
  /**
   * Whether to enable DNS hostnames
   * @default true
   */
  enableDnsHostnames?: boolean;
  
  /**
   * Tags to apply to the VPC
   */
  tags?: { [key: string]: string };
}

export class VPCStack extends cdk.Stack {
  public readonly vpc: ec2.Vpc;
  public readonly publicSubnets: ec2.ISubnet[];
  public readonly privateSubnets: ec2.ISubnet[];
  public readonly isolatedSubnets: ec2.ISubnet[];

  constructor(scope: Construct, id: string, props?: VPCStackProps) {
    super(scope, id, props);

    const vpcCidr = props?.vpcCidr || '10.0.0.0/16';
    const maxAzs = props?.maxAzs || 2;
    const natGateways = props?.natGateways || 1;
    const enableDnsSupport = props?.enableDnsSupport ?? true;
    const enableDnsHostnames = props?.enableDnsHostnames ?? true;

    // Create VPC with public and private subnets
    this.vpc = new ec2.Vpc(this, 'VPC', {
      ipAddresses: ec2.IpAddresses.cidr(vpcCidr),
      maxAzs,
      natGateways,
      enableDnsSupport,
      enableDnsHostnames,
      subnetConfiguration: [
        {
          cidrMask: 24,
          name: 'public',
          subnetType: ec2.SubnetType.PUBLIC,
        },
        {
          cidrMask: 24,
          name: 'private',
          subnetType: ec2.SubnetType.PRIVATE_WITH_EGRESS,
        },
        {
          cidrMask: 24,
          name: 'isolated',
          subnetType: ec2.SubnetType.PRIVATE_ISOLATED,
        },
      ],
      gatewayEndpoints: {
        S3: {
          service: ec2.GatewayVpcEndpointAwsService.S3,
        },
        DynamoDB: {
          service: ec2.GatewayVpcEndpointAwsService.DYNAMODB,
        },
      },
      flowLogs: {
        default: {
          trafficType: ec2.FlowLogTrafficType.ALL,
          maxAggregationInterval: ec2.FlowLogMaxAggregationInterval.TEN_MINUTES,
        },
      },
    });

    // Store subnet references
    this.publicSubnets = this.vpc.publicSubnets;
    this.privateSubnets = this.vpc.privateSubnets;
    this.isolatedSubnets = this.vpc.isolatedSubnets;

    // Add VPC endpoints for common AWS services
    this.addVpcEndpoints();

    // Add tags
    if (props?.tags) {
      Object.entries(props.tags).forEach(([key, value]) => {
        cdk.Tags.of(this.vpc).add(key, value);
      });
    }

    // Add default tags
    cdk.Tags.of(this.vpc).add('Name', `${id}-VPC`);
    cdk.Tags.of(this.vpc).add('Purpose', 'Fargate Infrastructure');
    cdk.Tags.of(this.vpc).add('ManagedBy', 'CDK');

    // Outputs
    new cdk.CfnOutput(this, 'VPCId', {
      value: this.vpc.vpcId,
      description: 'VPC ID',
      exportName: `${id}-VPCId`,
    });

    new cdk.CfnOutput(this, 'VPCCidr', {
      value: this.vpc.vpcCidrBlock,
      description: 'VPC CIDR block',
      exportName: `${id}-VPCCidr`,
    });

    new cdk.CfnOutput(this, 'PublicSubnetIds', {
      value: this.vpc.publicSubnets.map(subnet => subnet.subnetId).join(','),
      description: 'Public subnet IDs',
      exportName: `${id}-PublicSubnetIds`,
    });

    new cdk.CfnOutput(this, 'PrivateSubnetIds', {
      value: this.vpc.privateSubnets.map(subnet => subnet.subnetId).join(','),
      description: 'Private subnet IDs',
      exportName: `${id}-PrivateSubnetIds`,
    });

    new cdk.CfnOutput(this, 'IsolatedSubnetIds', {
      value: this.vpc.isolatedSubnets.map(subnet => subnet.subnetId).join(','),
      description: 'Isolated subnet IDs',
      exportName: `${id}-IsolatedSubnetIds`,
    });
  }

  private addVpcEndpoints(): void {
    // Interface endpoints for common AWS services
    const interfaceEndpoints = [
      ec2.InterfaceVpcEndpointAwsService.ECR,
      ec2.InterfaceVpcEndpointAwsService.ECR_DOCKER,
      ec2.InterfaceVpcEndpointAwsService.CLOUDWATCH_LOGS,
      ec2.InterfaceVpcEndpointAwsService.CLOUDWATCH_MONITORING,
      ec2.InterfaceVpcEndpointAwsService.SECRETS_MANAGER,
      ec2.InterfaceVpcEndpointAwsService.SSM,
      ec2.InterfaceVpcEndpointAwsService.SSM_MESSAGES,
      ec2.InterfaceVpcEndpointAwsService.EC2_MESSAGES,
    ];

    interfaceEndpoints.forEach(service => {
      new ec2.InterfaceVpcEndpoint(this, `${service.name}Endpoint`, {
        vpc: this.vpc,
        service,
        privateDnsEnabled: true,
        subnets: {
          subnetType: ec2.SubnetType.PRIVATE_WITH_EGRESS,
        },
      });
    });
  }

  /**
   * Get a subnet by type
   */
  public getSubnets(subnetType: ec2.SubnetType): ec2.ISubnet[] {
    switch (subnetType) {
      case ec2.SubnetType.PUBLIC:
        return this.publicSubnets;
      case ec2.SubnetType.PRIVATE_WITH_EGRESS:
        return this.privateSubnets;
      case ec2.SubnetType.PRIVATE_ISOLATED:
        return this.isolatedSubnets;
      default:
        return [];
    }
  }

  /**
   * Get a random subnet of the specified type
   */
  public getRandomSubnet(subnetType: ec2.SubnetType): ec2.ISubnet | undefined {
    const subnets = this.getSubnets(subnetType);
    if (subnets.length === 0) return undefined;
    
    const randomIndex = Math.floor(Math.random() * subnets.length);
    return subnets[randomIndex];
  }
}
