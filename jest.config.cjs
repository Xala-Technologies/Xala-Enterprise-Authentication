const { getJestConfig } = require('@xala-technologies/enterprise-standards');

const config = getJestConfig('library');

// Override test environment to jsdom for React components
config.testEnvironment = 'jsdom';

// Add setup file for React and authentication testing
config.setupFilesAfterEnv = ['<rootDir>/src/__tests__/setup.ts'];

// Focus coverage on core modules (exclude tests and problematic components)
config.collectCoverageFrom = [
  'src/types/**/*.{ts,tsx}',
  'src/lib/**/*.{ts,tsx}',
  'src/auth-core/**/*.{ts,tsx}',
  'src/auth-providers/**/*.{ts,tsx}',
  'src/auth-middleware/**/*.{ts,tsx}',
  'src/auth-permissions/**/*.{ts,tsx}',
  'src/auth-compliance/**/*.{ts,tsx}',
  'src/utils/**/*.{ts,tsx}',
  'src/index.ts',
  '!src/**/*.d.ts',
  '!src/**/*.test.{ts,tsx}',
  '!src/**/__tests__/**/*',
  '!src/agent/**/*',
  '!src/auth-ui-helpers/**/*' // Exclude React components for now
];

// JSX support for React components
config.transform = {
  ...config.transform,
  '^.+\\.tsx?$': ['ts-jest', {
    tsconfig: {
      jsx: 'react-jsx',
    },
  }],
};

// Handle ES modules from foundation
config.transformIgnorePatterns = [
  'node_modules/(?!(@xala-technologies)/)',
];

module.exports = config;