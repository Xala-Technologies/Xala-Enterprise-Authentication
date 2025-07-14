/**
 * Authentication Middleware Types
 * Enterprise Standards v4.0.0 compliant
 */

import type { UserProfile, NSMClassification } from '../types/index.js';

/**
 * Middleware context
 */
export interface AuthContext {
  readonly user?: UserProfile;
  readonly sessionId?: string;
  readonly accessToken?: string;
  readonly authenticated: boolean;
  readonly provider?: string;
}

/**
 * Middleware request
 */
export interface AuthRequest {
  readonly headers: Record<string, string | string[] | undefined>;
  readonly query?: Record<string, string | string[] | undefined>;
  readonly body?: unknown;
  readonly cookies?: Record<string, string>;
  readonly path: string;
  readonly method: string;
  auth?: AuthContext;
}

/**
 * Middleware response
 */
export interface AuthResponse {
  status(code: number): AuthResponse;
  json(data: unknown): void;
  send(data: string): void;
  setHeader(name: string, value: string): void;
}

/**
 * Next function
 */
export type NextFunction = (error?: Error) => void;

/**
 * Middleware function
 */
export type AuthMiddleware = (
  req: AuthRequest,
  res: AuthResponse,
  next: NextFunction
) => void | Promise<void>;

/**
 * Guard options
 */
export interface GuardOptions {
  readonly failureRedirect?: string;
  readonly failureMessage?: string;
  readonly throwOnFailure?: boolean;
  readonly skipOnPublicRoutes?: boolean;
}

/**
 * Role guard options
 */
export interface RoleGuardOptions extends GuardOptions {
  readonly roles: readonly string[];
  readonly requireAll?: boolean;
}

/**
 * Permission guard options
 */
export interface PermissionGuardOptions extends GuardOptions {
  readonly permissions: readonly string[];
  readonly requireAll?: boolean;
}

/**
 * NSM classification guard options
 */
export interface NSMClassificationGuardOptions extends GuardOptions {
  readonly requiredClassification: NSMClassification;
  readonly allowHigher?: boolean;
}

/**
 * Authentication guard interface
 */
export interface AuthenticationGuard {
  readonly name: string;
  readonly middleware: AuthMiddleware;
  canActivate(context: AuthContext): boolean | Promise<boolean>;
}

/**
 * Token extractor interface
 */
export interface TokenExtractor {
  extract(req: AuthRequest): string | null;
}

/**
 * Session validator interface
 */
export interface SessionValidator {
  validate(sessionId: string): Promise<AuthContext | null>;
}

/**
 * Token validator interface
 */
export interface TokenValidator {
  validate(token: string): Promise<AuthContext | null>;
}
