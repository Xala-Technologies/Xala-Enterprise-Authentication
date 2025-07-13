/**
 * Simple Authentication Package Export
 * Enterprise Standards v4.0.0 compliant
 * Minimal exports for successful build
 */

// Core authentication
export { EnhancedTokenManager } from './auth-core/enhanced-token-manager.js';
export { SessionManager } from './auth-core/session-manager.js';
export { TokenManager } from './auth-core/token-manager.js';

// Enhanced authentication service
export { EnhancedAuthentication } from './lib/enhanced-authentication.js';

// Norwegian compliance automation
export { NorwegianComplianceAutomation } from './utils/norwegian-compliance-automation.js';

// eIDAS provider
export { EIDASProvider } from './auth-providers/eidas-provider.js';

// Types
export type { NSMClassification } from './types/index.js';
export type { AuthenticationConfig } from './types/index.js';

// Constants
export const VERSION = '1.0.0';
export const PACKAGE_NAME = '@xala-technologies/authentication';

/**
 * Enhanced Authentication Factory Function
 */
export function createEnhancedAuthentication(config?: Partial<AuthenticationConfig>) {
  return EnhancedAuthentication.create(config);
}

/**
 * Package information
 */
export const PACKAGE_INFO = {
  name: PACKAGE_NAME,
  version: VERSION,
  description: 'Enterprise authentication with OAuth 2.1, OIDC, SAML, and Norwegian ID',
  features: [
    'JWKS Rotation & Token Binding',
    'Norwegian Compliance Automation', 
    'eIDAS Cross-Border Authentication',
    'Enterprise Security Monitoring'
  ]
} as const;