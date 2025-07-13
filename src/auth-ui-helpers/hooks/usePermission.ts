/**
 * usePermission Hook
 * Permission checking hook
 * Enterprise Standards v4.0.0 compliant
 */

import { useMemo } from 'react';
import type { UsePermissionOptions } from '../types.js';
import { useAuth } from './useAuth.js';

export function usePermission(options: UsePermissionOptions): {
  hasPermission: boolean;
  hasAnyPermission: boolean;
  hasAllPermissions: boolean;
  checkPermission: (permission: string) => boolean;
} {
  const { checkPermission, user } = useAuth();
  const { permissions, requireAll = true } = options;

  const hasAllPermissions = useMemo(() => {
    if (!user) return false;
    return permissions.every(permission => checkPermission(permission));
  }, [permissions, checkPermission, user]);

  const hasAnyPermission = useMemo(() => {
    if (!user) return false;
    return permissions.some(permission => checkPermission(permission));
  }, [permissions, checkPermission, user]);

  const hasPermission = requireAll ? hasAllPermissions : hasAnyPermission;

  return {
    hasPermission,
    hasAnyPermission,
    hasAllPermissions,
    checkPermission,
  };
}

/**
 * Hook to check a single permission
 */
export function useHasPermission(permission: string): boolean {
  const { checkPermission, user } = useAuth();
  
  return useMemo(() => {
    if (!user) return false;
    return checkPermission(permission);
  }, [permission, checkPermission, user]);
}

/**
 * Hook to check role
 */
export function useHasRole(role: string): boolean {
  const { hasRole, user } = useAuth();
  
  return useMemo(() => {
    if (!user) return false;
    return hasRole(role);
  }, [role, hasRole, user]);
}

/**
 * Hook to check multiple roles
 */
export function useRoles(roles: string[], requireAll = false): {
  hasRole: boolean;
  hasAnyRole: boolean;
  hasAllRoles: boolean;
} {
  const { hasRole, user } = useAuth();

  const hasAllRoles = useMemo(() => {
    if (!user) return false;
    return roles.every(role => hasRole(role));
  }, [roles, hasRole, user]);

  const hasAnyRole = useMemo(() => {
    if (!user) return false;
    return roles.some(role => hasRole(role));
  }, [roles, hasRole, user]);

  const hasRoleResult = requireAll ? hasAllRoles : hasAnyRole;

  return {
    hasRole: hasRoleResult,
    hasAnyRole,
    hasAllRoles,
  };
}