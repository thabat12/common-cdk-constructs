import * as cdk from 'aws-cdk-lib';
import * as cloudwatch from 'aws-cdk-lib/aws-cloudwatch';
import * as sns from 'aws-cdk-lib/aws-sns';
import * as logs from 'aws-cdk-lib/aws-logs';
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
    tags?: {
        [key: string]: string;
    };
}
export declare class MonitoringStack extends cdk.Stack {
    readonly alarmTopic?: sns.Topic;
    readonly dashboard: cloudwatch.Dashboard;
    readonly logGroup: logs.LogGroup;
    constructor(scope: Construct, id: string, props: MonitoringStackProps);
    /**
     * Add a widget to the dashboard
     */
    addWidget(widget: cloudwatch.IWidget): void;
    /**
     * Create a CPU utilization alarm
     */
    createCpuAlarm(service: any, threshold?: number, evaluationPeriods?: number): cloudwatch.Alarm;
    /**
     * Create a memory utilization alarm
     */
    createMemoryAlarm(service: any, threshold?: number, evaluationPeriods?: number): cloudwatch.Alarm;
    /**
     * Create a service health alarm
     */
    createHealthAlarm(service: any, metric: cloudwatch.IMetric, threshold?: number, evaluationPeriods?: number): cloudwatch.Alarm;
    /**
     * Create a custom alarm
     */
    createCustomAlarm(id: string, metric: cloudwatch.IMetric, threshold: number, comparisonOperator?: cloudwatch.ComparisonOperator, evaluationPeriods?: number, alarmDescription?: string): cloudwatch.Alarm;
    /**
     * Get log retention period
     */
    private getLogRetention;
}
