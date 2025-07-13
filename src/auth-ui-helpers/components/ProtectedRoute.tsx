/**
 * Protected Route Component
 * @xala-technologies/authentication
 */

import type { ReactNode } from 'react';
import { useAuth } from '../hooks/useAuth.js';

interface ProtectedRouteProps {
  children: ReactNode;
  redirectTo?: string;
  requiredRoles?: string[];
  requiredPermissions?: string[];
}

// Simple Navigate component replacement for when react-router-dom is not available
function Navigate({ to }: { to: string }): JSX.Element {
  // In a real implementation, this would use the router to navigate
  // For now, we'll redirect using window.location
  if (typeof window !== 'undefined') {
    window.location.href = to;
  }
  return <div>Redirecting to {to}...</div>;
}

export function ProtectedRoute({
  children,
  redirectTo = '/login',
  requiredRoles = [],
  requiredPermissions = [],
}: ProtectedRouteProps): JSX.Element {
  const { isAuthenticated, user, hasRole, checkPermission } = useAuth();

  if (!isAuthenticated) {
    return <Navigate to={redirectTo} />;
  }

  // Check role requirements
  if (requiredRoles.length > 0 && !requiredRoles.some(role => hasRole(role))) {
    return <Navigate to="/unauthorized" />;
  }

  // Check permission requirements
  if (requiredPermissions.length > 0 && !requiredPermissions.some(permission => checkPermission(permission))) {
    return <Navigate to="/unauthorized" />;
  }

  return <>{children}</>;
}

/**
 * Higher-order component version
 */
export function withProtectedRoute<P extends object>(
  Component: React.ComponentType<P>,
  options: Omit<ProtectedRouteProps, 'children'>
) {
  return function ProtectedComponent(props: P) {
    return (
      <ProtectedRoute {...options}>
        <Component {...props} />
      </ProtectedRoute>
    );
  };
}