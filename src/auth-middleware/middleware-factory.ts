/**
 * Middleware Factory
 * Creates and configures authentication middleware
 * Enterprise Standards v4.0.0 compliant
 */

import type { NSMClassification } from '../types/index.js';

import { AuthGuard, BearerTokenExtractor } from './auth-guard.js';
import { NSMClassificationGuard } from './nsm-classification-guard.js';
import { PermissionGuard } from './permission-guard.js';
import { RoleGuard } from './role-guard.js';
import type {
  AuthMiddleware,
  TokenExtractor,
  SessionValidator,
  AuthContext,
  AuthRequest,
  GuardOptions,
  RoleGuardOptions,
  PermissionGuardOptions,
  NSMClassificationGuardOptions,
} from './types.js';


/**
 * Middleware factory configuration
 */
export interface MiddlewareFactoryConfig {
  readonly tokenExtractor?: TokenExtractor;
  readonly sessionValidator: SessionValidator;
  readonly defaultOptions?: GuardOptions;
}

export class MiddlewareFactory {
  private readonly tokenExtractor: TokenExtractor;
  private readonly sessionValidator: SessionValidator;
  private readonly defaultOptions: GuardOptions;

  constructor(config: MiddlewareFactoryConfig) {
    this.tokenExtractor =
      config.tokenExtractor ?? BearerTokenExtractor.create();
    this.sessionValidator = config.sessionValidator;
    this.defaultOptions = config.defaultOptions ?? {};
  }

  /**
   * Create basic authentication middleware
   */
  createAuthMiddleware(options?: GuardOptions): AuthMiddleware {
    const guard = AuthGuard.create(this.tokenExtractor, this.sessionValidator, {
      ...this.defaultOptions,
      ...options,
    });
    return guard.middleware;
  }

  /**
   * Create role-based middleware
   */
  createRoleMiddleware(
    roles: string[],
    options?: Partial<RoleGuardOptions>,
  ): AuthMiddleware {
    const guard = RoleGuard.create(this.tokenExtractor, this.sessionValidator, {
      ...this.defaultOptions,
      ...options,
      roles,
    });
    return guard.middleware;
  }

  /**
   * Create permission-based middleware
   */
  createPermissionMiddleware(
    permissions: string[],
    options?: Partial<PermissionGuardOptions>,
  ): AuthMiddleware {
    const guard = PermissionGuard.create(
      this.tokenExtractor,
      this.sessionValidator,
      { ...this.defaultOptions, ...options, permissions },
    );
    return guard.middleware;
  }

  /**
   * Create NSM classification middleware
   */
  createNSMClassificationMiddleware(
    classification: NSMClassification,
    options?: Partial<NSMClassificationGuardOptions>,
  ): AuthMiddleware {
    const guard = NSMClassificationGuard.create(
      this.tokenExtractor,
      this.sessionValidator,
      {
        ...this.defaultOptions,
        ...options,
        requiredClassification: classification,
      },
    );
    return guard.middleware;
  }

  /**
   * Create composite middleware that requires multiple conditions
   */
  createCompositeMiddleware(guards: AuthMiddleware[]): AuthMiddleware {
    return async (
      req: AuthRequest,
      res: AuthResponse,
      next: NextFunction,
    ): Promise<void> => {
      let index = 0;

      const runNext = async (error?: Error): Promise<void> => {
        if (error) {
          return next(error);
        }

        if (index >= guards.length) {
          return next();
        }

        const currentGuard = guards[index++];
        if (currentGuard) {
          await currentGuard(req, res, runNext);
        }
      };

      await runNext();
    };
  }

  /**
   * Create middleware for Norwegian government employees
   */
  createGovernmentEmployeeMiddleware(options?: GuardOptions): AuthMiddleware {
    return this.createCompositeMiddleware([
      this.createAuthMiddleware(options),
      this.createRoleMiddleware(['government_employee', 'admin'], {
        requireAll: false,
      }),
      this.createNSMClassificationMiddleware('RESTRICTED'),
    ]);
  }

  /**
   * Create middleware for citizens accessing their own data
   */
  createCitizenMiddleware(options?: GuardOptions): AuthMiddleware {
    return this.createCompositeMiddleware([
      this.createAuthMiddleware(options),
      this.createRoleMiddleware(['citizen'], { requireAll: true }),
      this.createPermissionMiddleware(['read_own_data', 'update_own_data'], {
        requireAll: false,
      }),
    ]);
  }

  /**
   * Create middleware for GDPR data controllers
   */
  createGDPRControllerMiddleware(options?: GuardOptions): AuthMiddleware {
    return this.createCompositeMiddleware([
      this.createAuthMiddleware(options),
      this.createPermissionMiddleware(
        ['gdpr:read_personal_data', 'gdpr:process_data', 'gdpr:delete_data'],
        { requireAll: true },
      ),
      this.createNSMClassificationMiddleware('CONFIDENTIAL'),
    ]);
  }

  static create(config: MiddlewareFactoryConfig): MiddlewareFactory {
    return new MiddlewareFactory(config);
  }
}

/**
 * Default session validator implementation
 */
export class DefaultSessionValidator implements SessionValidator {
  private readonly validateSession: (
    sessionId: string,
  ) => Promise<AuthContext | null>;

  constructor(
    validateSession: (sessionId: string) => Promise<AuthContext | null>,
  ) {
    this.validateSession = validateSession;
  }

  async validate(sessionId: string): Promise<AuthContext | null> {
    return this.validateSession(sessionId);
  }

  static create(
    validateSession: (sessionId: string) => Promise<AuthContext | null>,
  ): DefaultSessionValidator {
    return new DefaultSessionValidator(validateSession);
  }
}

// Type declaration for NextFunction to avoid ESLint errors
type NextFunction = (error?: Error) => void;
type AuthResponse = import('./types.js').AuthResponse;
