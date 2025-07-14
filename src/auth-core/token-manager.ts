/**
 * Token Manager Implementation
 * @xala-technologies/authentication
 */

import { randomBytes, createHmac, timingSafeEqual } from 'crypto';

import { Logger } from '@xala-technologies/enterprise-standards';

import type { UserProfile, TokenClaims } from '../types/index.js';

import type {
  TokenManager,
  TokenValidationResult,
  TokenRefreshResult,
} from './types.js';

export class DefaultTokenManager implements TokenManager {
  private readonly accessTokenSecret: string;
  private readonly refreshTokenSecret: string;
  private readonly accessTokenLifetime: number;
  private readonly refreshTokenLifetime: number;
  private readonly issuer: string;
  private readonly audience: string;
  private readonly logger: Logger;
  private readonly revokedTokens: Set<string> = new Set();

  constructor(options: {
    accessTokenSecret: string;
    refreshTokenSecret: string;
    accessTokenLifetime: number;
    refreshTokenLifetime: number;
    issuer: string;
    audience: string;
    logger: Logger;
  }) {
    this.accessTokenSecret = options.accessTokenSecret;
    this.refreshTokenSecret = options.refreshTokenSecret;
    this.accessTokenLifetime = options.accessTokenLifetime;
    this.refreshTokenLifetime = options.refreshTokenLifetime;
    this.issuer = options.issuer;
    this.audience = options.audience;
    this.logger = options.logger;
  }

  async generateAccessToken(
    user: UserProfile,
    sessionId: string,
  ): Promise<string> {
    const now = Math.floor(Date.now() / 1000);
    const exp = now + Math.floor(this.accessTokenLifetime / 1000);
    const jti = randomBytes(16).toString('hex');

    const claims: TokenClaims = {
      sub: user.id,
      iss: this.issuer,
      aud: this.audience,
      exp,
      iat: now,
      jti,
      roles: user.roles,
      permissions: user.permissions,
      nsmClassification: user.nsmClassification,
      ...(user.norwegianPersonalNumber && {
        norwegianPersonalNumber: user.norwegianPersonalNumber,
      }),
      ...(user.organizationUnit && { organizationUnit: user.organizationUnit }),
      sessionId,
    };

    const token = this.createJWT(claims, this.accessTokenSecret);

    this.logger.debug('Access token generated', {
      userId: user.id,
      sessionId,
      expiresAt: new Date(exp * 1000),
      nsmClassification: user.nsmClassification,
    });

    return token;
  }

  async generateRefreshToken(
    user: UserProfile,
    sessionId: string,
  ): Promise<string> {
    const now = Math.floor(Date.now() / 1000);
    const exp = now + Math.floor(this.refreshTokenLifetime / 1000);
    const jti = randomBytes(16).toString('hex');

    const claims: TokenClaims = {
      sub: user.id,
      iss: this.issuer,
      aud: this.audience,
      exp,
      iat: now,
      jti,
      roles: user.roles,
      permissions: user.permissions,
      nsmClassification: user.nsmClassification,
      ...(user.norwegianPersonalNumber && {
        norwegianPersonalNumber: user.norwegianPersonalNumber,
      }),
      ...(user.organizationUnit && { organizationUnit: user.organizationUnit }),
      sessionId,
    };

    const token = this.createJWT(claims, this.refreshTokenSecret);

    this.logger.debug('Refresh token generated', {
      userId: user.id,
      sessionId,
      expiresAt: new Date(exp * 1000),
    });

    return token;
  }

  async validateToken(token: string): Promise<TokenValidationResult> {
    try {
      // Check if token is revoked
      if (this.revokedTokens.has(token)) {
        return {
          valid: false,
          error: 'Token has been revoked',
        };
      }

      const claims = this.verifyJWT(token, this.accessTokenSecret);

      if (!claims) {
        return {
          valid: false,
          error: 'Invalid token signature',
        };
      }

      // Check expiration
      const now = Math.floor(Date.now() / 1000);
      if (claims.exp < now) {
        return {
          valid: false,
          error: 'Token has expired',
        };
      }

      // Validate required claims
      if (!claims.sub || !claims.sessionId || !claims.nsmClassification) {
        return {
          valid: false,
          error: 'Missing required claims',
        };
      }

      return {
        valid: true,
        claims,
      };
    } catch (error) {
      this.logger.warn('Token validation failed', {
        error: (error as Error).message,
      });
      return {
        valid: false,
        error: 'Token validation error',
      };
    }
  }

  async refreshAccessToken(refreshToken: string): Promise<TokenRefreshResult> {
    try {
      const claims = this.verifyJWT(refreshToken, this.refreshTokenSecret);

      if (!claims) {
        return {
          success: false,
          error: 'Invalid refresh token',
        };
      }

      // Check expiration
      const now = Math.floor(Date.now() / 1000);
      if (claims.exp < now) {
        return {
          success: false,
          error: 'Refresh token has expired',
        };
      }

      // Check if token is revoked
      if (this.revokedTokens.has(refreshToken)) {
        return {
          success: false,
          error: 'Refresh token has been revoked',
        };
      }

      // Create new access token with updated claims
      const user: UserProfile = {
        id: claims.sub,
        roles: claims.roles,
        permissions: claims.permissions,
        nsmClassification: claims.nsmClassification,
        ...(claims.norwegianPersonalNumber && {
          norwegianPersonalNumber: claims.norwegianPersonalNumber,
        }),
        ...(claims.organizationUnit && {
          organizationUnit: claims.organizationUnit,
        }),
        metadata: {},
      };

      const newAccessToken = await this.generateAccessToken(
        user,
        claims.sessionId,
      );
      const expiresIn = Math.floor(this.accessTokenLifetime / 1000);

      this.logger.debug('Access token refreshed', {
        userId: claims.sub,
        sessionId: claims.sessionId,
      });

      return {
        success: true,
        accessToken: newAccessToken,
        expiresIn,
      };
    } catch (error) {
      this.logger.warn('Token refresh failed', {
        error: (error as Error).message,
      });
      return {
        success: false,
        error: 'Token refresh error',
      };
    }
  }

  async revokeToken(token: string): Promise<void> {
    this.revokedTokens.add(token);

    // In production, this should persist to a database or Redis
    // For now, we store in memory

    this.logger.info('Token revoked', {
      tokenPrefix: `${token.substring(0, 10) }...`,
    });
  }

  async decodeToken(token: string): Promise<TokenClaims | null> {
    try {
      const parts = token.split('.');
      if (parts.length !== 3) {
        return null;
      }

      const payload = parts[1];
      if (!payload) {
        return null;
      }

      const decoded = Buffer.from(payload, 'base64url').toString('utf8');
      const claims = JSON.parse(decoded) as TokenClaims;

      return claims;
    } catch {
      return null;
    }
  }

  private createJWT(claims: TokenClaims, secret: string): string {
    const header = {
      alg: 'HS256',
      typ: 'JWT',
    };

    const encodedHeader = Buffer.from(JSON.stringify(header)).toString(
      'base64url',
    );
    const encodedPayload = Buffer.from(JSON.stringify(claims)).toString(
      'base64url',
    );

    const data = `${encodedHeader}.${encodedPayload}`;
    const signature = createHmac('sha256', secret)
      .update(data)
      .digest('base64url');

    return `${data}.${signature}`;
  }

  private verifyJWT(token: string, secret: string): TokenClaims | null {
    try {
      const parts = token.split('.');
      if (parts.length !== 3) {
        return null;
      }

      const [encodedHeader, encodedPayload, providedSignature] = parts;
      const data = `${encodedHeader}.${encodedPayload}`;
      const expectedSignature = createHmac('sha256', secret)
        .update(data)
        .digest('base64url');

      // Timing-safe comparison
      if (!providedSignature || !expectedSignature) {
        return null;
      }

      const providedSigBuffer = Buffer.from(providedSignature, 'base64url');
      const expectedSigBuffer = Buffer.from(expectedSignature, 'base64url');

      if (providedSigBuffer.length !== expectedSigBuffer.length) {
        return null;
      }

      if (!timingSafeEqual(providedSigBuffer, expectedSigBuffer)) {
        return null;
      }

      if (!encodedPayload) {
        return null;
      }

      const payload = Buffer.from(encodedPayload, 'base64url').toString('utf8');
      const claims = JSON.parse(payload) as TokenClaims;

      return claims;
    } catch {
      return null;
    }
  }

  static create(options: {
    accessTokenSecret: string;
    refreshTokenSecret: string;
    accessTokenLifetime: number;
    refreshTokenLifetime: number;
    issuer: string;
    audience: string;
    logger: Logger;
  }): DefaultTokenManager {
    return new DefaultTokenManager(options);
  }
}

// Export alias for compatibility
export { DefaultTokenManager as TokenManager };
