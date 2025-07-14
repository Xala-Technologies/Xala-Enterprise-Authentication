/**
 * Session Storage Implementations
 * @xala-technologies/authentication
 */

import { Logger } from '../foundation-mock.js';
import type { SessionInfo, SessionStorageConfig } from '../types/index.js';

import type { SessionStorageBackend } from './types.js';

export class MemorySessionStorage implements SessionStorageBackend {
  private readonly sessions: Map<string, SessionInfo> = new Map();
  private readonly userSessions: Map<string, Set<string>> = new Map();
  private readonly logger: Logger;
  private cleanupInterval?: NodeJS.Timeout | undefined;

  constructor(logger: Logger) {
    this.logger = logger;
  }

  async initialize(config: SessionStorageConfig): Promise<void> {
    this.logger.info('Initializing memory session storage');

    // Start cleanup interval
    const cleanupIntervalMs = config.ttl || 60000; // Default 1 minute
    this.cleanupInterval = setInterval(() => {
      this.cleanup().catch((error) => {
        this.logger.error('Session cleanup failed', { error: error.message });
      });
    }, cleanupIntervalMs);

    this.logger.info('Memory session storage initialized', {
      cleanupInterval: cleanupIntervalMs,
    });
  }

  async disconnect(): Promise<void> {
    if (this.cleanupInterval) {
      clearInterval(this.cleanupInterval);
      this.cleanupInterval = undefined;
    }

    this.sessions.clear();
    this.userSessions.clear();

    this.logger.info('Memory session storage disconnected');
  }

  async health(): Promise<boolean> {
    return true; // Memory storage is always healthy
  }

  async get(sessionId: string): Promise<SessionInfo | null> {
    const session = this.sessions.get(sessionId);

    if (!session) {
      return null;
    }

    // Check if session is expired
    if (session.expiresAt < new Date()) {
      await this.delete(sessionId);
      return null;
    }

    return { ...session }; // Return a copy
  }

  async set(sessionId: string, session: SessionInfo): Promise<void> {
    this.sessions.set(sessionId, { ...session }); // Store a copy

    // Track user sessions
    const userSessionIds = this.userSessions.get(session.userId) || new Set();
    userSessionIds.add(sessionId);
    this.userSessions.set(session.userId, userSessionIds);

    this.logger.debug('Session stored', {
      sessionId,
      userId: session.userId,
      expiresAt: session.expiresAt,
    });
  }

  async delete(sessionId: string): Promise<void> {
    const session = this.sessions.get(sessionId);

    if (session) {
      this.sessions.delete(sessionId);

      // Remove from user sessions tracking
      const userSessionIds = this.userSessions.get(session.userId);
      if (userSessionIds) {
        userSessionIds.delete(sessionId);
        if (userSessionIds.size === 0) {
          this.userSessions.delete(session.userId);
        }
      }

      this.logger.debug('Session deleted', {
        sessionId,
        userId: session.userId,
      });
    }
  }

  async exists(sessionId: string): Promise<boolean> {
    const session = await this.get(sessionId);
    return session !== null;
  }

  async cleanup(): Promise<void> {
    const now = new Date();
    const expiredSessions: string[] = [];

    for (const [sessionId, session] of this.sessions.entries()) {
      if (session.expiresAt < now) {
        expiredSessions.push(sessionId);
      }
    }

    for (const sessionId of expiredSessions) {
      await this.delete(sessionId);
    }

    if (expiredSessions.length > 0) {
      this.logger.debug('Expired sessions cleaned up', {
        count: expiredSessions.length,
      });
    }
  }

  async getUserSessions(userId: string): Promise<SessionInfo[]> {
    const sessionIds = this.userSessions.get(userId) || new Set();
    const sessions: SessionInfo[] = [];

    for (const sessionId of sessionIds) {
      const session = await this.get(sessionId);
      if (session) {
        sessions.push(session);
      }
    }

    return sessions;
  }

  async deleteUserSessions(userId: string): Promise<void> {
    const sessionIds = this.userSessions.get(userId) || new Set();

    for (const sessionId of sessionIds) {
      await this.delete(sessionId);
    }

    this.logger.info('All user sessions deleted', {
      userId,
      sessionCount: sessionIds.size,
    });
  }

  static create(logger: Logger): MemorySessionStorage {
    return new MemorySessionStorage(logger);
  }
}

// Note: Redis and Database implementations would be added here
// For now, we'll focus on the memory implementation

export class SessionStorageFactory {
  static create(
    type: 'memory' | 'redis' | 'database',
    logger: Logger,
  ): SessionStorageBackend {
    switch (type) {
      case 'memory':
        return MemorySessionStorage.create(logger);
      case 'redis':
        throw new Error('Redis session storage not yet implemented');
      case 'database':
        throw new Error('Database session storage not yet implemented');
      default:
        throw new Error(`Unknown session storage type: ${type}`);
    }
  }
}
