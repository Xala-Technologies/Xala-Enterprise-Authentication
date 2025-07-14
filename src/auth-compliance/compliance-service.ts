/**
 * Compliance Service Implementation
 * Main entry point for compliance operations
 * Enterprise Standards v4.0.0 compliant
 */

import { DefaultComplianceAuditor } from './compliance-auditor.js';
import { DefaultGDPRComplianceManager } from './gdpr-compliance-manager.js';
import { DefaultNSMComplianceManager } from './nsm-compliance-manager.js';
import type {
  ComplianceService,
  GDPRComplianceManager,
  NSMComplianceManager,
  ComplianceAuditor,
  ComplianceAuditRequest,
  ComplianceAuditResult,
  ComplianceStatus,
  ComplianceReport,
  ComplianceIssue,
} from './types.js';

export class DefaultComplianceService implements ComplianceService {
  readonly gdpr: GDPRComplianceManager;
  readonly nsm: NSMComplianceManager;
  readonly auditor: ComplianceAuditor;

  constructor(config?: {
    gdprManager?: GDPRComplianceManager;
    nsmManager?: NSMComplianceManager;
    auditor?: ComplianceAuditor;
  }) {
    this.gdpr = config?.gdprManager ?? DefaultGDPRComplianceManager.create();
    this.nsm = config?.nsmManager ?? DefaultNSMComplianceManager.create();
    this.auditor =
      config?.auditor ?? DefaultComplianceAuditor.create(this.gdpr, this.nsm);
  }

  async performAudit(
    request: ComplianceAuditRequest,
  ): Promise<ComplianceAuditResult> {
    return this.auditor.audit(request);
  }

  async getComplianceStatus(): Promise<ComplianceStatus> {
    // Check both GDPR and NSM compliance
    const gdprCompliant = await this.gdpr.checkCompliance();
    const nsmCompliant = await this.nsm.checkCompliance();

    // Get audit history
    const history = await this.auditor.getAuditHistory(1);
    const lastAudit = history[0]?.timestamp ?? new Date(0);

    // Get next scheduled audit
    const nextAudit =
      (await this.auditor.getNextScheduledAudit()) ??
      new Date(Date.now() + 90 * 24 * 60 * 60 * 1000); // Default 90 days

    // Count issues from reports
    const gdprReport = await this.gdpr.getComplianceReport();
    const nsmReport = await this.nsm.getComplianceReport();

    const allIssues = [...gdprReport.issues, ...nsmReport.issues];

    return {
      gdprCompliant,
      nsmCompliant,
      lastAudit,
      nextAudit,
      criticalIssues: allIssues.filter((i) => i.severity === 'CRITICAL').length,
      highIssues: allIssues.filter((i) => i.severity === 'HIGH').length,
      mediumIssues: allIssues.filter((i) => i.severity === 'MEDIUM').length,
      lowIssues: allIssues.filter((i) => i.severity === 'LOW').length,
    };
  }

  async exportComplianceReport(
    format: 'json' | 'pdf' | 'html',
  ): Promise<Uint8Array> {
    // Gather all compliance data
    const status = await this.getComplianceStatus();
    const gdprReport = await this.gdpr.getComplianceReport();
    const nsmReport = await this.nsm.getComplianceReport();
    const privacyNotice = await this.gdpr.generatePrivacyNotice();
    const securityReport = await this.nsm.generateSecurityReport();

    const report: ComplianceReport = {
      id: `report-${Date.now()}-${Math.random().toString(36).substring(7)}`,
      generatedAt: new Date(),
      compliance: {
        gdpr: status.gdprCompliant,
        nsm: status.nsmCompliant,
      },
      issues: [],
      controls: [],
      recommendations: [],
    };

    switch (format) {
      case 'json':
        return new TextEncoder().encode(JSON.stringify(report, null, 2));

      case 'html':
        return new TextEncoder().encode(this.generateHTMLReport(report));

      case 'pdf':
        // In production, use a PDF generation library
        throw new Error('PDF export not implemented. Use JSON or HTML format.');

      default:
        throw new Error(`Unsupported format: ${format}`);
    }
  }

  private generateHTMLReport(report: ComplianceReport): string {
    // Calculate compliance status from the report data
    const gdprCompliant = report.compliance.gdpr ?? false;
    const nsmCompliant = report.compliance.nsm ?? false;

    // Count issues by severity
    const issueCounts = report.issues.reduce<Record<string, number>>(
      (counts, issue) => {
        counts[issue.severity] = (counts[issue.severity] || 0) + 1;
        return counts;
      },
      {},
    );

    return `
<!DOCTYPE html>
<html>
<head>
  <title>Compliance Report</title>
  <style>
    body { font-family: Arial, sans-serif; margin: 20px; }
    .section { margin: 20px 0; padding: 15px; border: 1px solid #ddd; }
    .status { padding: 10px; margin: 5px 0; border-radius: 4px; }
    .compliant { background-color: #d4edda; color: #155724; }
    .non-compliant { background-color: #f8d7da; color: #721c24; }
    table { border-collapse: collapse; width: 100%; }
    th, td { border: 1px solid #ddd; padding: 8px; text-align: left; }
    th { background-color: #f8f9fa; }
  </style>
</head>
<body>
  <h1>Compliance Report</h1>
  <p>Generated: ${report.generatedAt}</p>
  
  <div class="section">
    <h2>Compliance Status</h2>
    <div class="status ${gdprCompliant ? 'compliant' : 'non-compliant'}">
      GDPR Compliance: ${gdprCompliant ? 'COMPLIANT' : 'NON-COMPLIANT'}
    </div>
    <div class="status ${nsmCompliant ? 'compliant' : 'non-compliant'}">
      NSM Compliance: ${nsmCompliant ? 'COMPLIANT' : 'NON-COMPLIANT'}
    </div>
    
    <h3>Issue Summary</h3>
    <table>
      <tr>
        <th>Severity</th>
        <th>Count</th>
      </tr>
      <tr>
        <td>Critical</td>
        <td>${issueCounts.CRITICAL || 0}</td>
      </tr>
      <tr>
        <td>High</td>
        <td>${issueCounts.HIGH || 0}</td>
      </tr>
      <tr>
        <td>Medium</td>
        <td>${issueCounts.MEDIUM || 0}</td>
      </tr>
      <tr>
        <td>Low</td>
        <td>${issueCounts.LOW || 0}</td>
      </tr>
    </table>
  </div>
  
  <div class="section">
    <h2>Issues Found</h2>
    ${this.generateIssuesHTML(report.issues)}
  </div>
  
  <div class="section">
    <h2>Security Controls</h2>
    ${this.generateControlsHTML(report.controls)}
  </div>
  
  <div class="section">
    <h2>Recommendations</h2>
    ${this.generateRecommendationsHTML(report.recommendations)}
  </div>
</body>
</html>
`;
  }

  private generateIssuesHTML(issues: readonly ComplianceIssue[]): string {
    if (issues.length === 0) {
      return '<p>No compliance issues found.</p>';
    }

    return `
      <h3>Issues</h3>
      ${issues
    .map(
      (issue) => `
        <div class="issue ${issue.severity.toLowerCase()}">
          <strong>${issue.category}</strong>: ${issue.description}
          <br>
          <em>Recommendation:</em> ${issue.recommendation}
          ${issue.reference ? `<br><small>Reference: ${issue.reference}</small>` : ''}
        </div>
      `,
    )
    .join('')}
    `;
  }

  private generateControlsHTML(
    controls: readonly import('./types.js').SecurityControl[],
  ): string {
    return `
    <table>
      <tr>
        <th>Control</th>
        <th>Category</th>
        <th>Status</th>
        <th>Effectiveness</th>
      </tr>
      ${controls
    .map(
      (control) => `
        <tr>
          <td>${control.name}</td>
          <td>${control.category}</td>
          <td>${control.implemented ? 'Implemented' : 'Not Implemented'}</td>
          <td>${control.effectiveness ? `${control.effectiveness }%` : 'N/A'}</td>
        </tr>
      `,
    )
    .join('')}
    </table>
    `;
  }

  private generateRecommendationsHTML(
    recommendations: readonly import('./types.js').ComplianceRecommendation[],
  ): string {
    return `
    <table>
      <tr>
        <th>Priority</th>
        <th>Category</th>
        <th>Action</th>
        <th>Effort</th>
        <th>Impact</th>
      </tr>
      ${recommendations
    .map(
      (rec) => `
        <tr>
          <td>${rec.priority}</td>
          <td>${rec.category}</td>
          <td>${rec.action}</td>
          <td>${rec.effort}</td>
          <td>${rec.impact}</td>
        </tr>
      `,
    )
    .join('')}
    </table>
    `;
  }

  static create(config?: {
    gdprManager?: GDPRComplianceManager;
    nsmManager?: NSMComplianceManager;
    auditor?: ComplianceAuditor;
  }): DefaultComplianceService {
    return new DefaultComplianceService(config);
  }
}
