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
exports.AppStack = void 0;
const cdk = __importStar(require("aws-cdk-lib"));
const ec2 = __importStar(require("aws-cdk-lib/aws-ec2"));
const vpc_stack_1 = require("../constructs/base/vpc-stack");
const fargate_service_1 = require("../constructs/fargate/fargate-service");
class AppStack extends cdk.Stack {
    constructor(scope, id, props) {
        super(scope, id, props);
        // Create VPC using the reusable construct
        const vpcStack = new vpc_stack_1.VPCStack(this, 'VPC', {
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
        securityGroup.addIngressRule(ec2.Peer.anyIpv4(), ec2.Port.tcp(80), 'Allow HTTP traffic');
        // Allow health check traffic
        securityGroup.addIngressRule(ec2.Peer.anyIpv4(), ec2.Port.tcp(80), 'Allow health check traffic');
        // Create Fargate service using the reusable construct
        this.fargateService = new fargate_service_1.FargateService(this, 'FargateService', {
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
exports.AppStack = AppStack;
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiYXBwLXN0YWNrLmpzIiwic291cmNlUm9vdCI6IiIsInNvdXJjZXMiOlsiLi4vLi4vc3JjL3N0YWNrcy9hcHAtc3RhY2sudHMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6Ijs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7QUFBQSxpREFBbUM7QUFDbkMseURBQTJDO0FBRTNDLDREQUF3RDtBQUN4RCwyRUFBdUU7QUFnRXZFLE1BQWEsUUFBUyxTQUFRLEdBQUcsQ0FBQyxLQUFLO0lBSXJDLFlBQVksS0FBZ0IsRUFBRSxFQUFVLEVBQUUsS0FBb0I7UUFDNUQsS0FBSyxDQUFDLEtBQUssRUFBRSxFQUFFLEVBQUUsS0FBSyxDQUFDLENBQUM7UUFFeEIsMENBQTBDO1FBQzFDLE1BQU0sUUFBUSxHQUFHLElBQUksb0JBQVEsQ0FBQyxJQUFJLEVBQUUsS0FBSyxFQUFFO1lBQ3pDLE9BQU8sRUFBRSxJQUFJLENBQUMsSUFBSSxDQUFDLGFBQWEsQ0FBQyxLQUFLLENBQUMsV0FBVyxDQUFDLEVBQUUsT0FBTyxJQUFJLGFBQWE7WUFDN0UsTUFBTSxFQUFFLElBQUksQ0FBQyxJQUFJLENBQUMsYUFBYSxDQUFDLEtBQUssQ0FBQyxXQUFXLENBQUMsRUFBRSxNQUFNLElBQUksQ0FBQztZQUMvRCxXQUFXLEVBQUUsSUFBSSxDQUFDLElBQUksQ0FBQyxhQUFhLENBQUMsS0FBSyxDQUFDLFdBQVcsQ0FBQyxFQUFFLFdBQVcsSUFBSSxDQUFDO1lBQ3pFLElBQUksRUFBRTtnQkFDSixXQUFXLEVBQUUsS0FBSyxDQUFDLFdBQVc7Z0JBQzlCLFVBQVUsRUFBRSxLQUFLLENBQUMsVUFBVTtnQkFDNUIsT0FBTyxFQUFFLEtBQUssQ0FBQyxPQUFPO2dCQUN0QixHQUFHLEtBQUssQ0FBQyxJQUFJO2FBQ2Q7U0FDRixDQUFDLENBQUM7UUFFSCxJQUFJLENBQUMsR0FBRyxHQUFHLFFBQVEsQ0FBQyxHQUFHLENBQUM7UUFFeEIsZ0RBQWdEO1FBQ2hELE1BQU0sYUFBYSxHQUFHLElBQUksR0FBRyxDQUFD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QUU7WUFDMUMsS0FBSyxFQUFFLElBQUksQ0FBQyxjQUFjLENBQUMsYUFBYSxFQUFFLGFBQWEsSUFBSSxLQUFLO1lBQ2hFLFdBQVcsRUFBRSxvQkFBb0I7WUFDakMsVUFBVSxFQUFFLEdBQUcsS0FBSyxDQUFDLE9BQU8sbUJBQW1CO1NBQ2hELENBQUMsQ0FBQztRQUVILElBQUksR0FBRyxDQUFDLFNBQVMsQ0FBQyxJQUFJLEVBQUUsY0FBYyxFQUFFO1lBQ3RDLEtBQUssRUFBRSxJQUFJLENBQUMsY0FBYyxDQUFDLFFBQVEsQ0FBQyxZQUFZO1lBQ2hELFdBQVcsRUFBRSwyQkFBMkI7WUFDeEMsVUFBVSxFQUFFLEdBQUcsS0FBSyxDQUFDLE9BQU8sZUFBZTtTQUM1QyxDQUFDLENBQUM7UUFFSCwyQkFBMkI7UUFDM0IsR0FBRyxDQUFDLElBQUksQ0FBQyxFQUFFLENBQUMsSUFBSSxDQUFDLENBQUMsR0FBRyxDQUFDLCtCQUErQixFQUFFLElBQUksQ0FBQyxTQUFTLENBQUMsQ0FBQztRQUN2RSxHQUFHLENBQUMsSUFBSSxDQUFDLEVBQUUsQ0FBQyxJQUFJLENBQUMsQ0FBQyxHQUFHLENBQUMsNkJBQTZCLEVBQUUsSUFBSSxDQUFDLE9BQU8sQ0FBQyxDQUFDO0lBQ3JFLENBQUM7Q0FDRjtBQXBJRCw0QkFvSUMiLCJzb3VyY2VzQ29udGVudCI6WyJpbXBvcnQgKiBhcyBjZGsgZnJvbSAnYXdzLWNkay1saWInO1xuaW1wb3J0ICogYXMgZWMyIGZyb20gJ2F3cy1jZGstbGliL2F3cy1lYzInO1xuaW1wb3J0IHsgQ29uc3RydWN0IH0gZnJvbSAnY29uc3RydWN0cyc7XG5pbXBvcnQgeyBWUENTdGFjayB9IGZyb20gJy4uL2NvbnN0cnVjdHMvYmFzZS92cGMtc3RhY2snO1xuaW1wb3J0IHsgRmFyZ2F0ZVNlcnZpY2UgfSBmcm9tICcuLi9jb25zdHJ1Y3RzL2ZhcmdhdGUvZmFyZ2F0ZS1zZXJ2aWNlJztcblxuZXhwb3J0IGludGVyZmFjZSBBcHBTdGFja1Byb3BzIGV4dGVuZHMgY2RrLlN0YWNrUHJvcHMge1xuICAvKipcbiAgICogVGhlIG5hbWUgb2YgdGhlIGFwcGxpY2F0aW9uXG4gICAqL1xuICBhcHBOYW1lOiBzdHJpbmc7XG5cbiAgLyoqXG4gICAqIFRoZSBEb2NrZXIgaW1hZ2UgdG8gZGVwbG95XG4gICAqL1xuICBkb2NrZXJJbWFnZTogc3RyaW5nO1xuXG4gIC8qKlxuICAgKiBFbnZpcm9ubWVudCAoZGV2LCBzdGFnaW5nLCBwcm9kdWN0aW9uKVxuICAgKi9cbiAgZW52aXJvbm1lbnQ6IHN0cmluZztcblxuICAvKipcbiAgICogQ1BVIHVuaXRzIGZvciB0aGUgRmFyZ2F0ZSB0YXNrXG4gICAqL1xuICBmYXJnYXRlQ3B1OiBudW1iZXI7XG5cbiAgLyoqXG4gICAqIE1lbW9yeSBmb3IgdGhlIEZhcmdhdGUgdGFzayBpbiBNaUJcbiAgICovXG4gIGZhcmdhdGVNZW1vcnk6IG51bWJlcjtcblxuICAvKipcbiAgICogRGVzaXJlZCBudW1iZXIgb2YgdGFza3NcbiAgICovXG4gIGRlc2lyZWRDb3VudDogbnVtYmVyO1xuXG4gIC8qKlxuICAgKiBNYXhpbXVtIG51bWJlciBvZiB0YXNrcyBmb3IgYXV0by1zY2FsaW5nXG4gICAqL1xuICBhdXRvU2NhbGluZ01heENhcGFjaXR5OiBudW1iZXI7XG5cbiAgLyoqXG4gICAqIFdoZXRoZXIgdG8gZW5hYmxlIGNvbnRhaW5lciBpbnNpZ2h0c1xuICAgKi9cbiAgZW5hYmxlQ29udGFpbmVySW5zaWdodHM6IGJvb2xlYW47XG5cbiAgLyoqXG4gICAqIFdoZXRoZXIgdG8gZW5hYmxlIFgtUmF5IHRyYWNpbmdcbiAgICovXG4gIGVuYWJsZVhSYXk6IGJvb2xlYW47XG5cbiAgLyoqXG4gICAqIExvZyByZXRlbnRpb24gZGF5c1xuICAgKi9cbiAgbG9nUmV0ZW50aW9uRGF5czogbnVtYmVyO1xuXG4gIC8qKlxuICAgKiBDb3N0IGNlbnRlciBmb3IgdGFnZ2luZ1xuICAgKi9cbiAgY29zdENlbnRlcjogc3RyaW5nO1xuXG4gIC8qKlxuICAgKiBBZGRpdGlvbmFsIHRhZ3NcbiAgICovXG4gIHRhZ3M/OiB7IFtrZXk6IHN0cmluZ106IHN0cmluZyB9O1xufVxuXG5leHBvcnQgY2xhc3MgQXBwU3RhY2sgZXh0ZW5kcyBjZGsuU3RhY2sge1xuICBwdWJsaWMgcmVhZG9ubHkgdnBjOiBlYzIuSVZwYztcbiAgcHVibGljIHJlYWRvbmx5IGZhcmdhdGVTZXJ2aWNlOiBGYXJnYXRlU2VydmljZTtcblxuICBjb25zdHJ1Y3RvcihzY29wZTogQ29uc3RydWN0LCBpZDogc3RyaW5nLCBwcm9wczogQXBwU3RhY2tQcm9wcykge1xuICAgIHN1cGVyKHNjb3BlLCBpZCwgcHJvcHMpO1xuXG4gICAgLy8gQ3JlYXRlIFZQQyB1c2luZyB0aGUgcmV1c2FibGUgY29uc3RydWN0XG4gICAgY29uc3QgdnBjU3RhY2sgPSBuZXcgVlBDU3RhY2sodGhpcywgJ1ZQQycsIHtcbiAgICAgIHZwY0NpZHI6IHRoaXMubm9kZS50cnlHZXRDb250ZXh0KHByb3BzLmVudmlyb25tZW50KT8udnBjQ2lkciB8fCAnMTAuMC4wLjAvMTYnLFxuICAgICAgbWF4QXpzOiB0aGlzLm5vZGUudHJ5R2V0Q29udGV4dChwcm9wcy5lbnZpcm9ubWVudCk/Lm1heEF6cyB8fCAyLFxuICAgICAgbmF0R2F0ZXdheXM6IHRoaXMubm9kZS50cnlHZXRDb250ZXh0KHByb3BzLmVudmlyb25tZW50KT8ubmF0R2F0ZXdheXMgfHwgMSxcbiAgICAgIHRhZ3M6IHtcbiAgICAgICAgRW52aXJvbm1lbnQ6IHByb3BzLmVudmlyb25tZW50LFxuICAgICAgICBDb3N0Q2VudGVyOiBwcm9wcy5jb3N0Q2VudGVyLFxuICAgICAgICBQcm9qZWN0OiBwcm9wcy5hcHBOYW1lLFxuICAgICAgICAuLi5wcm9wcy50YWdzLFxuICAgICAgfSxcbiAgICB9KTtcblxuICAgIHRoaXMudnBjID0gdnBjU3RhY2sudnBjO1xuXG4gICAgLy8gQ3JlYXRlIHNlY3VyaXR5IGdyb3VwIGZvciB0aGUgRmFyZ2F0ZSBzZXJ2aWNlXG4gICAgY29uc3Qgc2VjdXJpdHlHcm91cCA9IG5ldyBlYzIuU2VjdXJpdHlHcm91cCh0aGlzLCAnU2VydmljZVNlY3VyaXR5R3JvdXAnLCB7XG4gICAgICB2cGM6IHRoaXMudnBjLFxuICAgICAgZGVzY3JpcHRpb246IGBTZWN1cml0eSBncm91cCBmb3IgJHtwcm9wcy5hcHBOYW1lfSBGYXJnYXRlIHNlcnZpY2VgLFxuICAgICAgYWxsb3dBbGxPdXRib3VuZDogdHJ1ZSxcbiAgICB9KTtcblxuICAgIC8vIEFsbG93IGluYm91bmQgdHJhZmZpYyBvbiB0aGUgY29udGFpbmVyIHBvcnRcbiAgICBzZWN1cml0eUdyb3VwLmFkZEluZ3Jlc3NSdWxlKFxuICAgICAgZWMyLlBlZXIuYW55SXB2NCgpLFxuICAgICAgZWMyLlBvcnQudGNwKDgwKSxcbiAgICAgICdBbGxvdyBIVFRQIHRyYWZmaWMnXG4gICAgKTtcblxuICAgIC8vIEFsbG93IGhlYWx0aCBjaGVjayB0cmFmZmljXG4gICAgc2VjdXJpdHlHcm91cC5hZGRJbmdyZXNzUnVsZShcbiAgICAgIGVjMi5QZWVyLmFueUlwdjQoKSxcbiAgICAgIGVjMi5Qb3J0LnRjcCg4MCksXG4gICAgICAnQWxsb3cgaGVhbHRoIGNoZWNrIHRyYWZmaWMnXG4gICAgKTtcblxuICAgIC8vIENyZWF0ZSBGYXJnYXRlIHNlcnZpY2UgdXNpbmcgdGhlIHJldXNhYmxlIGNvbnN0cnVjdFxuICAgIHRoaXMuZmFyZ2F0ZVNlcnZpY2UgPSBuZXcgRmFyZ2F0ZVNlcnZpY2UodGhpcywgJ0ZhcmdhdGVTZXJ2aWNlJywge1xuICAgICAgdnBjOiB0aGlzLnZwYyxcbiAgICAgIGltYWdlOiBwcm9wcy5kb2NrZXJJbWFnZSxcbiAgICAgIHNlcnZpY2VOYW1lOiBwcm9wcy5hcHBOYW1lLFxuICAgICAgY3B1OiBwcm9wcy5mYXJnYXRlQ3B1LFxuICAgICAgbWVtb3J5OiBwcm9wcy5mYXJnYXRlTWVtb3J5LFxuICAgICAgZGVzaXJlZENvdW50OiBwcm9wcy5kZXNpcmVkQ291bnQsXG4gICAgICBtYXhDYXBhY2l0eTogcHJvcHMuYXV0b1NjYWxpbmdNYXhDYXBhY2l0eSxcbiAgICAgIG1pbkNhcGFjaXR5OiBwcm9wcy5kZXNpcmVkQ291bnQsXG4gICAgICBjb250YWluZXJQb3J0OiA4MCxcbiAgICAgIGhlYWx0aENoZWNrUGF0aDogJy9oZWFsdGgnLFxuICAgICAgZW52aXJvbm1lbnQ6IHtcbiAgICAgICAgRU5WSVJPTk1FTlQ6IHByb3BzLmVudmlyb25tZW50LFxuICAgICAgICBBUFBfTkFNRTogcHJvcHMuYXBwTmFtZSxcbiAgICAgICAgVkVSU0lPTjogJzEuMC4wJyxcbiAgICAgICAgREVQTE9ZTUVOVF9JRDogRGF0ZS5ub3coKS50b1N0cmluZygpLFxuICAgICAgfSxcbiAgICAgIGVuYWJsZUF1dG9TY2FsaW5nOiB0cnVlLFxuICAgICAgZW5hYmxlTG9hZEJhbGFuY2VyOiB0cnVlLFxuICAgICAgZW5hYmxlQ29udGFpbmVySW5zaWdodHM6IHByb3BzLmVuYWJsZUNvbnRhaW5lckluc2lnaHRzLFxuICAgICAgZW5hYmxlWFJheTogcHJvcHMuZW5hYmxlWFJheSxcbiAgICAgIGxvZ1JldGVudGlvbkRheXM6IHByb3BzLmxvZ1JldGVudGlvbkRheXMsXG4gICAgICBzZWN1cml0eUdyb3VwczogW3NlY3VyaXR5R3JvdXBdLFxuICAgICAgdnBjU3VibmV0czoge1xuICAgICAgICBzdWJuZXRUeXBlOiBlYzIuU3VibmV0VHlwZS5QUklWQVRFX1dJVEhfRUdSRVNTLFxuICAgICAgfSxcbiAgICAgIHRhZ3M6IHtcbiAgICAgICAgRW52aXJvbm1lbnQ6IHByb3BzLmVudmlyb25tZW50LFxuICAgICAgICBDb3N0Q2VudGVyOiBwcm9wcy5jb3N0Q2VudGVyLFxuICAgICAgICBQcm9qZWN0OiBwcm9wcy5hcHBOYW1lLFxuICAgICAgICBTZXJ2aWNlOiBwcm9wcy5hcHBOYW1lLFxuICAgICAgICAuLi5wcm9wcy50YWdzLFxuICAgICAgfSxcbiAgICB9KTtcblxuICAgIC8vIEFkZCB0YWdzIHRvIGFsbCByZXNvdXJjZXNcbiAgICBjZGsuVGFncy5vZih0aGlzKS5hZGQoJ0Vudmlyb25tZW50JywgcHJvcHMuZW52aXJvbm1lbnQpO1xuICAgIGNkay5UYWdzLm9mKHRoaXMpLmFkZCgnQ29zdENlbnRlcicsIHByb3BzLmNvc3RDZW50ZXIpO1xuICAgIGNkay5UYWdzLm9mKHRoaXMpLmFkZCgnUHJvamVjdCcsIHByb3BzLmFwcE5hbWUpO1xuICAgIGNkay5UYWdzLm9mKHRoaXMpLmFkZCgnTWFuYWdlZEJ5JywgJ0NESycpO1xuXG4gICAgLy8gQ3JlYXRlIG91dHB1dHNcbiAgICBuZXcgY2RrLkNmbk91dHB1dCh0aGlzLCAnQXBwTmFtZScsIHtcbiAgICAgIHZhbHVlOiBwcm9wcy5hcHBOYW1lLFxuICAgICAgZGVzY3JpcHRpb246ICdBcHBsaWNhdGlvbiBuYW1lJyxcbiAgICAgIGV4cG9ydE5hbWU6IGAke3Byb3BzLmFwcE5hbWV9LUFwcE5hbWVgLFxuICAgIH0pO1xuXG4gICAgbmV3IGNkay5DZm5PdXRwdXQodGhpcywgJ0Vudmlyb25tZW50Jywge1xuICAgICAgdmFsdWU6IHByb3BzLmVudmlyb25tZW50LFxuICAgICAgZGVzY3JpcHRpb246ICdEZXBsb3ltZW50IGVudmlyb25tZW50JyxcbiAgICAgIGV4cG9ydE5hbWU6IGAke3Byb3BzLmFwcE5hbWV9LUVudmlyb25tZW50YCxcbiAgICB9KTtcblxuICAgIG5ldyBjZGsuQ2ZuT3V0cHV0KHRoaXMsICdWUENJZCcsIHtcbiAgICAgIHZhbHVlOiB0aGlzLnZwYy52cGNJZCxcbiAgICAgIGRlc2NyaXB0aW9uOiAnVlBDIElEJyxcbiAgICAgIGV4cG9ydE5hbWU6IGAke3Byb3BzLmFwcE5hbWV9LVZQQ0lkYCxcbiAgICB9KTtcblxuICAgIG5ldyBjZGsuQ2ZuT3V0cHV0KHRoaXMsICdTZXJ2aWNlTmFtZScsIHtcbiAgICAgIHZhbHVlOiB0aGlzLmZhcmdhdGVTZXJ2aWNlLnNlcnZpY2Uuc2VydmljZU5hbWUsXG4gICAgICBkZXNjcmlwdGlvbjogJ0ZhcmdhdGUgc2VydmljZSBuYW1lJyxcbiAgICAgIGV4cG9ydE5hbWU6IGAke3Byb3BzLmFwcE5hbWV9LVNlcnZpY2VOYW1lYCxcbiAgICB9KTtcblxuICAgIG5ldyBjZGsuQ2ZuT3V0cHV0KHRoaXMsICdMb2FkQmFsYW5jZXJETlMnLCB7XG4gICAgICB2YWx1ZTogdGhpcy5mYXJnYXRlU2VydmljZS5sb2FkQmFsYW5jZXI/LmxvYWRCYWxhbmNlckRuc05hbWUgfHwgJ04vQScsXG4gICAgICBkZXNjcmlwdGlvbjogJ0xvYWQgYmFsYW5jZXIgRE5TIG5hbWUnLFxuICAgICAgZXhwb3J0TmFtZTogYCR7cHJvcHMuYXBwTmFtZX0tTG9hZEJhbGFuY2VyRE5TYCxcbiAgICB9KTtcblxuICAgIG5ldyBjZGsuQ2ZuT3V0cHV0KHRoaXMsICdFQ1JSZXBvc2l0b3J5VXJpJywge1xuICAgICAgdmFsdWU6IHRoaXMuZmFyZ2F0ZVNlcnZpY2UuZWNyUmVwb3NpdG9yeT8ucmVwb3NpdG9yeVVyaSB8fCAnTi9BJyxcbiAgICAgIGRlc2NyaXB0aW9uOiAnRUNSIHJlcG9zaXRvcnkgVVJJJyxcbiAgICAgIGV4cG9ydE5hbWU6IGAke3Byb3BzLmFwcE5hbWV9LUVDUlJlcG9zaXRvcnlVcmlgLFxuICAgIH0pO1xuXG4gICAgbmV3IGNkay5DZm5PdXRwdXQodGhpcywgJ0xvZ0dyb3VwTmFtZScsIHtcbiAgICAgIHZhbHVlOiB0aGlzLmZhcmdhdGVTZXJ2aWNlLmxvZ0dyb3VwLmxvZ0dyb3VwTmFtZSxcbiAgICAgIGRlc2NyaXB0aW9uOiAnQ2xvdWRXYXRjaCBsb2cgZ3JvdXAgbmFtZScsXG4gICAgICBleHBvcnROYW1lOiBgJHtwcm9wcy5hcHBOYW1lfS1Mb2dHcm91cE5hbWVgLFxuICAgIH0pO1xuXG4gICAgLy8gQWRkIGNvc3QgYWxsb2NhdGlvbiB0YWdzXG4gICAgY2RrLlRhZ3Mub2YodGhpcykuYWRkKCdhd3M6Y2xvdWRmb3JtYXRpb246c3RhY2stbmFtZScsIHRoaXMuc3RhY2tOYW1lKTtcbiAgICBjZGsuVGFncy5vZih0aGlzKS5hZGQoJ2F3czpjbG91ZGZvcm1hdGlvbjpzdGFjay1pZCcsIHRoaXMuc3RhY2tJZCk7XG4gIH1cbn1cbiJdfQ==