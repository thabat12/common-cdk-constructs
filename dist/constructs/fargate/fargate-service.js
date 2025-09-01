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
exports.FargateService = void 0;
const cdk = __importStar(require("aws-cdk-lib"));
const ec2 = __importStar(require("aws-cdk-lib/aws-ec2"));
const ecs = __importStar(require("aws-cdk-lib/aws-ecs"));
const ecr = __importStar(require("aws-cdk-lib/aws-ecr"));
const iam = __importStar(require("aws-cdk-lib/aws-iam"));
const logs = __importStar(require("aws-cdk-lib/aws-logs"));
const elbv2 = __importStar(require("aws-cdk-lib/aws-elasticloadbalancingv2"));
const cloudwatch = __importStar(require("aws-cdk-lib/aws-cloudwatch"));
const sns = __importStar(require("aws-cdk-lib/aws-sns"));
const actions = __importStar(require("aws-cdk-lib/aws-cloudwatch-actions"));
const constructs_1 = require("constructs");
class FargateService extends constructs_1.Construct {
    constructor(scope, id, props) {
        super(scope, id);
        const cpu = props.cpu || 256;
        const memory = props.memory || 512;
        const desiredCount = props.desiredCount || 1;
        const maxCapacity = props.maxCapacity || 5;
        const minCapacity = props.minCapacity || 1;
        const containerPort = props.containerPort || 80;
        const healthCheckPath = props.healthCheckPath || '/health';
        const enableAutoScaling = props.enableAutoScaling ?? true;
        const enableLoadBalancer = props.enableLoadBalancer ?? true;
        const enableContainerInsights = props.enableContainerInsights ?? true;
        const enableXRay = props.enableXRay ?? false;
        const logRetentionDays = props.logRetentionDays || 7;
        const targetCpuUtilization = props.targetCpuUtilization || 70;
        const targetMemoryUtilization = props.targetMemoryUtilization || 80;
        // Create ECS cluster
        this.cluster = new ecs.Cluster(this, 'Cluster', {
            vpc: props.vpc,
            clusterName: `${props.serviceName}-cluster`,
            containerInsights: enableContainerInsights,
            enableFargateCapacityProviders: true,
        });
        // Create ECR repository if image is a string
        if (typeof props.image === 'string') {
            this.ecrRepository = new ecr.Repository(this, 'Repository', {
                repositoryName: props.serviceName,
                imageScanOnPush: true,
                removalPolicy: cdk.RemovalPolicy.DESTROY,
            });
        }
        // Create log group with proper retention
        let retention;
        switch (logRetentionDays) {
            case 1:
                retention = logs.RetentionDays.ONE_DAY;
                break;
            case 3:
                retention = logs.RetentionDays.THREE_DAYS;
                break;
            case 5:
                retention = logs.RetentionDays.FIVE_DAYS;
                break;
            case 7:
                retention = logs.RetentionDays.ONE_WEEK;
                break;
            case 14:
                retention = logs.RetentionDays.TWO_WEEKS;
                break;
            case 30:
                retention = logs.RetentionDays.ONE_MONTH;
                break;
            case 60:
                retention = logs.RetentionDays.TWO_MONTHS;
                break;
            case 90:
                retention = logs.RetentionDays.THREE_MONTHS;
                break;
            case 120:
                retention = logs.RetentionDays.FOUR_MONTHS;
                break;
            case 150:
                retention = logs.RetentionDays.FIVE_MONTHS;
                break;
            case 180:
                retention = logs.RetentionDays.SIX_MONTHS;
                break;
            case 365:
                retention = logs.RetentionDays.ONE_YEAR;
                break;
            default:
                retention = logs.RetentionDays.ONE_WEEK;
        }
        this.logGroup = new logs.LogGroup(this, 'LogGroup', {
            logGroupName: `/ecs/${props.serviceName}`,
            retention,
            removalPolicy: cdk.RemovalPolicy.DESTROY,
        });
        // Create task execution role
        const taskExecutionRole = new iam.Role(this, 'TaskExecutionRole', {
            assumedBy: new iam.ServicePrincipal('ecs-tasks.amazonaws.com'),
            managedPolicies: [
                iam.ManagedPolicy.fromAwsManagedPolicyName('service-role/AmazonECSTaskExecutionRolePolicy'),
            ],
        });
        // Create task role
        const taskRole = new iam.Role(this, 'TaskRole', {
            assumedBy: new iam.ServicePrincipal('ecs-tasks.amazonaws.com'),
        });
        // Add permissions for CloudWatch logs
        taskRole.addToPolicy(new iam.PolicyStatement({
            effect: iam.Effect.ALLOW,
            actions: [
                'logs:CreateLogGroup',
                'logs:CreateLogStream',
                'logs:PutLogEvents',
            ],
            resources: ['*'],
        }));
        // Add X-Ray permissions if enabled
        if (enableXRay) {
            taskRole.addToPolicy(new iam.PolicyStatement({
                effect: iam.Effect.ALLOW,
                actions: [
                    'xray:PutTraceSegments',
                    'xray:PutTelemetryRecords',
                ],
                resources: ['*'],
            }));
        }
        // Create task definition
        this.taskDefinition = new ecs.FargateTaskDefinition(this, 'TaskDefinition', {
            memoryLimitMiB: memory,
            cpu,
            executionRole: taskExecutionRole,
            taskRole,
        });
        // Determine container image
        let containerImage;
        if (typeof props.image === 'string') {
            if (this.ecrRepository) {
                containerImage = ecs.ContainerImage.fromEcrRepository(this.ecrRepository, 'latest');
            }
            else {
                containerImage = ecs.ContainerImage.fromRegistry(props.image);
            }
        }
        else {
            containerImage = ecs.ContainerImage.fromEcrRepository(props.image, 'latest');
        }
        // Add container to task definition
        const container = this.taskDefinition.addContainer('Container', {
            image: containerImage,
            containerName: props.serviceName,
            logging: ecs.LogDrivers.awsLogs({
                streamPrefix: props.serviceName,
                logGroup: this.logGroup,
            }),
            environment: props.environment,
            secrets: props.secrets,
            portMappings: [
                {
                    containerPort,
                    protocol: ecs.Protocol.TCP,
                },
            ],
            healthCheck: {
                command: ['CMD-SHELL', `curl -f ${healthCheckPath} || exit 1`],
                interval: cdk.Duration.seconds(30),
                timeout: cdk.Duration.seconds(5),
                retries: 3,
                startPeriod: cdk.Duration.seconds(60),
            },
        });
        // Create load balancer if enabled
        if (enableLoadBalancer) {
            this.loadBalancer = new elbv2.ApplicationLoadBalancer(this, 'LoadBalancer', {
                vpc: props.vpc,
                internetFacing: true,
                loadBalancerName: `${props.serviceName}-alb`,
            });
            this.targetGroup = new elbv2.ApplicationTargetGroup(this, 'TargetGroup', {
                vpc: props.vpc,
                port: containerPort,
                protocol: elbv2.ApplicationProtocol.HTTP,
                targetType: elbv2.TargetType.IP,
                healthCheck: {
                    path: healthCheckPath,
                    healthyHttpCodes: '200',
                    interval: cdk.Duration.seconds(30),
                    timeout: cdk.Duration.seconds(5),
                    healthyThresholdCount: 2,
                    unhealthyThresholdCount: 3,
                },
            });
            // Add listener
            this.loadBalancer.addListener('Listener', {
                port: 80,
                protocol: elbv2.ApplicationProtocol.HTTP,
                defaultAction: elbv2.ListenerAction.forward([this.targetGroup]),
            });
        }
        // Create Fargate service
        this.service = new ecs.FargateService(this, 'Service', {
            cluster: this.cluster,
            taskDefinition: this.taskDefinition,
            serviceName: props.serviceName,
            desiredCount,
            assignPublicIp: false,
            vpcSubnets: props.vpcSubnets || {
                subnetType: ec2.SubnetType.PRIVATE_WITH_EGRESS,
            },
            securityGroups: props.securityGroups,
            enableExecuteCommand: true,
        });
        // Attach to load balancer if enabled
        if (this.targetGroup) {
            this.service.attachToApplicationTargetGroup(this.targetGroup);
        }
        // Enable auto-scaling if requested
        if (enableAutoScaling) {
            this.scaling = this.service.autoScaleTaskCount({
                maxCapacity,
                minCapacity,
            });
            // Scale on CPU utilization
            this.scaling.scaleOnCpuUtilization('CpuScaling', {
                targetUtilizationPercent: targetCpuUtilization,
                scaleInCooldown: cdk.Duration.seconds(60),
                scaleOutCooldown: cdk.Duration.seconds(60),
            });
            // Scale on memory utilization
            this.scaling.scaleOnMemoryUtilization('MemoryScaling', {
                targetUtilizationPercent: targetMemoryUtilization,
                scaleInCooldown: cdk.Duration.seconds(60),
                scaleOutCooldown: cdk.Duration.seconds(60),
            });
        }
        // Add tags
        if (props.tags) {
            Object.entries(props.tags).forEach(([key, value]) => {
                cdk.Tags.of(this.service).add(key, value);
            });
        }
        // Add default tags
        cdk.Tags.of(this.service).add('Service', props.serviceName);
        cdk.Tags.of(this.service).add('Purpose', 'Fargate Service');
        cdk.Tags.of(this.service).add('ManagedBy', 'CDK');
        // Create CloudWatch alarms
        this.createCloudWatchAlarms();
        // Outputs
        new cdk.CfnOutput(this, 'ServiceName', {
            value: this.service.serviceName,
            description: 'Fargate service name',
            exportName: `${props.serviceName}-ServiceName`,
        });
        new cdk.CfnOutput(this, 'ServiceArn', {
            value: this.service.serviceArn,
            description: 'Fargate service ARN',
            exportName: `${props.serviceName}-ServiceArn`,
        });
        if (this.loadBalancer) {
            new cdk.CfnOutput(this, 'LoadBalancerDNS', {
                value: this.loadBalancer.loadBalancerDnsName,
                description: 'Load balancer DNS name',
                exportName: `${props.serviceName}-LoadBalancerDNS`,
            });
        }
        if (this.ecrRepository) {
            new cdk.CfnOutput(this, 'ECRRepositoryUri', {
                value: this.ecrRepository.repositoryUri,
                description: 'ECR repository URI',
                exportName: `${props.serviceName}-ECRRepositoryUri`,
            });
        }
    }
    createCloudWatchAlarms() {
        // CPU utilization alarm
        const cpuAlarm = new cloudwatch.Alarm(this, 'CPUUtilizationAlarm', {
            metric: this.service.metricCpuUtilization(),
            threshold: 80,
            evaluationPeriods: 2,
            alarmDescription: 'CPU utilization is too high',
            alarmName: `${this.service.serviceName}-CPU-High`,
        });
        // Memory utilization alarm
        const memoryAlarm = new cloudwatch.Alarm(this, 'MemoryUtilizationAlarm', {
            metric: this.service.metricMemoryUtilization(),
            threshold: 80,
            evaluationPeriods: 2,
            alarmDescription: 'Memory utilization is too high',
            alarmName: `${this.service.serviceName}-Memory-High`,
        });
        // Service health alarm (using custom metric for service health)
        const healthAlarm = new cloudwatch.Alarm(this, 'ServiceHealthAlarm', {
            metric: new cloudwatch.Metric({
                namespace: 'AWS/ECS',
                metricName: 'ServiceCount',
                dimensionsMap: {
                    ServiceName: this.service.serviceName,
                    ClusterName: this.cluster.clusterName,
                },
                statistic: 'Average',
                period: cdk.Duration.minutes(1),
            }),
            threshold: 1,
            evaluationPeriods: 1,
            comparisonOperator: cloudwatch.ComparisonOperator.LESS_THAN_THRESHOLD,
            alarmDescription: 'Service health check failed',
            alarmName: `${this.service.serviceName}-Health-Check-Failed`,
        });
        // Create SNS topic for alarms
        const alarmTopic = new sns.Topic(this, 'AlarmTopic', {
            topicName: `${this.service.serviceName}-alarms`,
        });
        // Add alarms to SNS topic
        cpuAlarm.addAlarmAction(new actions.SnsAction(alarmTopic));
        memoryAlarm.addAlarmAction(new actions.SnsAction(alarmTopic));
        healthAlarm.addAlarmAction(new actions.SnsAction(alarmTopic));
        // Add OK actions
        cpuAlarm.addOkAction(new actions.SnsAction(alarmTopic));
        memoryAlarm.addOkAction(new actions.SnsAction(alarmTopic));
        healthAlarm.addOkAction(new actions.SnsAction(alarmTopic));
    }
    /**
     * Grant permissions to the task role
     */
    grantTaskRole(permissions) {
        if (this.taskDefinition.taskRole) {
            this.taskDefinition.taskRole.addToPolicy(permissions);
        }
    }
    /**
     * Grant permissions to the task execution role
     */
    grantTaskExecutionRole(permissions) {
        if (this.taskDefinition.executionRole) {
            this.taskDefinition.executionRole.addToPolicy(permissions);
        }
    }
    /**
     * Update the service with a new task definition
     */
    updateService(newTaskDefinition) {
        if (this.targetGroup) {
            this.service.attachToApplicationTargetGroup(this.targetGroup);
        }
    }
}
exports.FargateService = FargateService;
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiZmFyZ2F0ZS1zZXJ2aWNlLmpzIiwic291cmNlUm9vdCI6IiIsInNvdXJjZXMiOlsiLi4vLi4vLi4vc3JjL2NvbnN0cnVjdHMvZmFyZ2F0ZS9mYXJnYXRlLXNlcnZpY2UudHMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6Ijs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7QUFBQSxpREFBbUM7QUFDbkMseURBQTJDO0FBQzNDLHlEQUEyQztBQUMzQyx5REFBMkM7QUFDM0MseURBQTJDO0FBQzNDLDJEQUE2QztBQUM3Qyw4RUFBZ0U7QUFDaEUsdUVBQXlEO0FBQ3pELHlEQUEyQztBQUMzQyw0RUFBOEQ7QUFDOUQsMkNBQXVDO0FBZ0l2QyxNQUFhLGNBQWUsU0FBUSxzQkFBUztJQVUzQyxZQUFZLEtBQWdCLEVBQUUsRUFBVSxFQUFFLEtBQTBCO1FBQ2xFLEtBQUssQ0FBQyxLQUFLLEVBQUUsRUFBRSxDQUFDLENBQUM7UUFFakIsTUFBTSxHQUFHLEdBQUcsS0FBSyxDQUFDLEdBQUcsSUFBSSxHQUFHLENBQUM7UUFDN0IsTUFBTSxNQUFNLEdBQUcsS0FBSyxDQUFDLE1BQU0sSUFBSSxHQUFHLENBQUM7UUFDbkMsTUFBTSxZQUFZLEdBQUcsS0FBSyxDQUFDLFlBQVksSUFBSSxDQUFDLENBQUM7UUFDN0MsTUFBTSxXQUFXLEdBQUcsS0FBSyxDQUFDLFdBQVcsSUFBSSxDQUFDLENBQUM7UUFDM0MsTUFBTSxXQUFXLEdBQUcsS0FBSyxDQUFDLFdBQVcsSUFBSSxDQUFDLENBQUM7UUFDM0MsTUFBTSxhQUFhLEdBQUcsS0FBSyxDQUFDLGFBQWEsSUFBSSxFQUFFLENBQUM7UUFDaEQsTUFBTSxlQUFlLEdBQUcsS0FBSyxDQUFDLGVBQWUsSUFBSSxTQUFTLENBQUM7UUFDM0QsTUFBTSxpQkFBaUIsR0FBRyxLQUFLLENBQUMsaUJBQWlCLElBQUksSUFBSSxDQUFDO1FBQzFELE1BQU0sa0JBQWtCLEdBQUcsS0FBSyxDQUFDLGtCQUFrQixJQUFJLElBQUksQ0FBQztRQUM1RCxNQUFNLHVC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LGFBQWEsQ0FBQyxXQUFnQztRQUNuRCxJQUFJLElBQUksQ0FBQyxjQUFjLENBQUMsUUFBUSxFQUFFO1lBQy9CLElBQUksQ0FBQyxjQUFjLENBQUMsUUFBcUIsQ0FBQyxXQUFXLENBQUMsV0FBVyxDQUFDLENBQUM7U0FDckU7SUFDSCxDQUFDO0lBRUQ7O09BRUc7SUFDSSxzQkFBc0IsQ0FBQyxXQUFnQztRQUM1RCxJQUFJLElBQUksQ0FBQyxjQUFjLENBQUMsYUFBYSxFQUFFO1lBQ3BDLElBQUksQ0FBQyxjQUFjLENBQUMsYUFBMEIsQ0FBQyxXQUFXLENBQUMsV0FBVyxDQUFDLENBQUM7U0FDMUU7SUFDSCxDQUFDO0lBRUQ7O09BRUc7SUFDSSxhQUFhLENBQUMsaUJBQTRDO1FBQy9ELElBQUksSUFBSSxDQUFDLFdBQVcsRUFBRTtZQUNwQixJQUFJLENBQUMsT0FBTyxDQUFDLDhCQUE4QixDQUFDLElBQUksQ0FBQyxXQUFXLENBQUMsQ0FBQztTQUMvRDtJQUNILENBQUM7Q0FDRjtBQXhYRCx3Q0F3WEMiLCJzb3VyY2VzQ29udGVudCI6WyJpbXBvcnQgKiBhcyBjZGsgZnJvbSAnYXdzLWNkay1saWInO1xuaW1wb3J0ICogYXMgZWMyIGZyb20gJ2F3cy1jZGstbGliL2F3cy1lYzInO1xuaW1wb3J0ICogYXMgZWNzIGZyb20gJ2F3cy1jZGstbGliL2F3cy1lY3MnO1xuaW1wb3J0ICogYXMgZWNyIGZyb20gJ2F3cy1jZGstbGliL2F3cy1lY3InO1xuaW1wb3J0ICogYXMgaWFtIGZyb20gJ2F3cy1jZGstbGliL2F3cy1pYW0nO1xuaW1wb3J0ICogYXMgbG9ncyBmcm9tICdhd3MtY2RrLWxpYi9hd3MtbG9ncyc7XG5pbXBvcnQgKiBhcyBlbGJ2MiBmcm9tICdhd3MtY2RrLWxpYi9hd3MtZWxhc3RpY2xvYWRiYWxhbmNpbmd2Mic7XG5pbXBvcnQgKiBhcyBjbG91ZHdhdGNoIGZyb20gJ2F3cy1jZGstbGliL2F3cy1jbG91ZHdhdGNoJztcbmltcG9ydCAqIGFzIHNucyBmcm9tICdhd3MtY2RrLWxpYi9hd3Mtc25zJztcbmltcG9ydCAqIGFzIGFjdGlvbnMgZnJvbSAnYXdzLWNkay1saWIvYXdzLWNsb3Vkd2F0Y2gtYWN0aW9ucyc7XG5pbXBvcnQgeyBDb25zdHJ1Y3QgfSBmcm9tICdjb25zdHJ1Y3RzJztcblxuZXhwb3J0IGludGVyZmFjZSBGYXJnYXRlU2VydmljZVByb3BzIHtcbiAgLyoqXG4gICAqIFRoZSBWUEMgd2hlcmUgdGhlIHNlcnZpY2Ugd2lsbCBiZSBkZXBsb3llZFxuICAgKi9cbiAgdnBjOiBlYzIuSVZwYztcblxuICAvKipcbiAgICogVGhlIERvY2tlciBpbWFnZSB0byBkZXBsb3lcbiAgICovXG4gIGltYWdlOiBzdHJpbmcgfCBlY3IuSVJlcG9zaXRvcnk7XG5cbiAgLyoqXG4gICAqIFRoZSBuYW1lIG9mIHRoZSBzZXJ2aWNlXG4gICAqL1xuICBzZXJ2aWNlTmFtZTogc3RyaW5nO1xuXG4gIC8qKlxuICAgKiBDUFUgdW5pdHMgZm9yIHRoZSB0YXNrICgyNTYgPSAwLjI1IHZDUFUsIDUxMiA9IDAuNSB2Q1BVLCAxMDI0ID0gMSB2Q1BVLCBldGMuKVxuICAgKiBAZGVmYXVsdCAyNTZcbiAgICovXG4gIGNwdT86IG51bWJlcjtcblxuICAvKipcbiAgICogTWVtb3J5IGZvciB0aGUgdGFzayBpbiBNaUJcbiAgICogQGRlZmF1bHQgNTEyXG4gICAqL1xuICBtZW1vcnk/OiBudW1iZXI7XG5cbiAgLyoqXG4gICAqIERlc2lyZWQgbnVtYmVyIG9mIHRhc2tzXG4gICAqIEBkZWZhdWx0IDFcbiAgICovXG4gIGRlc2lyZWRDb3VudD86IG51bWJlcjtcblxuICAvKipcbiAgICogTWF4aW11bSBudW1iZXIgb2YgdGFza3MgZm9yIGF1dG8tc2NhbGluZ1xuICAgKiBAZGVmYXVsdCA1XG4gICAqL1xuICBtYXhDYXBhY2l0eT86IG51bWJlcjtcblxuICAvKipcbiAgICogTWluaW11bSBudW1iZXIgb2YgdGFza3MgZm9yIGF1dG8tc2NhbGluZ1xuICAgKiBAZGVmYXVsdCAxXG4gICAqL1xuICBtaW5DYXBhY2l0eT86IG51bWJlcjtcblxuICAvKipcbiAgICogUG9ydCB0aGF0IHRoZSBjb250YWluZXIgZXhwb3Nlc1xuICAgKiBAZGVmYXVsdCA4MFxuICAgKi9cbiAgY29udGFpbmVyUG9ydD86IG51bWJlcjtcblxuICAvKipcbiAgICogSGVhbHRoIGNoZWNrIHBhdGggZm9yIHRoZSBsb2FkIGJhbGFuY2VyXG4gICAqIEBkZWZhdWx0IC9oZWFsdGhcbiAgICovXG4gIGhlYWx0aENoZWNrUGF0aD86IHN0cmluZztcblxuICAvKipcbiAgICogRW52aXJvbm1lbnQgdmFyaWFibGVzIGZvciB0aGUgY29udGFpbmVyXG4gICAqL1xuICBlbnZpcm9ubWVudD86IHsgW2tleTogc3RyaW5nXTogc3RyaW5nIH07XG5cbiAgLyoqXG4gICAqIFNlY3JldHMgZm9yIHRoZSBjb250YWluZXJcbiAgICovXG4gIHNlY3JldHM/OiB7IFtrZXk6IHN0cmluZ106IGVjcy5TZWNyZXQgfTtcblxuICAvKipcbiAgICogV2hldGhlciB0byBlbmFibGUgYXV0by1zY2FsaW5nXG4gICAqIEBkZWZhdWx0IHRydWVcbiAgICovXG4gIGVuYWJsZUF1dG9TY2FsaW5nPzogYm9vbGVhbjtcblxuICAvKipcbiAgICogV2hldGhlciB0byBlbmFibGUgbG9hZCBiYWxhbmNpbmdcbiAgICogQGRlZmF1bHQgdHJ1ZVxuICAgKi9cbiAgZW5hYmxlTG9hZEJhbGFuY2VyPzogYm9vbGVhbjtcblxuICAvKipcbiAgICogV2hldGhlciB0byBlbmFibGUgY29udGFpbmVyIGluc2lnaHRzXG4gICAqIEBkZWZhdWx0IHRydWVcbiAgICovXG4gIGVuYWJsZUNvbnRhaW5lckluc2lnaHRzPzogYm9vbGVhbjtcblxuICAvKipcbiAgICogV2hldGhlciB0byBlbmFibGUgWC1SYXkgdHJhY2luZ1xuICAgKiBAZGVmYXVsdCBmYWxzZVxuICAgKi9cbiAgZW5hYmxlWFJheT86IGJvb2xlYW47XG5cbiAgLyoqXG4gICAqIExvZyByZXRlbnRpb24gZGF5c1xuICAgKiBAZGVmYXVsdCA3XG4gICAqL1xuICBsb2dSZXRlbnRpb25EYXlzPzogbnVtYmVyO1xuXG4gIC8qKlxuICAgKiBBdXRvLXNjYWxpbmcgdGFyZ2V0IENQVSB1dGlsaXphdGlvbiBwZXJjZW50YWdlXG4gICAqIEBkZWZhdWx0IDcwXG4gICAqL1xuICB0YXJnZXRDcHVVdGlsaXphdGlvbj86IG51bWJlcjtcblxuICAvKipcbiAgICogQXV0by1zY2FsaW5nIHRhcmdldCBtZW1vcnkgdXRpbGl6YXRpb24gcGVyY2VudGFnZVxuICAgKiBAZGVmYXVsdCA4MFxuICAgKi9cbiAgdGFyZ2V0TWVtb3J5VXRpbGl6YXRpb24/OiBudW1iZXI7XG5cbiAgLyoqXG4gICAqIFRhZ3MgdG8gYXBwbHkgdG8gcmVzb3VyY2VzXG4gICAqL1xuICB0YWdzPzogeyBba2V5OiBzdHJpbmddOiBzdHJpbmcgfTtcblxuICAvKipcbiAgICogU2VjdXJpdHkgZ3JvdXBzIHRvIGFzc2lnbiB0byB0aGUgc2VydmljZVxuICAgKi9cbiAgc2VjdXJpdHlHcm91cHM/OiBlYzIuSVNlY3VyaXR5R3JvdXBbXTtcblxuICAvKipcbiAgICogU3VibmV0IHNlbGVjdGlvbiBmb3IgdGhlIHNlcnZpY2VcbiAgICovXG4gIHZwY1N1Ym5ldHM/OiBlYzIuU3VibmV0U2VsZWN0aW9uO1xufVxuXG5leHBvcnQgY2xhc3MgRmFyZ2F0ZVNlcnZpY2UgZXh0ZW5kcyBDb25zdHJ1Y3Qge1xuICBwdWJsaWMgcmVhZG9ubHkgc2VydmljZTogZWNzLkZhcmdhdGVTZXJ2aWNlO1xuICBwdWJsaWMgcmVhZG9ubHkgY2x1c3RlcjogZWNzLkNsdXN0ZXI7XG4gIHB1YmxpYyByZWFkb25seSB0YXNrRGVmaW5pdGlvbjogZWNzLkZhcmdhdGVUYXNrRGVmaW5pdGlvbjtcbiAgcHVibGljIHJlYWRvbmx5IGxvYWRCYWxhbmNlcj86IGVsYnYyLkFwcGxpY2F0aW9uTG9hZEJhbGFuY2VyO1xuICBwdWJsaWMgcmVhZG9ubHkgdGFyZ2V0R3JvdXA/OiBlbGJ2Mi5BcHBsaWNhdGlvblRhcmdldEdyb3VwO1xuICBwdWJsaWMgcmVhZG9ubHkgZWNyUmVwb3NpdG9yeT86IGVjci5SZXBvc2l0b3J5O1xuICBwdWJsaWMgcmVhZG9ubHkgbG9nR3JvdXA6IGxvZ3MuTG9nR3JvdXA7XG4gIHB1YmxpYyByZWFkb25seSBzY2FsaW5nPzogZWNzLlNjYWxhYmxlVGFza0NvdW50O1xuXG4gIGNvbnN0cnVjdG9yKHNjb3BlOiBDb25zdHJ1Y3QsIGlkOiBzdHJpbmcsIHByb3BzOiBGYXJnYXRlU2VydmljZVByb3BzKSB7XG4gICAgc3VwZXIoc2NvcGUsIGlkKTtcblxuICAgIGNvbnN0IGNwdSA9IHByb3BzLmNwdSB8fCAyNTY7XG4gICAgY29uc3QgbWVtb3J5ID0gcHJvcHMubWVtb3J5IHx8IDUxMjtcbiAgICBjb25zdCBkZXNpcmVkQ291bnQgPSBwcm9wcy5kZXNpcmVkQ291bnQgfHwgMTtcbiAgICBjb25zdCBtYXhDYXBhY2l0eSA9IHByb3BzLm1heENhcGFjaXR5IHx8IDU7XG4gICAgY29uc3QgbWluQ2FwYWNpdHkgPSBwcm9wcy5taW5DYXBhY2l0eSB8fCAxO1xuICAgIGNvbnN0IGNvbnRhaW5lclBvcnQgPSBwcm9wcy5jb250YWluZXJQb3J0IHx8IDgwO1xuICAgIGNvbnN0IGhlYWx0aENoZWNrUGF0aCA9IHByb3BzLmhlYWx0aENoZWNrUGF0aCB8fCAnL2hlYWx0aCc7XG4gICAgY29uc3QgZW5hYmxlQXV0b1NjYWxpbmcgPSBwcm9wcy5lbmFibGVBdXRvU2NhbGluZyA/PyB0cnVlO1xuICAgIGNvbnN0IGVuYWJsZUxvYWRCYWxhbmNlciA9IHByb3BzLmVuYWJsZUxvYWRCYWxhbmNlciA/PyB0cnVlO1xuICAgIGNvbnN0IGVuYWJsZUNvbnRhaW5lckluc2lnaHRzID0gcHJvcHMuZW5hYmxlQ29udGFpbmVySW5zaWdodHMgPz8gdHJ1ZTtcbiAgICBjb25zdCBlbmFibGVYUmF5ID0gcHJvcHMuZW5hYmxlWFJheSA/PyBmYWxzZTtcbiAgICBjb25zdCBsb2dSZXRlbnRpb25EYXlzID0gcHJvcHMubG9nUmV0ZW50aW9uRGF5cyB8fCA3O1xuICAgIGNvbnN0IHRhcmdldENwdVV0aWxpemF0aW9uID0gcHJvcHMudGFyZ2V0Q3B1VXRpbGl6YXRpb24gfHwgNzA7XG4gICAgY29uc3QgdGFyZ2V0TWVtb3J5VXRpbGl6YXRpb24gPSBwcm9wcy50YXJnZXRNZW1vcnlVdGlsaXphdGlvbiB8fCA4MDtcblxuICAgIC8vIENyZWF0ZSBFQ1MgY2x1c3RlclxuICAgIHRoaXMuY2x1c3RlciA9IG5ldyBlY3MuQ2x1c3Rlcih0aGlzLCAnQ2x1c3RlcicsIHtcbiAgICAgIHZwYzogcHJvcHMudnBjLFxuICAgICAgY2x1c3Rlck5hbWU6IGAke3Byb3BzLnNlcnZpY2VOYW1lfS1jbHVzdGVyYCxcbiAgICAgIGNvbnRhaW5lckluc2lnaHRzOiBlbmFibGVDb250YWluZXJJbnNpZ2h0cyxcbiAgICAgIGVuYWJsZUZhcmdhdGVDYXBhY2l0eVByb3ZpZGVyczogdHJ1ZSxcbiAgICB9KTtcblxuICAgIC8vIENyZWF0ZSBFQ1IgcmVwb3NpdG9yeSBpZiBpbWFnZSBpcyBhIHN0cmluZ1xuICAgIGlmICh0eXBlb2YgcHJvcHMuaW1hZ2UgPT09ICdzdHJpbmcnKSB7XG4gICAgICB0aGlzLmVjclJlcG9zaXRvcnkgPSBuZXcgZWNyLlJlcG9zaXRvcnkodGhpcywgJ1JlcG9zaXRvcnknLCB7XG4gICAgICAgIHJlcG9zaXRvcnlOYW1lOiBwcm9wcy5zZXJ2aWNlTmFtZSxcbiAgICAgICAgaW1hZ2VTY2FuT25QdXNoOiB0cnVlLFxuICAgICAgICByZW1vdmFsUG9saWN5OiBjZGsuUmVtb3ZhbFBvbGljeS5ERVNUUk9ZLFxuICAgICAgfSk7XG4gICAgfVxuXG4gICAgLy8gQ3JlYXRlIGxvZyBncm91cCB3aXRoIHByb3BlciByZXRlbnRpb25cbiAgICBsZXQgcmV0ZW50aW9uOiBsb2dzLlJldGVudGlvbkRheXM7XG4gICAgc3dpdGNoIChsb2dSZXRlbnRpb25EYXlzKSB7XG4gICAgICBjYXNlIDE6XG4gICAgICAgIHJldGVudGlvbiA9IGxvZ3MuUmV0ZW50aW9uRGF5cy5PTkVfREFZO1xuICAgICAgICBicmVhaztcbiAgICAgIGNhc2UgMzpcbiAgICAgICAgcmV0ZW50aW9uID0gbG9ncy5SZXRlbnRpb25EYXlzLlRIUkVFX0RBWVM7XG4gICAgICAgIGJyZWFrO1xuICAgICAgY2FzZSA1OlxuICAgICAgICByZXRlbnRpb24gPSBsb2dzLlJldGVudGlvbkRheXMuRklWRV9EQVlTO1xuICAgICAgICBicmVhaztcbiAgICAgIGNhc2UgNzpcbiAgICAgICAgcmV0ZW50aW9uID0gbG9ncy5SZXRlbnRpb25EYXlzLk9ORV9XRUVLO1xuICAgICAgICBicmVhaztcbiAgICAgIGNhc2UgMTQ6XG4gICAgICAgIHJldGVudGlvbiA9IGxvZ3MuUmV0ZW50aW9uRGF5cy5UV09fV0VFS1M7XG4gICAgICAgIGJyZWFrO1xuICAgICAgY2FzZSAzMDpcbiAgICAgICAgcmV0ZW50aW9uID0gbG9ncy5SZXRlbnRpb25EYXlzLk9ORV9NT05USDtcbiAgICAgICAgYnJlYWs7XG4gICAgICBjYXNlIDYwOlxuICAgICAgICByZXRlbnRpb24gPSBsb2dzLlJldGVudGlvbkRheXMuVFdPX01PTlRIUztcbiAgICAgICAgYnJlYWs7XG4gICAgICBjYXNlIDkwOlxuICAgICAgICByZXRlbnRpb24gPSBsb2dzLlJldGVudGlvbkRheXMuVEhSRUVfTU9OVEhTO1xuICAgICAgICBicmVhaztcbiAgICAgIGNhc2UgMTIwOlxuICAgICAgICByZXRlbnRpb24gPSBsb2dzLlJldGVudGlvbkRheXMuRk9VUl9NT05USFM7XG4gICAgICAgIGJyZWFrO1xuICAgICAgY2FzZSAxNTA6XG4gICAgICAgIHJldGVudGlvbiA9IGxvZ3MuUmV0ZW50aW9uRGF5cy5GSVZFX01PTlRIUztcbiAgICAgICAgYnJlYWs7XG4gICAgICBjYXNlIDE4MDpcbiAgICAgICAgcmV0ZW50aW9uID0gbG9ncy5SZXRlbnRpb25EYXlzLlNJWF9NT05USFM7XG4gICAgICAgIGJyZWFrO1xuICAgICAgY2FzZSAzNjU6XG4gICAgICAgIHJldGVudGlvbiA9IGxvZ3MuUmV0ZW50aW9uRGF5cy5PTkVfWUVBUjtcbiAgICAgICAgYnJlYWs7XG4gICAgICBkZWZhdWx0OlxuICAgICAgICByZXRlbnRpb24gPSBsb2dzLlJldGVudGlvbkRheXMuT05FX1dFRUs7XG4gICAgfVxuXG4gICAgdGhpcy5sb2dHcm91cCA9IG5ldyBsb2dzLkxvZ0dyb3VwKHRoaXMsICdMb2dHcm91cCcsIHtcbiAgICAgIGxvZ0dyb3VwTmFtZTogYC9lY3MvJHtwcm9wcy5zZXJ2aWNlTmFtZX1gLFxuICAgICAgcmV0ZW50aW9uLFxuICAgICAgcmVtb3ZhbFBvbGljeTogY2RrLlJlbW92YWxQb2xpY3kuREVTVFJPWSxcbiAgICB9KTtcblxuICAgIC8vIENyZWF0ZSB0YXNrIGV4ZWN1dGlvbiByb2xlXG4gICAgY29uc3QgdGFza0V4ZWN1dGlvblJvbGUgPSBuZXcgaWFtLlJvbGUodGhpcywgJ1Rhc2tFeGVjdXRpb25Sb2xlJywge1xuICAgICAgYXNzdW1lZEJ5OiBuZXcgaWFtLlNlcnZpY2VQcmluY2lwYWwoJ2Vjcy10YXNrcy5hbWF6b25hd3MuY29tJyksXG4gICAgICBtYW5hZ2VkUG9saWNpZXM6IFtcbiAgICAgICAgaWFtLk1hbmFnZWRQb2xpY3kuZnJvbUF3c01hbmFnZWRQb2xpY3lOYW1lKCdzZXJ2aWNlLXJvbGUvQW1hem9uRUNTVGFza0V4ZWN1dGlvblJvbGVQb2xpY3knKSxcbiAgICAgIF0sXG4gICAgfSk7XG5cbiAgICAvLyBDcmVhdGUgdGFzayByb2xlXG4gICAgY29uc3QgdGFza1JvbGUgPSBuZXcgaWFtLlJvbGUodGhpcywgJ1Rhc2tSb2xlJywge1xuICAgICAgYXNzdW1lZEJ5OiBuZXcgaWFtLlNlcnZpY2VQcmluY2lwYWwoJ2Vjcy10YXNrcy5hbWF6b25hd3MuY29tJyksXG4gICAgfSk7XG5cbiAgICAvLyBBZGQgcGVybWlzc2lvbnMgZm9yIENsb3VkV2F0Y2ggbG9nc1xuICAgIHRhc2tSb2xlLmFkZFRvUG9saWN5KFxuICAgICAgbmV3IGlhbS5Qb2xpY3lTdGF0ZW1lbnQoe1xuICAgICAgICBlZmZlY3Q6IGlhbS5FZmZlY3QuQUxMT1csXG4gICAgICAgIGFjdGlvbnM6IFtcbiAgICAgICAgICAnbG9nczpDcmVhdGVMb2dHcm91cCcsXG4gICAgICAgICAgJ2xvZ3M6Q3JlYXRlTG9nU3RyZWFtJyxcbiAgICAgICAgICAnbG9nczpQdXRMb2dFdmVudHMnLFxuICAgICAgICBdLFxuICAgICAgICByZXNvdXJjZXM6IFsnKiddLFxuICAgICAgfSlcbiAgICApO1xuXG4gICAgLy8gQWRkIFgtUmF5IHBlcm1pc3Npb25zIGlmIGVuYWJsZWRcbiAgICBpZiAoZW5hYmxlWFJheSkge1xuICAgICAgdGFza1JvbGUuYWRkVG9Qb2xpY3koXG4gICAgICAgIG5ldyBpYW0uUG9saWN5U3RhdGVtZW50KHtcbiAgICAgICAgICBlZmZlY3Q6IGlhbS5FZmZlY3QuQUxMT1csXG4gICAgICAgICAgYWN0aW9uczogW1xuICAgICAgICAgICAgJ3hyYXk6UHV0VHJhY2VTZWdtZW50cycsXG4gICAgICAgICAgICAneHJheTpQdXRUZWxlbWV0cnlSZWNvcmRzJyxcbiAgICAgICAgICBdLFxuICAgICAgICAgIHJlc291cmNlczogWycqJ10sXG4gICAgICAgIH0pXG4gICAgICApO1xuICAgIH1cblxuICAgIC8vIENyZWF0ZSB0YXNrIGRlZmluaXRpb25cbiAgICB0aGlzLnRhc2tEZWZpbml0aW9uID0gbmV3IGVjcy5GYXJnYXRlVGFza0RlZmluaXRpb24odGhpcywgJ1Rhc2tEZWZpbml0aW9uJywge1xuICAgICAgbWVtb3J5TGltaXRNaUI6IG1lbW9yeSxcbiAgICAgIGNwdSxcbiAgICAgIGV4ZWN1dGlvblJvbGU6IHRhc2tFeGVjdXRpb25Sb2xlLFxuICAgICAgdGFza1JvbGUsXG4gICAgfSk7XG5cbiAgICAvLyBEZXRlcm1pbmUgY29udGFpbmVyIGltYWdlXG4gICAgbGV0IGNvbnRhaW5lckltYWdlOiBlY3MuQ29udGFpbmVySW1hZ2U7XG4gICAgaWYgKHR5cGVvZiBwcm9wcy5pbWFnZSA9PT0gJ3N0cmluZycpIHtcbiAgICAgIGlmICh0aGlzLmVjclJlcG9zaXRvcnkpIHtcbiAgICAgICAgY29udGFpbmVySW1hZ2UgPSBlY3MuQ29udGFpbmVySW1hZ2UuZnJvbUVjclJlcG9zaXRvcnkodGhpcy5lY3JSZXBvc2l0b3J5LCAnbGF0ZXN0Jyk7XG4gICAgICB9IGVsc2Uge1xuICAgICAgICBjb250YWluZXJJbWFnZSA9IGVjcy5Db250YWluZXJJbWFnZS5mcm9tUmVnaXN0cnkocHJvcHMuaW1hZ2UpO1xuICAgICAgfVxuICAgIH0gZWxzZSB7XG4gICAgICBjb250YWluZXJJbWFnZSA9IGVjcy5Db250YWluZXJJbWFnZS5mcm9tRWNyUmVwb3NpdG9yeShwcm9wcy5pbWFnZSwgJ2xhdGVzdCcpO1xuICAgIH1cblxuICAgIC8vIEFkZCBjb250YWluZXIgdG8gdGFzayBkZWZpbml0aW9uXG4gICAgY29uc3QgY29udGFpbmVyID0gdGhpcy50YXNrRGVmaW5pdGlvbi5hZGRDb250YWluZXIoJ0NvbnRhaW5lcicsIHtcbiAgICAgIGltYWdlOiBjb250YWluZXJJbWFnZSxcbiAgICAgIGNvbnRhaW5lck5hbWU6IHByb3BzLnNlcnZpY2VOYW1lLFxuICAgICAgbG9nZ2luZzogZWNzLkxvZ0RyaXZlcnMuYXdzTG9ncyh7XG4gICAgICAgIHN0cmVhbVByZWZpeDogcHJvcHMuc2VydmljZU5hbWUsXG4gICAgICAgIGxvZ0dyb3VwOiB0aGlzLmxvZ0dyb3VwLFxuICAgICAgfSksXG4gICAgICBlbnZpcm9ubWVudDogcHJvcHMuZW52aXJvbm1lbnQsXG4gICAgICBzZWNyZXRzOiBwcm9wcy5zZWNyZXRzLFxuICAgICAgcG9ydE1hcHBpbmdzOiBbXG4gICAgICAgIHtcbiAgICAgICAgICBjb250YWluZXJQb3J0LFxuICAgICAgICAgIHByb3RvY29sOiBlY3MuUHJvdG9jb2wuVENQLFxuICAgICAgICB9LFxuICAgICAgXSxcbiAgICAgIGhlYWx0aENoZWNrOiB7XG4gICAgICAgIGNvbW1hbmQ6IFsnQ01ELVNIRUxMJywgYGN1cmwgLWYgJHtoZWFsdGhDaGVja1BhdGh9IHx8IGV4aXQgMWBdLFxuICAgICAgICBpbnRlcnZhbDogY2RrLkR1cmF0aW9uLnNlY29uZHMoMzApLFxuICAgICAgICB0aW1lb3V0OiBjZGsuRHVyYXRpb24uc2Vjb25kcyg1KSxcbiAgICAgICAgcmV0cmllczogMyxcbiAgICAgICAgc3RhcnRQZXJpb2Q6IGNkay5EdXJhdGlvbi5zZWNvbmRzKDYwKSxcbiAgICAgIH0sXG4gICAgfSk7XG5cbiAgICAvLyBDcmVhdGUgbG9hZCBiYWxhbmNlciBpZiBlbmFibGVkXG4gICAgaWYgKGVuYWJsZUxvYWRCYWxhbmNlcikge1xuICAgICAgdGhpcy5sb2FkQmFsYW5jZXIgPSBuZXcgZWxidjIuQXBwbGljYXRpb25Mb2FkQmFsYW5jZXIodGhpcywgJ0xvYWRCYWxhbmNlcicsIHtcbiAgICAgICAgdnBjOiBwcm9wcy52cGMsXG4gICAgICAgIGludGVybmV0RmFjaW5nOiB0cnVlLFxuICAgICAgICBsb2FkQmFsYW5jZXJOYW1lOiBgJHtwcm9wcy5zZXJ2aWNlTmFtZX0tYWxiYCxcbiAgICAgIH0pO1xuXG4gICAgICB0aGlzLnRhcmdldEdyb3VwID0gbmV3IGVsYnYyLkFwcGxpY2F0aW9uVGFyZ2V0R3JvdXAodGhpcywgJ1RhcmdldEdyb3VwJywge1xuICAgICAgICB2cGM6IHByb3BzLnZwYyxcbiAgICAgICAgcG9ydDogY29udGFpbmVyUG9ydCxcbiAgICAgICAgcHJvdG9jb2w6IGVsYnYyLkFwcGxpY2F0aW9uUHJvdG9jb2wuSFRUUCxcbiAgICAgICAgdGFyZ2V0VHlwZTogZWxidjIuVGFyZ2V0VHlwZS5JUCxcbiAgICAgICAgaGVhbHRoQ2hlY2s6IHtcbiAgICAgICAgICBwYXRoOiBoZWFsdGhDaGVja1BhdGgsXG4gICAgICAgICAgaGVhbHRoeUh0dHBDb2RlczogJzIwMCcsXG4gICAgICAgICAgaW50ZXJ2YWw6IGNkay5EdXJhdGlvbi5zZWNvbmRzKDMwKSxcbiAgICAgICAgICB0aW1lb3V0OiBjZGsuRHVyYXRpb24uc2Vjb25kcyg1KSxcbiAgICAgICAgICBoZWFsdGh5VGhyZXNob2xkQ291bnQ6IDIsXG4gICAgICAgICAgdW5oZWFsdGh5VGhyZXNob2xkQ291bnQ6IDMsXG4gICAgICAgIH0sXG4gICAgICB9KTtcblxuICAgICAgLy8gQWRkIGxpc3RlbmVyXG4gICAgICB0aGlzLmxvYWRCYWxhbmNlci5hZGRMaXN0ZW5lcignTGlzdGVuZXInLCB7XG4gICAgICAgIHBvcnQ6IDgwLFxuICAgICAgICBwcm90b2NvbDogZWxidjIuQXBwbGljYXRpb25Qcm90b2NvbC5IVFRQLFxuICAgICAgICBkZWZhdWx0QWN0aW9uOiBlbGJ2Mi5MaXN0ZW5lckFjdGlvbi5mb3J3YXJkKFt0aGlzLnRhcmdldEdyb3VwXSksXG4gICAgICB9KTtcbiAgICB9XG5cbiAgICAvLyBDcmVhdGUgRmFyZ2F0ZSBzZXJ2aWNlXG4gICAgdGhpcy5zZXJ2aWNlID0gbmV3IGVjcy5GYXJnYXRlU2VydmljZSh0aGlzLCAnU2VydmljZScsIHtcbiAgICAgIGNsdXN0ZXI6IHRoaXMuY2x1c3RlcixcbiAgICAgIHRhc2tEZWZpbml0aW9uOiB0aGlzLnRhc2tEZWZpbml0aW9uLFxuICAgICAgc2VydmljZU5hbWU6IHByb3BzLnNlcnZpY2VOYW1lLFxuICAgICAgZGVzaXJlZENvdW50LFxuICAgICAgYXNzaWduUHVibGljSXA6IGZhbHNlLFxuICAgICAgdnBjU3VibmV0czogcHJvcHMudnBjU3VibmV0cyB8fCB7XG4gICAgICAgIHN1Ym5ldFR5cGU6IGVjMi5TdWJuZXRUeXBlLlBSSVZBVEVfV0lUSF9FR1JFU1MsXG4gICAgICB9LFxuICAgICAgc2VjdXJpdHlHcm91cHM6IHByb3BzLnNlY3VyaXR5R3JvdXBzLFxuICAgICAgZW5hYmxlRXhlY3V0ZUNvbW1hbmQ6IHRydWUsXG4gICAgfSk7XG5cbiAgICAvLyBBdHRhY2ggdG8gbG9hZCBiYWxhbmNlciBpZiBlbmFibGVkXG4gICAgaWYgKHRoaXMudGFyZ2V0R3JvdXApIHtcbiAgICAgIHRoaXMuc2VydmljZS5hdHRhY2hUb0FwcGxpY2F0aW9uVGFyZ2V0R3JvdXAodGhpcy50YXJnZXRHcm91cCk7XG4gICAgfVxuXG4gICAgLy8gRW5hYmxlIGF1dG8tc2NhbGluZyBpZiByZXF1ZXN0ZWRcbiAgICBpZiAoZW5hYmxlQXV0b1NjYWxpbmcpIHtcbiAgICAgIHRoaXMuc2NhbGluZyA9IHRoaXMuc2VydmljZS5hdXRvU2NhbGVUYXNrQ291bnQoe1xuICAgICAgICBtYXhDYXBhY2l0eSxcbiAgICAgICAgbWluQ2FwYWNpdHksXG4gICAgICB9KTtcblxuICAgICAgLy8gU2NhbGUgb24gQ1BVIHV0aWxpemF0aW9uXG4gICAgICB0aGlzLnNjYWxpbmcuc2NhbGVPbkNwdVV0aWxpemF0aW9uKCdDcHVTY2FsaW5nJywge1xuICAgICAgICB0YXJnZXRVdGlsaXphdGlvblBlcmNlbnQ6IHRhcmdldENwdVV0aWxpemF0aW9uLFxuICAgICAgICBzY2FsZUluQ29vbGRvd246IGNkay5EdXJhdGlvbi5zZWNvbmRzKDYwKSxcbiAgICAgICAgc2NhbGVPdXRDb29sZG93bjogY2RrLkR1cmF0aW9uLnNlY29uZHMoNjApLFxuICAgICAgfSk7XG5cbiAgICAgIC8vIFNjYWxlIG9uIG1lbW9yeSB1dGlsaXphdGlvblxuICAgICAgdGhpcy5zY2FsaW5nLnNjYWxlT25NZW1vcnlVdGlsaXphdGlvbignTWVtb3J5U2NhbGluZycsIHtcbiAgICAgICAgdGFyZ2V0VXRpbGl6YXRpb25QZXJjZW50OiB0YXJnZXRNZW1vcnlVdGlsaXphdGlvbixcbiAgICAgICAgc2NhbGVJbkNvb2xkb3duOiBjZGsuRHVyYXRpb24uc2Vjb25kcyg2MCksXG4gICAgICAgIHNjYWxlT3V0Q29vbGRvd246IGNkay5EdXJhdGlvbi5zZWNvbmRzKDYwKSxcbiAgICAgIH0pO1xuICAgIH1cblxuICAgIC8vIEFkZCB0YWdzXG4gICAgaWYgKHByb3BzLnRhZ3MpIHtcbiAgICAgIE9iamVjdC5lbnRyaWVzKHByb3BzLnRhZ3MpLmZvckVhY2goKFtrZXksIHZhbHVlXSkgPT4ge1xuICAgICAgICBjZGsuVGFncy5vZih0aGlzLnNlcnZpY2UpLmFkZChrZXksIHZhbHVlKTtcbiAgICAgIH0pO1xuICAgIH1cblxuICAgIC8vIEFkZCBkZWZhdWx0IHRhZ3NcbiAgICBjZGsuVGFncy5vZih0aGlzLnNlcnZpY2UpLmFkZCgnU2VydmljZScsIHByb3BzLnNlcnZpY2VOYW1lKTtcbiAgICBjZGsuVGFncy5vZih0aGlzLnNlcnZpY2UpLmFkZCgnUHVycG9zZScsICdGYXJnYXRlIFNlcnZpY2UnKTtcbiAgICBjZGsuVGFncy5vZih0aGlzLnNlcnZpY2UpLmFkZCgnTWFuYWdlZEJ5JywgJ0NESycpO1xuXG4gICAgLy8gQ3JlYXRlIENsb3VkV2F0Y2ggYWxhcm1zXG4gICAgdGhpcy5jcmVhdGVDbG91ZFdhdGNoQWxhcm1zKCk7XG5cbiAgICAvLyBPdXRwdXRzXG4gICAgbmV3IGNkay5DZm5PdXRwdXQodGhpcywgJ1NlcnZpY2VOYW1lJywge1xuICAgICAgdmFsdWU6IHRoaXMuc2VydmljZS5zZXJ2aWNlTmFtZSxcbiAgICAgIGRlc2NyaXB0aW9uOiAnRmFyZ2F0ZSBzZXJ2aWNlIG5hbWUnLFxuICAgICAgZXhwb3J0TmFtZTogYCR7cHJvcHMuc2VydmljZU5hbWV9LVNlcnZpY2VOYW1lYCxcbiAgICB9KTtcblxuICAgIG5ldyBjZGsuQ2ZuT3V0cHV0KHRoaXMsICdTZXJ2aWNlQXJuJywge1xuICAgICAgdmFsdWU6IHRoaXMuc2VydmljZS5zZXJ2aWNlQXJuLFxuICAgICAgZGVzY3JpcHRpb246ICdGYXJnYXRlIHNlcnZpY2UgQVJOJyxcbiAgICAgIGV4cG9ydE5hbWU6IGAke3Byb3BzLnNlcnZpY2VOYW1lfS1TZXJ2aWNlQXJuYCxcbiAgICB9KTtcblxuICAgIGlmICh0aGlzLmxvYWRCYWxhbmNlcikge1xuICAgICAgbmV3IGNkay5DZm5PdXRwdXQodGhpcywgJ0xvYWRCYWxhbmNlckROUycsIHtcbiAgICAgICAgdmFsdWU6IHRoaXMubG9hZEJhbGFuY2VyLmxvYWRCYWxhbmNlckRuc05hbWUsXG4gICAgICAgIGRlc2NyaXB0aW9uOiAnTG9hZCBiYWxhbmNlciBETlMgbmFtZScsXG4gICAgICAgIGV4cG9ydE5hbWU6IGAke3Byb3BzLnNlcnZpY2VOYW1lfS1Mb2FkQmFsYW5jZXJETlNgLFxuICAgICAgfSk7XG4gICAgfVxuXG4gICAgaWYgKHRoaXMuZWNyUmVwb3NpdG9yeSkge1xuICAgICAgbmV3IGNkay5DZm5PdXRwdXQodGhpcywgJ0VDUlJlcG9zaXRvcnlVcmknLCB7XG4gICAgICAgIHZhbHVlOiB0aGlzLmVjclJlcG9zaXRvcnkucmVwb3NpdG9yeVVyaSxcbiAgICAgICAgZGVzY3JpcHRpb246ICdFQ1IgcmVwb3NpdG9yeSBVUkknLFxuICAgICAgICBleHBvcnROYW1lOiBgJHtwcm9wcy5zZXJ2aWNlTmFtZX0tRUNSUmVwb3NpdG9yeVVyaWAsXG4gICAgICB9KTtcbiAgICB9XG4gIH1cblxuICBwcml2YXRlIGNyZWF0ZUNsb3VkV2F0Y2hBbGFybXMoKTogdm9pZCB7XG4gICAgLy8gQ1BVIHV0aWxpemF0aW9uIGFsYXJtXG4gICAgY29uc3QgY3B1QWxhcm0gPSBuZXcgY2xvdWR3YXRjaC5BbGFybSh0aGlzLCAnQ1BVVXRpbGl6YXRpb25BbGFybScsIHtcbiAgICAgIG1ldHJpYzogdGhpcy5zZXJ2aWNlLm1ldHJpY0NwdVV0aWxpemF0aW9uKCksXG4gICAgICB0aHJlc2hvbGQ6IDgwLFxuICAgICAgZXZhbHVhdGlvblBlcmlvZHM6IDIsXG4gICAgICBhbGFybURlc2NyaXB0aW9uOiAnQ1BVIHV0aWxpemF0aW9uIGlzIHRvbyBoaWdoJyxcbiAgICAgIGFsYXJtTmFtZTogYCR7dGhpcy5zZXJ2aWNlLnNlcnZpY2VOYW1lfS1DUFUtSGlnaGAsXG4gICAgfSk7XG5cbiAgICAvLyBNZW1vcnkgdXRpbGl6YXRpb24gYWxhcm1cbiAgICBjb25zdCBtZW1vcnlBbGFybSA9IG5ldyBjbG91ZHdhdGNoLkFsYXJtKHRoaXMsICdNZW1vcnlVdGlsaXphdGlvbkFsYXJtJywge1xuICAgICAgbWV0cmljOiB0aGlzLnNlcnZpY2UubWV0cmljTWVtb3J5VXRpbGl6YXRpb24oKSxcbiAgICAgIHRocmVzaG9sZDogODAsXG4gICAgICBldmFsdWF0aW9uUGVyaW9kczogMixcbiAgICAgIGFsYXJtRGVzY3JpcHRpb246ICdNZW1vcnkgdXRpbGl6YXRpb24gaXMgdG9vIGhpZ2gnLFxuICAgICAgYWxhcm1OYW1lOiBgJHt0aGlzLnNlcnZpY2Uuc2VydmljZU5hbWV9LU1lbW9yeS1IaWdoYCxcbiAgICB9KTtcblxuICAgIC8vIFNlcnZpY2UgaGVhbHRoIGFsYXJtICh1c2luZyBjdXN0b20gbWV0cmljIGZvciBzZXJ2aWNlIGhlYWx0aClcbiAgICBjb25zdCBoZWFsdGhBbGFybSA9IG5ldyBjbG91ZHdhdGNoLkFsYXJtKHRoaXMsICdTZXJ2aWNlSGVhbHRoQWxhcm0nLCB7XG4gICAgICBtZXRyaWM6IG5ldyBjbG91ZHdhdGNoLk1ldHJpYyh7XG4gICAgICAgIG5hbWVzcGFjZTogJ0FXUy9FQ1MnLFxuICAgICAgICBtZXRyaWNOYW1lOiAnU2VydmljZUNvdW50JyxcbiAgICAgICAgZGltZW5zaW9uc01hcDoge1xuICAgICAgICAgIFNlcnZpY2VOYW1lOiB0aGlzLnNlcnZpY2Uuc2VydmljZU5hbWUsXG4gICAgICAgICAgQ2x1c3Rlck5hbWU6IHRoaXMuY2x1c3Rlci5jbHVzdGVyTmFtZSxcbiAgICAgICAgfSxcbiAgICAgICAgc3RhdGlzdGljOiAnQXZlcmFnZScsXG4gICAgICAgIHBlcmlvZDogY2RrLkR1cmF0aW9uLm1pbnV0ZXMoMSksXG4gICAgICB9KSxcbiAgICAgIHRocmVzaG9sZDogMSxcbiAgICAgIGV2YWx1YXRpb25QZXJpb2RzOiAxLFxuICAgICAgY29tcGFyaXNvbk9wZXJhdG9yOiBjbG91ZHdhdGNoLkNvbXBhcmlzb25PcGVyYXRvci5MRVNTX1RIQU5fVEhSRVNIT0xELFxuICAgICAgYWxhcm1EZXNjcmlwdGlvbjogJ1NlcnZpY2UgaGVhbHRoIGNoZWNrIGZhaWxlZCcsXG4gICAgICBhbGFybU5hbWU6IGAke3RoaXMuc2VydmljZS5zZXJ2aWNlTmFtZX0tSGVhbHRoLUNoZWNrLUZhaWxlZGAsXG4gICAgfSk7XG5cbiAgICAvLyBDcmVhdGUgU05TIHRvcGljIGZvciBhbGFybXNcbiAgICBjb25zdCBhbGFybVRvcGljID0gbmV3IHNucy5Ub3BpYyh0aGlzLCAnQWxhcm1Ub3BpYycsIHtcbiAgICAgIHRvcGljTmFtZTogYCR7dGhpcy5zZXJ2aWNlLnNlcnZpY2VOYW1lfS1hbGFybXNgLFxuICAgIH0pO1xuXG4gICAgLy8gQWRkIGFsYXJtcyB0byBTTlMgdG9waWNcbiAgICBjcHVBbGFybS5hZGRBbGFybUFjdGlvbihuZXcgYWN0aW9ucy5TbnNBY3Rpb24oYWxhcm1Ub3BpYykpO1xuICAgIG1lbW9yeUFsYXJtLmFkZEFsYXJtQWN0aW9uKG5ldyBhY3Rpb25zLlNuc0FjdGlvbihhbGFybVRvcGljKSk7XG4gICAgaGVhbHRoQWxhcm0uYWRkQWxhcm1BY3Rpb24obmV3IGFjdGlvbnMuU25zQWN0aW9uKGFsYXJtVG9waWMpKTtcblxuICAgIC8vIEFkZCBPSyBhY3Rpb25zXG4gICAgY3B1QWxhcm0uYWRkT2tBY3Rpb24obmV3IGFjdGlvbnMuU25zQWN0aW9uKGFsYXJtVG9waWMpKTtcbiAgICBtZW1vcnlBbGFybS5hZGRPa0FjdGlvbihuZXcgYWN0aW9ucy5TbnNBY3Rpb24oYWxhcm1Ub3BpYykpO1xuICAgIGhlYWx0aEFsYXJtLmFkZE9rQWN0aW9uKG5ldyBhY3Rpb25zLlNuc0FjdGlvbihhbGFybVRvcGljKSk7XG4gIH1cblxuICAvKipcbiAgICogR3JhbnQgcGVybWlzc2lvbnMgdG8gdGhlIHRhc2sgcm9sZVxuICAgKi9cbiAgcHVibGljIGdyYW50VGFza1JvbGUocGVybWlzc2lvbnM6IGlhbS5Qb2xpY3lTdGF0ZW1lbnQpOiB2b2lkIHtcbiAgICBpZiAodGhpcy50YXNrRGVmaW5pdGlvbi50YXNrUm9sZSkge1xuICAgICAgKHRoaXMudGFza0RlZmluaXRpb24udGFza1JvbGUgYXMgaWFtLlJvbGUpLmFkZFRvUG9saWN5KHBlcm1pc3Npb25zKTtcbiAgICB9XG4gIH1cblxuICAvKipcbiAgICogR3JhbnQgcGVybWlzc2lvbnMgdG8gdGhlIHRhc2sgZXhlY3V0aW9uIHJvbGVcbiAgICovXG4gIHB1YmxpYyBncmFudFRhc2tFeGVjdXRpb25Sb2xlKHBlcm1pc3Npb25zOiBpYW0uUG9saWN5U3RhdGVtZW50KTogdm9pZCB7XG4gICAgaWYgKHRoaXMudGFza0RlZmluaXRpb24uZXhlY3V0aW9uUm9sZSkge1xuICAgICAgKHRoaXMudGFza0RlZmluaXRpb24uZXhlY3V0aW9uUm9sZSBhcyBpYW0uUm9sZSkuYWRkVG9Qb2xpY3kocGVybWlzc2lvbnMpO1xuICAgIH1cbiAgfVxuXG4gIC8qKlxuICAgKiBVcGRhdGUgdGhlIHNlcnZpY2Ugd2l0aCBhIG5ldyB0YXNrIGRlZmluaXRpb25cbiAgICovXG4gIHB1YmxpYyB1cGRhdGVTZXJ2aWNlKG5ld1Rhc2tEZWZpbml0aW9uOiBlY3MuRmFyZ2F0ZVRhc2tEZWZpbml0aW9uKTogdm9pZCB7XG4gICAgaWYgKHRoaXMudGFyZ2V0R3JvdXApIHtcbiAgICAgIHRoaXMuc2VydmljZS5hdHRhY2hUb0FwcGxpY2F0aW9uVGFyZ2V0R3JvdXAodGhpcy50YXJnZXRHcm91cCk7XG4gICAgfVxuICB9XG59XG4iXX0=