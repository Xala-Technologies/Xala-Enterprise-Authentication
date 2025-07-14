/**
 * Compliance Auditor Implementation
 * Performs comprehensive compliance audits
 * Enterprise Standards v4.0.0 compliant
 */

import type { NSMClassification } from '../types/index.js';

import type {
  ComplianceAuditor,
  ComplianceAuditRequest,
  ComplianceAuditResult,
  ComplianceRecommendation,
  GDPRComplianceResult,
  NSMComplianceResult,
  AuditScope,
  GDPRComplianceManager,
  NSMComplianceManager,
  SecurityControl,
} from './types.js';

export class DefaultComplianceAuditor implements ComplianceAuditor {
  private readonly auditHistory: ComplianceAuditResult[] = [];
  private readonly scheduledAudits: Map<
    string,
    { request: ComplianceAuditRequest; date: Date }
  > = new Map();

  constructor(
    private readonly gdprManager: GDPRComplianceManager,
    private readonly nsmManager: NSMComplianceManager,
  ) {}

  async audit(request: ComplianceAuditRequest): Promise<ComplianceAuditResult> {
    const auditId = `audit-${Date.now()}-${Math.random().toString(36).substring(7)}`;
    const timestamp = new Date();

    let gdprResult;
    let nsmResult;

    // Perform GDPR audit if requested
    if (request.scope === 'gdpr' || request.scope === 'both') {
      gdprResult = await this.performGDPRAudit(request);
    }

    // Perform NSM audit if requested
    if (request.scope === 'nsm' || request.scope === 'both') {
      nsmResult = await this.performNSMAudit(request);
    }

    // Determine overall compliance
    const overallCompliant = this.determineOverallCompliance(
      gdprResult,
      nsmResult,
    );

    // Generate recommendations
    const recommendations = await this.generateRecommendations(
      gdprResult,
      nsmResult,
      request,
    );

    // Calculate next audit date
    const nextAuditDate = this.calculateNextAuditDate(
      overallCompliant,
      request.classification,
    );

    const result: ComplianceAuditResult = {
      id: auditId,
      timestamp,
      scope: request.scope,
      gdprResult,
      nsmResult,
      overallCompliant,
      recommendations,
      nextAuditDate,
    };

    // Store in history
    this.auditHistory.push(result);

    // Limit history size
    if (this.auditHistory.length > 100) {
      this.auditHistory.shift();
    }

    return result;
  }

  async scheduleAudit(
    request: ComplianceAuditRequest,
    date: Date,
  ): Promise<string> {
    const scheduleId = `schedule-${Date.now()}-${Math.random().toString(36).substring(7)}`;

    this.scheduledAudits.set(scheduleId, { request, date });

    // In a real implementation, this would integrate with a job scheduler
    console.log(
      `Audit scheduled with ID ${scheduleId} for ${date.toISOString()}`,
    );

    return scheduleId;
  }

  async getAuditHistory(limit: number = 10): Promise<ComplianceAuditResult[]> {
    // Return most recent audits
    return this.auditHistory.slice(-limit).reverse();
  }

  async getNextScheduledAudit(): Promise<Date | null> {
    const now = new Date();
    let nextDate: Date | null = null;

    for (const [, schedule] of this.scheduledAudits) {
      if (schedule.date > now) {
        if (!nextDate || schedule.date < nextDate) {
          nextDate = schedule.date;
        }
      }
    }

    return nextDate;
  }

  private async performGDPRAudit(
    request: ComplianceAuditRequest,
  ): Promise<GDPRComplianceResult> {
    const compliant = await this.gdprManager.checkCompliance();
    const rights = await this.gdprManager.checkDataSubjectRights();
    const issues = [];
    const dataCategories = [];

    // Check data types for GDPR compliance
    for (const dataType of request.dataTypes) {
      const legalBasis = await this.gdprManager.checkLegalBasis(dataType);
      if (!legalBasis) {
        issues.push({
          id: `gdpr-${dataType}`,
          severity: 'CRITICAL' as const,
          category: 'Legal Basis',
          description: `No legal basis for processing ${dataType}`,
          recommendation: 'Establish legal basis before processing',
        });
      }

      dataCategories.push({
        name: dataType,
        type: this.categorizeDataType(dataType),
        fields: [],
        purpose: 'Authentication and authorization',
        minimizationApplied: true,
      });
    }

    return {
      compliant,
      issues,
      dataCategories,
      legalBasis: 'contract' as const,
      retentionPeriod: 365, // days
      dataSubjectRights: rights,
      timestamp: new Date(),
    };
  }

  private async performNSMAudit(
    request: ComplianceAuditRequest,
  ): Promise<NSMComplianceResult> {
    const compliant = await this.nsmManager.checkCompliance();
    const requiredControls = await this.nsmManager.getRequiredControls(
      request.classification,
    );
    const implementedControls = requiredControls.filter((c) => c.implemented);
    const missingControls = requiredControls.filter((c) => !c.implemented);
    const riskLevel = await this.nsmManager.assessRiskLevel();

    return {
      compliant,
      classification: request.classification,
      requiredControls,
      implementedControls,
      missingControls,
      riskLevel,
      timestamp: new Date(),
    };
  }

  private determineOverallCompliance(
    gdprResult?: GDPRComplianceResult,
    nsmResult?: NSMComplianceResult,
  ): boolean {
    if (gdprResult && !gdprResult.compliant) { return false; }
    if (nsmResult && !nsmResult.compliant) { return false; }
    return true;
  }

  private async generateRecommendations(
    gdprResult: GDPRComplianceResult | undefined,
    nsmResult: NSMComplianceResult | undefined,
    request: ComplianceAuditRequest,
  ): Promise<ComplianceRecommendation[]> {
    const recommendations = [];

    // GDPR recommendations
    if (gdprResult?.issues && gdprResult.issues.length > 0) {
      recommendations.push({
        priority: 'CRITICAL' as const,
        category: 'GDPR Compliance',
        action: 'Address GDPR compliance issues immediately',
        effort: 'HIGH' as const,
        impact: 'HIGH' as const,
        deadline: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000), // 7 days
      });
    }

    // NSM recommendations
    if (nsmResult?.missingControls && nsmResult.missingControls.length > 0) {
      const criticalControls = nsmResult.missingControls.filter(
        (c: SecurityControl) =>
          c.category === 'encryption' || c.category === 'access_control',
      );

      if (criticalControls.length > 0) {
        recommendations.push({
          priority: 'CRITICAL' as const,
          category: 'Security Controls',
          action: `Implement critical security controls: ${criticalControls.map((c: SecurityControl) => c.name).join(', ')}`,
          effort: 'HIGH' as const,
          impact: 'HIGH' as const,
          deadline: new Date(Date.now() + 14 * 24 * 60 * 60 * 1000), // 14 days
        });
      }
    }

    // Risk-based recommendations
    if (
      nsmResult?.riskLevel === 'HIGH' ||
      nsmResult?.riskLevel === 'CRITICAL'
    ) {
      recommendations.push({
        priority: 'HIGH' as const,
        category: 'Risk Management',
        action: 'Conduct immediate risk assessment and mitigation',
        effort: 'MEDIUM' as const,
        impact: 'HIGH' as const,
      });
    }

    // Regular audit recommendation
    if (request.includeRecommendations) {
      recommendations.push({
        priority: 'MEDIUM' as const,
        category: 'Compliance Management',
        action: 'Establish regular compliance audit schedule',
        effort: 'LOW' as const,
        impact: 'MEDIUM' as const,
      });
    }

    return recommendations;
  }

  private calculateNextAuditDate(
    compliant: boolean,
    classification: NSMClassification,
  ): Date {
    const baseInterval = compliant ? 90 : 30; // days

    // Adjust based on classification
    let interval = baseInterval;
    switch (classification) {
      case 'SECRET':
        interval = Math.min(interval, 30);
        break;
      case 'CONFIDENTIAL':
        interval = Math.min(interval, 60);
        break;
      case 'RESTRICTED':
        interval = Math.min(interval, 90);
        break;
      default:
        interval = 180;
    }

    return new Date(Date.now() + interval * 24 * 60 * 60 * 1000);
  }

  private categorizeDataType(
    dataType: string,
  ): 'personal' | 'sensitive' | 'special' {
    const sensitiveTypes = [
      'norwegianPersonalNumber',
      'healthData',
      'biometric',
    ];
    const specialTypes = ['ethnicity', 'politicalOpinions', 'religiousBeliefs'];

    if (specialTypes.includes(dataType)) { return 'special'; }
    if (sensitiveTypes.includes(dataType)) { return 'sensitive'; }
    return 'personal';
  }

  static create(
    gdprManager: GDPRComplianceManager,
    nsmManager: NSMComplianceManager,
  ): DefaultComplianceAuditor {
    return new DefaultComplianceAuditor(gdprManager, nsmManager);
  }
}
