/**
 * @xala-technologies/authentication v1.0.2
 * Enterprise Authentication Library with Norwegian Support
 * Built with Enterprise Standards v6.0.2
 *
 * Core authentication functionality - minimal working package
 */

// Core Authentication Components
export { SessionManager } from './auth-core/session-manager.js';
export { TokenManager } from './auth-core/token-manager.js';

// Authentication Providers
export { NorwegianIDProvider } from './auth-providers/norwegian-id-provider.js';
export { OAuthProvider } from './auth-providers/oauth-provider.js';
export { EIDASProvider } from './auth-providers/eidas-provider.js';
export { ProviderFactory } from './auth-providers/provider-factory.js';

// Authentication Middleware
export { AuthGuard } from './auth-middleware/auth-guard.js';

// Norwegian Compliance Utilities
export {
  validateNorwegianPersonalNumber,
  validateNorwegianPhoneNumber,
  checkNSMClassificationAccess,
  getMostRestrictiveClassification,
} from './utils/norwegian-compliance.js';

// Essential Types
export type {
  SessionInfo,
  UserProfile,
  NSMClassification,
  AuthenticationConfig,
  ProviderConfig,
} from './types/index.js';
