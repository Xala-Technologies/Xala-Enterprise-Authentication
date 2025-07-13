/**
 * Norwegian Compliance Utilities
 * @xala-technologies/authentication
 */

import type { NSMClassification } from '../types/index.js';

// NSM Classification levels mapping
export const NSMClassificationLevels: Record<NSMClassification, number> = {
  'OPEN': 0,
  'RESTRICTED': 1,
  'CONFIDENTIAL': 2,
  'SECRET': 3
};

/**
 * Validate NSM classification hierarchy
 */
export function validateNSMClassification(
  userLevel: NSMClassification,
  requiredLevel: NSMClassification
): boolean {
  const userLevelValue = NSMClassificationLevels[userLevel];
  const requiredLevelValue = NSMClassificationLevels[requiredLevel];
  
  return userLevelValue >= requiredLevelValue;
}

/**
 * Get the most restrictive NSM classification
 */
export function getMostRestrictiveClassification(
  level1: NSMClassification,
  level2: NSMClassification
): NSMClassification {
  const level1Value = NSMClassificationLevels[level1];
  const level2Value = NSMClassificationLevels[level2];
  
  const highestValue = Math.max(level1Value, level2Value);
  
  return Object.keys(NSMClassificationLevels).find(
    (key) => NSMClassificationLevels[key as NSMClassification] === highestValue
  ) as NSMClassification;
}

/**
 * Validate Norwegian personal number (11 digits)
 */
export function validateNorwegianPersonalNumber(personalNumber: string): boolean {
  if (typeof personalNumber !== 'string') {
    return false;
  }

  // Remove any spaces or hyphens
  const cleaned = personalNumber.replace(/[\s-]/g, '');
  
  // Must be exactly 11 digits
  if (!/^\d{11}$/.test(cleaned)) {
    return false;
  }

  // Basic checksum validation for Norwegian personal numbers
  const digits = cleaned.split('').map(Number);
  const weights1 = [3, 7, 6, 1, 8, 9, 4, 5, 2];
  const weights2 = [5, 4, 3, 2, 7, 6, 5, 4, 3, 2];

  // First check digit
  const sum1 = weights1.reduce((sum, weight, index) => sum + weight * digits[index]!, 0);
  const check1 = (11 - (sum1 % 11)) % 11;
  if (check1 === 10 || check1 !== digits[9]) {
    return false;
  }

  // Second check digit
  const sum2 = weights2.reduce((sum, weight, index) => sum + weight * digits[index]!, 0);
  const check2 = (11 - (sum2 % 11)) % 11;
  if (check2 === 10 || check2 !== digits[10]) {
    return false;
  }

  return true;
}

/**
 * Validate Norwegian phone number
 */
export function validateNorwegianPhoneNumber(phoneNumber: string): boolean {
  if (typeof phoneNumber !== 'string') {
    return false;
  }

  // Remove spaces, hyphens, and plus signs
  const cleaned = phoneNumber.replace(/[\s\-+]/g, '');
  
  // Norwegian phone number patterns:
  // - 8 digits starting with 4, 5, 9 (mobile)
  // - 8 digits starting with 2, 3, 5, 6, 7 (landline)
  // - Can be prefixed with country code 47
  
  // Remove country code if present
  const withoutCountryCode = cleaned.startsWith('47') ? cleaned.slice(2) : cleaned;
  
  // Must be exactly 8 digits
  if (!/^\d{8}$/.test(withoutCountryCode)) {
    return false;
  }

  // Check valid first digit
  const firstDigit = withoutCountryCode[0];
  return ['2', '3', '4', '5', '6', '7', '9'].includes(firstDigit!);
}

/**
 * Validate Norwegian postal code
 */
export function validateNorwegianPostalCode(postalCode: string): boolean {
  if (typeof postalCode !== 'string') {
    return false;
  }

  // Norwegian postal codes are exactly 4 digits
  return /^\d{4}$/.test(postalCode.trim());
}

/**
 * Check if user has access to given NSM classification level
 */
export function checkNSMClassificationAccess(
  userClassification: NSMClassification,
  requiredClassification: NSMClassification
): boolean {
  const classificationLevels: Record<NSMClassification, number> = {
    'OPEN': 0,
    'RESTRICTED': 1,
    'CONFIDENTIAL': 2,
    'SECRET': 3
  };

  const userLevel = classificationLevels[userClassification];
  const requiredLevel = classificationLevels[requiredClassification];

  return userLevel >= requiredLevel;
}

/**
 * Get NSM classification level from string
 */
export function parseNSMClassification(classification: string): NSMClassification {
  const upperClassification = classification.toUpperCase();
  
  if (['OPEN', 'RESTRICTED', 'CONFIDENTIAL', 'SECRET'].includes(upperClassification)) {
    return upperClassification as NSMClassification;
  }
  
  // Default to OPEN for invalid classifications
  return 'OPEN';
}

/**
 * Validate Norwegian organization number (9 digits)
 */
export function validateNorwegianOrganizationNumber(orgNumber: string): boolean {
  if (typeof orgNumber !== 'string') {
    return false;
  }

  // Remove any spaces
  const cleaned = orgNumber.replace(/\s/g, '');
  
  // Must be exactly 9 digits
  if (!/^\d{9}$/.test(cleaned)) {
    return false;
  }

  // Norwegian organization number checksum validation
  const digits = cleaned.split('').map(Number);
  const weights = [3, 2, 7, 6, 5, 4, 3, 2];

  const sum = weights.reduce((total, weight, index) => total + weight * digits[index]!, 0);
  const remainder = sum % 11;
  const checkDigit = remainder === 0 ? 0 : 11 - remainder;

  return checkDigit === digits[8];
}

/**
 * Format Norwegian personal number for display
 */
export function formatNorwegianPersonalNumber(personalNumber: string): string {
  if (!validateNorwegianPersonalNumber(personalNumber)) {
    return personalNumber;
  }

  const cleaned = personalNumber.replace(/[\s-]/g, '');
  return `${cleaned.slice(0, 6)}-${cleaned.slice(6)}`;
}

/**
 * Format Norwegian phone number for display
 */
export function formatNorwegianPhoneNumber(phoneNumber: string): string {
  if (!validateNorwegianPhoneNumber(phoneNumber)) {
    return phoneNumber;
  }

  const cleaned = phoneNumber.replace(/[\s\-+]/g, '');
  const withoutCountryCode = cleaned.startsWith('47') ? cleaned.slice(2) : cleaned;
  
  return `+47 ${withoutCountryCode.slice(0, 3)} ${withoutCountryCode.slice(3, 5)} ${withoutCountryCode.slice(5)}`;
}

/**
 * Compliance report interface
 */
export interface ComplianceReport {
  readonly timestamp: Date;
  readonly nsm: {
    compliant: boolean;
    classification: NSMClassification;
    issues: string[];
  };
  readonly gdpr: {
    compliant: boolean;
    issues: string[];
  };
  readonly wcag: {
    compliant: boolean;
    level: "A" | "AA" | "AAA";
  };
  readonly language: {
    compliant: boolean;
    supported: readonly string[];
    issues: string[];
  };
  readonly overall: {
    compliant: boolean;
    score: number; // 0-100
  };
}

/**
 * Generate comprehensive Norwegian compliance report
 */
export function generateComplianceReport(config: {
  nsmClassification: NSMClassification;
  gdprCompliant: boolean;
  wcagLevel: "A" | "AA" | "AAA";
  supportedLanguages: readonly string[];
  auditTrail: boolean;
}): ComplianceReport {
  const nsmCompliant = ['OPEN', 'RESTRICTED', 'CONFIDENTIAL', 'SECRET'].includes(config.nsmClassification);
  const gdprIssues: string[] = [];
  const languageIssues: string[] = [];

  if (!config.gdprCompliant) {
    gdprIssues.push("GDPR compliance is not enabled");
  }

  if (!config.auditTrail) {
    gdprIssues.push("Audit trail is required for GDPR compliance");
  }

  const requiredLanguages = ['nb-NO', 'en-US'];
  for (const lang of requiredLanguages) {
    if (!config.supportedLanguages.includes(lang)) {
      languageIssues.push(`Missing required language: ${lang}`);
    }
  }

  const complianceAreas = [
    nsmCompliant,
    gdprIssues.length === 0,
    true, // WCAG assumed compliant for now
    languageIssues.length === 0
  ];

  const score = Math.round(
    (complianceAreas.filter(Boolean).length / complianceAreas.length) * 100
  );

  return {
    timestamp: new Date(),
    nsm: {
      compliant: nsmCompliant,
      classification: config.nsmClassification,
      issues: nsmCompliant ? [] : [`Invalid NSM classification: ${config.nsmClassification}`]
    },
    gdpr: {
      compliant: gdprIssues.length === 0,
      issues: gdprIssues
    },
    wcag: {
      compliant: true,
      level: config.wcagLevel
    },
    language: {
      compliant: languageIssues.length === 0,
      supported: config.supportedLanguages,
      issues: languageIssues
    },
    overall: {
      compliant: complianceAreas.every(Boolean),
      score
    }
  };
}
