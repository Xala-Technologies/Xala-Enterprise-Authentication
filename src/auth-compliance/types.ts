/**
 * Compliance Module Types
 * Enterprise Standards v4.0.0 compliant
 */

import type { NSMClassification } from '../types/index.js';

/**
 * GDPR compliance check result
 */
export interface GDPRComplianceResult {
  readonly compliant: boolean;
  readonly issues: readonly ComplianceIssue[];
  readonly dataCategories: readonly DataCategory[];
  readonly legalBasis: LegalBasis;
  readonly retentionPeriod: number; // days
  readonly dataSubjectRights: readonly DataSubjectRight[];
  readonly timestamp: Date;
}

/**
 * NSM compliance check result
 */
export interface NSMComplianceResult {
  readonly compliant: boolean;
  readonly classification: NSMClassification;
  readonly requiredControls: readonly SecurityControl[];
  readonly implementedControls: readonly SecurityControl[];
  readonly missingControls: readonly SecurityControl[];
  readonly riskLevel: 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL';
  readonly timestamp: Date;
  readonly issues?: readonly ComplianceIssue[];
}

/**
 * Compliance issue
 */
export interface ComplianceIssue {
  readonly id: string;
  readonly severity: 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL';
  readonly category: string;
  readonly description: string;
  readonly recommendation: string;
  readonly reference?: string;
}

/**
 * Data category for GDPR
 */
export interface DataCategory {
  readonly name: string;
  readonly type: 'personal' | 'sensitive' | 'special';
  readonly fields: readonly string[];
  readonly purpose: string;
  readonly minimizationApplied: boolean;
}

/**
 * Legal basis for processing
 */
export type LegalBasis = 
  | 'consent'
  | 'contract'
  | 'legal_obligation'
  | 'vital_interests'
  | 'public_task'
  | 'legitimate_interests';

/**
 * Data subject rights
 */
export interface DataSubjectRight {
  readonly type: DataSubjectRightType;
  readonly enabled: boolean;
  readonly automatedProcess?: boolean;
  readonly responseTime?: number; // hours
}

export type DataSubjectRightType =
  | 'access'
  | 'rectification'
  | 'erasure'
  | 'portability'
  | 'restriction'
  | 'objection'
  | 'automated_decision_making';

/**
 * Security control for NSM
 */
export interface SecurityControl {
  readonly id: string;
  readonly name: string;
  readonly category: SecurityControlCategory;
  readonly required: boolean;
  readonly implemented: boolean;
  readonly effectiveness?: number; // 0-100
}

export type SecurityControlCategory =
  | 'access_control'
  | 'encryption'
  | 'monitoring'
  | 'incident_response'
  | 'vulnerability_management'
  | 'security_testing'
  | 'training';

/**
 * Compliance audit request
 */
export interface ComplianceAuditRequest {
  readonly scope: AuditScope;
  readonly targetSystem: string;
  readonly classification: NSMClassification;
  readonly dataTypes: readonly string[];
  readonly includeRecommendations: boolean;
}

export type AuditScope = 'gdpr' | 'nsm' | 'both';

/**
 * Compliance audit result
 */
export interface ComplianceAuditResult {
  readonly id: string;
  readonly timestamp: Date;
  readonly scope: AuditScope;
  readonly gdprResult?: GDPRComplianceResult;
  readonly nsmResult?: NSMComplianceResult;
  readonly overallCompliant: boolean;
  readonly recommendations: readonly ComplianceRecommendation[];
  readonly nextAuditDate: Date;
}

/**
 * Compliance recommendation
 */
export interface ComplianceRecommendation {
  readonly priority: 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL';
  readonly category: string;
  readonly action: string;
  readonly effort: 'LOW' | 'MEDIUM' | 'HIGH';
  readonly impact: 'LOW' | 'MEDIUM' | 'HIGH';
  readonly deadline?: Date;
}

/**
 * Compliance manager interface
 */
export interface ComplianceManager {
  checkCompliance(): Promise<boolean>;
  getComplianceReport(): Promise<ComplianceReport>;
  implementControl(controlId: string): Promise<void>;
  scheduleAudit(date: Date): Promise<void>;
}

/**
 * Compliance report
 */
export interface ComplianceReport {
  readonly id: string;
  readonly generatedAt: Date;
  readonly compliance: Record<string, boolean>;
  readonly issues: readonly ComplianceIssue[];
  readonly controls: readonly SecurityControl[];
  readonly recommendations: readonly ComplianceRecommendation[];
}

/**
 * Compliance service interface
 */
export interface ComplianceService {
  readonly gdpr: GDPRComplianceManager;
  readonly nsm: NSMComplianceManager;
  readonly auditor: ComplianceAuditor;
  
  performAudit(request: ComplianceAuditRequest): Promise<ComplianceAuditResult>;
  getComplianceStatus(): Promise<ComplianceStatus>;
  exportComplianceReport(format: 'json' | 'pdf' | 'html'): Promise<Uint8Array>;
}

/**
 * GDPR compliance manager interface
 */
export interface GDPRComplianceManager extends ComplianceManager {
  checkDataMinimization(): Promise<boolean>;
  checkLegalBasis(dataType: string): Promise<LegalBasis | null>;
  checkDataSubjectRights(): Promise<DataSubjectRight[]>;
  generatePrivacyNotice(): Promise<string>;
  handleDataRequest(type: DataSubjectRightType, userId: string): Promise<void>;
}

/**
 * NSM compliance manager interface
 */
export interface NSMComplianceManager extends ComplianceManager {
  checkClassificationCompliance(data: unknown, classification: NSMClassification): Promise<boolean>;
  getRequiredControls(classification: NSMClassification): Promise<SecurityControl[]>;
  assessRiskLevel(): Promise<'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL'>;
  generateSecurityReport(): Promise<string>;
}

/**
 * Compliance auditor interface
 */
export interface ComplianceAuditor {
  audit(request: ComplianceAuditRequest): Promise<ComplianceAuditResult>;
  scheduleAudit(request: ComplianceAuditRequest, date: Date): Promise<string>;
  getAuditHistory(limit?: number): Promise<ComplianceAuditResult[]>;
  getNextScheduledAudit(): Promise<Date | null>;
}

/**
 * Overall compliance status
 */
export interface ComplianceStatus {
  readonly gdprCompliant: boolean;
  readonly nsmCompliant: boolean;
  readonly lastAudit: Date;
  readonly nextAudit: Date;
  readonly criticalIssues: number;
  readonly highIssues: number;
  readonly mediumIssues: number;
  readonly lowIssues: number;
}