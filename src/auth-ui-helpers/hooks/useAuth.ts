/**
 * useAuth Hook
 * Main authentication hook
 * Enterprise Standards v4.0.0 compliant
 */

import { useContext, useEffect, useCallback } from 'react';

import { AuthContext } from '../providers/AuthProvider.js';
import type { AuthContextValue, UseAuthOptions } from '../types.js';

export function useAuth(options?: UseAuthOptions): AuthContextValue {
  const context = useContext(AuthContext);

  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }

  const { onError, autoRefresh, refreshInterval = 300000 } = options ?? {}; // 5 minutes default

  // Handle errors
  useEffect(() => {
    if (context.error && onError) {
      onError(context.error);
    }
  }, [context.error, onError]);

  // Auto-refresh logic
  useEffect(() => {
    if (!autoRefresh || !context.isAuthenticated) {
      return;
    }

    const interval = setInterval(() => {
      context.refresh().catch((err) => {
        console.error('Auto-refresh failed:', err);
      });
    }, refreshInterval);

    return () => clearInterval(interval);
  }, [autoRefresh, context.isAuthenticated, refreshInterval, context]);

  return context;
}

/**
 * Helper hook to check authentication status
 */
export function useIsAuthenticated(): boolean {
  const { isAuthenticated } = useAuth();
  return isAuthenticated;
}

/**
 * Helper hook to get current user
 */
export function useCurrentUser() {
  const { user } = useAuth();
  return user;
}

/**
 * Helper hook for logout
 */
export function useLogout() {
  const { logout } = useAuth();

  const handleLogout = useCallback(async () => {
    try {
      await logout();
    } catch (error) {
      console.error('Logout failed:', error);
      // Still clear local state even if server logout fails
    }
  }, [logout]);

  return handleLogout;
}
