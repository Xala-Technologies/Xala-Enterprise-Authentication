/**
 * Tests for Session Manager
 * Enterprise Standards v4.0.0 compliant
 */

import { DefaultSessionManager } from "../../auth-core/session-manager";
import { InMemorySessionStorage } from "../../auth-core/session-storage";
import type { UserProfile, ClientInfo } from "../../types";

// Mock dependencies
const mockLogger = {
  debug: jest.fn(),
  info: jest.fn(),
  warn: jest.fn(),
  error: jest.fn(),
  fatal: jest.fn(),
};

const mockEvents = {
  emit: jest.fn(),
  on: jest.fn(),
  off: jest.fn(),
  once: jest.fn(),
};

describe("DefaultSessionManager", () => {
  let sessionManager: DefaultSessionManager;
  let sessionStorage: InMemorySessionStorage;

  const testUser: UserProfile = {
    id: "user-123",
    email: "test@example.com",
    name: "Test User",
    roles: ["user"],
    permissions: ["read"],
    nsmClassification: "RESTRICTED",
    metadata: {},
  };

  const testClientInfo: ClientInfo = {
    ipAddress: "127.0.0.1",
    userAgent: "Mozilla/5.0",
    deviceId: "device-123",
  };

  beforeEach(() => {
    jest.clearAllMocks();
    sessionStorage = InMemorySessionStorage.create();
    sessionManager = new DefaultSessionManager(
      30 * 60 * 1000, // 30 minutes
      5, // max concurrent sessions
      sessionStorage,
      mockLogger as any,
      mockEvents as any,
    );
  });

  describe("createSession", () => {
    it("should create a new session", async () => {
      const session = await sessionManager.createSession(
        testUser,
        testClientInfo,
        "oauth",
      );

      expect(session).toMatchObject({
        userId: testUser.id,
        provider: "oauth",
        nsmClassification: "RESTRICTED",
        clientInfo: testClientInfo,
      });
      expect(session.id).toBeDefined();
      expect(session.createdAt).toBeInstanceOf(Date);
      expect(session.expiresAt).toBeInstanceOf(Date);
      expect(session.lastActivityAt).toBeInstanceOf(Date);
    });

    it("should emit session created event", async () => {
      await sessionManager.createSession(testUser, testClientInfo, "oauth");

      expect(mockEvents.emit).toHaveBeenCalledWith(
        "authentication.session.created",
        expect.objectContaining({
          type: "authentication.session.created",
          source: "SessionManager",
        }),
      );
    });

    it("should enforce max concurrent sessions", async () => {
      // Create max sessions
      for (let i = 0; i < 5; i++) {
        await sessionManager.createSession(testUser, testClientInfo, "oauth");
      }

      // Creating one more should remove the oldest
      const newSession = await sessionManager.createSession(
        testUser,
        testClientInfo,
        "oauth",
      );

      expect(newSession).toBeDefined();
      const userSessions = await sessionManager.getUserSessions(testUser.id);
      expect(userSessions).toHaveLength(5);
    });
  });

  describe("validateSession", () => {
    it("should validate an active session", async () => {
      const session = await sessionManager.createSession(
        testUser,
        testClientInfo,
        "oauth",
      );

      const isValid = await sessionManager.validateSession(session.id);
      expect(isValid).toBe(true);
    });

    it("should invalidate expired session", async () => {
      const session = await sessionManager.createSession(
        testUser,
        testClientInfo,
        "oauth",
      );

      // Manually expire the session
      const expiredSession = {
        ...session,
        expiresAt: new Date(Date.now() - 1000),
      };
      await sessionStorage.set(session.id, expiredSession);

      const isValid = await sessionManager.validateSession(session.id);
      expect(isValid).toBe(false);
    });

    it("should return false for non-existent session", async () => {
      const isValid = await sessionManager.validateSession("non-existent");
      expect(isValid).toBe(false);
    });
  });

  describe("refreshSession", () => {
    it("should refresh session expiry time", async () => {
      const session = await sessionManager.createSession(
        testUser,
        testClientInfo,
        "oauth",
      );
      const originalExpiry = session.expiresAt;

      // Wait a bit
      await new Promise((resolve) => setTimeout(resolve, 100));

      const refreshedSession = await sessionManager.refreshSession(session.id);

      expect(refreshedSession).toBeDefined();
      expect(refreshedSession!.expiresAt.getTime()).toBeGreaterThan(
        originalExpiry.getTime(),
      );
      expect(refreshedSession!.lastActivityAt.getTime()).toBeGreaterThan(
        session.lastActivityAt.getTime(),
      );
    });

    it("should emit session refreshed event", async () => {
      const session = await sessionManager.createSession(
        testUser,
        testClientInfo,
        "oauth",
      );

      await sessionManager.refreshSession(session.id);

      expect(mockEvents.emit).toHaveBeenCalledWith(
        "authentication.session.refreshed",
        expect.objectContaining({
          type: "authentication.session.refreshed",
        }),
      );
    });
  });

  describe("revokeSession", () => {
    it("should revoke an active session", async () => {
      const session = await sessionManager.createSession(
        testUser,
        testClientInfo,
        "oauth",
      );

      await sessionManager.revokeSession(session.id);

      const sessionAfter = await sessionManager.getSession(session.id);
      expect(sessionAfter).toBeNull();
    });

    it("should emit session revoked event", async () => {
      const session = await sessionManager.createSession(
        testUser,
        testClientInfo,
        "oauth",
      );

      await sessionManager.revokeSession(session.id);

      expect(mockEvents.emit).toHaveBeenCalledWith(
        "authentication.session.revoked",
        expect.objectContaining({
          type: "authentication.session.revoked",
        }),
      );
    });
  });

  describe("getUserSessions", () => {
    it("should return all user sessions", async () => {
      const session1 = await sessionManager.createSession(
        testUser,
        testClientInfo,
        "oauth",
      );
      const session2 = await sessionManager.createSession(
        testUser,
        testClientInfo,
        "norwegian-id",
      );

      const sessions = await sessionManager.getUserSessions(testUser.id);

      expect(sessions).toHaveLength(2);
      expect(sessions.map((s) => s.id)).toContain(session1.id);
      expect(sessions.map((s) => s.id)).toContain(session2.id);
    });

    it("should return empty array for user with no sessions", async () => {
      const sessions = await sessionManager.getUserSessions("unknown-user");
      expect(sessions).toEqual([]);
    });
  });

  describe("cleanupExpiredSessions", () => {
    it("should remove expired sessions", async () => {
      const session1 = await sessionManager.createSession(
        testUser,
        testClientInfo,
        "oauth",
      );
      const session2 = await sessionManager.createSession(
        testUser,
        testClientInfo,
        "oauth",
      );

      // Expire session1
      const expiredSession = {
        ...session1,
        expiresAt: new Date(Date.now() - 1000),
      };
      await sessionStorage.set(session1.id, expiredSession);

      await sessionManager.cleanupExpiredSessions();

      const remainingSessions = await sessionManager.getUserSessions(
        testUser.id,
      );
      expect(remainingSessions).toHaveLength(1);
      expect(remainingSessions[0].id).toBe(session2.id);
    });
  });
});
