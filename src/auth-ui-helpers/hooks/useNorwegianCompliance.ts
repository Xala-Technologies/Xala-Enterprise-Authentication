/**
 * useNorwegianCompliance Hook
 * Norwegian compliance utilities for UI
 * Enterprise Standards v4.0.0 compliant
 */

import { useState, useEffect, useCallback } from 'react';
import type { NSMClassification } from '../../types/index.js';
import { useAuth } from './useAuth.js';

export function useNorwegianCompliance() {
  const { user } = useAuth();
  const [locale, setLocale] = useState<'nb-NO' | 'nn-NO' | 'en-US'>('nb-NO');
  const [consentGiven, setConsentGiven] = useState(false);

  // Load saved preferences
  useEffect(() => {
    const savedLocale = localStorage.getItem('xala-auth-locale');
    if (savedLocale && ['nb-NO', 'nn-NO', 'en-US'].includes(savedLocale)) {
      setLocale(savedLocale as any);
    }

    const savedConsent = localStorage.getItem('xala-auth-consent');
    setConsentGiven(savedConsent === 'true');
  }, []);

  const changeLocale = useCallback((newLocale: 'nb-NO' | 'nn-NO' | 'en-US') => {
    setLocale(newLocale);
    localStorage.setItem('xala-auth-locale', newLocale);
  }, []);

  const giveConsent = useCallback(() => {
    setConsentGiven(true);
    localStorage.setItem('xala-auth-consent', 'true');
    localStorage.setItem('xala-auth-consent-date', new Date().toISOString());
  }, []);

  const withdrawConsent = useCallback(() => {
    setConsentGiven(false);
    localStorage.removeItem('xala-auth-consent');
    localStorage.removeItem('xala-auth-consent-date');
  }, []);

  return {
    locale,
    changeLocale,
    consentGiven,
    giveConsent,
    withdrawConsent,
    userClassification: user?.nsmClassification ?? 'OPEN',
  };
}

/**
 * Hook for NSM classification display
 */
export function useNSMClassification(dataClassification?: NSMClassification) {
  const { user } = useAuth();
  const userClassification = user?.nsmClassification ?? 'OPEN';

  const getClassificationColor = useCallback((classification: NSMClassification): string => {
    switch (classification) {
      case 'SECRET':
        return '#dc3545'; // Red
      case 'CONFIDENTIAL':
        return '#fd7e14'; // Orange
      case 'RESTRICTED':
        return '#ffc107'; // Yellow
      case 'OPEN':
        return '#28a745'; // Green
      default:
        return '#6c757d'; // Gray
    }
  }, []);

  const getClassificationLabel = useCallback((classification: NSMClassification, locale: string): string => {
    const labels: Record<string, Record<NSMClassification, string>> = {
      'nb-NO': {
        'SECRET': 'HEMMELIG',
        'CONFIDENTIAL': 'KONFIDENSIELT',
        'RESTRICTED': 'BEGRENSET',
        'OPEN': 'ÅPEN',
      },
      'nn-NO': {
        'SECRET': 'HEMMELEG',
        'CONFIDENTIAL': 'KONFIDENSIELT',
        'RESTRICTED': 'AVGRENSA',
        'OPEN': 'OPEN',
      },
      'en-US': {
        'SECRET': 'SECRET',
        'CONFIDENTIAL': 'CONFIDENTIAL',
        'RESTRICTED': 'RESTRICTED',
        'OPEN': 'OPEN',
      },
    };

    return labels[locale]?.[classification] ?? classification;
  }, []);

  const effectiveClassification = dataClassification ?? userClassification;

  return {
    classification: effectiveClassification,
    color: getClassificationColor(effectiveClassification),
    getLabel: (locale: string) => getClassificationLabel(effectiveClassification, locale),
  };
}

/**
 * Hook for WCAG compliance helpers
 */
export function useWCAGCompliance() {
  const [reducedMotion, setReducedMotion] = useState(false);
  const [highContrast, setHighContrast] = useState(false);
  const [fontSize, setFontSize] = useState<'normal' | 'large' | 'extra-large'>('normal');

  useEffect(() => {
    // Check system preferences
    const motionQuery = window.matchMedia('(prefers-reduced-motion: reduce)');
    const contrastQuery = window.matchMedia('(prefers-contrast: high)');

    setReducedMotion(motionQuery.matches);
    setHighContrast(contrastQuery.matches);

    // Listen for changes
    const handleMotionChange = (e: MediaQueryListEvent) => setReducedMotion(e.matches);
    const handleContrastChange = (e: MediaQueryListEvent) => setHighContrast(e.matches);

    motionQuery.addEventListener('change', handleMotionChange);
    contrastQuery.addEventListener('change', handleContrastChange);

    return () => {
      motionQuery.removeEventListener('change', handleMotionChange);
      contrastQuery.removeEventListener('change', handleContrastChange);
    };
  }, []);

  const changeFontSize = useCallback((size: 'normal' | 'large' | 'extra-large') => {
    setFontSize(size);
    document.documentElement.style.fontSize = {
      'normal': '16px',
      'large': '18px',
      'extra-large': '20px',
    }[size];
  }, []);

  return {
    reducedMotion,
    highContrast,
    fontSize,
    changeFontSize,
  };
}