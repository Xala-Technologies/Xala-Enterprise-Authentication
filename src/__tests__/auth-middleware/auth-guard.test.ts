/**
 * Tests for Authentication Guard
 * Enterprise Standards v4.0.0 compliant
 */

import { AuthGuard } from '../../auth-middleware/auth-guard';
import type { AuthContext } from '../../types';

// Mock dependencies
const mockLogger = {
  debug: jest.fn(),
  info: jest.fn(),
  warn: jest.fn(),
  error: jest.fn(),
  fatal: jest.fn(),
};

const mockTokenManager = {
  validateToken: jest.fn(),
  decodeToken: jest.fn(),
};

const mockSessionManager = {
  validateSession: jest.fn(),
  getSession: jest.fn(),
  refreshSession: jest.fn(),
};

const mockPermissionManager = {
  checkPermission: jest.fn(),
  hasRole: jest.fn(),
};

describe('AuthGuard', () => {
  let authGuard: AuthGuard;
  
  const createMockRequest = (headers: Record<string, string> = {}) => ({
    headers,
    cookies: {},
    ip: '127.0.0.1',
    path: '/api/test',
    method: 'GET',
  });

  const createMockContext = (): AuthContext => ({
    authenticated: false,
    userId: undefined,
    sessionId: undefined,
    roles: [],
    permissions: [],
    nsmClassification: 'OPEN',
    provider: undefined,
    metadata: {},
  });

  beforeEach(() => {
    jest.clearAllMocks();
    authGuard = new AuthGuard(
      mockTokenManager as any,
      mockSessionManager as any,
      mockPermissionManager as any,
      mockLogger as any
    );
  });

  describe('authenticate', () => {
    it('should authenticate valid bearer token', async () => {
      const mockRequest = createMockRequest({
        authorization: 'Bearer valid-token',
      });

      mockTokenManager.validateToken.mockResolvedValueOnce({
        valid: true,
        claims: {
          sub: 'user-123',
          sessionId: 'session-123',
          roles: ['user', 'admin'],
          permissions: ['read', 'write'],
          nsmClassification: 'RESTRICTED',
        },
      });

      mockSessionManager.validateSession.mockResolvedValueOnce(true);
      mockSessionManager.getSession.mockResolvedValueOnce({
        id: 'session-123',
        userId: 'user-123',
        provider: 'oauth',
        nsmClassification: 'RESTRICTED',
      });

      const context = await authGuard.authenticate(mockRequest);

      expect(context.authenticated).toBe(true);
      expect(context.userId).toBe('user-123');
      expect(context.sessionId).toBe('session-123');
      expect(context.roles).toEqual(['user', 'admin']);
      expect(context.permissions).toEqual(['read', 'write']);
      expect(context.nsmClassification).toBe('RESTRICTED');
      expect(context.provider).toBe('oauth');
    });

    it('should reject invalid token', async () => {
      const mockRequest = createMockRequest({
        authorization: 'Bearer invalid-token',
      });

      mockTokenManager.validateToken.mockResolvedValueOnce({
        valid: false,
        error: 'Invalid token signature',
      });

      const context = await authGuard.authenticate(mockRequest);

      expect(context.authenticated).toBe(false);
      expect(context.userId).toBeUndefined();
      expect(context.error).toBe('Invalid token signature');
    });

    it('should reject expired session', async () => {
      const mockRequest = createMockRequest({
        authorization: 'Bearer valid-token',
      });

      mockTokenManager.validateToken.mockResolvedValueOnce({
        valid: true,
        claims: {
          sub: 'user-123',
          sessionId: 'session-123',
        },
      });

      mockSessionManager.validateSession.mockResolvedValueOnce(false);

      const context = await authGuard.authenticate(mockRequest);

      expect(context.authenticated).toBe(false);
      expect(context.error).toBe('Session expired or invalid');
    });

    it('should handle missing authorization header', async () => {
      const mockRequest = createMockRequest();

      const context = await authGuard.authenticate(mockRequest);

      expect(context.authenticated).toBe(false);
      expect(context.error).toBe('No authorization token provided');
    });

    it('should handle malformed authorization header', async () => {
      const mockRequest = createMockRequest({
        authorization: 'InvalidFormat token',
      });

      const context = await authGuard.authenticate(mockRequest);

      expect(context.authenticated).toBe(false);
      expect(context.error).toBe('Invalid authorization format');
    });
  });

  describe('requireAuthentication', () => {
    it('should allow authenticated requests', async () => {
      const context: AuthContext = {
        authenticated: true,
        userId: 'user-123',
        sessionId: 'session-123',
        roles: ['user'],
        permissions: ['read'],
        nsmClassification: 'OPEN',
        provider: 'oauth',
        metadata: {},
      };

      const result = await authGuard.requireAuthentication(context);

      expect(result.allowed).toBe(true);
    });

    it('should block unauthenticated requests', async () => {
      const context = createMockContext();

      const result = await authGuard.requireAuthentication(context);

      expect(result.allowed).toBe(false);
      expect(result.reason).toBe('Authentication required');
      expect(result.statusCode).toBe(401);
    });
  });

  describe('requireRole', () => {
    it('should allow users with required role', async () => {
      const context: AuthContext = {
        authenticated: true,
        userId: 'user-123',
        sessionId: 'session-123',
        roles: ['user', 'admin'],
        permissions: [],
        nsmClassification: 'OPEN',
        provider: 'oauth',
        metadata: {},
      };

      mockPermissionManager.hasRole.mockReturnValueOnce(true);

      const result = await authGuard.requireRole('admin')(context);

      expect(result.allowed).toBe(true);
      expect(mockPermissionManager.hasRole).toHaveBeenCalledWith('user-123', 'admin');
    });

    it('should block users without required role', async () => {
      const context: AuthContext = {
        authenticated: true,
        userId: 'user-123',
        sessionId: 'session-123',
        roles: ['user'],
        permissions: [],
        nsmClassification: 'OPEN',
        provider: 'oauth',
        metadata: {},
      };

      mockPermissionManager.hasRole.mockReturnValueOnce(false);

      const result = await authGuard.requireRole('admin')(context);

      expect(result.allowed).toBe(false);
      expect(result.reason).toBe('Insufficient role: admin required');
      expect(result.statusCode).toBe(403);
    });

    it('should require authentication first', async () => {
      const context = createMockContext();

      const result = await authGuard.requireRole('admin')(context);

      expect(result.allowed).toBe(false);
      expect(result.reason).toBe('Authentication required');
      expect(result.statusCode).toBe(401);
    });
  });

  describe('requirePermission', () => {
    it('should allow users with required permission', async () => {
      const context: AuthContext = {
        authenticated: true,
        userId: 'user-123',
        sessionId: 'session-123',
        roles: ['user'],
        permissions: ['read', 'write'],
        nsmClassification: 'OPEN',
        provider: 'oauth',
        metadata: {},
      };

      mockPermissionManager.checkPermission.mockResolvedValueOnce({
        allowed: true,
        inherited: false,
      });

      const result = await authGuard.requirePermission('write', 'document')(context);

      expect(result.allowed).toBe(true);
      expect(mockPermissionManager.checkPermission).toHaveBeenCalledWith(
        'user-123',
        'write',
        'document'
      );
    });

    it('should block users without required permission', async () => {
      const context: AuthContext = {
        authenticated: true,
        userId: 'user-123',
        sessionId: 'session-123',
        roles: ['user'],
        permissions: ['read'],
        nsmClassification: 'OPEN',
        provider: 'oauth',
        metadata: {},
      };

      mockPermissionManager.checkPermission.mockResolvedValueOnce({
        allowed: false,
      });

      const result = await authGuard.requirePermission('delete', 'document')(context);

      expect(result.allowed).toBe(false);
      expect(result.reason).toBe('Insufficient permission: delete on document');
      expect(result.statusCode).toBe(403);
    });
  });

  describe('requireNSMClassification', () => {
    it('should allow access to lower or equal classification', async () => {
      const context: AuthContext = {
        authenticated: true,
        userId: 'user-123',
        sessionId: 'session-123',
        roles: ['user'],
        permissions: [],
        nsmClassification: 'RESTRICTED',
        provider: 'oauth',
        metadata: {},
      };

      const result = await authGuard.requireNSMClassification('OPEN')(context);
      expect(result.allowed).toBe(true);

      const result2 = await authGuard.requireNSMClassification('RESTRICTED')(context);
      expect(result2.allowed).toBe(true);
    });

    it('should block access to higher classification', async () => {
      const context: AuthContext = {
        authenticated: true,
        userId: 'user-123',
        sessionId: 'session-123',
        roles: ['user'],
        permissions: [],
        nsmClassification: 'OPEN',
        provider: 'oauth',
        metadata: {},
      };

      const result = await authGuard.requireNSMClassification('CONFIDENTIAL')(context);

      expect(result.allowed).toBe(false);
      expect(result.reason).toBe('Insufficient NSM classification: CONFIDENTIAL required, user has OPEN');
      expect(result.statusCode).toBe(403);
    });
  });

  describe('combineGuards', () => {
    it('should require all guards to pass', async () => {
      const context: AuthContext = {
        authenticated: true,
        userId: 'user-123',
        sessionId: 'session-123',
        roles: ['admin'],
        permissions: ['write'],
        nsmClassification: 'CONFIDENTIAL',
        provider: 'oauth',
        metadata: {},
      };

      mockPermissionManager.hasRole.mockReturnValueOnce(true);
      mockPermissionManager.checkPermission.mockResolvedValueOnce({
        allowed: true,
        inherited: false,
      });

      const combinedGuard = authGuard.combineGuards([
        authGuard.requireRole('admin'),
        authGuard.requirePermission('write', 'document'),
        authGuard.requireNSMClassification('RESTRICTED'),
      ]);

      const result = await combinedGuard(context);

      expect(result.allowed).toBe(true);
    });

    it('should fail if any guard fails', async () => {
      const context: AuthContext = {
        authenticated: true,
        userId: 'user-123',
        sessionId: 'session-123',
        roles: ['user'],
        permissions: ['read'],
        nsmClassification: 'OPEN',
        provider: 'oauth',
        metadata: {},
      };

      mockPermissionManager.hasRole.mockReturnValueOnce(false);

      const combinedGuard = authGuard.combineGuards([
        authGuard.requireRole('admin'),
        authGuard.requireNSMClassification('OPEN'),
      ]);

      const result = await combinedGuard(context);

      expect(result.allowed).toBe(false);
      expect(result.reason).toBe('Insufficient role: admin required');
    });
  });
});