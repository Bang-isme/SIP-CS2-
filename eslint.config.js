import globals from "globals";

const sharedNodeGlobals = {
  ...globals.node,
  ...globals.es2024,
  fetch: "readonly",
  Request: "readonly",
  Response: "readonly",
  Headers: "readonly",
};

export default [
  {
    ignores: [
      "dashboard/**",
      "docs/**",
      "Memory/**",
      ".codex/**",
      "node_modules/**",
      "requests/**",
      "run/**",
    ],
  },
  {
    files: [
      "src/**/*.js",
      "scripts/**/*.js",
      "tests/**/*.js",
      "jest.config.js",
    ],
    languageOptions: {
      ecmaVersion: "latest",
      sourceType: "module",
      globals: sharedNodeGlobals,
    },
    rules: {
      "no-constant-condition": ["error", { checkLoops: false }],
      "no-dupe-keys": "error",
      "no-empty": "error",
      "no-self-assign": "error",
      "no-unreachable": "error",
      "no-undef": "error",
      "no-unused-vars": ["error", { argsIgnorePattern: "^_", caughtErrorsIgnorePattern: "^_" }],
      eqeqeq: ["error", "always"],
      "no-useless-catch": "error",
    },
  },
  {
    files: [
      "src/__tests__/**/*.js",
      "tests/**/*.js",
      "jest.config.js",
    ],
    languageOptions: {
      globals: {
        ...globals.jest,
      },
    },
  },
];
