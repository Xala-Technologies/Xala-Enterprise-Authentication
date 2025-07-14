/**
 * Jest test setup
 * Enterprise Standards v4.0.0 compliant
 */

// Test setup without external dependencies

// Mock console methods to reduce noise in tests
global.console = {
  ...console,
  log: jest.fn(),
  debug: jest.fn(),
  info: jest.fn(),
  warn: jest.fn(),
  error: jest.fn(),
};

// Mock crypto for Node.js environment
Object.defineProperty(global, "crypto", {
  value: {
    randomUUID: () => Math.random().toString(36).substring(2, 15),
    getRandomValues: (arr: any) => {
      for (let i = 0; i < arr.length; i++) {
        arr[i] = Math.floor(Math.random() * 256);
      }
      return arr;
    },
  },
});

// Mock TextEncoder/TextDecoder for JWT operations
// eslint-disable-next-line @typescript-eslint/no-explicit-any
(global as any).TextEncoder = require("util").TextEncoder;
// eslint-disable-next-line @typescript-eslint/no-explicit-any
(global as any).TextDecoder = require("util").TextDecoder;

// Mock localStorage for browser environment
const localStorageMock = {
  getItem: jest.fn(),
  setItem: jest.fn(),
  removeItem: jest.fn(),
  clear: jest.fn(),
};

// Check if window exists (jsdom environment)
if (typeof window !== "undefined") {
  Object.defineProperty(window, "localStorage", {
    value: localStorageMock,
  });

  // Mock sessionStorage
  Object.defineProperty(window, "sessionStorage", {
    value: localStorageMock,
  });
} else {
  // Mock for Node.js environment
  (global as any).localStorage = localStorageMock;
  (global as any).sessionStorage = localStorageMock;
}

// Mock environment variables
process.env.NODE_ENV = "test";
