/**
 * Main entry point for @xala-technologies/authentication
 * Enterprise Authentication Package v1.0.1
 */

// Core Types
export type {
  AuthenticationConfig,
  NSMClassification,
  UserProfile,
  TokenClaims,
  SessionInfo,
} from './types/index.js';

// Core Services
export {
  createAuthenticationService,
  createTestAuthenticationService,
  createProductionAuthenticationService,
} from './lib/core.js';

// Auth Core
export * from './auth-core/index.js';

// Auth Providers
export * from './auth-providers/index.js';

// Auth Middleware (selective exports to avoid conflicts)
export {
  AuthGuard,
  RoleGuard,
  NSMClassificationGuard,
} from './auth-middleware/index.js';

// Auth Permissions
export * from './auth-permissions/index.js';

// Auth Compliance
export * from './auth-compliance/index.js';

// Utilities
export {
  validateNorwegianPersonalNumber,
  validateNorwegianPhoneNumber,
  checkNSMClassificationAccess,
} from './utils/norwegian-compliance.js';

export { isValidUrl, validateRequiredFields } from './utils/type-safety.js';
