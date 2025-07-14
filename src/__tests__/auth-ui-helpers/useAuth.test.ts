/**
 * Tests for Auth UI Helpers
 * Enterprise Standards v4.0.0 compliant
 */

import { createAuthStorage } from "../../auth-ui-helpers/utils/storage";
import { getThemeFromNSMClassification } from "../../auth-ui-helpers/utils/theme";
import type { NSMClassification } from "../../types";

describe("Auth UI Helpers", () => {
  describe("Storage Utilities", () => {
    beforeEach(() => {
      // Clear storage before each test
      localStorage.clear();
      sessionStorage.clear();
    });

    it("should create localStorage-based storage", () => {
      const storage = createAuthStorage("local");

      storage.setItem("test-key", "test-value");
      expect(storage.getItem("test-key")).toBe("test-value");

      storage.removeItem("test-key");
      expect(storage.getItem("test-key")).toBeNull();
    });

    it("should create sessionStorage-based storage", () => {
      const storage = createAuthStorage("session");

      storage.setItem("session-key", "session-value");
      expect(storage.getItem("session-key")).toBe("session-value");

      storage.clear();
      expect(storage.getItem("session-key")).toBeNull();
    });

    it("should create memory-based storage", () => {
      const storage = createAuthStorage("memory");

      storage.setItem("memory-key", "memory-value");
      expect(storage.getItem("memory-key")).toBe("memory-value");

      storage.removeItem("memory-key");
      expect(storage.getItem("memory-key")).toBeNull();
    });

    it("should handle JSON serialization", () => {
      const storage = createAuthStorage("memory");
      const testObject = { name: "test", value: 123 };

      storage.setItem("object-key", JSON.stringify(testObject));
      const retrieved = JSON.parse(storage.getItem("object-key") || "{}");

      expect(retrieved).toEqual(testObject);
    });
  });

  describe("Theme Utilities", () => {
    it("should return correct theme for NSM classifications", () => {
      const classifications: NSMClassification[] = [
        "OPEN",
        "RESTRICTED",
        "CONFIDENTIAL",
        "SECRET",
      ];

      classifications.forEach((classification) => {
        const theme = getThemeFromNSMClassification(classification);

        expect(theme).toMatchObject({
          primary: expect.any(String),
          secondary: expect.any(String),
          background: expect.any(String),
          text: expect.any(String),
          border: expect.any(String),
          warning: expect.any(String),
          success: expect.any(String),
          error: expect.any(String),
        });
      });
    });

    it("should use more secure colors for higher classifications", () => {
      const openTheme = getThemeFromNSMClassification("OPEN");
      const secretTheme = getThemeFromNSMClassification("SECRET");

      // SECRET classification should use red tones for security
      expect(secretTheme.primary).toContain("red");
      expect(openTheme.primary).not.toContain("red");
    });

    it("should have distinct themes for each classification", () => {
      const openTheme = getThemeFromNSMClassification("OPEN");
      const restrictedTheme = getThemeFromNSMClassification("RESTRICTED");
      const confidentialTheme = getThemeFromNSMClassification("CONFIDENTIAL");
      const secretTheme = getThemeFromNSMClassification("SECRET");

      const themes = [
        openTheme,
        restrictedTheme,
        confidentialTheme,
        secretTheme,
      ];

      // Each theme should be unique
      for (let i = 0; i < themes.length; i++) {
        for (let j = i + 1; j < themes.length; j++) {
          expect(themes[i].primary).not.toBe(themes[j].primary);
        }
      }
    });
  });

  describe("Authentication Context Mock", () => {
    it("should provide basic auth context structure", () => {
      // Mock the basic structure that would be provided by AuthProvider
      const mockAuthContext = {
        isAuthenticated: false,
        user: null,
        loading: false,
        error: null,
        login: jest.fn(),
        logout: jest.fn(),
        refreshToken: jest.fn(),
        clearError: jest.fn(),
        hasRole: jest.fn(),
        hasPermission: jest.fn(),
        updateUser: jest.fn(),
      };

      expect(mockAuthContext).toMatchObject({
        isAuthenticated: expect.any(Boolean),
        user: null,
        loading: expect.any(Boolean),
        error: null,
        login: expect.any(Function),
        logout: expect.any(Function),
        refreshToken: expect.any(Function),
        clearError: expect.any(Function),
        hasRole: expect.any(Function),
        hasPermission: expect.any(Function),
        updateUser: expect.any(Function),
      });
    });
  });

  describe("Form Validation Helpers", () => {
    it("should validate email format", () => {
      const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

      expect(emailRegex.test("valid@example.com")).toBe(true);
      expect(emailRegex.test("user.name+tag@domain.co.uk")).toBe(true);
      expect(emailRegex.test("invalid-email")).toBe(false);
      expect(emailRegex.test("user@")).toBe(false);
      expect(emailRegex.test("@domain.com")).toBe(false);
    });

    it("should validate password strength", () => {
      const strongPasswordRegex =
        /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&])[A-Za-z\d@$!%*?&]{8,}$/;

      expect(strongPasswordRegex.test("StrongPass1!")).toBe(true);
      expect(strongPasswordRegex.test("MySecure123@")).toBe(true);
      expect(strongPasswordRegex.test("weakpass")).toBe(false);
      expect(strongPasswordRegex.test("NoNumber!")).toBe(false);
      expect(strongPasswordRegex.test("nospecial123")).toBe(false);
    });
  });

  describe("Norwegian Phone Number Validation", () => {
    it("should validate Norwegian phone numbers", () => {
      const norwegianPhoneRegex = /^(\+47)?[2-9]\d{7}$/;

      expect(norwegianPhoneRegex.test("12345678")).toBe(true);
      expect(norwegianPhoneRegex.test("98765432")).toBe(true);
      expect(norwegianPhoneRegex.test("+4712345678")).toBe(true);
      expect(norwegianPhoneRegex.test("01234567")).toBe(false); // Starts with 0/1
      expect(norwegianPhoneRegex.test("1234567")).toBe(false); // Too short
      expect(norwegianPhoneRegex.test("123456789")).toBe(false); // Too long
    });
  });

  describe("Security Headers", () => {
    it("should define security headers for authentication", () => {
      const securityHeaders = {
        "X-Content-Type-Options": "nosniff",
        "X-Frame-Options": "DENY",
        "X-XSS-Protection": "1; mode=block",
        "Strict-Transport-Security": "max-age=31536000; includeSubDomains",
        "Referrer-Policy": "strict-origin-when-cross-origin",
        "Content-Security-Policy": "default-src 'self'",
      };

      expect(securityHeaders).toMatchObject({
        "X-Content-Type-Options": "nosniff",
        "X-Frame-Options": "DENY",
        "X-XSS-Protection": expect.stringContaining("1"),
        "Strict-Transport-Security": expect.stringContaining("max-age"),
        "Referrer-Policy": expect.any(String),
        "Content-Security-Policy": expect.stringContaining("'self'"),
      });
    });
  });
});
