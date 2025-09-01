# 🚀 Quick Start Guide

Get your Docker application deployed to AWS Fargate in **under 10 minutes** using the CDK Fargate Scaffold!

## ⚡ What You'll Accomplish

- ✅ Deploy a complete Fargate infrastructure
- ✅ Set up auto-scaling and load balancing
- ✅ Configure monitoring and logging
- ✅ Deploy your Docker image to ECR
- ✅ Get a production-ready service running

## 🎯 Prerequisites

Before you start, make sure you have:

- [ ] **AWS CLI** installed and configured (`aws configure`)
- [ ] **Node.js** (v18+) and **npm** installed
- [ ] **Docker** installed and running
- [ ] **AWS CDK** installed (`npm install -g aws-cdk`)
- [ ] **AWS Account** with appropriate permissions

## 🚀 Step-by-Step Deployment

### 1. Clone and Setup

```bash
# Clone the scaffold
git clone <your-scaffold-repo> my-fargate-app
cd my-fargate-app

# Install dependencies
npm install
```

### 2. Configure Your Application

```bash
# Copy environment template
cp env.example .env

# Edit the configuration
nano .env
```

**Required Configuration:**
```bash
APP_NAME=my-awesome-app
AWS_REGION=us-east-1
AWS_ACCOUNT_ID=123456789012
```

**Optional Configuration:**
```bash
# Docker image (defaults to APP_NAME if not specified)
DOCKER_IMAGE=my-awesome-app

# Fargate resources
FARGATE_CPU=256
FARGATE_MEMORY=512
DESIRED_COUNT=1
AUTO_SCALING_MAX_CAPACITY=5

# Monitoring
LOG_RETENTION_DAYS=7
COST_CENTER=development
```

### 3. Create Your Dockerfile

Create a `Dockerfile` in your project root:

```dockerfile
# Example Dockerfile for a Node.js app
FROM node:18-alpine

WORKDIR /app

COPY package*.json ./
RUN npm ci --only=production

COPY . .

# Add health check endpoint
RUN echo '{"status":"healthy"}' > /app/health

EXPOSE 80

CMD ["npm", "start"]
```

**Important:** Your application must have a `/health` endpoint that returns HTTP 200 for the load balancer health checks.

### 4. Deploy Everything!

```bash
# Deploy to dev environment (default)
./scripts/deploy.sh

# Or deploy to a specific environment
./scripts/deploy.sh -e production
```

The script will:
- ✅ Check all prerequisites
- ✅ Bootstrap CDK (if needed)
- ✅ Build your project
- ✅ Deploy infrastructure
- ✅ Deploy your Docker image
- ✅ Show you the results

### 5. 🎉 You're Done!

Your application is now running on AWS Fargate! The script will show you:
- Load balancer URL
- ECR repository URI
- Service name and ARN
- Log group name

## 🔍 What Was Created

The scaffold automatically creates:

- **VPC** with public/private subnets
- **ECS Cluster** with Fargate capacity providers
- **ECR Repository** for your Docker images
- **Fargate Service** with auto-scaling
- **Application Load Balancer** with health checks
- **CloudWatch Logs** and monitoring
- **IAM Roles** with least privilege access
- **Security Groups** for network security

## 🧪 Test Your Deployment

### 1. Check Service Status

```bash
# View service status
aws ecs describe-services \
  --cluster my-awesome-app-cluster \
  --services my-awesome-app \
  --region us-east-1
```

### 2. View Logs

```bash
# View application logs
aws logs tail /ecs/my-awesome-app --follow --region us-east-1
```

### 3. Test Endpoint

```bash
# Get your load balancer URL
aws cloudformation describe-stacks \
  --stack-name my-awesome-app-dev-stack \
  --query 'Stacks[0].Outputs[?OutputKey==`LoadBalancerDNS`].OutputValue' \
  --output text \
  --region us-east-1

# Test the endpoint
curl http://<load-balancer-url>/health
```

## 🚀 Next Steps

### Update Your Application

```bash
# Make changes to your code
# Build and push new image
./scripts/deploy-image.sh -t v1.1.0

# Deploy updated stack
./scripts/deploy.sh
```

### Scale Your Service

```bash
# Update desired count
aws ecs update-service \
  --cluster my-awesome-app-cluster \
  --service my-awesome-app \
  --desired-count 3 \
  --region us-east-1
```

### Monitor Performance

- **CloudWatch Dashboard**: View metrics and logs
- **ECS Console**: Monitor service health
- **Load Balancer**: Check traffic and health

## 🔧 Customization

### Environment-Specific Configs

The scaffold supports multiple environments with different configurations:

```bash
# Deploy to staging
./scripts/deploy.sh -e staging

# Deploy to production  
./scripts/deploy.sh -e production
```

### Custom Resources

Add custom resources to your stack:

```typescript
// stacks/app-stack.ts
export class AppStack extends cdk.Stack {
  constructor(scope: Construct, id: string, props: AppStackProps) {
    super(scope, id, props);

    // Your existing Fargate service
    const fargateService = new FargateService(this, 'FargateService', {
      // ... configuration
    });

    // Add custom resources
    const s3Bucket = new s3.Bucket(this, 'DataBucket', {
      bucketName: `${props.appName}-data-${props.environment}`,
    });

    // Grant permissions
    fargateService.grantTaskRole(
      new iam.PolicyStatement({
        actions: ['s3:GetObject', 's3:PutObject'],
        resources: [s3Bucket.bucketArn + '/*'],
      })
    );
  }
}
```

## 🆘 Troubleshooting

### Common Issues

1. **CDK Not Bootstrapped**
   ```bash
   npx cdk bootstrap aws://ACCOUNT/REGION
   ```

2. **Permission Denied**
   - Ensure your AWS user has necessary permissions
   - Check IAM policies for ECS, ECR, VPC, etc.

3. **Health Check Failures**
   - Verify your app has a `/health` endpoint
   - Check container logs for errors
   - Ensure port 80 is exposed

4. **Image Pull Errors**
   - Verify ECR repository exists
   - Check ECR permissions
   - Ensure image tag is correct

### Debug Commands

```bash
# Check CDK diff
npm run diff

# View CloudFormation template
npm run synth

# Check service status
./scripts/check-service.sh

# View logs
./scripts/view-logs.sh
```

## 📚 Learn More

- [**Examples**](../examples/) - See different deployment patterns
- [**Constructs**](../constructs/) - Understand reusable components
- [**Scripts**](../scripts/) - Explore automation scripts
- [**Testing**](../docs/testing.md) - Learn testing strategies

## 🎯 What's Next?

Now that you have your first deployment running:

1. **Explore the constructs** to understand how they work
2. **Customize your stack** for your specific needs
3. **Add more services** using the same patterns
4. **Set up CI/CD** for automated deployments
5. **Implement monitoring** and alerting

---

**Need help?** Check the [troubleshooting guide](../docs/troubleshooting.md) or [create an issue](https://github.com/your-repo/issues)!
