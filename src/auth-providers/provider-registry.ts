/**
 * Provider Registry Implementation
 * Manages authentication providers
 * Enterprise Standards v4.0.0 compliant
 */

import type { AuthenticationProvider, ProviderRegistry } from './types.js';

export class DefaultProviderRegistry implements ProviderRegistry {
  private readonly providers = new Map<string, AuthenticationProvider>();

  register(provider: AuthenticationProvider): void {
    if (this.providers.has(provider.id)) {
      throw new Error(`Provider with id ${provider.id} already registered`);
    }

    this.providers.set(provider.id, provider);
  }

  unregister(providerId: string): void {
    this.providers.delete(providerId);
  }

  getProvider(providerId: string): AuthenticationProvider | null {
    return this.providers.get(providerId) ?? null;
  }

  getAllProviders(): readonly AuthenticationProvider[] {
    return Array.from(this.providers.values());
  }

  getEnabledProviders(): readonly AuthenticationProvider[] {
    return Array.from(this.providers.values()).filter((p) => p.enabled);
  }

  getProvidersByType(
    type: AuthenticationProvider['type'],
  ): readonly AuthenticationProvider[] {
    return Array.from(this.providers.values()).filter((p) => p.type === type);
  }

  static create(): DefaultProviderRegistry {
    return new DefaultProviderRegistry();
  }
}
