import { App } from 'aws-cdk-lib';
import { config } from 'dotenv';

// Load test environment variables
config({ path: '.env.test' });

// Set default test environment variables
process.env.NODE_ENV = 'test';
process.env.ENVIRONMENT = 'test';
process.env.AWS_REGION = 'us-east-1';
process.env.AWS_ACCOUNT_ID = '123456789012';
process.env.APP_NAME = 'test-app';
process.env.DOCKER_IMAGE = 'test-image:latest';

// Note: We don't need to mock aws-sdk for CDK testing
// CDK constructs don't make direct AWS API calls during synthesis

// Mock console methods to reduce noise in tests
const originalConsoleLog = console.log;
const originalConsoleWarn = console.warn;
const originalConsoleError = console.error;

// Mock environment variables for testing
process.env.AWS_REGION = 'us-east-1';
process.env.AWS_ACCOUNT_ID = '123456789012';
process.env.APP_NAME = 'test-app';
process.env.DOCKER_IMAGE = 'test-image:latest';

// Global test utilities
global.testApp = () => new App({
  context: {
    '@aws-cdk/core:newStyleStackSynthesis': true,
  },
});

// Extend Jest matchers for CDK testing
expect.extend({
  toHaveResource(received: any, resourceType: string, properties?: any) {
    const pass = received.template.Resources && 
      Object.values(received.template.Resources).some((resource: any) => 
        resource.Type === resourceType
      );
    
    if (pass) {
      return {
        message: () => `Expected template to not have resource of type ${resourceType}`,
        pass: true,
      };
    } else {
      return {
        message: () => `Expected template to have resource of type ${resourceType}`,
        pass: false,
      };
    }
  },
});

// Setup and teardown
beforeAll(() => {
  // Suppress console output during tests unless explicitly needed
  if (process.env.SHOW_CONSOLE !== 'true') {
    console.log = jest.fn();
    console.warn = jest.fn();
    console.error = jest.fn();
  }
});

afterAll(() => {
  // Restore console methods
  console.log = originalConsoleLog;
  console.warn = originalConsoleWarn;
  console.error = originalConsoleError;
});

// Type declarations for global test utilities
declare global {
  namespace jest {
    interface Matchers<R> {
      toHaveResource(resourceType: string, properties?: any): R;
    }
  }
  
  var testApp: () => App;
}
