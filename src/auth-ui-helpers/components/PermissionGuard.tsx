/**
 * PermissionGuard Component
 * Conditional rendering based on permissions
 * Enterprise Standards v4.0.0 compliant
 */

import React from 'react';
import type { PermissionGuardProps } from '../types.js';
import { usePermission } from '../hooks/usePermission.js';

export function PermissionGuard({
  children,
  permissions,
  requireAll = true,
  fallback = null,
}: PermissionGuardProps) {
  const { hasPermission } = usePermission({ permissions, requireAll });

  if (!hasPermission) {
    return <>{fallback}</>;
  }

  return <>{children}</>;
}

/**
 * Show component only if user has permission
 */
export function ShowIfPermitted({
  permission,
  children,
}: {
  permission: string;
  children: React.ReactNode;
}) {
  return (
    <PermissionGuard permissions={[permission]} requireAll>
      {children}
    </PermissionGuard>
  );
}

/**
 * Hide component if user has permission
 */
export function HideIfPermitted({
  permission,
  children,
}: {
  permission: string;
  children: React.ReactNode;
}) {
  const { checkPermission, user } = useAuth();
  
  if (user && checkPermission(permission)) {
    return null;
  }

  return <>{children}</>;
}

/**
 * Render different content based on permission
 */
export function PermissionSwitch({
  permission,
  permitted,
  notPermitted,
}: {
  permission: string;
  permitted: React.ReactNode;
  notPermitted: React.ReactNode;
}) {
  return (
    <PermissionGuard permissions={[permission]} fallback={notPermitted}>
      {permitted}
    </PermissionGuard>
  );
}

// Import useAuth here to avoid circular dependency
import { useAuth } from '../hooks/useAuth.js';