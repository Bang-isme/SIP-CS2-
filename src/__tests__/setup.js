/**
 * Jest Test Setup
 * Runs before each test file
 */

// Set test environment
process.env.NODE_ENV = 'test';

// Increase timeout for database operations
jest.setTimeout(10000);

// Cleanup after all tests
afterAll(async () => {
    // Allow connections to close gracefully
    await new Promise(resolve => setTimeout(resolve, 500));
});
