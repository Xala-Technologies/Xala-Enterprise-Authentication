/**
 * Tests for @xala-technologies/authentication
 */

import { Authentication } from "../lib/core";

describe("@xala-technologies/authentication", () => {
  test("should create service instance", () => {
    const service = Authentication.create({
      nsmClassification: "OPEN",
      gdprCompliant: true,
      wcagLevel: "AA",
      supportedLanguages: ["nb-NO", "en-US", "fr-FR", "ar-SA"],
      auditTrail: true,
      sessionTimeout: 30 * 60 * 1000, // 30 minutes
      refreshTokenLifetime: 7 * 24 * 60 * 60 * 1000, // 7 days
      accessTokenLifetime: 15 * 60 * 1000, // 15 minutes
      maxConcurrentSessions: 5,
      enableBruteForceProtection: true,
      maxLoginAttempts: 5,
      lockoutDuration: 15 * 60 * 1000, // 15 minutes
      sessionStorage: {
        type: "memory",
      },
      providers: [],
    });

    expect(service).toBeDefined();
    expect(service).toBeInstanceOf(Authentication);
  });

  test("should initialize authentication service", async () => {
    const service = Authentication.create({
      nsmClassification: "OPEN",
      gdprCompliant: true,
      wcagLevel: "AA",
      supportedLanguages: ["nb-NO", "en-US", "fr-FR", "ar-SA"],
      auditTrail: true,
      sessionTimeout: 30 * 60 * 1000,
      refreshTokenLifetime: 7 * 24 * 60 * 60 * 1000,
      accessTokenLifetime: 15 * 60 * 1000,
      maxConcurrentSessions: 5,
      enableBruteForceProtection: true,
      maxLoginAttempts: 5,
      lockoutDuration: 15 * 60 * 1000,
      sessionStorage: {
        type: "memory",
      },
      providers: [],
    });

    await expect(service.initialize()).resolves.toBeUndefined();

    const status = await service.getStatus();
    expect(status.healthy).toBe(true);
    expect(status.version).toBe("1.0.0");
    expect(status.activeProviders).toEqual([]);
    expect(status.activeSessions).toBe(0);
    expect(status.totalLogins).toBe(0);
  });
});
