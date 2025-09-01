# Comprehensive CDK Fargate Application

This example demonstrates how to use all the common CDK constructs from the CDK Fargate Scaffold package to create a production-ready application with:

- **VPC Infrastructure** - Networking with public, private, and isolated subnets
- **Security** - KMS encryption, IAM roles, and security groups
- **Fargate Service** - Containerized application with auto-scaling
- **Monitoring** - CloudWatch dashboards, alarms, and SNS notifications
- **Database** - Optional RDS and DynamoDB with proper security
- **CI/CD** - CodePipeline with automated testing and deployment

## 🚀 Quick Start

1. **Install dependencies:**
   ```bash
   npm install
   ```

2. **Configure environment:**
   ```bash
   cp env.example .env
   # Edit .env with your AWS configuration
   ```

3. **Deploy:**
   ```bash
   npm run deploy
   ```

## 📋 Prerequisites

- AWS CLI configured with appropriate permissions
- CDK bootstrapped in your AWS account
- Docker installed (for local testing)
- Node.js 18+ and npm

## 🔧 Configuration

### Required Environment Variables

```bash
# Application Configuration
APP_NAME=my-comprehensive-app
AWS_REGION=us-east-1
AWS_ACCOUNT_ID=123456789012

# Docker Configuration
DOCKER_IMAGE=my-app:latest
```

### Optional Environment Variables

```bash
# Fargate Resources
FARGATE_CPU=512
FARGATE_MEMORY=1024
DESIRED_COUNT=2
AUTO_SCALING_MAX_CAPACITY=10

# Monitoring
LOG_RETENTION_DAYS=30
NOTIFICATION_EMAILS=admin@example.com,dev@example.com

# Database (optional)
ENABLE_DATABASE=true
ENABLE_RDS=true
ENABLE_DYNAMODB=true

# CI/CD (optional)
ENABLE_CICD=true
GITHUB_OWNER=your-org
GITHUB_REPO=my-app
GITHUB_BRANCH=main
CODESTAR_CONNECTION_ARN=arn:aws:codestar-connections:...
```

## 🏗️ Architecture

This example creates multiple CDK stacks that work together:

### 1. VPC Stack (`vpc-stack`)
- Creates a production-ready VPC with public, private, and isolated subnets
- Sets up NAT gateways for private subnet internet access
- Creates VPC endpoints for AWS services (ECR, CloudWatch, Secrets Manager, SSM)
- Configures VPC Flow Logs for network monitoring

### 2. Security Stack (`security-stack`)
- Creates KMS encryption key with automatic rotation
- Sets up IAM roles for application and execution
- Creates default security groups with proper rules
- Grants necessary permissions for ECS tasks

### 3. Monitoring Stack (`monitoring-stack`)
- Creates CloudWatch dashboard for application metrics
- Sets up SNS topic for alarm notifications
- Configures log groups with appropriate retention
- Enables X-Ray tracing (if configured)

### 4. Database Stack (`database-stack`) - Optional
- Creates RDS MySQL instance in isolated subnets
- Sets up DynamoDB table with GSI and auto-scaling
- Configures proper security groups and encryption
- Grants database permissions to application roles

### 5. Fargate Service (`fargate-service`)
- Deploys containerized application to ECS Fargate
- Sets up Application Load Balancer with health checks
- Configures auto-scaling based on CPU and memory
- Integrates with monitoring and security stacks

### 6. CI/CD Stack (`cicd-stack`) - Optional
- Creates CodePipeline with source, build, test, and deploy stages
- Sets up CodeBuild projects for building and testing
- Configures automated deployment to ECS
- Integrates with GitHub via CodeStar connections

## 🚀 Deployment

### Deploy All Stacks
```bash
npm run deploy
```

### Deploy to Specific Environment
```bash
npm run deploy:staging
npm run deploy:production
```

### Deploy Individual Stacks
```bash
# Deploy only VPC and security
npx cdk deploy *-vpc-stack *-security-stack

# Deploy only Fargate service
npx cdk deploy *-fargate-service
```

## 📊 Monitoring

After deployment, you can:

1. **View CloudWatch Dashboard**: Navigate to CloudWatch > Dashboards
2. **Check Alarms**: Monitor CPU, memory, and health metrics
3. **View Logs**: Check application logs in CloudWatch Logs
4. **Trace Requests**: Use X-Ray for distributed tracing (if enabled)

## 🔒 Security Features

- **Network Isolation**: Private subnets for application and database
- **Encryption**: KMS encryption for data at rest and in transit
- **IAM Roles**: Least-privilege access with proper permissions
- **Security Groups**: Restrictive network access rules
- **VPC Endpoints**: Secure access to AWS services without internet

## 💰 Cost Optimization

- **Auto-scaling**: Scale resources based on demand
- **Spot Instances**: Use Fargate Spot for non-critical workloads
- **Reserved Capacity**: Reserve RDS instances for production
- **Log Retention**: Configure appropriate log retention periods
- **Resource Cleanup**: Use removal policies for development environments

## 🧪 Testing

### Local Testing
```bash
# Build and test locally
npm run build
npm test

# Run linting
npm run lint

# Check types
npm run type-check
```

### CDK Testing
```bash
# Synthesize CloudFormation
npm run synth

# Show differences
npm run diff

# Validate deployment
npx cdk doctor
```

## 🔄 CI/CD Pipeline

If enabled, the CI/CD pipeline will:

1. **Source**: Pull code from GitHub
2. **Build**: Build Docker image and push to ECR
3. **Test**: Run tests, linting, and type checking
4. **Deploy**: Deploy to ECS Fargate

### Manual Approval
You can add approval stages to the pipeline:
```typescript
cicdStack.addApprovalStage('Production-Approval');
```

## 🚨 Troubleshooting

### Common Issues

1. **VPC Limits**: Ensure your AWS account has sufficient VPC limits
2. **IAM Permissions**: Verify CDK execution role has necessary permissions
3. **Docker Build**: Check Dockerfile and build context
4. **Security Groups**: Verify security group rules allow necessary traffic

### Debug Commands
```bash
# Check CDK context
npx cdk context

# View stack outputs
npx cdk list

# Check CloudFormation events
aws cloudformation describe-stack-events --stack-name <stack-name>
```

## 📚 Next Steps

1. **Customize Constructs**: Modify the constructs for your specific needs
2. **Add More Services**: Integrate additional AWS services
3. **Implement Testing**: Add comprehensive testing for your application
4. **Set Up Monitoring**: Configure custom CloudWatch metrics and alarms
5. **Security Hardening**: Implement additional security measures

## 🔗 Useful Links

- [CDK Fargate Scaffold Documentation](../README.md)
- [AWS CDK Documentation](https://docs.aws.amazon.com/cdk/)
- [AWS Fargate Documentation](https://docs.aws.amazon.com/ecs/latest/userguide/what-is-fargate.html)
- [AWS Well-Architected Framework](https://aws.amazon.com/architecture/well-architected/)

## 🤝 Contributing

Found an issue or have a suggestion? Please:

1. Check existing issues
2. Create a new issue with detailed description
3. Submit a pull request with your improvements

---

**Happy deploying! 🚀**
