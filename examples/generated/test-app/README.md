# test-app

This is an example application using the CDK Fargate Scaffold.

## Quick Start

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

## Available Scripts

- `npm run deploy` - Deploy to dev environment
- `npm run deploy:staging` - Deploy to staging environment
- `npm run deploy:production` - Deploy to production environment
- `npm run diff` - Show changes before deployment
- `npm run synth` - Generate CloudFormation template

## Environment Configuration

The scaffold supports multiple environments with different configurations:

- **dev**: Minimal resources for development
- **staging**: Medium resources for testing
- **production**: Full resources for production

## Learn More

- [CDK Fargate Scaffold Documentation](https://github.com/your-org/cdk-fargate-scaffold)
- [AWS CDK Documentation](https://docs.aws.amazon.com/cdk/)
- [AWS Fargate Documentation](https://docs.aws.amazon.com/ecs/latest/userguide/what-is-fargate.html)
