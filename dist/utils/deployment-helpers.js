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
exports.createCommonOutputs = exports.getFargateConfig = exports.validateEnvironmentVariables = exports.createSecurityGroup = exports.getSubnetSelection = exports.applyTags = exports.createStandardTags = exports.getEnvironmentConfig = void 0;
const cdk = __importStar(require("aws-cdk-lib"));
const ec2 = __importStar(require("aws-cdk-lib/aws-ec2"));
/**
 * Utility functions for common deployment operations
 */
/**
 * Get environment-specific configuration from CDK context
 */
function getEnvironmentConfig(scope, environment) {
    return scope.node.tryGetContext(environment) || {};
}
exports.getEnvironmentConfig = getEnvironmentConfig;
/**
 * Create a standard set of tags for resources
 */
function createStandardTags(project, environment, costCenter, additionalTags) {
    const tags = {
        Project: project,
        Environment: environment,
        CostCenter: costCenter,
        ManagedBy: 'CDK',
        CreatedBy: 'cdk-fargate-scaffold',
        ...additionalTags,
    };
    return tags;
}
exports.createStandardTags = createStandardTags;
/**
 * Apply tags to a CDK construct
 */
function applyTags(construct, tags) {
    Object.entries(tags).forEach(([key, value]) => {
        cdk.Tags.of(construct).add(key, value);
    });
}
exports.applyTags = applyTags;
/**
 * Get subnet selection for a specific environment
 */
function getSubnetSelection(environment, subnetType = ec2.SubnetType.PRIVATE_WITH_EGRESS) {
    return {
        subnetType,
    };
}
exports.getSubnetSelection = getSubnetSelection;
/**
 * Create a security group with common rules
 */
function createSecurityGroup(scope, id, vpc, description, allowHttp = true, allowHttps = true) {
    const securityGroup = new ec2.SecurityGroup(scope, id, {
        vpc,
        description,
        allowAllOutbound: true,
    });
    if (allowHttp) {
        securityGroup.addIngressRule(ec2.Peer.anyIpv4(), ec2.Port.tcp(80), 'Allow HTTP traffic');
    }
    if (allowHttps) {
        securityGroup.addIngressRule(ec2.Peer.anyIpv4(), ec2.Port.tcp(443), 'Allow HTTPS traffic');
    }
    return securityGroup;
}
exports.createSecurityGroup = createSecurityGroup;
/**
 * Validate required environment variables
 */
function validateEnvironmentVariables(requiredVars, env) {
    const missingVars = requiredVars.filter(envVar => !env[envVar]);
    if (missingVars.length > 0) {
        throw new Error(`Missing required environment variables: ${missingVars.join(', ')}`);
    }
}
exports.validateEnvironmentVariables = validateEnvironmentVariables;
/**
 * Get Fargate resource configuration with defaults
 */
function getFargateConfig(environment, config, env) {
    return {
        cpu: parseInt(config.fargateCpu || env.FARGATE_CPU || '256'),
        memory: parseInt(config.fargateMemory || env.FARGATE_MEMORY || '512'),
        desiredCount: parseInt(config.desiredCount || env.DESIRED_COUNT || '1'),
        maxCapacity: parseInt(config.autoScalingMaxCapacity || env.AUTO_SCALING_MAX_CAPACITY || '5'),
    };
}
exports.getFargateConfig = getFargateConfig;
/**
 * Create CloudWatch outputs for common resources
 */
function createCommonOutputs(scope, appName, environment, vpc, fargateService) {
    new cdk.CfnOutput(scope, 'AppName', {
        value: appName,
        description: 'Application name',
        exportName: `${appName}-AppName`,
    });
    new cdk.CfnOutput(scope, 'Environment', {
        value: environment,
        description: 'Deployment environment',
        exportName: `${appName}-Environment`,
    });
    new cdk.CfnOutput(scope, 'VPCId', {
        value: vpc.vpcId,
        description: 'VPC ID',
        exportName: `${appName}-VPCId`,
    });
    new cdk.CfnOutput(scope, 'ServiceName', {
        value: fargateService.serviceName,
        description: 'Fargate service name',
        exportName: `${appName}-ServiceName`,
    });
}
exports.createCommonOutputs = createCommonOutputs;
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiZGVwbG95bWVudC1oZWxwZXJzLmpzIiwic291cmNlUm9vdCI6IiIsInNvdXJjZXMiOlsiLi4vLi4vc3JjL3V0aWxzL2RlcGxveW1lbnQtaGVscGVycy50cyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiOzs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7OztBQUFBLGlEQUFtQztBQUNuQyx5REFBMkM7QUFJM0M7O0dBRUc7QUFFSDs7R0FFRztBQUNILFNBQWdCLG9CQUFvQixDQUFDLEtBQWdCLEVBQUUsV0FBbUI7SUFDeEUsT0FBTyxLQUFLLENBQUMsSUFBSSxDQUFDLGFBQWEsQ0FBQyxXQUFXLENBQUMsSUFBSSxFQUFFLENBQUM7QUFDckQsQ0FBQztBQUZELG9EQUVDO0FBRUQ7O0dBRUc7QUFDSCxTQUFnQixrQkFBa0IsQ0FDaEMsT0FBZSxFQUNmLFdBQW1CLEVBQ25CLFVBQWtCLEVBQ2xCLGNBQTBDO0lBRTFDLE1BQU0sSUFBSSxHQUFHO1FBQ1gsT0FBTyxFQUFFLE9BQU87UUFDaEIsV0FBVyxFQUFFLFdBQVc7UUFDeEIsVUFBVSxFQUFFLFVBQVU7UUFDdEIsU0FBUyxFQUFFLEtBQUs7UUFDaEIsU0FBUyxFQUFFLHNCQUFzQjtRQUNqQyxHQUFHLGNBQWM7S0FDbEIsQ0FBQztJQUVGLE9BQU8sSUFBSSxDQUFDO0FBQ2QsQ0FBQztBQWhCRCxnREFnQkM7QUFFRDs7R0FFRztBQUNILFNBQWdCLFNBQVMsQ0FDdkIsU0FBb0IsRUFDcEIsSUFBK0I7SUFFL0IsTUFBTSxDQUFDLE9BQU8sQ0FBQyxJQUFJLENBQUMsQ0FBQyxPQUFPLENBQUMsQ0FBQyxDQUFDLEdBQUcsRUFBRSxLQUFLLENBQUMsRUFBRSxFQUFFO1FBQzVDLEdBQUcsQ0FBQyxJQUFJLENBQUMsRUFBRSxDQUFDLFNBQVMsQ0FBQyxDQUFDLEdBQUcsQ0FBQyxHQUFHLEVBQUUsS0FBSyxDQUFDLENBQUM7SUFDekMsQ0FBQyxDQUFDLENBQUM7QUFDTCxDQUFDO0FBUEQsOEJBT0M7QUFFRDs7R0FFRztBQUNILFNBQWdC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SyxFQUFFLE9BQU8sRUFBRTtRQUNoQyxLQUFLLEVBQUUsR0FBRyxDQUFDLEtBQUs7UUFDaEIsV0FBVyxFQUFFLFFBQVE7UUFDckIsVUFBVSxFQUFFLEdBQUcsT0FBTyxRQUFRO0tBQy9CLENBQUMsQ0FBQztJQUVILElBQUksR0FBRyxDQUFDLFNBQVMsQ0FBQyxLQUFLLEVBQUUsYUFBYSxFQUFFO1FBQ3RDLEtBQUssRUFBRSxjQUFjLENBQUMsV0FBVztRQUNqQyxXQUFXLEVBQUUsc0JBQXNCO1FBQ25DLFVBQVUsRUFBRSxHQUFHLE9BQU8sY0FBYztLQUNyQyxDQUFDLENBQUM7QUFDTCxDQUFDO0FBOUJELGtEQThCQyIsInNvdXJjZXNDb250ZW50IjpbImltcG9ydCAqIGFzIGNkayBmcm9tICdhd3MtY2RrLWxpYic7XG5pbXBvcnQgKiBhcyBlYzIgZnJvbSAnYXdzLWNkay1saWIvYXdzLWVjMic7XG5pbXBvcnQgKiBhcyBlY3MgZnJvbSAnYXdzLWNkay1saWIvYXdzLWVjcyc7XG5pbXBvcnQgeyBDb25zdHJ1Y3QgfSBmcm9tICdjb25zdHJ1Y3RzJztcblxuLyoqXG4gKiBVdGlsaXR5IGZ1bmN0aW9ucyBmb3IgY29tbW9uIGRlcGxveW1lbnQgb3BlcmF0aW9uc1xuICovXG5cbi8qKlxuICogR2V0IGVudmlyb25tZW50LXNwZWNpZmljIGNvbmZpZ3VyYXRpb24gZnJvbSBDREsgY29udGV4dFxuICovXG5leHBvcnQgZnVuY3Rpb24gZ2V0RW52aXJvbm1lbnRDb25maWcoc2NvcGU6IENvbnN0cnVjdCwgZW52aXJvbm1lbnQ6IHN0cmluZyk6IGFueSB7XG4gIHJldHVybiBzY29wZS5ub2RlLnRyeUdldENvbnRleHQoZW52aXJvbm1lbnQpIHx8IHt9O1xufVxuXG4vKipcbiAqIENyZWF0ZSBhIHN0YW5kYXJkIHNldCBvZiB0YWdzIGZvciByZXNvdXJjZXNcbiAqL1xuZXhwb3J0IGZ1bmN0aW9uIGNyZWF0ZVN0YW5kYXJkVGFncyhcbiAgcHJvamVjdDogc3RyaW5nLFxuICBlbnZpcm9ubWVudDogc3RyaW5nLFxuICBjb3N0Q2VudGVyOiBzdHJpbmcsXG4gIGFkZGl0aW9uYWxUYWdzPzogeyBba2V5OiBzdHJpbmddOiBzdHJpbmcgfVxuKTogeyBba2V5OiBzdHJpbmddOiBzdHJpbmcgfSB7XG4gIGNvbnN0IHRhZ3MgPSB7XG4gICAgUHJvamVjdDogcHJvamVjdCxcbiAgICBFbnZpcm9ubWVudDogZW52aXJvbm1lbnQsXG4gICAgQ29zdENlbnRlcjogY29zdENlbnRlcixcbiAgICBNYW5hZ2VkQnk6ICdDREsnLFxuICAgIENyZWF0ZWRCeTogJ2Nkay1mYXJnYXRlLXNjYWZmb2xkJyxcbiAgICAuLi5hZGRpdGlvbmFsVGFncyxcbiAgfTtcblxuICByZXR1cm4gdGFncztcbn1cblxuLyoqXG4gKiBBcHBseSB0YWdzIHRvIGEgQ0RLIGNvbnN0cnVjdFxuICovXG5leHBvcnQgZnVuY3Rpb24gYXBwbHlUYWdzKFxuICBjb25zdHJ1Y3Q6IENvbnN0cnVjdCxcbiAgdGFnczogeyBba2V5OiBzdHJpbmddOiBzdHJpbmcgfVxuKTogdm9pZCB7XG4gIE9iamVjdC5lbnRyaWVzKHRhZ3MpLmZvckVhY2goKFtrZXksIHZhbHVlXSkgPT4ge1xuICAgIGNkay5UYWdzLm9mKGNvbnN0cnVjdCkuYWRkKGtleSwgdmFsdWUpO1xuICB9KTtcbn1cblxuLyoqXG4gKiBHZXQgc3VibmV0IHNlbGVjdGlvbiBmb3IgYSBzcGVjaWZpYyBlbnZpcm9ubWVudFxuICovXG5leHBvcnQgZnVuY3Rpb24gZ2V0U3VibmV0U2VsZWN0aW9uKFxuICBlbnZpcm9ubWVudDogc3RyaW5nLFxuICBzdWJuZXRUeXBlOiBlYzIuU3VibmV0VHlwZSA9IGVjMi5TdWJuZXRUeXBlLlBSSVZBVEVfV0lUSF9FR1JFU1Ncbik6IGVjMi5TdWJuZXRTZWxlY3Rpb24ge1xuICByZXR1cm4ge1xuICAgIHN1Ym5ldFR5cGUsXG4gIH07XG59XG5cbi8qKlxuICogQ3JlYXRlIGEgc2VjdXJpdHkgZ3JvdXAgd2l0aCBjb21tb24gcnVsZXNcbiAqL1xuZXhwb3J0IGZ1bmN0aW9uIGNyZWF0ZVNlY3VyaXR5R3JvdXAoXG4gIHNjb3BlOiBDb25zdHJ1Y3QsXG4gIGlkOiBzdHJpbmcsXG4gIHZwYzogZWMyLklWcGMsXG4gIGRlc2NyaXB0aW9uOiBzdHJpbmcsXG4gIGFsbG93SHR0cDogYm9vbGVhbiA9IHRydWUsXG4gIGFsbG93SHR0cHM6IGJvb2xlYW4gPSB0cnVlXG4pOiBlYzIuU2VjdXJpdHlHcm91cCB7XG4gIGNvbnN0IHNlY3VyaXR5R3JvdXAgPSBuZXcgZWMyLlNlY3VyaXR5R3JvdXAoc2NvcGUsIGlkLCB7XG4gICAgdnBjLFxuICAgIGRlc2NyaXB0aW9uLFxuICAgIGFsbG93QWxsT3V0Ym91bmQ6IHRydWUsXG4gIH0pO1xuXG4gIGlmIChhbGxvd0h0dHApIHtcbiAgICBzZWN1cml0eUdyb3VwLmFkZEluZ3Jlc3NSdWxlKFxuICAgICAgZWMyLlBlZXIuYW55SXB2NCgpLFxuICAgICAgZWMyLlBvcnQudGNwKDgwKSxcbiAgICAgICdBbGxvdyBIVFRQIHRyYWZmaWMnXG4gICAgKTtcbiAgfVxuXG4gIGlmIChhbGxvd0h0dHBzKSB7XG4gICAgc2VjdXJpdHlHcm91cC5hZGRJbmdyZXNzUnVsZShcbiAgICAgIGVjMi5QZWVyLmFueUlwdjQoKSxcbiAgICAgIGVjMi5Qb3J0LnRjcCg0NDMpLFxuICAgICAgJ0FsbG93IEhUVFBTIHRyYWZmaWMnXG4gICAgKTtcbiAgfVxuXG4gIHJldHVybiBzZWN1cml0eUdyb3VwO1xufVxuXG4vKipcbiAqIFZhbGlkYXRlIHJlcXVpcmVkIGVudmlyb25tZW50IHZhcmlhYmxlc1xuICovXG5leHBvcnQgZnVuY3Rpb24gdmFsaWRhdGVFbnZpcm9ubWVudFZhcmlhYmxlcyhcbiAgcmVxdWlyZWRWYXJzOiBzdHJpbmdbXSxcbiAgZW52OiB7IFtrZXk6IHN0cmluZ106IHN0cmluZyB8IHVuZGVmaW5lZCB9XG4pOiB2b2lkIHtcbiAgY29uc3QgbWlzc2luZ1ZhcnMgPSByZXF1aXJlZFZhcnMuZmlsdGVyKGVudlZhciA9PiAhZW52W2VudlZhcl0pO1xuXG4gIGlmIChtaXNzaW5nVmFycy5sZW5ndGggPiAwKSB7XG4gICAgdGhyb3cgbmV3IEVycm9yKFxuICAgICAgYE1pc3NpbmcgcmVxdWlyZWQgZW52aXJvbm1lbnQgdmFyaWFibGVzOiAke21pc3NpbmdWYXJzLmpvaW4oJywgJyl9YFxuICAgICk7XG4gIH1cbn1cblxuLyoqXG4gKiBHZXQgRmFyZ2F0ZSByZXNvdXJjZSBjb25maWd1cmF0aW9uIHdpdGggZGVmYXVsdHNcbiAqL1xuZXhwb3J0IGZ1bmN0aW9uIGdldEZhcmdhdGVDb25maWcoXG4gIGVudmlyb25tZW50OiBzdHJpbmcsXG4gIGNvbmZpZzogYW55LFxuICBlbnY6IHsgW2tleTogc3RyaW5nXTogc3RyaW5nIHwgdW5kZWZpbmVkIH1cbik6IHtcbiAgY3B1OiBudW1iZXI7XG4gIG1lbW9yeTogbnVtYmVyO1xuICBkZXNpcmVkQ291bnQ6IG51bWJlcjtcbiAgbWF4Q2FwYWNpdHk6IG51bWJlcjtcbn0ge1xuICByZXR1cm4ge1xuICAgIGNwdTogcGFyc2VJbnQoY29uZmlnLmZhcmdhdGVDcHUgfHwgZW52LkZBUkdBVEVfQ1BVIHx8ICcyNTYnKSxcbiAgICBtZW1vcnk6IHBhcnNlSW50KGNvbmZpZy5mYXJnYXRlTWVtb3J5IHx8IGVudi5GQVJHQVRFX01FTU9SWSB8fCAnNTEyJyksXG4gICAgZGVzaXJlZENvdW50OiBwYXJzZUludChjb25maWcuZGVzaXJlZENvdW50IHx8IGVudi5ERVNJUkVEX0NPVU5UIHx8ICcxJyksXG4gICAgbWF4Q2FwYWNpdHk6IHBhcnNlSW50KFxuICAgICAgY29uZmlnLmF1dG9TY2FsaW5nTWF4Q2FwYWNpdHkgfHwgZW52LkFVVE9fU0NBTElOR19NQVhfQ0FQQUNJVFkgfHwgJzUnXG4gICAgKSxcbiAgfTtcbn1cblxuLyoqXG4gKiBDcmVhdGUgQ2xvdWRXYXRjaCBvdXRwdXRzIGZvciBjb21tb24gcmVzb3VyY2VzXG4gKi9cbmV4cG9ydCBmdW5jdGlvbiBjcmVhdGVDb21tb25PdXRwdXRzKFxuICBzY29wZTogY2RrLlN0YWNrLFxuICBhcHBOYW1lOiBzdHJpbmcsXG4gIGVudmlyb25tZW50OiBzdHJpbmcsXG4gIHZwYzogZWMyLklWcGMsXG4gIGZhcmdhdGVTZXJ2aWNlOiBlY3MuRmFyZ2F0ZVNlcnZpY2Vcbik6IHZvaWQge1xuICBuZXcgY2RrLkNmbk91dHB1dChzY29wZSwgJ0FwcE5hbWUnLCB7XG4gICAgdmFsdWU6IGFwcE5hbWUsXG4gICAgZGVzY3JpcHRpb246ICdBcHBsaWNhdGlvbiBuYW1lJyxcbiAgICBleHBvcnROYW1lOiBgJHthcHBOYW1lfS1BcHBOYW1lYCxcbiAgfSk7XG5cbiAgbmV3IGNkay5DZm5PdXRwdXQoc2NvcGUsICdFbnZpcm9ubWVudCcsIHtcbiAgICB2YWx1ZTogZW52aXJvbm1lbnQsXG4gICAgZGVzY3JpcHRpb246ICdEZXBsb3ltZW50IGVudmlyb25tZW50JyxcbiAgICBleHBvcnROYW1lOiBgJHthcHBOYW1lfS1FbnZpcm9ubWVudGAsXG4gIH0pO1xuXG4gIG5ldyBjZGsuQ2ZuT3V0cHV0KHNjb3BlLCAnVlBDSWQnLCB7XG4gICAgdmFsdWU6IHZwYy52cGNJZCxcbiAgICBkZXNjcmlwdGlvbjogJ1ZQQyBJRCcsXG4gICAgZXhwb3J0TmFtZTogYCR7YXBwTmFtZX0tVlBDSWRgLFxuICB9KTtcblxuICBuZXcgY2RrLkNmbk91dHB1dChzY29wZSwgJ1NlcnZpY2VOYW1lJywge1xuICAgIHZhbHVlOiBmYXJnYXRlU2VydmljZS5zZXJ2aWNlTmFtZSxcbiAgICBkZXNjcmlwdGlvbjogJ0ZhcmdhdGUgc2VydmljZSBuYW1lJyxcbiAgICBleHBvcnROYW1lOiBgJHthcHBOYW1lfS1TZXJ2aWNlTmFtZWAsXG4gIH0pO1xufVxuIl19