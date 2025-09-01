import { App, Stack } from 'aws-cdk-lib';
import { Template } from 'aws-cdk-lib/assertions';
import { Construct } from 'constructs';

/**
 * Test utilities for CDK testing
 */

/**
 * Creates a test CDK app
 */
export function createTestApp(): App {
  return new App({
    context: {
      '@aws-cdk/core:newStyleStackSynthesis': true,
    },
  });
}

/**
 * Synthesizes a stack and returns the CloudFormation template
 */
export function synthesizeStack(stack: Stack): any {
  return Template.fromStack(stack);
}

/**
 * Creates a test VPC for testing Fargate constructs
 */
export function createTestVPC(scope: Construct, id: string) {
  const { Vpc } = require('aws-cdk-lib/aws-ec2');
  return new Vpc(scope, id, {
    maxAzs: 2,
    natGateways: 1,
  });
}

/**
 * Creates test environment variables
 */
export function createTestEnv(): Record<string, string> {
  return {
    AWS_REGION: 'us-east-1',
    AWS_ACCOUNT_ID: '123456789012',
    APP_NAME: 'test-app',
    DOCKER_IMAGE: 'test-image:latest',
    FARGATE_CPU: '256',
    FARGATE_MEMORY: '512',
    DESIRED_COUNT: '1',
    AUTO_SCALING_MAX_CAPACITY: '2',
    LOG_RETENTION_DAYS: '1',
    COST_CENTER: 'test',
    NODE_ENV: 'test',
    ENVIRONMENT: 'test',
  };
}

/**
 * Sets up test environment variables
 */
export function setupTestEnv(): void {
  const testEnv = createTestEnv();
  Object.entries(testEnv).forEach(([key, value]) => {
    process.env[key] = value;
  });
}

/**
 * Cleans up test environment variables
 */
export function cleanupTestEnv(): void {
  const testEnv = createTestEnv();
  Object.keys(testEnv).forEach(key => {
    delete process.env[key];
  });
}

/**
 * Waits for a specified number of milliseconds
 */
export function wait(ms: number): Promise<void> {
  return new Promise(resolve => setTimeout(resolve, ms));
}

/**
 * Mocks AWS SDK responses
 */
export function mockAWSResponse(service: string, method: string, response: any): void {
  const mockService = require(`aws-sdk`)[service];
  if (mockService && mockService.prototype) {
    mockService.prototype[method] = jest.fn().mockReturnValue({
      promise: jest.fn().mockResolvedValue(response),
    });
  }
}
