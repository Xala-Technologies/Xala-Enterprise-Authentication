/**
 * Session Manager Implementation
 * @xala-technologies/authentication
 */

import { randomBytes, randomUUID } from 'crypto';

import { Logger, EventCore } from '../foundation-mock.js';
import type { SessionInfo, UserProfile, ClientInfo } from '../types/index.js';

import type { SessionManager, SessionStorage } from './types.js';

export class DefaultSessionManager implements SessionManager {
  private readonly storage: SessionStorage;
  private readonly logger: Logger;
  private readonly events: EventCore;
  private readonly sessionTimeout: number;
  private readonly maxConcurrentSessions: number;

  constructor(
    storage: SessionStorage,
    options: {
      sessionTimeout: number;
      maxConcurrentSessions: number;
      logger: Logger;
      events: EventCore;
    },
  ) {
    this.storage = storage;
    this.sessionTimeout = options.sessionTimeout;
    this.maxConcurrentSessions = options.maxConcurrentSessions;
    this.logger = options.logger;
    this.events = options.events;
  }

  async createSession(
    user: UserProfile,
    clientInfo: ClientInfo,
    provider: string,
  ): Promise<SessionInfo> {
    const sessionId = this.generateSessionId();
    const now = new Date();
    const expiresAt = new Date(now.getTime() + this.sessionTimeout);

    const session: SessionInfo = {
      id: sessionId,
      userId: user.id,
      provider,
      createdAt: now,
      lastAccessedAt: now,
      expiresAt,
      clientInfo,
      nsmClassification: user.nsmClassification,
    };

    await this.storage.set(sessionId, session);

    // Enforce max concurrent sessions
    await this.enforceMaxSessions(user.id, this.maxConcurrentSessions);

    // Emit session created event
    const eventData = {
      id: `auth-${sessionId}`,
      type: 'authentication.session.created',
      source: 'authentication-service',
      timestamp: now,
      data: {
        userId: user.id,
        sessionId,
        provider,
        clientInfo,
      },
      nsmClassification: user.nsmClassification,
      userId: user.id,
      sessionId,
    };

    await this.events.emit('authentication.session.created', eventData);

    this.logger.info('Session created', {
      sessionId,
      userId: user.id,
      provider,
      nsmClassification: user.nsmClassification,
      clientInfo: {
        ipAddress: clientInfo.ipAddress,
        userAgent: clientInfo.userAgent,
      },
    });

    return session;
  }

  async getSession(sessionId: string): Promise<SessionInfo | null> {
    const session = await this.storage.get(sessionId);

    if (!session) {
      return null;
    }

    // Check if session is expired
    if (session.expiresAt < new Date()) {
      await this.deleteSession(sessionId);

      const eventData = {
        id: `expire-${sessionId}`,
        type: 'authentication.session.expired',
        source: 'authentication-service',
        timestamp: new Date(),
        data: {
          userId: session.userId,
          sessionId,
          provider: session.provider,
        },
        nsmClassification: session.nsmClassification,
        userId: session.userId,
        sessionId,
      };

      await this.events.emit('authentication.session.expired', eventData);

      return null;
    }

    return session;
  }

  async updateSession(
    sessionId: string,
    updates: Partial<SessionInfo>,
  ): Promise<void> {
    const session = await this.storage.get(sessionId);

    if (!session) {
      throw new Error(`Session ${sessionId} not found`);
    }

    const updatedSession = {
      ...session,
      ...updates,
      lastAccessedAt: new Date(),
    };

    await this.storage.set(sessionId, updatedSession);

    this.logger.debug('Session updated', {
      sessionId,
      userId: session.userId,
      updates: Object.keys(updates),
    });
  }

  async deleteSession(sessionId: string): Promise<void> {
    const session = await this.storage.get(sessionId);

    if (session) {
      await this.storage.delete(sessionId);

      const eventData = {
        id: `logout-${sessionId}`,
        type: 'authentication.session.deleted',
        source: 'authentication-service',
        timestamp: new Date(),
        data: {
          userId: session.userId,
          sessionId,
          provider: session.provider,
        },
        nsmClassification: session.nsmClassification,
        userId: session.userId,
        sessionId,
      };

      await this.events.emit('authentication.session.deleted', eventData);

      this.logger.info('Session deleted', {
        sessionId,
        userId: session.userId,
        provider: session.provider,
      });
    }
  }

  async validateSession(sessionId: string): Promise<boolean> {
    const session = await this.getSession(sessionId);
    return session !== null;
  }

  async cleanupExpiredSessions(): Promise<void> {
    this.logger.debug('Starting session cleanup');
    await this.storage.cleanup();
    this.logger.debug('Session cleanup completed');
  }

  async getUserSessions(userId: string): Promise<SessionInfo[]> {
    return await this.storage.getUserSessions(userId);
  }

  async enforceMaxSessions(userId: string, maxSessions: number): Promise<void> {
    const userSessions = await this.getUserSessions(userId);

    if (userSessions.length > maxSessions) {
      // Sort by last accessed time (oldest first)
      const sortedSessions = userSessions.sort(
        (a, b) => a.lastAccessedAt.getTime() - b.lastAccessedAt.getTime(),
      );

      // Remove oldest sessions
      const sessionsToRemove = sortedSessions.slice(
        0,
        userSessions.length - maxSessions,
      );

      for (const session of sessionsToRemove) {
        await this.deleteSession(session.id);
      }

      this.logger.info('Enforced max sessions limit', {
        userId,
        maxSessions,
        removedSessions: sessionsToRemove.length,
      });
    }
  }

  private generateSessionId(): string {
    // Generate cryptographically secure session ID
    return `${randomUUID() }-${ randomBytes(16).toString('hex')}`;
  }

  static create(
    storage: SessionStorage,
    options: {
      sessionTimeout: number;
      maxConcurrentSessions: number;
      logger: Logger;
      events: EventCore;
    },
  ): DefaultSessionManager {
    return new DefaultSessionManager(storage, options);
  }
}

// Export alias for compatibility
export { DefaultSessionManager as SessionManager };
