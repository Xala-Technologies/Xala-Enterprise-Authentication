/**
 * NSM Classification Guard
 * Enforces Norwegian security classification requirements
 * Enterprise Standards v4.0.0 compliant
 */

import type {
  AuthenticationGuard,
  AuthContext,
  NSMClassificationGuardOptions,
  TokenExtractor,
  SessionValidator,
} from './types.js';
import { AuthGuard } from './auth-guard.js';
import { validateNSMClassification, getMostRestrictiveClassification } from '../utils/norwegian-compliance.js';
import type { NSMClassification } from '../types/index.js';

export class NSMClassificationGuard extends AuthGuard implements AuthenticationGuard {
  override readonly name: string = 'nsm-classification-guard';
  private readonly requiredClassification: NSMClassification;
  private readonly allowHigher: boolean;

  constructor(
    tokenExtractor: TokenExtractor,
    sessionValidator: SessionValidator,
    options: NSMClassificationGuardOptions
  ) {
    super(tokenExtractor, sessionValidator, options);
    this.requiredClassification = options.requiredClassification;
    this.allowHigher = options.allowHigher ?? true;
  }

  override async canActivate(context: AuthContext): Promise<boolean> {
    // First check base authentication
    const isAuthenticated = await super.canActivate(context);
    if (!isAuthenticated) {
      return false;
    }

    const userClassification = context.user?.nsmClassification ?? 'OPEN';
    
    if (this.allowHigher) {
      // User classification must be at least as restrictive as required
      return validateNSMClassification(userClassification, this.requiredClassification);
    } else {
      // User classification must match exactly
      return userClassification === this.requiredClassification;
    }
  }

  /**
   * Get the most restrictive classification between user and resource
   */
  getEffectiveClassification(context: AuthContext): NSMClassification {
    const userClassification = context.user?.nsmClassification ?? 'OPEN';
    return getMostRestrictiveClassification(userClassification, this.requiredClassification);
  }

  static override create(
    tokenExtractor: TokenExtractor,
    sessionValidator: SessionValidator,
    options: NSMClassificationGuardOptions
  ): NSMClassificationGuard {
    return new NSMClassificationGuard(tokenExtractor, sessionValidator, options);
  }
}

/**
 * Helper function to create NSM classification guards
 */
export function requireNSMClassification(
  classification: NSMClassification,
  options?: Partial<NSMClassificationGuardOptions>
): (tokenExtractor: TokenExtractor, sessionValidator: SessionValidator) => NSMClassificationGuard {
  return (tokenExtractor: TokenExtractor, sessionValidator: SessionValidator): NSMClassificationGuard => {
    return NSMClassificationGuard.create(tokenExtractor, sessionValidator, {
      ...options,
      requiredClassification: classification,
    });
  };
}

/**
 * Pre-configured NSM classification guards
 */
export const NSMClassificationGuards = {
  /**
   * Require OPEN classification (public data)
   */
  requireOpen: (tokenExtractor: TokenExtractor, sessionValidator: SessionValidator): NSMClassificationGuard =>
    NSMClassificationGuard.create(tokenExtractor, sessionValidator, {
      requiredClassification: 'OPEN',
      failureMessage: 'Access to OPEN classified data only',
    }),

  /**
   * Require RESTRICTED classification
   */
  requireRestricted: (tokenExtractor: TokenExtractor, sessionValidator: SessionValidator): NSMClassificationGuard =>
    NSMClassificationGuard.create(tokenExtractor, sessionValidator, {
      requiredClassification: 'RESTRICTED',
      failureMessage: 'RESTRICTED classification required',
    }),

  /**
   * Require CONFIDENTIAL classification
   */
  requireConfidential: (tokenExtractor: TokenExtractor, sessionValidator: SessionValidator): NSMClassificationGuard =>
    NSMClassificationGuard.create(tokenExtractor, sessionValidator, {
      requiredClassification: 'CONFIDENTIAL',
      failureMessage: 'CONFIDENTIAL classification required',
    }),

  /**
   * Require SECRET classification
   */
  requireSecret: (tokenExtractor: TokenExtractor, sessionValidator: SessionValidator): NSMClassificationGuard =>
    NSMClassificationGuard.create(tokenExtractor, sessionValidator, {
      requiredClassification: 'SECRET',
      failureMessage: 'SECRET classification required',
    }),

  /**
   * Dynamic classification based on data sensitivity
   */
  requireDynamicClassification: (
    classification: NSMClassification
  ) => (tokenExtractor: TokenExtractor, sessionValidator: SessionValidator): NSMClassificationGuard =>
    NSMClassificationGuard.create(tokenExtractor, sessionValidator, {
      requiredClassification: classification,
      failureMessage: `${classification} classification required for this resource`,
    }),
} as const;