"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.validateFargateResources = exports.getFargateResourceLimits = exports.parseEnvironmentVariables = exports.getCostAllocationTags = exports.getResourceName = exports.createCdkContext = exports.validateEnvironmentConfig = exports.getEnvironmentConfigFromContext = exports.DEFAULT_ENVIRONMENTS = void 0;
/**
 * Default environment configurations
 */
exports.DEFAULT_ENVIRONMENTS = {
    dev: {
        environment: 'dev',
        vpcCidr: '10.0.0.0/16',
        maxAzs: 2,
        natGateways: 1,
        fargateCpu: '256',
        fargateMemory: '512',
        desiredCount: 1,
        autoScalingMaxCapacity: 2,
        enableContainerInsights: true,
        enableXRay: false,
        logRetentionDays: 7,
        costCenter: 'dev',
        tags: {
            Environment: 'dev',
            CostCenter: 'dev',
            Project: 'scaffold',
        },
    },
    staging: {
        environment: 'staging',
        vpcCidr: '10.1.0.0/16',
        maxAzs: 2,
        natGateways: 1,
        fargateCpu: '512',
        fargateMemory: '1024',
        desiredCount: 2,
        autoScalingMaxCapacity: 5,
        enableContainerInsights: true,
        enableXRay: true,
        logRetentionDays: 14,
        costCenter: 'staging',
        tags: {
            Environment: 'staging',
            CostCenter: 'staging',
            Project: 'scaffold',
        },
    },
    production: {
        environment: 'production',
        vpcCidr: '10.2.0.0/16',
        maxAzs: 3,
        natGateways: 3,
        fargateCpu: '1024',
        fargateMemory: '2048',
        desiredCount: 3,
        autoScalingMaxCapacity: 10,
        enableContainerInsights: true,
        enableXRay: true,
        logRetentionDays: 30,
        costCenter: 'production',
        tags: {
            Environment: 'production',
            CostCenter: 'production',
            Project: 'scaffold',
        },
    },
};
/**
 * Get environment configuration with defaults
 */
function getEnvironmentConfigFromContext(scope, environment) {
    const contextConfig = scope.node.tryGetContext(environment) || {};
    const defaultConfig = exports.DEFAULT_ENVIRONMENTS[environment] || exports.DEFAULT_ENVIRONMENTS.dev;
    return {
        ...defaultConfig,
        ...contextConfig,
        environment,
    };
}
exports.getEnvironmentConfigFromContext = getEnvironmentConfigFromContext;
/**
 * Validate environment configuration
 */
function validateEnvironmentConfig(config) {
    const errors = [];
    if (!config.environment) {
        errors.push('Environment is required');
    }
    if (!config.vpcCidr) {
        errors.push('VPC CIDR is required');
    }
    if (config.maxAzs < 1 || config.maxAzs > 6) {
        errors.push('Max AZs must be between 1 and 6');
    }
    if (config.natGateways < 1 || config.natGateways > config.maxAzs) {
        errors.push('NAT gateways must be between 1 and max AZs');
    }
    if (config.desiredCount < 1) {
        errors.push('Desired count must be at least 1');
    }
    if (config.autoScalingMaxCapacity < config.desiredCount) {
        errors.push('Max capacity must be at least desired count');
    }
    if (errors.length > 0) {
        throw new Error(`Environment configuration validation failed:\n${errors.join('\n')}`);
    }
}
exports.validateEnvironmentConfig = validateEnvironmentConfig;
/**
 * Create CDK context for an environment
 */
function createCdkContext(environment, config) {
    return {
        environment,
        [environment]: config,
    };
}
exports.createCdkContext = createCdkContext;
/**
 * Get resource naming convention
 */
function getResourceName(baseName, environment, resourceType) {
    return `${baseName}-${environment}-${resourceType}`;
}
exports.getResourceName = getResourceName;
/**
 * Get cost allocation tags
 */
function getCostAllocationTags(project, environment, costCenter) {
    return {
        Project: project,
        Environment: environment,
        CostCenter: costCenter,
        ManagedBy: 'CDK',
        CreatedBy: 'cdk-fargate-scaffold',
    };
}
exports.getCostAllocationTags = getCostAllocationTags;
/**
 * Parse environment variables with defaults
 */
function parseEnvironmentVariables(env, defaults) {
    const result = {};
    Object.entries(defaults).forEach(([key, defaultValue]) => {
        result[key] = env[key] || defaultValue;
    });
    return result;
}
exports.parseEnvironmentVariables = parseEnvironmentVariables;
/**
 * Get Fargate resource limits
 */
function getFargateResourceLimits() {
    return {
        cpu: {
            min: 256,
            max: 4096,
            valid: [256, 512, 1024, 2048, 4096],
        },
        memory: {
            min: 512,
            max: 8192,
            valid: [512, 1024, 2048, 3072, 4096, 5120, 6144, 7168, 8192],
        },
    };
}
exports.getFargateResourceLimits = getFargateResourceLimits;
/**
 * Validate Fargate resource configuration
 */
function validateFargateResources(cpu, memory) {
    const limits = getFargateResourceLimits();
    if (!limits.cpu.valid.includes(cpu)) {
        throw new Error(`Invalid CPU value: ${cpu}. Valid values: ${limits.cpu.valid.join(', ')}`);
    }
    if (!limits.memory.valid.includes(memory)) {
        throw new Error(`Invalid memory value: ${memory}. Valid values: ${limits.memory.valid.join(', ')}`);
    }
    // Validate CPU to memory ratio
    const ratio = memory / cpu;
    if (ratio < 1 || ratio > 4) {
        throw new Error(`Invalid CPU to memory ratio: ${ratio.toFixed(2)}. Must be between 1:1 and 1:4`);
    }
}
exports.validateFargateResources = validateFargateResources;
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiY29uZmlndXJhdGlvbi1oZWxwZXJzLmpzIiwic291cmNlUm9vdCI6IiIsInNvdXJjZXMiOlsiLi4vLi4vc3JjL3V0aWxzL2NvbmZpZ3VyYXRpb24taGVscGVycy50cyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiOzs7QUEwQkE7O0dBRUc7QUFDVSxRQUFBLG9CQUFvQixHQUF5QztJQUN4RSxHQUFHLEVBQUU7UUFDSCxXQUFXLEVBQUUsS0FBSztRQUNsQixPQUFPLEVBQUUsYUFBYTtRQUN0QixNQUFNLEVBQUUsQ0FBQztRQUNULFdBQVcsRUFBRSxDQUFDO1FBQ2QsVUFBVSxFQUFFLEtBQUs7UUFDakIsYUFBYSxFQUFFLEtBQUs7UUFDcEIsWUFBWSxFQUFFLENBQUM7UUFDZixzQkFBc0IsRUFBRSxDQUFDO1FBQ3pCLHVCQUF1QixFQUFFLElBQUk7UUFDN0IsVUFBVSxFQUFFLEtBQUs7UUFDakIsZ0JBQWdCLEVBQUUsQ0FBQztRQUNuQixVQUFVLEVBQUUsS0FBSztRQUNqQixJQUFJLEVBQUU7WUFDSixXQUFXLEVBQUUsS0FBSztZQUNsQixVQUFVLEVBQUUsS0FBSztZQUNqQixPQUFPLEVBQUUsVUFBVTtTQUNwQjtLQUNGO0lBQ0QsT0FBTyxFQUFFO1FBQ1AsV0FBVyxFQUFFLFNBQVM7UUFDdEIsT0FBTyxFQUFFLGFBQWE7UUFDdEIsTUFBTSxFQUFFLENBQUM7UUFDVCxXQUFXLEVBQUUsQ0FBQztRQUNkLFVBQVUsRUFBRSxLQUFLO1FBQ2pCLGFBQWEsRUFBRSxNQUFNO1FBQ3JCLFlBQVksRUFBRSxDQUFDO1FBQ2Ysc0JBQXNCLEVBQUUsQ0FBQztRQUN6Qix1QkFBdUIsRUFBRSxJQUFJO1FBQzdCLFVBQVUsRUFBRSxJQUFJO1FBQ2hCLGdCQUFnQixFQUFFLEVBQUU7UUFDcEIsVUFBVSxFQUFFLFNBQVM7UUFDckIsSUFBSSxFQUFFO1lBQ0osV0FBVyxFQUFFLFNBQVM7WUFDdEIsVUFBVSxFQUFFLFNBQVM7WUFDckIsT0FBTyxFQUFFLFVBQVU7U0FDcEI7S0FDRjtJQUNE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TSxHQUFHLHdCQUF3QixFQUFFLENBQUM7SUFFMUMsSUFBSSxDQUFDLE1BQU0sQ0FBQyxHQUFHLENBQUMsS0FBSyxDQUFDLFFBQVEsQ0FBQyxHQUFHLENBQUMsRUFBRTtRQUNuQyxNQUFNLElBQUksS0FBSyxDQUNiLHNCQUFzQixHQUFHLG1CQUFtQixNQUFNLENBQUMsR0FBRyxDQUFDLEtBQUssQ0FBQyxJQUFJLENBQUMsSUFBSSxDQUFDLEVBQUUsQ0FDMUUsQ0FBQztLQUNIO0lBRUQsSUFBSSxDQUFDLE1BQU0sQ0FBQyxNQUFNLENBQUMsS0FBSyxDQUFDLFFBQVEsQ0FBQyxNQUFNLENBQUMsRUFBRTtRQUN6QyxNQUFNLElBQUksS0FBSyxDQUNiLHlCQUF5QixNQUFNLG1CQUFtQixNQUFNLENBQUMsTUFBTSxDQUFDLEtBQUssQ0FBQyxJQUFJLENBQUMsSUFBSSxDQUFDLEVBQUUsQ0FDbkYsQ0FBQztLQUNIO0lBRUQsK0JBQStCO0lBQy9CLE1BQU0sS0FBSyxHQUFHLE1BQU0sR0FBRyxHQUFHLENBQUM7SUFDM0IsSUFBSSxLQUFLLEdBQUcsQ0FBQyxJQUFJLEtBQUssR0FBRyxDQUFDLEVBQUU7UUFDMUIsTUFBTSxJQUFJLEtBQUssQ0FDYixnQ0FBZ0MsS0FBSyxDQUFDLE9BQU8sQ0FBQyxDQUFDLENBQUMsK0JBQStCLENBQ2hGLENBQUM7S0FDSDtBQUNILENBQUM7QUF6QkQsNERBeUJDIiwic291cmNlc0NvbnRlbnQiOlsiaW1wb3J0ICogYXMgY2RrIGZyb20gJ2F3cy1jZGstbGliJztcbmltcG9ydCB7IENvbnN0cnVjdCB9IGZyb20gJ2NvbnN0cnVjdHMnO1xuXG4vKipcbiAqIENvbmZpZ3VyYXRpb24gaGVscGVyIHV0aWxpdGllcyBmb3IgbWFuYWdpbmcgZW52aXJvbm1lbnQtc3BlY2lmaWMgc2V0dGluZ3NcbiAqL1xuXG4vKipcbiAqIEVudmlyb25tZW50IGNvbmZpZ3VyYXRpb24gaW50ZXJmYWNlXG4gKi9cbmV4cG9ydCBpbnRlcmZhY2UgRW52aXJvbm1lbnRDb25maWcge1xuICBlbnZpcm9ubWVudDogc3RyaW5nO1xuICB2cGNDaWRyOiBzdHJpbmc7XG4gIG1heEF6czogbnVtYmVyO1xuICBuYXRHYXRld2F5czogbnVtYmVyO1xuICBmYXJnYXRlQ3B1OiBzdHJpbmc7XG4gIGZhcmdhdGVNZW1vcnk6IHN0cmluZztcbiAgZGVzaXJlZENvdW50OiBudW1iZXI7XG4gIGF1dG9TY2FsaW5nTWF4Q2FwYWNpdHk6IG51bWJlcjtcbiAgZW5hYmxlQ29udGFpbmVySW5zaWdodHM6IGJvb2xlYW47XG4gIGVuYWJsZVhSYXk6IGJvb2xlYW47XG4gIGxvZ1JldGVudGlvbkRheXM6IG51bWJlcjtcbiAgY29zdENlbnRlcjogc3RyaW5nO1xuICB0YWdzOiB7IFtrZXk6IHN0cmluZ106IHN0cmluZyB9O1xufVxuXG4vKipcbiAqIERlZmF1bHQgZW52aXJvbm1lbnQgY29uZmlndXJhdGlvbnNcbiAqL1xuZXhwb3J0IGNvbnN0IERFRkFVTFRfRU5WSVJPTk1FTlRTOiB7IFtrZXk6IHN0cmluZ106IEVudmlyb25tZW50Q29uZmlnIH0gPSB7XG4gIGRldjoge1xuICAgIGVudmlyb25tZW50OiAnZGV2JyxcbiAgICB2cGNDaWRyOiAnMTAuMC4wLjAvMTYnLFxuICAgIG1heEF6czogMixcbiAgICBuYXRHYXRld2F5czogMSxcbiAgICBmYXJnYXRlQ3B1OiAnMjU2JyxcbiAgICBmYXJnYXRlTWVtb3J5OiAnNTEyJyxcbiAgICBkZXNpcmVkQ291bnQ6IDEsXG4gICAgYXV0b1NjYWxpbmdNYXhDYXBhY2l0eTogMixcbiAgICBlbmFibGVDb250YWluZXJJbnNpZ2h0czogdHJ1ZSxcbiAgICBlbmFibGVYUmF5OiBmYWxzZSxcbiAgICBsb2dSZXRlbnRpb25EYXlzOiA3LFxuICAgIGNvc3RDZW50ZXI6ICdkZXYnLFxuICAgIHRhZ3M6IHtcbiAgICAgIEVudmlyb25tZW50OiAnZGV2JyxcbiAgICAgIENvc3RDZW50ZXI6ICdkZXYnLFxuICAgICAgUHJvamVjdDogJ3NjYWZmb2xkJyxcbiAgICB9LFxuICB9LFxuICBzdGFnaW5nOiB7XG4gICAgZW52aXJvbm1lbnQ6ICdzdGFnaW5nJyxcbiAgICB2cGNDaWRyOiAnMTAuMS4wLjAvMTYnLFxuICAgIG1heEF6czogMixcbiAgICBuYXRHYXRld2F5czogMSxcbiAgICBmYXJnYXRlQ3B1OiAnNTEyJyxcbiAgICBmYXJnYXRlTWVtb3J5OiAnMTAyNCcsXG4gICAgZGVzaXJlZENvdW50OiAyLFxuICAgIGF1dG9TY2FsaW5nTWF4Q2FwYWNpdHk6IDUsXG4gICAgZW5hYmxlQ29udGFpbmVySW5zaWdodHM6IHRydWUsXG4gICAgZW5hYmxlWFJheTogdHJ1ZSxcbiAgICBsb2dSZXRlbnRpb25EYXlzOiAxNCxcbiAgICBjb3N0Q2VudGVyOiAnc3RhZ2luZycsXG4gICAgdGFnczoge1xuICAgICAgRW52aXJvbm1lbnQ6ICdzdGFnaW5nJyxcbiAgICAgIENvc3RDZW50ZXI6ICdzdGFnaW5nJyxcbiAgICAgIFByb2plY3Q6ICdzY2FmZm9sZCcsXG4gICAgfSxcbiAgfSxcbiAgcHJvZHVjdGlvbjoge1xuICAgIGVudmlyb25tZW50OiAncHJvZHVjdGlvbicsXG4gICAgdnBjQ2lkcjogJzEwLjIuMC4wLzE2JyxcbiAgICBtYXhBenM6IDMsXG4gICAgbmF0R2F0ZXdheXM6IDMsXG4gICAgZmFyZ2F0ZUNwdTogJzEwMjQnLFxuICAgIGZhcmdhdGVNZW1vcnk6ICcyMDQ4JyxcbiAgICBkZXNpcmVkQ291bnQ6IDMsXG4gICAgYXV0b1NjYWxpbmdNYXhDYXBhY2l0eTogMTAsXG4gICAgZW5hYmxlQ29udGFpbmVySW5zaWdodHM6IHRydWUsXG4gICAgZW5hYmxlWFJheTogdHJ1ZSxcbiAgICBsb2dSZXRlbnRpb25EYXlzOiAzMCxcbiAgICBjb3N0Q2VudGVyOiAncHJvZHVjdGlvbicsXG4gICAgdGFnczoge1xuICAgICAgRW52aXJvbm1lbnQ6ICdwcm9kdWN0aW9uJyxcbiAgICAgIENvc3RDZW50ZXI6ICdwcm9kdWN0aW9uJyxcbiAgICAgIFByb2plY3Q6ICdzY2FmZm9sZCcsXG4gICAgfSxcbiAgfSxcbn07XG5cbi8qKlxuICogR2V0IGVudmlyb25tZW50IGNvbmZpZ3VyYXRpb24gd2l0aCBkZWZhdWx0c1xuICovXG5leHBvcnQgZnVuY3Rpb24gZ2V0RW52aXJvbm1lbnRDb25maWdGcm9tQ29udGV4dChcbiAgc2NvcGU6IENvbnN0cnVjdCxcbiAgZW52aXJvbm1lbnQ6IHN0cmluZ1xuKTogRW52aXJvbm1lbnRDb25maWcge1xuICBjb25zdCBjb250ZXh0Q29uZmlnID0gc2NvcGUubm9kZS50cnlHZXRDb250ZXh0KGVudmlyb25tZW50KSB8fCB7fTtcbiAgY29uc3QgZGVmYXVsdENvbmZpZyA9IERFRkFVTFRfRU5WSVJPTk1FTlRTW2Vudmlyb25tZW50XSB8fCBERUZBVUxUX0VOVklST05NRU5UUy5kZXY7XG5cbiAgcmV0dXJuIHtcbiAgICAuLi5kZWZhdWx0Q29uZmlnLFxuICAgIC4uLmNvbnRleHRDb25maWcsXG4gICAgZW52aXJvbm1lbnQsXG4gIH07XG59XG5cbi8qKlxuICogVmFsaWRhdGUgZW52aXJvbm1lbnQgY29uZmlndXJhdGlvblxuICovXG5leHBvcnQgZnVuY3Rpb24gdmFsaWRhdGVFbnZpcm9ubWVudENvbmZpZyhcbiAgY29uZmlnOiBFbnZpcm9ubWVudENvbmZpZ1xuKTogdm9pZCB7XG4gIGNvbnN0IGVycm9yczogc3RyaW5nW10gPSBbXTtcblxuICBpZiAoIWNvbmZpZy5lbnZpcm9ubWVudCkge1xuICAgIGVycm9ycy5wdXNoKCdFbnZpcm9ubWVudCBpcyByZXF1aXJlZCcpO1xuICB9XG5cbiAgaWYgKCFjb25maWcudnBjQ2lkcikge1xuICAgIGVycm9ycy5wdXNoKCdWUEMgQ0lEUiBpcyByZXF1aXJlZCcpO1xuICB9XG5cbiAgaWYgKGNvbmZpZy5tYXhBenMgPCAxIHx8IGNvbmZpZy5tYXhBenMgPiA2KSB7XG4gICAgZXJyb3JzLnB1c2goJ01heCBBWnMgbXVzdCBiZSBiZXR3ZWVuIDEgYW5kIDYnKTtcbiAgfVxuXG4gIGlmIChjb25maWcubmF0R2F0ZXdheXMgPCAxIHx8IGNvbmZpZy5uYXRHYXRld2F5cyA+IGNvbmZpZy5tYXhBenMpIHtcbiAgICBlcnJvcnMucHVzaCgnTkFUIGdhdGV3YXlzIG11c3QgYmUgYmV0d2VlbiAxIGFuZCBtYXggQVpzJyk7XG4gIH1cblxuICBpZiAoY29uZmlnLmRlc2lyZWRDb3VudCA8IDEpIHtcbiAgICBlcnJvcnMucHVzaCgnRGVzaXJlZCBjb3VudCBtdXN0IGJlIGF0IGxlYXN0IDEnKTtcbiAgfVxuXG4gIGlmIChjb25maWcuYXV0b1NjYWxpbmdNYXhDYXBhY2l0eSA8IGNvbmZpZy5kZXNpcmVkQ291bnQpIHtcbiAgICBlcnJvcnMucHVzaCgnTWF4IGNhcGFjaXR5IG11c3QgYmUgYXQgbGVhc3QgZGVzaXJlZCBjb3VudCcpO1xuICB9XG5cbiAgaWYgKGVycm9ycy5sZW5ndGggPiAwKSB7XG4gICAgdGhyb3cgbmV3IEVycm9yKGBFbnZpcm9ubWVudCBjb25maWd1cmF0aW9uIHZhbGlkYXRpb24gZmFpbGVkOlxcbiR7ZXJyb3JzLmpvaW4oJ1xcbicpfWApO1xuICB9XG59XG5cbi8qKlxuICogQ3JlYXRlIENESyBjb250ZXh0IGZvciBhbiBlbnZpcm9ubWVudFxuICovXG5leHBvcnQgZnVuY3Rpb24gY3JlYXRlQ2RrQ29udGV4dChcbiAgZW52aXJvbm1lbnQ6IHN0cmluZyxcbiAgY29uZmlnOiBFbnZpcm9ubWVudENvbmZpZ1xuKTogeyBba2V5OiBzdHJpbmddOiBhbnkgfSB7XG4gIHJldHVybiB7XG4gICAgZW52aXJvbm1lbnQsXG4gICAgW2Vudmlyb25tZW50XTogY29uZmlnLFxuICB9O1xufVxuXG4vKipcbiAqIEdldCByZXNvdXJjZSBuYW1pbmcgY29udmVudGlvblxuICovXG5leHBvcnQgZnVuY3Rpb24gZ2V0UmVzb3VyY2VOYW1lKFxuICBiYXNlTmFtZTogc3RyaW5nLFxuICBlbnZpcm9ubWVudDogc3RyaW5nLFxuICByZXNvdXJjZVR5cGU6IHN0cmluZ1xuKTogc3RyaW5nIHtcbiAgcmV0dXJuIGAke2Jhc2VOYW1lfS0ke2Vudmlyb25tZW50fS0ke3Jlc291cmNlVHlwZX1gO1xufVxuXG4vKipcbiAqIEdldCBjb3N0IGFsbG9jYXRpb24gdGFnc1xuICovXG5leHBvcnQgZnVuY3Rpb24gZ2V0Q29zdEFsbG9jYXRpb25UYWdzKFxuICBwcm9qZWN0OiBzdHJpbmcsXG4gIGVudmlyb25tZW50OiBzdHJpbmcsXG4gIGNvc3RDZW50ZXI6IHN0cmluZ1xuKTogeyBba2V5OiBzdHJpbmddOiBzdHJpbmcgfSB7XG4gIHJldHVybiB7XG4gICAgUHJvamVjdDogcHJvamVjdCxcbiAgICBFbnZpcm9ubWVudDogZW52aXJvbm1lbnQsXG4gICAgQ29zdENlbnRlcjogY29zdENlbnRlcixcbiAgICBNYW5hZ2VkQnk6ICdDREsnLFxuICAgIENyZWF0ZWRCeTogJ2Nkay1mYXJnYXRlLXNjYWZmb2xkJyxcbiAgfTtcbn1cblxuLyoqXG4gKiBQYXJzZSBlbnZpcm9ubWVudCB2YXJpYWJsZXMgd2l0aCBkZWZhdWx0c1xuICovXG5leHBvcnQgZnVuY3Rpb24gcGFyc2VFbnZpcm9ubWVudFZhcmlhYmxlcyhcbiAgZW52OiB7IFtrZXk6IHN0cmluZ106IHN0cmluZyB8IHVuZGVmaW5lZCB9LFxuICBkZWZhdWx0czogeyBba2V5OiBzdHJpbmddOiBzdHJpbmcgfVxuKTogeyBba2V5OiBzdHJpbmddOiBzdHJpbmcgfSB7XG4gIGNvbnN0IHJlc3VsdDogeyBba2V5OiBzdHJpbmddOiBzdHJpbmcgfSA9IHt9O1xuXG4gIE9iamVjdC5lbnRyaWVzKGRlZmF1bHRzKS5mb3JFYWNoKChba2V5LCBkZWZhdWx0VmFsdWVdKSA9PiB7XG4gICAgcmVzdWx0W2tleV0gPSBlbnZba2V5XSB8fCBkZWZhdWx0VmFsdWU7XG4gIH0pO1xuXG4gIHJldHVybiByZXN1bHQ7XG59XG5cbi8qKlxuICogR2V0IEZhcmdhdGUgcmVzb3VyY2UgbGltaXRzXG4gKi9cbmV4cG9ydCBmdW5jdGlvbiBnZXRGYXJnYXRlUmVzb3VyY2VMaW1pdHMoKToge1xuICBjcHU6IHsgbWluOiBudW1iZXI7IG1heDogbnVtYmVyOyB2YWxpZDogbnVtYmVyW10gfTtcbiAgbWVtb3J5OiB7IG1pbjogbnVtYmVyOyBtYXg6IG51bWJlcjsgdmFsaWQ6IG51bWJlcltdIH07XG59IHtcbiAgcmV0dXJuIHtcbiAgICBjcHU6IHtcbiAgICAgIG1pbjogMjU2LFxuICAgICAgbWF4OiA0MDk2LFxuICAgICAgdmFsaWQ6IFsyNTYsIDUxMiwgMTAyNCwgMjA0OCwgNDA5Nl0sXG4gICAgfSxcbiAgICBtZW1vcnk6IHtcbiAgICAgIG1pbjogNTEyLFxuICAgICAgbWF4OiA4MTkyLFxuICAgICAgdmFsaWQ6IFs1MTIsIDEwMjQsIDIwNDgsIDMwNzIsIDQwOTYsIDUxMjAsIDYxNDQsIDcxNjgsIDgxOTJdLFxuICAgIH0sXG4gIH07XG59XG5cbi8qKlxuICogVmFsaWRhdGUgRmFyZ2F0ZSByZXNvdXJjZSBjb25maWd1cmF0aW9uXG4gKi9cbmV4cG9ydCBmdW5jdGlvbiB2YWxpZGF0ZUZhcmdhdGVSZXNvdXJjZXMoXG4gIGNwdTogbnVtYmVyLFxuICBtZW1vcnk6IG51bWJlclxuKTogdm9pZCB7XG4gIGNvbnN0IGxpbWl0cyA9IGdldEZhcmdhdGVSZXNvdXJjZUxpbWl0cygpO1xuXG4gIGlmICghbGltaXRzLmNwdS52YWxpZC5pbmNsdWRlcyhjcHUpKSB7XG4gICAgdGhyb3cgbmV3IEVycm9yKFxuICAgICAgYEludmFsaWQgQ1BVIHZhbHVlOiAke2NwdX0uIFZhbGlkIHZhbHVlczogJHtsaW1pdHMuY3B1LnZhbGlkLmpvaW4oJywgJyl9YFxuICAgICk7XG4gIH1cblxuICBpZiAoIWxpbWl0cy5tZW1vcnkudmFsaWQuaW5jbHVkZXMobWVtb3J5KSkge1xuICAgIHRocm93IG5ldyBFcnJvcihcbiAgICAgIGBJbnZhbGlkIG1lbW9yeSB2YWx1ZTogJHttZW1vcnl9LiBWYWxpZCB2YWx1ZXM6ICR7bGltaXRzLm1lbW9yeS52YWxpZC5qb2luKCcsICcpfWBcbiAgICApO1xuICB9XG5cbiAgLy8gVmFsaWRhdGUgQ1BVIHRvIG1lbW9yeSByYXRpb1xuICBjb25zdCByYXRpbyA9IG1lbW9yeSAvIGNwdTtcbiAgaWYgKHJhdGlvIDwgMSB8fCByYXRpbyA+IDQpIHtcbiAgICB0aHJvdyBuZXcgRXJyb3IoXG4gICAgICBgSW52YWxpZCBDUFUgdG8gbWVtb3J5IHJhdGlvOiAke3JhdGlvLnRvRml4ZWQoMil9LiBNdXN0IGJlIGJldHdlZW4gMToxIGFuZCAxOjRgXG4gICAgKTtcbiAgfVxufVxuIl19