/**
 * Jest Configuration for SIP_CS
 */

export default {
    testEnvironment: 'node',
    testMatch: ['**/__tests__/**/*.test.js'],
    moduleFileExtensions: ['js', 'mjs'],
    transform: {},
    verbose: true,
    testTimeout: 10000,
    // Handle ES modules
    transformIgnorePatterns: [],
    // Setup/teardown
    setupFilesAfterEnv: ['./src/__tests__/setup.js'],
};
