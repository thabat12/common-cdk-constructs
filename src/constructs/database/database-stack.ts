import * as cdk from 'aws-cdk-lib';
import * as ec2 from 'aws-cdk-lib/aws-ec2';
import * as rds from 'aws-cdk-lib/aws-rds';
import * as dynamodb from 'aws-cdk-lib/aws-dynamodb';
import * as iam from 'aws-cdk-lib/aws-iam';
import * as kms from 'aws-cdk-lib/aws-kms';
import * as logs from 'aws-cdk-lib/aws-logs';
import { Construct } from 'constructs';

export interface DatabaseStackProps extends cdk.StackProps {
  /**
   * The VPC where database resources will be created
   */
  vpc: ec2.IVpc;
  
  /**
   * Application name for resource naming
   */
  appName: string;
  
  /**
   * Environment name
   */
  environment: string;
  
  /**
   * Whether to enable RDS
   * @default false
   */
  enableRds?: boolean;
  
  /**
   * Whether to enable DynamoDB
   * @default false
   */
  enableDynamoDb?: boolean;
  
  /**
   * RDS instance type
   * @default t3.micro
   */
  rdsInstanceType?: ec2.InstanceType;
  
  /**
   * RDS database name
   * @default appdb
   */
  rdsDatabaseName?: string;
  
  /**
   * RDS master username
   * @default admin
   */
  rdsMasterUsername?: string;
  
  /**
   * DynamoDB billing mode
   * @default PAY_PER_REQUEST
   */
  dynamoDbBillingMode?: dynamodb.BillingMode;
  
  /**
   * DynamoDB removal policy
   * @default DESTROY
   */
  dynamoDbRemovalPolicy?: cdk.RemovalPolicy;
  
  /**
   * KMS key for encryption
   */
  kmsKey?: kms.IKey;
  
  /**
   * Tags to apply to resources
   */
  tags?: { [key: string]: string };
}

export class DatabaseStack extends cdk.Stack {
  public readonly rdsInstance?: rds.DatabaseInstance;
  public readonly rdsCluster?: rds.DatabaseCluster;
  public readonly dynamoDbTable?: dynamodb.Table;
  public readonly databaseSecurityGroup?: ec2.SecurityGroup;

  constructor(scope: Construct, id: string, props: DatabaseStackProps) {
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
    this.databaseSecurityGroup.addIngressRule(
      ec2.Peer.ipv4(props.vpc.vpcCidrBlock),
      ec2.Port.tcp(3306), // MySQL
      'Allow MySQL from VPC'
    );

    this.databaseSecurityGroup.addIngressRule(
      ec2.Peer.ipv4(props.vpc.vpcCidrBlock),
      ec2.Port.tcp(5432), // PostgreSQL
      'Allow PostgreSQL from VPC'
    );

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
  public grantReadData(role: iam.IRole): void {
    if (this.dynamoDbTable) {
      this.dynamoDbTable.grantReadData(role);
    }
  }

  /**
   * Grant write permissions to a role
   */
  public grantWriteData(role: iam.IRole): void {
    if (this.dynamoDbTable) {
      this.dynamoDbTable.grantWriteData(role);
    }
  }

  /**
   * Grant read/write permissions to a role
   */
  public grantReadWriteData(role: iam.IRole): void {
    if (this.dynamoDbTable) {
      this.dynamoDbTable.grantReadWriteData(role);
    }
  }

  /**
   * Grant RDS permissions to a role
   */
  public grantRdsPermissions(role: iam.IRole): void {
    if (this.rdsInstance) {
      (role as iam.Role).addToPolicy(
        new iam.PolicyStatement({
          effect: iam.Effect.ALLOW,
          actions: [
            'rds-db:connect',
          ],
          resources: [
            `arn:aws:rds-db:${cdk.Stack.of(this).region}:${cdk.Stack.of(this).account}:dbuser:${this.rdsInstance.instanceResourceId}/*`,
          ],
        })
      );
    }
  }
}
