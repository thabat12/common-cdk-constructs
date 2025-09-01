"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || function (mod) {
    if (mod && mod.__esModule) return mod;
    var result = {};
    if (mod != null) for (var k in mod) if (k !== "default" && Object.prototype.hasOwnProperty.call(mod, k)) __createBinding(result, mod, k);
    __setModuleDefault(result, mod);
    return result;
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.VPCStack = void 0;
const cdk = __importStar(require("aws-cdk-lib"));
const ec2 = __importStar(require("aws-cdk-lib/aws-ec2"));
class VPCStack extends cdk.Stack {
    constructor(scope, id, props) {
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
    addVpcEndpoints() {
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
    getSubnets(subnetType) {
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
    getRandomSubnet(subnetType) {
        const subnets = this.getSubnets(subnetType);
        if (subnets.length === 0)
            return undefined;
        const randomIndex = Math.floor(Math.random() * subnets.length);
        return subnets[randomIndex];
    }
}
exports.VPCStack = VPCStack;
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoidnBjLXN0YWNrLmpzIiwic291cmNlUm9vdCI6IiIsInNvdXJjZXMiOlsiLi4vLi4vLi4vc3JjL2NvbnN0cnVjdHMvYmFzZS92cGMtc3RhY2sudHMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6Ijs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7QUFBQSxpREFBbUM7QUFDbkMseURBQTJDO0FBeUMzQyxNQUFhLFFBQVMsU0FBUSxHQUFHLENBQUMsS0FBSztJQU1yQyxZQUFZLEtBQWdCLEVBQUUsRUFBVSxFQUFFLEtBQXFCO1FBQzdELEtBQUssQ0FBQyxLQUFLLEVBQUUsRUFBRSxFQUFFLEtBQUssQ0FBQyxDQUFDO1FBRXhCLE1BQU0sT0FBTyxHQUFHLEtBQUssRUFBRSxPQUFPLElBQUksYUFBYSxDQUFDO1FBQ2hELE1BQU0sTUFBTSxHQUFHLEtBQUssRUFBRSxNQUFNLElBQUksQ0FBQyxDQUFDO1FBQ2xDLE1BQU0sV0FBVyxHQUFHLEtBQUssRUFBRSxXQUFXLElBQUksQ0FBQyxDQUFDO1FBQzVDLE1BQU0sZ0JBQWdCLEdBQUcsS0FBSyxFQUFFLGdCQUFnQixJQUFJLElBQUksQ0FBQztRQUN6RCxNQUFNLGtCQUFrQixHQUFHLEtBQUssRUFBRSxrQkFBa0IsSUFBSSxJQUFJLENBQUM7UUFFN0QsNkNBQTZDO1FBQzdDLElBQUksQ0FBQyxHQUFHLEdBQUcsSUFBSSxHQUFHLENBQUMsR0FBRyxDQUFDLElBQUksRUFBRSxLQUFLLEVBQUU7WUFDbEMsV0FBVyxFQUFFLEdBQUcsQ0FBQyxXQUFXLENBQUMsSUFBSSxDQUFDLE9BQU8sQ0FBQztZQUMxQyxNQUFNO1lBQ04sV0FBVztZQUNYLGdCQUFnQjtZQUNoQixrQkFBa0I7WUFDbEIsbUJBQW1CLEVBQUU7Z0JBQ25CO29CQUNFLFFBQVEsRUFBRSxFQUFFO29CQUNaLElBQUksRUFBRSxRQUFRO29CQUNkLFVBQVUsRUFBRSxHQUFHLENBQUMsVUFBVSxDQUFDLE1BQU07aUJBQ2xDO2dCQUNEO29CQUNFLFFBQVEsRUFBRSxFQUFFO29C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cyBjZGsgZnJvbSAnYXdzLWNkay1saWInO1xuaW1wb3J0ICogYXMgZWMyIGZyb20gJ2F3cy1jZGstbGliL2F3cy1lYzInO1xuaW1wb3J0ICogYXMgbG9ncyBmcm9tICdhd3MtY2RrLWxpYi9hd3MtbG9ncyc7XG5pbXBvcnQgeyBDb25zdHJ1Y3QgfSBmcm9tICdjb25zdHJ1Y3RzJztcblxuZXhwb3J0IGludGVyZmFjZSBWUENTdGFja1Byb3BzIGV4dGVuZHMgY2RrLlN0YWNrUHJvcHMge1xuICAvKipcbiAgICogVGhlIENJRFIgYmxvY2sgZm9yIHRoZSBWUENcbiAgICogQGRlZmF1bHQgMTAuMC4wLjAvMTZcbiAgICovXG4gIHZwY0NpZHI/OiBzdHJpbmc7XG4gIFxuICAvKipcbiAgICogTWF4aW11bSBudW1iZXIgb2YgYXZhaWxhYmlsaXR5IHpvbmVzXG4gICAqIEBkZWZhdWx0IDJcbiAgICovXG4gIG1heEF6cz86IG51bWJlcjtcbiAgXG4gIC8qKlxuICAgKiBOdW1iZXIgb2YgTkFUIGdhdGV3YXlzXG4gICAqIEBkZWZhdWx0IDFcbiAgICovXG4gIG5hdEdhdGV3YXlzPzogbnVtYmVyO1xuICBcbiAgLyoqXG4gICAqIFdoZXRoZXIgdG8gZW5hYmxlIEROUyBzdXBwb3J0XG4gICAqIEBkZWZhdWx0IHRydWVcbiAgICovXG4gIGVuYWJsZURuc1N1cHBvcnQ/OiBib29sZWFuO1xuICBcbiAgLyoqXG4gICAqIFdoZXRoZXIgdG8gZW5hYmxlIEROUyBob3N0bmFtZXNcbiAgICogQGRlZmF1bHQgdHJ1ZVxuICAgKi9cbiAgZW5hYmxlRG5zSG9zdG5hbWVzPzogYm9vbGVhbjtcbiAgXG4gIC8qKlxuICAgKiBUYWdzIHRvIGFwcGx5IHRvIHRoZSBWUENcbiAgICovXG4gIHRhZ3M/OiB7IFtrZXk6IHN0cmluZ106IHN0cmluZyB9O1xufVxuXG5leHBvcnQgY2xhc3MgVlBDU3RhY2sgZXh0ZW5kcyBjZGsuU3RhY2sge1xuICBwdWJsaWMgcmVhZG9ubHkgdnBjOiBlYzIuVnBjO1xuICBwdWJsaWMgcmVhZG9ubHkgcHVibGljU3VibmV0czogZWMyLklTdWJuZXRbXTtcbiAgcHVibGljIHJlYWRvbmx5IHByaXZhdGVTdWJuZXRzOiBlYzIuSVN1Ym5ldFtdO1xuICBwdWJsaWMgcmVhZG9ubHkgaXNvbGF0ZWRTdWJuZXRzOiBlYzIuSVN1Ym5ldFtdO1xuXG4gIGNvbnN0cnVjdG9yKHNjb3BlOiBDb25zdHJ1Y3QsIGlkOiBzdHJpbmcsIHByb3BzPzogVlBDU3RhY2tQcm9wcykge1xuICAgIHN1cGVyKHNjb3BlLCBpZCwgcHJvcHMpO1xuXG4gICAgY29uc3QgdnBjQ2lkciA9IHByb3BzPy52cGNDaWRyIHx8ICcxMC4wLjAuMC8xNic7XG4gICAgY29uc3QgbWF4QXpzID0gcHJvcHM/Lm1heEF6cyB8fCAyO1xuICAgIGNvbnN0IG5hdEdhdGV3YXlzID0gcHJvcHM/Lm5hdEdhdGV3YXlzIHx8IDE7XG4gICAgY29uc3QgZW5hYmxlRG5zU3VwcG9ydCA9IHByb3BzPy5lbmFibGVEbnNTdXBwb3J0ID8/IHRydWU7XG4gICAgY29uc3QgZW5hYmxlRG5zSG9zdG5hbWVzID0gcHJvcHM/LmVuYWJsZURuc0hvc3RuYW1lcyA/PyB0cnVlO1xuXG4gICAgLy8gQ3JlYXRlIFZQQyB3aXRoIHB1YmxpYyBhbmQgcHJpdmF0ZSBzdWJuZXRzXG4gICAgdGhpcy52cGMgPSBuZXcgZWMyLlZwYyh0aGlzLCAnVlBDJywge1xuICAgICAgaXBBZGRyZXNzZXM6IGVjMi5JcEFkZHJlc3Nlcy5jaWRyKHZwY0NpZHIpLFxuICAgICAgbWF4QXpzLFxuICAgICAgbmF0R2F0ZXdheXMsXG4gICAgICBlbmFibGVEbnNTdXBwb3J0LFxuICAgICAgZW5hYmxlRG5zSG9zdG5hbWVzLFxuICAgICAgc3VibmV0Q29uZmlndXJhdGlvbjogW1xuICAgICAgICB7XG4gICAgICAgICAgY2lkck1hc2s6IDI0LFxuICAgICAgICAgIG5hbWU6ICdwdWJsaWMnLFxuICAgICAgICAgIHN1Ym5ldFR5cGU6IGVjMi5TdWJuZXRUeXBlLlBVQkxJQyxcbiAgICAgICAgfSxcbiAgICAgICAge1xuICAgICAgICAgIGNpZHJNYXNrOiAyNCxcbiAgICAgICAgICBuYW1lOiAncHJpdmF0ZScsXG4gICAgICAgICAgc3VibmV0VHlwZTogZWMyLlN1Ym5ldFR5cGUuUFJJVkFURV9XSVRIX0VHUkVTUyxcbiAgICAgICAgfSxcbiAgICAgICAge1xuICAgICAgICAgIGNpZHJNYXNrOiAyNCxcbiAgICAgICAgICBuYW1lOiAnaXNvbGF0ZWQnLFxuICAgICAgICAgIHN1Ym5ldFR5cGU6IGVjMi5TdWJuZXRUeXBlLlBSSVZBVEVfSVNPTEFURUQsXG4gICAgICAgIH0sXG4gICAgICBdLFxuICAgICAgZ2F0ZXdheUVuZHBvaW50czoge1xuICAgICAgICBTMzoge1xuICAgICAgICAgIHNlcnZpY2U6IGVjMi5HYXRld2F5VnBjRW5kcG9pbnRBd3NTZXJ2aWNlLlMzLFxuICAgICAgICB9LFxuICAgICAgICBEeW5hbW9EQjoge1xuICAgICAgICAgIHNlcnZpY2U6IGVjMi5HYXRld2F5VnBjRW5kcG9pbnRBd3NTZXJ2aWNlLkRZTkFNT0RCLFxuICAgICAgICB9LFxuICAgICAgfSxcbiAgICAgIGZsb3dMb2dzOiB7XG4gICAgICAgIGRlZmF1bHQ6IHtcbiAgICAgICAgICB0cmFmZmljVHlwZTogZWMyLkZsb3dMb2dUcmFmZmljVHlwZS5BTEwsXG4gICAgICAgICAgbWF4QWdncmVnYXRpb25JbnRlcnZhbDogZWMyLkZsb3dMb2dNYXhBZ2dyZWdhdGlvbkludGVydmFsLlRFTl9NSU5VVEVTLFxuICAgICAgICB9LFxuICAgICAgfSxcbiAgICB9KTtcblxuICAgIC8vIFN0b3JlIHN1Ym5ldCByZWZlcmVuY2VzXG4gICAgdGhpcy5wdWJsaWNTdWJuZXRzID0gdGhpcy52cGMucHVibGljU3VibmV0cztcbiAgICB0aGlzLnByaXZhdGVTdWJuZXRzID0gdGhpcy52cGMucHJpdmF0ZVN1Ym5ldHM7XG4gICAgdGhpcy5pc29sYXRlZFN1Ym5ldHMgPSB0aGlzLnZwYy5pc29sYXRlZFN1Ym5ldHM7XG5cbiAgICAvLyBBZGQgVlBDIGVuZHBvaW50cyBmb3IgY29tbW9uIEFXUyBzZXJ2aWNlc1xuICAgIHRoaXMuYWRkVnBjRW5kcG9pbnRzKCk7XG5cbiAgICAvLyBBZGQgdGFnc1xuICAgIGlmIChwcm9wcz8udGFncykge1xuICAgICAgT2JqZWN0LmVudHJpZXMocHJvcHMudGFncykuZm9yRWFjaCgoW2tleSwgdmFsdWVdKSA9PiB7XG4gICAgICAgIGNkay5UYWdzLm9mKHRoaXMudnBjKS5hZGQoa2V5LCB2YWx1ZSk7XG4gICAgICB9KTtcbiAgICB9XG5cbiAgICAvLyBBZGQgZGVmYXVsdCB0YWdzXG4gICAgY2RrLlRhZ3Mub2YodGhpcy52cGMpLmFkZCgnTmFtZScsIGAke2lkfS1WUENgKTtcbiAgICBjZGsuVGFncy5vZih0aGlzLnZwYykuYWRkKCdQdXJwb3NlJywgJ0ZhcmdhdGUgSW5mcmFzdHJ1Y3R1cmUnKTtcbiAgICBjZGsuVGFncy5vZih0aGlzLnZwYykuYWRkKCdNYW5hZ2VkQnknLCAnQ0RLJyk7XG5cbiAgICAvLyBPdXRwdXRzXG4gICAgbmV3IGNkay5DZm5PdXRwdXQodGhpcywgJ1ZQQ0lkJywge1xuICAgICAgdmFsdWU6IHRoaXMudnBjLnZwY0lkLFxuICAgICAgZGVzY3JpcHRpb246ICdWUEMgSUQnLFxuICAgICAgZXhwb3J0TmFtZTogYCR7aWR9LVZQQ0lkYCxcbiAgICB9KTtcblxuICAgIG5ldyBjZGsuQ2ZuT3V0cHV0KHRoaXMsICdWUENDaWRyJywge1xuICAgICAgdmFsdWU6IHRoaXMudnBjLnZwY0NpZHJCbG9jayxcbiAgICAgIGRlc2NyaXB0aW9uOiAnVlBDIENJRFIgYmxvY2snLFxuICAgICAgZXhwb3J0TmFtZTogYCR7aWR9LVZQQ0NpZHJgLFxuICAgIH0pO1xuXG4gICAgbmV3IGNkay5DZm5PdXRwdXQodGhpcywgJ1B1YmxpY1N1Ym5ldElkcycsIHtcbiAgICAgIHZhbHVlOiB0aGlzLnZwYy5wdWJsaWNTdWJuZXRzLm1hcChzdWJuZXQgPT4gc3VibmV0LnN1Ym5ldElkKS5qb2luKCcsJyksXG4gICAgICBkZXNjcmlwdGlvbjogJ1B1YmxpYyBzdWJuZXQgSURzJyxcbiAgICAgIGV4cG9ydE5hbWU6IGAke2lkfS1QdWJsaWNTdWJuZXRJZHNgLFxuICAgIH0pO1xuXG4gICAgbmV3IGNkay5DZm5PdXRwdXQodGhpcywgJ1ByaXZhdGVTdWJuZXRJZHMnLCB7XG4gICAgICB2YWx1ZTogdGhpcy52cGMucHJpdmF0ZVN1Ym5ldHMubWFwKHN1Ym5ldCA9PiBzdWJuZXQuc3VibmV0SWQpLmpvaW4oJywnKSxcbiAgICAgIGRlc2NyaXB0aW9uOiAnUHJpdmF0ZSBzdWJuZXQgSURzJyxcbiAgICAgIGV4cG9ydE5hbWU6IGAke2lkfS1Qcml2YXRlU3VibmV0SWRzYCxcbiAgICB9KTtcblxuICAgIG5ldyBjZGsuQ2ZuT3V0cHV0KHRoaXMsICdJc29sYXRlZFN1Ym5ldElkcycsIHtcbiAgICAgIHZhbHVlOiB0aGlzLnZwYy5pc29sYXRlZFN1Ym5ldHMubWFwKHN1Ym5ldCA9PiBzdWJuZXQuc3VibmV0SWQpLmpvaW4oJywnKSxcbiAgICAgIGRlc2NyaXB0aW9uOiAnSXNvbGF0ZWQgc3VibmV0IElEcycsXG4gICAgICBleHBvcnROYW1lOiBgJHtpZH0tSXNvbGF0ZWRTdWJuZXRJZHNgLFxuICAgIH0pO1xuICB9XG5cbiAgcHJpdmF0ZSBhZGRWcGNFbmRwb2ludHMoKTogdm9pZCB7XG4gICAgLy8gSW50ZXJmYWNlIGVuZHBvaW50cyBmb3IgY29tbW9uIEFXUyBzZXJ2aWNlc1xuICAgIGNvbnN0IGludGVyZmFjZUVuZHBvaW50cyA9IFtcbiAgICAgIGVjMi5JbnRlcmZhY2VWcGNFbmRwb2ludEF3c1NlcnZpY2UuRUNSLFxuICAgICAgZWMyLkludGVyZmFjZVZwY0VuZHBvaW50QXdzU2VydmljZS5FQ1JfRE9DS0VSLFxuICAgICAgZWMyLkludGVyZmFjZVZwY0VuZHBvaW50QXdzU2VydmljZS5DTE9VRFdBVENIX0xPR1MsXG4gICAgICBlYzIuSW50ZXJmYWNlVnBjRW5kcG9pbnRBd3NTZXJ2aWNlLkNMT1VEV0FUQ0hfTU9OSVRPUklORyxcbiAgICAgIGVjMi5JbnRlcmZhY2VWcGNFbmRwb2ludEF3c1NlcnZpY2UuU0VDUkVUU19NQU5BR0VSLFxuICAgICAgZWMyLkludGVyZmFjZVZwY0VuZHBvaW50QXdzU2VydmljZS5TU00sXG4gICAgICBlYzIuSW50ZXJmYWNlVnBjRW5kcG9pbnRBd3NTZXJ2aWNlLlNTTV9NRVNTQUdFUyxcbiAgICAgIGVjMi5JbnRlcmZhY2VWcGNFbmRwb2ludEF3c1NlcnZpY2UuRUMyX01FU1NBR0VTLFxuICAgIF07XG5cbiAgICBpbnRlcmZhY2VFbmRwb2ludHMuZm9yRWFjaChzZXJ2aWNlID0+IHtcbiAgICAgIG5ldyBlYzIuSW50ZXJmYWNlVnBjRW5kcG9pbnQodGhpcywgYCR7c2VydmljZS5uYW1lfUVuZHBvaW50YCwge1xuICAgICAgICB2cGM6IHRoaXMudnBjLFxuICAgICAgICBzZXJ2aWNlLFxuICAgICAgICBwcml2YXRlRG5zRW5hYmxlZDogdHJ1ZSxcbiAgICAgICAgc3VibmV0czoge1xuICAgICAgICAgIHN1Ym5ldFR5cGU6IGVjMi5TdWJuZXRUeXBlLlBSSVZBVEVfV0lUSF9FR1JFU1MsXG4gICAgICAgIH0sXG4gICAgICB9KTtcbiAgICB9KTtcbiAgfVxuXG4gIC8qKlxuICAgKiBHZXQgYSBzdWJuZXQgYnkgdHlwZVxuICAgKi9cbiAgcHVibGljIGdldFN1Ym5ldHMoc3VibmV0VHlwZTogZWMyLlN1Ym5ldFR5cGUpOiBlYzIuSVN1Ym5ldFtdIHtcbiAgICBzd2l0Y2ggKHN1Ym5ldFR5cGUpIHtcbiAgICAgIGNhc2UgZWMyLlN1Ym5ldFR5cGUuUFVCTElDOlxuICAgICAgICByZXR1cm4gdGhpcy5wdWJsaWNTdWJuZXRzO1xuICAgICAgY2FzZSBlYzIuU3VibmV0VHlwZS5QUklWQVRFX1dJVEhfRUdSRVNTOlxuICAgICAgICByZXR1cm4gdGhpcy5wcml2YXRlU3VibmV0cztcbiAgICAgIGNhc2UgZWMyLlN1Ym5ldFR5cGUuUFJJVkFURV9JU09MQVRFRDpcbiAgICAgICAgcmV0dXJuIHRoaXMuaXNvbGF0ZWRTdWJuZXRzO1xuICAgICAgZGVmYXVsdDpcbiAgICAgICAgcmV0dXJuIFtdO1xuICAgIH1cbiAgfVxuXG4gIC8qKlxuICAgKiBHZXQgYSByYW5kb20gc3VibmV0IG9mIHRoZSBzcGVjaWZpZWQgdHlwZVxuICAgKi9cbiAgcHVibGljIGdldFJhbmRvbVN1Ym5ldChzdWJuZXRUeXBlOiBlYzIuU3VibmV0VHlwZSk6IGVjMi5JU3VibmV0IHwgdW5kZWZpbmVkIHtcbiAgICBjb25zdCBzdWJuZXRzID0gdGhpcy5nZXRTdWJuZXRzKHN1Ym5ldFR5cGUpO1xuICAgIGlmIChzdWJuZXRzLmxlbmd0aCA9PT0gMCkgcmV0dXJuIHVuZGVmaW5lZDtcbiAgICBcbiAgICBjb25zdCByYW5kb21JbmRleCA9IE1hdGguZmxvb3IoTWF0aC5yYW5kb20oKSAqIHN1Ym5ldHMubGVuZ3RoKTtcbiAgICByZXR1cm4gc3VibmV0c1tyYW5kb21JbmRleF07XG4gIH1cbn1cbiJdfQ==