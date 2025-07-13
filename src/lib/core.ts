/**
 * Core implementation for @xala-technologies/authentication
 */

import { randomBytes } from "crypto";
import { Logger, EventCore } from "../foundation-mock.js"
import type {
  AuthenticationConfig,
  AuthenticationService,
  ServiceStatus,
  AuthenticationRequest,
  AuthenticationResult,
  SessionValidationResult,
  UserProfile,
  authenticationConfig,
  authenticationService,
} from "../types/index.js";
import {
  isValidAuthenticationRequest,
  isValidUserProfile,
  safeGet,
} from "../utils/type-safety.js";
import {
  DefaultSessionManager,
  DefaultTokenManager,
  SessionStorageFactory,
} from "../auth-core/index.js";
import type {
  SessionManager,
  TokenManager,
  SessionStorageBackend,
} from "../auth-core/types.js";
import { 
  DefaultProviderRegistry,
  ProviderFactory,
  type ProviderRegistry,
  type AuthenticationProvider 
} from "../auth-providers/index.js";

export class Authentication implements AuthenticationService {
  private config: AuthenticationConfig;
  private logger: Logger;
  private events: EventCore;
  private sessionManager: SessionManager;
  private tokenManager: TokenManager;
  private sessionStorage: SessionStorageBackend;
  private providerRegistry: ProviderRegistry;
  private providers: AuthenticationProvider[] = [];
  private initialized = false;
  private activeSessions = 0;
  private totalLogins = 0;

  constructor(config: AuthenticationConfig) {
    this.config = config;
    this.logger = Logger.create({
      serviceName: "authentication",
      nsmClassification: config.nsmClassification,
      gdprCompliant: config.gdprCompliant,
      auditTrail: config.auditTrail,
    });
    this.events = EventCore.create({
      serviceName: "authentication",
      nsmClassification: config.nsmClassification,
      gdprCompliant: config.gdprCompliant,
      auditTrail: config.auditTrail,
    });

    // Initialize storage
    this.sessionStorage = SessionStorageFactory.create(
      config.sessionStorage.type,
      this.logger,
    );

    // Initialize managers
    this.sessionManager = DefaultSessionManager.create(this.sessionStorage, {
      sessionTimeout: config.sessionTimeout,
      maxConcurrentSessions: config.maxConcurrentSessions,
      logger: this.logger,
      events: this.events,
    });

    this.tokenManager = DefaultTokenManager.create({
      accessTokenSecret: this.generateSecret(),
      refreshTokenSecret: this.generateSecret(),
      accessTokenLifetime: config.accessTokenLifetime,
      refreshTokenLifetime: config.refreshTokenLifetime,
      issuer: "xala-authentication",
      audience: "xala-application",
      logger: this.logger,
    });

    // Initialize provider registry
    this.providerRegistry = DefaultProviderRegistry.create();
  }

  async initialize(): Promise<void> {
    if (this.initialized) {return;}

    this.logger.info("Initializing authentication service", {
      nsmClassification: this.config.nsmClassification,
      gdprCompliant: this.config.gdprCompliant,
      providers: this.config.providers.map((p) => p.id),
    });

    // Initialize session storage
    await this.sessionStorage.initialize(this.config.sessionStorage);

    // Initialize providers
    this.providers = ProviderFactory.createProviders(this.config.providers);
    for (const provider of this.providers) {
      await provider.initialize();
      this.providerRegistry.register(provider);
      this.logger.info("Provider initialized", {
        providerId: provider.id,
        providerType: provider.type,
        enabled: provider.enabled,
      });
    }

    // Setup cleanup intervals
    this.setupCleanupTasks();

    this.initialized = true;

    this.logger.info("Authentication service initialized successfully");
  }

  async authenticate(
    request: AuthenticationRequest,
  ): Promise<AuthenticationResult> {
    try {
      // Validate request using type safety utilities
      if (!isValidAuthenticationRequest(request)) {
        return {
          success: false,
          error: {
            code: "INVALID_REQUEST",
            message: "Invalid authentication request format",
            nsmClassification: "OPEN",
          },
        };
      }

      // Find provider
      const provider = this.providerRegistry.getProvider(request.provider);
      if (!provider || !provider.enabled) {
        return {
          success: false,
          error: {
            code: "PROVIDER_NOT_FOUND",
            message: `Provider ${request.provider} not found or disabled`,
            nsmClassification: "OPEN",
          },
        };
      }

      // Authenticate using provider
      const providerResult = await provider.authenticate({
        type: provider.type,
        ...request.credentials
      });
      
      if (!providerResult.success || !providerResult.user) {
        return {
          success: false,
          error: providerResult.error ?? {
            code: "AUTHENTICATION_FAILED",
            message: "Provider authentication failed",
            nsmClassification: "OPEN",
          },
        };
      }

      const user = providerResult.user;

      // Create session
      const session = await this.sessionManager.createSession(
        user,
        request.clientInfo,
        request.provider,
      );

      // Generate tokens
      const accessToken = await this.tokenManager.generateAccessToken(
        user,
        session.id,
      );
      const refreshToken = await this.tokenManager.generateRefreshToken(
        user,
        session.id,
      );

      this.activeSessions++;
      this.totalLogins++;

      this.logger.info("User authenticated successfully", {
        userId: user.id,
        provider: request.provider,
        sessionId: session.id,
        nsmClassification: user.nsmClassification,
      });

      return {
        success: true,
        accessToken,
        refreshToken,
        expiresIn: Math.floor(this.config.accessTokenLifetime / 1000),
        user,
        session,
      };
    } catch (error) {
      this.logger.error("Authentication failed", {
        provider: request.provider,
        error: (error as Error).message,
      });

      return {
        success: false,
        error: {
          code: "AUTHENTICATION_FAILED",
          message: "Authentication failed",
          nsmClassification: "OPEN",
        },
      };
    }
  }

  async refresh(refreshToken: string): Promise<AuthenticationResult> {
    const result = await this.tokenManager.refreshAccessToken(refreshToken);

    if (result.success) {
      this.logger.debug("Token refreshed successfully");
      return {
        success: true,
        ...(result.accessToken && { accessToken: result.accessToken }),
        ...(result.expiresIn && { expiresIn: result.expiresIn }),
      };
    } else {
      this.logger.warn("Token refresh failed", {
        error: result.error ?? "Unknown error",
      });
      return {
        success: false,
        error: {
          code: "TOKEN_REFRESH_FAILED",
          message: result.error || "Token refresh failed",
          nsmClassification: "OPEN",
        },
      };
    }
  }

  async logout(sessionId: string): Promise<void> {
    await this.sessionManager.deleteSession(sessionId);
    this.activeSessions = Math.max(0, this.activeSessions - 1);

    this.logger.info("User logged out", { sessionId });
  }

  async validateSession(sessionId: string): Promise<SessionValidationResult> {
    const session = await this.sessionManager.getSession(sessionId);

    if (!session) {
      return {
        valid: false,
        error: "Session not found or expired",
      };
    }

    // Load user profile from session using type safety
    const userProfile = safeGet(session as unknown as Record<string, unknown>, "metadata.userProfile", null);
    const user: UserProfile = isValidUserProfile(userProfile)
      ? userProfile
      : {
          id: session.userId,
          roles: [],
          permissions: [],
          nsmClassification: session.nsmClassification,
          metadata: {},
        };

    return {
      valid: true,
      user,
      session,
    };
  }

  async getStatus(): Promise<ServiceStatus> {
    const healthy = this.initialized && (await this.sessionStorage.health());

    return {
      healthy,
      version: "1.0.0",
      uptime: process.uptime(),
      lastCheck: new Date(),
      activeProviders: this.config.providers
        .filter((p) => p.enabled)
        .map((p) => p.id),
      activeSessions: this.activeSessions,
      totalLogins: this.totalLogins,
    };
  }

  private generateSecret(): string {
    return randomBytes(32).toString("hex");
  }

  private setupCleanupTasks(): void {
    // Setup session cleanup every 5 minutes
    setInterval(
      async () => {
        try {
          await this.sessionManager.cleanupExpiredSessions();
        } catch (error) {
          this.logger.error("Session cleanup failed", {
            error: (error as Error).message,
          });
        }
      },
      5 * 60 * 1000,
    );
  }

  static create(config: AuthenticationConfig): Authentication {
    return new Authentication(config);
  }
}

// Legacy compatibility
export class authentication
  extends Authentication
  implements authenticationService
{
  constructor(config: authenticationConfig) {
    super(config as AuthenticationConfig);
  }

  static override create(config: authenticationConfig): authentication {
    return new authentication(config);
  }
}

// Service creation functions
export function createAuthenticationService(config: AuthenticationConfig): Authentication {
  return Authentication.create(config);
}

export function createTestAuthenticationService(config?: Partial<AuthenticationConfig>): Authentication {
  const defaultConfig: AuthenticationConfig = {
    nsmClassification: "OPEN",
    gdprCompliant: true,
    wcagLevel: "AA",
    supportedLanguages: ["nb-NO", "en-US", "fr-FR", "ar-SA"],
    auditTrail: true,
    sessionTimeout: 30 * 60 * 1000, // 30 minutes
    refreshTokenLifetime: 24 * 60 * 60 * 1000, // 24 hours
    accessTokenLifetime: 15 * 60 * 1000, // 15 minutes
    maxConcurrentSessions: 5,
    enableBruteForceProtection: true,
    maxLoginAttempts: 5,
    lockoutDuration: 15 * 60 * 1000, // 15 minutes
    sessionStorage: {
      type: "memory",
      prefix: "test",
      ttl: 30 * 60 * 1000
    },
    providers: []
  };

  const mergedConfig = { ...defaultConfig, ...config };
  return Authentication.create(mergedConfig);
}

export function createProductionAuthenticationService(config: AuthenticationConfig): Authentication {
  // Validate production requirements
  if (config.sessionStorage.type === "memory") {
    throw new Error("Memory storage not allowed in production");
  }
  
  if (!config.auditTrail) {
    throw new Error("Audit trail required in production");
  }

  if (config.nsmClassification === "OPEN" && config.providers.length === 0) {
    throw new Error("At least one authentication provider required in production");
  }

  return Authentication.create(config);
}

// Export types for convenience
export type { AuthenticationConfig } from "../types/index.js";
