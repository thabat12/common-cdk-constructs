# 🚀 CDK Fargate Project Scaffold

A production-ready scaffold for rapidly deploying Docker applications to AWS Fargate using CDK. This scaffold provides common patterns, best practices, and reusable components to make your next Fargate deployment extremely fast and easy.

## ✨ Features

- **🚀 Rapid Deployment**: Deploy Docker apps to Fargate in minutes
- **🏗️ Reusable Constructs**: Common infrastructure patterns as CDK constructs
- **🌍 Multi-Environment**: Dev, staging, and production configurations
- **🔒 Security First**: IAM roles, VPC, and security groups configured
- **📊 Monitoring Ready**: CloudWatch, X-Ray, and health checks included
- **🔄 Auto-scaling**: Built-in scaling policies and load balancing
- **🧪 Testing**: Comprehensive testing patterns and CI/CD templates
- **📝 Documentation**: Complete examples and best practices

## 🏗️ Architecture

```
┌─────────────────┐    ┌─────────────────┐    ┌─────────────────┐
│   Application  │    │   CDK Stack     │    │   AWS Fargate   │
│   (Docker)     │───▶│   (Infra as     │───▶│   (Container    │
│                 │    │    Code)        │    │    Runtime)     │
└─────────────────┘    └─────────────────┘    └─────────────────┘
         │                       │                       │
         │                       │                       │
         ▼                       ▼                       ▼
┌─────────────────┐    ┌─────────────────┐    ┌─────────────────┐
│   ECR Image    │    │   VPC +         │    │   Auto-scaling  │
│   Repository   │    │   Security      │    │   + Monitoring  │
└─────────────────┘    └─────────────────┘    └─────────────────┘
```

## 🚀 Quick Start

### 1. Create New Project

```bash
# Clone the scaffold
git clone <scaffold-repo> my-fargate-app
cd my-fargate-app

# Install dependencies
npm install

# Copy environment template
cp env.example .env
```

### 2. Configure Your App

```bash
# Edit .env file
APP_NAME=my-awesome-app
DOCKER_IMAGE=my-awesome-app
AWS_REGION=us-east-1
AWS_ACCOUNT_ID=123456789012
```

### 3. Deploy

```bash
# Deploy infrastructure
npm run deploy

# Deploy your Docker image
./scripts/deploy-image.sh
```

## 📁 Project Structure

```
scaffold/
├── constructs/           # Reusable CDK constructs
│   ├── base/            # Base infrastructure patterns
│   ├── fargate/         # Fargate-specific constructs
│   └── monitoring/      # Monitoring and observability
├── stacks/              # CDK stack definitions
│   ├── base-stack.ts    # Base infrastructure
│   ├── app-stack.ts     # Application-specific
│   └── monitoring-stack.ts # Monitoring stack
├── scripts/             # Deployment and utility scripts
├── templates/           # Project templates
├── examples/            # Example implementations
└── docs/               # Documentation and guides
```

## 🏗️ Available Constructs

### Base Constructs

- **VPCStack**: Production-ready VPC with public/private subnets
- **SecurityStack**: Security groups, IAM roles, and policies
- **MonitoringStack**: CloudWatch, X-Ray, and alerting

### Fargate Constructs

- **FargateService**: Complete Fargate service with auto-scaling
- **FargateCluster**: ECS cluster with container insights
- **LoadBalancer**: Application Load Balancer with health checks

### Application Constructs

- **WebApp**: Web application with ALB and auto-scaling
- **WorkerApp**: Background worker with SQS integration
- **APIService**: API service with API Gateway integration

## 🔧 Configuration

### Environment Variables

```bash
# Required
APP_NAME=my-app
AWS_REGION=us-east-1
AWS_ACCOUNT_ID=123456789012

# Optional
ENVIRONMENT=production
VPC_CIDR=10.0.0.0/16
FARGATE_CPU=256
FARGATE_MEMORY=512
DESIRED_COUNT=2
```

### Stack Configuration

```typescript
// stacks/app-stack.ts
export class AppStack extends cdk.Stack {
  constructor(scope: Construct, id: string, props?: cdk.StackProps) {
    super(scope, id, props);

    // Use base constructs
    const vpc = new VPCStack(this, 'VPC', {
      maxAzs: 2,
      natGateways: 1,
    });

    // Deploy your app
    const app = new FargateService(this, 'App', {
      vpc: vpc.vpc,
      image: 'your-app:latest',
      cpu: 256,
      memory: 512,
    });
  }
}
```

## 🚀 Deployment Patterns

### 1. Blue-Green Deployment

```bash
# Deploy new version
./scripts/blue-green-deploy.sh v2.0.0

# Rollback if needed
./scripts/rollback.sh v1.0.0
```

### 2. Canary Deployment

```bash
# Deploy canary
./scripts/canary-deploy.sh v2.0.0 10

# Promote to production
./scripts/promote-canary.sh
```

### 3. Rolling Update

```bash
# Rolling update
./scripts/rolling-update.sh v2.0.0
```

## 🧪 Testing

### Infrastructure Tests

```bash
# Test CDK constructs
npm run test:constructs

# Test infrastructure
npm run test:infrastructure

# Snapshot tests
npm run test:snapshots
```

### Application Tests

```bash
# Test Docker image
./scripts/test-image.sh

# Integration tests
npm run test:integration
```

## 📊 Monitoring & Observability

### Built-in Monitoring

- **CloudWatch Logs**: Centralized logging
- **CloudWatch Metrics**: Performance metrics
- **X-Ray Tracing**: Distributed tracing
- **Health Checks**: Application health monitoring
- **Alerts**: Automated alerting on issues

### Custom Metrics

```typescript
// Add custom metrics
const metric = new cloudwatch.Metric({
  namespace: 'MyApp',
  metricName: 'RequestCount',
  dimensionsMap: {
    Service: 'api',
    Environment: 'production',
  },
});
```

## 🔒 Security

### Security Features

- **Private Subnets**: Applications run in private subnets
- **IAM Roles**: Least privilege access
- **Security Groups**: Network-level security
- **Secrets Management**: Secure credential handling
- **VPC Endpoints**: Private AWS service access

### Compliance

- **SOC 2**: Security controls implemented
- **HIPAA**: Healthcare compliance ready
- **PCI DSS**: Payment card compliance ready

## 🚀 Performance Optimization

### Auto-scaling

- **CPU-based scaling**: Scale on CPU utilization
- **Memory-based scaling**: Scale on memory usage
- **Custom metrics**: Scale on business metrics
- **Scheduled scaling**: Scale based on time

### Load Balancing

- **Application Load Balancer**: Layer 7 load balancing
- **Health Checks**: Automatic unhealthy instance removal
- **Sticky Sessions**: Session affinity when needed
- **SSL Termination**: HTTPS termination at ALB

## 📚 Examples

### Web Application

```typescript
// examples/web-app.ts
const webApp = new WebApp(this, 'WebApp', {
  image: 'my-web-app:latest',
  domain: 'myapp.com',
  ssl: true,
  autoScaling: {
    minCapacity: 2,
    maxCapacity: 10,
  },
});
```

### API Service

```typescript
// examples/api-service.ts
const apiService = new APIService(this, 'APIService', {
  image: 'my-api:latest',
  domain: 'api.myapp.com',
  cors: true,
  rateLimiting: true,
});
```

### Worker Service

```typescript
// examples/worker-service.ts
const worker = new WorkerService(this, 'Worker', {
  image: 'my-worker:latest',
  queue: 'my-queue',
  autoScaling: {
    minCapacity: 1,
    maxCapacity: 5,
  },
});
```

## 🛠️ Development Workflow

### 1. Local Development

```bash
# Start local environment
docker-compose up

# Run tests
npm run test

# Build and test locally
./scripts/local-build.sh
```

### 2. Staging Deployment

```bash
# Deploy to staging
npm run deploy:staging

# Run integration tests
npm run test:integration:staging
```

### 3. Production Deployment

```bash
# Deploy to production
npm run deploy:production

# Monitor deployment
./scripts/monitor-deployment.sh
```

## 🔄 CI/CD Integration

### GitHub Actions

```yaml
# .github/workflows/deploy.yml
name: Deploy to Fargate
on:
  push:
    branches: [main]
jobs:
  deploy:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3
      - name: Deploy to AWS
        run: |
          npm run deploy:production
          ./scripts/deploy-image.sh
```

### GitLab CI

```yaml
# .gitlab-ci.yml
deploy:
  stage: deploy
  script:
    - npm run deploy:production
    - ./scripts/deploy-image.sh
```

## 📈 Cost Optimization

### Cost-Saving Features

- **Spot Instances**: Use spot instances for non-critical workloads
- **Auto-scaling**: Scale down during low usage
- **Reserved Capacity**: Reserve capacity for predictable workloads
- **Cost Monitoring**: Built-in cost tracking and alerts

### Cost Estimation

```bash
# Estimate costs
npm run cost:estimate

# View current costs
npm run cost:current
```

## 🆘 Troubleshooting

### Common Issues

1. **Image Pull Errors**: Check ECR permissions and image tags
2. **Health Check Failures**: Verify application health endpoint
3. **Auto-scaling Issues**: Check CloudWatch metrics and alarms
4. **Network Issues**: Verify VPC and security group configuration

### Debug Commands

```bash
# Check service status
./scripts/check-service.sh

# View logs
./scripts/view-logs.sh

# Execute into container
./scripts/exec-container.sh

# Check metrics
./scripts/check-metrics.sh
```

## 🤝 Contributing

### Development Setup

```bash
# Clone and setup
git clone <repo>
cd scaffold
npm install

# Run tests
npm run test

# Build
npm run build
```

### Code Standards

- **TypeScript**: Strict type checking enabled
- **ESLint**: Code quality and consistency
- **Prettier**: Code formatting
- **Husky**: Git hooks for quality checks

## 📄 License

MIT License - see [LICENSE](LICENSE) for details.

## 🆘 Support

- **Documentation**: [docs/](docs/)
- **Examples**: [examples/](examples/)
- **Issues**: [GitHub Issues](https://github.com/your-repo/issues)
- **Discussions**: [GitHub Discussions](https://github.com/your-repo/discussions)

## 🎯 Roadmap

- [ ] Multi-region deployment support
- [ ] Kubernetes integration
- [ ] Serverless container support
- [ ] Advanced monitoring dashboards
- [ ] Cost optimization recommendations
- [ ] Compliance automation

---

**Ready to deploy?** Check out the [Quick Start Guide](docs/quick-start.md) or jump into [Examples](examples/) to see the scaffold in action!
