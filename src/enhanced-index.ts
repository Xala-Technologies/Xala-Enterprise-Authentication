/**
 * Enhanced Authentication Package - Core Exports
 * Production-ready enhanced authentication with enterprise security
 * Enterprise Standards v4.0.0 compliant
 */

// Core Enhanced Features
export { EnhancedTokenManager } from "./auth-core/enhanced-token-manager.js";
export { EnhancedAuthentication } from "./lib/enhanced-authentication.js";
export { NorwegianComplianceAutomation } from "./utils/norwegian-compliance-automation.js";
export { EIDASProvider } from "./auth-providers/eidas-provider.js";

// Basic Types
export type {
  UserProfile,
  NSMClassification,
  ProviderType,
} from "./types/index.js";

// Enhanced Authentication Configuration
export interface EnhancedAuthConfig {
  readonly enhancedSecurity?: {
    readonly enableJWKSRotation?: boolean;
    readonly enableTokenBinding?: boolean;
    readonly keyRotationInterval?: number;
    readonly enableDeviceFingerprinting?: boolean;
  };
  readonly norwegianCompliance?: {
    readonly enableAutomaticClassification?: boolean;
    readonly enableGDPRAutomation?: boolean;
    readonly enableAuditTrail?: boolean;
    readonly auditIntervalDays?: number;
  };
  readonly enterprise?: {
    readonly enableComplianceAutomation?: boolean;
    readonly enableSecurityMetrics?: boolean;
    readonly enableThreatDetection?: boolean;
  };
}

// Version Information
export const VERSION = "1.0.0";
export const ENTERPRISE_STANDARDS_VERSION = "4.0.0";
export const ENHANCED_FEATURES = {
  jwksRotation: true,
  tokenBinding: true,
  norwegianCompliance: true,
  eidasSupport: true,
  threatDetection: true,
  complianceAutomation: true,
};

/**
 * Create enhanced authentication service with enterprise security
 */
export function createEnhancedAuthentication(config: EnhancedAuthConfig) {
  return EnhancedAuthentication.create(config as any);
}

/**
 * Package information
 */
export const PACKAGE_INFO = {
  name: "@xala-technologies/authentication",
  version: VERSION,
  description:
    "Enterprise authentication with enhanced security and Norwegian compliance",
  features: ENHANCED_FEATURES,
  compliance: {
    nsm: true,
    gdpr: true,
    wcag: "AAA",
    enterpriseStandards: ENTERPRISE_STANDARDS_VERSION,
  },
};
