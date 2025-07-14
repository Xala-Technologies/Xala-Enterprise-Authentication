/**
 * Storage Utilities
 * Secure storage helpers with enterprise patterns
 * Enterprise Standards v4.0.0 compliant
 */

import type { ValidationResult } from "../../types/index";

/**
 * Storage prefix to prevent key collisions (enterprise security pattern)
 */
const STORAGE_PREFIX = "xala-auth-";

/**
 * Maximum key length to prevent DoS attacks
 */
const MAX_KEY_LENGTH = 100;

/**
 * Maximum value size (1MB) to prevent memory exhaustion
 */
const MAX_VALUE_SIZE = 1024 * 1024;

/**
 * Stored data structure with metadata
 */
interface StoredData<T = unknown> {
  readonly value: T;
  readonly timestamp: number;
  readonly version: string;
  readonly checksum?: string;
}

/**
 * Storage configuration options
 */
interface StorageOptions {
  readonly ttl?: number; // Time to live in milliseconds
  readonly encrypt?: boolean;
  readonly compress?: boolean;
}

/**
 * Secure storage wrapper with enterprise patterns
 * Following foundation 2.0.0 type safety standards
 */
export class SecureStorage {
  /**
   * Validate storage key for security (prevent injection attacks)
   */
  private static validateKey(key: string): ValidationResult<string> {
    if (typeof key !== "string") {
      return { success: false, error: "Key must be a string" };
    }

    if (key.length === 0) {
      return { success: false, error: "Key cannot be empty" };
    }

    if (key.length > MAX_KEY_LENGTH) {
      return {
        success: false,
        error: `Key length exceeds maximum of ${MAX_KEY_LENGTH}`,
      };
    }

    // Prevent prototype pollution and injection attacks
    if (
      key.includes("__proto__") ||
      key.includes("constructor") ||
      key.includes("prototype")
    ) {
      return {
        success: false,
        error: "Invalid key: contains forbidden patterns",
      };
    }

    // Validate key format (alphanumeric, dash, underscore only)
    if (!/^[a-zA-Z0-9_-]+$/.test(key)) {
      return { success: false, error: "Key contains invalid characters" };
    }

    return { success: true, data: key };
  }

  /**
   * Check if storage is available (enterprise pattern)
   */
  private static isAvailable(type: "localStorage" | "sessionStorage"): boolean {
    try {
      const storage = window[type];
      const testKey = "__test__";
      storage.setItem(testKey, "test");
      storage.removeItem(testKey);
      return true;
    } catch {
      return false;
    }
  }

  /**
   * Set item with type safety and security validation
   */
  static setItem<T>(
    key: string,
    value: T,
    options: StorageOptions & { useSession?: boolean } = {},
  ): ValidationResult<void> {
    const { useSession = false, ttl, ...storageOptions } = options;

    // Validate key
    const keyValidation = this.validateKey(key);
    if (!keyValidation.success) {
      return keyValidation;
    }

    const storage = useSession ? sessionStorage : localStorage;
    if (!this.isAvailable(useSession ? "sessionStorage" : "localStorage")) {
      return { success: false, error: "Storage not available" };
    }

    try {
      const storedData: StoredData<T> = {
        value,
        timestamp: Date.now(),
        version: "1.0.0",
      };

      const serialized = JSON.stringify(storedData);

      // Check size limits
      if (serialized.length > MAX_VALUE_SIZE) {
        return {
          success: false,
          error: `Value size exceeds maximum of ${MAX_VALUE_SIZE} bytes`,
        };
      }

      storage.setItem(STORAGE_PREFIX + keyValidation.data, serialized);
      return { success: true, data: undefined };
    } catch (error) {
      const errorMessage =
        error instanceof Error ? error.message : "Unknown storage error";
      return {
        success: false,
        error: `Failed to save to storage: ${errorMessage}`,
      };
    }
  }

  /**
   * Get item with type safety and validation
   */
  static getItem<T>(
    key: string,
    options: { useSession?: boolean; maxAge?: number } = {},
  ): ValidationResult<T | null> {
    const { useSession = false, maxAge } = options;

    // Validate key
    const keyValidation = this.validateKey(key);
    if (!keyValidation.success) {
      return keyValidation;
    }

    const storage = useSession ? sessionStorage : localStorage;
    if (!this.isAvailable(useSession ? "sessionStorage" : "localStorage")) {
      return { success: false, error: "Storage not available" };
    }

    try {
      const item = storage.getItem(STORAGE_PREFIX + keyValidation.data);
      if (!item) {
        return { success: true, data: null };
      }

      const storedData: StoredData<T> = JSON.parse(item);

      // Check if data has expired
      if (maxAge && Date.now() - storedData.timestamp > maxAge) {
        // Clean up expired data
        storage.removeItem(STORAGE_PREFIX + keyValidation.data);
        return { success: true, data: null };
      }

      // Validate stored data structure
      if (
        !storedData ||
        typeof storedData.timestamp !== "number" ||
        !storedData.version
      ) {
        return { success: false, error: "Invalid stored data format" };
      }

      return { success: true, data: storedData.value };
    } catch (error) {
      const errorMessage =
        error instanceof Error ? error.message : "Unknown storage error";
      return {
        success: false,
        error: `Failed to read from storage: ${errorMessage}`,
      };
    }
  }

  /**
   * Remove item with validation
   */
  static removeItem(key: string, useSession = false): ValidationResult<void> {
    const keyValidation = this.validateKey(key);
    if (!keyValidation.success) {
      return keyValidation;
    }

    const storage = useSession ? sessionStorage : localStorage;
    if (!this.isAvailable(useSession ? "sessionStorage" : "localStorage")) {
      return { success: false, error: "Storage not available" };
    }

    try {
      storage.removeItem(STORAGE_PREFIX + keyValidation.data);
      return { success: true, data: undefined };
    } catch (error) {
      const errorMessage =
        error instanceof Error ? error.message : "Unknown storage error";
      return {
        success: false,
        error: `Failed to remove from storage: ${errorMessage}`,
      };
    }
  }

  /**
   * Clear all authentication storage (secure cleanup)
   */
  static clear(useSession = false): ValidationResult<number> {
    const storage = useSession ? sessionStorage : localStorage;
    if (!this.isAvailable(useSession ? "sessionStorage" : "localStorage")) {
      return { success: false, error: "Storage not available" };
    }

    try {
      // Only clear our prefixed keys (security best practice)
      const keys = Object.keys(storage);
      let removedCount = 0;

      keys.forEach((key) => {
        if (key.startsWith(STORAGE_PREFIX)) {
          storage.removeItem(key);
          removedCount++;
        }
      });

      return { success: true, data: removedCount };
    } catch (error) {
      const errorMessage =
        error instanceof Error ? error.message : "Unknown storage error";
      return {
        success: false,
        error: `Failed to clear storage: ${errorMessage}`,
      };
    }
  }
}

/**
 * Cookie utilities
 */
export class CookieStorage {
  static set(
    name: string,
    value: string,
    options: {
      expires?: number; // days
      path?: string;
      domain?: string;
      secure?: boolean;
      sameSite?: "strict" | "lax" | "none";
    } = {},
  ): void {
    const {
      expires = 7,
      path = "/",
      secure = true,
      sameSite = "strict",
    } = options;

    const date = new Date();
    date.setTime(date.getTime() + expires * 24 * 60 * 60 * 1000);

    let cookie = `${STORAGE_PREFIX}${name}=${encodeURIComponent(value)}`;
    cookie += `; expires=${date.toUTCString()}`;
    cookie += `; path=${path}`;
    if (options.domain) cookie += `; domain=${options.domain}`;
    if (secure) cookie += "; secure";
    cookie += `; samesite=${sameSite}`;

    document.cookie = cookie;
  }

  static get(name: string): string | null {
    const nameEQ = `${STORAGE_PREFIX}${name}=`;
    const cookies = document.cookie.split(";");

    for (const cookie of cookies) {
      const trimmed = cookie.trim();
      if (trimmed.indexOf(nameEQ) === 0) {
        return decodeURIComponent(trimmed.substring(nameEQ.length));
      }
    }

    return null;
  }

  static remove(name: string, path = "/"): void {
    this.set(name, "", { expires: -1, path });
  }
}

// ===== CONVENIENCE FACTORIES (Foundation 2.0.0 Pattern) =====

/**
 * Storage factory interface
 */
export interface AuthStorageService {
  setItem<T>(key: string, value: T): ValidationResult<void>;
  getItem<T>(key: string): ValidationResult<T | null>;
  removeItem(key: string): ValidationResult<void>;
  clear(): ValidationResult<number>;
}

/**
 * Create local storage service
 */
export function createAuthStorage(
  type: "local" | "session" | "memory" = "local",
): AuthStorageService {
  switch (type) {
    case "local":
      return createLocalStorageService();
    case "session":
      return createSessionStorageService();
    case "memory":
      return createMemoryStorageService();
    default:
      throw new Error(`Unsupported storage type: ${type}`);
  }
}

/**
 * Create local storage service
 */
export function createLocalStorageService(): AuthStorageService {
  return {
    setItem<T>(key: string, value: T): ValidationResult<void> {
      return SecureStorage.setItem(key, value, { useSession: false });
    },
    getItem<T>(key: string): ValidationResult<T | null> {
      return SecureStorage.getItem<T>(key, { useSession: false });
    },
    removeItem(key: string): ValidationResult<void> {
      return SecureStorage.removeItem(key, false);
    },
    clear(): ValidationResult<number> {
      return SecureStorage.clear(false);
    },
  };
}

/**
 * Create session storage service
 */
export function createSessionStorageService(): AuthStorageService {
  return {
    setItem<T>(key: string, value: T): ValidationResult<void> {
      return SecureStorage.setItem(key, value, { useSession: true });
    },
    getItem<T>(key: string): ValidationResult<T | null> {
      return SecureStorage.getItem<T>(key, { useSession: true });
    },
    removeItem(key: string): ValidationResult<void> {
      return SecureStorage.removeItem(key, true);
    },
    clear(): ValidationResult<number> {
      return SecureStorage.clear(true);
    },
  };
}

/**
 * Create in-memory storage service (for testing/fallback)
 */
export function createMemoryStorageService(): AuthStorageService {
  const memoryStore = new Map<string, StoredData>();

  return {
    setItem<T>(key: string, value: T): ValidationResult<void> {
      const keyValidation = (SecureStorage as any).validateKey(key);
      if (!keyValidation.success) {
        return keyValidation;
      }

      const storedData: StoredData<T> = {
        value,
        timestamp: Date.now(),
        version: "1.0.0",
      };

      memoryStore.set(STORAGE_PREFIX + keyValidation.data, storedData);
      return { success: true, data: undefined };
    },

    getItem<T>(key: string): ValidationResult<T | null> {
      const keyValidation = (SecureStorage as any).validateKey(key);
      if (!keyValidation.success) {
        return keyValidation;
      }

      const storedData = memoryStore.get(STORAGE_PREFIX + keyValidation.data);
      if (!storedData) {
        return { success: true, data: null };
      }

      return { success: true, data: storedData.value as T };
    },

    removeItem(key: string): ValidationResult<void> {
      const keyValidation = (SecureStorage as any).validateKey(key);
      if (!keyValidation.success) {
        return keyValidation;
      }

      memoryStore.delete(STORAGE_PREFIX + keyValidation.data);
      return { success: true, data: undefined };
    },

    clear(): ValidationResult<number> {
      const keysToRemove: string[] = [];
      for (const key of memoryStore.keys()) {
        if (key.startsWith(STORAGE_PREFIX)) {
          keysToRemove.push(key);
        }
      }

      keysToRemove.forEach((key) => memoryStore.delete(key));
      return { success: true, data: keysToRemove.length };
    },
  };
}
