/**
 * useSession Hook
 * Session management hook
 * Enterprise Standards v4.0.0 compliant
 */

import { useEffect, useState, useCallback, useRef } from 'react';

import type { SessionInfo, UseSessionOptions } from '../types.js';

import { useAuth } from './useAuth.js';

export function useSession(options?: UseSessionOptions): SessionInfo & {
  extendSession: () => Promise<void>;
} {
  const { sessionInfo, refresh } = useAuth();
  const [remainingTime, setRemainingTime] = useState(0);
  const [isExpiringSoon, setIsExpiringSoon] = useState(false);
  const warningTimeoutRef = useRef<NodeJS.Timeout>();

  const {
    warningTime = 300000, // 5 minutes default
    onWarning,
    onExpire,
  } = options ?? {};

  // Calculate remaining time
  useEffect(() => {
    if (!sessionInfo?.expiresAt) { return; }

    const updateRemainingTime = () => {
      const now = Date.now();
      const expiresAt = new Date(sessionInfo.expiresAt).getTime();
      const remaining = Math.max(0, expiresAt - now);

      setRemainingTime(remaining);
      setIsExpiringSoon(remaining > 0 && remaining <= warningTime);

      if (remaining === 0 && onExpire) {
        onExpire();
      }
    };

    updateRemainingTime();
    const interval = setInterval(updateRemainingTime, 1000);

    return () => clearInterval(interval);
  }, [sessionInfo?.expiresAt, warningTime, onExpire]);

  // Handle warning
  useEffect(() => {
    if (isExpiringSoon && onWarning) {
      // Clear any existing timeout
      if (warningTimeoutRef.current) {
        clearTimeout(warningTimeoutRef.current);
      }

      // Set new warning
      warningTimeoutRef.current = setTimeout(() => {
        onWarning(remainingTime);
      }, 100);
    }

    return () => {
      if (warningTimeoutRef.current) {
        clearTimeout(warningTimeoutRef.current);
      }
    };
  }, [isExpiringSoon, remainingTime, onWarning]);

  const extendSession = useCallback(async () => {
    try {
      await refresh();
    } catch (error) {
      console.error('Failed to extend session:', error);
      throw error;
    }
  }, [refresh]);

  return {
    expiresAt: sessionInfo?.expiresAt ?? new Date(0),
    remainingTime,
    isExpiringSoon,
    canRefresh: sessionInfo?.canRefresh ?? false,
    extendSession,
  };
}

/**
 * Hook to format remaining time
 */
export function useSessionTimer() {
  const { remainingTime } = useSession();

  const formatTime = useCallback((ms: number): string => {
    if (ms <= 0) { return '00:00'; }

    const totalSeconds = Math.floor(ms / 1000);
    const hours = Math.floor(totalSeconds / 3600);
    const minutes = Math.floor((totalSeconds % 3600) / 60);
    const seconds = totalSeconds % 60;

    if (hours > 0) {
      return `${hours}:${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`;
    }

    return `${minutes}:${seconds.toString().padStart(2, '0')}`;
  }, []);

  return {
    remainingTime,
    formattedTime: formatTime(remainingTime),
  };
}
