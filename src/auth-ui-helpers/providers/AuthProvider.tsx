/**
 * AuthProvider Component
 * Main authentication context provider
 * Enterprise Standards v4.0.0 compliant
 */

import React, {
  createContext,
  useState,
  useEffect,
  useCallback,
  useMemo,
} from 'react';

import type { UserProfile } from '../../types/index.js';
import type {
  AuthContextValue,
  AuthProviderProps,
  LoginCredentials,
  AuthError,
  SessionInfo,
} from '../types.js';

export const AuthContext = createContext<AuthContextValue | null>(null);

export function AuthProvider({
  children,
  config,
  onError,
  onSessionExpired,
}: AuthProviderProps) {
  const [user, setUser] = useState<UserProfile | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<AuthError | null>(null);
  const [sessionInfo, setSessionInfo] = useState<SessionInfo | undefined>();

  // Initialize auth state
  useEffect(() => {
    const initializeAuth = async () => {
      try {
        // Check for existing session
        if (config.persistSession) {
          const savedSession = localStorage.getItem('xala-auth-session');
          if (savedSession) {
            const session = JSON.parse(savedSession);
            // Validate session with server
            const response = await fetch(`${config.apiUrl}/auth/validate`, {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({ sessionId: session.id }),
            });

            if (response.ok) {
              const data = await response.json();
              setUser(data.user);
              setSessionInfo({
                expiresAt: new Date(data.expiresAt),
                remainingTime: new Date(data.expiresAt).getTime() - Date.now(),
                isExpiringSoon: false,
                canRefresh: true,
              });
            } else {
              localStorage.removeItem('xala-auth-session');
            }
          }
        }
      } catch (err) {
        console.error('Failed to initialize auth:', err);
      } finally {
        setIsLoading(false);
      }
    };

    initializeAuth();
  }, [config.apiUrl, config.persistSession]);

  const login = useCallback(
    async (credentials: LoginCredentials) => {
      setIsLoading(true);
      setError(null);

      try {
        const response = await fetch(`${config.apiUrl}/auth/login`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(credentials),
        });

        if (!response.ok) {
          const errorData = await response.json();
          throw new Error(errorData.message || 'Login failed');
        }

        const data = await response.json();
        setUser(data.user);
        setSessionInfo({
          expiresAt: new Date(data.expiresAt),
          remainingTime: new Date(data.expiresAt).getTime() - Date.now(),
          isExpiringSoon: false,
          canRefresh: true,
        });

        if (config.persistSession) {
          localStorage.setItem(
            'xala-auth-session',
            JSON.stringify({
              id: data.sessionId,
              expiresAt: data.expiresAt,
            }),
          );
        }
      } catch (err) {
        const authError: AuthError = {
          code: 'LOGIN_ERROR',
          message: (err as Error).message,
          retry: true,
        };
        setError(authError);
        if (onError) { onError(authError); }
        throw authError;
      } finally {
        setIsLoading(false);
      }
    },
    [config.apiUrl, config.persistSession, onError],
  );

  const logout = useCallback(async () => {
    setIsLoading(true);

    try {
      const session = localStorage.getItem('xala-auth-session');
      if (session) {
        const { id } = JSON.parse(session);
        await fetch(`${config.apiUrl}/auth/logout`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ sessionId: id }),
        });
      }
    } catch (err) {
      console.error('Logout error:', err);
    } finally {
      setUser(null);
      setSessionInfo(undefined);
      localStorage.removeItem('xala-auth-session');
      setIsLoading(false);
    }
  }, [config.apiUrl]);

  const refresh = useCallback(async () => {
    if (!sessionInfo?.canRefresh) {
      throw new Error('Session cannot be refreshed');
    }

    try {
      const session = localStorage.getItem('xala-auth-session');
      if (!session) { throw new Error('No session to refresh'); }

      const { id } = JSON.parse(session);
      const response = await fetch(`${config.apiUrl}/auth/refresh`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ sessionId: id }),
      });

      if (!response.ok) {
        throw new Error('Refresh failed');
      }

      const data = await response.json();
      setSessionInfo({
        expiresAt: new Date(data.expiresAt),
        remainingTime: new Date(data.expiresAt).getTime() - Date.now(),
        isExpiringSoon: false,
        canRefresh: true,
      });

      if (config.persistSession) {
        localStorage.setItem(
          'xala-auth-session',
          JSON.stringify({
            id: data.sessionId,
            expiresAt: data.expiresAt,
          }),
        );
      }
    } catch (err) {
      const authError: AuthError = {
        code: 'REFRESH_ERROR',
        message: (err as Error).message,
        retry: false,
      };
      setError(authError);
      if (onError) { onError(authError); }
      throw authError;
    }
  }, [config.apiUrl, config.persistSession, sessionInfo?.canRefresh, onError]);

  const checkPermission = useCallback(
    (permission: string): boolean => {
      if (!user) { return false; }
      return user.permissions.includes(permission);
    },
    [user],
  );

  const hasRole = useCallback(
    (role: string): boolean => {
      if (!user) { return false; }
      return user.roles.includes(role);
    },
    [user],
  );

  // Handle session expiry
  useEffect(() => {
    if (!sessionInfo?.expiresAt) { return; }

    const checkExpiry = () => {
      const now = Date.now();
      const expiresAt = new Date(sessionInfo.expiresAt).getTime();

      if (now >= expiresAt) {
        setUser(null);
        setSessionInfo(undefined);
        localStorage.removeItem('xala-auth-session');
        if (onSessionExpired) { onSessionExpired(); }
      }
    };

    const interval = setInterval(checkExpiry, 1000);
    return () => clearInterval(interval);
  }, [sessionInfo?.expiresAt, onSessionExpired]);

  const value = useMemo<AuthContextValue>(
    () => ({
      user,
      isAuthenticated: !!user,
      isLoading,
      error,
      login,
      logout,
      refresh,
      checkPermission,
      hasRole,
      sessionInfo,
    }),
    [
      user,
      isLoading,
      error,
      login,
      logout,
      refresh,
      checkPermission,
      hasRole,
      sessionInfo,
    ],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}
