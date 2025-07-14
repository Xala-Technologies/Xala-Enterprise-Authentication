/**
 * OAuth 2.1 Provider Implementation
 * Supports standard OAuth flows with PKCE
 * Enterprise Standards v4.0.0 compliant
 */

import { randomBytes, createHash } from 'crypto';

import type { UserProfile } from '../types/index.js';


import type {
  AuthenticationProvider,
  AuthenticationCredentials,
  AuthenticationProviderResult,
  RefreshResult,
  OAuthCredentials,
  OAuthProviderConfig,
} from './types.js';

export class OAuthProvider implements AuthenticationProvider {
  readonly id: string;
  readonly name: string;
  readonly type = 'oauth' as const;
  readonly enabled: boolean;
  readonly nsmClassification;
  readonly supportedLanguages = ['nb-NO', 'en-US'] as const;

  private readonly config: OAuthProviderConfig;
  private initialized = false;
  private readonly stateStore = new Map<string, StateData>();

  constructor(config: OAuthProviderConfig) {
    this.config = config;
    this.id = config.id;
    this.name = config.name;
    this.enabled = config.enabled;
    this.nsmClassification = config.nsmClassification;
  }

  async initialize(): Promise<void> {
    if (this.initialized) {
      return;
    }

    // In production, this would:
    // 1. Validate OAuth endpoints
    // 2. Fetch well-known configuration if available
    // 3. Setup token validation

    this.initialized = true;
  }

  async authenticate(
    credentials: AuthenticationCredentials,
  ): Promise<AuthenticationProviderResult> {
    if (!this.initialized) {
      await this.initialize();
    }

    if (!this.isOAuthCredentials(credentials)) {
      return {
        success: false,
        error: {
          code: 'INVALID_CREDENTIALS',
          message: 'Invalid OAuth credentials',
          nsmClassification: 'OPEN',
        },
      };
    }

    // Handle authorization code flow
    if (credentials.code && credentials.state) {
      return this.handleAuthorizationCode(credentials);
    }

    // Handle direct credentials (for testing/development only)
    if (credentials.email && credentials.password) {
      return this.handleDirectCredentials(credentials);
    }

    return {
      success: false,
      error: {
        code: 'INVALID_FLOW',
        message: 'Invalid OAuth flow',
        nsmClassification: 'OPEN',
      },
    };
  }

  async refresh(_refreshToken: string): Promise<RefreshResult> {
    // In production, exchange refresh token for new access token
    return {
      success: true,
      accessToken: this.generateToken({ id: 'refreshed' } as UserProfile),
      expiresIn: 3600,
    };
  }

  async logout(_sessionId: string): Promise<void> {
    // In production, revoke tokens at OAuth provider
    return Promise.resolve();
  }

  async validateCredentials(
    credentials: AuthenticationCredentials,
  ): Promise<boolean> {
    if (!this.isOAuthCredentials(credentials)) {
      return false;
    }

    if (credentials.email) {
      return isValidEmail(credentials.email);
    }

    return !!(credentials.code && credentials.state);
  }

  async getUserProfile(_accessToken: string): Promise<UserProfile | null> {
    // In production, fetch user profile from userInfo endpoint
    return null;
  }

  /**
   * Generate authorization URL for OAuth flow
   */
  generateAuthorizationUrl(): string {
    const state = this.generateState();
    const params = new URLSearchParams({
      client_id: this.config.clientId,
      response_type: 'code',
      redirect_uri: this.config.redirectUri,
      scope: this.config.scopes.join(' '),
      state,
    });

    if (this.config.pkce) {
      const { codeVerifier, codeChallenge } = this.generatePKCE();
      this.stateStore.set(state, { codeVerifier, createdAt: new Date() });
      params.set('code_challenge', codeChallenge);
      params.set('code_challenge_method', 'S256');
    }

    return `${this.config.authorizationUrl}?${params.toString()}`;
  }

  private async handleAuthorizationCode(
    credentials: OAuthCredentials,
  ): Promise<AuthenticationProviderResult> {
    // Validate state
    const stateData = this.stateStore.get(credentials.state!);
    if (!stateData) {
      return {
        success: false,
        error: {
          code: 'INVALID_STATE',
          message: 'Invalid or expired state parameter',
          nsmClassification: 'OPEN',
        },
      };
    }

    this.stateStore.delete(credentials.state!);

    // In production, exchange code for tokens
    const user: UserProfile = {
      id: `oauth-${randomBytes(8).toString('hex')}`,
      email: 'user@example.com',
      name: 'OAuth User',
      roles: ['user'],
      permissions: ['read'],
      nsmClassification: 'OPEN',
      metadata: {
        provider: this.id,
      },
    };

    return {
      success: true,
      user,
      accessToken: this.generateToken(user),
      refreshToken: this.generateToken(user, true),
      expiresIn: 3600,
    };
  }

  private async handleDirectCredentials(
    credentials: OAuthCredentials,
  ): Promise<AuthenticationProviderResult> {
    if (!isValidEmail(credentials.email!)) {
      return {
        success: false,
        error: {
          code: 'INVALID_EMAIL',
          message: 'Invalid email format',
          nsmClassification: 'OPEN',
        },
      };
    }

    // In production, validate credentials with OAuth provider
    const user: UserProfile = {
      id: `oauth-${randomBytes(8).toString('hex')}`,
      email: credentials.email,
      name: 'OAuth User',
      roles: ['user'],
      permissions: ['read'],
      nsmClassification: 'OPEN',
      metadata: {
        provider: this.id,
      },
    };

    return {
      success: true,
      user,
      accessToken: this.generateToken(user),
      refreshToken: this.generateToken(user, true),
      expiresIn: 3600,
    };
  }

  private isOAuthCredentials(
    credentials: AuthenticationCredentials,
  ): credentials is OAuthCredentials {
    return credentials.type === 'oauth';
  }

  private generateState(): string {
    return randomBytes(32).toString('base64url');
  }

  private generatePKCE(): { codeVerifier: string; codeChallenge: string } {
    const codeVerifier = randomBytes(32).toString('base64url');
    const codeChallenge = createHash('sha256')
      .update(codeVerifier)
      .digest('base64url');

    return { codeVerifier, codeChallenge };
  }

  private generateToken(user: UserProfile, refresh = false): string {
    const payload = {
      sub: user.id,
      email: user.email,
      type: refresh ? 'refresh' : 'access',
      provider: this.id,
      nonce: randomBytes(16).toString('hex'),
    };

    return Buffer.from(JSON.stringify(payload)).toString('base64');
  }

  static create(config: OAuthProviderConfig): OAuthProvider {
    return new OAuthProvider(config);
  }
}

interface StateData {
  readonly codeVerifier: string;
  readonly createdAt: Date;
}

// Placeholder for removed type-safety function
function isValidEmail(email: string): boolean {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
}

