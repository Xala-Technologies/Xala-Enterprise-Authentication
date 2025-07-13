/**
 * Permission Evaluator Implementation
 * Evaluates permissions based on context
 * Enterprise Standards v4.0.0 compliant
 */

import type {
  Permission,
  PermissionContext,
  PermissionResult,
  PermissionEvaluator,
  PermissionCondition,
  PermissionManager,
  RoleManager,
} from './types.js';
import { getMostRestrictiveClassification } from '../utils/norwegian-compliance.js';

export class DefaultPermissionEvaluator implements PermissionEvaluator {
  constructor(
    private readonly permissionManager: PermissionManager,
    private readonly roleManager: RoleManager,
    private readonly userStore: UserPermissionStore
  ) {}

  async evaluate(context: PermissionContext): Promise<PermissionResult> {
    // Get all effective permissions for user
    const effectivePermissions = await this.getEffectivePermissionsForUser(
      context.userId,
      context.userRoles,
      context.userPermissions
    );

    // Find matching permissions
    const matchingPermissions = await this.findMatchingPermissions(
      effectivePermissions,
      context.resource,
      context.action
    );

    if (matchingPermissions.length === 0) {
      return {
        allowed: false,
        reason: 'No matching permissions found',
        appliedPermissions: [],
        appliedRoles: context.userRoles,
        effectiveClassification: context.nsmClassification,
      };
    }

    // Evaluate conditions for each permission
    for (const permission of matchingPermissions) {
      const conditionsMet = await this.evaluateConditions(
        permission.conditions ?? [],
        context
      );

      if (conditionsMet) {
        // Calculate effective classification
        const effectiveClassification = getMostRestrictiveClassification(
          context.nsmClassification,
          permission.nsmClassification
        );

        return {
          allowed: true,
          reason: `Permission granted: ${permission.id}`,
          appliedPermissions: [permission.id],
          appliedRoles: context.userRoles,
          effectiveClassification,
        };
      }
    }

    return {
      allowed: false,
      reason: 'Permission conditions not met',
      appliedPermissions: matchingPermissions.map(p => p.id),
      appliedRoles: context.userRoles,
      effectiveClassification: context.nsmClassification,
    };
  }

  async canAccess(userId: string, resource: string, action: string): Promise<boolean> {
    const userRoles = await this.userStore.getUserRoles(userId);
    const userPermissions = await this.userStore.getUserPermissions(userId);

    const context: PermissionContext = {
      userId,
      userRoles,
      userPermissions,
      resource,
      action,
      nsmClassification: 'OPEN',
    };

    const result = await this.evaluate(context);
    return result.allowed;
  }

  async getEffectivePermissions(userId: string): Promise<readonly Permission[]> {
    const userRoles = await this.userStore.getUserRoles(userId);
    const userPermissions = await this.userStore.getUserPermissions(userId);

    const permissionIds = await this.getEffectivePermissionsForUser(
      userId,
      userRoles,
      userPermissions
    );

    const permissions: Permission[] = [];
    for (const id of permissionIds) {
      const permission = await this.permissionManager.getPermission(id);
      if (permission) {
        permissions.push(permission);
      }
    }

    return permissions;
  }

  private async getEffectivePermissionsForUser(
    _userId: string,
    userRoles: readonly string[],
    userPermissions: readonly string[]
  ): Promise<string[]> {
    // Get permissions from roles
    const rolePermissions = await this.roleManager.getEffectivePermissions(userRoles);
    
    // Combine with direct user permissions
    const allPermissions = new Set<string>([
      ...rolePermissions,
      ...userPermissions,
    ]);

    return Array.from(allPermissions);
  }

  private async findMatchingPermissions(
    permissionIds: string[],
    resource: string,
    action: string
  ): Promise<Permission[]> {
    const matching: Permission[] = [];

    for (const id of permissionIds) {
      const permission = await this.permissionManager.getPermission(id);
      if (permission && this.matchesResourceAction(permission, resource, action)) {
        matching.push(permission);
      }
    }

    return matching;
  }

  private matchesResourceAction(
    permission: Permission,
    resource: string,
    action: string
  ): boolean {
    // Handle wildcards
    const resourceMatches = permission.resource === '*' || 
                          permission.resource === resource ||
                          this.matchesWildcard(permission.resource, resource);
                          
    const actionMatches = permission.action === '*' || 
                        permission.action === action ||
                        this.matchesWildcard(permission.action, action);

    return resourceMatches && actionMatches;
  }

  private matchesWildcard(pattern: string, value: string): boolean {
    // Simple wildcard matching: user:* matches user:read, user:write, etc.
    if (pattern.endsWith(':*')) {
      const prefix = pattern.slice(0, -2);
      return value.startsWith(prefix + ':');
    }
    return false;
  }

  private async evaluateConditions(
    conditions: readonly PermissionCondition[],
    context: PermissionContext
  ): Promise<boolean> {
    for (const condition of conditions) {
      if (!await this.evaluateCondition(condition, context)) {
        return false;
      }
    }
    return true;
  }

  private async evaluateCondition(
    condition: PermissionCondition,
    context: PermissionContext
  ): Promise<boolean> {
    switch (condition.type) {
      case 'ownership':
        return this.evaluateOwnership(condition, context);
      
      case 'time':
        return this.evaluateTime(condition, context);
      
      case 'location':
        return this.evaluateLocation(condition, context);
      
      case 'classification':
        return this.evaluateClassification(condition, context);
      
      case 'custom':
        return this.evaluateCustom(condition, context);
      
      default:
        return false;
    }
  }

  private evaluateOwnership(
    condition: PermissionCondition,
    context: PermissionContext
  ): boolean {
    const field = condition.field ?? 'ownerId';
    const resourceValue = context.resourceData?.[field];
    
    switch (condition.operator) {
      case 'equals':
        return resourceValue === context.userId;
      
      case 'not_equals':
        return resourceValue !== context.userId;
      
      default:
        return false;
    }
  }

  private evaluateTime(
    condition: PermissionCondition,
    context: PermissionContext
  ): boolean {
    const now = new Date();
    const conditionDate = new Date(condition.value as string);
    
    switch (condition.operator) {
      case 'greater_than':
        return now > conditionDate;
      
      case 'less_than':
        return now < conditionDate;
      
      default:
        return false;
    }
  }

  private evaluateLocation(
    condition: PermissionCondition,
    context: PermissionContext
  ): boolean {
    // Simplified location check - in production would use IP geolocation
    const userLocation = (context.metadata?.location as string) ?? '';
    
    switch (condition.operator) {
      case 'equals':
        return userLocation === condition.value;
      
      case 'in':
        return (condition.value as string[]).includes(userLocation);
      
      default:
        return false;
    }
  }

  private evaluateClassification(
    condition: PermissionCondition,
    context: PermissionContext
  ): boolean {
    const requiredClassification = condition.value as string;
    const userClassification = context.nsmClassification;
    
    // This would use validateNSMClassification from norwegian-compliance
    return userClassification === requiredClassification;
  }

  private evaluateCustom(
    _condition: PermissionCondition,
    _context: PermissionContext
  ): boolean {
    // Custom conditions would be evaluated based on specific business logic
    return true;
  }

  static create(
    permissionManager: PermissionManager,
    roleManager: RoleManager,
    userStore: UserPermissionStore
  ): DefaultPermissionEvaluator {
    return new DefaultPermissionEvaluator(permissionManager, roleManager, userStore);
  }
}

/**
 * User permission store interface
 */
export interface UserPermissionStore {
  getUserRoles(userId: string): Promise<readonly string[]>;
  getUserPermissions(userId: string): Promise<readonly string[]>;
  setUserRoles(userId: string, roles: readonly string[]): Promise<void>;
  setUserPermissions(userId: string, permissions: readonly string[]): Promise<void>;
}

/**
 * Default in-memory user permission store
 */
export class InMemoryUserPermissionStore implements UserPermissionStore {
  private readonly userRoles = new Map<string, string[]>();
  private readonly userPermissions = new Map<string, string[]>();

  async getUserRoles(userId: string): Promise<readonly string[]> {
    return this.userRoles.get(userId) ?? [];
  }

  async getUserPermissions(userId: string): Promise<readonly string[]> {
    return this.userPermissions.get(userId) ?? [];
  }

  async setUserRoles(userId: string, roles: readonly string[]): Promise<void> {
    this.userRoles.set(userId, [...roles]);
  }

  async setUserPermissions(userId: string, permissions: readonly string[]): Promise<void> {
    this.userPermissions.set(userId, [...permissions]);
  }

  static create(): InMemoryUserPermissionStore {
    return new InMemoryUserPermissionStore();
  }
}