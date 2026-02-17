export default {
    transform: {},
    testEnvironment: 'node',
    verbose: true,
    testMatch: [
        "**/tests/**/*.test.js"
    ],
    setupFilesAfterEnv: ['../src/__tests__/setup.js'],
};
