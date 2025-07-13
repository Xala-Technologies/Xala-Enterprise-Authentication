/**
 * Tests for Norwegian ID Provider
 * Enterprise Standards v4.0.0 compliant
 */

import { NorwegianIDProvider } from '../../auth-providers/norwegian-id-provider';
import type { NorwegianIDProviderConfig, NorwegianIDSessionInfo } from '../../types';

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

describe('NorwegianIDProvider', () => {
  let provider: NorwegianIDProvider;
  
  const testConfig: NorwegianIDProviderConfig = {
    id: 'norwegian-id',
    name: 'Norwegian Government ID',
    enabled: true,
    nsmClassification: 'RESTRICTED',
    testMode: true,
    bankIdConfig: {
      clientId: 'bankid-client',
      clientSecret: 'bankid-secret',
      merchantId: 'merchant-123',
      certificatePath: '/path/to/cert.p12',
      certificatePassword: 'cert-pass',
      apiUrl: 'https://test.bankid.no',
    },
    buypassConfig: {
      clientId: 'buypass-client',
      clientSecret: 'buypass-secret',
      apiUrl: 'https://test.buypass.no',
    },
    commfidesConfig: {
      clientId: 'commfides-client',
      clientSecret: 'commfides-secret',
      apiUrl: 'https://test.commfides.no',
    },
  };

  beforeEach(() => {
    jest.clearAllMocks();
    provider = new NorwegianIDProvider(testConfig, mockLogger as any, mockHttpClient as any);
  });

  describe('initiateBankID', () => {
    it('should initiate BankID authentication', async () => {
      const mockResponse = {
        orderRef: 'order-123',
        autoStartToken: 'token-123',
        qr: 'qr-data',
      };

      mockHttpClient.post.mockResolvedValueOnce(mockResponse);

      const result = await provider.initiateBankID('123456789012');

      expect(mockHttpClient.post).toHaveBeenCalledWith(
        'https://test.bankid.no/auth',
        expect.objectContaining({
          personalNumber: '123456789012',
          endUserIp: expect.any(String),
          requirement: {
            cardReader: 'class1',
            certificatePolicies: ['1.2.752.78.1.5'],
          },
        }),
        expect.objectContaining({
          headers: expect.objectContaining({
            'Content-Type': 'application/json',
          }),
          cert: expect.any(Object),
        })
      );

      expect(result).toEqual({
        provider: 'bankid',
        sessionId: mockResponse.orderRef,
        autoStartToken: mockResponse.autoStartToken,
        qrCode: mockResponse.qr,
      });
    });

    it('should handle BankID errors', async () => {
      mockHttpClient.post.mockRejectedValueOnce(new Error('BankID error'));

      await expect(
        provider.initiateBankID('123456789012')
      ).rejects.toThrow('BankID error');

      expect(mockLogger.error).toHaveBeenCalledWith(
        'BankID authentication initiation failed',
        expect.objectContaining({
          error: expect.any(Error),
        })
      );
    });
  });

  describe('initiateBuypass', () => {
    it('should initiate Buypass authentication', async () => {
      const mockResponse = {
        transactionId: 'tx-123',
        redirectUrl: 'https://test.buypass.no/auth/tx-123',
      };

      mockHttpClient.post.mockResolvedValueOnce(mockResponse);

      const result = await provider.initiateBuypass('user@example.com');

      expect(mockHttpClient.post).toHaveBeenCalledWith(
        'https://test.buypass.no/auth/init',
        expect.objectContaining({
          identifier: 'user@example.com',
          returnUrl: expect.any(String),
        }),
        expect.any(Object)
      );

      expect(result).toEqual({
        provider: 'buypass',
        sessionId: mockResponse.transactionId,
        redirectUrl: mockResponse.redirectUrl,
      });
    });
  });

  describe('initiateCommfides', () => {
    it('should initiate Commfides authentication', async () => {
      const mockResponse = {
        sessionId: 'session-123',
        challengeCode: 'challenge-123',
      };

      mockHttpClient.post.mockResolvedValueOnce(mockResponse);

      const result = await provider.initiateCommfides('+4712345678');

      expect(mockHttpClient.post).toHaveBeenCalledWith(
        'https://test.commfides.no/auth/start',
        expect.objectContaining({
          phoneNumber: '+4712345678',
          language: 'nb',
        }),
        expect.any(Object)
      );

      expect(result).toEqual({
        provider: 'commfides',
        sessionId: mockResponse.sessionId,
        challengeCode: mockResponse.challengeCode,
      });
    });
  });

  describe('checkStatus', () => {
    it('should check BankID authentication status', async () => {
      const mockResponse = {
        orderRef: 'order-123',
        status: 'complete',
        completionData: {
          user: {
            personalNumber: '123456789012',
            name: 'Test User',
            givenName: 'Test',
            surname: 'User',
          },
          signature: 'signature-data',
          ocspResponse: 'ocsp-data',
        },
      };

      mockHttpClient.post.mockResolvedValueOnce(mockResponse);

      const result = await provider.checkStatus('bankid', 'order-123');

      expect(mockHttpClient.post).toHaveBeenCalledWith(
        'https://test.bankid.no/collect',
        expect.objectContaining({
          orderRef: 'order-123',
        }),
        expect.any(Object)
      );

      expect(result).toEqual({
        provider: 'bankid',
        status: 'completed',
        userInfo: {
          personalNumber: '123456789012',
          name: 'Test User',
          givenName: 'Test',
          surname: 'User',
        },
      });
    });

    it('should handle pending status', async () => {
      mockHttpClient.post.mockResolvedValueOnce({
        orderRef: 'order-123',
        status: 'pending',
        hintCode: 'userSign',
      });

      const result = await provider.checkStatus('bankid', 'order-123');

      expect(result).toEqual({
        provider: 'bankid',
        status: 'pending',
        message: 'User needs to sign',
      });
    });

    it('should handle failed status', async () => {
      mockHttpClient.post.mockResolvedValueOnce({
        orderRef: 'order-123',
        status: 'failed',
        hintCode: 'userCancel',
      });

      const result = await provider.checkStatus('bankid', 'order-123');

      expect(result).toEqual({
        provider: 'bankid',
        status: 'failed',
        error: 'User cancelled',
      });
    });
  });

  describe('cancelAuthentication', () => {
    it('should cancel BankID authentication', async () => {
      mockHttpClient.post.mockResolvedValueOnce({});

      await provider.cancelAuthentication('bankid', 'order-123');

      expect(mockHttpClient.post).toHaveBeenCalledWith(
        'https://test.bankid.no/cancel',
        expect.objectContaining({
          orderRef: 'order-123',
        }),
        expect.any(Object)
      );
    });

    it('should handle cancellation errors gracefully', async () => {
      mockHttpClient.post.mockRejectedValueOnce(new Error('Cancel failed'));

      // Should not throw
      await provider.cancelAuthentication('bankid', 'order-123');

      expect(mockLogger.error).toHaveBeenCalledWith(
        'Failed to cancel authentication',
        expect.objectContaining({
          provider: 'bankid',
          sessionId: 'order-123',
          error: expect.any(Error),
        })
      );
    });
  });

  describe('validateNorwegianPersonalNumber', () => {
    it('should validate correct personal numbers', () => {
      // Test with valid test numbers
      expect(provider.validateNorwegianPersonalNumber('01010112345')).toBe(true);
      expect(provider.validateNorwegianPersonalNumber('31129956715')).toBe(true);
    });

    it('should reject invalid personal numbers', () => {
      expect(provider.validateNorwegianPersonalNumber('12345678901')).toBe(false);
      expect(provider.validateNorwegianPersonalNumber('00000000000')).toBe(false);
      expect(provider.validateNorwegianPersonalNumber('abc12345678')).toBe(false);
      expect(provider.validateNorwegianPersonalNumber('1234567890')).toBe(false); // Too short
    });
  });

  describe('isEnabled', () => {
    it('should return provider enabled status', () => {
      expect(provider.isEnabled()).toBe(true);

      const disabledProvider = new NorwegianIDProvider(
        { ...testConfig, enabled: false },
        mockLogger as any,
        mockHttpClient as any
      );
      
      expect(disabledProvider.isEnabled()).toBe(false);
    });
  });

  describe('getMetadata', () => {
    it('should return provider metadata', () => {
      const metadata = provider.getMetadata();

      expect(metadata).toEqual({
        id: testConfig.id,
        name: testConfig.name,
        type: 'norwegian-id',
        enabled: true,
        supportedMethods: ['bankid', 'buypass', 'commfides'],
        testMode: true,
      });
    });
  });

  describe('test mode', () => {
    it('should use test endpoints in test mode', async () => {
      await provider.initiateBankID('123456789012');

      expect(mockHttpClient.post).toHaveBeenCalledWith(
        expect.stringContaining('test.bankid.no'),
        expect.any(Object),
        expect.any(Object)
      );
    });

    it('should use production endpoints when test mode is false', async () => {
      const prodProvider = new NorwegianIDProvider(
        { 
          ...testConfig, 
          testMode: false,
          bankIdConfig: {
            ...testConfig.bankIdConfig!,
            apiUrl: 'https://appapi2.bankid.com',
          },
        },
        mockLogger as any,
        mockHttpClient as any
      );

      await prodProvider.initiateBankID('123456789012');

      expect(mockHttpClient.post).toHaveBeenCalledWith(
        expect.stringContaining('appapi2.bankid.com'),
        expect.any(Object),
        expect.any(Object)
      );
    });
  });
});