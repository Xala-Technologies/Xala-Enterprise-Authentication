/**
 * RBAC Service Implementation
 * Complete Role-Based Access Control service
 * Enterprise Standards v4.0.0 compliant
 */

import {
  DefaultPermissionEvaluator,
  InMemoryUserPermissionStore,
  type UserPermissionStore,
} from './permission-evaluator.js';
import { DefaultPermissionManager } from './permission-manager.js';
import { DefaultRoleManager } from './role-manager.js';
import type {
  RBACService,
  PermissionManager,
  RoleManager,
  PermissionEvaluator,
  Permission,
  Role,
  PermissionContext,
  PermissionResult,
} from './types.js';

export class DefaultRBACService implements RBACService {
  readonly permissions: PermissionManager;
  readonly roles: RoleManager;
  readonly evaluator: PermissionEvaluator;

  private readonly userStore: UserPermissionStore;

  constructor(config?: {
    permissionManager?: PermissionManager;
    roleManager?: RoleManager;
    userStore?: UserPermissionStore;
  }) {
    this.permissions =
      config?.permissionManager ?? DefaultPermissionManager.create();
    this.roles = config?.roleManager ?? DefaultRoleManager.create();
    this.userStore = config?.userStore ?? InMemoryUserPermissionStore.create();

    this.evaluator = DefaultPermissionEvaluator.create(
      this.permissions,
      this.roles,
      this.userStore,
    );
  }

  async assignRoleToUser(userId: string, roleId: string): Promise<void> {
    // Verify role exists
    const role = await this.roles.getRole(roleId);
    if (!role) {
      throw new Error(`Role ${roleId} not found`);
    }

    // Get current roles
    const currentRoles = await this.userStore.getUserRoles(userId);

    // Add role if not already assigned
    if (!currentRoles.includes(roleId)) {
      const newRoles = [...currentRoles, roleId];
      await this.userStore.setUserRoles(userId, newRoles);
    }
  }

  async removeRoleFromUser(userId: string, roleId: string): Promise<void> {
    const currentRoles = await this.userStore.getUserRoles(userId);
    const newRoles = currentRoles.filter((r) => r !== roleId);

    if (newRoles.length !== currentRoles.length) {
      await this.userStore.setUserRoles(userId, newRoles);
    }
  }

  async getUserRoles(userId: string): Promise<readonly Role[]> {
    const roleIds = await this.userStore.getUserRoles(userId);
    const roles: Role[] = [];

    for (const roleId of roleIds) {
      const role = await this.roles.getRole(roleId);
      if (role) {
        roles.push(role);
      }
    }

    return roles;
  }

  async grantPermissionToUser(
    userId: string,
    permissionId: string,
  ): Promise<void> {
    // Verify permission exists
    const permission = await this.permissions.getPermission(permissionId);
    if (!permission) {
      throw new Error(`Permission ${permissionId} not found`);
    }

    // Get current permissions
    const currentPermissions = await this.userStore.getUserPermissions(userId);

    // Add permission if not already granted
    if (!currentPermissions.includes(permissionId)) {
      const newPermissions = [...currentPermissions, permissionId];
      await this.userStore.setUserPermissions(userId, newPermissions);
    }
  }

  async revokePermissionFromUser(
    userId: string,
    permissionId: string,
  ): Promise<void> {
    const currentPermissions = await this.userStore.getUserPermissions(userId);
    const newPermissions = currentPermissions.filter((p) => p !== permissionId);

    if (newPermissions.length !== currentPermissions.length) {
      await this.userStore.setUserPermissions(userId, newPermissions);
    }
  }

  async getUserPermissions(userId: string): Promise<readonly Permission[]> {
    const effectivePermissions =
      await this.evaluator.getEffectivePermissions(userId);
    return effectivePermissions;
  }

  async checkAccess(context: PermissionContext): Promise<PermissionResult> {
    return this.evaluator.evaluate(context);
  }

  /**
   * Initialize with default roles and permissions
   */
  async initializeDefaults(): Promise<void> {
    // Create default permissions
    await this.createDefaultPermissions();

    // Create default roles
    await this.createDefaultRoles();
  }

  private async createDefaultPermissions(): Promise<void> {
    const defaultPermissions: Permission[] = [
      // Basic CRUD
      {
        id: 'read',
        name: 'Read',
        description: 'Read access to resources',
        resource: '*',
        action: 'read',
        nsmClassification: 'OPEN',
      },
      {
        id: 'write',
        name: 'Write',
        description: 'Write access to resources',
        resource: '*',
        action: 'write',
        nsmClassification: 'RESTRICTED',
      },
      {
        id: 'delete',
        name: 'Delete',
        description: 'Delete access to resources',
        resource: '*',
        action: 'delete',
        nsmClassification: 'RESTRICTED',
      },

      // Admin permissions
      {
        id: 'admin:manage_users',
        name: 'Manage Users',
        description: 'Admin permission to manage users',
        resource: 'user',
        action: 'manage',
        nsmClassification: 'CONFIDENTIAL',
      },
      {
        id: 'admin:manage_roles',
        name: 'Manage Roles',
        description: 'Admin permission to manage roles',
        resource: 'role',
        action: 'manage',
        nsmClassification: 'CONFIDENTIAL',
      },

      // GDPR permissions
      {
        id: 'gdpr:read_personal_data',
        name: 'Read Personal Data',
        description: 'Permission to read personal data under GDPR',
        resource: 'personal_data',
        action: 'read',
        nsmClassification: 'CONFIDENTIAL',
      },
      {
        id: 'gdpr:delete_data',
        name: 'Delete Personal Data',
        description: 'Permission to delete personal data under GDPR',
        resource: 'personal_data',
        action: 'delete',
        nsmClassification: 'CONFIDENTIAL',
      },

      // Citizen permissions
      {
        id: 'citizen:read_own_data',
        name: 'Read Own Data',
        description: 'Permission for citizens to read their own data',
        resource: 'citizen_data',
        action: 'read',
        nsmClassification: 'RESTRICTED',
        conditions: [
          {
            type: 'ownership',
            operator: 'equals',
            value: null, // Will be evaluated against userId
          },
        ],
      },
    ];

    for (const permission of defaultPermissions) {
      try {
        await this.permissions.createPermission(permission);
      } catch (error) {
        // Ignore if already exists
      }
    }
  }

  private async createDefaultRoles(): Promise<void> {
    const defaultRoles: Role[] = [
      // Basic roles
      {
        id: 'guest',
        name: 'Guest',
        description: 'Guest user with minimal permissions',
        permissions: ['read'],
        nsmClassification: 'OPEN',
      },
      {
        id: 'user',
        name: 'User',
        description: 'Standard authenticated user',
        permissions: ['read', 'write'],
        nsmClassification: 'RESTRICTED',
      },
      {
        id: 'admin',
        name: 'Administrator',
        description: 'System administrator',
        permissions: [
          'read',
          'write',
          'delete',
          'admin:manage_users',
          'admin:manage_roles',
        ],
        nsmClassification: 'CONFIDENTIAL',
      },

      // Norwegian government roles
      {
        id: 'citizen',
        name: 'Citizen',
        description: 'Norwegian citizen',
        permissions: ['citizen:read_own_data'],
        inheritsFrom: ['user'],
        nsmClassification: 'RESTRICTED',
      },
      {
        id: 'government_employee',
        name: 'Government Employee',
        description: 'Norwegian government employee',
        permissions: ['read', 'write'],
        nsmClassification: 'RESTRICTED',
      },
      {
        id: 'data_controller',
        name: 'Data Controller',
        description: 'GDPR data controller',
        permissions: ['gdpr:read_personal_data', 'gdpr:delete_data'],
        inheritsFrom: ['government_employee'],
        nsmClassification: 'CONFIDENTIAL',
      },
    ];

    for (const role of defaultRoles) {
      try {
        await this.roles.createRole(role);
      } catch (error) {
        // Ignore if already exists
      }
    }
  }

  static create(config?: {
    permissionManager?: PermissionManager;
    roleManager?: RoleManager;
    userStore?: UserPermissionStore;
  }): DefaultRBACService {
    return new DefaultRBACService(config);
  }
}
