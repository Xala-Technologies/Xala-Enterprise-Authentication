/**
 * Tests for Token Manager
 * Enterprise Standards v4.0.0 compliant
 */

import { DefaultTokenManager } from "../../auth-core/token-manager";
import type { TokenClaims } from "../../types";

// Mock logger
const mockLogger = {
  debug: jest.fn(),
  info: jest.fn(),
  warn: jest.fn(),
  error: jest.fn(),
  fatal: jest.fn(),
};

describe("DefaultTokenManager", () => {
  let tokenManager: DefaultTokenManager;

  const testClaims: TokenClaims = {
    sub: "user-123",
    iss: "test-issuer",
    aud: "test-audience",
    exp: Math.floor(Date.now() / 1000) + 3600, // 1 hour from now
    iat: Math.floor(Date.now() / 1000),
    nbf: Math.floor(Date.now() / 1000),
    jti: "token-123",
    sessionId: "session-123",
    nsmClassification: "RESTRICTED",
  };

  beforeEach(() => {
    jest.clearAllMocks();
    tokenManager = DefaultTokenManager.create({
      accessTokenSecret: "test-access-secret",
      refreshTokenSecret: "test-refresh-secret",
      accessTokenLifetime: 15 * 60 * 1000, // 15 minutes
      refreshTokenLifetime: 7 * 24 * 60 * 60 * 1000, // 7 days
      issuer: "test-issuer",
      audience: "test-audience",
      logger: mockLogger as any,
    });
  });

  describe("generateAccessToken", () => {
    it("should generate a valid JWT access token", async () => {
      const token = await tokenManager.generateAccessToken(testClaims);

      expect(token).toBeDefined();
      expect(typeof token).toBe("string");

      // JWT format: header.payload.signature
      const parts = token.split(".");
      expect(parts).toHaveLength(3);
    });

    it("should include correct claims in token", async () => {
      const token = await tokenManager.generateAccessToken(testClaims);

      // Decode token
      const decoded = await tokenManager.decodeToken(token);

      expect(decoded).toMatchObject({
        sub: testClaims.sub,
        iss: "test-issuer",
        aud: "test-audience",
        sessionId: testClaims.sessionId,
        type: "access",
      });
    });

    it("should set correct expiration time", async () => {
      const token = await tokenManager.generateAccessToken(testClaims);
      const decoded = await tokenManager.decodeToken(token);

      const expectedExp = Math.floor(Date.now() / 1000) + 15 * 60; // 15 minutes
      expect(decoded?.exp).toBeCloseTo(expectedExp, -1); // Within 10 seconds
    });
  });

  describe("generateRefreshToken", () => {
    it("should generate a valid JWT refresh token", async () => {
      const token = await tokenManager.generateRefreshToken(testClaims);

      expect(token).toBeDefined();
      expect(typeof token).toBe("string");

      const parts = token.split(".");
      expect(parts).toHaveLength(3);
    });

    it("should have longer expiration than access token", async () => {
      const token = await tokenManager.generateRefreshToken(testClaims);
      const decoded = await tokenManager.decodeToken(token);

      const expectedExp = Math.floor(Date.now() / 1000) + 7 * 24 * 60 * 60; // 7 days
      expect(decoded?.exp).toBeCloseTo(expectedExp, -2); // Within 100 seconds
    });

    it("should include refresh token type", async () => {
      const token = await tokenManager.generateRefreshToken(testClaims);
      const decoded = await tokenManager.decodeToken(token);

      expect(decoded?.type).toBe("refresh");
    });
  });

  describe("validateToken", () => {
    it("should validate a valid token", async () => {
      const token = await tokenManager.generateAccessToken(testClaims);

      const result = await tokenManager.validateToken(token);

      expect(result.valid).toBe(true);
      expect(result.claims).toMatchObject({
        sub: testClaims.sub,
        sessionId: testClaims.sessionId,
      });
    });

    it("should reject expired token", async () => {
      const expiredClaims = {
        ...testClaims,
        exp: Math.floor(Date.now() / 1000) - 3600, // 1 hour ago
      };

      // Create expired token manually
      const header = Buffer.from(
        JSON.stringify({ alg: "HS256", typ: "JWT" }),
      ).toString("base64url");
      const payload = Buffer.from(JSON.stringify(expiredClaims)).toString(
        "base64url",
      );
      const signature = "invalid-signature";
      const expiredToken = `${header}.${payload}.${signature}`;

      const result = await tokenManager.validateToken(expiredToken);

      expect(result.valid).toBe(false);
      expect(result.error).toBe("Token has expired");
    });

    it("should reject token with invalid signature", async () => {
      const token = await tokenManager.generateAccessToken(testClaims);

      // Tamper with the token
      const parts = token.split(".");
      parts[2] = "invalid-signature";
      const tamperedToken = parts.join(".");

      const result = await tokenManager.validateToken(tamperedToken);

      expect(result.valid).toBe(false);
      expect(result.error).toBe("Invalid token signature");
    });

    it("should reject malformed token", async () => {
      const result = await tokenManager.validateToken("not-a-jwt");

      expect(result.valid).toBe(false);
      expect(result.error).toBe("Invalid token format");
    });

    it("should check token revocation", async () => {
      const token = await tokenManager.generateAccessToken(testClaims);

      // Revoke the token
      await tokenManager.revokeToken(token);

      const result = await tokenManager.validateToken(token);

      expect(result.valid).toBe(false);
      expect(result.error).toBe("Token has been revoked");
    });
  });

  describe("revokeToken", () => {
    it("should revoke a token", async () => {
      const token = await tokenManager.generateAccessToken(testClaims);

      await tokenManager.revokeToken(token);

      // Token should now be invalid
      const result = await tokenManager.validateToken(token);
      expect(result.valid).toBe(false);
    });

    it("should log token revocation", async () => {
      const token = await tokenManager.generateAccessToken(testClaims);

      await tokenManager.revokeToken(token);

      expect(mockLogger.info).toHaveBeenCalledWith(
        "Token revoked",
        expect.objectContaining({
          tokenId: testClaims.jti,
        }),
      );
    });
  });

  describe("decodeToken", () => {
    it("should decode a valid token without validation", async () => {
      const token = await tokenManager.generateAccessToken(testClaims);

      const decoded = await tokenManager.decodeToken(token);

      expect(decoded).toMatchObject({
        sub: testClaims.sub,
        sessionId: testClaims.sessionId,
      });
    });

    it("should return null for invalid token", async () => {
      const decoded = await tokenManager.decodeToken("invalid-token");

      expect(decoded).toBeNull();
    });
  });

  describe("token security", () => {
    it("should use different secrets for access and refresh tokens", async () => {
      const accessToken = await tokenManager.generateAccessToken(testClaims);
      const refreshToken = await tokenManager.generateRefreshToken(testClaims);

      // Tokens should be different even with same claims
      expect(accessToken).not.toBe(refreshToken);

      // Signatures should be different
      const accessSig = accessToken.split(".")[2];
      const refreshSig = refreshToken.split(".")[2];
      expect(accessSig).not.toBe(refreshSig);
    });

    it("should include jti claim for token uniqueness", async () => {
      const token1 = await tokenManager.generateAccessToken(testClaims);
      const token2 = await tokenManager.generateAccessToken(testClaims);

      const decoded1 = await tokenManager.decodeToken(token1);
      const decoded2 = await tokenManager.decodeToken(token2);

      // JTI should be different for each token
      expect(decoded1?.jti).not.toBe(decoded2?.jti);
    });
  });
});
