import * as cdk from 'aws-cdk-lib';
import * as ec2 from 'aws-cdk-lib/aws-ec2';
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
    tags?: {
        [key: string]: string;
    };
}
export declare class VPCStack extends cdk.Stack {
    readonly vpc: ec2.Vpc;
    readonly publicSubnets: ec2.ISubnet[];
    readonly privateSubnets: ec2.ISubnet[];
    readonly isolatedSubnets: ec2.ISubnet[];
    constructor(scope: Construct, id: string, props?: VPCStackProps);
    private addVpcEndpoints;
    /**
     * Get a subnet by type
     */
    getSubnets(subnetType: ec2.SubnetType): ec2.ISubnet[];
    /**
     * Get a random subnet of the specified type
     */
    getRandomSubnet(subnetType: ec2.SubnetType): ec2.ISubnet | undefined;
}
