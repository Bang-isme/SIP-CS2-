export default {
    transform: {},
    testEnvironment: 'node',
    verbose: true,
    testMatch: [
        "**/tests/**/*.test.js"
    ],
    moduleNameMapper: {
        '^uuid$': '<rootDir>/support/uuid-jest-shim.cjs',
    },
    setupFilesAfterEnv: ['../src/__tests__/setup.js'],
};
