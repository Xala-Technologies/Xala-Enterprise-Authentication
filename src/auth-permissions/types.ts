/**
 * Permission System Types
 * Enterprise Standards v4.0.0 compliant
 */

import type { NSMClassification } from '../types/index.js';

/**
 * Permission definition
 */
export interface Permission {
  readonly id: string;
  readonly name: string;
  readonly description: string;
  readonly resource: string;
  readonly action: string;
  readonly nsmClassification: NSMClassification;
  readonly conditions?: PermissionCondition[];
  readonly metadata?: Record<string, unknown>;
}

/**
 * Role definition
 */
export interface Role {
  readonly id: string;
  readonly name: string;
  readonly description: string;
  readonly permissions: readonly string[];
  readonly inheritsFrom?: readonly string[];
  readonly nsmClassification: NSMClassification;
  readonly metadata?: Record<string, unknown>;
}

/**
 * Permission condition
 */
export interface PermissionCondition {
  readonly type: 'ownership' | 'time' | 'location' | 'classification' | 'custom';
  readonly field?: string;
  readonly operator: 'equals' | 'not_equals' | 'in' | 'not_in' | 'greater_than' | 'less_than';
  readonly value: unknown;
}

/**
 * Permission evaluation context
 */
export interface PermissionContext {
  readonly userId: string;
  readonly userRoles: readonly string[];
  readonly userPermissions: readonly string[];
  readonly resource: string;
  readonly action: string;
  readonly resourceData?: Record<string, unknown>;
  readonly nsmClassification: NSMClassification;
  readonly metadata?: Record<string, unknown>;
}

/**
 * Permission evaluation result
 */
export interface PermissionResult {
  readonly allowed: boolean;
  readonly reason?: string;
  readonly appliedPermissions: readonly string[];
  readonly appliedRoles: readonly string[];
  readonly effectiveClassification: NSMClassification;
}

/**
 * Permission manager interface
 */
export interface PermissionManager {
  createPermission(permission: Permission): Promise<void>;
  updatePermission(id: string, updates: Partial<Permission>): Promise<void>;
  deletePermission(id: string): Promise<void>;
  getPermission(id: string): Promise<Permission | null>;
  getPermissionsByResource(resource: string): Promise<readonly Permission[]>;
  getPermissionsByAction(action: string): Promise<readonly Permission[]>;
  getAllPermissions(): Promise<readonly Permission[]>;
}

/**
 * Role manager interface
 */
export interface RoleManager {
  createRole(role: Role): Promise<void>;
  updateRole(id: string, updates: Partial<Role>): Promise<void>;
  deleteRole(id: string): Promise<void>;
  getRole(id: string): Promise<Role | null>;
  getRolesByPermission(permissionId: string): Promise<readonly Role[]>;
  getAllRoles(): Promise<readonly Role[]>;
  getEffectivePermissions(roleIds: readonly string[]): Promise<readonly string[]>;
}

/**
 * Permission evaluator interface
 */
export interface PermissionEvaluator {
  evaluate(context: PermissionContext): Promise<PermissionResult>;
  canAccess(userId: string, resource: string, action: string): Promise<boolean>;
  getEffectivePermissions(userId: string): Promise<readonly Permission[]>;
}

/**
 * RBAC service interface
 */
export interface RBACService {
  readonly permissions: PermissionManager;
  readonly roles: RoleManager;
  readonly evaluator: PermissionEvaluator;
  
  assignRoleToUser(userId: string, roleId: string): Promise<void>;
  removeRoleFromUser(userId: string, roleId: string): Promise<void>;
  getUserRoles(userId: string): Promise<readonly Role[]>;
  
  grantPermissionToUser(userId: string, permissionId: string): Promise<void>;
  revokePermissionFromUser(userId: string, permissionId: string): Promise<void>;
  getUserPermissions(userId: string): Promise<readonly Permission[]>;
  
  checkAccess(context: PermissionContext): Promise<PermissionResult>;
}

/**
 * Pre-defined permissions for common scenarios
 */
export const CommonPermissions = {
  // Basic CRUD permissions
  READ: 'read',
  WRITE: 'write',
  UPDATE: 'update',
  DELETE: 'delete',
  
  // Admin permissions
  ADMIN_READ: 'admin:read',
  ADMIN_WRITE: 'admin:write',
  ADMIN_DELETE: 'admin:delete',
  ADMIN_MANAGE_USERS: 'admin:manage_users',
  ADMIN_MANAGE_ROLES: 'admin:manage_roles',
  
  // GDPR permissions
  GDPR_READ_PERSONAL_DATA: 'gdpr:read_personal_data',
  GDPR_EXPORT_DATA: 'gdpr:export_data',
  GDPR_DELETE_DATA: 'gdpr:delete_data',
  GDPR_PROCESS_DATA: 'gdpr:process_data',
  
  // Norwegian government specific
  CITIZEN_READ_OWN_DATA: 'citizen:read_own_data',
  CITIZEN_UPDATE_OWN_DATA: 'citizen:update_own_data',
  GOVERNMENT_READ_CITIZEN_DATA: 'government:read_citizen_data',
  GOVERNMENT_UPDATE_CITIZEN_DATA: 'government:update_citizen_data',
} as const;

/**
 * Pre-defined roles
 */
export const CommonRoles = {
  // Basic roles
  USER: 'user',
  ADMIN: 'admin',
  GUEST: 'guest',
  
  // Norwegian government roles
  CITIZEN: 'citizen',
  GOVERNMENT_EMPLOYEE: 'government_employee',
  CASE_WORKER: 'case_worker',
  DATA_CONTROLLER: 'data_controller',
  
  // System roles
  SYSTEM_ADMIN: 'system_admin',
  SECURITY_OFFICER: 'security_officer',
  AUDITOR: 'auditor',
} as const;