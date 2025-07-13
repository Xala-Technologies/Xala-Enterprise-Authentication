/**
 * Type Safety Utilities
 * @xala-technologies/authentication
 */

import type { ValidationResult, ValidationError, SafeAccessResult } from '../types/index.js';

/**
 * Validate email addresses
 */
export function isValidEmail(email: unknown): email is string {
  if (typeof email !== 'string') {
    return false;
  }
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return emailRegex.test(email);
}

/**
 * Validate Norwegian personal number (11 digits)
 */
export function isValidNorwegianPersonalNumber(personalNumber: unknown): personalNumber is string {
  if (typeof personalNumber !== 'string') {
    return false;
  }
  // Basic format check for Norwegian personal number (11 digits)
  const personalNumberRegex = /^\d{11}$/;
  return personalNumberRegex.test(personalNumber);
}

/**
 * Safe array access with bounds checking
 */
export function safeArrayAccess<T>(array: T[], index: number): T | undefined {
  if (!Array.isArray(array) || index < 0 || index >= array.length) {
    return undefined;
  }
  return array[index];
}

/**
 * Type guard for checking if a value is a valid authentication request
 */
export function isValidAuthenticationRequest(value: unknown): value is {
  provider: string;
  credentials: Record<string, unknown>;
} {
  return (
    typeof value === 'object' &&
    value !== null &&
    'provider' in value &&
    'credentials' in value &&
    typeof (value as any).provider === 'string' &&
    typeof (value as any).credentials === 'object'
  );
}

/**
 * Type guard for checking if a value is a valid user profile
 */
export function isValidUserProfile(value: unknown): value is {
  id: string;
  email?: string;
  name?: string;
  roles: string[];
  permissions: string[];
} {
  return (
    typeof value === 'object' &&
    value !== null &&
    'id' in value &&
    'roles' in value &&
    'permissions' in value &&
    typeof (value as any).id === 'string' &&
    Array.isArray((value as any).roles) &&
    Array.isArray((value as any).permissions)
  );
}

/**
 * Safe object property access
 */
export function safeGet<T>(obj: unknown, path: string, defaultValue?: T): T | undefined {
  if (typeof obj !== 'object' || obj === null) {
    return defaultValue;
  }

  const keys = path.split('.');
  let current: any = obj;

  for (const key of keys) {
    if (current === null || current === undefined || typeof current !== 'object') {
      return defaultValue;
    }
    current = current[key];
  }

  return current !== undefined ? current : defaultValue;
}

/**
 * Create a type-safe configuration object
 */
export function createTypeSafeConfig<T extends Record<string, unknown>>(
  config: T,
  defaults: Partial<T>
): T {
  return { ...defaults, ...config } as T;
}

/**
 * Validate required fields in an object
 */
export function validateRequiredFields<T extends Record<string, unknown>>(
  obj: T,
  requiredFields: Array<keyof T>
): ValidationResult {
  const errors: ValidationError[] = [];
  const warnings: ValidationError[] = [];

  for (const field of requiredFields) {
    if (!(field in obj) || obj[field] === null || obj[field] === undefined) {
      errors.push({
        field: String(field),
        message: `Field '${String(field)}' is required`,
        code: 'REQUIRED_FIELD_MISSING'
      });
    }
  }

  return {
    valid: errors.length === 0,
    success: errors.length === 0,
    errors,
    warnings
  };
}

/**
 * Safe object access with error handling
 */
export function safeObjectAccess<T>(
  accessor: () => T,
  defaultValue?: T
): SafeAccessResult<T> {
  try {
    const result = accessor();
    return {
      success: true,
      data: result
    };
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error',
      data: defaultValue
    };
  }
}

/**
 * Validate if a string is a valid URL
 */
export function isValidUrl(url: string): boolean {
  try {
    new URL(url);
    return true;
  } catch {
    return false;
  }
}

/**
 * Type guard function type
 */
export type TypeGuard<T> = (value: unknown) => value is T;
