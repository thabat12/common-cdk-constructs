#!/usr/bin/env node

/**
 * Example Project Generator for CDK Fargate Scaffold
 * This script creates a new example project with all necessary files
 */

const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

// Colors for console output
const colors = {
  reset: '\x1b[0m',
  bright: '\x1b[1m',
  red: '\x1b[31m',
  green: '\x1b[32m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  magenta: '\x1b[35m',
  cyan: '\x1b[36m',
};

function log(message, color = 'reset') {
  console.log(`${colors[color]}${message}${colors.reset}`);
}

function logSuccess(message) {
  log(`✅ ${message}`, 'green');
}

function logInfo(message) {
  log(`ℹ️  ${message}`, 'blue');
}

function logWarning(message) {
  log(`⚠️  ${message}`, 'yellow');
}

function logError(message) {
  log(`❌ ${message}`, 'red');
}

function createDirectory(dirPath) {
  if (!fs.existsSync(dirPath)) {
    fs.mkdirSync(dirPath, { recursive: true });
    logSuccess(`Created directory: ${dirPath}`);
  }
}

function createFile(filePath, content) {
  const dir = path.dirname(filePath);
  createDirectory(dir);
  
  fs.writeFileSync(filePath, content);
  logSuccess(`Created file: ${filePath}`);
}

function getProjectName() {
  const args = process.argv.slice(2);
  const nameIndex = args.findIndex(arg => arg === '--name' || arg === '-n');
  
  if (nameIndex !== -1 && args[nameIndex + 1]) {
    return args[nameIndex + 1];
  }
  
  return 'my-fargate-app';
}

function getEnvironment() {
  const args = process.argv.slice(2);
  const envIndex = args.findIndex(arg => arg === '--env' || arg === '-e');
  
  if (envIndex !== -1 && args[envIndex + 1]) {
    return args[envIndex + 1];
  }
  
  return 'dev';
}

function generatePackageJson(projectName) {
  return `{
  "name": "${projectName}",
  "version": "1.0.0",
  "description": "Example Fargate application using CDK Fargate Scaffold",
  "main": "dist/bin/app.js",
  "scripts": {
    "clean": "rm -rf dist",
    "build": "npm run clean && tsc",
    "watch": "tsc -w",
    "cdk": "cdk",
    "deploy": "npm run build && cdk deploy --all",
    "deploy:dev": "npm run build && cdk deploy --all --context environment=dev",
    "deploy:staging": "npm run build && cdk deploy --all --context environment=staging",
    "deploy:production": "npm run build && cdk deploy --all --context environment=production",
    "diff": "npm run build && cdk diff",
    "synth": "npm run build && cdk synth",
    "destroy": "cdk destroy --all",
    "bootstrap": "cdk bootstrap"
  },
  "devDependencies": {
    "@types/node": "^20.0.0",
    "aws-cdk": "^2.100.0",
    "ts-node": "^10.9.0",
    "typescript": "~5.0.0"
  },
  "dependencies": {
    "@thabat12/cdk-fargate-scaffold": "^1.0.0",
    "aws-cdk-lib": "^2.100.0",
    "constructs": "^10.0.0",
    "source-map-support": "^0.5.21",
    "dotenv": "^16.3.1"
  }
}`;
}

function generateTsConfig() {
  return `{
  "compilerOptions": {
    "target": "ES2020",
    "lib": ["ES2020"],
    "module": "commonjs",
    "declaration": true,
    "strict": true,
    "noImplicitAny": true,
    "strictNullChecks": true,
    "noImplicitThis": true,
    "alwaysStrict": true,
    "noUnusedLocals": false,
    "noUnusedParameters": false,
    "noImplicitReturns": true,
    "noFallthroughCasesInSwitch": false,
    "inlineSourceMap": true,
    "inlineSources": true,
    "experimentalDecorators": true,
    "strictPropertyInitialization": false,
    "typeRoots": ["./node_modules/@types"],
    "outDir": "dist",
    "rootDir": ".",
    "baseUrl": ".",
    "esModuleInterop": true,
    "allowSyntheticDefaultImports": true,
    "forceConsistentCasingInFileNames": true,
    "skipLibCheck": true,
    "resolveJsonModule": true
  },
  "include": [
    "bin/**/*"
  ],
  "exclude": [
    "node_modules",
    "dist",
    "cdk.out"
  ]
}`;
}

function generateCdkJson(projectName) {
  return `{
  "app": "npx ts-node --prefer-ts-exts bin/app.ts",
  "watch": {
    "include": [
      "**"
    ],
    "exclude": [
      "README.md",
      "cdk*.json",
      "**/*.d.ts",
      "**/*.js",
      "tsconfig.json",
      "package*.json",
      "yarn.lock",
      "node_modules",
      "test"
    ]
  },
  "context": {
    "environment": "dev",
    "dev": {
      "environment": "dev",
      "vpcCidr": "10.0.0.0/16",
      "maxAzs": 2,
      "natGateways": 1,
      "fargateCpu": "256",
      "fargateMemory": "512",
      "desiredCount": 1,
      "autoScalingMaxCapacity": 2,
      "enableContainerInsights": true,
      "enableXRay": false,
      "logRetentionDays": 7,
      "costCenter": "dev"
    },
    "staging": {
      "environment": "staging",
      "vpcCidr": "10.1.0.0/16",
      "maxAzs": 2,
      "natGateways": 1,
      "fargateCpu": "512",
      "fargateMemory": "1024",
      "desiredCount": 2,
      "autoScalingMaxCapacity": 5,
      "enableContainerInsights": true,
      "enableXRay": true,
      "logRetentionDays": 14,
      "costCenter": "staging"
    },
    "production": {
      "environment": "production",
      "vpcCidr": "10.2.0.0/16",
      "maxAzs": 3,
      "natGateways": 3,
      "fargateCpu": "1024",
      "fargateMemory": "2048",
      "desiredCount": 3,
      "autoScalingMaxCapacity": 10,
      "enableContainerInsights": true,
      "enableXRay": true,
      "logRetentionDays": 30,
      "costCenter": "production"
    }
  }
}`;
}

function generateEnvExample(projectName) {
  return `# ${projectName} Environment Configuration
# Copy this file to .env and customize the values

# Required Configuration
APP_NAME=${projectName}
AWS_REGION=us-east-1
AWS_ACCOUNT_ID=123456789012

# Optional Configuration
DOCKER_IMAGE=${projectName}
FARGATE_CPU=256
FARGATE_MEMORY=512
DESIRED_COUNT=1
AUTO_SCALING_MAX_CAPACITY=5
LOG_RETENTION_DAYS=7
COST_CENTER=development
ENVIRONMENT=dev`;
}

function generateAppTs(projectName) {
  return `#!/usr/bin/env node
import 'source-map-support/register';
import * as cdk from 'aws-cdk-lib';
import * as dotenv from 'dotenv';
import { AppStack } from '@your-org/cdk-fargate-scaffold';

// Load environment variables
dotenv.config();

const app = new cdk.App();

// Get environment from context or environment variable
const environment = app.node.tryGetContext('environment') || process.env.ENVIRONMENT || 'dev';

// Get configuration from context
const config = app.node.tryGetContext(environment) || {};

// Validate required environment variables
const requiredEnvVars = ['APP_NAME', 'AWS_REGION', 'AWS_ACCOUNT_ID'];
const missingEnvVars = requiredEnvVars.filter(envVar => !process.env[envVar]);

if (missingEnvVars.length > 0) {
  throw new Error(\`Missing required environment variables: \${missingEnvVars.join(', ')}\`);
}

// Get environment variables with defaults
const environmentConfig = {
  appName: process.env.APP_NAME!,
  dockerImage: process.env.DOCKER_IMAGE || process.env.APP_NAME!,
  environment,
  awsRegion: process.env.AWS_REGION!,
  awsAccountId: process.env.AWS_ACCOUNT_ID!,
  fargateCpu: parseInt(config.fargateCpu || process.env.FARGATE_CPU || '256'),
  fargateMemory: parseInt(config.fargateMemory || process.env.FARGATE_MEMORY || '512'),
  desiredCount: parseInt(config.desiredCount || process.env.DESIRED_COUNT || '1'),
  autoScalingMaxCapacity: parseInt(config.autoScalingMaxCapacity || process.env.AUTO_SCALING_MAX_CAPACITY || '5'),
  enableContainerInsights: config.enableContainerInsights !== false,
  enableXRay: config.enableXRay === true,
  logRetentionDays: parseInt(config.logRetentionDays || process.env.LOG_RETENTION_DAYS || '7'),
  costCenter: config.costCenter || process.env.COST_CENTER || environment,
  tags: config.tags || {},
};

// Create the application stack
const appStack = new AppStack(app, \`\${environmentConfig.appName}-\${environment}-stack\`, {
  env: {
    account: environmentConfig.awsAccountId,
    region: environmentConfig.awsRegion,
  },
  ...environmentConfig,
  description: \`\${environmentConfig.appName} Fargate service stack for \${environment} environment\`,
});

// Add stack tags
cdk.Tags.of(appStack).add('Environment', environment);
cdk.Tags.of(appStack).add('CostCenter', environmentConfig.costCenter);
cdk.Tags.of(appStack).add('Project', environmentConfig.appName);
cdk.Tags.of(appStack).add('ManagedBy', 'CDK');

// Output deployment information
console.log('🚀 Deploying \${environmentConfig.appName} with CDK Fargate Scaffold');
console.log('=====================================================');
console.log(\`Application: \${environmentConfig.appName}\`);
console.log(\`Environment: \${environment}\`);
console.log(\`Region: \${environmentConfig.awsRegion}\`);
console.log(\`Account: \${environmentConfig.awsAccountId}\`);
console.log(\`Docker Image: \${environmentConfig.dockerImage}\`);
console.log(\`Fargate CPU: \${environmentConfig.fargateCpu}\`);
console.log(\`Fargate Memory: \${environmentConfig.fargateMemory} MB\`);
console.log(\`Desired Count: \${environmentConfig.desiredCount}\`);
console.log(\`Max Capacity: \${environmentConfig.autoScalingMaxCapacity}\`);
console.log(\`Container Insights: \${environmentConfig.enableContainerInsights}\`);
console.log(\`X-Ray Tracing: \${environmentConfig.enableXRay}\`);
console.log(\`Log Retention: \${environmentConfig.logRetentionDays} days\`);
console.log(\`Cost Center: \${environmentConfig.costCenter}\`);
console.log('=====================================================');

// Add context information
app.node.setContext('environment', environment);
app.node.setContext('appName', environmentConfig.appName);

// Synthesize the app
app.synth();`;
}

function generateDockerfile() {
  return `# Example Dockerfile for a Node.js application
FROM node:18-alpine

WORKDIR /app

# Copy package files
COPY package*.json ./

# Install dependencies
RUN npm ci --only=production

# Copy application code
COPY . .

# Create health check endpoint
RUN echo '{"status":"healthy"}' > /app/health

# Expose port
EXPOSE 80

# Start the application
CMD ["npm", "start"]`;
}

function generateReadme(projectName) {
  return `# ${projectName}

This is an example application using the CDK Fargate Scaffold.

## Quick Start

1. **Install dependencies:**
   \`\`\`bash
   npm install
   \`\`\`

2. **Configure environment:**
   \`\`\`bash
   cp env.example .env
   # Edit .env with your AWS configuration
   \`\`\`

3. **Deploy:**
   \`\`\`bash
   npm run deploy
   \`\`\`

## Available Scripts

- \`npm run deploy\` - Deploy to dev environment
- \`npm run deploy:staging\` - Deploy to staging environment
- \`npm run deploy:production\` - Deploy to production environment
- \`npm run diff\` - Show changes before deployment
- \`npm run synth\` - Generate CloudFormation template

## Environment Configuration

The scaffold supports multiple environments with different configurations:

- **dev**: Minimal resources for development
- **staging**: Medium resources for testing
- **production**: Full resources for production

## Learn More

- [CDK Fargate Scaffold Documentation](https://github.com/your-org/cdk-fargate-scaffold)
- [AWS CDK Documentation](https://docs.aws.amazon.com/cdk/)
- [AWS Fargate Documentation](https://docs.aws.amazon.com/ecs/latest/userguide/what-is-fargate.html)
`;
}

function generateGitignore() {
  return `# Dependencies
node_modules/
npm-debug.log*
yarn-debug.log*
yarn-error.log*

# Build output
dist/
build/

# CDK
cdk.out/
*.d.ts

# Environment files
.env
.env.local
.env.*.local

# IDE
.vscode/
.idea/
*.swp
*.swo

# OS
.DS_Store
Thumbs.db

# Logs
logs/
*.log

# Runtime data
pids/
*.pid
*.seed
*.pid.lock

# Coverage directory used by tools like istanbul
coverage/

# nyc test coverage
.nyc_output/

# Dependency directories
jspm_packages/

# Optional npm cache directory
.npm

# Optional REPL history
.node_repl_history

# Output of 'npm pack'
*.tgz

# Yarn Integrity file
.yarn-integrity

# dotenv environment variables file
.env`;
}

function main() {
  const projectName = getProjectName();
  const environment = getEnvironment();
  const exampleDir = path.join(__dirname, '..', 'examples', 'generated', projectName);
  
  logInfo(`Creating example project: ${projectName}`);
  logInfo(`Environment: ${environment}`);
  logInfo(`Directory: ${exampleDir}`);
  
  try {
    // Create project directory
    createDirectory(exampleDir);
    
    // Create package.json
    createFile(
      path.join(exampleDir, 'package.json'),
      generatePackageJson(projectName)
    );
    
    // Create tsconfig.json
    createFile(
      path.join(exampleDir, 'tsconfig.json'),
      generateTsConfig()
    );
    
    // Create cdk.json
    createFile(
      path.join(exampleDir, 'cdk.json'),
      generateCdkJson(projectName)
    );
    
    // Create env.example
    createFile(
      path.join(exampleDir, 'env.example'),
      generateEnvExample(projectName)
    );
    
    // Create bin directory and app.ts
    createFile(
      path.join(exampleDir, 'bin', 'app.ts'),
      generateAppTs(projectName)
    );
    
    // Create Dockerfile
    createFile(
      path.join(exampleDir, 'Dockerfile'),
      generateDockerfile()
    );
    
    // Create README.md
    createFile(
      path.join(exampleDir, 'README.md'),
      generateReadme(projectName)
    );
    
    // Create .gitignore
    createFile(
      path.join(exampleDir, '.gitignore'),
      generateGitignore()
    );
    
    logSuccess(`\n🎉 Example project created successfully!`);
    logInfo(`\nNext steps:`);
    logInfo(`1. cd examples/generated/${projectName}`);
    logInfo(`2. npm install`);
    logInfo(`3. cp env.example .env`);
    logInfo(`4. Edit .env with your AWS configuration`);
    logInfo(`5. npm run deploy`);
    
  } catch (error) {
    logError(`Failed to create example project: ${error.message}`);
    process.exit(1);
  }
}

// Show help if requested
if (process.argv.includes('--help') || process.argv.includes('-h')) {
  console.log(`
Example Project Generator for CDK Fargate Scaffold

Usage: node scripts/create-example.js [OPTIONS]

Options:
  --name, -n NAME     Project name (default: my-fargate-app)
  --env, -e ENV       Environment (default: dev)
  --help, -h          Show this help message

Examples:
  node scripts/create-example.js --name my-app
  node scripts/create-example.js --name my-app --env production
`);
  process.exit(0);
}

main();
