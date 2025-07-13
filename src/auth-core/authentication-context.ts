/**
 * Authentication Context Implementation
 * @xala-technologies/authentication
 */

import type { UserProfile, SessionInfo } from "../types/index.js";
import type { AuthenticationContext } from "./types.js";

export class DefaultAuthenticationContext implements AuthenticationContext {
  public currentUser: UserProfile | null = null;
  public currentSession: SessionInfo | null = null;

  constructor(
    user?: UserProfile | undefined,
    session?: SessionInfo | undefined,
  ) {
    this.currentUser = user ?? null;
    this.currentSession = session ?? null;
  }

  get isAuthenticated(): boolean {
    return this.currentUser !== null && this.currentSession !== null;
  }

  hasRole(role: string): boolean {
    if (!this.currentUser) {
      return false;
    }

    return this.currentUser.roles.includes(role);
  }

  hasPermission(permission: string): boolean {
    if (!this.currentUser) {
      return false;
    }

    return this.currentUser.permissions.includes(permission);
  }

  canAccess(
    nsmLevel: "OPEN" | "RESTRICTED" | "CONFIDENTIAL" | "SECRET",
  ): boolean {
    if (!this.currentUser) {
      return nsmLevel === "OPEN";
    }

    const userLevel = this.currentUser.nsmClassification;
    const sessionLevel = this.currentSession?.nsmClassification;

    // Use the most restrictive classification between user and session
    const effectiveLevel = this.getMostRestrictiveLevel(
      userLevel,
      sessionLevel,
    );

    return this.hasAccessToLevel(effectiveLevel, nsmLevel);
  }

  private hasAccessToLevel(
    userLevel: "OPEN" | "RESTRICTED" | "CONFIDENTIAL" | "SECRET",
    requiredLevel: "OPEN" | "RESTRICTED" | "CONFIDENTIAL" | "SECRET",
  ): boolean {
    const levels = ["OPEN", "RESTRICTED", "CONFIDENTIAL", "SECRET"];
    const userLevelIndex = levels.indexOf(userLevel);
    const requiredLevelIndex = levels.indexOf(requiredLevel);

    // User must have equal or higher clearance than required
    return userLevelIndex >= requiredLevelIndex;
  }

  private getMostRestrictiveLevel(
    level1: "OPEN" | "RESTRICTED" | "CONFIDENTIAL" | "SECRET",
    level2?: "OPEN" | "RESTRICTED" | "CONFIDENTIAL" | "SECRET",
  ): "OPEN" | "RESTRICTED" | "CONFIDENTIAL" | "SECRET" {
    if (!level2) {
      return level1;
    }

    const levels = ["OPEN", "RESTRICTED", "CONFIDENTIAL", "SECRET"];
    const index1 = levels.indexOf(level1);
    const index2 = levels.indexOf(level2);

    // Return the level with lower clearance (higher restriction)
    return levels[Math.min(index1, index2)] as
      | "OPEN"
      | "RESTRICTED"
      | "CONFIDENTIAL"
      | "SECRET";
  }

  setUser(user: UserProfile | null): void {
    this.currentUser = user;
  }

  setSession(session: SessionInfo | null): void {
    this.currentSession = session;
  }

  clear(): void {
    this.currentUser = null;
    this.currentSession = null;
  }

  clone(): DefaultAuthenticationContext {
    return new DefaultAuthenticationContext(
      this.currentUser ?? undefined,
      this.currentSession ?? undefined,
    );
  }

  toJSON(): {
    user: UserProfile | null;
    session: SessionInfo | null;
    isAuthenticated: boolean;
  } {
    return {
      user: this.currentUser,
      session: this.currentSession,
      isAuthenticated: this.isAuthenticated,
    };
  }

  static create(
    user?: UserProfile | undefined,
    session?: SessionInfo | undefined,
  ): DefaultAuthenticationContext {
    return new DefaultAuthenticationContext(user, session);
  }

  static empty(): DefaultAuthenticationContext {
    return new DefaultAuthenticationContext();
  }
}
