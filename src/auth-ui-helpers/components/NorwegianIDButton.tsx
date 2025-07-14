/**
 * NorwegianIDButton Component
 * Official Norwegian ID provider buttons
 * Enterprise Standards v4.0.0 compliant
 */

import React from 'react';

import { useNorwegianCompliance } from '../hooks/useNorwegianCompliance.js';
import type { NorwegianIDButtonProps } from '../types.js';

export function NorwegianIDButton({
  provider,
  onAuthenticate,
  disabled = false,
  className = '',
  size = 'medium',
}: NorwegianIDButtonProps) {
  const { locale } = useNorwegianCompliance();

  const handleClick = () => {
    onAuthenticate(provider);
  };

  const getProviderInfo = () => {
    const providers = {
      bankid: {
        name: 'BankID',
        logo: '/images/bankid-logo.svg',
        colors: {
          primary: '#007272',
          hover: '#005555',
        },
      },
      buypass: {
        name: 'Buypass',
        logo: '/images/buypass-logo.svg',
        colors: {
          primary: '#0066CC',
          hover: '#0052A3',
        },
      },
      commfides: {
        name: 'Commfides',
        logo: '/images/commfides-logo.svg',
        colors: {
          primary: '#E30613',
          hover: '#B5050F',
        },
      },
    };

    return providers[provider];
  };

  const getButtonText = () => {
    const texts = {
      'nb-NO': `Logg inn med ${getProviderInfo().name}`,
      'nn-NO': `Logg inn med ${getProviderInfo().name}`,
      'en-US': `Sign in with ${getProviderInfo().name}`,
    };

    return texts[locale] || texts['en-US'];
  };

  const providerInfo = getProviderInfo();
  const sizeClasses = {
    small: 'norwegian-id-button-small',
    medium: 'norwegian-id-button-medium',
    large: 'norwegian-id-button-large',
  };

  return (
    <button
      type="button"
      onClick={handleClick}
      disabled={disabled}
      className={`norwegian-id-button ${sizeClasses[size]} ${className}`}
      style={
        {
          '--primary-color': providerInfo.colors.primary,
          '--hover-color': providerInfo.colors.hover,
        } as React.CSSProperties
      }
      aria-label={getButtonText()}
    >
      <img
        src={providerInfo.logo}
        alt={`${providerInfo.name} logo`}
        className="provider-logo"
      />
      <span className="button-text">{getButtonText()}</span>
    </button>
  );
}

/**
 * Norwegian ID selector with all providers
 */
export function NorwegianIDSelector({
  onAuthenticate,
  disabled = false,
  className = '',
}: {
  onAuthenticate: (provider: string) => Promise<void>;
  disabled?: boolean;
  className?: string;
}) {
  const { locale } = useNorwegianCompliance();

  const getTitle = () => {
    const titles = {
      'nb-NO': 'Velg elektronisk ID',
      'nn-NO': 'Vel elektronisk ID',
      'en-US': 'Choose electronic ID',
    };

    return titles[locale] || titles['en-US'];
  };

  return (
    <div className={`norwegian-id-selector ${className}`}>
      <h3>{getTitle()}</h3>
      <div className="provider-buttons">
        <NorwegianIDButton
          provider="bankid"
          onAuthenticate={onAuthenticate}
          disabled={disabled}
          size="large"
        />
        <NorwegianIDButton
          provider="buypass"
          onAuthenticate={onAuthenticate}
          disabled={disabled}
          size="large"
        />
        <NorwegianIDButton
          provider="commfides"
          onAuthenticate={onAuthenticate}
          disabled={disabled}
          size="large"
        />
      </div>
    </div>
  );
}
