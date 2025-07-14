/**
 * LoginForm Component
 * Flexible login form with provider support
 * Enterprise Standards v4.0.0 compliant
 */

import React, { useState, useCallback, FormEvent } from 'react';

import { useNorwegianCompliance } from '../hooks/useNorwegianCompliance.js';
import type { LoginFormProps, LoginCredentials } from '../types.js';

export function LoginForm({
  onSubmit,
  providers = [],
  initialProvider,
  showRememberMe = true,
  showForgotPassword = true,
  className = '',
}: LoginFormProps) {
  const { locale } = useNorwegianCompliance();
  const [selectedProvider, setSelectedProvider] = useState(
    initialProvider || providers[0]?.id || 'local',
  );
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [personalNumber, setPersonalNumber] = useState('');
  const [rememberMe, setRememberMe] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const isNorwegianProvider = selectedProvider === 'norwegian-id';

  const handleSubmit = useCallback(
    async (e: FormEvent) => {
      e.preventDefault();
      setIsSubmitting(true);

      try {
        const credentials: LoginCredentials = {
          provider: selectedProvider,
          rememberMe,
          ...(isNorwegianProvider ? { personalNumber } : { email, password }),
        };

        await onSubmit(credentials);
      } finally {
        setIsSubmitting(false);
      }
    },
    [
      selectedProvider,
      email,
      password,
      personalNumber,
      rememberMe,
      onSubmit,
      isNorwegianProvider,
    ],
  );

  const getProviderLabel = (provider: { type: string; name: string }) => {
    const labels: Record<string, Record<string, string>> = {
      'nb-NO': {
        'norwegian-id': 'Norsk ID',
        oauth: 'OAuth',
        local: 'E-post og passord',
      },
      'en-US': {
        'norwegian-id': 'Norwegian ID',
        oauth: 'OAuth',
        local: 'Email & Password',
      },
    };

    return labels[locale]?.[provider.type] || provider.name;
  };

  return (
    <form onSubmit={handleSubmit} className={`auth-login-form ${className}`}>
      {providers.length > 1 && (
        <div className="provider-selector">
          {providers.map((provider) => (
            <button
              key={provider.id}
              type="button"
              className={`provider-button ${selectedProvider === provider.id ? 'active' : ''}`}
              onClick={() => setSelectedProvider(provider.id)}
              disabled={!provider.enabled}
            >
              {provider.icon && <img src={provider.icon} alt="" />}
              {getProviderLabel(provider)}
            </button>
          ))}
        </div>
      )}

      {isNorwegianProvider ? (
        <div className="form-group">
          <label htmlFor="personalNumber">
            {locale === 'nb-NO' ? 'Personnummer' : 'Personal Number'}
          </label>
          <input
            id="personalNumber"
            type="text"
            value={personalNumber}
            onChange={(e) => setPersonalNumber(e.target.value)}
            pattern="[0-9]{11}"
            required
            disabled={isSubmitting}
            aria-describedby="personalNumber-help"
          />
          <small id="personalNumber-help">
            {locale === 'nb-NO'
              ? '11-sifret norsk personnummer'
              : '11-digit Norwegian personal number'}
          </small>
        </div>
      ) : (
        <>
          <div className="form-group">
            <label htmlFor="email">
              {locale === 'nb-NO' ? 'E-post' : 'Email'}
            </label>
            <input
              id="email"
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
              disabled={isSubmitting}
              autoComplete="email"
            />
          </div>

          <div className="form-group">
            <label htmlFor="password">
              {locale === 'nb-NO' ? 'Passord' : 'Password'}
            </label>
            <input
              id="password"
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
              disabled={isSubmitting}
              autoComplete="current-password"
            />
          </div>

          {showForgotPassword && (
            <div className="form-links">
              <a href="/auth/forgot-password">
                {locale === 'nb-NO' ? 'Glemt passord?' : 'Forgot password?'}
              </a>
            </div>
          )}
        </>
      )}

      {showRememberMe && (
        <div className="form-group checkbox">
          <label>
            <input
              type="checkbox"
              checked={rememberMe}
              onChange={(e) => setRememberMe(e.target.checked)}
              disabled={isSubmitting}
            />
            {locale === 'nb-NO' ? 'Husk meg' : 'Remember me'}
          </label>
        </div>
      )}

      <button type="submit" className="submit-button" disabled={isSubmitting}>
        {isSubmitting
          ? locale === 'nb-NO'
            ? 'Logger inn...'
            : 'Logging in...'
          : locale === 'nb-NO'
            ? 'Logg inn'
            : 'Log in'}
      </button>
    </form>
  );
}
