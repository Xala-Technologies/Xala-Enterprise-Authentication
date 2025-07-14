/**
 * Permission-Based Access Control Guard
 * Verifies user has required permissions
 * Enterprise Standards v4.0.0 compliant
 */

import { AuthGuard } from './auth-guard.js';
import type {
  AuthenticationGuard,
  AuthContext,
  PermissionGuardOptions,
  TokenExtractor,
  SessionValidator,
} from './types.js';

export class PermissionGuard extends AuthGuard implements AuthenticationGuard {
  override readonly name: string = 'permission-guard';
  private readonly requiredPermissions: readonly string[];
  private readonly requireAll: boolean;

  constructor(
    tokenExtractor: TokenExtractor,
    sessionValidator: SessionValidator,
    options: PermissionGuardOptions,
  ) {
    super(tokenExtractor, sessionValidator, options);
    this.requiredPermissions = options.permissions;
    this.requireAll = options.requireAll ?? true;
  }

  override async canActivate(context: AuthContext): Promise<boolean> {
    // First check base authentication
    const isAuthenticated = await super.canActivate(context);
    if (!isAuthenticated) {
      return false;
    }

    const userPermissions = context.user?.permissions ?? [];

    if (this.requireAll) {
      // User must have all required permissions
      return this.requiredPermissions.every((permission) =>
        userPermissions.includes(permission),
      );
    } else {
      // User must have at least one required permission
      return this.requiredPermissions.some((permission) =>
        userPermissions.includes(permission),
      );
    }
  }

  static override create(
    tokenExtractor: TokenExtractor,
    sessionValidator: SessionValidator,
    options: PermissionGuardOptions,
  ): PermissionGuard {
    return new PermissionGuard(tokenExtractor, sessionValidator, options);
  }
}

/**
 * Helper function to create permission guards
 */
export function requirePermissions(
  permissions: string[],
  options?: Partial<PermissionGuardOptions>,
): (
  tokenExtractor: TokenExtractor,
  sessionValidator: SessionValidator,
) => PermissionGuard {
  return (
    tokenExtractor: TokenExtractor,
    sessionValidator: SessionValidator,
  ): PermissionGuard => {
    return PermissionGuard.create(tokenExtractor, sessionValidator, {
      ...options,
      permissions,
    });
  };
}

/**
 * Pre-configured permission guards for common scenarios
 */
export const PermissionGuards = {
  /**
   * Read permissions
   */
  requireRead: (
    tokenExtractor: TokenExtractor,
    sessionValidator: SessionValidator,
  ): PermissionGuard =>
    PermissionGuard.create(tokenExtractor, sessionValidator, {
      permissions: ['read'],
      failureMessage: 'Read permission required',
    }),

  /**
   * Write permissions
   */
  requireWrite: (
    tokenExtractor: TokenExtractor,
    sessionValidator: SessionValidator,
  ): PermissionGuard =>
    PermissionGuard.create(tokenExtractor, sessionValidator, {
      permissions: ['write'],
      failureMessage: 'Write permission required',
    }),

  /**
   * Delete permissions
   */
  requireDelete: (
    tokenExtractor: TokenExtractor,
    sessionValidator: SessionValidator,
  ): PermissionGuard =>
    PermissionGuard.create(tokenExtractor, sessionValidator, {
      permissions: ['delete'],
      failureMessage: 'Delete permission required',
    }),

  /**
   * Admin permissions
   */
  requireAdminPermissions: (
    tokenExtractor: TokenExtractor,
    sessionValidator: SessionValidator,
  ): PermissionGuard =>
    PermissionGuard.create(tokenExtractor, sessionValidator, {
      permissions: ['admin:read', 'admin:write', 'admin:delete'],
      requireAll: true,
      failureMessage: 'Full admin permissions required',
    }),

  /**
   * GDPR data access permissions
   */
  requireGDPRAccess: (
    tokenExtractor: TokenExtractor,
    sessionValidator: SessionValidator,
  ): PermissionGuard =>
    PermissionGuard.create(tokenExtractor, sessionValidator, {
      permissions: ['gdpr:read_personal_data', 'gdpr:export_data'],
      requireAll: false,
      failureMessage: 'GDPR data access permission required',
    }),

  /**
   * Own data access (for citizens)
   */
  requireOwnDataAccess: (
    tokenExtractor: TokenExtractor,
    sessionValidator: SessionValidator,
  ): PermissionGuard =>
    PermissionGuard.create(tokenExtractor, sessionValidator, {
      permissions: ['read_own_data', 'update_own_data'],
      requireAll: false,
      failureMessage: 'Personal data access permission required',
    }),
} as const;
