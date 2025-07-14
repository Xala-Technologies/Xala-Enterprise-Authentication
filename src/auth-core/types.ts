/**
 * Auth Core Types
 * @xala-technologies/authentication
 */

import type {
  SessionInfo,
  UserProfile,
  ClientInfo,
  TokenClaims,
  SessionStorageConfig,
} from '../types/index.js';

export interface SessionStorage {
  get(sessionId: string): Promise<SessionInfo | null>;
  set(sessionId: string, session: SessionInfo): Promise<void>;
  delete(sessionId: string): Promise<void>;
  exists(sessionId: string): Promise<boolean>;
  cleanup(): Promise<void>;
  getUserSessions(userId: string): Promise<SessionInfo[]>;
  deleteUserSessions(userId: string): Promise<void>;
}

export interface TokenManager {
  generateAccessToken(user: UserProfile, sessionId: string): Promise<string>;
  generateRefreshToken(user: UserProfile, sessionId: string): Promise<string>;
  validateToken(token: string): Promise<TokenValidationResult>;
  refreshAccessToken(refreshToken: string): Promise<TokenRefreshResult>;
  revokeToken(token: string): Promise<void>;
  decodeToken(token: string): Promise<TokenClaims | null>;
}

export interface TokenValidationResult {
  valid: boolean;
  claims?: TokenClaims;
  error?: string;
}

export interface TokenRefreshResult {
  success: boolean;
  accessToken?: string;
  expiresIn?: number;
  error?: string;
}

export interface SessionManager {
  createSession(user: UserProfile, clientInfo: ClientInfo, provider: string): Promise<SessionInfo>;
  getSession(sessionId: string): Promise<SessionInfo | null>;
  updateSession(sessionId: string, updates: Partial<SessionInfo>): Promise<void>;
  deleteSession(sessionId: string): Promise<void>;
  validateSession(sessionId: string): Promise<boolean>;
  cleanupExpiredSessions(): Promise<void>;
  getUserSessions(userId: string): Promise<SessionInfo[]>;
  enforceMaxSessions(userId: string, maxSessions: number): Promise<void>;
}

export interface AuthenticationContext {
  currentUser: UserProfile | null;
  currentSession: SessionInfo | null;
  isAuthenticated: boolean;
  hasRole(role: string): boolean;
  hasPermission(permission: string): boolean;
  canAccess(nsmLevel: 'OPEN' | 'RESTRICTED' | 'CONFIDENTIAL' | 'SECRET'): boolean;
}

export interface BruteForceProtection {
  recordFailedAttempt(identifier: string, clientInfo: ClientInfo): Promise<void>;
  recordSuccessfulAttempt(identifier: string): Promise<void>;
  isBlocked(identifier: string): Promise<boolean>;
  getBlockDuration(identifier: string): Promise<number>;
  cleanup(): Promise<void>;
}

export interface SessionStorageBackend extends SessionStorage {
  initialize(config: SessionStorageConfig): Promise<void>;
  disconnect(): Promise<void>;
  health(): Promise<boolean>;
}
