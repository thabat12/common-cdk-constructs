# 🧪 CDK Testing Guide

This directory contains the testing infrastructure for the CDK Fargate Scaffold package. Learn how to write and run tests for your CDK constructs.

## 🎯 **What is CDK Testing?**

CDK testing is different from regular application testing because we're testing **infrastructure as code**. Instead of testing functions or APIs, we test:

- **Resource Creation**: Does the construct create the expected AWS resources?
- **Configuration**: Are resources configured with the correct properties?
- **Integration**: Do constructs work together properly?
- **Template Output**: Does the CloudFormation template look correct?

## 🏗️ **Testing Architecture**

```
test/
├── setup.ts              # Global test setup and mocks
├── env-setup.ts          # Environment configuration
├── utils.ts              # Test utility functions
├── integration/          # Integration tests
│   └── fargate-vpc-integration.test.ts
└── README.md            # This file
```

## 🚀 **Quick Start**

### 1. Run All Tests
```bash
npm test
```

### 2. Run Specific Test Categories
```bash
# Test only Fargate constructs
npm run test:fargate

# Test only VPC constructs
npm run test:vpc

# Test only unit tests
npm run test:unit

# Test only integration tests
npm run test:integration
```

### 3. Run Tests with Coverage
```bash
npm run test:coverage
```

### 4. Watch Mode (Development)
```bash
npm run test:watch
```

## 📝 **Writing Tests**

### Basic Test Structure

```typescript
import { Template } from 'aws-cdk-lib/assertions';
import { Stack } from 'aws-cdk-lib';
import { YourConstruct } from '../your-construct';

describe('YourConstruct', () => {
  let stack: Stack;

  beforeEach(() => {
    stack = new Stack();
  });

  it('should create expected resources', () => {
    // Arrange
    const construct = new YourConstruct(stack, 'TestConstruct', {
      // configuration
    });

    // Act & Assert
    const template = Template.fromStack(stack);
    template.hasResource('AWS::YourService::Resource', {});
  });
});
```

### Testing Resource Creation

```typescript
it('should create an ECS cluster', () => {
  const fargateService = new FargateService(stack, 'TestService', {
    vpc,
    image: 'nginx:latest',
    serviceName: 'test-service',
  });

  const template = Template.fromStack(stack);
  
  // Check if resource exists
  template.hasResource('AWS::ECS::Cluster', {});
  
  // Check specific properties
  template.hasResourceProperties('AWS::ECS::Cluster', {
    ClusterName: 'test-service-cluster',
  });
});
```

### Testing Resource Counts

```typescript
it('should create correct number of subnets', () => {
  const vpcStack = new VPCStack(stack, 'TestVPC', {
    maxAzs: 3,
    natGateways: 1,
  });

  const template = Template.fromStack(stack);
  
  // Should create 6 subnets (3 public + 3 private)
  template.resourceCountIs('AWS::EC2::Subnet', 6);
});
```

### Testing Resource Properties

```typescript
it('should configure CPU and memory correctly', () => {
  const fargateService = new FargateService(stack, 'TestService', {
    vpc,
    image: 'nginx:latest',
    serviceName: 'test-service',
    cpu: 1024,
    memory: 2048,
  });

  const template = Template.fromStack(stack);
  
  template.hasResourceProperties('AWS::ECS::TaskDefinition', {
    Cpu: '1024',
    Memory: '2048',
  });
});
```

### Testing Resource Relationships

```typescript
it('should place service in private subnets', () => {
  const vpcStack = new VPCStack(stack, 'TestVPC', {
    maxAzs: 2,
    natGateways: 1,
  });

  const fargateService = new FargateService(stack, 'TestService', {
    vpc: vpcStack.vpc,
    image: 'nginx:latest',
    serviceName: 'test-service',
  });

  const template = Template.fromStack(stack);
  
  template.hasResource('AWS::ECS::Service', {
    Properties: {
      NetworkConfiguration: {
        AwsvpcConfiguration: {
          Subnets: {
            'Fn::GetAtt': ['TestVPCPrivateSubnet1Subnet', 'Ref'],
          },
        },
      },
    },
  });
});
```

## 🔧 **Test Utilities**

### `createTestApp()`
Creates a test CDK app with proper context.

```typescript
import { createTestApp } from '../test/utils';

const app = createTestApp();
const stack = new Stack(app, 'TestStack');
```

### `setupTestEnv()` / `cleanupTestEnv()`
Manages test environment variables.

```typescript
beforeEach(() => {
  setupTestEnv();
});

afterEach(() => {
  cleanupTestEnv();
});
```

### `createTestVPC()`
Creates a test VPC for testing constructs that require networking.

```typescript
import { createTestVPC } from '../test/utils';

const vpc = createTestVPC(stack, 'TestVPC');
```

## 🧩 **Testing Patterns**

### 1. **Unit Tests** (`__tests__/` directories)
Test individual constructs in isolation.

```typescript
// src/constructs/fargate/__tests__/fargate-service.test.ts
describe('FargateService', () => {
  it('should create ECS cluster', () => {
    // Test only the FargateService construct
  });
});
```

### 2. **Integration Tests** (`test/integration/`)
Test how multiple constructs work together.

```typescript
// test/integration/fargate-vpc-integration.test.ts
describe('Fargate + VPC Integration', () => {
  it('should create complete infrastructure', () => {
    // Test VPC + Fargate working together
  });
});
```

### 3. **Snapshot Tests**
Capture CloudFormation templates and detect changes.

```typescript
it('should match snapshot', () => {
  const construct = new YourConstruct(stack, 'TestConstruct');
  const template = Template.fromStack(stack);
  
  expect(template.toJSON()).toMatchSnapshot();
});
```

## 🚨 **Common Testing Scenarios**

### Testing Error Conditions

```typescript
it('should throw error when required props missing', () => {
  expect(() => {
    new FargateService(stack, 'TestService', {
      // Missing required props
    } as any);
  }).toThrow();
});
```

### Testing Conditional Resources

```typescript
it('should create auto-scaling when enabled', () => {
  const fargateService = new FargateService(stack, 'TestService', {
    vpc,
    image: 'nginx:latest',
    serviceName: 'test-service',
    enableAutoScaling: true,
  });

  const template = Template.fromStack(stack);
  template.hasResource('AWS::ApplicationAutoScaling::ScalableTarget', {});
});

it('should not create auto-scaling when disabled', () => {
  const fargateService = new FargateService(stack, 'TestService', {
    vpc,
    image: 'nginx:latest',
    serviceName: 'test-service',
    enableAutoScaling: false,
  });

  const template = Template.fromStack(stack);
  template.resourceCountIs('AWS::ApplicationAutoScaling::ScalableTarget', 0);
});
```

### Testing Environment Variations

```typescript
describe('Environment Variations', () => {
  it('should work with minimal config', () => {
    // Test with minimal props
  });

  it('should work with production config', () => {
    // Test with production props
  });
});
```

## 📊 **Test Coverage**

### Running Coverage
```bash
npm run test:coverage
```

### Coverage Reports
- **Text**: Console output
- **HTML**: `coverage/index.html`
- **LCOV**: For CI/CD integration

### Coverage Goals
- **Statements**: >90%
- **Branches**: >85%
- **Functions**: >90%
- **Lines**: >90%

## 🔍 **Debugging Tests**

### Enable Console Output
```bash
SHOW_CONSOLE=true npm test
```

### Debug Specific Test
```bash
npm test -- --testNamePattern="should create ECS cluster"
```

### View Generated Template
```typescript
it('should generate correct template', () => {
  const construct = new YourConstruct(stack, 'TestConstruct');
  const template = Template.fromStack(stack);
  
  // Log the template for debugging
  console.log(JSON.stringify(template.toJSON(), null, 2));
  
  // Your assertions here
});
```

## 🚀 **Best Practices**

### 1. **Test Organization**
- Group related tests in `describe` blocks
- Use descriptive test names
- Test one concept per test

### 2. **Test Data**
- Use realistic test data
- Test edge cases and error conditions
- Avoid hardcoded values when possible

### 3. **Assertions**
- Test resource existence first
- Then test specific properties
- Use `resourceCountIs` for counting resources

### 4. **Performance**
- Keep tests focused and fast
- Mock external dependencies
- Use `beforeEach` for common setup

## 🐛 **Troubleshooting**

### Common Issues

1. **Import Errors**
   ```bash
   # Make sure paths are correct
   import { YourConstruct } from '../your-construct';
   ```

2. **Template Assertion Failures**
   ```typescript
   // Use template.toJSON() to see actual output
   console.log(JSON.stringify(template.toJSON(), null, 2));
   ```

3. **Resource Not Found**
   ```typescript
   // Check if resource type is correct
   template.hasResource('AWS::ECS::Cluster', {});
   ```

4. **Property Mismatches**
   ```typescript
   // Use hasResourceProperties for exact property matching
   template.hasResourceProperties('AWS::ECS::Cluster', {
     ClusterName: 'expected-name',
   });
   ```

## 📚 **Additional Resources**

- [CDK Testing Documentation](https://docs.aws.amazon.com/cdk/v2/guide/testing.html)
- [Jest Documentation](https://jestjs.io/docs/getting-started)
- [CDK Assertions API](https://docs.aws.amazon.com/cdk/api/v2/docs/aws-cdk-lib.assertions-readme.html)

---

**Happy Testing! 🎉**

Remember: Good tests today mean reliable infrastructure tomorrow.
