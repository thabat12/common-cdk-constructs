# Common CDK Constructs - CDK Fargate Scaffold

This document provides an overview of all the common CDK constructs available in the CDK Fargate Scaffold package. These constructs are designed to be reusable, production-ready, and follow AWS best practices.

## 🏗️ **Infrastructure Constructs**

### **Base Infrastructure**

#### **VPCStack** (`src/constructs/base/vpc-stack.ts`)
A production-ready VPC construct with comprehensive networking features.

**Features:**
- Public, private, and isolated subnets across multiple AZs
- NAT gateways for private subnet internet access
- VPC endpoints for AWS services (ECR, CloudWatch, Secrets Manager, SSM)
- VPC Flow Logs for network monitoring
- Gateway endpoints for S3 and DynamoDB
- Configurable CIDR blocks and AZ distribution

**Usage:**
```typescript
import { VPCStack } from '@thabat12/cdk-fargate-scaffold';

const vpcStack = new VPCStack(app, 'MyVPCStack', {
  vpcCidr: '10.0.0.0/16',
  maxAzs: 3,
  natGateways: 2,
  tags: { Environment: 'production' }
});
```

#### **SecurityStack** (`src/constructs/base/security-stack.ts`)
Comprehensive security infrastructure with KMS, IAM roles, and security groups.

**Features:**
- KMS encryption key with automatic rotation
- IAM roles for application and execution
- Default security groups with proper rules
- Configurable security group creation
- Integration with VPC and other constructs

**Usage:**
```typescript
import { SecurityStack } from '@thabat12/cdk-fargate-scaffold';

const securityStack = new SecurityStack(app, 'MySecurityStack', {
  vpc: vpcStack.vpc,
  appName: 'my-app',
  environment: 'production',
  enableKms: true,
  createDefaultSecurityGroups: true
});
```

### **Fargate Service**

#### **FargateService** (`src/constructs/fargate/fargate-service.ts`)
Complete Fargate service deployment with auto-scaling and load balancing.

**Features:**
- ECS Fargate service with configurable CPU/memory
- Application Load Balancer with health checks
- Auto-scaling based on CPU and memory utilization
- CloudWatch alarms and monitoring
- ECR repository creation and management
- Security group integration
- X-Ray tracing support

**Usage:**
```typescript
import { FargateService } from '@thabat12/cdk-fargate-scaffold';

const fargateService = new FargateService(app, 'MyFargateService', {
  vpc: vpcStack.vpc,
  image: 'my-app:latest',
  serviceName: 'my-app',
  cpu: 512,
  memory: 1024,
  enableAutoScaling: true,
  enableLoadBalancer: true
});
```

## 📊 **Monitoring & Observability**

#### **MonitoringStack** (`src/constructs/monitoring/monitoring-stack.ts`)
Comprehensive monitoring infrastructure with CloudWatch and SNS.

**Features:**
- CloudWatch dashboard creation
- SNS topic for alarm notifications
- Email subscriptions for alerts
- Application log groups with configurable retention
- X-Ray tracing support
- Pre-configured alarms for common metrics

**Usage:**
```typescript
import { MonitoringStack } from '@thabat12/cdk-fargate-scaffold';

const monitoringStack = new MonitoringStack(app, 'MyMonitoringStack', {
  appName: 'my-app',
  environment: 'production',
  enableSnsNotifications: true,
  notificationEmails: ['admin@example.com'],
  enableXRay: true
});
```

## 🗄️ **Database Constructs**

#### **DatabaseStack** (`src/constructs/database/database-stack.ts`)
Flexible database infrastructure supporting RDS and DynamoDB.

**Features:**
- RDS MySQL/PostgreSQL instances in isolated subnets
- DynamoDB tables with GSI and auto-scaling
- Proper security groups and encryption
- KMS integration for customer-managed keys
- Backup and monitoring configuration
- IAM permission management

**Usage:**
```typescript
import { DatabaseStack } from '@thabat12/cdk-fargate-scaffold';

const databaseStack = new DatabaseStack(app, 'MyDatabaseStack', {
  vpc: vpcStack.vpc,
  appName: 'my-app',
  environment: 'production',
  enableRds: true,
  enableDynamoDb: true,
  kmsKey: securityStack.kmsKey
});
```

## 🔄 **CI/CD Constructs**

#### **CICDStack** (`src/constructs/cicd/cicd-stack.ts`)
Complete CI/CD pipeline with CodePipeline and CodeBuild.

**Features:**
- CodePipeline with source, build, test, and deploy stages
- CodeBuild projects for building and testing
- Automated deployment to ECS Fargate
- GitHub integration via CodeStar connections
- S3 artifact storage with versioning
- Configurable build environments

**Usage:**
```typescript
import { CICDStack } from '@thabat12/cdk-fargate-scaffold';

const cicdStack = new CICDStack(app, 'MyCICDStack', {
  appName: 'my-app',
  environment: 'production',
  sourceRepository: {
    owner: 'my-org',
    repository: 'my-app',
    branch: 'main'
  },
  ecsService: fargateService.service,
  enableTesting: true,
  enableDeployment: true
});
```

## 🧩 **Utility Functions**

### **Deployment Helpers** (`src/utils/deployment-helpers.ts`)
Common deployment and infrastructure utilities.

**Functions:**
- `getEnvironmentConfig()` - Get environment-specific configuration
- `createStandardTags()` - Create standardized resource tags
- `applyTags()` - Apply tags to CDK constructs
- `createSecurityGroup()` - Create security groups with common rules
- `validateEnvironmentVariables()` - Validate required environment variables
- `getFargateConfig()` - Get Fargate resource configuration with defaults
- `createCommonOutputs()` - Create CloudWatch outputs for common resources

### **Configuration Helpers** (`src/utils/configuration-helpers.ts`)
Configuration management and validation utilities.

**Functions:**
- `getEnvironmentConfigFromContext()` - Get environment configuration from CDK context
- `validateEnvironmentConfig()` - Validate environment configuration
- `createCdkContext()` - Create CDK context for environments
- `getResourceName()` - Generate resource naming conventions
- `getCostAllocationTags()` - Create cost allocation tags
- `parseEnvironmentVariables()` - Parse environment variables with defaults
- `validateFargateResources()` - Validate Fargate resource configuration

## 📋 **Type Definitions**

### **Fargate Types** (`src/types/fargate.ts`)
Comprehensive type definitions for Fargate services.

**Interfaces:**
- `FargateServiceConfig` - Configuration for Fargate services
- `FargateServiceResult` - Result from Fargate service creation
- `FargateResourceLimits` - Resource limits and valid values
- `AutoScalingConfig` - Auto-scaling configuration

### **Constants** (`src/constants/index.ts`)
Common constants and default values.

**Constants:**
- `DEFAULTS` - Default values for common configurations
- `VALID_CPU_VALUES` - Valid Fargate CPU values
- `VALID_MEMORY_VALUES` - Valid Fargate memory values
- `ENVIRONMENTS` - Supported environment names
- `RESOURCE_TYPES` - Resource type constants
- `ERROR_MESSAGES` - Standard error messages
- `SUCCESS_MESSAGES` - Standard success messages

## 🚀 **Complete Application Example**

The package includes a comprehensive example that demonstrates how to use all constructs together:

**Location:** `examples/comprehensive-app/`

**Features:**
- Multi-stack deployment (VPC, Security, Monitoring, Database, Fargate, CI/CD)
- Environment-specific configuration
- Proper stack dependencies
- Comprehensive tagging
- Integration between all constructs

**Usage:**
```bash
cd examples/comprehensive-app
npm install
cp env.example .env
# Edit .env with your configuration
npm run deploy
```

## 🔧 **Configuration Options**

### **Environment Configuration**
All constructs support environment-specific configuration through CDK context:

```json
{
  "dev": {
    "vpcCidr": "10.0.0.0/16",
    "maxAzs": 2,
    "natGateways": 1,
    "fargateCpu": "256",
    "fargateMemory": "512"
  },
  "production": {
    "vpcCidr": "10.2.0.0/16",
    "maxAzs": 3,
    "natGateways": 3,
    "fargateCpu": "1024",
    "fargateMemory": "2048"
  }
}
```

### **Environment Variables**
Common environment variables supported across constructs:

```bash
# Required
APP_NAME=my-app
AWS_REGION=us-east-1
AWS_ACCOUNT_ID=123456789012

# Optional
ENVIRONMENT=production
ENABLE_DATABASE=true
ENABLE_CICD=true
NOTIFICATION_EMAILS=admin@example.com
```

## 🏆 **Best Practices**

### **Security**
- All resources are created in private subnets where possible
- KMS encryption for data at rest and in transit
- Least-privilege IAM roles and policies
- Security groups with restrictive rules
- VPC endpoints for secure AWS service access

### **Monitoring**
- Comprehensive CloudWatch dashboards
- Automated alarm creation and SNS notifications
- Log retention policies
- Performance insights and X-Ray tracing
- Health checks and auto-scaling

### **Cost Optimization**
- Auto-scaling based on demand
- Configurable resource sizes per environment
- Proper tagging for cost allocation
- Resource cleanup policies for development

### **Maintainability**
- Consistent naming conventions
- Comprehensive tagging strategy
- Modular construct design
- Extensive documentation and examples
- TypeScript support with full type safety

## 📚 **Getting Started**

1. **Install the package:**
   ```bash
   npm install @thabat12/cdk-fargate-scaffold
   ```

2. **Import constructs:**
   ```typescript
   import { VPCStack, FargateService, MonitoringStack } from '@thabat12/cdk-fargate-scaffold';
   ```

3. **Use in your CDK app:**
     ```typescript
     const vpc = new VPCStack(app, 'VPC', { /* config */ });
     const service = new FargateService(app, 'Service', { vpc: vpc.vpc, /* config */ });
     ```

4. **Deploy:**
     ```bash
     npx cdk deploy --all
     ```

## 🤝 **Contributing**

The scaffold is designed to be extensible. You can:

- Create new constructs following the existing patterns
- Extend existing constructs with additional features
- Add new utility functions and helpers
- Improve type definitions and constants
- Enhance examples and documentation

## 🔗 **Related Documentation**

- [Main README](../README.md) - Package overview and quick start
- [Quick Start Guide](../docs/quick-start.md) - Step-by-step deployment
- [Examples](../examples/) - Complete working examples
- [API Reference](../dist/) - Generated TypeScript declarations

---

**Happy building with CDK Fargate Scaffold! 🚀**