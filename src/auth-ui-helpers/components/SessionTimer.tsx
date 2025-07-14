/**
 * SessionTimer Component
 * Visual session timer with warnings
 * Enterprise Standards v4.0.0 compliant
 */

import React, { useEffect, useState } from 'react';

import { useNorwegianCompliance } from '../hooks/useNorwegianCompliance.js';
import { useSession, useSessionTimer } from '../hooks/useSession.js';
import type { SessionTimerProps } from '../types.js';

export function SessionTimer({
  showWarning = true,
  warningTime = 300000, // 5 minutes
  onExpire,
  onWarning,
  className = '',
}: SessionTimerProps) {
  const { locale } = useNorwegianCompliance();
  const { isExpiringSoon, extendSession } = useSession({
    warningTime,
    onExpire,
    onWarning,
  });
  const { formattedTime } = useSessionTimer();
  const [showExtendDialog, setShowExtendDialog] = useState(false);

  useEffect(() => {
    if (isExpiringSoon && showWarning) {
      setShowExtendDialog(true);
    }
  }, [isExpiringSoon, showWarning]);

  const handleExtend = async () => {
    try {
      await extendSession();
      setShowExtendDialog(false);
    } catch (error) {
      console.error('Failed to extend session:', error);
    }
  };

  const handleClose = () => {
    setShowExtendDialog(false);
  };

  const getWarningMessage = () => {
    const messages = {
      'nb-NO': {
        title: 'Økten utløper snart',
        message: `Din økt utløper om ${formattedTime}. Ønsker du å fortsette?`,
        extend: 'Forleng økt',
        logout: 'Logg ut',
      },
      'nn-NO': {
        title: 'Økta går snart ut',
        message: `Økta di går ut om ${formattedTime}. Ønskjer du å halde fram?`,
        extend: 'Forleng økt',
        logout: 'Logg ut',
      },
      'en-US': {
        title: 'Session Expiring Soon',
        message: `Your session will expire in ${formattedTime}. Do you want to continue?`,
        extend: 'Extend Session',
        logout: 'Log Out',
      },
    };

    return messages[locale] || messages['en-US'];
  };

  const timerClass = isExpiringSoon ? 'warning' : 'normal';
  const messages = getWarningMessage();

  return (
    <>
      <div className={`session-timer ${timerClass} ${className}`}>
        <span className="timer-icon">⏱</span>
        <span className="timer-text">{formattedTime}</span>
      </div>

      {showExtendDialog && (
        <div
          className="session-warning-dialog"
          role="alertdialog"
          aria-labelledby="session-warning-title"
        >
          <div className="dialog-overlay" onClick={handleClose} />
          <div className="dialog-content">
            <h2 id="session-warning-title">{messages.title}</h2>
            <p>{messages.message}</p>
            <div className="dialog-actions">
              <button
                onClick={handleExtend}
                className="button-primary"
                autoFocus
              >
                {messages.extend}
              </button>
              <button onClick={handleClose} className="button-secondary">
                {messages.logout}
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}

/**
 * Minimal session timer (just the countdown)
 */
export function MinimalSessionTimer({
  className = '',
}: {
  className?: string;
}) {
  const { formattedTime } = useSessionTimer();

  return (
    <span className={`session-timer-minimal ${className}`}>
      {formattedTime}
    </span>
  );
}
