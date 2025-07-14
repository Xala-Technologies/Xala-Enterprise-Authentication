/**
 * Role-Based Access Control Guard
 * Verifies user has required roles
 * Enterprise Standards v4.0.0 compliant
 */

import { AuthGuard } from './auth-guard.js';
import type {
  AuthenticationGuard,
  AuthContext,
  RoleGuardOptions,
  TokenExtractor,
  SessionValidator,
} from './types.js';

export class RoleGuard extends AuthGuard implements AuthenticationGuard {
  override readonly name: string = 'role-guard';
  private readonly requiredRoles: readonly string[];
  private readonly requireAll: boolean;

  constructor(
    tokenExtractor: TokenExtractor,
    sessionValidator: SessionValidator,
    options: RoleGuardOptions
  ) {
    super(tokenExtractor, sessionValidator, options);
    this.requiredRoles = options.roles;
    this.requireAll = options.requireAll ?? false;
  }

  override async canActivate(context: AuthContext): Promise<boolean> {
    // First check base authentication
    const isAuthenticated = await super.canActivate(context);
    if (!isAuthenticated) {
      return false;
    }

    const userRoles = context.user?.roles ?? [];

    if (this.requireAll) {
      // User must have all required roles
      return this.requiredRoles.every((role) => userRoles.includes(role));
    } else {
      // User must have at least one required role
      return this.requiredRoles.some((role) => userRoles.includes(role));
    }
  }

  static override create(
    tokenExtractor: TokenExtractor,
    sessionValidator: SessionValidator,
    options: RoleGuardOptions
  ): RoleGuard {
    return new RoleGuard(tokenExtractor, sessionValidator, options);
  }
}

/**
 * Helper function to create role guards
 */
export function requireRoles(
  roles: string[],
  options?: Partial<RoleGuardOptions>
): (tokenExtractor: TokenExtractor, sessionValidator: SessionValidator) => RoleGuard {
  return (tokenExtractor: TokenExtractor, sessionValidator: SessionValidator): RoleGuard => {
    return RoleGuard.create(tokenExtractor, sessionValidator, {
      ...options,
      roles,
    });
  };
}

/**
 * Pre-configured role guards for common scenarios
 */
export const RoleGuards = {
  /**
   * Require admin role
   */
  requireAdmin: (tokenExtractor: TokenExtractor, sessionValidator: SessionValidator): RoleGuard =>
    RoleGuard.create(tokenExtractor, sessionValidator, {
      roles: ['admin'],
      failureMessage: 'Admin access required',
    }),

  /**
   * Require user role
   */
  requireUser: (tokenExtractor: TokenExtractor, sessionValidator: SessionValidator): RoleGuard =>
    RoleGuard.create(tokenExtractor, sessionValidator, {
      roles: ['user'],
      failureMessage: 'User access required',
    }),

  /**
   * Require citizen role (Norwegian government context)
   */
  requireCitizen: (tokenExtractor: TokenExtractor, sessionValidator: SessionValidator): RoleGuard =>
    RoleGuard.create(tokenExtractor, sessionValidator, {
      roles: ['citizen'],
      failureMessage: 'Citizen access required',
    }),

  /**
   * Require government employee role
   */
  requireGovernmentEmployee: (
    tokenExtractor: TokenExtractor,
    sessionValidator: SessionValidator
  ): RoleGuard =>
    RoleGuard.create(tokenExtractor, sessionValidator, {
      roles: ['government_employee'],
      failureMessage: 'Government employee access required',
    }),
} as const;
