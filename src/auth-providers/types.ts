/**
 * Authentication Provider Types
 * Enterprise Standards v4.0.0 compliant
 */

import type { UserProfile, NSMClassification } from '../types/index.js';

// Re-export commonly used types
export type { UserProfile } from '../types/index.js';

/**
 * Base provider interface
 */
export interface AuthenticationProvider {
  readonly id: string;
  readonly name: string;
  readonly type: 'norwegian-id' | 'oauth' | 'saml' | 'oidc' | 'eidas';
  readonly enabled: boolean;
  readonly nsmClassification: NSMClassification;
  readonly supportedLanguages: readonly string[];

  initialize(): Promise<void>;
  authenticate(credentials: AuthenticationCredentials): Promise<AuthenticationProviderResult>;
  refresh(refreshToken: string): Promise<RefreshResult>;
  logout(sessionId: string): Promise<void>;
  validateCredentials(credentials: AuthenticationCredentials): Promise<boolean>;
  getUserProfile(accessToken: string): Promise<UserProfile | null>;
}

/**
 * Authentication credentials
 */
export interface AuthenticationCredentials {
  readonly type: string;
  readonly [key: string]: unknown;
}

/**
 * Norwegian ID credentials
 */
export interface NorwegianIDCredentials extends AuthenticationCredentials {
  readonly type: 'norwegian-id';
  readonly personalNumber: string;
  readonly bankId?: string;
  readonly buypass?: string;
  readonly commfides?: string;
}

/**
 * OAuth credentials
 */
export interface OAuthCredentials extends AuthenticationCredentials {
  readonly type: 'oauth';
  readonly email?: string;
  readonly password?: string;
  readonly code?: string;
  readonly state?: string;
  readonly redirectUri?: string;
}

/**
 * Provider result
 */
export interface AuthenticationProviderResult {
  readonly success: boolean;
  readonly user?: UserProfile;
  readonly accessToken?: string;
  readonly refreshToken?: string;
  readonly expiresIn?: number;
  readonly error?: {
    readonly code: string;
    readonly message: string;
    readonly nsmClassification: NSMClassification;
  };
}

/**
 * Refresh result
 */
export interface RefreshResult {
  readonly success: boolean;
  readonly accessToken?: string;
  readonly expiresIn?: number;
  readonly error?: string;
}

/**
 * Norwegian ID provider configuration
 */
export interface NorwegianIDProviderConfig {
  readonly id: string;
  readonly name: string;
  readonly enabled: boolean;
  readonly nsmClassification: NSMClassification;
  readonly bankIdConfig?: {
    readonly clientId: string;
    readonly clientSecret: string;
    readonly discoveryUrl: string;
    readonly merchantName: string;
  };
  readonly buypassConfig?: {
    readonly clientId: string;
    readonly clientSecret: string;
    readonly discoveryUrl: string;
  };
  readonly commfidesConfig?: {
    readonly clientId: string;
    readonly clientSecret: string;
    readonly discoveryUrl: string;
  };
  readonly testMode?: boolean;
}

/**
 * OAuth provider configuration
 */
export interface OAuthProviderConfig {
  readonly id: string;
  readonly name: string;
  readonly enabled: boolean;
  readonly nsmClassification: NSMClassification;
  readonly clientId: string;
  readonly clientSecret: string;
  readonly authorizationUrl: string;
  readonly tokenUrl: string;
  readonly userInfoUrl: string;
  readonly scopes: readonly string[];
  readonly redirectUri: string;
  readonly pkce?: boolean;
  readonly wellKnownUrl?: string;
}

/**
 * Authentication request interface
 */
export interface AuthenticationRequest {
  readonly provider: string;
  readonly credentials: Record<string, unknown>;
  readonly clientInfo?: {
    readonly userAgent?: string;
    readonly ipAddress?: string;
    readonly deviceId?: string;
  };
}

/**
 * Authentication response interface
 */
export interface AuthenticationResponse {
  readonly success: boolean;
  readonly user?: UserProfile;
  readonly error?: {
    readonly code: string;
    readonly message: string;
    readonly nsmClassification: NSMClassification;
  };
}

/**
 * Provider configuration interface
 */
export interface ProviderConfig {
  readonly id: string;
  readonly name: string;
  readonly type: string;
  readonly enabled: boolean;
  readonly nsmClassification?: NSMClassification;
  readonly settings?: Record<string, unknown>;
}

/**
 * Provider metadata interface
 */
export interface ProviderMetadata {
  readonly id: string;
  readonly name: string;
  readonly type: string;
  readonly enabled: boolean;
  readonly icon?: string;
  readonly description?: string;
  readonly supportedFeatures?: readonly string[];
  readonly configuration?: Record<string, unknown>;
}

/**
 * Provider registry interface
 */
export interface ProviderRegistry {
  register(provider: AuthenticationProvider): void;
  unregister(providerId: string): void;
  getProvider(providerId: string): AuthenticationProvider | null;
  getAllProviders(): readonly AuthenticationProvider[];
  getEnabledProviders(): readonly AuthenticationProvider[];
  getProvidersByType(type: AuthenticationProvider['type']): readonly AuthenticationProvider[];
}
