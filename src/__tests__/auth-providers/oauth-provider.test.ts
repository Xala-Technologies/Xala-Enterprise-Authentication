/**
 * Tests for OAuth Provider
 * Enterprise Standards v4.0.0 compliant
 */

import { OAuthProvider } from "../../auth-providers/oauth-provider";
import type { OAuthProviderConfig, OAuthTokens } from "../../types";

// Mock logger
const mockLogger = {
  debug: jest.fn(),
  info: jest.fn(),
  warn: jest.fn(),
  error: jest.fn(),
  fatal: jest.fn(),
};

// Mock HTTP client
const mockHttpClient = {
  post: jest.fn(),
  get: jest.fn(),
};

describe("OAuthProvider", () => {
  let provider: OAuthProvider;

  const testConfig: OAuthProviderConfig = {
    id: "test-oauth",
    name: "Test OAuth Provider",
    enabled: true,
    clientId: "test-client-id",
    clientSecret: "test-client-secret",
    authorizationUrl: "https://auth.example.com/authorize",
    tokenUrl: "https://auth.example.com/token",
    userInfoUrl: "https://auth.example.com/userinfo",
    callbackUrl: "https://app.example.com/callback",
    scopes: ["openid", "profile", "email"],
    enablePKCE: true,
    nsmClassification: "RESTRICTED",
  };

  beforeEach(() => {
    jest.clearAllMocks();
    provider = new OAuthProvider(
      testConfig,
      mockLogger as any,
      mockHttpClient as any,
    );
  });

  describe("getAuthorizationUrl", () => {
    it("should generate authorization URL with PKCE", async () => {
      const state = "test-state";
      const result = await provider.getAuthorizationUrl(state);

      expect(result.url).toBeDefined();
      expect(result.state).toBe(state);
      expect(result.codeVerifier).toBeDefined();
      expect(result.codeChallenge).toBeDefined();

      const url = new URL(result.url);
      expect(url.origin + url.pathname).toBe(testConfig.authorizationUrl);
      expect(url.searchParams.get("client_id")).toBe(testConfig.clientId);
      expect(url.searchParams.get("response_type")).toBe("code");
      expect(url.searchParams.get("state")).toBe(state);
      expect(url.searchParams.get("code_challenge")).toBe(result.codeChallenge);
      expect(url.searchParams.get("code_challenge_method")).toBe("S256");
      expect(url.searchParams.get("scope")).toBe("openid profile email");
    });

    it("should generate authorization URL without PKCE when disabled", async () => {
      const noPKCEProvider = new OAuthProvider(
        { ...testConfig, enablePKCE: false },
        mockLogger as any,
        mockHttpClient as any,
      );

      const state = "test-state";
      const result = await noPKCEProvider.getAuthorizationUrl(state);

      const url = new URL(result.url);
      expect(url.searchParams.get("code_challenge")).toBeNull();
      expect(url.searchParams.get("code_challenge_method")).toBeNull();
      expect(result.codeVerifier).toBeUndefined();
      expect(result.codeChallenge).toBeUndefined();
    });
  });

  describe("handleCallback", () => {
    it("should exchange code for tokens with PKCE", async () => {
      const mockTokens: OAuthTokens = {
        accessToken: "mock-access-token",
        tokenType: "Bearer",
        expiresIn: 3600,
        refreshToken: "mock-refresh-token",
        scope: "openid profile email",
      };

      mockHttpClient.post.mockResolvedValueOnce(mockTokens);

      const result = await provider.handleCallback(
        "test-code",
        "test-state",
        "test-verifier",
      );

      expect(mockHttpClient.post).toHaveBeenCalledWith(
        testConfig.tokenUrl,
        expect.objectContaining({
          grant_type: "authorization_code",
          code: "test-code",
          client_id: testConfig.clientId,
          client_secret: testConfig.clientSecret,
          redirect_uri: testConfig.callbackUrl,
          code_verifier: "test-verifier",
        }),
        expect.objectContaining({
          headers: {
            "Content-Type": "application/x-www-form-urlencoded",
          },
        }),
      );

      expect(result).toEqual(mockTokens);
    });

    it("should handle token exchange errors", async () => {
      mockHttpClient.post.mockRejectedValueOnce(
        new Error("Token exchange failed"),
      );

      await expect(
        provider.handleCallback("test-code", "test-state", "test-verifier"),
      ).rejects.toThrow("Token exchange failed");

      expect(mockLogger.error).toHaveBeenCalledWith(
        "OAuth token exchange failed",
        expect.objectContaining({
          provider: testConfig.id,
          error: expect.any(Error),
        }),
      );
    });
  });

  describe("refreshAccessToken", () => {
    it("should refresh access token", async () => {
      const mockTokens: OAuthTokens = {
        accessToken: "new-access-token",
        tokenType: "Bearer",
        expiresIn: 3600,
        refreshToken: "new-refresh-token",
        scope: "openid profile email",
      };

      mockHttpClient.post.mockResolvedValueOnce(mockTokens);

      const result = await provider.refreshAccessToken("old-refresh-token");

      expect(mockHttpClient.post).toHaveBeenCalledWith(
        testConfig.tokenUrl,
        expect.objectContaining({
          grant_type: "refresh_token",
          refresh_token: "old-refresh-token",
          client_id: testConfig.clientId,
          client_secret: testConfig.clientSecret,
        }),
        expect.any(Object),
      );

      expect(result).toEqual(mockTokens);
    });
  });

  describe("getUserProfile", () => {
    it("should fetch user profile", async () => {
      const mockProfile = {
        sub: "user-123",
        email: "user@example.com",
        name: "Test User",
        given_name: "Test",
        family_name: "User",
      };

      mockHttpClient.get.mockResolvedValueOnce(mockProfile);

      const result = await provider.getUserProfile("mock-access-token");

      expect(mockHttpClient.get).toHaveBeenCalledWith(
        testConfig.userInfoUrl,
        expect.objectContaining({
          headers: {
            Authorization: "Bearer mock-access-token",
          },
        }),
      );

      expect(result).toEqual(mockProfile);
    });

    it("should handle profile fetch errors", async () => {
      mockHttpClient.get.mockRejectedValueOnce(new Error("Unauthorized"));

      await expect(provider.getUserProfile("invalid-token")).rejects.toThrow(
        "Unauthorized",
      );

      expect(mockLogger.error).toHaveBeenCalledWith(
        "Failed to fetch user profile",
        expect.objectContaining({
          provider: testConfig.id,
          error: expect.any(Error),
        }),
      );
    });
  });

  describe("revokeToken", () => {
    it("should revoke token if revocation endpoint is configured", async () => {
      const revokeProvider = new OAuthProvider(
        { ...testConfig, revocationUrl: "https://auth.example.com/revoke" },
        mockLogger as any,
        mockHttpClient as any,
      );

      mockHttpClient.post.mockResolvedValueOnce({});

      await revokeProvider.revokeToken("test-token");

      expect(mockHttpClient.post).toHaveBeenCalledWith(
        "https://auth.example.com/revoke",
        expect.objectContaining({
          token: "test-token",
          client_id: testConfig.clientId,
          client_secret: testConfig.clientSecret,
        }),
        expect.any(Object),
      );
    });

    it("should skip revocation if no endpoint configured", async () => {
      await provider.revokeToken("test-token");

      expect(mockHttpClient.post).not.toHaveBeenCalled();
      expect(mockLogger.debug).toHaveBeenCalledWith(
        "No revocation endpoint configured",
        expect.objectContaining({
          provider: testConfig.id,
        }),
      );
    });
  });

  describe("isEnabled", () => {
    it("should return provider enabled status", () => {
      expect(provider.isEnabled()).toBe(true);

      const disabledProvider = new OAuthProvider(
        { ...testConfig, enabled: false },
        mockLogger as any,
        mockHttpClient as any,
      );

      expect(disabledProvider.isEnabled()).toBe(false);
    });
  });

  describe("getMetadata", () => {
    it("should return provider metadata", () => {
      const metadata = provider.getMetadata();

      expect(metadata).toEqual({
        id: testConfig.id,
        name: testConfig.name,
        type: "oauth",
        enabled: true,
        scopes: testConfig.scopes,
        pkceEnabled: testConfig.enablePKCE,
      });
    });
  });
});
