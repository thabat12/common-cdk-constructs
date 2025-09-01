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
exports.DatabaseStack = void 0;
const cdk = __importStar(require("aws-cdk-lib"));
const ec2 = __importStar(require("aws-cdk-lib/aws-ec2"));
const rds = __importStar(require("aws-cdk-lib/aws-rds"));
const dynamodb = __importStar(require("aws-cdk-lib/aws-dynamodb"));
const iam = __importStar(require("aws-cdk-lib/aws-iam"));
const logs = __importStar(require("aws-cdk-lib/aws-logs"));
class DatabaseStack extends cdk.Stack {
    constructor(scope, id, props) {
        super(scope, id, props);
        const enableRds = props.enableRds ?? false;
        const enableDynamoDb = props.enableDynamoDb ?? false;
        const rdsInstanceType = props.rdsInstanceType || ec2.InstanceType.of(ec2.InstanceClass.T3, ec2.InstanceSize.MICRO);
        const rdsDatabaseName = props.rdsDatabaseName || 'appdb';
        const rdsMasterUsername = props.rdsMasterUsername || 'admin';
        const dynamoDbBillingMode = props.dynamoDbBillingMode || dynamodb.BillingMode.PAY_PER_REQUEST;
        const dynamoDbRemovalPolicy = props.dynamoDbRemovalPolicy || cdk.RemovalPolicy.DESTROY;
        // Create database security group
        this.databaseSecurityGroup = new ec2.SecurityGroup(this, 'DatabaseSecurityGroup', {
            vpc: props.vpc,
            description: `Database security group for ${props.appName}`,
            allowAllOutbound: false,
        });
        // Allow inbound traffic from VPC CIDR
        this.databaseSecurityGroup.addIngressRule(ec2.Peer.ipv4(props.vpc.vpcCidrBlock), ec2.Port.tcp(3306), // MySQL
        'Allow MySQL from VPC');
        this.databaseSecurityGroup.addIngressRule(ec2.Peer.ipv4(props.vpc.vpcCidrBlock), ec2.Port.tcp(5432), // PostgreSQL
        'Allow PostgreSQL from VPC');
        // Create RDS instance if enabled
        if (enableRds) {
            // Create credentials
            const rdsCredentials = rds.Credentials.fromGeneratedSecret(rdsMasterUsername, {
                secretName: `${props.appName}-${props.environment}-rds-credentials`,
            });
            // Create RDS instance
            this.rdsInstance = new rds.DatabaseInstance(this, 'Database', {
                engine: rds.DatabaseInstanceEngine.mysql({
                    version: rds.MysqlEngineVersion.VER_8_0_28,
                }),
                instanceType: rdsInstanceType,
                databaseName: rdsDatabaseName,
                credentials: rdsCredentials,
                vpc: props.vpc,
                vpcSubnets: {
                    subnetType: ec2.SubnetType.PRIVATE_ISOLATED,
                },
                securityGroups: [this.databaseSecurityGroup],
                backupRetention: cdk.Duration.days(7),
                deleteAutomatedBackups: true,
                deletionProtection: false,
                removalPolicy: cdk.RemovalPolicy.DESTROY,
                storageEncrypted: true,
                storageEncryptionKey: props.kmsKey,
                enablePerformanceInsights: true,
                performanceInsightRetention: rds.PerformanceInsightRetention.DEFAULT,
                cloudwatchLogsExports: ['error', 'general', 'slowquery'],
                cloudwatchLogsRetention: logs.RetentionDays.ONE_WEEK,
                monitoringInterval: cdk.Duration.minutes(1),
            });
            // Grant permissions to read secrets
            if (this.rdsInstance.secret) {
                this.rdsInstance.secret.grantRead(new iam.AccountPrincipal(cdk.Stack.of(this).account));
            }
        }
        // Create DynamoDB table if enabled
        if (enableDynamoDb) {
            this.dynamoDbTable = new dynamodb.Table(this, 'Table', {
                tableName: `${props.appName}-${props.environment}`,
                billingMode: dynamoDbBillingMode,
                removalPolicy: dynamoDbRemovalPolicy,
                partitionKey: {
                    name: 'id',
                    type: dynamodb.AttributeType.STRING,
                },
                sortKey: {
                    name: 'timestamp',
                    type: dynamodb.AttributeType.STRING,
                },
                timeToLiveAttribute: 'ttl',
                pointInTimeRecovery: true,
                encryption: props.kmsKey ? dynamodb.TableEncryption.CUSTOMER_MANAGED : dynamodb.TableEncryption.DEFAULT,
                encryptionKey: props.kmsKey,
                stream: dynamodb.StreamViewType.NEW_AND_OLD_IMAGES,
            });
            // Add GSI for common query patterns
            this.dynamoDbTable.addGlobalSecondaryIndex({
                indexName: 'GSI1',
                partitionKey: {
                    name: 'GSI1PK',
                    type: dynamodb.AttributeType.STRING,
                },
                sortKey: {
                    name: 'GSI1SK',
                    type: dynamodb.AttributeType.STRING,
                },
                projectionType: dynamodb.ProjectionType.ALL,
            });
            // Add auto-scaling if using provisioned billing
            if (dynamoDbBillingMode === dynamodb.BillingMode.PROVISIONED) {
                const readScaling = this.dynamoDbTable.autoScaleReadCapacity({
                    minCapacity: 5,
                    maxCapacity: 100,
                });
                readScaling.scaleOnUtilization({
                    targetUtilizationPercent: 70,
                });
                const writeScaling = this.dynamoDbTable.autoScaleWriteCapacity({
                    minCapacity: 5,
                    maxCapacity: 100,
                });
                writeScaling.scaleOnUtilization({
                    targetUtilizationPercent: 70,
                });
            }
        }
        // Add tags
        if (props.tags) {
            Object.entries(props.tags).forEach(([key, value]) => {
                cdk.Tags.of(this).add(key, value);
            });
        }
        // Add default tags
        cdk.Tags.of(this).add('Name', `${props.appName}-${props.environment}-database`);
        cdk.Tags.of(this).add('Purpose', 'Database Infrastructure');
        cdk.Tags.of(this).add('ManagedBy', 'CDK');
        // Outputs
        if (this.rdsInstance) {
            new cdk.CfnOutput(this, 'RDSInstanceEndpoint', {
                value: this.rdsInstance.instanceEndpoint.hostname,
                description: 'RDS instance endpoint',
                exportName: `${props.appName}-${props.environment}-RDSInstanceEndpoint`,
            });
            new cdk.CfnOutput(this, 'RDSInstancePort', {
                value: this.rdsInstance.instanceEndpoint.port.toString(),
                description: 'RDS instance port',
                exportName: `${props.appName}-${props.environment}-RDSInstancePort`,
            });
            if (this.rdsInstance.secret) {
                new cdk.CfnOutput(this, 'RDSSecretArn', {
                    value: this.rdsInstance.secret.secretArn,
                    description: 'RDS secret ARN',
                    exportName: `${props.appName}-${props.environment}-RDSSecretArn`,
                });
            }
        }
        if (this.dynamoDbTable) {
            new cdk.CfnOutput(this, 'DynamoDBTableName', {
                value: this.dynamoDbTable.tableName,
                description: 'DynamoDB table name',
                exportName: `${props.appName}-${props.environment}-DynamoDBTableName`,
            });
            new cdk.CfnOutput(this, 'DynamoDBTableArn', {
                value: this.dynamoDbTable.tableArn,
                description: 'DynamoDB table ARN',
                exportName: `${props.appName}-${props.environment}-DynamoDBTableArn`,
            });
        }
        if (this.databaseSecurityGroup) {
            new cdk.CfnOutput(this, 'DatabaseSecurityGroupId', {
                value: this.databaseSecurityGroup.securityGroupId,
                description: 'Database Security Group ID',
                exportName: `${props.appName}-${props.environment}-DatabaseSecurityGroupId`,
            });
        }
    }
    /**
     * Grant read permissions to a role
     */
    grantReadData(role) {
        if (this.dynamoDbTable) {
            this.dynamoDbTable.grantReadData(role);
        }
    }
    /**
     * Grant write permissions to a role
     */
    grantWriteData(role) {
        if (this.dynamoDbTable) {
            this.dynamoDbTable.grantWriteData(role);
        }
    }
    /**
     * Grant read/write permissions to a role
     */
    grantReadWriteData(role) {
        if (this.dynamoDbTable) {
            this.dynamoDbTable.grantReadWriteData(role);
        }
    }
    /**
     * Grant RDS permissions to a role
     */
    grantRdsPermissions(role) {
        if (this.rdsInstance) {
            role.addToPolicy(new iam.PolicyStatement({
                effect: iam.Effect.ALLOW,
                actions: [
                    'rds-db:connect',
                ],
                resources: [
                    `arn:aws:rds-db:${cdk.Stack.of(this).region}:${cdk.Stack.of(this).account}:dbuser:${this.rdsInstance.instanceResourceId}/*`,
                ],
            }));
        }
    }
}
exports.DatabaseStack = DatabaseStack;
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiZGF0YWJhc2Utc3RhY2suanMiLCJzb3VyY2VSb290IjoiIiwic291cmNlcyI6WyIuLi8uLi8uLi9zcmMvY29uc3RydWN0cy9kYXRhYmFzZS9kYXRhYmFzZS1zdGFjay50cyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiOzs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7OztBQUFBLGlEQUFtQztBQUNuQyx5REFBMkM7QUFDM0MseURBQTJDO0FBQzNDLG1FQUFxRDtBQUNyRCx5REFBMkM7QUFFM0MsMkRBQTZDO0FBd0U3QyxNQUFhLGFBQWMsU0FBUSxHQUFHLENBQUMsS0FBSztJQU0xQyxZQUFZLEtBQWdCLEVBQUUsRUFBVSxFQUFFLEtBQXlCO1FBQ2pFLEtBQUssQ0FBQyxLQUFLLEVBQUUsRUFBRSxFQUFFLEtBQUssQ0FBQyxDQUFDO1FBRXhCLE1BQU0sU0FBUyxHQUFHLEtBQUssQ0FBQyxTQUFTLElBQUksS0FBSyxDQUFDO1FBQzNDLE1BQU0sY0FBYyxHQUFHLEtBQUssQ0FBQyxjQUFjLElBQUksS0FBSyxDQUFDO1FBQ3JELE1BQU0sZUFBZSxHQUFHLEtBQUssQ0FBQyxlQUFlLElBQUksR0FBRyxDQUFDLFlBQVksQ0FBQyxFQUFFLENBQUMsR0FBRyxDQUFDLGFBQWEsQ0FBQyxFQUFFLEVBQUUsR0FBRyxDQUFDLFlBQVksQ0FBQyxLQUFLLENBQUMsQ0FBQztRQUNuSCxNQUFNLGVBQWUsR0FBRyxLQUFLLENBQUMsZUFBZSxJQUFJLE9BQU8sQ0FBQztRQUN6RCxNQUFNLGlCQUFpQixHQUFHLEtBQUssQ0FBQyxpQkFBaUIsSUFBSSxPQUFPLENBQUM7UUFDN0QsTUFBTSxtQkFBbUIsR0FBRyxLQUFLLENBQUMsbUJBQW1CLElBQUksUUFBUSxDQUFDLFdBQVcsQ0FBQyxlQUFlLENBQUM7UUFDOUYsTUFBTSxxQkFBcUIsR0FBRyxLQUFLLENBQUMscUJBQXFCLElBQUksR0FBRyxDQUFDLGFBQWEsQ0FBQyxPQUFPLENBQUM7UUFFdkYsaUNBQWlDO1FBQ2pDLElBQUksQ0FBQyxxQkFB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SUFDSSxrQkFBa0IsQ0FBQyxJQUFlO1FBQ3ZDLElBQUksSUFBSSxDQUFDLGFBQWEsRUFBRTtZQUN0QixJQUFJLENBQUMsYUFBYSxDQUFDLGtCQUFrQixDQUFDLElBQUksQ0FBQyxDQUFDO1NBQzdDO0lBQ0gsQ0FBQztJQUVEOztPQUVHO0lBQ0ksbUJBQW1CLENBQUMsSUFBZTtRQUN4QyxJQUFJLElBQUksQ0FBQyxXQUFXLEVBQUU7WUFDbkIsSUFBaUIsQ0FBQyxXQUFXLENBQzVCLElBQUksR0FBRyxDQUFDLGVBQWUsQ0FBQztnQkFDdEIsTUFBTSxFQUFFLEdBQUcsQ0FBQyxNQUFNLENBQUMsS0FBSztnQkFDeEIsT0FBTyxFQUFFO29CQUNQLGdCQUFnQjtpQkFDakI7Z0JBQ0QsU0FBUyxFQUFFO29CQUNULGtCQUFrQixHQUFHLENBQUMsS0FBSyxDQUFDLEVBQUUsQ0FBQyxJQUFJLENBQUMsQ0FBQyxNQUFNLElBQUksR0FBRyxDQUFDLEtBQUssQ0FBQyxFQUFFLENBQUMsSUFBSSxDQUFDLENBQUMsT0FBTyxXQUFXLElBQUksQ0FBQyxXQUFXLENBQUMsa0JBQWtCLElBQUk7aUJBQzVIO2FBQ0YsQ0FBQyxDQUNILENBQUM7U0FDSDtJQUNILENBQUM7Q0FDRjtBQTVPRCxzQ0E0T0MiLCJzb3VyY2VzQ29udGVudCI6WyJpbXBvcnQgKiBhcyBjZGsgZnJvbSAnYXdzLWNkay1saWInO1xuaW1wb3J0ICogYXMgZWMyIGZyb20gJ2F3cy1jZGstbGliL2F3cy1lYzInO1xuaW1wb3J0ICogYXMgcmRzIGZyb20gJ2F3cy1jZGstbGliL2F3cy1yZHMnO1xuaW1wb3J0ICogYXMgZHluYW1vZGIgZnJvbSAnYXdzLWNkay1saWIvYXdzLWR5bmFtb2RiJztcbmltcG9ydCAqIGFzIGlhbSBmcm9tICdhd3MtY2RrLWxpYi9hd3MtaWFtJztcbmltcG9ydCAqIGFzIGttcyBmcm9tICdhd3MtY2RrLWxpYi9hd3Mta21zJztcbmltcG9ydCAqIGFzIGxvZ3MgZnJvbSAnYXdzLWNkay1saWIvYXdzLWxvZ3MnO1xuaW1wb3J0IHsgQ29uc3RydWN0IH0gZnJvbSAnY29uc3RydWN0cyc7XG5cbmV4cG9ydCBpbnRlcmZhY2UgRGF0YWJhc2VTdGFja1Byb3BzIGV4dGVuZHMgY2RrLlN0YWNrUHJvcHMge1xuICAvKipcbiAgICogVGhlIFZQQyB3aGVyZSBkYXRhYmFzZSByZXNvdXJjZXMgd2lsbCBiZSBjcmVhdGVkXG4gICAqL1xuICB2cGM6IGVjMi5JVnBjO1xuICBcbiAgLyoqXG4gICAqIEFwcGxpY2F0aW9uIG5hbWUgZm9yIHJlc291cmNlIG5hbWluZ1xuICAgKi9cbiAgYXBwTmFtZTogc3RyaW5nO1xuICBcbiAgLyoqXG4gICAqIEVudmlyb25tZW50IG5hbWVcbiAgICovXG4gIGVudmlyb25tZW50OiBzdHJpbmc7XG4gIFxuICAvKipcbiAgICogV2hldGhlciB0byBlbmFibGUgUkRTXG4gICAqIEBkZWZhdWx0IGZhbHNlXG4gICAqL1xuICBlbmFibGVSZHM/OiBib29sZWFuO1xuICBcbiAgLyoqXG4gICAqIFdoZXRoZXIgdG8gZW5hYmxlIER5bmFtb0RCXG4gICAqIEBkZWZhdWx0IGZhbHNlXG4gICAqL1xuICBlbmFibGVEeW5hbW9EYj86IGJvb2xlYW47XG4gIFxuICAvKipcbiAgICogUkRTIGluc3RhbmNlIHR5cGVcbiAgICogQGRlZmF1bHQgdDMubWljcm9cbiAgICovXG4gIHJkc0luc3RhbmNlVHlwZT86IGVjMi5JbnN0YW5jZVR5cGU7XG4gIFxuICAvKipcbiAgICogUkRTIGRhdGFiYXNlIG5hbWVcbiAgICogQGRlZmF1bHQgYXBwZGJcbiAgICovXG4gIHJkc0RhdGFiYXNlTmFtZT86IHN0cmluZztcbiAgXG4gIC8qKlxuICAgKiBSRFMgbWFzdGVyIHVzZXJuYW1lXG4gICAqIEBkZWZhdWx0IGFkbWluXG4gICAqL1xuICByZHNNYXN0ZXJVc2VybmFtZT86IHN0cmluZztcbiAgXG4gIC8qKlxuICAgKiBEeW5hbW9EQiBiaWxsaW5nIG1vZGVcbiAgICogQGRlZmF1bHQgUEFZX1BFUl9SRVFVRVNUXG4gICAqL1xuICBkeW5hbW9EYkJpbGxpbmdNb2RlPzogZHluYW1vZGIuQmlsbGluZ01vZGU7XG4gIFxuICAvKipcbiAgICogRHluYW1vREIgcmVtb3ZhbCBwb2xpY3lcbiAgICogQGRlZmF1bHQgREVTVFJPWVxuICAgKi9cbiAgZHluYW1vRGJSZW1vdmFsUG9saWN5PzogY2RrLlJlbW92YWxQb2xpY3k7XG4gIFxuICAvKipcbiAgICogS01TIGtleSBmb3IgZW5jcnlwdGlvblxuICAgKi9cbiAga21zS2V5Pzoga21zLklLZXk7XG4gIFxuICAvKipcbiAgICogVGFncyB0byBhcHBseSB0byByZXNvdXJjZXNcbiAgICovXG4gIHRhZ3M/OiB7IFtrZXk6IHN0cmluZ106IHN0cmluZyB9O1xufVxuXG5leHBvcnQgY2xhc3MgRGF0YWJhc2VTdGFjayBleHRlbmRzIGNkay5TdGFjayB7XG4gIHB1YmxpYyByZWFkb25seSByZHNJbnN0YW5jZT86IHJkcy5EYXRhYmFzZUluc3RhbmNlO1xuICBwdWJsaWMgcmVhZG9ubHkgcmRzQ2x1c3Rlcj86IHJkcy5EYXRhYmFzZUNsdXN0ZXI7XG4gIHB1YmxpYyByZWFkb25seSBkeW5hbW9EYlRhYmxlPzogZHluYW1vZGIuVGFibGU7XG4gIHB1YmxpYyByZWFkb25seSBkYXRhYmFzZVNlY3VyaXR5R3JvdXA/OiBlYzIuU2VjdXJpdHlHcm91cDtcblxuICBjb25zdHJ1Y3RvcihzY29wZTogQ29uc3RydWN0LCBpZDogc3RyaW5nLCBwcm9wczogRGF0YWJhc2VTdGFja1Byb3BzKSB7XG4gICAgc3VwZXIoc2NvcGUsIGlkLCBwcm9wcyk7XG5cbiAgICBjb25zdCBlbmFibGVSZHMgPSBwcm9wcy5lbmFibGVSZHMgPz8gZmFsc2U7XG4gICAgY29uc3QgZW5hYmxlRHluYW1vRGIgPSBwcm9wcy5lbmFibGVEeW5hbW9EYiA/PyBmYWxzZTtcbiAgICBjb25zdCByZHNJbnN0YW5jZVR5cGUgPSBwcm9wcy5yZHNJbnN0YW5jZVR5cGUgfHwgZWMyLkluc3RhbmNlVHlwZS5vZihlYzIuSW5zdGFuY2VDbGFzcy5UMywgZWMyLkluc3RhbmNlU2l6ZS5NSUNSTyk7XG4gICAgY29uc3QgcmRzRGF0YWJhc2VOYW1lID0gcHJvcHMucmRzRGF0YWJhc2VOYW1lIHx8ICdhcHBkYic7XG4gICAgY29uc3QgcmRzTWFzdGVyVXNlcm5hbWUgPSBwcm9wcy5yZHNNYXN0ZXJVc2VybmFtZSB8fCAnYWRtaW4nO1xuICAgIGNvbnN0IGR5bmFtb0RiQmlsbGluZ01vZGUgPSBwcm9wcy5keW5hbW9EYkJpbGxpbmdNb2RlIHx8IGR5bmFtb2RiLkJpbGxpbmdNb2RlLlBBWV9QRVJfUkVRVUVTVDtcbiAgICBjb25zdCBkeW5hbW9EYlJlbW92YWxQb2xpY3kgPSBwcm9wcy5keW5hbW9EYlJlbW92YWxQb2xpY3kgfHwgY2RrLlJlbW92YWxQb2xpY3kuREVTVFJPWTtcblxuICAgIC8vIENyZWF0ZSBkYXRhYmFzZSBzZWN1cml0eSBncm91cFxuICAgIHRoaXMuZGF0YWJhc2VTZWN1cml0eUdyb3VwID0gbmV3IGVjMi5TZWN1cml0eUdyb3VwKHRoaXMsICdEYXRhYmFzZVNlY3VyaXR5R3JvdXAnLCB7XG4gICAgICB2cGM6IHByb3BzLnZwYyxcbiAgICAgIGRlc2NyaXB0aW9uOiBgRGF0YWJhc2Ugc2VjdXJpdHkgZ3JvdXAgZm9yICR7cHJvcHMuYXBwTmFtZX1gLFxuICAgICAgYWxsb3dBbGxPdXRib3VuZDogZmFsc2UsXG4gICAgfSk7XG5cbiAgICAvLyBBbGxvdyBpbmJvdW5kIHRyYWZmaWMgZnJvbSBWUEMgQ0lEUlxuICAgIHRoaXMuZGF0YWJhc2VTZWN1cml0eUdyb3VwLmFkZEluZ3Jlc3NSdWxlKFxuICAgICAgZWMyLlBlZXIuaXB2NChwcm9wcy52cGMudnBjQ2lkckJsb2NrKSxcbiAgICAgIGVjMi5Qb3J0LnRjcCgzMzA2KSwgLy8gTXlTUUxcbiAgICAgICdBbGxvdyBNeVNRTCBmcm9tIFZQQydcbiAgICApO1xuXG4gICAgdGhpcy5kYXRhYmFzZVNlY3VyaXR5R3JvdXAuYWRkSW5ncmVzc1J1bGUoXG4gICAgICBlYzIuUGVlci5pcHY0KHByb3BzLnZwYy52cGNDaWRyQmxvY2spLFxuICAgICAgZWMyLlBvcnQudGNwKDU0MzIpLCAvLyBQb3N0Z3JlU1FMXG4gICAgICAnQWxsb3cgUG9zdGdyZVNRTCBmcm9tIFZQQydcbiAgICApO1xuXG4gICAgLy8gQ3JlYXRlIFJEUyBpbnN0YW5jZSBpZiBlbmFibGVkXG4gICAgaWYgKGVuYWJsZVJkcykge1xuICAgICAgLy8gQ3JlYXRlIGNyZWRlbnRpYWxzXG4gICAgICBjb25zdCByZHNDcmVkZW50aWFscyA9IHJkcy5DcmVkZW50aWFscy5mcm9tR2VuZXJhdGVkU2VjcmV0KHJkc01hc3RlclVzZXJuYW1lLCB7XG4gICAgICAgIHNlY3JldE5hbWU6IGAke3Byb3BzLmFwcE5hbWV9LSR7cHJvcHMuZW52aXJvbm1lbnR9LXJkcy1jcmVkZW50aWFsc2AsXG4gICAgICB9KTtcblxuICAgICAgLy8gQ3JlYXRlIFJEUyBpbnN0YW5jZVxuICAgICAgdGhpcy5yZHNJbnN0YW5jZSA9IG5ldyByZHMuRGF0YWJhc2VJbnN0YW5jZSh0aGlzLCAnRGF0YWJhc2UnLCB7XG4gICAgICAgIGVuZ2luZTogcmRzLkRhdGFiYXNlSW5zdGFuY2VFbmdpbmUubXlzcWwoe1xuICAgICAgICAgIHZlcnNpb246IHJkcy5NeXNxbEVuZ2luZVZlcnNpb24uVkVSXzhfMF8yOCxcbiAgICAgICAgfSksXG4gICAgICAgIGluc3RhbmNlVHlwZTogcmRzSW5zdGFuY2VUeXBlLFxuICAgICAgICBkYXRhYmFzZU5hbWU6IHJkc0RhdGFiYXNlTmFtZSxcbiAgICAgICAgY3JlZGVudGlhbHM6IHJkc0NyZWRlbnRpYWxzLFxuICAgICAgICB2cGM6IHByb3BzLnZwYyxcbiAgICAgICAgdnBjU3VibmV0czoge1xuICAgICAgICAgIHN1Ym5ldFR5cGU6IGVjMi5TdWJuZXRUeXBlLlBSSVZBVEVfSVNPTEFURUQsXG4gICAgICAgIH0sXG4gICAgICAgIHNlY3VyaXR5R3JvdXBzOiBbdGhpcy5kYXRhYmFzZVNlY3VyaXR5R3JvdXBdLFxuICAgICAgICBiYWNrdXBSZXRlbnRpb246IGNkay5EdXJhdGlvbi5kYXlzKDcpLFxuICAgICAgICBkZWxldGVBdXRvbWF0ZWRCYWNrdXBzOiB0cnVlLFxuICAgICAgICBkZWxldGlvblByb3RlY3Rpb246IGZhbHNlLFxuICAgICAgICByZW1vdmFsUG9saWN5OiBjZGsuUmVtb3ZhbFBvbGljeS5ERVNUUk9ZLFxuICAgICAgICBzdG9yYWdlRW5jcnlwdGVkOiB0cnVlLFxuICAgICAgICBzdG9yYWdlRW5jcnlwdGlvbktleTogcHJvcHMua21zS2V5LFxuICAgICAgICBlbmFibGVQZXJmb3JtYW5jZUluc2lnaHRzOiB0cnVlLFxuICAgICAgICBwZXJmb3JtYW5jZUluc2lnaHRSZXRlbnRpb246IHJkcy5QZXJmb3JtYW5jZUluc2lnaHRSZXRlbnRpb24uREVGQVVMVCxcbiAgICAgICAgY2xvdWR3YXRjaExvZ3NFeHBvcnRzOiBbJ2Vycm9yJywgJ2dlbmVyYWwnLCAnc2xvd3F1ZXJ5J10sXG4gICAgICAgIGNsb3Vkd2F0Y2hMb2dzUmV0ZW50aW9uOiBsb2dzLlJldGVudGlvbkRheXMuT05FX1dFRUssXG4gICAgICAgIG1vbml0b3JpbmdJbnRlcnZhbDogY2RrLkR1cmF0aW9uLm1pbnV0ZXMoMSksXG4gICAgICB9KTtcblxuICAgICAgLy8gR3JhbnQgcGVybWlzc2lvbnMgdG8gcmVhZCBzZWNyZXRzXG4gICAgICBpZiAodGhpcy5yZHNJbnN0YW5jZS5zZWNyZXQpIHtcbiAgICAgICAgdGhpcy5yZHNJbnN0YW5jZS5zZWNyZXQuZ3JhbnRSZWFkKG5ldyBpYW0uQWNjb3VudFByaW5jaXBhbChjZGsuU3RhY2sub2YodGhpcykuYWNjb3VudCkpO1xuICAgICAgfVxuICAgIH1cblxuICAgIC8vIENyZWF0ZSBEeW5hbW9EQiB0YWJsZSBpZiBlbmFibGVkXG4gICAgaWYgKGVuYWJsZUR5bmFtb0RiKSB7XG4gICAgICB0aGlzLmR5bmFtb0RiVGFibGUgPSBuZXcgZHluYW1vZGIuVGFibGUodGhpcywgJ1RhYmxlJywge1xuICAgICAgICB0YWJsZU5hbWU6IGAke3Byb3BzLmFwcE5hbWV9LSR7cHJvcHMuZW52aXJvbm1lbnR9YCxcbiAgICAgICAgYmlsbGluZ01vZGU6IGR5bmFtb0RiQmlsbGluZ01vZGUsXG4gICAgICAgIHJlbW92YWxQb2xpY3k6IGR5bmFtb0RiUmVtb3ZhbFBvbGljeSxcbiAgICAgICAgcGFydGl0aW9uS2V5OiB7XG4gICAgICAgICAgbmFtZTogJ2lkJyxcbiAgICAgICAgICB0eXBlOiBkeW5hbW9kYi5BdHRyaWJ1dGVUeXBlLlNUUklORyxcbiAgICAgICAgfSxcbiAgICAgICAgc29ydEtleToge1xuICAgICAgICAgIG5hbWU6ICd0aW1lc3RhbXAnLFxuICAgICAgICAgIHR5cGU6IGR5bmFtb2RiLkF0dHJpYnV0ZVR5cGUuU1RSSU5HLFxuICAgICAgICB9LFxuICAgICAgICB0aW1lVG9MaXZlQXR0cmlidXRlOiAndHRsJyxcbiAgICAgICAgcG9pbnRJblRpbWVSZWNvdmVyeTogdHJ1ZSxcbiAgICAgICAgZW5jcnlwdGlvbjogcHJvcHMua21zS2V5ID8gZHluYW1vZGIuVGFibGVFbmNyeXB0aW9uLkNVU1RPTUVSX01BTkFHRUQgOiBkeW5hbW9kYi5UYWJsZUVuY3J5cHRpb24uREVGQVVMVCxcbiAgICAgICAgZW5jcnlwdGlvbktleTogcHJvcHMua21zS2V5LFxuICAgICAgICBzdHJlYW06IGR5bmFtb2RiLlN0cmVhbVZpZXdUeXBlLk5FV19BTkRfT0xEX0lNQUdFUyxcbiAgICAgIH0pO1xuXG4gICAgICAvLyBBZGQgR1NJIGZvciBjb21tb24gcXVlcnkgcGF0dGVybnNcbiAgICAgIHRoaXMuZHluYW1vRGJUYWJsZS5hZGRHbG9iYWxTZWNvbmRhcnlJbmRleCh7XG4gICAgICAgIGluZGV4TmFtZTogJ0dTSTEnLFxuICAgICAgICBwYXJ0aXRpb25LZXk6IHtcbiAgICAgICAgICBuYW1lOiAnR1NJMVBLJyxcbiAgICAgICAgICB0eXBlOiBkeW5hbW9kYi5BdHRyaWJ1dGVUeXBlLlNUUklORyxcbiAgICAgICAgfSxcbiAgICAgICAgc29ydEtleToge1xuICAgICAgICAgIG5hbWU6ICdHU0kxU0snLFxuICAgICAgICAgIHR5cGU6IGR5bmFtb2RiLkF0dHJpYnV0ZVR5cGUuU1RSSU5HLFxuICAgICAgICB9LFxuICAgICAgICBwcm9qZWN0aW9uVHlwZTogZHluYW1vZGIuUHJvamVjdGlvblR5cGUuQUxMLFxuICAgICAgfSk7XG5cbiAgICAgIC8vIEFkZCBhdXRvLXNjYWxpbmcgaWYgdXNpbmcgcHJvdmlzaW9uZWQgYmlsbGluZ1xuICAgICAgaWYgKGR5bmFtb0RiQmlsbGluZ01vZGUgPT09IGR5bmFtb2RiLkJpbGxpbmdNb2RlLlBST1ZJU0lPTkVEKSB7XG4gICAgICAgIGNvbnN0IHJlYWRTY2FsaW5nID0gdGhpcy5keW5hbW9EYlRhYmxlLmF1dG9TY2FsZVJlYWRDYXBhY2l0eSh7XG4gICAgICAgICAgbWluQ2FwYWNpdHk6IDUsXG4gICAgICAgICAgbWF4Q2FwYWNpdHk6IDEwMCxcbiAgICAgICAgfSk7XG5cbiAgICAgICAgcmVhZFNjYWxpbmcuc2NhbGVPblV0aWxpemF0aW9uKHtcbiAgICAgICAgICB0YXJnZXRVdGlsaXphdGlvblBlcmNlbnQ6IDcwLFxuICAgICAgICB9KTtcblxuICAgICAgICBjb25zdCB3cml0ZVNjYWxpbmcgPSB0aGlzLmR5bmFtb0RiVGFibGUuYXV0b1NjYWxlV3JpdGVDYXBhY2l0eSh7XG4gICAgICAgICAgbWluQ2FwYWNpdHk6IDUsXG4gICAgICAgICAgbWF4Q2FwYWNpdHk6IDEwMCxcbiAgICAgICAgfSk7XG5cbiAgICAgICAgd3JpdGVTY2FsaW5nLnNjYWxlT25VdGlsaXphdGlvbih7XG4gICAgICAgICAgdGFyZ2V0VXRpbGl6YXRpb25QZXJjZW50OiA3MCxcbiAgICAgICAgfSk7XG4gICAgICB9XG4gICAgfVxuXG4gICAgLy8gQWRkIHRhZ3NcbiAgICBpZiAocHJvcHMudGFncykge1xuICAgICAgT2JqZWN0LmVudHJpZXMocHJvcHMudGFncykuZm9yRWFjaCgoW2tleSwgdmFsdWVdKSA9PiB7XG4gICAgICAgIGNkay5UYWdzLm9mKHRoaXMpLmFkZChrZXksIHZhbHVlKTtcbiAgICAgIH0pO1xuICAgIH1cblxuICAgIC8vIEFkZCBkZWZhdWx0IHRhZ3NcbiAgICBjZGsuVGFncy5vZih0aGlzKS5hZGQoJ05hbWUnLCBgJHtwcm9wcy5hcHBOYW1lfS0ke3Byb3BzLmVudmlyb25tZW50fS1kYXRhYmFzZWApO1xuICAgIGNkay5UYWdzLm9mKHRoaXMpLmFkZCgnUHVycG9zZScsICdEYXRhYmFzZSBJbmZyYXN0cnVjdHVyZScpO1xuICAgIGNkay5UYWdzLm9mKHRoaXMpLmFkZCgnTWFuYWdlZEJ5JywgJ0NESycpO1xuXG4gICAgLy8gT3V0cHV0c1xuICAgIGlmICh0aGlzLnJkc0luc3RhbmNlKSB7XG4gICAgICBuZXcgY2RrLkNmbk91dHB1dCh0aGlzLCAnUkRTSW5zdGFuY2VFbmRwb2ludCcsIHtcbiAgICAgICAgdmFsdWU6IHRoaXMucmRzSW5zdGFuY2UuaW5zdGFuY2VFbmRwb2ludC5ob3N0bmFtZSxcbiAgICAgICAgZGVzY3JpcHRpb246ICdSRFMgaW5zdGFuY2UgZW5kcG9pbnQnLFxuICAgICAgICBleHBvcnROYW1lOiBgJHtwcm9wcy5hcHBOYW1lfS0ke3Byb3BzLmVudmlyb25tZW50fS1SRFNJbnN0YW5jZUVuZHBvaW50YCxcbiAgICAgIH0pO1xuXG4gICAgICBuZXcgY2RrLkNmbk91dHB1dCh0aGlzLCAnUkRTSW5zdGFuY2VQb3J0Jywge1xuICAgICAgICB2YWx1ZTogdGhpcy5yZHNJbnN0YW5jZS5pbnN0YW5jZUVuZHBvaW50LnBvcnQudG9TdHJpbmcoKSxcbiAgICAgICAgZGVzY3JpcHRpb246ICdSRFMgaW5zdGFuY2UgcG9ydCcsXG4gICAgICAgIGV4cG9ydE5hbWU6IGAke3Byb3BzLmFwcE5hbWV9LSR7cHJvcHMuZW52aXJvbm1lbnR9LVJEU0luc3RhbmNlUG9ydGAsXG4gICAgICB9KTtcblxuICAgICAgaWYgKHRoaXMucmRzSW5zdGFuY2Uuc2VjcmV0KSB7XG4gICAgICAgIG5ldyBjZGsuQ2ZuT3V0cHV0KHRoaXMsICdSRFNTZWNyZXRBcm4nLCB7XG4gICAgICAgICAgdmFsdWU6IHRoaXMucmRzSW5zdGFuY2Uuc2VjcmV0LnNlY3JldEFybixcbiAgICAgICAgICBkZXNjcmlwdGlvbjogJ1JEUyBzZWNyZXQgQVJOJyxcbiAgICAgICAgICBleHBvcnROYW1lOiBgJHtwcm9wcy5hcHBOYW1lfS0ke3Byb3BzLmVudmlyb25tZW50fS1SRFNTZWNyZXRBcm5gLFxuICAgICAgICB9KTtcbiAgICAgIH1cbiAgICB9XG5cbiAgICBpZiAodGhpcy5keW5hbW9EYlRhYmxlKSB7XG4gICAgICBuZXcgY2RrLkNmbk91dHB1dCh0aGlzLCAnRHluYW1vREJUYWJsZU5hbWUnLCB7XG4gICAgICAgIHZhbHVlOiB0aGlzLmR5bmFtb0RiVGFibGUudGFibGVOYW1lLFxuICAgICAgICBkZXNjcmlwdGlvbjogJ0R5bmFtb0RCIHRhYmxlIG5hbWUnLFxuICAgICAgICBleHBvcnROYW1lOiBgJHtwcm9wcy5hcHBOYW1lfS0ke3Byb3BzLmVudmlyb25tZW50fS1EeW5hbW9EQlRhYmxlTmFtZWAsXG4gICAgICB9KTtcblxuICAgICAgbmV3IGNkay5DZm5PdXRwdXQodGhpcywgJ0R5bmFtb0RCVGFibGVBcm4nLCB7XG4gICAgICAgIHZhbHVlOiB0aGlzLmR5bmFtb0RiVGFibGUudGFibGVBcm4sXG4gICAgICAgIGRlc2NyaXB0aW9uOiAnRHluYW1vREIgdGFibGUgQVJOJyxcbiAgICAgICAgZXhwb3J0TmFtZTogYCR7cHJvcHMuYXBwTmFtZX0tJHtwcm9wcy5lbnZpcm9ubWVudH0tRHluYW1vREJUYWJsZUFybmAsXG4gICAgICB9KTtcbiAgICB9XG5cbiAgICBpZiAodGhpcy5kYXRhYmFzZVNlY3VyaXR5R3JvdXApIHtcbiAgICAgIG5ldyBjZGsuQ2ZuT3V0cHV0KHRoaXMsICdEYXRhYmFzZVNlY3VyaXR5R3JvdXBJZCcsIHtcbiAgICAgICAgdmFsdWU6IHRoaXMuZGF0YWJhc2VTZWN1cml0eUdyb3VwLnNlY3VyaXR5R3JvdXBJZCxcbiAgICAgICAgZGVzY3JpcHRpb246ICdEYXRhYmFzZSBTZWN1cml0eSBHcm91cCBJRCcsXG4gICAgICAgIGV4cG9ydE5hbWU6IGAke3Byb3BzLmFwcE5hbWV9LSR7cHJvcHMuZW52aXJvbm1lbnR9LURhdGFiYXNlU2VjdXJpdHlHcm91cElkYCxcbiAgICAgIH0pO1xuICAgIH1cbiAgfVxuXG4gIC8qKlxuICAgKiBHcmFudCByZWFkIHBlcm1pc3Npb25zIHRvIGEgcm9sZVxuICAgKi9cbiAgcHVibGljIGdyYW50UmVhZERhdGEocm9sZTogaWFtLklSb2xlKTogdm9pZCB7XG4gICAgaWYgKHRoaXMuZHluYW1vRGJUYWJsZSkge1xuICAgICAgdGhpcy5keW5hbW9EYlRhYmxlLmdyYW50UmVhZERhdGEocm9sZSk7XG4gICAgfVxuICB9XG5cbiAgLyoqXG4gICAqIEdyYW50IHdyaXRlIHBlcm1pc3Npb25zIHRvIGEgcm9sZVxuICAgKi9cbiAgcHVibGljIGdyYW50V3JpdGVEYXRhKHJvbGU6IGlhbS5JUm9sZSk6IHZvaWQge1xuICAgIGlmICh0aGlzLmR5bmFtb0RiVGFibGUpIHtcbiAgICAgIHRoaXMuZHluYW1vRGJUYWJsZS5ncmFudFdyaXRlRGF0YShyb2xlKTtcbiAgICB9XG4gIH1cblxuICAvKipcbiAgICogR3JhbnQgcmVhZC93cml0ZSBwZXJtaXNzaW9ucyB0byBhIHJvbGVcbiAgICovXG4gIHB1YmxpYyBncmFudFJlYWRXcml0ZURhdGEocm9sZTogaWFtLklSb2xlKTogdm9pZCB7XG4gICAgaWYgKHRoaXMuZHluYW1vRGJUYWJsZSkge1xuICAgICAgdGhpcy5keW5hbW9EYlRhYmxlLmdyYW50UmVhZFdyaXRlRGF0YShyb2xlKTtcbiAgICB9XG4gIH1cblxuICAvKipcbiAgICogR3JhbnQgUkRTIHBlcm1pc3Npb25zIHRvIGEgcm9sZVxuICAgKi9cbiAgcHVibGljIGdyYW50UmRzUGVybWlzc2lvbnMocm9sZTogaWFtLklSb2xlKTogdm9pZCB7XG4gICAgaWYgKHRoaXMucmRzSW5zdGFuY2UpIHtcbiAgICAgIChyb2xlIGFzIGlhbS5Sb2xlKS5hZGRUb1BvbGljeShcbiAgICAgICAgbmV3IGlhbS5Qb2xpY3lTdGF0ZW1lbnQoe1xuICAgICAgICAgIGVmZmVjdDogaWFtLkVmZmVjdC5BTExPVyxcbiAgICAgICAgICBhY3Rpb25zOiBbXG4gICAgICAgICAgICAncmRzLWRiOmNvbm5lY3QnLFxuICAgICAgICAgIF0sXG4gICAgICAgICAgcmVzb3VyY2VzOiBbXG4gICAgICAgICAgICBgYXJuOmF3czpyZHMtZGI6JHtjZGsuU3RhY2sub2YodGhpcykucmVnaW9ufToke2Nkay5TdGFjay5vZih0aGlzKS5hY2NvdW50fTpkYnVzZXI6JHt0aGlzLnJkc0luc3RhbmNlLmluc3RhbmNlUmVzb3VyY2VJZH0vKmAsXG4gICAgICAgICAgXSxcbiAgICAgICAgfSlcbiAgICAgICk7XG4gICAgfVxuICB9XG59XG4iXX0=