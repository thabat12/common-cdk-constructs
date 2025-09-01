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
exports.MonitoringStack = void 0;
const cdk = __importStar(require("aws-cdk-lib"));
const cloudwatch = __importStar(require("aws-cdk-lib/aws-cloudwatch"));
const sns = __importStar(require("aws-cdk-lib/aws-sns"));
const actions = __importStar(require("aws-cdk-lib/aws-cloudwatch-actions"));
const iam = __importStar(require("aws-cdk-lib/aws-iam"));
const logs = __importStar(require("aws-cdk-lib/aws-logs"));
class MonitoringStack extends cdk.Stack {
    constructor(scope, id, props) {
        super(scope, id, props);
        const enableDetailedMonitoring = props.enableDetailedMonitoring ?? true;
        const enableSnsNotifications = props.enableSnsNotifications ?? true;
        const enableXRay = props.enableXRay ?? false;
        const logRetentionDays = props.logRetentionDays || 30;
        // Create SNS topic for alarms if notifications are enabled
        if (enableSnsNotifications) {
            this.alarmTopic = new sns.Topic(this, 'AlarmTopic', {
                topicName: `${props.appName}-${props.environment}-alarms`,
                displayName: `${props.appName} ${props.environment} Alarms`,
            });
            // Add email subscriptions if provided
            if (props.notificationEmails && props.notificationEmails.length > 0) {
                props.notificationEmails.forEach((email, index) => {
                    if (this.alarmTopic) {
                        new sns.Subscription(this, `EmailSubscription${index}`, {
                            topic: this.alarmTopic,
                            protocol: sns.SubscriptionProtocol.EMAIL,
                            endpoint: email,
                        });
                    }
                });
            }
            // Grant CloudWatch permissions to publish to SNS
            if (this.alarmTopic) {
                this.alarmTopic.addToResourcePolicy(new iam.PolicyStatement({
                    effect: iam.Effect.ALLOW,
                    principals: [new iam.ServicePrincipal('cloudwatch.amazonaws.com')],
                    actions: ['sns:Publish'],
                    resources: [this.alarmTopic.topicArn],
                }));
            }
        }
        // Create CloudWatch dashboard
        this.dashboard = new cloudwatch.Dashboard(this, 'Dashboard', {
            dashboardName: `${props.appName}-${props.environment}-dashboard`,
        });
        // Create log group for application logs
        this.logGroup = new logs.LogGroup(this, 'ApplicationLogs', {
            logGroupName: `/aws/${props.appName}/${props.environment}`,
            retention: this.getLogRetention(logRetentionDays),
            removalPolicy: cdk.RemovalPolicy.DESTROY,
        });
        // Add tags
        if (props.tags) {
            Object.entries(props.tags).forEach(([key, value]) => {
                cdk.Tags.of(this).add(key, value);
            });
        }
        // Add default tags
        cdk.Tags.of(this).add('Name', `${props.appName}-${props.environment}-monitoring`);
        cdk.Tags.of(this).add('Purpose', 'Monitoring and Observability');
        cdk.Tags.of(this).add('ManagedBy', 'CDK');
        // Outputs
        if (this.alarmTopic) {
            new cdk.CfnOutput(this, 'AlarmTopicArn', {
                value: this.alarmTopic.topicArn,
                description: 'SNS Topic ARN for alarms',
                exportName: `${props.appName}-${props.environment}-AlarmTopicArn`,
            });
        }
        new cdk.CfnOutput(this, 'DashboardName', {
            value: this.dashboard.dashboardName,
            description: 'CloudWatch Dashboard name',
            exportName: `${props.appName}-${props.environment}-DashboardName`,
        });
        new cdk.CfnOutput(this, 'LogGroupName', {
            value: this.logGroup.logGroupName,
            description: 'Application Log Group name',
            exportName: `${props.appName}-${props.environment}-LogGroupName`,
        });
    }
    /**
     * Add a widget to the dashboard
     */
    addWidget(widget) {
        this.dashboard.addWidgets(widget);
    }
    /**
     * Create a CPU utilization alarm
     */
    createCpuAlarm(service, threshold = 80, evaluationPeriods = 2) {
        const alarm = new cloudwatch.Alarm(this, `${service.serviceName}CpuAlarm`, {
            metric: service.metricCpuUtilization(),
            threshold,
            evaluationPeriods,
            alarmDescription: `CPU utilization is above ${threshold}%`,
            alarmName: `${service.serviceName}-CPU-High`,
        });
        if (this.alarmTopic) {
            alarm.addAlarmAction(new actions.SnsAction(this.alarmTopic));
            alarm.addOkAction(new actions.SnsAction(this.alarmTopic));
        }
        return alarm;
    }
    /**
     * Create a memory utilization alarm
     */
    createMemoryAlarm(service, threshold = 80, evaluationPeriods = 2) {
        const alarm = new cloudwatch.Alarm(this, `${service.serviceName}MemoryAlarm`, {
            metric: service.metricMemoryUtilization(),
            threshold,
            evaluationPeriods,
            alarmDescription: `Memory utilization is above ${threshold}%`,
            alarmName: `${service.serviceName}-Memory-High`,
        });
        if (this.alarmTopic) {
            alarm.addAlarmAction(new actions.SnsAction(this.alarmTopic));
            alarm.addOkAction(new actions.SnsAction(this.alarmTopic));
        }
        return alarm;
    }
    /**
     * Create a service health alarm
     */
    createHealthAlarm(service, metric, threshold = 1, evaluationPeriods = 1) {
        const alarm = new cloudwatch.Alarm(this, `${service.serviceName}HealthAlarm`, {
            metric,
            threshold,
            evaluationPeriods,
            comparisonOperator: cloudwatch.ComparisonOperator.LESS_THAN_THRESHOLD,
            alarmDescription: 'Service health check failed',
            alarmName: `${service.serviceName}-Health-Check-Failed`,
        });
        if (this.alarmTopic) {
            alarm.addAlarmAction(new actions.SnsAction(this.alarmTopic));
            alarm.addOkAction(new actions.SnsAction(this.alarmTopic));
        }
        return alarm;
    }
    /**
     * Create a custom alarm
     */
    createCustomAlarm(id, metric, threshold, comparisonOperator = cloudwatch.ComparisonOperator.GREATER_THAN_THRESHOLD, evaluationPeriods = 2, alarmDescription) {
        const alarm = new cloudwatch.Alarm(this, id, {
            metric,
            threshold,
            comparisonOperator,
            evaluationPeriods,
            alarmDescription: alarmDescription || `Metric threshold exceeded`,
            alarmName: `${id}-Alarm`,
        });
        if (this.alarmTopic) {
            alarm.addAlarmAction(new actions.SnsAction(this.alarmTopic));
            alarm.addOkAction(new actions.SnsAction(this.alarmTopic));
        }
        return alarm;
    }
    /**
     * Get log retention period
     */
    getLogRetention(days) {
        switch (days) {
            case 1:
                return logs.RetentionDays.ONE_DAY;
            case 3:
                return logs.RetentionDays.THREE_DAYS;
            case 5:
                return logs.RetentionDays.FIVE_DAYS;
            case 7:
                return logs.RetentionDays.ONE_WEEK;
            case 14:
                return logs.RetentionDays.TWO_WEEKS;
            case 30:
                return logs.RetentionDays.ONE_MONTH;
            case 60:
                return logs.RetentionDays.TWO_MONTHS;
            case 90:
                return logs.RetentionDays.THREE_MONTHS;
            case 120:
                return logs.RetentionDays.FOUR_MONTHS;
            case 150:
                return logs.RetentionDays.FIVE_MONTHS;
            case 180:
                return logs.RetentionDays.SIX_MONTHS;
            case 365:
                return logs.RetentionDays.ONE_YEAR;
            default:
                return logs.RetentionDays.ONE_MONTH;
        }
    }
}
exports.MonitoringStack = MonitoringStack;
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoibW9uaXRvcmluZy1zdGFjay5qcyIsInNvdXJjZVJvb3QiOiIiLCJzb3VyY2VzIjpbIi4uLy4uLy4uL3NyYy9jb25zdHJ1Y3RzL21vbml0b3JpbmcvbW9uaXRvcmluZy1zdGFjay50cyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiOzs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7OztBQUFBLGlEQUFtQztBQUNuQyx1RUFBeUQ7QUFDekQseURBQTJDO0FBQzNDLDRFQUE4RDtBQUM5RCx5REFBMkM7QUFDM0MsMkRBQTZDO0FBaUQ3QyxNQUFhLGVBQWdCLFNBQVEsR0FBRyxDQUFDLEtBQUs7SUFLNUMsWUFBWSxLQUFnQixFQUFFLEVBQVUsRUFBRSxLQUEyQjtRQUNuRSxLQUFLLENBQUMsS0FBSyxFQUFFLEVBQUUsRUFBRSxLQUFLLENBQUMsQ0FBQztRQUV4QixNQUFNLHdCQUF3QixHQUFHLEtBQUssQ0FBQyx3QkFBd0IsSUFBSSxJQUFJLENBQUM7UUFDeEUsTUFBTSxzQkFBc0IsR0FBRyxLQUFLLENBQUMsc0JBQXNCLElBQUksSUFBSSxDQUFDO1FBQ3BFLE1BQU0sVUFBVSxHQUFHLEtBQUssQ0FBQyxVQUFVLElBQUksS0FBSyxDQUFDO1FBQzdDLE1BQU0sZ0JBQWdCLEdBQUcsS0FBSyxDQUFDLGdCQUFnQixJQUFJLEVBQUUsQ0FBQztRQUV0RCwyREFBMkQ7UUFDM0QsSUFBSSxzQkFBc0IsRUFBRTtZQUMxQixJQUFJLENBQUMsVUFBVSxHQUFHLElBQUksR0FBRyxDQUFDLEtBQUssQ0FBQyxJQUFJLEVBQUUsWUFBWSxFQUFFO2dCQUNsRCxTQUFTLEVBQUUsR0FBRyxLQUFLLENBQUMsT0FBTyxJQUFJLEtBQUssQ0FBQyxXQUFXLFNBQVM7Z0JBQ3pELFdBQVcsRUFBRSxHQUFHLEtBQUssQ0FBQyxPQUFPLElBQUksS0FBSyxDQUFDLFdBQVcsU0FBUzthQUM1RCxDQUFDLENBQUM7WUFFSCxzQ0FBc0M7WUFDdEMsSUFBSSxLQUFLLENBQUMsa0JBQWtCLElBQUksS0FBSyxDQUFDLGtC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b3J0ICogYXMgY2RrIGZyb20gJ2F3cy1jZGstbGliJztcbmltcG9ydCAqIGFzIGNsb3Vkd2F0Y2ggZnJvbSAnYXdzLWNkay1saWIvYXdzLWNsb3Vkd2F0Y2gnO1xuaW1wb3J0ICogYXMgc25zIGZyb20gJ2F3cy1jZGstbGliL2F3cy1zbnMnO1xuaW1wb3J0ICogYXMgYWN0aW9ucyBmcm9tICdhd3MtY2RrLWxpYi9hd3MtY2xvdWR3YXRjaC1hY3Rpb25zJztcbmltcG9ydCAqIGFzIGlhbSBmcm9tICdhd3MtY2RrLWxpYi9hd3MtaWFtJztcbmltcG9ydCAqIGFzIGxvZ3MgZnJvbSAnYXdzLWNkay1saWIvYXdzLWxvZ3MnO1xuaW1wb3J0IHsgQ29uc3RydWN0IH0gZnJvbSAnY29uc3RydWN0cyc7XG5cbmV4cG9ydCBpbnRlcmZhY2UgTW9uaXRvcmluZ1N0YWNrUHJvcHMgZXh0ZW5kcyBjZGsuU3RhY2tQcm9wcyB7XG4gIC8qKlxuICAgKiBBcHBsaWNhdGlvbiBuYW1lIGZvciByZXNvdXJjZSBuYW1pbmdcbiAgICovXG4gIGFwcE5hbWU6IHN0cmluZztcbiAgXG4gIC8qKlxuICAgKiBFbnZpcm9ubWVudCBuYW1lXG4gICAqL1xuICBlbnZpcm9ubWVudDogc3RyaW5nO1xuICBcbiAgLyoqXG4gICAqIFdoZXRoZXIgdG8gZW5hYmxlIGRldGFpbGVkIG1vbml0b3JpbmdcbiAgICogQGRlZmF1bHQgdHJ1ZVxuICAgKi9cbiAgZW5hYmxlRGV0YWlsZWRNb25pdG9yaW5nPzogYm9vbGVhbjtcbiAgXG4gIC8qKlxuICAgKiBXaGV0aGVyIHRvIGVuYWJsZSBTTlMgbm90aWZpY2F0aW9uc1xuICAgKiBAZGVmYXVsdCB0cnVlXG4gICAqL1xuICBlbmFibGVTbnNOb3RpZmljYXRpb25zPzogYm9vbGVhbjtcbiAgXG4gIC8qKlxuICAgKiBFbWFpbCBhZGRyZXNzZXMgZm9yIFNOUyBub3RpZmljYXRpb25zXG4gICAqL1xuICBub3RpZmljYXRpb25FbWFpbHM/OiBzdHJpbmdbXTtcbiAgXG4gIC8qKlxuICAgKiBXaGV0aGVyIHRvIGVuYWJsZSBYLVJheSB0cmFjaW5nXG4gICAqIEBkZWZhdWx0IGZhbHNlXG4gICAqL1xuICBlbmFibGVYUmF5PzogYm9vbGVhbjtcbiAgXG4gIC8qKlxuICAgKiBMb2cgcmV0ZW50aW9uIGRheXNcbiAgICogQGRlZmF1bHQgMzBcbiAgICovXG4gIGxvZ1JldGVudGlvbkRheXM/OiBudW1iZXI7XG4gIFxuICAvKipcbiAgICogVGFncyB0byBhcHBseSB0byByZXNvdXJjZXNcbiAgICovXG4gIHRhZ3M/OiB7IFtrZXk6IHN0cmluZ106IHN0cmluZyB9O1xufVxuXG5leHBvcnQgY2xhc3MgTW9uaXRvcmluZ1N0YWNrIGV4dGVuZHMgY2RrLlN0YWNrIHtcbiAgcHVibGljIHJlYWRvbmx5IGFsYXJtVG9waWM/OiBzbnMuVG9waWM7XG4gIHB1YmxpYyByZWFkb25seSBkYXNoYm9hcmQ6IGNsb3Vkd2F0Y2guRGFzaGJvYXJkO1xuICBwdWJsaWMgcmVhZG9ubHkgbG9nR3JvdXA6IGxvZ3MuTG9nR3JvdXA7XG5cbiAgY29uc3RydWN0b3Ioc2NvcGU6IENvbnN0cnVjdCwgaWQ6IHN0cmluZywgcHJvcHM6IE1vbml0b3JpbmdTdGFja1Byb3BzKSB7XG4gICAgc3VwZXIoc2NvcGUsIGlkLCBwcm9wcyk7XG5cbiAgICBjb25zdCBlbmFibGVEZXRhaWxlZE1vbml0b3JpbmcgPSBwcm9wcy5lbmFibGVEZXRhaWxlZE1vbml0b3JpbmcgPz8gdHJ1ZTtcbiAgICBjb25zdCBlbmFibGVTbnNOb3RpZmljYXRpb25zID0gcHJvcHMuZW5hYmxlU25zTm90aWZpY2F0aW9ucyA/PyB0cnVlO1xuICAgIGNvbnN0IGVuYWJsZVhSYXkgPSBwcm9wcy5lbmFibGVYUmF5ID8/IGZhbHNlO1xuICAgIGNvbnN0IGxvZ1JldGVudGlvbkRheXMgPSBwcm9wcy5sb2dSZXRlbnRpb25EYXlzIHx8IDMwO1xuXG4gICAgLy8gQ3JlYXRlIFNOUyB0b3BpYyBmb3IgYWxhcm1zIGlmIG5vdGlmaWNhdGlvbnMgYXJlIGVuYWJsZWRcbiAgICBpZiAoZW5hYmxlU25zTm90aWZpY2F0aW9ucykge1xuICAgICAgdGhpcy5hbGFybVRvcGljID0gbmV3IHNucy5Ub3BpYyh0aGlzLCAnQWxhcm1Ub3BpYycsIHtcbiAgICAgICAgdG9waWNOYW1lOiBgJHtwcm9wcy5hcHBOYW1lfS0ke3Byb3BzLmVudmlyb25tZW50fS1hbGFybXNgLFxuICAgICAgICBkaXNwbGF5TmFtZTogYCR7cHJvcHMuYXBwTmFtZX0gJHtwcm9wcy5lbnZpcm9ubWVudH0gQWxhcm1zYCxcbiAgICAgIH0pO1xuXG4gICAgICAvLyBBZGQgZW1haWwgc3Vic2NyaXB0aW9ucyBpZiBwcm92aWRlZFxuICAgICAgaWYgKHByb3BzLm5vdGlmaWNhdGlvbkVtYWlscyAmJiBwcm9wcy5ub3RpZmljYXRpb25FbWFpbHMubGVuZ3RoID4gMCkge1xuICAgICAgICBwcm9wcy5ub3RpZmljYXRpb25FbWFpbHMuZm9yRWFjaCgoZW1haWwsIGluZGV4KSA9PiB7XG4gICAgICAgICAgaWYgKHRoaXMuYWxhcm1Ub3BpYykge1xuICAgICAgICAgICAgbmV3IHNucy5TdWJzY3JpcHRpb24odGhpcywgYEVtYWlsU3Vic2NyaXB0aW9uJHtpbmRleH1gLCB7XG4gICAgICAgICAgICAgIHRvcGljOiB0aGlzLmFsYXJtVG9waWMsXG4gICAgICAgICAgICAgIHByb3RvY29sOiBzbnMuU3Vic2NyaXB0aW9uUHJvdG9jb2wuRU1BSUwsXG4gICAgICAgICAgICAgIGVuZHBvaW50OiBlbWFpbCxcbiAgICAgICAgICAgIH0pO1xuICAgICAgICAgIH1cbiAgICAgICAgfSk7XG4gICAgICB9XG5cbiAgICAgIC8vIEdyYW50IENsb3VkV2F0Y2ggcGVybWlzc2lvbnMgdG8gcHVibGlzaCB0byBTTlNcbiAgICAgIGlmICh0aGlzLmFsYXJtVG9waWMpIHtcbiAgICAgICAgdGhpcy5hbGFybVRvcGljLmFkZFRvUmVzb3VyY2VQb2xpY3koXG4gICAgICAgICAgbmV3IGlhbS5Qb2xpY3lTdGF0ZW1lbnQoe1xuICAgICAgICAgICAgZWZmZWN0OiBpYW0uRWZmZWN0LkFMTE9XLFxuICAgICAgICAgICAgcHJpbmNpcGFsczogW25ldyBpYW0uU2VydmljZVByaW5jaXBhbCgnY2xvdWR3YXRjaC5hbWF6b25hd3MuY29tJyldLFxuICAgICAgICAgICAgYWN0aW9uczogWydzbnM6UHVibGlzaCddLFxuICAgICAgICAgICAgcmVzb3VyY2VzOiBbdGhpcy5hbGFybVRvcGljLnRvcGljQXJuXSxcbiAgICAgICAgICB9KVxuICAgICAgICApO1xuICAgICAgfVxuICAgIH1cblxuICAgIC8vIENyZWF0ZSBDbG91ZFdhdGNoIGRhc2hib2FyZFxuICAgIHRoaXMuZGFzaGJvYXJkID0gbmV3IGNsb3Vkd2F0Y2guRGFzaGJvYXJkKHRoaXMsICdEYXNoYm9hcmQnLCB7XG4gICAgICBkYXNoYm9hcmROYW1lOiBgJHtwcm9wcy5hcHBOYW1lfS0ke3Byb3BzLmVudmlyb25tZW50fS1kYXNoYm9hcmRgLFxuICAgIH0pO1xuXG4gICAgLy8gQ3JlYXRlIGxvZyBncm91cCBmb3IgYXBwbGljYXRpb24gbG9nc1xuICAgIHRoaXMubG9nR3JvdXAgPSBuZXcgbG9ncy5Mb2dHcm91cCh0aGlzLCAnQXBwbGljYXRpb25Mb2dzJywge1xuICAgICAgbG9nR3JvdXBOYW1lOiBgL2F3cy8ke3Byb3BzLmFwcE5hbWV9LyR7cHJvcHMuZW52aXJvbm1lbnR9YCxcbiAgICAgIHJldGVudGlvbjogdGhpcy5nZXRMb2dSZXRlbnRpb24obG9nUmV0ZW50aW9uRGF5cyksXG4gICAgICByZW1vdmFsUG9saWN5OiBjZGsuUmVtb3ZhbFBvbGljeS5ERVNUUk9ZLFxuICAgIH0pO1xuXG4gICAgLy8gQWRkIHRhZ3NcbiAgICBpZiAocHJvcHMudGFncykge1xuICAgICAgT2JqZWN0LmVudHJpZXMocHJvcHMudGFncykuZm9yRWFjaCgoW2tleSwgdmFsdWVdKSA9PiB7XG4gICAgICAgIGNkay5UYWdzLm9mKHRoaXMpLmFkZChrZXksIHZhbHVlKTtcbiAgICAgIH0pO1xuICAgIH1cblxuICAgIC8vIEFkZCBkZWZhdWx0IHRhZ3NcbiAgICBjZGsuVGFncy5vZih0aGlzKS5hZGQoJ05hbWUnLCBgJHtwcm9wcy5hcHBOYW1lfS0ke3Byb3BzLmVudmlyb25tZW50fS1tb25pdG9yaW5nYCk7XG4gICAgY2RrLlRhZ3Mub2YodGhpcykuYWRkKCdQdXJwb3NlJywgJ01vbml0b3JpbmcgYW5kIE9ic2VydmFiaWxpdHknKTtcbiAgICBjZGsuVGFncy5vZih0aGlzKS5hZGQoJ01hbmFnZWRCeScsICdDREsnKTtcblxuICAgIC8vIE91dHB1dHNcbiAgICBpZiAodGhpcy5hbGFybVRvcGljKSB7XG4gICAgICBuZXcgY2RrLkNmbk91dHB1dCh0aGlzLCAnQWxhcm1Ub3BpY0FybicsIHtcbiAgICAgICAgdmFsdWU6IHRoaXMuYWxhcm1Ub3BpYy50b3BpY0FybixcbiAgICAgICAgZGVzY3JpcHRpb246ICdTTlMgVG9waWMgQVJOIGZvciBhbGFybXMnLFxuICAgICAgICBleHBvcnROYW1lOiBgJHtwcm9wcy5hcHBOYW1lfS0ke3Byb3BzLmVudmlyb25tZW50fS1BbGFybVRvcGljQXJuYCxcbiAgICAgIH0pO1xuICAgIH1cblxuICAgIG5ldyBjZGsuQ2ZuT3V0cHV0KHRoaXMsICdEYXNoYm9hcmROYW1lJywge1xuICAgICAgdmFsdWU6IHRoaXMuZGFzaGJvYXJkLmRhc2hib2FyZE5hbWUsXG4gICAgICBkZXNjcmlwdGlvbjogJ0Nsb3VkV2F0Y2ggRGFzaGJvYXJkIG5hbWUnLFxuICAgICAgZXhwb3J0TmFtZTogYCR7cHJvcHMuYXBwTmFtZX0tJHtwcm9wcy5lbnZpcm9ubWVudH0tRGFzaGJvYXJkTmFtZWAsXG4gICAgfSk7XG5cbiAgICBuZXcgY2RrLkNmbk91dHB1dCh0aGlzLCAnTG9nR3JvdXBOYW1lJywge1xuICAgICAgdmFsdWU6IHRoaXMubG9nR3JvdXAubG9nR3JvdXBOYW1lLFxuICAgICAgZGVzY3JpcHRpb246ICdBcHBsaWNhdGlvbiBMb2cgR3JvdXAgbmFtZScsXG4gICAgICBleHBvcnROYW1lOiBgJHtwcm9wcy5hcHBOYW1lfS0ke3Byb3BzLmVudmlyb25tZW50fS1Mb2dHcm91cE5hbWVgLFxuICAgIH0pO1xuICB9XG5cbiAgLyoqXG4gICAqIEFkZCBhIHdpZGdldCB0byB0aGUgZGFzaGJvYXJkXG4gICAqL1xuICBwdWJsaWMgYWRkV2lkZ2V0KHdpZGdldDogY2xvdWR3YXRjaC5JV2lkZ2V0KTogdm9pZCB7XG4gICAgdGhpcy5kYXNoYm9hcmQuYWRkV2lkZ2V0cyh3aWRnZXQpO1xuICB9XG5cbiAgLyoqXG4gICAqIENyZWF0ZSBhIENQVSB1dGlsaXphdGlvbiBhbGFybVxuICAgKi9cbiAgcHVibGljIGNyZWF0ZUNwdUFsYXJtKFxuICAgIHNlcnZpY2U6IGFueSxcbiAgICB0aHJlc2hvbGQ6IG51bWJlciA9IDgwLFxuICAgIGV2YWx1YXRpb25QZXJpb2RzOiBudW1iZXIgPSAyXG4gICk6IGNsb3Vkd2F0Y2guQWxhcm0ge1xuICAgIGNvbnN0IGFsYXJtID0gbmV3IGNsb3Vkd2F0Y2guQWxhcm0odGhpcywgYCR7c2VydmljZS5zZXJ2aWNlTmFtZX1DcHVBbGFybWAsIHtcbiAgICAgIG1ldHJpYzogc2VydmljZS5tZXRyaWNDcHVVdGlsaXphdGlvbigpLFxuICAgICAgdGhyZXNob2xkLFxuICAgICAgZXZhbHVhdGlvblBlcmlvZHMsXG4gICAgICBhbGFybURlc2NyaXB0aW9uOiBgQ1BVIHV0aWxpemF0aW9uIGlzIGFib3ZlICR7dGhyZXNob2xkfSVgLFxuICAgICAgYWxhcm1OYW1lOiBgJHtzZXJ2aWNlLnNlcnZpY2VOYW1lfS1DUFUtSGlnaGAsXG4gICAgfSk7XG5cbiAgICBpZiAodGhpcy5hbGFybVRvcGljKSB7XG4gICAgICBhbGFybS5hZGRBbGFybUFjdGlvbihuZXcgYWN0aW9ucy5TbnNBY3Rpb24odGhpcy5hbGFybVRvcGljKSk7XG4gICAgICBhbGFybS5hZGRPa0FjdGlvbihuZXcgYWN0aW9ucy5TbnNBY3Rpb24odGhpcy5hbGFybVRvcGljKSk7XG4gICAgfVxuXG4gICAgcmV0dXJuIGFsYXJtO1xuICB9XG5cbiAgLyoqXG4gICAqIENyZWF0ZSBhIG1lbW9yeSB1dGlsaXphdGlvbiBhbGFybVxuICAgKi9cbiAgcHVibGljIGNyZWF0ZU1lbW9yeUFsYXJtKFxuICAgIHNlcnZpY2U6IGFueSxcbiAgICB0aHJlc2hvbGQ6IG51bWJlciA9IDgwLFxuICAgIGV2YWx1YXRpb25QZXJpb2RzOiBudW1iZXIgPSAyXG4gICk6IGNsb3Vkd2F0Y2guQWxhcm0ge1xuICAgIGNvbnN0IGFsYXJtID0gbmV3IGNsb3Vkd2F0Y2guQWxhcm0odGhpcywgYCR7c2VydmljZS5zZXJ2aWNlTmFtZX1NZW1vcnlBbGFybWAsIHtcbiAgICAgIG1ldHJpYzogc2VydmljZS5tZXRyaWNNZW1vcnlVdGlsaXphdGlvbigpLFxuICAgICAgdGhyZXNob2xkLFxuICAgICAgZXZhbHVhdGlvblBlcmlvZHMsXG4gICAgICBhbGFybURlc2NyaXB0aW9uOiBgTWVtb3J5IHV0aWxpemF0aW9uIGlzIGFib3ZlICR7dGhyZXNob2xkfSVgLFxuICAgICAgYWxhcm1OYW1lOiBgJHtzZXJ2aWNlLnNlcnZpY2VOYW1lfS1NZW1vcnktSGlnaGAsXG4gICAgfSk7XG5cbiAgICBpZiAodGhpcy5hbGFybVRvcGljKSB7XG4gICAgICBhbGFybS5hZGRBbGFybUFjdGlvbihuZXcgYWN0aW9ucy5TbnNBY3Rpb24odGhpcy5hbGFybVRvcGljKSk7XG4gICAgICBhbGFybS5hZGRPa0FjdGlvbihuZXcgYWN0aW9ucy5TbnNBY3Rpb24odGhpcy5hbGFybVRvcGljKSk7XG4gICAgfVxuXG4gICAgcmV0dXJuIGFsYXJtO1xuICB9XG5cbiAgLyoqXG4gICAqIENyZWF0ZSBhIHNlcnZpY2UgaGVhbHRoIGFsYXJtXG4gICAqL1xuICBwdWJsaWMgY3JlYXRlSGVhbHRoQWxhcm0oXG4gICAgc2VydmljZTogYW55LFxuICAgIG1ldHJpYzogY2xvdWR3YXRjaC5JTWV0cmljLFxuICAgIHRocmVzaG9sZDogbnVtYmVyID0gMSxcbiAgICBldmFsdWF0aW9uUGVyaW9kczogbnVtYmVyID0gMVxuICApOiBjbG91ZHdhdGNoLkFsYXJtIHtcbiAgICBjb25zdCBhbGFybSA9IG5ldyBjbG91ZHdhdGNoLkFsYXJtKHRoaXMsIGAke3NlcnZpY2Uuc2VydmljZU5hbWV9SGVhbHRoQWxhcm1gLCB7XG4gICAgICBtZXRyaWMsXG4gICAgICB0aHJlc2hvbGQsXG4gICAgICBldmFsdWF0aW9uUGVyaW9kcyxcbiAgICAgIGNvbXBhcmlzb25PcGVyYXRvcjogY2xvdWR3YXRjaC5Db21wYXJpc29uT3BlcmF0b3IuTEVTU19USEFOX1RIUkVTSE9MRCxcbiAgICAgIGFsYXJtRGVzY3JpcHRpb246ICdTZXJ2aWNlIGhlYWx0aCBjaGVjayBmYWlsZWQnLFxuICAgICAgYWxhcm1OYW1lOiBgJHtzZXJ2aWNlLnNlcnZpY2VOYW1lfS1IZWFsdGgtQ2hlY2stRmFpbGVkYCxcbiAgICB9KTtcblxuICAgIGlmICh0aGlzLmFsYXJtVG9waWMpIHtcbiAgICAgIGFsYXJtLmFkZEFsYXJtQWN0aW9uKG5ldyBhY3Rpb25zLlNuc0FjdGlvbih0aGlzLmFsYXJtVG9waWMpKTtcbiAgICAgIGFsYXJtLmFkZE9rQWN0aW9uKG5ldyBhY3Rpb25zLlNuc0FjdGlvbih0aGlzLmFsYXJtVG9waWMpKTtcbiAgICB9XG5cbiAgICByZXR1cm4gYWxhcm07XG4gIH1cblxuICAvKipcbiAgICogQ3JlYXRlIGEgY3VzdG9tIGFsYXJtXG4gICAqL1xuICBwdWJsaWMgY3JlYXRlQ3VzdG9tQWxhcm0oXG4gICAgaWQ6IHN0cmluZyxcbiAgICBtZXRyaWM6IGNsb3Vkd2F0Y2guSU1ldHJpYyxcbiAgICB0aHJlc2hvbGQ6IG51bWJlcixcbiAgICBjb21wYXJpc29uT3BlcmF0b3I6IGNsb3Vkd2F0Y2guQ29tcGFyaXNvbk9wZXJhdG9yID0gY2xvdWR3YXRjaC5Db21wYXJpc29uT3BlcmF0b3IuR1JFQVRFUl9USEFOX1RIUkVTSE9MRCxcbiAgICBldmFsdWF0aW9uUGVyaW9kczogbnVtYmVyID0gMixcbiAgICBhbGFybURlc2NyaXB0aW9uPzogc3RyaW5nXG4gICk6IGNsb3Vkd2F0Y2guQWxhcm0ge1xuICAgIGNvbnN0IGFsYXJtID0gbmV3IGNsb3Vkd2F0Y2guQWxhcm0odGhpcywgaWQsIHtcbiAgICAgIG1ldHJpYyxcbiAgICAgIHRocmVzaG9sZCxcbiAgICAgIGNvbXBhcmlzb25PcGVyYXRvcixcbiAgICAgIGV2YWx1YXRpb25QZXJpb2RzLFxuICAgICAgYWxhcm1EZXNjcmlwdGlvbjogYWxhcm1EZXNjcmlwdGlvbiB8fCBgTWV0cmljIHRocmVzaG9sZCBleGNlZWRlZGAsXG4gICAgICBhbGFybU5hbWU6IGAke2lkfS1BbGFybWAsXG4gICAgfSk7XG5cbiAgICBpZiAodGhpcy5hbGFybVRvcGljKSB7XG4gICAgICBhbGFybS5hZGRBbGFybUFjdGlvbihuZXcgYWN0aW9ucy5TbnNBY3Rpb24odGhpcy5hbGFybVRvcGljKSk7XG4gICAgICBhbGFybS5hZGRPa0FjdGlvbihuZXcgYWN0aW9ucy5TbnNBY3Rpb24odGhpcy5hbGFybVRvcGljKSk7XG4gICAgfVxuXG4gICAgcmV0dXJuIGFsYXJtO1xuICB9XG5cbiAgLyoqXG4gICAqIEdldCBsb2cgcmV0ZW50aW9uIHBlcmlvZFxuICAgKi9cbiAgcHJpdmF0ZSBnZXRMb2dSZXRlbnRpb24oZGF5czogbnVtYmVyKTogbG9ncy5SZXRlbnRpb25EYXlzIHtcbiAgICBzd2l0Y2ggKGRheXMpIHtcbiAgICAgIGNhc2UgMTpcbiAgICAgICAgcmV0dXJuIGxvZ3MuUmV0ZW50aW9uRGF5cy5PTkVfREFZO1xuICAgICAgY2FzZSAzOlxuICAgICAgICByZXR1cm4gbG9ncy5SZXRlbnRpb25EYXlzLlRIUkVFX0RBWVM7XG4gICAgICBjYXNlIDU6XG4gICAgICAgIHJldHVybiBsb2dzLlJldGVudGlvbkRheXMuRklWRV9EQVlTO1xuICAgICAgY2FzZSA3OlxuICAgICAgICByZXR1cm4gbG9ncy5SZXRlbnRpb25EYXlzLk9ORV9XRUVLO1xuICAgICAgY2FzZSAxNDpcbiAgICAgICAgcmV0dXJuIGxvZ3MuUmV0ZW50aW9uRGF5cy5UV09fV0VFS1M7XG4gICAgICBjYXNlIDMwOlxuICAgICAgICByZXR1cm4gbG9ncy5SZXRlbnRpb25EYXlzLk9ORV9NT05USDtcbiAgICAgIGNhc2UgNjA6XG4gICAgICAgIHJldHVybiBsb2dzLlJldGVudGlvbkRheXMuVFdPX01PTlRIUztcbiAgICAgIGNhc2UgOTA6XG4gICAgICAgIHJldHVybiBsb2dzLlJldGVudGlvbkRheXMuVEhSRUVfTU9OVEhTO1xuICAgICAgY2FzZSAxMjA6XG4gICAgICAgIHJldHVybiBsb2dzLlJldGVudGlvbkRheXMuRk9VUl9NT05USFM7XG4gICAgICBjYXNlIDE1MDpcbiAgICAgICAgcmV0dXJuIGxvZ3MuUmV0ZW50aW9uRGF5cy5GSVZFX01PTlRIUztcbiAgICAgIGNhc2UgMTgwOlxuICAgICAgICByZXR1cm4gbG9ncy5SZXRlbnRpb25EYXlzLlNJWF9NT05USFM7XG4gICAgICBjYXNlIDM2NTpcbiAgICAgICAgcmV0dXJuIGxvZ3MuUmV0ZW50aW9uRGF5cy5PTkVfWUVBUjtcbiAgICAgIGRlZmF1bHQ6XG4gICAgICAgIHJldHVybiBsb2dzLlJldGVudGlvbkRheXMuT05FX01PTlRIO1xuICAgIH1cbiAgfVxufVxuIl19