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
        // Note: VPC endpoints are configured directly in the VPC configuration
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
        // Note: Interface endpoints are complex to test and can cause token resolution issues
        // For now, we'll rely on the gateway endpoints (S3, DynamoDB) that are configured in the VPC
        // Interface endpoints can be added later when needed for specific use cases
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
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoidnBjLXN0YWNrLmpzIiwic291cmNlUm9vdCI6IiIsInNvdXJjZXMiOlsiLi4vLi4vLi4vc3JjL2NvbnN0cnVjdHMvYmFzZS92cGMtc3RhY2sudHMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6Ijs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7QUFBQSxpREFBbUM7QUFDbkMseURBQTJDO0FBeUMzQyxNQUFhLFFBQVMsU0FBUSxHQUFHLENBQUMsS0FBSztJQU1yQyxZQUFZLEtBQWdCLEVBQUUsRUFBVSxFQUFFLEtBQXFCO1FBQzdELEtBQUssQ0FBQyxLQUFLLEVBQUUsRUFBRSxFQUFFLEtBQUssQ0FBQyxDQUFDO1FBRXhCLE1BQU0sT0FBTyxHQUFHLEtBQUssRUFBRSxPQUFPLElBQUksYUFBYSxDQUFDO1FBQ2hELE1BQU0sTUFBTSxHQUFHLEtBQUssRUFBRSxNQUFNLElBQUksQ0FBQyxDQUFDO1FBQ2xDLE1BQU0sV0FBVyxHQUFHLEtBQUssRUFBRSxXQUFXLElBQUksQ0FBQyxDQUFDO1FBQzVDLE1BQU0sZ0JBQWdCLEdBQUcsS0FBSyxFQUFFLGdCQUFnQixJQUFJLElBQUksQ0FBQztRQUN6RCxNQUFNLGtCQUFrQixHQUFHLEtBQUssRUFBRSxrQkFBa0IsSUFBSSxJQUFJLENBQUM7UUFFN0QsNkNBQTZDO1FBQzdDLElBQUksQ0FBQyxHQUFHLEdBQUcsSUFBSSxHQUFHLENBQUMsR0FBRyxDQUFDLElBQUksRUFBRSxLQUFLLEVBQUU7WUFDbEMsV0FBVyxFQUFFLEdBQUcsQ0FBQyxXQUFXLENBQUMsSUFBSSxDQUFDLE9BQU8sQ0FBQztZQUMxQyxNQUFNO1lBQ04sV0FBVztZQUNYLGdCQUFnQjtZQUNoQixrQkFBa0I7WUFDbEIsbUJBQW1CLEVBQUU7Z0JBQ25CO29CQUNFLFFBQVEsRUFBRSxFQUFFO29CQUNaLElBQUksRUFBRSxRQUFRO29CQUNkLFVBQVUsRUFBRSxHQUFHLENBQUMsVUFBVSxDQUFDLE1BQU07aUJBQ2xDO2dCQUNEO29CQUNFLFFBQVEsRUFBRSxFQUFFO29C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QUFlLENBQUMsVUFBMEI7UUFDL0MsTUFBTSxPQUFPLEdBQUcsSUFBSSxDQUFDLFVBQVUsQ0FBQyxVQUFVLENBQUMsQ0FBQztRQUM1QyxJQUFJLE9BQU8sQ0FBQyxNQUFNLEtBQUssQ0FBQztZQUFFLE9BQU8sU0FBUyxDQUFDO1FBRTNDLE1BQU0sV0FBVyxHQUFHLElBQUksQ0FBQyxLQUFLLENBQUMsSUFBSSxDQUFDLE1BQU0sRUFBRSxHQUFHLE9BQU8sQ0FBQyxNQUFNLENBQUMsQ0FBQztRQUMvRCxPQUFPLE9BQU8sQ0FBQyxXQUFXLENBQUMsQ0FBQztJQUM5QixDQUFDO0NBQ0Y7QUExSUQsNEJBMElDIiwic291cmNlc0NvbnRlbnQiOlsiaW1wb3J0ICogYXMgY2RrIGZyb20gJ2F3cy1jZGstbGliJztcbmltcG9ydCAqIGFzIGVjMiBmcm9tICdhd3MtY2RrLWxpYi9hd3MtZWMyJztcbmltcG9ydCAqIGFzIGxvZ3MgZnJvbSAnYXdzLWNkay1saWIvYXdzLWxvZ3MnO1xuaW1wb3J0IHsgQ29uc3RydWN0IH0gZnJvbSAnY29uc3RydWN0cyc7XG5cbmV4cG9ydCBpbnRlcmZhY2UgVlBDU3RhY2tQcm9wcyBleHRlbmRzIGNkay5TdGFja1Byb3BzIHtcbiAgLyoqXG4gICAqIFRoZSBDSURSIGJsb2NrIGZvciB0aGUgVlBDXG4gICAqIEBkZWZhdWx0IDEwLjAuMC4wLzE2XG4gICAqL1xuICB2cGNDaWRyPzogc3RyaW5nO1xuICBcbiAgLyoqXG4gICAqIE1heGltdW0gbnVtYmVyIG9mIGF2YWlsYWJpbGl0eSB6b25lc1xuICAgKiBAZGVmYXVsdCAyXG4gICAqL1xuICBtYXhBenM/OiBudW1iZXI7XG4gIFxuICAvKipcbiAgICogTnVtYmVyIG9mIE5BVCBnYXRld2F5c1xuICAgKiBAZGVmYXVsdCAxXG4gICAqL1xuICBuYXRHYXRld2F5cz86IG51bWJlcjtcbiAgXG4gIC8qKlxuICAgKiBXaGV0aGVyIHRvIGVuYWJsZSBETlMgc3VwcG9ydFxuICAgKiBAZGVmYXVsdCB0cnVlXG4gICAqL1xuICBlbmFibGVEbnNTdXBwb3J0PzogYm9vbGVhbjtcbiAgXG4gIC8qKlxuICAgKiBXaGV0aGVyIHRvIGVuYWJsZSBETlMgaG9zdG5hbWVzXG4gICAqIEBkZWZhdWx0IHRydWVcbiAgICovXG4gIGVuYWJsZURuc0hvc3RuYW1lcz86IGJvb2xlYW47XG4gIFxuICAvKipcbiAgICogVGFncyB0byBhcHBseSB0byB0aGUgVlBDXG4gICAqL1xuICB0YWdzPzogeyBba2V5OiBzdHJpbmddOiBzdHJpbmcgfTtcbn1cblxuZXhwb3J0IGNsYXNzIFZQQ1N0YWNrIGV4dGVuZHMgY2RrLlN0YWNrIHtcbiAgcHVibGljIHJlYWRvbmx5IHZwYzogZWMyLlZwYztcbiAgcHVibGljIHJlYWRvbmx5IHB1YmxpY1N1Ym5ldHM6IGVjMi5JU3VibmV0W107XG4gIHB1YmxpYyByZWFkb25seSBwcml2YXRlU3VibmV0czogZWMyLklTdWJuZXRbXTtcbiAgcHVibGljIHJlYWRvbmx5IGlzb2xhdGVkU3VibmV0czogZWMyLklTdWJuZXRbXTtcblxuICBjb25zdHJ1Y3RvcihzY29wZTogQ29uc3RydWN0LCBpZDogc3RyaW5nLCBwcm9wcz86IFZQQ1N0YWNrUHJvcHMpIHtcbiAgICBzdXBlcihzY29wZSwgaWQsIHByb3BzKTtcblxuICAgIGNvbnN0IHZwY0NpZHIgPSBwcm9wcz8udnBjQ2lkciB8fCAnMTAuMC4wLjAvMTYnO1xuICAgIGNvbnN0IG1heEF6cyA9IHByb3BzPy5tYXhBenMgfHwgMjtcbiAgICBjb25zdCBuYXRHYXRld2F5cyA9IHByb3BzPy5uYXRHYXRld2F5cyB8fCAxO1xuICAgIGNvbnN0IGVuYWJsZURuc1N1cHBvcnQgPSBwcm9wcz8uZW5hYmxlRG5zU3VwcG9ydCA/PyB0cnVlO1xuICAgIGNvbnN0IGVuYWJsZURuc0hvc3RuYW1lcyA9IHByb3BzPy5lbmFibGVEbnNIb3N0bmFtZXMgPz8gdHJ1ZTtcblxuICAgIC8vIENyZWF0ZSBWUEMgd2l0aCBwdWJsaWMgYW5kIHByaXZhdGUgc3VibmV0c1xuICAgIHRoaXMudnBjID0gbmV3IGVjMi5WcGModGhpcywgJ1ZQQycsIHtcbiAgICAgIGlwQWRkcmVzc2VzOiBlYzIuSXBBZGRyZXNzZXMuY2lkcih2cGNDaWRyKSxcbiAgICAgIG1heEF6cyxcbiAgICAgIG5hdEdhdGV3YXlzLFxuICAgICAgZW5hYmxlRG5zU3VwcG9ydCxcbiAgICAgIGVuYWJsZURuc0hvc3RuYW1lcyxcbiAgICAgIHN1Ym5ldENvbmZpZ3VyYXRpb246IFtcbiAgICAgICAge1xuICAgICAgICAgIGNpZHJNYXNrOiAyNCxcbiAgICAgICAgICBuYW1lOiAncHVibGljJyxcbiAgICAgICAgICBzdWJuZXRUeXBlOiBlYzIuU3VibmV0VHlwZS5QVUJMSUMsXG4gICAgICAgIH0sXG4gICAgICAgIHtcbiAgICAgICAgICBjaWRyTWFzazogMjQsXG4gICAgICAgICAgbmFtZTogJ3ByaXZhdGUnLFxuICAgICAgICAgIHN1Ym5ldFR5cGU6IGVjMi5TdWJuZXRUeXBlLlBSSVZBVEVfV0lUSF9FR1JFU1MsXG4gICAgICAgIH0sXG4gICAgICAgIHtcbiAgICAgICAgICBjaWRyTWFzazogMjQsXG4gICAgICAgICAgbmFtZTogJ2lzb2xhdGVkJyxcbiAgICAgICAgICBzdWJuZXRUeXBlOiBlYzIuU3VibmV0VHlwZS5QUklWQVRFX0lTT0xBVEVELFxuICAgICAgICB9LFxuICAgICAgXSxcbiAgICAgIGdhdGV3YXlFbmRwb2ludHM6IHtcbiAgICAgICAgUzM6IHtcbiAgICAgICAgICBzZXJ2aWNlOiBlYzIuR2F0ZXdheVZwY0VuZHBvaW50QXdzU2VydmljZS5TMyxcbiAgICAgICAgfSxcbiAgICAgICAgRHluYW1vREI6IHtcbiAgICAgICAgICBzZXJ2aWNlOiBlYzIuR2F0ZXdheVZwY0VuZHBvaW50QXdzU2VydmljZS5EWU5BTU9EQixcbiAgICAgICAgfSxcbiAgICAgIH0sXG4gICAgICBmbG93TG9nczoge1xuICAgICAgICBkZWZhdWx0OiB7XG4gICAgICAgICAgdHJhZmZpY1R5cGU6IGVjMi5GbG93TG9nVHJhZmZpY1R5cGUuQUxMLFxuICAgICAgICAgIG1heEFnZ3JlZ2F0aW9uSW50ZXJ2YWw6IGVjMi5GbG93TG9nTWF4QWdncmVnYXRpb25JbnRlcnZhbC5URU5fTUlOVVRFUyxcbiAgICAgICAgfSxcbiAgICAgIH0sXG4gICAgfSk7XG5cbiAgICAvLyBTdG9yZSBzdWJuZXQgcmVmZXJlbmNlc1xuICAgIHRoaXMucHVibGljU3VibmV0cyA9IHRoaXMudnBjLnB1YmxpY1N1Ym5ldHM7XG4gICAgdGhpcy5wcml2YXRlU3VibmV0cyA9IHRoaXMudnBjLnByaXZhdGVTdWJuZXRzO1xuICAgIHRoaXMuaXNvbGF0ZWRTdWJuZXRzID0gdGhpcy52cGMuaXNvbGF0ZWRTdWJuZXRzO1xuXG4gICAgLy8gTm90ZTogVlBDIGVuZHBvaW50cyBhcmUgY29uZmlndXJlZCBkaXJlY3RseSBpbiB0aGUgVlBDIGNvbmZpZ3VyYXRpb25cblxuICAgIC8vIEFkZCB0YWdzXG4gICAgaWYgKHByb3BzPy50YWdzKSB7XG4gICAgICBPYmplY3QuZW50cmllcyhwcm9wcy50YWdzKS5mb3JFYWNoKChba2V5LCB2YWx1ZV0pID0+IHtcbiAgICAgICAgY2RrLlRhZ3Mub2YodGhpcy52cGMpLmFkZChrZXksIHZhbHVlKTtcbiAgICAgIH0pO1xuICAgIH1cblxuICAgIC8vIEFkZCBkZWZhdWx0IHRhZ3NcbiAgICBjZGsuVGFncy5vZih0aGlzLnZwYykuYWRkKCdOYW1lJywgYCR7aWR9LVZQQ2ApO1xuICAgIGNkay5UYWdzLm9mKHRoaXMudnBjKS5hZGQoJ1B1cnBvc2UnLCAnRmFyZ2F0ZSBJbmZyYXN0cnVjdHVyZScpO1xuICAgIGNkay5UYWdzLm9mKHRoaXMudnBjKS5hZGQoJ01hbmFnZWRCeScsICdDREsnKTtcblxuICAgIC8vIE91dHB1dHNcbiAgICBuZXcgY2RrLkNmbk91dHB1dCh0aGlzLCAnVlBDSWQnLCB7XG4gICAgICB2YWx1ZTogdGhpcy52cGMudnBjSWQsXG4gICAgICBkZXNjcmlwdGlvbjogJ1ZQQyBJRCcsXG4gICAgICBleHBvcnROYW1lOiBgJHtpZH0tVlBDSWRgLFxuICAgIH0pO1xuXG4gICAgbmV3IGNkay5DZm5PdXRwdXQodGhpcywgJ1ZQQ0NpZHInLCB7XG4gICAgICB2YWx1ZTogdGhpcy52cGMudnBjQ2lkckJsb2NrLFxuICAgICAgZGVzY3JpcHRpb246ICdWUEMgQ0lEUiBibG9jaycsXG4gICAgICBleHBvcnROYW1lOiBgJHtpZH0tVlBDQ2lkcmAsXG4gICAgfSk7XG5cbiAgICBuZXcgY2RrLkNmbk91dHB1dCh0aGlzLCAnUHVibGljU3VibmV0SWRzJywge1xuICAgICAgdmFsdWU6IHRoaXMudnBjLnB1YmxpY1N1Ym5ldHMubWFwKHN1Ym5ldCA9PiBzdWJuZXQuc3VibmV0SWQpLmpvaW4oJywnKSxcbiAgICAgIGRlc2NyaXB0aW9uOiAnUHVibGljIHN1Ym5ldCBJRHMnLFxuICAgICAgZXhwb3J0TmFtZTogYCR7aWR9LVB1YmxpY1N1Ym5ldElkc2AsXG4gICAgfSk7XG5cbiAgICBuZXcgY2RrLkNmbk91dHB1dCh0aGlzLCAnUHJpdmF0ZVN1Ym5ldElkcycsIHtcbiAgICAgIHZhbHVlOiB0aGlzLnZwYy5wcml2YXRlU3VibmV0cy5tYXAoc3VibmV0ID0+IHN1Ym5ldC5zdWJuZXRJZCkuam9pbignLCcpLFxuICAgICAgZGVzY3JpcHRpb246ICdQcml2YXRlIHN1Ym5ldCBJRHMnLFxuICAgICAgZXhwb3J0TmFtZTogYCR7aWR9LVByaXZhdGVTdWJuZXRJZHNgLFxuICAgIH0pO1xuXG4gICAgbmV3IGNkay5DZm5PdXRwdXQodGhpcywgJ0lzb2xhdGVkU3VibmV0SWRzJywge1xuICAgICAgdmFsdWU6IHRoaXMudnBjLmlzb2xhdGVkU3VibmV0cy5tYXAoc3VibmV0ID0+IHN1Ym5ldC5zdWJuZXRJZCkuam9pbignLCcpLFxuICAgICAgZGVzY3JpcHRpb246ICdJc29sYXRlZCBzdWJuZXQgSURzJyxcbiAgICAgIGV4cG9ydE5hbWU6IGAke2lkfS1Jc29sYXRlZFN1Ym5ldElkc2AsXG4gICAgfSk7XG4gIH1cblxuICBwcml2YXRlIGFkZFZwY0VuZHBvaW50cygpOiB2b2lkIHtcbiAgICAvLyBOb3RlOiBJbnRlcmZhY2UgZW5kcG9pbnRzIGFyZSBjb21wbGV4IHRvIHRlc3QgYW5kIGNhbiBjYXVzZSB0b2tlbiByZXNvbHV0aW9uIGlzc3Vlc1xuICAgIC8vIEZvciBub3csIHdlJ2xsIHJlbHkgb24gdGhlIGdhdGV3YXkgZW5kcG9pbnRzIChTMywgRHluYW1vREIpIHRoYXQgYXJlIGNvbmZpZ3VyZWQgaW4gdGhlIFZQQ1xuICAgIC8vIEludGVyZmFjZSBlbmRwb2ludHMgY2FuIGJlIGFkZGVkIGxhdGVyIHdoZW4gbmVlZGVkIGZvciBzcGVjaWZpYyB1c2UgY2FzZXNcbiAgfVxuXG4gIC8qKlxuICAgKiBHZXQgYSBzdWJuZXQgYnkgdHlwZVxuICAgKi9cbiAgcHVibGljIGdldFN1Ym5ldHMoc3VibmV0VHlwZTogZWMyLlN1Ym5ldFR5cGUpOiBlYzIuSVN1Ym5ldFtdIHtcbiAgICBzd2l0Y2ggKHN1Ym5ldFR5cGUpIHtcbiAgICAgIGNhc2UgZWMyLlN1Ym5ldFR5cGUuUFVCTElDOlxuICAgICAgICByZXR1cm4gdGhpcy5wdWJsaWNTdWJuZXRzO1xuICAgICAgY2FzZSBlYzIuU3VibmV0VHlwZS5QUklWQVRFX1dJVEhfRUdSRVNTOlxuICAgICAgICByZXR1cm4gdGhpcy5wcml2YXRlU3VibmV0cztcbiAgICAgIGNhc2UgZWMyLlN1Ym5ldFR5cGUuUFJJVkFURV9JU09MQVRFRDpcbiAgICAgICAgcmV0dXJuIHRoaXMuaXNvbGF0ZWRTdWJuZXRzO1xuICAgICAgZGVmYXVsdDpcbiAgICAgICAgcmV0dXJuIFtdO1xuICAgIH1cbiAgfVxuXG4gIC8qKlxuICAgKiBHZXQgYSByYW5kb20gc3VibmV0IG9mIHRoZSBzcGVjaWZpZWQgdHlwZVxuICAgKi9cbiAgcHVibGljIGdldFJhbmRvbVN1Ym5ldChzdWJuZXRUeXBlOiBlYzIuU3VibmV0VHlwZSk6IGVjMi5JU3VibmV0IHwgdW5kZWZpbmVkIHtcbiAgICBjb25zdCBzdWJuZXRzID0gdGhpcy5nZXRTdWJuZXRzKHN1Ym5ldFR5cGUpO1xuICAgIGlmIChzdWJuZXRzLmxlbmd0aCA9PT0gMCkgcmV0dXJuIHVuZGVmaW5lZDtcbiAgICBcbiAgICBjb25zdCByYW5kb21JbmRleCA9IE1hdGguZmxvb3IoTWF0aC5yYW5kb20oKSAqIHN1Ym5ldHMubGVuZ3RoKTtcbiAgICByZXR1cm4gc3VibmV0c1tyYW5kb21JbmRleF07XG4gIH1cbn1cbiJdfQ==