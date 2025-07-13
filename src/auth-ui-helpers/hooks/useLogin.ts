/**
 * useLogin Hook
 * Handles login flow
 * Enterprise Standards v4.0.0 compliant
 */

import { useState, useCallback } from 'react';
import type { LoginCredentials, AuthError, UseLoginReturn } from '../types.js';
import { useAuth } from './useAuth.js';

export function useLogin(): UseLoginReturn {
  const { login: authLogin } = useAuth();
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<AuthError | null>(null);

  const login = useCallback(async (credentials: LoginCredentials) => {
    setIsLoading(true);
    setError(null);

    try {
      await authLogin(credentials);
    } catch (err) {
      const authError: AuthError = {
        code: (err as any).code ?? 'LOGIN_FAILED',
        message: (err as any).message ?? 'Login failed',
        retry: true,
      };
      setError(authError);
      throw authError;
    } finally {
      setIsLoading(false);
    }
  }, [authLogin]);

  const clearError = useCallback(() => {
    setError(null);
  }, []);

  return {
    login,
    isLoading,
    error,
    clearError,
  };
}

/**
 * Hook for Norwegian ID login
 */
export function useNorwegianIDLogin() {
  const { login, isLoading, error, clearError } = useLogin();

  const loginWithNorwegianID = useCallback(async (
    provider: 'bankid' | 'buypass' | 'commfides',
    personalNumber: string
  ) => {
    const credentials: LoginCredentials = {
      provider: 'norwegian-id',
      personalNumber,
      [provider]: true,
    };

    await login(credentials);
  }, [login]);

  return {
    loginWithNorwegianID,
    isLoading,
    error,
    clearError,
  };
}

/**
 * Hook for OAuth login
 */
export function useOAuthLogin() {
  const { login, isLoading, error, clearError } = useLogin();

  const loginWithOAuth = useCallback(async (
    provider: string,
    code?: string,
    state?: string
  ) => {
    const credentials: LoginCredentials = {
      provider,
      ...(code && { code }),
      ...(state && { state }),
    };

    await login(credentials);
  }, [login]);

  const initiateOAuthFlow = useCallback((provider: string) => {
    // In a real implementation, this would redirect to OAuth provider
    const authUrl = `/api/auth/oauth/${provider}/authorize`;
    window.location.href = authUrl;
  }, []);

  return {
    loginWithOAuth,
    initiateOAuthFlow,
    isLoading,
    error,
    clearError,
  };
}