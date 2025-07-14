/**
 * Auth Core Module - Session and Token Management
 * @xala-technologies/authentication
 */

export * from './session-manager.js';
export * from './session-storage.js';
export * from './token-manager.js';
export * from './enhanced-token-manager.js';
export * from './authentication-context.js';

// Export types but exclude conflicting interface definitions
export type {
  SessionStorage,
  TokenManager,
  TokenValidationResult,
  TokenRefreshResult,
  SessionManager,
  AuthenticationContext,
  BruteForceProtection,
  SessionStorageBackend,
} from './types.js';
