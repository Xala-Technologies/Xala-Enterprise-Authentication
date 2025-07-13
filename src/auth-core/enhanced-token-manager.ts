/**
 * Enhanced Token Manager Implementation
 * Implements JWKS rotation and token binding for enterprise security
 * Enterprise Standards v4.0.0 compliant
 */

import { randomBytes, createHmac, timingSafeEqual, generateKeyPairSync } from "crypto";
import { Logger } from "../foundation-mock.js"
import type { UserProfile, TokenClaims, NSMClassification } from "../types/index.js";
import type { TokenManager, TokenValidationResult, TokenRefreshResult } from "./types.js";

interface JWKSKey {
  readonly kid: string;
  readonly kty: 'oct' | 'RSA';
  readonly alg: 'HS256' | 'RS256';
  readonly use: 'sig';
  readonly secret?: string;
  readonly publicKey?: string;
  readonly privateKey?: string;
  readonly createdAt: Date;
  readonly expiresAt: Date;
}

interface DeviceBinding {
  readonly deviceId: string;
  readonly fingerprint: string;
  readonly platform: string;
  readonly bindingType: 'device' | 'session';
  readonly createdAt: Date;
}

interface EnhancedTokenClaims extends TokenClaims {
  readonly kid?: string;
  readonly deviceBinding?: DeviceBinding;
  readonly bindingHash?: string;
}

export class EnhancedTokenManager implements TokenManager {
  private readonly logger: Logger;
  private readonly issuer: string;
  private readonly audience: string;
  private readonly accessTokenLifetime: number;
  private readonly refreshTokenLifetime: number;
  private readonly jwksRotationEnabled: boolean;
  private readonly tokenBindingEnabled: boolean;
  private readonly keyRotationInterval: number; // milliseconds
  
  private readonly activeKeys: Map<string, JWKSKey> = new Map();
  private readonly revokedTokens: Set<string> = new Set();
  private readonly deviceBindings: Map<string, DeviceBinding> = new Map();
  private currentKeyId: string;
  
  constructor(options: {
    accessTokenSecret?: string;
    refreshTokenSecret?: string;
    accessTokenLifetime: number;
    refreshTokenLifetime: number;
    issuer: string;
    audience: string;
    logger: Logger;
    jwksRotationEnabled?: boolean;
    tokenBindingEnabled?: boolean;
    keyRotationInterval?: number;
  }) {
    this.logger = options.logger;
    this.issuer = options.issuer;
    this.audience = options.audience;
    this.accessTokenLifetime = options.accessTokenLifetime;
    this.refreshTokenLifetime = options.refreshTokenLifetime;
    this.jwksRotationEnabled = options.jwksRotationEnabled ?? true;
    this.tokenBindingEnabled = options.tokenBindingEnabled ?? true;
    this.keyRotationInterval = options.keyRotationInterval ?? 24 * 60 * 60 * 1000; // 24 hours
    
    // Initialize with primary key
    this.currentKeyId = this.generateInitialKey(options.accessTokenSecret);
    
    // Start key rotation if enabled
    if (this.jwksRotationEnabled) {
      this.startKeyRotation();
    }
    
    this.logger.info('Enhanced Token Manager initialized', {
      jwksRotation: this.jwksRotationEnabled,
      tokenBinding: this.tokenBindingEnabled,
      nsmClassification: 'RESTRICTED' as NSMClassification
    });
  }

  async generateAccessToken(
    user: UserProfile,
    sessionId: string,
    deviceInfo?: {
      deviceId: string;
      fingerprint: string;
      platform: string;
    }
  ): Promise<string> {
    const now = Math.floor(Date.now() / 1000);
    const exp = now + Math.floor(this.accessTokenLifetime / 1000);
    const jti = randomBytes(16).toString("hex");
    
    // Create device binding if enabled and device info provided
    let deviceBinding: DeviceBinding | undefined;
    let bindingHash: string | undefined;
    
    if (this.tokenBindingEnabled && deviceInfo) {
      deviceBinding = {
        deviceId: deviceInfo.deviceId,
        fingerprint: deviceInfo.fingerprint,
        platform: deviceInfo.platform,
        bindingType: 'device',
        createdAt: new Date()
      };
      
      // Store device binding
      this.deviceBindings.set(jti, deviceBinding);
      
      // Create binding hash for token
      bindingHash = this.createBindingHash(deviceBinding, sessionId);
    }

    const claims: EnhancedTokenClaims = {
      sub: user.id,
      iss: this.issuer,
      aud: this.audience,
      exp,
      iat: now,
      jti,
      kid: this.currentKeyId,
      roles: user.roles,
      permissions: user.permissions,
      nsmClassification: user.nsmClassification,
      sessionId,
      ...(user.norwegianPersonalNumber && {
        norwegianPersonalNumber: user.norwegianPersonalNumber,
      }),
      ...(user.organizationUnit && { organizationUnit: user.organizationUnit }),
      ...(deviceBinding && { deviceBinding }),
      ...(bindingHash && { bindingHash }),
    };

    const currentKey = this.activeKeys.get(this.currentKeyId);
    if (!currentKey) {
      throw new Error('No active signing key available');
    }

    const token = this.createJWT(claims, currentKey);

    this.logger.debug("Enhanced access token generated", {
      userId: user.id,
      sessionId,
      kid: this.currentKeyId,
      hasDeviceBinding: !!deviceBinding,
      expiresAt: new Date(exp * 1000),
      nsmClassification: user.nsmClassification,
    });

    return token;
  }

  async generateRefreshToken(
    user: UserProfile,
    sessionId: string,
    deviceInfo?: {
      deviceId: string;
      fingerprint: string;
      platform: string;
    }
  ): Promise<string> {
    const now = Math.floor(Date.now() / 1000);
    const exp = now + Math.floor(this.refreshTokenLifetime / 1000);
    const jti = randomBytes(16).toString("hex");

    // Use a separate longer-lived key for refresh tokens
    let refreshKeyId = this.findLongestLivedKey();
    
    const claims: EnhancedTokenClaims = {
      sub: user.id,
      iss: this.issuer,
      aud: this.audience,
      exp,
      iat: now,
      jti,
      kid: refreshKeyId,
      roles: user.roles,
      permissions: user.permissions,
      nsmClassification: user.nsmClassification,
      sessionId,
      ...(user.norwegianPersonalNumber && {
        norwegianPersonalNumber: user.norwegianPersonalNumber,
      }),
      ...(user.organizationUnit && { organizationUnit: user.organizationUnit }),
    };

    const refreshKey = this.activeKeys.get(refreshKeyId);
    if (!refreshKey) {
      throw new Error('No active refresh key available');
    }

    const token = this.createJWT(claims, refreshKey);

    this.logger.debug("Enhanced refresh token generated", {
      userId: user.id,
      sessionId,
      kid: refreshKeyId,
      expiresAt: new Date(exp * 1000),
    });

    return token;
  }

  async validateToken(token: string, deviceInfo?: {
    deviceId: string;
    fingerprint: string;
    platform: string;
  }): Promise<TokenValidationResult> {
    try {
      // Check if token is revoked
      if (this.revokedTokens.has(token)) {
        return {
          valid: false,
          error: "Token has been revoked",
        };
      }

      // Decode to get kid
      const decodedClaims = await this.decodeToken(token);
      if (!decodedClaims) {
        return {
          valid: false,
          error: "Invalid token format",
        };
      }

      // Get the appropriate key for validation
      const keyId = (decodedClaims as EnhancedTokenClaims).kid || this.currentKeyId;
      const validationKey = this.activeKeys.get(keyId);
      
      if (!validationKey) {
        return {
          valid: false,
          error: "Unknown signing key",
        };
      }

      const claims = this.verifyJWT(token, validationKey);

      if (!claims) {
        return {
          valid: false,
          error: "Invalid token signature",
        };
      }

      // Check expiration
      const now = Math.floor(Date.now() / 1000);
      if (claims.exp < now) {
        return {
          valid: false,
          error: "Token has expired",
        };
      }

      // Validate required claims
      if (!claims.sub || !claims.sessionId || !claims.nsmClassification) {
        return {
          valid: false,
          error: "Missing required claims",
        };
      }

      // Validate device binding if enabled
      if (this.tokenBindingEnabled && deviceInfo) {
        const enhancedClaims = claims as EnhancedTokenClaims;
        const validationResult = this.validateDeviceBinding(enhancedClaims, deviceInfo);
        
        if (!validationResult.valid) {
          return validationResult;
        }
      }

      return {
        valid: true,
        claims,
      };
    } catch (error) {
      this.logger.warn("Enhanced token validation failed", {
        error: (error as Error).message,
      });
      return {
        valid: false,
        error: "Token validation error",
      };
    }
  }

  async refreshAccessToken(refreshToken: string): Promise<TokenRefreshResult> {
    try {
      // Decode to get kid
      const decodedClaims = await this.decodeToken(refreshToken);
      if (!decodedClaims) {
        return {
          success: false,
          error: "Invalid refresh token format",
        };
      }

      const keyId = (decodedClaims as EnhancedTokenClaims).kid || this.currentKeyId;
      const validationKey = this.activeKeys.get(keyId);
      
      if (!validationKey) {
        return {
          success: false,
          error: "Unknown refresh token key",
        };
      }

      const claims = this.verifyJWT(refreshToken, validationKey);

      if (!claims) {
        return {
          success: false,
          error: "Invalid refresh token",
        };
      }

      // Check expiration
      const now = Math.floor(Date.now() / 1000);
      if (claims.exp < now) {
        return {
          success: false,
          error: "Refresh token has expired",
        };
      }

      // Check if token is revoked
      if (this.revokedTokens.has(refreshToken)) {
        return {
          success: false,
          error: "Refresh token has been revoked",
        };
      }

      // Create new access token with updated claims and current key
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

      // Maintain device binding if it exists
      const enhancedClaims = claims as EnhancedTokenClaims;
      const deviceInfo = enhancedClaims.deviceBinding ? {
        deviceId: enhancedClaims.deviceBinding.deviceId,
        fingerprint: enhancedClaims.deviceBinding.fingerprint,
        platform: enhancedClaims.deviceBinding.platform
      } : undefined;

      const newAccessToken = await this.generateAccessToken(
        user,
        claims.sessionId,
        deviceInfo
      );
      const expiresIn = Math.floor(this.accessTokenLifetime / 1000);

      this.logger.debug("Enhanced access token refreshed", {
        userId: claims.sub,
        sessionId: claims.sessionId,
        newKid: this.currentKeyId,
        oldKid: keyId
      });

      return {
        success: true,
        accessToken: newAccessToken,
        expiresIn,
      };
    } catch (error) {
      this.logger.warn("Enhanced token refresh failed", {
        error: (error as Error).message,
      });
      return {
        success: false,
        error: "Token refresh error",
      };
    }
  }

  async revokeToken(token: string): Promise<void> {
    this.revokedTokens.add(token);

    // Clean up device binding if it exists
    const claims = await this.decodeToken(token);
    if (claims?.jti) {
      this.deviceBindings.delete(claims.jti);
    }

    this.logger.info("Enhanced token revoked", {
      tokenPrefix: token.substring(0, 10) + "...",
      nsmClassification: 'RESTRICTED' as NSMClassification
    });
  }

  async decodeToken(token: string): Promise<TokenClaims | null> {
    try {
      const parts = token.split(".");
      if (parts.length !== 3) {
        return null;
      }

      const payload = parts[1];
      if (!payload) {
        return null;
      }

      const decoded = Buffer.from(payload, "base64url").toString("utf8");
      const claims = JSON.parse(decoded) as TokenClaims;

      return claims;
    } catch {
      return null;
    }
  }

  /**
   * Get current JWKS (JSON Web Key Set) for public key distribution
   */
  async getJWKS(): Promise<{ keys: Array<{ kid: string; kty: string; alg: string; use: string; n?: string; e?: string }> }> {
    const publicKeys = Array.from(this.activeKeys.values())
      .filter(key => key.expiresAt > new Date())
      .map(key => ({
        kid: key.kid,
        kty: key.kty,
        alg: key.alg,
        use: key.use,
        ...(key.publicKey && { n: key.publicKey, e: 'AQAB' })
      }));

    return { keys: publicKeys };
  }

  /**
   * Rotate keys immediately (for testing or emergency rotation)
   */
  async rotateKeys(): Promise<void> {
    const newKeyId = this.generateNewKey();
    this.currentKeyId = newKeyId;
    
    // Clean up expired keys
    this.cleanupExpiredKeys();
    
    this.logger.info('JWKS keys rotated', {
      newKeyId,
      activeKeys: this.activeKeys.size,
      nsmClassification: 'RESTRICTED' as NSMClassification
    });
  }

  private generateInitialKey(secret?: string): string {
    const kid = `key-${Date.now()}-${randomBytes(8).toString('hex')}`;
    const now = new Date();
    const expiresAt = new Date(now.getTime() + this.keyRotationInterval * 2); // Double interval for overlap
    
    const key: JWKSKey = {
      kid,
      kty: 'oct',
      alg: 'HS256',
      use: 'sig',
      secret: secret || randomBytes(32).toString('hex'),
      createdAt: now,
      expiresAt
    };
    
    this.activeKeys.set(kid, key);
    return kid;
  }

  private generateNewKey(): string {
    const kid = `key-${Date.now()}-${randomBytes(8).toString('hex')}`;
    const now = new Date();
    const expiresAt = new Date(now.getTime() + this.keyRotationInterval * 2);
    
    const key: JWKSKey = {
      kid,
      kty: 'oct',
      alg: 'HS256',
      use: 'sig',
      secret: randomBytes(32).toString('hex'),
      createdAt: now,
      expiresAt
    };
    
    this.activeKeys.set(kid, key);
    return kid;
  }

  private findLongestLivedKey(): string {
    let longestLived = this.currentKeyId;
    let latestExpiry = new Date(0);
    
    for (const [kid, key] of this.activeKeys) {
      if (key.expiresAt > latestExpiry) {
        latestExpiry = key.expiresAt;
        longestLived = kid;
      }
    }
    
    return longestLived;
  }

  private startKeyRotation(): void {
    setInterval(() => {
      this.rotateKeys().catch(error => {
        this.logger.error('Key rotation failed', { error: error.message });
      });
    }, this.keyRotationInterval);
  }

  private cleanupExpiredKeys(): void {
    const now = new Date();
    for (const [kid, key] of this.activeKeys) {
      if (key.expiresAt < now) {
        this.activeKeys.delete(kid);
      }
    }
  }

  private createBindingHash(binding: DeviceBinding, sessionId: string): string {
    const bindingData = `${binding.deviceId}:${binding.fingerprint}:${sessionId}`;
    return createHmac('sha256', 'device-binding-secret')
      .update(bindingData)
      .digest('hex');
  }

  private validateDeviceBinding(
    claims: EnhancedTokenClaims, 
    deviceInfo: { deviceId: string; fingerprint: string; platform: string }
  ): TokenValidationResult {
    if (!claims.deviceBinding || !claims.bindingHash) {
      return {
        valid: false,
        error: "Token requires device binding but none found"
      };
    }

    // Validate device matches
    if (claims.deviceBinding.deviceId !== deviceInfo.deviceId) {
      return {
        valid: false,
        error: "Device binding mismatch - device ID"
      };
    }

    if (claims.deviceBinding.fingerprint !== deviceInfo.fingerprint) {
      return {
        valid: false,
        error: "Device binding mismatch - fingerprint"
      };
    }

    // Validate binding hash
    const expectedHash = this.createBindingHash(claims.deviceBinding, claims.sessionId);
    if (claims.bindingHash !== expectedHash) {
      return {
        valid: false,
        error: "Device binding hash validation failed"
      };
    }

    return { valid: true, claims };
  }

  private createJWT(claims: EnhancedTokenClaims, key: JWKSKey): string {
    const header = {
      alg: key.alg,
      typ: "JWT",
      kid: key.kid
    };

    const encodedHeader = Buffer.from(JSON.stringify(header)).toString("base64url");
    const encodedPayload = Buffer.from(JSON.stringify(claims)).toString("base64url");

    const data = `${encodedHeader}.${encodedPayload}`;
    const signature = createHmac("sha256", key.secret!)
      .update(data)
      .digest("base64url");

    return `${data}.${signature}`;
  }

  private verifyJWT(token: string, key: JWKSKey): EnhancedTokenClaims | null {
    try {
      const parts = token.split(".");
      if (parts.length !== 3) {
        return null;
      }

      const [encodedHeader, encodedPayload, providedSignature] = parts;
      const data = `${encodedHeader}.${encodedPayload}`;
      const expectedSignature = createHmac("sha256", key.secret!)
        .update(data)
        .digest("base64url");

      if (!providedSignature || !expectedSignature) {
        return null;
      }

      const providedSigBuffer = Buffer.from(providedSignature, "base64url");
      const expectedSigBuffer = Buffer.from(expectedSignature, "base64url");

      if (providedSigBuffer.length !== expectedSigBuffer.length) {
        return null;
      }

      if (!timingSafeEqual(providedSigBuffer, expectedSigBuffer)) {
        return null;
      }

      if (!encodedPayload) {
        return null;
      }

      const payload = Buffer.from(encodedPayload, "base64url").toString("utf8");
      const claims = JSON.parse(payload) as EnhancedTokenClaims;

      return claims;
    } catch {
      return null;
    }
  }

  static create(options: {
    accessTokenSecret?: string;
    refreshTokenSecret?: string;
    accessTokenLifetime: number;
    refreshTokenLifetime: number;
    issuer: string;
    audience: string;
    logger: Logger;
    jwksRotationEnabled?: boolean;
    tokenBindingEnabled?: boolean;
    keyRotationInterval?: number;
  }): EnhancedTokenManager {
    return new EnhancedTokenManager(options);
  }
}