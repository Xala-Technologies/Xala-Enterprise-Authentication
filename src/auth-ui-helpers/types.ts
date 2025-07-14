/**
 * UI Helper Types
 * Enterprise Standards v4.0.0 compliant
 */

import type { ReactNode } from 'react';

import type {
  UserProfile,
  AuthenticationResult,
  AuthenticationRequest,
  NSMClassification,
} from '../types/index.js';

/**
 * Authentication context value
 */
export interface AuthContextValue {
  readonly user: UserProfile | null;
  readonly isAuthenticated: boolean;
  readonly isLoading: boolean;
  readonly error: AuthError | null;
  readonly login: (credentials: LoginCredentials) => Promise<void>;
  readonly logout: () => Promise<void>;
  readonly refresh: () => Promise<void>;
  readonly checkPermission: (permission: string) => boolean;
  readonly hasRole: (role: string) => boolean;
  readonly sessionInfo?: SessionInfo;
}

/**
 * Login credentials
 */
export interface LoginCredentials {
  readonly provider: string;
  readonly email?: string;
  readonly password?: string;
  readonly personalNumber?: string;
  readonly rememberMe?: boolean;
  readonly mfaCode?: string;
}

/**
 * Session info for UI
 */
export interface SessionInfo {
  readonly expiresAt: Date;
  readonly remainingTime: number;
  readonly isExpiringSoon: boolean;
  readonly canRefresh: boolean;
}

/**
 * Auth error
 */
export interface AuthError {
  readonly code: string;
  readonly message: string;
  readonly field?: string;
  readonly retry?: boolean;
}

/**
 * Auth provider props
 */
export interface AuthProviderProps {
  readonly children: ReactNode;
  readonly config: AuthUIConfig;
  readonly onError?: (error: AuthError) => void;
  readonly onSessionExpired?: () => void;
}

/**
 * Auth UI configuration
 */
export interface AuthUIConfig {
  readonly apiUrl: string;
  readonly providers: UIProviderConfig[];
  readonly sessionWarningTime?: number; // milliseconds before expiry
  readonly autoRefresh?: boolean;
  readonly persistSession?: boolean;
  readonly norwegianCompliance?: NorwegianUICompliance;
}

/**
 * UI provider configuration
 */
export interface UIProviderConfig {
  readonly id: string;
  readonly name: string;
  readonly type: 'norwegian-id' | 'oauth' | 'saml' | 'local';
  readonly icon?: string;
  readonly displayOrder?: number;
  readonly enabled?: boolean;
}

/**
 * Norwegian UI compliance settings
 */
export interface NorwegianUICompliance {
  readonly defaultLanguage: 'nb-NO' | 'nn-NO' | 'en-US';
  readonly showNSMClassification: boolean;
  readonly requireConsent: boolean;
  readonly wcagLevel: 'AA' | 'AAA';
}

/**
 * Login form props
 */
export interface LoginFormProps {
  readonly onSubmit: (credentials: LoginCredentials) => Promise<void>;
  readonly providers?: UIProviderConfig[];
  readonly initialProvider?: string;
  readonly showRememberMe?: boolean;
  readonly showForgotPassword?: boolean;
  readonly className?: string;
}

/**
 * Protected route props
 */
export interface ProtectedRouteProps {
  readonly children: ReactNode;
  readonly requiredPermissions?: string[];
  readonly requiredRoles?: string[];
  readonly requiredClassification?: NSMClassification;
  readonly fallback?: ReactNode;
  readonly redirectTo?: string;
}

/**
 * Session timer props
 */
export interface SessionTimerProps {
  readonly showWarning?: boolean;
  readonly warningTime?: number;
  readonly onExpire?: () => void;
  readonly onWarning?: (remainingTime: number) => void;
  readonly className?: string;
}

/**
 * Norwegian ID button props
 */
export interface NorwegianIDButtonProps {
  readonly provider: 'bankid' | 'buypass' | 'commfides';
  readonly onAuthenticate: (provider: string) => Promise<void>;
  readonly disabled?: boolean;
  readonly className?: string;
  readonly size?: 'small' | 'medium' | 'large';
}

/**
 * Permission guard props
 */
export interface PermissionGuardProps {
  readonly children: ReactNode;
  readonly permissions: string[];
  readonly requireAll?: boolean;
  readonly fallback?: ReactNode;
}

/**
 * Auth hook options
 */
export interface UseAuthOptions {
  readonly onError?: (error: AuthError) => void;
  readonly autoRefresh?: boolean;
  readonly refreshInterval?: number;
}

/**
 * Session hook options
 */
export interface UseSessionOptions {
  readonly warningTime?: number;
  readonly onWarning?: (remainingTime: number) => void;
  readonly onExpire?: () => void;
}

/**
 * Permission hook options
 */
export interface UsePermissionOptions {
  readonly permissions: string[];
  readonly requireAll?: boolean;
}

/**
 * Login hook return
 */
export interface UseLoginReturn {
  readonly login: (credentials: LoginCredentials) => Promise<void>;
  readonly isLoading: boolean;
  readonly error: AuthError | null;
  readonly clearError: () => void;
}

/**
 * Theme configuration
 */
export interface AuthTheme {
  readonly colors: {
    readonly primary: string;
    readonly secondary: string;
    readonly error: string;
    readonly warning: string;
    readonly success: string;
    readonly background: string;
    readonly text: string;
  };
  readonly fonts: {
    readonly body: string;
    readonly heading: string;
  };
  readonly borderRadius: string;
  readonly spacing: {
    readonly small: string;
    readonly medium: string;
    readonly large: string;
  };
}
