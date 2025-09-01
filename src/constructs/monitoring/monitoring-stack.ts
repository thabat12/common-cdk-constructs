import * as cdk from 'aws-cdk-lib';
import * as cloudwatch from 'aws-cdk-lib/aws-cloudwatch';
import * as sns from 'aws-cdk-lib/aws-sns';
import * as actions from 'aws-cdk-lib/aws-cloudwatch-actions';
import * as iam from 'aws-cdk-lib/aws-iam';
import * as logs from 'aws-cdk-lib/aws-logs';
import * as ecs from 'aws-cdk-lib/aws-ecs';
import { Construct } from 'constructs';

export interface MonitoringStackProps extends cdk.StackProps {
  /**
   * Application name for resource naming
   */
  appName: string;
  
  /**
   * Environment name
   */
  environment: string;
  
  /**
   * Whether to enable detailed monitoring
   * @default true
   */
  enableDetailedMonitoring?: boolean;
  
  /**
   * Whether to enable SNS notifications
   * @default true
   */
  enableSnsNotifications?: boolean;
  
  /**
   * Email addresses for SNS notifications
   */
  notificationEmails?: string[];
  
  /**
   * Whether to enable X-Ray tracing
   * @default false
   */
  enableXRay?: boolean;
  
  /**
   * Log retention days
   * @default 30
   */
  logRetentionDays?: number;
  
  /**
   * Tags to apply to resources
   */
  tags?: { [key: string]: string };
}

export class MonitoringStack extends cdk.Stack {
  public readonly alarmTopic?: sns.Topic;
  public readonly dashboard: cloudwatch.Dashboard;
  public readonly logGroup: logs.LogGroup;

  constructor(scope: Construct, id: string, props: MonitoringStackProps) {
    super(scope, id, props);

    // TODO: Implement detailed monitoring functionality
    // const enableDetailedMonitoring = props.enableDetailedMonitoring ?? true;
    const enableSnsNotifications = props.enableSnsNotifications ?? true;
    // TODO: Implement X-Ray functionality
    // const enableXRay = props.enableXRay ?? false;
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
        this.alarmTopic.addToResourcePolicy(
          new iam.PolicyStatement({
            effect: iam.Effect.ALLOW,
            principals: [new iam.ServicePrincipal('cloudwatch.amazonaws.com')],
            actions: ['sns:Publish'],
            resources: [this.alarmTopic.topicArn],
          })
        );
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
  public addWidget(widget: cloudwatch.IWidget): void {
    this.dashboard.addWidgets(widget);
  }

  /**
   * Create a CPU utilization alarm
   */
  public createCpuAlarm(
    service: ecs.FargateService,
    threshold: number = 80,
    evaluationPeriods: number = 2
  ): cloudwatch.Alarm {
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
  public createMemoryAlarm(
    service: ecs.FargateService,
    threshold: number = 80,
    evaluationPeriods: number = 2
  ): cloudwatch.Alarm {
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
  public createHealthAlarm(
    service: ecs.FargateService,
    metric: cloudwatch.IMetric,
    threshold: number = 1,
    evaluationPeriods: number = 1
  ): cloudwatch.Alarm {
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
  public createCustomAlarm(
    id: string,
    metric: cloudwatch.IMetric,
    threshold: number,
    comparisonOperator: cloudwatch.ComparisonOperator = cloudwatch.ComparisonOperator.GREATER_THAN_THRESHOLD,
    evaluationPeriods: number = 2,
    alarmDescription?: string
  ): cloudwatch.Alarm {
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
  private getLogRetention(days: number): logs.RetentionDays {
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
