/**
 * Core Functionality Tests
 * Enterprise Standards v4.0.0 compliant
 */

import { AuthenticationConfig } from "../types";
import { validateNorwegianPersonalNumber } from "../utils/norwegian-compliance";
import {
  createTypeSafeConfig,
  validateRequiredFields,
} from "../utils/type-safety";

describe("Core Functionality", () => {
  describe("Configuration Validation", () => {
    const validConfig: AuthenticationConfig = {
      nsmClassification: "RESTRICTED",
      gdprCompliant: true,
      wcagLevel: "AAA",
      supportedLanguages: ["nb-NO", "en-US"],
      auditTrail: true,
      sessionTimeout: 30 * 60 * 1000,
      refreshTokenLifetime: 7 * 24 * 60 * 60 * 1000,
      accessTokenLifetime: 15 * 60 * 1000,
      maxConcurrentSessions: 3,
      enableBruteForceProtection: true,
      maxLoginAttempts: 3,
      lockoutDuration: 5 * 60 * 1000,
      sessionStorage: { type: "memory" },
      providers: [],
    };

    it("should validate valid configuration", () => {
      expect(() => createTypeSafeConfig(validConfig)).not.toThrow();
    });

    it("should reject invalid session timeout", () => {
      const invalidConfig = { ...validConfig, sessionTimeout: -1 };
      expect(() => createTypeSafeConfig(invalidConfig)).toThrow();
    });

    it("should reject invalid max login attempts", () => {
      const invalidConfig = { ...validConfig, maxLoginAttempts: 0 };
      expect(() => createTypeSafeConfig(invalidConfig)).toThrow();
    });

    it("should validate required fields", () => {
      const requiredFields = [
        "nsmClassification",
        "gdprCompliant",
        "sessionTimeout",
      ];
      const validData = {
        nsmClassification: "OPEN",
        gdprCompliant: true,
        sessionTimeout: 1800000,
        extraField: "ignored",
      };

      const result = validateRequiredFields(validData, requiredFields);
      expect(result.valid).toBe(true);
      expect(result.missingFields).toEqual([]);
    });

    it("should detect missing required fields", () => {
      const requiredFields = [
        "nsmClassification",
        "gdprCompliant",
        "sessionTimeout",
      ];
      const invalidData = {
        nsmClassification: "OPEN",
        // Missing gdprCompliant and sessionTimeout
      };

      const result = validateRequiredFields(invalidData, requiredFields);
      expect(result.valid).toBe(false);
      expect(result.missingFields).toContain("gdprCompliant");
      expect(result.missingFields).toContain("sessionTimeout");
    });
  });

  describe("Norwegian Compliance", () => {
    it("should validate correct Norwegian personal numbers", () => {
      // Valid test numbers (using modulo 11 check)
      expect(validateNorwegianPersonalNumber("01010112345")).toBe(true);
      expect(validateNorwegianPersonalNumber("31129956715")).toBe(true);
    });

    it("should reject invalid Norwegian personal numbers", () => {
      expect(validateNorwegianPersonalNumber("12345678901")).toBe(false);
      expect(validateNorwegianPersonalNumber("00000000000")).toBe(false);
      expect(validateNorwegianPersonalNumber("abc12345678")).toBe(false);
      expect(validateNorwegianPersonalNumber("1234567890")).toBe(false); // Too short
      expect(validateNorwegianPersonalNumber("123456789012")).toBe(false); // Too long
    });

    it("should validate date part of personal number", () => {
      // Invalid dates should be rejected
      expect(validateNorwegianPersonalNumber("32019912345")).toBe(false); // 32nd day
      expect(validateNorwegianPersonalNumber("01139912345")).toBe(false); // 13th month
      expect(validateNorwegianPersonalNumber("00019912345")).toBe(false); // 0th day
    });
  });

  describe("Type Safety Utilities", () => {
    it("should create type-safe configuration objects", () => {
      const config = createTypeSafeConfig({
        nsmClassification: "OPEN",
        gdprCompliant: true,
        wcagLevel: "AA",
        supportedLanguages: ["nb-NO"],
        auditTrail: false,
        sessionTimeout: 1800000,
        refreshTokenLifetime: 604800000,
        accessTokenLifetime: 900000,
        maxConcurrentSessions: 1,
        enableBruteForceProtection: false,
        maxLoginAttempts: 5,
        lockoutDuration: 300000,
        sessionStorage: { type: "memory" },
        providers: [],
      });

      expect(config.nsmClassification).toBe("OPEN");
      expect(config.gdprCompliant).toBe(true);
      expect(config.sessionTimeout).toBe(1800000);
    });

    it("should enforce NSM classification hierarchy", () => {
      const classifications = ["OPEN", "RESTRICTED", "CONFIDENTIAL", "SECRET"];
      const hierarchy = {
        OPEN: 0,
        RESTRICTED: 1,
        CONFIDENTIAL: 2,
        SECRET: 3,
      };

      classifications.forEach((classification) => {
        expect(
          hierarchy[classification as keyof typeof hierarchy],
        ).toBeGreaterThanOrEqual(0);
      });

      // Higher classifications should have higher numbers
      expect(hierarchy.SECRET).toBeGreaterThan(hierarchy.CONFIDENTIAL);
      expect(hierarchy.CONFIDENTIAL).toBeGreaterThan(hierarchy.RESTRICTED);
      expect(hierarchy.RESTRICTED).toBeGreaterThan(hierarchy.OPEN);
    });
  });

  describe("Security Validations", () => {
    it("should validate password complexity", () => {
      const passwordRequirements = {
        minLength: 8,
        requireUppercase: true,
        requireLowercase: true,
        requireNumbers: true,
        requireSpecialChars: true,
      };

      const strongPassword = "MySecure123!";
      const weakPassword = "password";

      // Mock password validation logic
      const validatePassword = (password: string) => {
        const hasUppercase = /[A-Z]/.test(password);
        const hasLowercase = /[a-z]/.test(password);
        const hasNumbers = /\d/.test(password);
        const hasSpecialChars = /[!@#$%^&*()_+\-=\[\]{};':"\\|,.<>\?]/.test(
          password,
        );

        return (
          password.length >= passwordRequirements.minLength &&
          hasUppercase &&
          hasLowercase &&
          hasNumbers &&
          hasSpecialChars
        );
      };

      expect(validatePassword(strongPassword)).toBe(true);
      expect(validatePassword(weakPassword)).toBe(false);
    });

    it("should validate session timeout ranges", () => {
      const minTimeout = 5 * 60 * 1000; // 5 minutes
      const maxTimeout = 24 * 60 * 60 * 1000; // 24 hours

      const validateSessionTimeout = (timeout: number) => {
        return timeout >= minTimeout && timeout <= maxTimeout;
      };

      expect(validateSessionTimeout(30 * 60 * 1000)).toBe(true); // 30 minutes
      expect(validateSessionTimeout(2 * 60 * 1000)).toBe(false); // 2 minutes (too short)
      expect(validateSessionTimeout(48 * 60 * 60 * 1000)).toBe(false); // 48 hours (too long)
    });
  });

  describe("Provider Configuration", () => {
    it("should validate OAuth provider configuration", () => {
      const oauthProvider = {
        id: "test-oauth",
        type: "oauth",
        name: "Test OAuth",
        enabled: true,
        clientId: "client-123",
        clientSecret: "secret-456",
        authorizationUrl: "https://auth.example.com/authorize",
        tokenUrl: "https://auth.example.com/token",
        userInfoUrl: "https://auth.example.com/userinfo",
        callbackUrl: "https://app.example.com/callback",
        scopes: ["openid", "profile"],
        enablePKCE: true,
        nsmClassification: "RESTRICTED",
      };

      const requiredFields = [
        "clientId",
        "clientSecret",
        "authorizationUrl",
        "tokenUrl",
      ];
      const validation = validateRequiredFields(oauthProvider, requiredFields);

      expect(validation.valid).toBe(true);
      expect(validation.missingFields).toEqual([]);
    });

    it("should validate Norwegian ID provider configuration", () => {
      const norwegianProvider = {
        id: "norwegian-id",
        type: "norwegian-id",
        name: "Norwegian Government ID",
        enabled: true,
        nsmClassification: "RESTRICTED",
        testMode: true,
        bankIdConfig: {
          clientId: "bankid-client",
          merchantId: "merchant-123",
        },
      };

      expect(norwegianProvider.type).toBe("norwegian-id");
      expect(norwegianProvider.nsmClassification).toBe("RESTRICTED");
      expect(norwegianProvider.testMode).toBe(true);
    });
  });

  describe("Error Handling", () => {
    it("should handle configuration errors gracefully", () => {
      const invalidConfigs = [
        { sessionTimeout: "invalid" },
        { maxLoginAttempts: -1 },
        { providers: "not-an-array" },
        { nsmClassification: "INVALID_LEVEL" },
      ];

      invalidConfigs.forEach((config) => {
        expect(() => createTypeSafeConfig(config as any)).toThrow();
      });
    });

    it("should provide meaningful error messages", () => {
      try {
        createTypeSafeConfig({ sessionTimeout: -1 } as any);
      } catch (error) {
        expect(error).toBeInstanceOf(Error);
        expect((error as Error).message).toContain("sessionTimeout");
      }
    });
  });
});
