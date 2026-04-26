/**
 * Jest Configuration for SIP_CS
 */

export default {
    testEnvironment: 'node',
    testMatch: ['**/__tests__/**/*.test.js'],
    testPathIgnorePatterns: ['/node_modules/', '/dist/', '/output/'],
    moduleFileExtensions: ['js', 'mjs'],
    moduleNameMapper: {
        '^uuid$': '<rootDir>/tests/support/uuid-jest-shim.cjs',
    },
    transform: {},
    verbose: true,
    testTimeout: 10000,
    // Handle ES modules
    transformIgnorePatterns: [],
    // Setup/teardown
    setupFilesAfterEnv: ['./src/__tests__/setup.js'],
};
