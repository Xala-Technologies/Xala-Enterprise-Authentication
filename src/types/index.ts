/**
 * Type definitions for @xala-technologies/authentication
 */

// NSM Classification Type
export type NSMClassification = 'OPEN' | 'RESTRICTED' | 'CONFIDENTIAL' | 'SECRET';

// Base Configuration Types
export interface NorwegianCompliance {
  nsmClassification: NSMClassification;
  gdprCompliant: boolean;
  wcagLevel: 'A' | 'AA' | 'AAA';
  supportedLanguages: ['nb-NO', 'en-US', 'fr-FR', 'ar-SA'];
  auditTrail: boolean;
}

export interface AuthenticationConfig extends NorwegianCompliance {
  // Core settings
  sessionTimeout: number; // milliseconds
  refreshTokenLifetime: number; // milliseconds
  accessTokenLifetime: number; // milliseconds
  maxConcurrentSessions: number;

  // Security settings
  enableBruteForceProtection: boolean;
  maxLoginAttempts: number;
  lockoutDuration: number; // milliseconds

  // Storage configuration
  sessionStorage: SessionStorageConfig;

  // Provider configuration
  providers: ProviderConfig[];
}

export interface SessionStorageConfig {
  type: 'memory' | 'redis' | 'database';
  connectionString?: string;
  prefix?: string;
  ttl?: number;
}

// Authentication Service Types
export interface AuthenticationService {
  initialize(): Promise<void>;
  getStatus(): Promise<ServiceStatus>;
  authenticate(credentials: AuthenticationRequest): Promise<AuthenticationResult>;
  refresh(refreshToken: string): Promise<AuthenticationResult>;
  logout(sessionId: string): Promise<void>;
  validateSession(sessionId: string): Promise<SessionValidationResult>;
}

export interface ServiceStatus {
  healthy: boolean;
  version: string;
  uptime: number;
  lastCheck: Date;
  activeProviders: string[];
  activeSessions: number;
  totalLogins: number;
}

// Authentication Request/Response Types
export interface AuthenticationRequest {
  provider: string;
  credentials: Record<string, unknown>;
  clientInfo: ClientInfo;
  nsmClassification?: 'OPEN' | 'RESTRICTED' | 'CONFIDENTIAL' | 'SECRET';
}

export interface AuthenticationResult {
  success: boolean;
  accessToken?: string;
  refreshToken?: string;
  expiresIn?: number;
  user?: UserProfile;
  session?: SessionInfo;
  error?: AuthenticationError;
}

export interface SessionValidationResult {
  valid: boolean;
  user?: UserProfile;
  session?: SessionInfo;
  error?: string;
}

// User and Session Types
export interface UserProfile {
  id: string;
  email?: string;
  name?: string;
  roles: string[];
  permissions: string[];
  nsmClassification: 'OPEN' | 'RESTRICTED' | 'CONFIDENTIAL' | 'SECRET';
  norwegianPersonalNumber?: string | undefined; // For Norwegian government integration
  organizationUnit?: string | undefined; // For municipal hierarchy
  metadata: Record<string, unknown>;
}

export interface SessionInfo {
  id: string;
  userId: string;
  provider: string;
  createdAt: Date;
  lastAccessedAt: Date;
  expiresAt: Date;
  clientInfo: ClientInfo;
  nsmClassification: 'OPEN' | 'RESTRICTED' | 'CONFIDENTIAL' | 'SECRET';
}

export interface ClientInfo {
  ipAddress: string;
  userAgent: string;
  deviceId?: string;
  platform?: string;
  version?: string;
}

// Provider Configuration Types
export interface ProviderConfig {
  id: string;
  type: ProviderType;
  name: string;
  enabled: boolean;
  nsmClassification?: NSMClassification;
  settings?: Record<string, unknown>;
  config?: ProviderSpecificConfig; // Legacy support
}

export type ProviderType =
  | 'norwegian-id'
  | 'oauth'
  | 'oidc'
  | 'saml'
  | 'eidas'
  | 'norwegian-idporten' // Legacy
  | 'norwegian-bankid' // Legacy
  | 'norwegian-feide' // Legacy
  | 'norwegian-minid' // Legacy
  | 'oauth2' // Legacy
  | 'ldap'
  | 'local';

export interface ProviderSpecificConfig {
  // OAuth2/OIDC providers
  clientId?: string;
  clientSecret?: string;
  authorizationUrl?: string;
  tokenUrl?: string;
  userInfoUrl?: string;
  scope?: string[];

  // SAML providers
  entityId?: string;
  ssoUrl?: string;
  certificate?: string;

  // Norwegian specific
  levelOfAssurance?: 'LOW' | 'SUBSTANTIAL' | 'HIGH';
  personalNumberRequired?: boolean;

  // LDAP
  url?: string;
  baseDN?: string;
  bindDN?: string;
  bindPassword?: string;
}

// Error Types
export interface AuthenticationError {
  code: string;
  message: string;
  details?: Record<string, unknown>;
  nsmClassification?: 'OPEN' | 'RESTRICTED' | 'CONFIDENTIAL' | 'SECRET';
}

// Token Types
export interface TokenClaims {
  sub: string; // User ID
  iss: string; // Issuer
  aud: string; // Audience
  exp: number; // Expiration time
  iat: number; // Issued at
  jti: string; // JWT ID

  // Custom claims
  roles: string[];
  permissions: string[];
  nsmClassification: 'OPEN' | 'RESTRICTED' | 'CONFIDENTIAL' | 'SECRET';
  norwegianPersonalNumber?: string | undefined;
  organizationUnit?: string | undefined;
  sessionId: string;
}

// Event Types
export interface AuthenticationEvent {
  type: AuthenticationEventType;
  userId?: string;
  sessionId?: string;
  provider?: string;
  timestamp: Date;
  clientInfo?: ClientInfo;
  metadata?: Record<string, unknown>;
  nsmClassification: 'OPEN' | 'RESTRICTED' | 'CONFIDENTIAL' | 'SECRET';
}

export type AuthenticationEventType =
  | 'login_success'
  | 'login_failure'
  | 'logout'
  | 'session_expired'
  | 'token_refreshed'
  | 'brute_force_detected'
  | 'suspicious_activity'
  | 'gdpr_consent_given'
  | 'gdpr_consent_withdrawn';

// Legacy compatibility
export interface authenticationConfig extends AuthenticationConfig {}
export interface authenticationService extends AuthenticationService {}

// Additional missing types for compatibility
export interface LoginRequest extends AuthenticationRequest {}
export interface LoginResult extends AuthenticationResult {}
export interface LogoutResult {
  success: boolean;
  error?: string;
}
export interface RefreshTokenResult {
  success: boolean;
  accessToken?: string;
  refreshToken?: string;
  expiresIn?: number;
  error?: string;
}

export interface SessionConfig extends SessionStorageConfig {}
export interface TokenValidationResult {
  valid: boolean;
  claims?: TokenClaims;
  error?: string;
}

export interface AuthProvider extends ProviderConfig {}
export interface ProviderMetadata {
  id: string;
  name: string;
  type: ProviderType;
  supportedFeatures: string[];
  endpoint?: string;
}

export interface NorwegianIDSessionInfo extends SessionInfo {
  personalNumber?: string;
  levelOfAssurance: 'LOW' | 'SUBSTANTIAL' | 'HIGH';
}

// GDPR Types
export interface GDPRDataRequest {
  id: string;
  userId: string;
  requestType: 'access' | 'portability' | 'erasure' | 'rectification';
  status: 'pending' | 'processing' | 'completed' | 'rejected';
  requestedAt: Date;
  completedAt?: Date;
  data?: Record<string, unknown>;
}

export interface GDPRDataSubject {
  id: string;
  personalNumber?: string;
  email?: string;
  name?: string;
  dataProcessingAgreements: string[];
  consentRecords: ConsentRecord[];
}

export interface ConsentRecord {
  id: string;
  purpose: string;
  dataCategories: string[];
  processingBasis: string;
  consentGivenAt: Date;
  consentWithdrawnAt?: Date;
  isActive: boolean;
}

// Role and Permission Types
export interface Role {
  id: string;
  name: string;
  description: string;
  permissions: string[];
  nsmClassification: NSMClassification;
}

export interface Permission {
  id: string;
  name: string;
  description: string;
  resource: string;
  action: string;
  conditions?: PermissionConditions;
}

export interface PermissionConditions {
  ipAddressRestrictions?: string[];
  timeRestrictions?: {
    startTime: string;
    endTime: string;
    days: number[];
  };
  nsmLevelRequired?: NSMClassification;
  organizationUnitRequired?: string[];
}

// Error Types
export interface AuthError extends AuthenticationError {
  code: string;
  message: string;
  details?: Record<string, unknown>;
  timestamp: Date;
}

// Validation and Safety Types
export interface ValidationResult<T = unknown> {
  valid: boolean;
  success: boolean;
  errors: ValidationError[];
  warnings: ValidationWarning[];
  data?: T;
  error?: string;
}

export interface ValidationError {
  field: string;
  message: string;
  code: string;
}

export interface ValidationWarning {
  field: string;
  message: string;
  code: string;
}

export interface SafeAccessResult<T> {
  success: boolean;
  data?: T;
  error?: string;
}
