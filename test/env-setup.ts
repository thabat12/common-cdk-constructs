// Environment setup for CDK testing
import { config } from 'dotenv';

// Load test environment variables
config({ path: '.env.test' });

// Set default test environment variables
process.env.NODE_ENV = 'test';
process.env.ENVIRONMENT = 'test';

// Mock process.exit to prevent tests from exiting
const originalExit = process.exit;

beforeAll(() => {
  process.exit = jest.fn() as any;
});

afterAll(() => {
  process.exit = originalExit;
});
