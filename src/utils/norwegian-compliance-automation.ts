/**
 * Norwegian Compliance Automation Service
 * Implements automated Norwegian compliance patterns
 * Enterprise Standards v4.0.0 compliant
 */

import { Logger } from "../foundation-mock.js"
import type { NSMClassification } from "../types/index.js";
import type { ComplianceAuditRequest } from "../auth-compliance/types.js";

interface NorwegianComplianceConfig {
  readonly enableAutomaticClassification: boolean;
  readonly enableGDPRAutomation: boolean;
  readonly enableAuditTrail: boolean;
  readonly enablePersonalNumberValidation: boolean;
  readonly defaultClassification: NSMClassification;
  readonly auditIntervalDays: number;
}

interface PersonalDataContext {
  readonly dataType: string;
  readonly source: 'bankid' | 'buypass' | 'commfides' | 'manual';
  readonly purpose: string;
  readonly legalBasis: 'consent' | 'contract' | 'legal_obligation';
  readonly retentionPeriod: number; // days
  readonly minimizationApplied: boolean;
}

interface ComplianceAutomationResult {
  readonly success: boolean;
  readonly classification: NSMClassification;
  readonly gdprCompliant: boolean;
  readonly auditRequired: boolean;
  readonly actions: readonly ComplianceAction[];
  readonly nextReviewDate: Date;
  readonly recommendations: readonly string[];
}

interface ComplianceAction {
  readonly type: 'audit' | 'classify' | 'encrypt' | 'anonymize' | 'delete';
  readonly priority: 'immediate' | 'high' | 'medium' | 'low';
  readonly description: string;
  readonly deadline: Date;
  readonly automated: boolean;
}

export class NorwegianComplianceAutomation {
  private readonly logger: Logger;
  private readonly config: NorwegianComplianceConfig;
  private readonly automationRules: Map<string, ComplianceRule[]> = new Map();
  private readonly scheduledActions: Map<string, ComplianceAction[]> = new Map();

  constructor(
    config: NorwegianComplianceConfig,
    logger: Logger
  ) {
    this.config = config;
    this.logger = logger;
    this.initializeAutomationRules();
  }

  /**
   * Automatically classify data based on Norwegian compliance requirements
   */
  async autoClassifyData(
    _data: unknown,
    context: PersonalDataContext
  ): Promise<NSMClassification> {
    if (!this.config.enableAutomaticClassification) {
      return this.config.defaultClassification;
    }

    try {
      // Norwegian Personal Number requires special handling
      if (context.dataType === 'norwegianPersonalNumber') {
        // Personal numbers are sensitive and require RESTRICTED or higher
        if (context.source === 'bankid') {
          return 'CONFIDENTIAL'; // Government ID source
        }
        return 'RESTRICTED'; // Other sources
      }

      // Health data from government sources
      if (context.dataType === 'healthData' && 
          ['bankid', 'buypass', 'commfides'].includes(context.source)) {
        return 'SECRET'; // Health data with government source
      }

      // Biometric data
      if (context.dataType === 'biometric') {
        return 'CONFIDENTIAL'; // Biometric always confidential
      }

      // Financial data
      if (context.dataType === 'financialData') {
        return 'RESTRICTED'; // Financial data default restricted
      }

      // Location data with high precision
      if (context.dataType === 'locationData') {
        return 'RESTRICTED'; // Precise location requires protection
      }

      // Communications metadata
      if (context.dataType === 'communicationMetadata') {
        return 'RESTRICTED'; // Communications metadata restricted
      }

      // Default for personal data
      if (this.isPersonalData(context.dataType)) {
        return 'RESTRICTED'; // Personal data default
      }

      // Non-personal data
      return 'OPEN';

    } catch (error) {
      this.logger.warn('Auto-classification failed, using default', {
        error: (error as Error).message,
        dataType: context.dataType,
        defaultClassification: this.config.defaultClassification
      });
      
      return this.config.defaultClassification;
    }
  }

  /**
   * Process Norwegian government authentication data
   */
  async processNorwegianAuthData(
    authData: {
      personalNumber?: string;
      provider: 'bankid' | 'buypass' | 'commfides';
      securityLevel: number;
      attributes: Record<string, unknown>;
    }
  ): Promise<ComplianceAutomationResult> {
    const actions: ComplianceAction[] = [];
    const recommendations: string[] = [];

    // Validate personal number format if present
    if (authData.personalNumber && this.config.enablePersonalNumberValidation) {
      const isValid = this.validateNorwegianPersonalNumber(authData.personalNumber);
      if (!isValid) {
        actions.push({
          type: 'audit',
          priority: 'immediate',
          description: 'Invalid Norwegian personal number detected',
          deadline: new Date(Date.now() + 24 * 60 * 60 * 1000), // 24 hours
          automated: false
        });
      }
    }

    // Determine classification based on provider and security level
    let classification: NSMClassification = 'OPEN';
    
    if (authData.provider === 'bankid' && authData.securityLevel >= 4) {
      classification = 'CONFIDENTIAL'; // High security BankID
    } else if (authData.provider === 'bankid' && authData.securityLevel >= 3) {
      classification = 'RESTRICTED'; // Standard BankID
    } else if (['buypass', 'commfides'].includes(authData.provider) && authData.securityLevel >= 3) {
      classification = 'RESTRICTED'; // Other government providers
    } else {
      classification = 'RESTRICTED'; // Default for government auth
    }

    // GDPR compliance checks
    const gdprCompliant = await this.checkGDPRCompliance(authData);
    if (!gdprCompliant) {
      actions.push({
        type: 'audit',
        priority: 'high',
        description: 'GDPR compliance issues detected in authentication data',
        deadline: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000), // 7 days
        automated: false
      });
    }

    // Schedule regular audit if required
    const auditRequired = classification === 'RESTRICTED' || classification === 'CONFIDENTIAL';
    if (auditRequired) {
      const auditDeadline = new Date(Date.now() + this.config.auditIntervalDays * 24 * 60 * 60 * 1000);
      actions.push({
        type: 'audit',
        priority: 'medium',
        description: `Regular NSM compliance audit for ${classification} classified data`,
        deadline: auditDeadline,
        automated: true
      });
    }

    // Add encryption requirement for sensitive data
    if (['CONFIDENTIAL', 'SECRET'].includes(classification)) {
      actions.push({
        type: 'encrypt',
        priority: 'high',
        description: 'Ensure data at rest encryption for sensitive classification',
        deadline: new Date(Date.now() + 3 * 24 * 60 * 60 * 1000), // 3 days
        automated: true
      });
    }

    // Generate recommendations
    recommendations.push(`Data classified as ${classification} based on provider ${authData.provider}`);
    
    if (authData.securityLevel < 3) {
      recommendations.push('Consider requiring higher security level for sensitive operations');
    }
    
    if (this.shouldRecommendMFA(authData)) {
      recommendations.push('Multi-factor authentication recommended for this security level');
    }

    const nextReviewDate = new Date(Date.now() + this.getReviewInterval(classification));

    this.logger.info('Norwegian auth data processed', {
      provider: authData.provider,
      classification,
      gdprCompliant,
      actionsCount: actions.length,
      nsmClassification: 'RESTRICTED' as NSMClassification
    });

    return {
      success: true,
      classification,
      gdprCompliant,
      auditRequired,
      actions,
      nextReviewDate,
      recommendations
    };
  }

  /**
   * Automated GDPR compliance processing
   */
  async automateGDPRCompliance(
    personalDataContext: PersonalDataContext,
    userConsent?: {
      given: boolean;
      timestamp: Date;
      purposes: string[];
      withdrawable: boolean;
    }
  ): Promise<{
    compliant: boolean;
    actions: ComplianceAction[];
    legalBasisValid: boolean;
    retentionValid: boolean;
  }> {
    const actions: ComplianceAction[] = [];
    let compliant = true;
    let legalBasisValid = true;
    let retentionValid = true;

    // Check legal basis
    if (personalDataContext.legalBasis === 'consent' && !userConsent?.given) {
      compliant = false;
      legalBasisValid = false;
      actions.push({
        type: 'audit',
        priority: 'immediate',
        description: 'Consent required but not obtained for personal data processing',
        deadline: new Date(Date.now() + 24 * 60 * 60 * 1000),
        automated: false
      });
    }

    // Check data minimization
    if (!personalDataContext.minimizationApplied) {
      actions.push({
        type: 'anonymize',
        priority: 'medium',
        description: 'Apply data minimization to reduce collected data',
        deadline: new Date(Date.now() + 14 * 24 * 60 * 60 * 1000),
        automated: true
      });
    }

    // Check retention period
    const dataAge = Date.now() - (userConsent?.timestamp.getTime() || 0);
    const retentionLimit = personalDataContext.retentionPeriod * 24 * 60 * 60 * 1000;
    
    if (dataAge > retentionLimit) {
      retentionValid = false;
      actions.push({
        type: 'delete',
        priority: 'high',
        description: 'Personal data exceeds retention period and should be deleted',
        deadline: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
        automated: this.config.enableGDPRAutomation
      });
    }

    // Schedule future retention check
    const nextRetentionCheck = new Date(Date.now() + retentionLimit - dataAge);
    if (nextRetentionCheck > new Date()) {
      actions.push({
        type: 'audit',
        priority: 'low',
        description: 'Schedule retention period review',
        deadline: nextRetentionCheck,
        automated: true
      });
    }

    return {
      compliant,
      actions,
      legalBasisValid,
      retentionValid
    };
  }

  /**
   * Generate automated compliance audit request
   */
  async generateComplianceAudit(
    targetSystem: string,
    dataTypes: string[],
    classification: NSMClassification
  ): Promise<ComplianceAuditRequest> {
    return {
      scope: 'both', // Both GDPR and NSM
      targetSystem,
      classification,
      dataTypes,
      includeRecommendations: true
    };
  }

  /**
   * Schedule automated compliance actions
   */
  async scheduleAutomatedActions(
    systemId: string,
    actions: ComplianceAction[]
  ): Promise<void> {
    const automatedActions = actions.filter(action => action.automated);
    
    if (automatedActions.length > 0) {
      this.scheduledActions.set(systemId, automatedActions);
      
      this.logger.info('Automated compliance actions scheduled', {
        systemId,
        actionsCount: automatedActions.length,
        nsmClassification: 'RESTRICTED' as NSMClassification
      });
    }
  }

  private initializeAutomationRules(): void {
    // Norwegian Personal Number rules
    this.automationRules.set('norwegianPersonalNumber', [
      {
        condition: 'source === "bankid"',
        classification: 'CONFIDENTIAL',
        description: 'BankID personal numbers are confidential'
      },
      {
        condition: 'source !== "bankid"',
        classification: 'RESTRICTED',
        description: 'Non-BankID personal numbers are restricted'
      }
    ]);

    // Health data rules
    this.automationRules.set('healthData', [
      {
        condition: 'source in ["bankid", "buypass", "commfides"]',
        classification: 'SECRET',
        description: 'Health data from government sources is secret'
      }
    ]);
  }

  private validateNorwegianPersonalNumber(personalNumber: string): boolean {
    // Basic validation for Norwegian personal number (11 digits)
    if (!/^\d{11}$/.test(personalNumber)) {
      return false;
    }

    // Enhanced validation would include checksum validation
    // For now, basic format check
    const day = parseInt(personalNumber.substring(0, 2));
    const month = parseInt(personalNumber.substring(2, 4));

    // Basic date validation
    if (day < 1 || day > 31 || month < 1 || month > 12) {
      return false;
    }

    return true;
  }

  private async checkGDPRCompliance(authData: Record<string, unknown>): Promise<boolean> {
    // Simplified GDPR check - in production would be more comprehensive
    const hasPersonalData = authData.personalNumber || authData.attributes;
    
    if (hasPersonalData) {
      // Check if proper legal basis is established
      // Check if data minimization is applied
      // Check if retention policies are in place
      return this.config.enableGDPRAutomation;
    }
    
    return true;
  }

  private isPersonalData(dataType: string): boolean {
    const personalDataTypes = [
      'norwegianPersonalNumber',
      'email',
      'phoneNumber',
      'name',
      'address',
      'ipAddress',
      'deviceId',
      'biometric',
      'locationData',
      'healthData',
      'financialData',
      'communicationMetadata'
    ];
    
    return personalDataTypes.includes(dataType);
  }

  private shouldRecommendMFA(authData: { securityLevel: number; provider: string }): boolean {
    // Recommend MFA for lower security levels
    return authData.securityLevel < 4 || authData.provider !== 'bankid';
  }

  private getReviewInterval(classification: NSMClassification): number {
    // Return review interval in milliseconds
    switch (classification) {
      case 'SECRET':
        return 30 * 24 * 60 * 60 * 1000; // 30 days
      case 'CONFIDENTIAL':
        return 60 * 24 * 60 * 60 * 1000; // 60 days
      case 'RESTRICTED':
        return 90 * 24 * 60 * 60 * 1000; // 90 days
      case 'OPEN':
      default:
        return 180 * 24 * 60 * 60 * 1000; // 180 days
    }
  }

  static create(
    config: Partial<NorwegianComplianceConfig>,
    logger: Logger
  ): NorwegianComplianceAutomation {
    const defaultConfig: NorwegianComplianceConfig = {
      enableAutomaticClassification: true,
      enableGDPRAutomation: true,
      enableAuditTrail: true,
      enablePersonalNumberValidation: true,
      defaultClassification: 'RESTRICTED',
      auditIntervalDays: 90
    };

    return new NorwegianComplianceAutomation(
      { ...defaultConfig, ...config },
      logger
    );
  }
}

interface ComplianceRule {
  readonly condition: string;
  readonly classification: NSMClassification;
  readonly description: string;
}