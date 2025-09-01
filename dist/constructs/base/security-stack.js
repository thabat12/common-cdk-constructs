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
exports.SecurityStack = void 0;
const cdk = __importStar(require("aws-cdk-lib"));
const iam = __importStar(require("aws-cdk-lib/aws-iam"));
const ec2 = __importStar(require("aws-cdk-lib/aws-ec2"));
const kms = __importStar(require("aws-cdk-lib/aws-kms"));
class SecurityStack extends cdk.Stack {
    constructor(scope, id, props) {
        super(scope, id, props);
        this.vpc = props.vpc;
        const enableKms = props.enableKms ?? true;
        const createDefaultSecurityGroups = props.createDefaultSecurityGroups ?? true;
        // Create KMS key for encryption if enabled
        if (enableKms) {
            this.kmsKey = new kms.Key(this, 'EncryptionKey', {
                alias: `${props.appName}-${props.environment}-key`,
                description: `Encryption key for ${props.appName} ${props.environment} environment`,
                enableKeyRotation: true,
                pendingWindow: cdk.Duration.days(7),
                removalPolicy: cdk.RemovalPolicy.DESTROY,
            });
            // Add key policy for CloudWatch logs
            this.kmsKey.addToResourcePolicy(new iam.PolicyStatement({
                effect: iam.Effect.ALLOW,
                principals: [new iam.ServicePrincipal('logs.amazonaws.com')],
                actions: ['kms:Decrypt', 'kms:GenerateDataKey'],
                resources: ['*'],
                conditions: {
                    StringEquals: {
                        'kms:ViaService': `logs.${cdk.Stack.of(this).region}.amazonaws.com`,
                    },
                },
            }));
        }
        // Create default security group if enabled
        if (createDefaultSecurityGroups) {
            this.defaultSecurityGroup = new ec2.SecurityGroup(this, 'DefaultSecurityGroup', {
                vpc: props.vpc,
                description: `Default security group for ${props.appName}`,
                allowAllOutbound: true,
            });
            // Allow HTTP and HTTPS from anywhere (can be restricted later)
            this.defaultSecurityGroup.addIngressRule(ec2.Peer.anyIpv4(), ec2.Port.tcp(80), 'Allow HTTP traffic');
            this.defaultSecurityGroup.addIngressRule(ec2.Peer.anyIpv4(), ec2.Port.tcp(443), 'Allow HTTPS traffic');
            // Allow SSH from VPC CIDR (for debugging)
            this.defaultSecurityGroup.addIngressRule(ec2.Peer.ipv4(props.vpc.vpcCidrBlock), ec2.Port.tcp(22), 'Allow SSH from VPC');
        }
        // Create application role
        this.appRole = new iam.Role(this, 'AppRole', {
            roleName: `${props.appName}-${props.environment}-app-role`,
            assumedBy: new iam.ServicePrincipal('ecs-tasks.amazonaws.com'),
            description: `Application role for ${props.appName} ${props.environment}`,
        });
        // Create execution role
        this.executionRole = new iam.Role(this, 'ExecutionRole', {
            roleName: `${props.appName}-${props.environment}-execution-role`,
            assumedBy: new iam.ServicePrincipal('ecs-tasks.amazonaws.com'),
            description: `Execution role for ${props.appName} ${props.environment}`,
            managedPolicies: [
                iam.ManagedPolicy.fromAwsManagedPolicyName('service-role/AmazonECSTaskExecutionRolePolicy'),
            ],
        });
        // Grant basic permissions to app role
        this.appRole?.addToPolicy(new iam.PolicyStatement({
            effect: iam.Effect.ALLOW,
            actions: [
                'logs:CreateLogGroup',
                'logs:CreateLogStream',
                'logs:PutLogEvents',
                'logs:DescribeLogStreams',
            ],
            resources: ['*'],
        }));
        // Grant KMS permissions if key exists
        if (this.kmsKey) {
            this.appRole?.addToPolicy(new iam.PolicyStatement({
                effect: iam.Effect.ALLOW,
                actions: [
                    'kms:Decrypt',
                    'kms:GenerateDataKey',
                    'kms:DescribeKey',
                ],
                resources: [this.kmsKey.keyArn],
            }));
            this.executionRole?.addToPolicy(new iam.PolicyStatement({
                effect: iam.Effect.ALLOW,
                actions: [
                    'kms:Decrypt',
                    'kms:GenerateDataKey',
                    'kms:DescribeKey',
                ],
                resources: [this.kmsKey.keyArn],
            }));
        }
        // Add tags
        if (props.tags) {
            Object.entries(props.tags).forEach(([key, value]) => {
                cdk.Tags.of(this).add(key, value);
            });
        }
        // Add default tags
        cdk.Tags.of(this).add('Name', `${props.appName}-${props.environment}-security`);
        cdk.Tags.of(this).add('Purpose', 'Security Infrastructure');
        cdk.Tags.of(this).add('ManagedBy', 'CDK');
        // Outputs
        if (this.kmsKey) {
            new cdk.CfnOutput(this, 'KMSKeyId', {
                value: this.kmsKey.keyId,
                description: 'KMS Key ID',
                exportName: `${props.appName}-${props.environment}-KMSKeyId`,
            });
            new cdk.CfnOutput(this, 'KMSKeyArn', {
                value: this.kmsKey.keyArn,
                description: 'KMS Key ARN',
                exportName: `${props.appName}-${props.environment}-KMSKeyArn`,
            });
        }
        if (this.defaultSecurityGroup) {
            new cdk.CfnOutput(this, 'DefaultSecurityGroupId', {
                value: this.defaultSecurityGroup.securityGroupId,
                description: 'Default Security Group ID',
                exportName: `${props.appName}-${props.environment}-DefaultSecurityGroupId`,
            });
        }
        if (this.appRole) {
            new cdk.CfnOutput(this, 'AppRoleArn', {
                value: this.appRole.roleArn,
                description: 'Application Role ARN',
                exportName: `${props.appName}-${props.environment}-AppRoleArn`,
            });
        }
        if (this.executionRole) {
            new cdk.CfnOutput(this, 'ExecutionRoleArn', {
                value: this.executionRole.roleArn,
                description: 'Execution Role ARN',
                exportName: `${props.appName}-${props.environment}-ExecutionRoleArn`,
            });
        }
    }
    /**
     * Grant additional permissions to the application role
     */
    grantAppRole(permissions) {
        this.appRole?.addToPolicy(permissions);
    }
    /**
     * Grant additional permissions to the execution role
     */
    grantExecutionRole(permissions) {
        this.executionRole?.addToPolicy(permissions);
    }
    /**
     * Create a custom security group
     */
    createSecurityGroup(id, description, allowHttp = true, allowHttps = true, allowSsh = false) {
        const securityGroup = new ec2.SecurityGroup(this, id, {
            vpc: this.vpc,
            description,
            allowAllOutbound: true,
        });
        if (allowHttp) {
            securityGroup.addIngressRule(ec2.Peer.anyIpv4(), ec2.Port.tcp(80), 'Allow HTTP traffic');
        }
        if (allowHttps) {
            securityGroup.addIngressRule(ec2.Peer.anyIpv4(), ec2.Port.tcp(443), 'Allow HTTPS traffic');
        }
        if (allowSsh) {
            securityGroup.addIngressRule(ec2.Peer.ipv4(this.vpc.vpcCidrBlock), ec2.Port.tcp(22), 'Allow SSH from VPC');
        }
        return securityGroup;
    }
}
exports.SecurityStack = SecurityStack;
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoic2VjdXJpdHktc3RhY2suanMiLCJzb3VyY2VSb290IjoiIiwic291cmNlcyI6WyIuLi8uLi8uLi9zcmMvY29uc3RydWN0cy9iYXNlL3NlY3VyaXR5LXN0YWNrLnRzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiI7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7O0FBQUEsaURBQW1DO0FBQ25DLHlEQUEyQztBQUMzQyx5REFBMkM7QUFDM0MseURBQTJDO0FBc0MzQyxNQUFhLGFBQWMsU0FBUSxHQUFHLENBQUMsS0FBSztJQU8xQyxZQUFZLEtBQWdCLEVBQUUsRUFBVSxFQUFFLEtBQXlCO1FBQ2pFLEtBQUssQ0FBQyxLQUFLLEVBQUUsRUFBRSxFQUFFLEtBQUssQ0FBQyxDQUFDO1FBRXhCLElBQUksQ0FBQyxHQUFHLEdBQUcsS0FBSyxDQUFDLEdBQUcsQ0FBQztRQUNyQixNQUFNLFNBQVMsR0FBRyxLQUFLLENBQUMsU0FBUyxJQUFJLElBQUksQ0FBQztRQUMxQyxNQUFNLDJCQUEyQixHQUFHLEtBQUssQ0FBQywyQkFBMkIsSUFBSSxJQUFJLENBQUM7UUFFOUUsMkNBQTJDO1FBQzNDLElBQUksU0FBUyxFQUFFO1lBQ2IsSUFBSSxDQUFDLE1BQU0sR0FBRyxJQUFJLEdBQUcsQ0FBQyxHQUFHLENBQUMsSUFBSSxFQUFFLGVBQWUsRUFBRTtnQkFDL0MsS0FBSyxFQUFFLEdBQUcsS0FBSyxDQUFDLE9BQU8sSUFBSSxLQUFLLENBQUMsV0FBVyxNQUFNO2dCQUNsRCxXQUFXLEVBQUUsc0JBQXNCLEtBQUssQ0FBQyxPQUFPLElBQUksS0FBSyxDQUFDLFdBQVcsY0FBYztnQkFDbkYsaUJBQWlCLEVBQUUsSUFBSTtnQkFDdkIsYUFBYSxFQUFFLEdBQUcsQ0FBQyxRQUFRLENBQUMsSUFBSSxDQUFDLENBQUMsQ0FBQztnQkFDbkMsYUFBYSxFQUFFLEdBQUcsQ0FBQyxhQUFhLENBQUMsT0FBTzthQUN6QyxDQUFDLENBQUM7WUFFSCxxQ0FBcUM7WUFDckMsSUFBSSxDQUFDLE1BQU0sQ0FB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QWEsQ0FBQyxJQUFJLEVBQUUsRUFBRSxFQUFFO1lBQ3BELEdBQUcsRUFBRSxJQUFJLENBQUMsR0FBRztZQUNiLFdBQVc7WUFDWCxnQkFBZ0IsRUFBRSxJQUFJO1NBQ3ZCLENBQUMsQ0FBQztRQUVILElBQUksU0FBUyxFQUFFO1lBQ2IsYUFBYSxDQUFDLGNBQWMsQ0FDMUIsR0FBRyxDQUFDLElBQUksQ0FBQyxPQUFPLEVBQUUsRUFDbEIsR0FBRyxDQUFDLElBQUksQ0FBQyxHQUFHLENBQUMsRUFBRSxDQUFDLEVBQ2hCLG9CQUFvQixDQUNyQixDQUFDO1NBQ0g7UUFFRCxJQUFJLFVBQVUsRUFBRTtZQUNkLGFBQWEsQ0FBQyxjQUFjLENBQzFCLEdBQUcsQ0FBQyxJQUFJLENBQUMsT0FBTyxFQUFFLEVBQ2xCLEdBQUcsQ0FBQyxJQUFJLENBQUMsR0FBRyxDQUFDLEdBQUcsQ0FBQyxFQUNqQixxQkFBcUIsQ0FDdEIsQ0FBQztTQUNIO1FBRUQsSUFBSSxRQUFRLEVBQUU7WUFDWixhQUFhLENBQUMsY0FBYyxDQUMxQixHQUFHLENBQUMsSUFBSSxDQUFDLElBQUksQ0FBQyxJQUFJLENBQUMsR0FBRyxDQUFDLFlBQVksQ0FBQyxFQUNwQyxHQUFHLENBQUMsSUFBSSxDQUFDLEdBQUcsQ0FBQyxFQUFFLENBQUMsRUFDaEIsb0JBQW9CLENBQ3JCLENBQUM7U0FDSDtRQUVELE9BQU8sYUFBYSxDQUFDO0lBQ3ZCLENBQUM7Q0FDRjtBQTNPRCxzQ0EyT0MiLCJzb3VyY2VzQ29udGVudCI6WyJpbXBvcnQgKiBhcyBjZGsgZnJvbSAnYXdzLWNkay1saWInO1xuaW1wb3J0ICogYXMgaWFtIGZyb20gJ2F3cy1jZGstbGliL2F3cy1pYW0nO1xuaW1wb3J0ICogYXMgZWMyIGZyb20gJ2F3cy1jZGstbGliL2F3cy1lYzInO1xuaW1wb3J0ICogYXMga21zIGZyb20gJ2F3cy1jZGstbGliL2F3cy1rbXMnO1xuaW1wb3J0ICogYXMgc2VjcmV0c21hbmFnZXIgZnJvbSAnYXdzLWNkay1saWIvYXdzLXNlY3JldHNtYW5hZ2VyJztcbmltcG9ydCB7IENvbnN0cnVjdCB9IGZyb20gJ2NvbnN0cnVjdHMnO1xuXG5leHBvcnQgaW50ZXJmYWNlIFNlY3VyaXR5U3RhY2tQcm9wcyBleHRlbmRzIGNkay5TdGFja1Byb3BzIHtcbiAgLyoqXG4gICAqIFRoZSBWUEMgd2hlcmUgc2VjdXJpdHkgcmVzb3VyY2VzIHdpbGwgYmUgY3JlYXRlZFxuICAgKi9cbiAgdnBjOiBlYzIuSVZwYztcbiAgXG4gIC8qKlxuICAgKiBBcHBsaWNhdGlvbiBuYW1lIGZvciByZXNvdXJjZSBuYW1pbmdcbiAgICovXG4gIGFwcE5hbWU6IHN0cmluZztcbiAgXG4gIC8qKlxuICAgKiBFbnZpcm9ubWVudCBuYW1lXG4gICAqL1xuICBlbnZpcm9ubWVudDogc3RyaW5nO1xuICBcbiAgLyoqXG4gICAqIFdoZXRoZXIgdG8gZW5hYmxlIEtNUyBlbmNyeXB0aW9uXG4gICAqIEBkZWZhdWx0IHRydWVcbiAgICovXG4gIGVuYWJsZUttcz86IGJvb2xlYW47XG4gIFxuICAvKipcbiAgICogV2hldGhlciB0byBjcmVhdGUgZGVmYXVsdCBzZWN1cml0eSBncm91cHNcbiAgICogQGRlZmF1bHQgdHJ1ZVxuICAgKi9cbiAgY3JlYXRlRGVmYXVsdFNlY3VyaXR5R3JvdXBzPzogYm9vbGVhbjtcbiAgXG4gIC8qKlxuICAgKiBUYWdzIHRvIGFwcGx5IHRvIHJlc291cmNlc1xuICAgKi9cbiAgdGFncz86IHsgW2tleTogc3RyaW5nXTogc3RyaW5nIH07XG59XG5cbmV4cG9ydCBjbGFzcyBTZWN1cml0eVN0YWNrIGV4dGVuZHMgY2RrLlN0YWNrIHtcbiAgcHVibGljIHJlYWRvbmx5IGttc0tleT86IGttcy5LZXk7XG4gIHB1YmxpYyByZWFkb25seSBkZWZhdWx0U2VjdXJpdHlHcm91cD86IGVjMi5TZWN1cml0eUdyb3VwO1xuICBwdWJsaWMgcmVhZG9ubHkgYXBwUm9sZT86IGlhbS5Sb2xlO1xuICBwdWJsaWMgcmVhZG9ubHkgZXhlY3V0aW9uUm9sZT86IGlhbS5Sb2xlO1xuICBwdWJsaWMgcmVhZG9ubHkgdnBjOiBlYzIuSVZwYztcblxuICBjb25zdHJ1Y3RvcihzY29wZTogQ29uc3RydWN0LCBpZDogc3RyaW5nLCBwcm9wczogU2VjdXJpdHlTdGFja1Byb3BzKSB7XG4gICAgc3VwZXIoc2NvcGUsIGlkLCBwcm9wcyk7XG5cbiAgICB0aGlzLnZwYyA9IHByb3BzLnZwYztcbiAgICBjb25zdCBlbmFibGVLbXMgPSBwcm9wcy5lbmFibGVLbXMgPz8gdHJ1ZTtcbiAgICBjb25zdCBjcmVhdGVEZWZhdWx0U2VjdXJpdHlHcm91cHMgPSBwcm9wcy5jcmVhdGVEZWZhdWx0U2VjdXJpdHlHcm91cHMgPz8gdHJ1ZTtcblxuICAgIC8vIENyZWF0ZSBLTVMga2V5IGZvciBlbmNyeXB0aW9uIGlmIGVuYWJsZWRcbiAgICBpZiAoZW5hYmxlS21zKSB7XG4gICAgICB0aGlzLmttc0tleSA9IG5ldyBrbXMuS2V5KHRoaXMsICdFbmNyeXB0aW9uS2V5Jywge1xuICAgICAgICBhbGlhczogYCR7cHJvcHMuYXBwTmFtZX0tJHtwcm9wcy5lbnZpcm9ubWVudH0ta2V5YCxcbiAgICAgICAgZGVzY3JpcHRpb246IGBFbmNyeXB0aW9uIGtleSBmb3IgJHtwcm9wcy5hcHBOYW1lfSAke3Byb3BzLmVudmlyb25tZW50fSBlbnZpcm9ubWVudGAsXG4gICAgICAgIGVuYWJsZUtleVJvdGF0aW9uOiB0cnVlLFxuICAgICAgICBwZW5kaW5nV2luZG93OiBjZGsuRHVyYXRpb24uZGF5cyg3KSxcbiAgICAgICAgcmVtb3ZhbFBvbGljeTogY2RrLlJlbW92YWxQb2xpY3kuREVTVFJPWSxcbiAgICAgIH0pO1xuXG4gICAgICAvLyBBZGQga2V5IHBvbGljeSBmb3IgQ2xvdWRXYXRjaCBsb2dzXG4gICAgICB0aGlzLmttc0tleS5hZGRUb1Jlc291cmNlUG9saWN5KFxuICAgICAgICBuZXcgaWFtLlBvbGljeVN0YXRlbWVudCh7XG4gICAgICAgICAgZWZmZWN0OiBpYW0uRWZmZWN0LkFMTE9XLFxuICAgICAgICAgIHByaW5jaXBhbHM6IFtuZXcgaWFtLlNlcnZpY2VQcmluY2lwYWwoJ2xvZ3MuYW1hem9uYXdzLmNvbScpXSxcbiAgICAgICAgICBhY3Rpb25zOiBbJ2ttczpEZWNyeXB0JywgJ2ttczpHZW5lcmF0ZURhdGFLZXknXSxcbiAgICAgICAgICByZXNvdXJjZXM6IFsnKiddLFxuICAgICAgICAgIGNvbmRpdGlvbnM6IHtcbiAgICAgICAgICAgIFN0cmluZ0VxdWFsczoge1xuICAgICAgICAgICAgICAna21zOlZpYVNlcnZpY2UnOiBgbG9ncy4ke2Nkay5TdGFjay5vZih0aGlzKS5yZWdpb259LmFtYXpvbmF3cy5jb21gLFxuICAgICAgICAgICAgfSxcbiAgICAgICAgICB9LFxuICAgICAgICB9KVxuICAgICAgKTtcbiAgICB9XG5cbiAgICAvLyBDcmVhdGUgZGVmYXVsdCBzZWN1cml0eSBncm91cCBpZiBlbmFibGVkXG4gICAgaWYgKGNyZWF0ZURlZmF1bHRTZWN1cml0eUdyb3Vwcykge1xuICAgICAgdGhpcy5kZWZhdWx0U2VjdXJpdHlHcm91cCA9IG5ldyBlYzIuU2VjdXJpdHlHcm91cCh0aGlzLCAnRGVmYXVsdFNlY3VyaXR5R3JvdXAnLCB7XG4gICAgICAgIHZwYzogcHJvcHMudnBjLFxuICAgICAgICBkZXNjcmlwdGlvbjogYERlZmF1bHQgc2VjdXJpdHkgZ3JvdXAgZm9yICR7cHJvcHMuYXBwTmFtZX1gLFxuICAgICAgICBhbGxvd0FsbE91dGJvdW5kOiB0cnVlLFxuICAgICAgfSk7XG5cbiAgICAgIC8vIEFsbG93IEhUVFAgYW5kIEhUVFBTIGZyb20gYW55d2hlcmUgKGNhbiBiZSByZXN0cmljdGVkIGxhdGVyKVxuICAgICAgdGhpcy5kZWZhdWx0U2VjdXJpdHlHcm91cC5hZGRJbmdyZXNzUnVsZShcbiAgICAgICAgZWMyLlBlZXIuYW55SXB2NCgpLFxuICAgICAgICBlYzIuUG9ydC50Y3AoODApLFxuICAgICAgICAnQWxsb3cgSFRUUCB0cmFmZmljJ1xuICAgICAgKTtcblxuICAgICAgdGhpcy5kZWZhdWx0U2VjdXJpdHlHcm91cC5hZGRJbmdyZXNzUnVsZShcbiAgICAgICAgZWMyLlBlZXIuYW55SXB2NCgpLFxuICAgICAgICBlYzIuUG9ydC50Y3AoNDQzKSxcbiAgICAgICAgJ0FsbG93IEhUVFBTIHRyYWZmaWMnXG4gICAgICApO1xuXG4gICAgICAvLyBBbGxvdyBTU0ggZnJvbSBWUEMgQ0lEUiAoZm9yIGRlYnVnZ2luZylcbiAgICAgIHRoaXMuZGVmYXVsdFNlY3VyaXR5R3JvdXAuYWRkSW5ncmVzc1J1bGUoXG4gICAgICAgIGVjMi5QZWVyLmlwdjQocHJvcHMudnBjLnZwY0NpZHJCbG9jayksXG4gICAgICAgIGVjMi5Qb3J0LnRjcCgyMiksXG4gICAgICAgICdBbGxvdyBTU0ggZnJvbSBWUEMnXG4gICAgICApO1xuICAgIH1cblxuICAgIC8vIENyZWF0ZSBhcHBsaWNhdGlvbiByb2xlXG4gICAgdGhpcy5hcHBSb2xlID0gbmV3IGlhbS5Sb2xlKHRoaXMsICdBcHBSb2xlJywge1xuICAgICAgcm9sZU5hbWU6IGAke3Byb3BzLmFwcE5hbWV9LSR7cHJvcHMuZW52aXJvbm1lbnR9LWFwcC1yb2xlYCxcbiAgICAgIGFzc3VtZWRCeTogbmV3IGlhbS5TZXJ2aWNlUHJpbmNpcGFsKCdlY3MtdGFza3MuYW1hem9uYXdzLmNvbScpLFxuICAgICAgZGVzY3JpcHRpb246IGBBcHBsaWNhdGlvbiByb2xlIGZvciAke3Byb3BzLmFwcE5hbWV9ICR7cHJvcHMuZW52aXJvbm1lbnR9YCxcbiAgICB9KTtcblxuICAgIC8vIENyZWF0ZSBleGVjdXRpb24gcm9sZVxuICAgIHRoaXMuZXhlY3V0aW9uUm9sZSA9IG5ldyBpYW0uUm9sZSh0aGlzLCAnRXhlY3V0aW9uUm9sZScsIHtcbiAgICAgIHJvbGVOYW1lOiBgJHtwcm9wcy5hcHBOYW1lfS0ke3Byb3BzLmVudmlyb25tZW50fS1leGVjdXRpb24tcm9sZWAsXG4gICAgICBhc3N1bWVkQnk6IG5ldyBpYW0uU2VydmljZVByaW5jaXBhbCgnZWNzLXRhc2tzLmFtYXpvbmF3cy5jb20nKSxcbiAgICAgIGRlc2NyaXB0aW9uOiBgRXhlY3V0aW9uIHJvbGUgZm9yICR7cHJvcHMuYXBwTmFtZX0gJHtwcm9wcy5lbnZpcm9ubWVudH1gLFxuICAgICAgbWFuYWdlZFBvbGljaWVzOiBbXG4gICAgICAgIGlhbS5NYW5hZ2VkUG9saWN5LmZyb21Bd3NNYW5hZ2VkUG9saWN5TmFtZSgnc2VydmljZS1yb2xlL0FtYXpvbkVDU1Rhc2tFeGVjdXRpb25Sb2xlUG9saWN5JyksXG4gICAgICBdLFxuICAgIH0pO1xuXG4gICAgLy8gR3JhbnQgYmFzaWMgcGVybWlzc2lvbnMgdG8gYXBwIHJvbGVcbiAgICB0aGlzLmFwcFJvbGU/LmFkZFRvUG9saWN5KFxuICAgICAgbmV3IGlhbS5Qb2xpY3lTdGF0ZW1lbnQoe1xuICAgICAgICBlZmZlY3Q6IGlhbS5FZmZlY3QuQUxMT1csXG4gICAgICAgIGFjdGlvbnM6IFtcbiAgICAgICAgICAnbG9nczpDcmVhdGVMb2dHcm91cCcsXG4gICAgICAgICAgJ2xvZ3M6Q3JlYXRlTG9nU3RyZWFtJyxcbiAgICAgICAgICAnbG9nczpQdXRMb2dFdmVudHMnLFxuICAgICAgICAgICdsb2dzOkRlc2NyaWJlTG9nU3RyZWFtcycsXG4gICAgICAgIF0sXG4gICAgICAgIHJlc291cmNlczogWycqJ10sXG4gICAgICB9KVxuICAgICk7XG5cbiAgICAvLyBHcmFudCBLTVMgcGVybWlzc2lvbnMgaWYga2V5IGV4aXN0c1xuICAgIGlmICh0aGlzLmttc0tleSkge1xuICAgICAgdGhpcy5hcHBSb2xlPy5hZGRUb1BvbGljeShcbiAgICAgICAgbmV3IGlhbS5Qb2xpY3lTdGF0ZW1lbnQoe1xuICAgICAgICAgIGVmZmVjdDogaWFtLkVmZmVjdC5BTExPVyxcbiAgICAgICAgICBhY3Rpb25zOiBbXG4gICAgICAgICAgICAna21zOkRlY3J5cHQnLFxuICAgICAgICAgICAgJ2ttczpHZW5lcmF0ZURhdGFLZXknLFxuICAgICAgICAgICAgJ2ttczpEZXNjcmliZUtleScsXG4gICAgICAgICAgXSxcbiAgICAgICAgICByZXNvdXJjZXM6IFt0aGlzLmttc0tleS5rZXlBcm5dLFxuICAgICAgICB9KVxuICAgICAgKTtcblxuICAgICAgdGhpcy5leGVjdXRpb25Sb2xlPy5hZGRUb1BvbGljeShcbiAgICAgICAgbmV3IGlhbS5Qb2xpY3lTdGF0ZW1lbnQoe1xuICAgICAgICAgIGVmZmVjdDogaWFtLkVmZmVjdC5BTExPVyxcbiAgICAgICAgICBhY3Rpb25zOiBbXG4gICAgICAgICAgICAna21zOkRlY3J5cHQnLFxuICAgICAgICAgICAgJ2ttczpHZW5lcmF0ZURhdGFLZXknLFxuICAgICAgICAgICAgJ2ttczpEZXNjcmliZUtleScsXG4gICAgICAgICAgXSxcbiAgICAgICAgICByZXNvdXJjZXM6IFt0aGlzLmttc0tleS5rZXlBcm5dLFxuICAgICAgICB9KVxuICAgICAgKTtcbiAgICB9XG5cbiAgICAvLyBBZGQgdGFnc1xuICAgIGlmIChwcm9wcy50YWdzKSB7XG4gICAgICBPYmplY3QuZW50cmllcyhwcm9wcy50YWdzKS5mb3JFYWNoKChba2V5LCB2YWx1ZV0pID0+IHtcbiAgICAgICAgY2RrLlRhZ3Mub2YodGhpcykuYWRkKGtleSwgdmFsdWUpO1xuICAgICAgfSk7XG4gICAgfVxuXG4gICAgLy8gQWRkIGRlZmF1bHQgdGFnc1xuICAgIGNkay5UYWdzLm9mKHRoaXMpLmFkZCgnTmFtZScsIGAke3Byb3BzLmFwcE5hbWV9LSR7cHJvcHMuZW52aXJvbm1lbnR9LXNlY3VyaXR5YCk7XG4gICAgY2RrLlRhZ3Mub2YodGhpcykuYWRkKCdQdXJwb3NlJywgJ1NlY3VyaXR5IEluZnJhc3RydWN0dXJlJyk7XG4gICAgY2RrLlRhZ3Mub2YodGhpcykuYWRkKCdNYW5hZ2VkQnknLCAnQ0RLJyk7XG5cbiAgICAvLyBPdXRwdXRzXG4gICAgaWYgKHRoaXMua21zS2V5KSB7XG4gICAgICBuZXcgY2RrLkNmbk91dHB1dCh0aGlzLCAnS01TS2V5SWQnLCB7XG4gICAgICAgIHZhbHVlOiB0aGlzLmttc0tleS5rZXlJZCxcbiAgICAgICAgZGVzY3JpcHRpb246ICdLTVMgS2V5IElEJyxcbiAgICAgICAgZXhwb3J0TmFtZTogYCR7cHJvcHMuYXBwTmFtZX0tJHtwcm9wcy5lbnZpcm9ubWVudH0tS01TS2V5SWRgLFxuICAgICAgfSk7XG5cbiAgICAgIG5ldyBjZGsuQ2ZuT3V0cHV0KHRoaXMsICdLTVNLZXlBcm4nLCB7XG4gICAgICAgIHZhbHVlOiB0aGlzLmttc0tleS5rZXlBcm4sXG4gICAgICAgIGRlc2NyaXB0aW9uOiAnS01TIEtleSBBUk4nLFxuICAgICAgICBleHBvcnROYW1lOiBgJHtwcm9wcy5hcHBOYW1lfS0ke3Byb3BzLmVudmlyb25tZW50fS1LTVNLZXlBcm5gLFxuICAgICAgfSk7XG4gICAgfVxuXG4gICAgaWYgKHRoaXMuZGVmYXVsdFNlY3VyaXR5R3JvdXApIHtcbiAgICAgIG5ldyBjZGsuQ2ZuT3V0cHV0KHRoaXMsICdEZWZhdWx0U2VjdXJpdHlHcm91cElkJywge1xuICAgICAgICB2YWx1ZTogdGhpcy5kZWZhdWx0U2VjdXJpdHlHcm91cC5zZWN1cml0eUdyb3VwSWQsXG4gICAgICAgIGRlc2NyaXB0aW9uOiAnRGVmYXVsdCBTZWN1cml0eSBHcm91cCBJRCcsXG4gICAgICAgIGV4cG9ydE5hbWU6IGAke3Byb3BzLmFwcE5hbWV9LSR7cHJvcHMuZW52aXJvbm1lbnR9LURlZmF1bHRTZWN1cml0eUdyb3VwSWRgLFxuICAgICAgfSk7XG4gICAgfVxuXG4gICAgaWYgKHRoaXMuYXBwUm9sZSkge1xuICAgICAgbmV3IGNkay5DZm5PdXRwdXQodGhpcywgJ0FwcFJvbGVBcm4nLCB7XG4gICAgICAgIHZhbHVlOiB0aGlzLmFwcFJvbGUucm9sZUFybixcbiAgICAgICAgZGVzY3JpcHRpb246ICdBcHBsaWNhdGlvbiBSb2xlIEFSTicsXG4gICAgICAgIGV4cG9ydE5hbWU6IGAke3Byb3BzLmFwcE5hbWV9LSR7cHJvcHMuZW52aXJvbm1lbnR9LUFwcFJvbGVBcm5gLFxuICAgICAgfSk7XG4gICAgfVxuXG4gICAgaWYgKHRoaXMuZXhlY3V0aW9uUm9sZSkge1xuICAgICAgbmV3IGNkay5DZm5PdXRwdXQodGhpcywgJ0V4ZWN1dGlvblJvbGVBcm4nLCB7XG4gICAgICAgIHZhbHVlOiB0aGlzLmV4ZWN1dGlvblJvbGUucm9sZUFybixcbiAgICAgICAgZGVzY3JpcHRpb246ICdFeGVjdXRpb24gUm9sZSBBUk4nLFxuICAgICAgICBleHBvcnROYW1lOiBgJHtwcm9wcy5hcHBOYW1lfS0ke3Byb3BzLmVudmlyb25tZW50fS1FeGVjdXRpb25Sb2xlQXJuYCxcbiAgICAgIH0pO1xuICAgIH1cbiAgfVxuXG4gIC8qKlxuICAgKiBHcmFudCBhZGRpdGlvbmFsIHBlcm1pc3Npb25zIHRvIHRoZSBhcHBsaWNhdGlvbiByb2xlXG4gICAqL1xuICBwdWJsaWMgZ3JhbnRBcHBSb2xlKHBlcm1pc3Npb25zOiBpYW0uUG9saWN5U3RhdGVtZW50KTogdm9pZCB7XG4gICAgdGhpcy5hcHBSb2xlPy5hZGRUb1BvbGljeShwZXJtaXNzaW9ucyk7XG4gIH1cblxuICAvKipcbiAgICogR3JhbnQgYWRkaXRpb25hbCBwZXJtaXNzaW9ucyB0byB0aGUgZXhlY3V0aW9uIHJvbGVcbiAgICovXG4gIHB1YmxpYyBncmFudEV4ZWN1dGlvblJvbGUocGVybWlzc2lvbnM6IGlhbS5Qb2xpY3lTdGF0ZW1lbnQpOiB2b2lkIHtcbiAgICB0aGlzLmV4ZWN1dGlvblJvbGU/LmFkZFRvUG9saWN5KHBlcm1pc3Npb25zKTtcbiAgfVxuXG4gIC8qKlxuICAgKiBDcmVhdGUgYSBjdXN0b20gc2VjdXJpdHkgZ3JvdXBcbiAgICovXG4gIHB1YmxpYyBjcmVhdGVTZWN1cml0eUdyb3VwKFxuICAgIGlkOiBzdHJpbmcsXG4gICAgZGVzY3JpcHRpb246IHN0cmluZyxcbiAgICBhbGxvd0h0dHA6IGJvb2xlYW4gPSB0cnVlLFxuICAgIGFsbG93SHR0cHM6IGJvb2xlYW4gPSB0cnVlLFxuICAgIGFsbG93U3NoOiBib29sZWFuID0gZmFsc2VcbiAgKTogZWMyLlNlY3VyaXR5R3JvdXAge1xuICAgIGNvbnN0IHNlY3VyaXR5R3JvdXAgPSBuZXcgZWMyLlNlY3VyaXR5R3JvdXAodGhpcywgaWQsIHtcbiAgICAgIHZwYzogdGhpcy52cGMsXG4gICAgICBkZXNjcmlwdGlvbixcbiAgICAgIGFsbG93QWxsT3V0Ym91bmQ6IHRydWUsXG4gICAgfSk7XG5cbiAgICBpZiAoYWxsb3dIdHRwKSB7XG4gICAgICBzZWN1cml0eUdyb3VwLmFkZEluZ3Jlc3NSdWxlKFxuICAgICAgICBlYzIuUGVlci5hbnlJcHY0KCksXG4gICAgICAgIGVjMi5Qb3J0LnRjcCg4MCksXG4gICAgICAgICdBbGxvdyBIVFRQIHRyYWZmaWMnXG4gICAgICApO1xuICAgIH1cblxuICAgIGlmIChhbGxvd0h0dHBzKSB7XG4gICAgICBzZWN1cml0eUdyb3VwLmFkZEluZ3Jlc3NSdWxlKFxuICAgICAgICBlYzIuUGVlci5hbnlJcHY0KCksXG4gICAgICAgIGVjMi5Qb3J0LnRjcCg0NDMpLFxuICAgICAgICAnQWxsb3cgSFRUUFMgdHJhZmZpYydcbiAgICAgICk7XG4gICAgfVxuXG4gICAgaWYgKGFsbG93U3NoKSB7XG4gICAgICBzZWN1cml0eUdyb3VwLmFkZEluZ3Jlc3NSdWxlKFxuICAgICAgICBlYzIuUGVlci5pcHY0KHRoaXMudnBjLnZwY0NpZHJCbG9jayksXG4gICAgICAgIGVjMi5Qb3J0LnRjcCgyMiksXG4gICAgICAgICdBbGxvdyBTU0ggZnJvbSBWUEMnXG4gICAgICApO1xuICAgIH1cblxuICAgIHJldHVybiBzZWN1cml0eUdyb3VwO1xuICB9XG59XG4iXX0=