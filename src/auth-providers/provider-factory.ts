/**
 * Provider Factory
 * Creates authentication providers based on configuration
 * Enterprise Standards v4.0.0 compliant
 */

import type { 
  AuthenticationProvider, 
  NorwegianIDProviderConfig,
  OAuthProviderConfig 
} from './types.js';
import { NorwegianIDProvider } from './norwegian-id-provider.js';
import { OAuthProvider } from './oauth-provider.js';
import { EIDASProvider } from './eidas-provider.js';
import type { ProviderConfig } from '../types/index.js';

export class ProviderFactory {
  static createProvider(config: ProviderConfig): AuthenticationProvider {
    switch (config.type) {
      case 'norwegian-id':
        return this.createNorwegianIDProvider(config);
      
      case 'oauth':
        return this.createOAuthProvider(config);
      
      case 'eidas':
        return this.createEIDASProvider(config);
      
      case 'saml':
        throw new Error('SAML provider not yet implemented');
      
      case 'oidc':
        throw new Error('OIDC provider not yet implemented');
      
      default:
        throw new Error(`Unknown provider type: ${(config as ProviderConfig).type}`);
    }
  }

  private static createNorwegianIDProvider(config: ProviderConfig): NorwegianIDProvider {
    const settings = config.settings ?? {};
    
    // Prepare optional configurations
    let bankIdConfig: NorwegianIDProviderConfig['bankIdConfig'] = undefined;
    let buypassConfig: NorwegianIDProviderConfig['buypassConfig'] = undefined;
    let commfidesConfig: NorwegianIDProviderConfig['commfidesConfig'] = undefined;

    if (settings.bankId && typeof settings.bankId === 'object' && settings.bankId !== null) {
      const bankIdSettings = settings.bankId as Record<string, unknown>;
      bankIdConfig = {
        clientId: bankIdSettings.clientId as string,
        clientSecret: bankIdSettings.clientSecret as string,
        discoveryUrl: bankIdSettings.discoveryUrl as string,
        merchantName: bankIdSettings.merchantName as string,
      };
    }

    if (settings.buypass && typeof settings.buypass === 'object' && settings.buypass !== null) {
      const buypassSettings = settings.buypass as Record<string, unknown>;
      buypassConfig = {
        clientId: buypassSettings.clientId as string,
        clientSecret: buypassSettings.clientSecret as string,
        discoveryUrl: buypassSettings.discoveryUrl as string,
      };
    }

    if (settings.commfides && typeof settings.commfides === 'object' && settings.commfides !== null) {
      const commfidesSettings = settings.commfides as Record<string, unknown>;
      commfidesConfig = {
        clientId: commfidesSettings.clientId as string,
        clientSecret: commfidesSettings.clientSecret as string,
        discoveryUrl: commfidesSettings.discoveryUrl as string,
      };
    }
    
    // Build configuration object with all properties
    const norwegianConfig: NorwegianIDProviderConfig = {
      id: config.id,
      name: config.name,
      enabled: config.enabled,
      nsmClassification: config.nsmClassification ?? 'RESTRICTED',
      testMode: (settings.testMode as boolean) ?? false,
      bankIdConfig,
      buypassConfig,
      commfidesConfig,
    };

    return NorwegianIDProvider.create(norwegianConfig);
  }

  private static createOAuthProvider(config: ProviderConfig): OAuthProvider {
    if (!config.settings) {
      throw new Error('OAuth provider requires settings');
    }

    const settings = config.settings;
    const oauthConfig: OAuthProviderConfig = {
      id: config.id,
      name: config.name,
      enabled: config.enabled,
      nsmClassification: config.nsmClassification ?? 'OPEN',
      clientId: settings.clientId as string,
      clientSecret: settings.clientSecret as string,
      authorizationUrl: settings.authorizationUrl as string,
      tokenUrl: settings.tokenUrl as string,
      userInfoUrl: settings.userInfoUrl as string,
      scopes: (settings.scopes as string[]) ?? ['openid', 'profile', 'email'],
      redirectUri: settings.redirectUri as string,
      ...(settings.pkce !== undefined && { pkce: settings.pkce as boolean }),
      ...(settings.wellKnownUrl !== undefined && { wellKnownUrl: settings.wellKnownUrl as string }),
    };

    return OAuthProvider.create(oauthConfig);
  }

  private static createEIDASProvider(config: ProviderConfig): EIDASProvider {
    const settings = config.settings ?? {};
    const { Logger } = require('../mock-foundation.js');
    
    const eidasConfig = {
      id: config.id,
      name: config.name,
      type: config.type,
      enabled: config.enabled,
      nsmClassification: config.nsmClassification ?? 'RESTRICTED',
      eidasNodeUrl: (settings.eidasNodeUrl as string) ?? 'https://eidas-node.example.eu',
      serviceProviderId: (settings.serviceProviderId as string) ?? 'NO-SP-123',
      serviceProviderMetadataUrl: (settings.serviceProviderMetadataUrl as string) ?? '',
      countryCodes: (settings.countryCodes as string[]) ?? ['DE', 'FR', 'IT', 'ES', 'AT'],
      levelOfAssurance: (settings.levelOfAssurance as 'low' | 'substantial' | 'high') ?? 'substantial',
      requestedAttributes: (settings.requestedAttributes as any[]) ?? [
        {
          name: 'http://eidas.europa.eu/attributes/naturalperson/PersonIdentifier',
          required: true,
          friendlyName: 'PersonIdentifier',
          nameFormat: 'urn:oasis:names:tc:SAML:2.0:attrname-format:uri'
        },
        {
          name: 'http://eidas.europa.eu/attributes/naturalperson/CurrentFamilyName',
          required: false,
          friendlyName: 'FamilyName',
          nameFormat: 'urn:oasis:names:tc:SAML:2.0:attrname-format:uri'
        }
      ],
      signatureCertificate: (settings.signatureCertificate as string) ?? '',
      encryptionCertificate: (settings.encryptionCertificate as string) ?? '',
      callbackUrl: (settings.callbackUrl as string) ?? '/auth/eidas/callback'
    };

    const logger = Logger.create({
      serviceName: 'eidas-provider',
      nsmClassification: config.nsmClassification ?? 'RESTRICTED'
    });

    return EIDASProvider.create(eidasConfig, logger);
  }

  static createProviders(configs: readonly ProviderConfig[]): AuthenticationProvider[] {
    return configs.map(config => this.createProvider(config));
  }
}