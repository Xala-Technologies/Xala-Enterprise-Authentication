/**
 * NSM Compliance Manager Implementation
 * Handles Norwegian NSM security compliance
 * Enterprise Standards v4.0.0 compliant
 */

import type { NSMClassification } from '../types/index.js';
import {
  NSMClassificationLevels,
  validateNSMClassification,
} from '../utils/norwegian-compliance.js';

import type {
  NSMComplianceManager,
  NSMComplianceResult,
  SecurityControl,
  SecurityControlCategory,
  ComplianceReport,
  ComplianceIssue,
  ComplianceRecommendation,
} from './types.js';

export class DefaultNSMComplianceManager implements NSMComplianceManager {
  private readonly controls: Map<string, SecurityControl> = new Map();
  private readonly classificationControls: Map<NSMClassification, Set<string>> =
    new Map();

  constructor() {
    this.initializeSecurityControls();
    this.mapClassificationControls();
  }

  async checkCompliance(): Promise<boolean> {
    // Check if all required controls are implemented
    const requiredControls = Array.from(this.controls.values()).filter(
      (c) => c.required,
    );
    const implementedControls = requiredControls.filter((c) => c.implemented);

    return requiredControls.length === implementedControls.length;
  }

  async getComplianceReport(): Promise<ComplianceReport> {
    const issues: ComplianceIssue[] = [];
    const controls = Array.from(this.controls.values());

    // Check for missing required controls
    const missingControls = controls.filter(
      (c) => c.required && !c.implemented,
    );
    for (const control of missingControls) {
      issues.push({
        id: `nsm-control-${control.id}`,
        severity: this.getControlSeverity(control),
        category: control.category,
        description: `Required security control not implemented: ${control.name}`,
        recommendation: `Implement ${control.name} to meet NSM requirements`,
        reference: 'NSM Grunnprinsipper for IKT-sikkerhet',
      });
    }

    // Check control effectiveness
    const ineffectiveControls = controls.filter(
      (c) =>
        c.implemented && c.effectiveness !== undefined && c.effectiveness < 70,
    );
    for (const control of ineffectiveControls) {
      issues.push({
        id: `nsm-effectiveness-${control.id}`,
        severity: 'MEDIUM',
        category: control.category,
        description: `Control effectiveness below threshold: ${control.name} (${control.effectiveness}%)`,
        recommendation: `Improve effectiveness of ${control.name} to at least 70%`,
      });
    }

    const compliance: Record<string, boolean> = {
      accessControl: this.checkCategoryCompliance('access_control'),
      encryption: this.checkCategoryCompliance('encryption'),
      monitoring: this.checkCategoryCompliance('monitoring'),
      incidentResponse: this.checkCategoryCompliance('incident_response'),
      vulnerabilityManagement: this.checkCategoryCompliance(
        'vulnerability_management',
      ),
      securityTesting: this.checkCategoryCompliance('security_testing'),
      training: this.checkCategoryCompliance('training'),
    };

    return {
      id: `nsm-report-${Date.now()}`,
      generatedAt: new Date(),
      compliance,
      issues,
      controls,
      recommendations: this.generateRecommendations(issues, controls),
    };
  }

  async checkClassificationCompliance(
    data: unknown,
    classification: NSMClassification,
  ): Promise<boolean> {
    // Get required controls for classification
    const requiredControlIds =
      this.classificationControls.get(classification) ?? new Set();

    // Check if all required controls are implemented
    for (const controlId of requiredControlIds) {
      const control = this.controls.get(controlId);
      if (!control?.implemented) {
        return false;
      }
    }

    // Additional checks based on classification
    switch (classification) {
      case 'SECRET':
        return this.checkSecretCompliance(data);
      case 'CONFIDENTIAL':
        return this.checkConfidentialCompliance(data);
      case 'RESTRICTED':
        return this.checkRestrictedCompliance(data);
      case 'OPEN':
        return true; // Minimal requirements for OPEN
      default:
        return false;
    }
  }

  async getRequiredControls(
    classification: NSMClassification,
  ): Promise<SecurityControl[]> {
    const controlIds =
      this.classificationControls.get(classification) ?? new Set();
    const controls: SecurityControl[] = [];

    for (const controlId of controlIds) {
      const control = this.controls.get(controlId);
      if (control) {
        controls.push(control);
      }
    }

    return controls;
  }

  async assessRiskLevel(): Promise<'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL'> {
    const controls = Array.from(this.controls.values());
    const requiredControls = controls.filter((c) => c.required);
    const implementedControls = requiredControls.filter((c) => c.implemented);

    const implementationRate =
      implementedControls.length / requiredControls.length;
    const avgEffectiveness =
      this.calculateAverageEffectiveness(implementedControls);

    // Risk assessment based on implementation and effectiveness
    if (implementationRate < 0.5 || avgEffectiveness < 50) {
      return 'CRITICAL';
    } else if (implementationRate < 0.7 || avgEffectiveness < 60) {
      return 'HIGH';
    } else if (implementationRate < 0.9 || avgEffectiveness < 70) {
      return 'MEDIUM';
    } else {
      return 'LOW';
    }
  }

  async generateSecurityReport(): Promise<string> {
    const riskLevel = await this.assessRiskLevel();
    const controls = Array.from(this.controls.values());
    const requiredControls = controls.filter((c) => c.required);
    const implementedControls = requiredControls.filter((c) => c.implemented);

    const report = `
# NSM Security Compliance Report

Generated: ${new Date().toISOString()}

## Executive Summary
- Risk Level: ${riskLevel}
- Control Implementation: ${implementedControls.length}/${requiredControls.length} (${Math.round((implementedControls.length / requiredControls.length) * 100)}%)
- Average Effectiveness: ${this.calculateAverageEffectiveness(implementedControls)}%

## Control Categories

### Access Control
${this.generateCategoryReport('access_control')}

### Encryption
${this.generateCategoryReport('encryption')}

### Monitoring
${this.generateCategoryReport('monitoring')}

### Incident Response
${this.generateCategoryReport('incident_response')}

### Vulnerability Management
${this.generateCategoryReport('vulnerability_management')}

## Recommendations
${this.generateSecurityRecommendations()}

## Compliance Status
This report confirms ${implementedControls.length === requiredControls.length ? 'FULL' : 'PARTIAL'} compliance with NSM Grunnprinsipper for IKT-sikkerhet.

---
*This report is classified as ${this.getReportClassification()} according to NSM guidelines*
`;

    return report;
  }

  async implementControl(controlId: string): Promise<void> {
    const control = this.controls.get(controlId);
    if (!control) {
      throw new Error(`Control ${controlId} not found`);
    }

    // Mark control as implemented
    this.controls.set(controlId, {
      ...control,
      implemented: true,
      effectiveness: 80, // Default effectiveness
    });
  }

  async scheduleAudit(date: Date): Promise<void> {
    console.log(`NSM compliance audit scheduled for ${date.toISOString()}`);
  }

  private initializeSecurityControls(): void {
    // Access Control
    this.addControl({
      id: 'ac-1',
      name: 'Multi-Factor Authentication',
      category: 'access_control',
      required: true,
      implemented: true,
      effectiveness: 95,
    });

    this.addControl({
      id: 'ac-2',
      name: 'Role-Based Access Control',
      category: 'access_control',
      required: true,
      implemented: true,
      effectiveness: 90,
    });

    this.addControl({
      id: 'ac-3',
      name: 'Session Management',
      category: 'access_control',
      required: true,
      implemented: true,
      effectiveness: 85,
    });

    // Encryption
    this.addControl({
      id: 'enc-1',
      name: 'Data at Rest Encryption',
      category: 'encryption',
      required: true,
      implemented: false,
      effectiveness: 0,
    });

    this.addControl({
      id: 'enc-2',
      name: 'Data in Transit Encryption',
      category: 'encryption',
      required: true,
      implemented: true,
      effectiveness: 95,
    });

    this.addControl({
      id: 'enc-3',
      name: 'Key Management',
      category: 'encryption',
      required: true,
      implemented: true,
      effectiveness: 80,
    });

    // Monitoring
    this.addControl({
      id: 'mon-1',
      name: 'Security Event Logging',
      category: 'monitoring',
      required: true,
      implemented: true,
      effectiveness: 85,
    });

    this.addControl({
      id: 'mon-2',
      name: 'Intrusion Detection',
      category: 'monitoring',
      required: false,
      implemented: false,
      effectiveness: 0,
    });

    // Incident Response
    this.addControl({
      id: 'ir-1',
      name: 'Incident Response Plan',
      category: 'incident_response',
      required: true,
      implemented: true,
      effectiveness: 75,
    });

    this.addControl({
      id: 'ir-2',
      name: 'Automated Alerting',
      category: 'incident_response',
      required: true,
      implemented: true,
      effectiveness: 90,
    });
  }

  private mapClassificationControls(): void {
    // OPEN - Basic controls
    this.classificationControls.set('OPEN', new Set(['ac-1', 'enc-2']));

    // RESTRICTED - Additional controls
    this.classificationControls.set(
      'RESTRICTED',
      new Set(['ac-1', 'ac-2', 'ac-3', 'enc-2', 'mon-1', 'ir-1']),
    );

    // CONFIDENTIAL - Most controls
    this.classificationControls.set(
      'CONFIDENTIAL',
      new Set([
        'ac-1',
        'ac-2',
        'ac-3',
        'enc-1',
        'enc-2',
        'enc-3',
        'mon-1',
        'mon-2',
        'ir-1',
        'ir-2',
      ]),
    );

    // SECRET - All controls
    const allControlIds = Array.from(this.controls.keys());
    this.classificationControls.set('SECRET', new Set(allControlIds));
  }

  private addControl(control: SecurityControl): void {
    this.controls.set(control.id, control);
  }

  private checkCategoryCompliance(category: SecurityControlCategory): boolean {
    const categoryControls = Array.from(this.controls.values()).filter(
      (c) => c.category === category && c.required,
    );

    return categoryControls.every((c) => c.implemented);
  }

  private getControlSeverity(
    control: SecurityControl,
  ): 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL' {
    if (
      control.category === 'encryption' ||
      control.category === 'access_control'
    ) {
      return 'CRITICAL';
    } else if (
      control.category === 'monitoring' ||
      control.category === 'incident_response'
    ) {
      return 'HIGH';
    } else {
      return 'MEDIUM';
    }
  }

  private calculateAverageEffectiveness(controls: SecurityControl[]): number {
    const effectiveControls = controls.filter(
      (c) => c.effectiveness !== undefined,
    );
    if (effectiveControls.length === 0) { return 0; }

    const sum = effectiveControls.reduce(
      (total, c) => total + (c.effectiveness ?? 0),
      0,
    );
    return Math.round(sum / effectiveControls.length);
  }

  private generateCategoryReport(category: SecurityControlCategory): string {
    const controls = Array.from(this.controls.values()).filter(
      (c) => c.category === category,
    );
    const implemented = controls.filter((c) => c.implemented);

    return controls
      .map(
        (c) =>
          `- ${c.name}: ${c.implemented ? '✓' : '✗'} ${c.effectiveness ? `(${c.effectiveness}% effective)` : ''}`,
      )
      .join('\n');
  }

  private generateRecommendations(
    issues: ComplianceIssue[],
    controls: SecurityControl[],
  ): ComplianceRecommendation[] {
    const recommendations = [];

    // Priority 1: Implement missing critical controls
    const missingCritical = controls.filter(
      (c) =>
        c.required &&
        !c.implemented &&
        (c.category === 'encryption' || c.category === 'access_control'),
    );

    if (missingCritical.length > 0) {
      recommendations.push({
        priority: 'CRITICAL' as const,
        category: 'Security Controls',
        action: `Implement missing critical controls: ${missingCritical.map((c) => c.name).join(', ')}`,
        effort: 'HIGH' as const,
        impact: 'HIGH' as const,
        deadline: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000), // 30 days
      });
    }

    return recommendations;
  }

  private generateSecurityRecommendations(): string {
    const recommendations = [];

    const missingControls = Array.from(this.controls.values()).filter(
      (c) => c.required && !c.implemented,
    );
    if (missingControls.length > 0) {
      recommendations.push(
        `1. Implement missing controls: ${missingControls.map((c) => c.name).join(', ')}`,
      );
    }

    const lowEffectiveness = Array.from(this.controls.values()).filter(
      (c) =>
        c.implemented && c.effectiveness !== undefined && c.effectiveness < 70,
    );
    if (lowEffectiveness.length > 0) {
      recommendations.push(
        `2. Improve effectiveness of: ${lowEffectiveness.map((c) => c.name).join(', ')}`,
      );
    }

    recommendations.push('3. Schedule regular security assessments');
    recommendations.push('4. Maintain security awareness training');

    return recommendations.join('\n');
  }

  private checkSecretCompliance(data: unknown): boolean {
    // SECRET data requires all controls
    return Array.from(this.controls.values()).every(
      (c) => !c.required || c.implemented,
    );
  }

  private checkConfidentialCompliance(data: unknown): boolean {
    // CONFIDENTIAL requires encryption and strong access control
    const requiredCategories: SecurityControlCategory[] = [
      'encryption',
      'access_control',
      'monitoring',
    ];
    return requiredCategories.every((cat) => this.checkCategoryCompliance(cat));
  }

  private checkRestrictedCompliance(data: unknown): boolean {
    // RESTRICTED requires basic security controls
    return (
      this.checkCategoryCompliance('access_control') &&
      this.controls.get('enc-2')?.implemented === true
    );
  }

  private getReportClassification(): NSMClassification {
    // Report classification based on highest data classification handled
    return 'RESTRICTED'; // Default for security reports
  }

  static create(): DefaultNSMComplianceManager {
    return new DefaultNSMComplianceManager();
  }
}
