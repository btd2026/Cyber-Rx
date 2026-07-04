'use strict';

/**
 * Narrative Export Service
 *
 * Generates executive narratives in various formats (PDF, Word, PowerPoint)
 * Provides professional formatting for C-level stakeholders
 */
class NarrativeExportService {
  /**
   * Export narrative to PDF
   * @param {Object} narrative - Narrative object
   * @param {Object} options - Export options
   * @returns {Promise<Buffer>} PDF buffer
   */
  static async exportToPDF(narrative, options = {}) {
    // For now, return a structured object that can be converted to PDF
    // In production, use pdfkit or similar library
    const pdfContent = this._formatForPDF(narrative, options);

    // TODO: Implement actual PDF generation using pdfkit
    // const PDFDocument = require('pdfkit');
    // const doc = new PDFDocument();
    // ... build PDF document

    return {
      format: 'pdf',
      content: pdfContent,
      metadata: {
        title: `Executive Narrative - ${narrative.finding.title}`,
        subject: 'Cybersecurity Executive Report',
        author: 'CyberX-Ray',
        createdAt: new Date().toISOString()
      }
    };
  }

  /**
   * Export narrative to Word document
   * @param {Object} narrative - Narrative object
   * @param {Object} options - Export options
   * @returns {Promise<Buffer>} Word document buffer
   */
  static async exportToWord(narrative, options = {}) {
    // For now, return a structured object that can be converted to Word
    // In production, use docx library
    const wordContent = this._formatForWord(narrative, options);

    // TODO: Implement actual Word generation using docx library
    // const { Document, Packer, Paragraph, TextRun, HeadingLevel } = require('docx');
    // const doc = new Document({ ... });
    // const buffer = await Packer.toBuffer(doc);

    return {
      format: 'docx',
      content: wordContent,
      metadata: {
        title: `Executive Narrative - ${narrative.finding.title}`,
        subject: 'Cybersecurity Executive Report',
        author: 'CyberX-Ray',
        createdAt: new Date().toISOString()
      }
    };
  }

  /**
   * Export narrative to PowerPoint
   * @param {Object} narrative - Narrative object
   * @param {Object} options - Export options
   * @returns {Promise<Buffer>} PowerPoint buffer
   */
  static async exportToPowerPoint(narrative, options = {}) {
    // For now, return a structured object that can be converted to PowerPoint
    // In production, use pptxgenjs or similar library
    const pptContent = this._formatForPowerPoint(narrative, options);

    // TODO: Implement actual PowerPoint generation
    // const PptxGenJS = require('pptxgenjs');
    // const pptx = new PptxGenJS();
    // ... build slides

    return {
      format: 'pptx',
      content: pptContent,
      metadata: {
        title: `Executive Narrative - ${narrative.finding.title}`,
        subject: 'CyberSecurity Executive Briefing',
        author: 'CyberX-Ray',
        createdAt: new Date().toISOString()
      }
    };
  }

  /**
   * Generate executive summary (text format)
   * @param {Object} narrative - Narrative object
   * @param {Object} options - Export options
   * @returns {Promise<string>} Executive summary text
   */
  static async generateExecutiveSummary(narrative, options = {}) {
    const exec = narrative.executiveNarrative;
    const finding = narrative.finding;

    const summary = [];
    summary.push('='.repeat(80));
    summary.push('EXECUTIVE NARRATIVE');
    summary.push('='.repeat(80));
    summary.push('');
    summary.push(`Finding: ${finding.title}`);
    summary.push(`Severity: ${finding.severity}`);
    summary.push(`Status: ${finding.status}`);
    summary.push(`Discovered: ${finding.discoveredDate}`);
    summary.push(`Source: ${finding.source}`);
    summary.push('');
    summary.push('-'.repeat(80));
    summary.push('EXECUTIVE SUMMARY');
    summary.push('-'.repeat(80));
    summary.push(exec.summary);
    summary.push('');

    if (exec.businessProcess) {
      summary.push('-'.repeat(80));
      summary.push('BUSINESS PROCESS IMPACT');
      summary.push('-'.repeat(80));
      summary.push(`Process: ${exec.businessProcess.name}`);
      summary.push(`Tier: ${exec.businessProcess.tier} - ${exec.businessProcess.tierLabel || exec.businessProcess.tier}`);
      summary.push(`Criticality: ${exec.businessProcess.criticality}`);
      summary.push(`Owner: ${exec.businessProcess.owner}`);
      summary.push('');
    }

    if (exec.systemImpact) {
      summary.push('-'.repeat(80));
      summary.push('SYSTEM IMPACT');
      summary.push('-'.repeat(80));
      summary.push(`System: ${exec.systemImpact.system}`);
      summary.push(`Location: ${exec.systemImpact.location}`);
      if (exec.systemImpact.businessProcessesSupported) {
        summary.push(`Processes Supported: ${exec.systemImpact.businessProcessesSupported.join(', ')}`);
      }
      summary.push('');
    }

    if (exec.dataInvolvement && exec.dataInvolvement.length > 0) {
      summary.push('-'.repeat(80));
      summary.push('DATA INVOLVEMENT');
      summary.push('-'.repeat(80));
      exec.dataInvolvement.forEach(data => {
        summary.push(`Type: ${data.classification || data.type}`);
        if (data.volume) summary.push(`Volume: ${data.volume}`);
        summary.push(`Sensitivity: ${data.sensitivity}`);
        summary.push('');
      });
    }

    if (exec.threatScenario) {
      summary.push('-'.repeat(80));
      summary.push('THREAT SCENARIO');
      summary.push('-'.repeat(80));
      summary.push(`Type: ${exec.threatScenario.type}`);
      if (exec.threatScenario.name) summary.push(`Name: ${exec.threatScenario.name}`);
      summary.push(`Probability: ${exec.threatScenario.probability}% (${exec.threatScenario.probabilityLabel || 'High'})`);
      summary.push(`Impact Level: ${exec.threatScenario.impactLevel}`);
      if (exec.threatScenario.mitreTechnique) {
        summary.push(`MITRE ATT&CK: ${exec.threatScenario.mitreTechnique} - ${exec.threatScenario.mitreTechniqueName || ''}`);
        if (exec.threatScenario.mitreTactic) {
          summary.push(`Tactic: ${exec.threatScenario.mitreTactic}`);
        }
      }
      summary.push('');
    }

    if (exec.financialExposure) {
      summary.push('-'.repeat(80));
      summary.push('FINANCIAL EXPOSURE');
      summary.push('-'.repeat(80));
      summary.push(`Total Gross Exposure: $${this._formatCurrency(exec.financialExposure.totalGrossExposure)}`);
      summary.push(`Net Exposure: $${this._formatCurrency(exec.financialExposure.netExposure)}`);
      if (exec.financialExposure.insuranceCoverage > 0) {
        summary.push(`Insurance Coverage: $${this._formatCurrency(exec.financialExposure.insuranceCoverage)}`);
      }
      summary.push('');
      summary.push('Breakdown:');
      const breakdown = exec.financialExposure.breakdown || {};
      if (breakdown.breachResponseCost) {
        summary.push(`  - Breach Response Costs: $${this._formatCurrency(breakdown.breachResponseCost)}`);
      }
      if (breakdown.regulatoryFine) {
        summary.push(`  - Regulatory Fines: $${this._formatCurrency(breakdown.regulatoryFine)}`);
      }
      if (breakdown.businessInterruption) {
        summary.push(`  - Business Interruption: $${this._formatCurrency(breakdown.businessInterruption)}`);
      }
      if (breakdown.reputationalLoss) {
        summary.push(`  - Reputational Loss: $${this._formatCurrency(breakdown.reputationalLoss)}`);
      }
      if (breakdown.legalCosts) {
        summary.push(`  - Legal Costs: $${this._formatCurrency(breakdown.legalCosts)}`);
      }
      summary.push('');
    }

    if (exec.regulatoryObligations && exec.regulatoryObligations.length > 0) {
      summary.push('-'.repeat(80));
      summary.push('REGULATORY OBLIGATIONS');
      summary.push('-'.repeat(80));
      exec.regulatoryObligations.forEach(obligation => {
        summary.push(`Obligation: ${obligation.name}`);
        summary.push(`Source: ${obligation.source}`);
        if (obligation.citation) summary.push(`Citation: ${obligation.citation}`);
        if (obligation.notificationTimeline) {
          const urgency = obligation.urgency === 'critical' ? ' [URGENT]' : obligation.urgency === 'high' ? ' [HIGH]' : '';
          summary.push(`Notification Timeline: ${obligation.notificationTimeline}${urgency}`);
        }
        if (obligation.maxPenalty) summary.push(`Max Penalty: ${obligation.maxPenalty}`);
        summary.push('');
      });
    }

    if (exec.executiveOwnership) {
      summary.push('-'.repeat(80));
      summary.push('EXECUTIVE OWNERSHIP');
      summary.push('-'.repeat(80));
      if (exec.executiveOwnership.remediation) {
        summary.push(`Remediation Owner: ${exec.executiveOwnership.remediation.name || exec.executiveOwnership.remediation.roleId}`);
        if (exec.executiveOwnership.remediation.email) {
          summary.push(`Email: ${exec.executiveOwnership.remediation.email}`);
        }
        summary.push(`Responsibility: ${exec.executiveOwnership.remediation.responsibility}`);
        summary.push('');
      }
      if (exec.executiveOwnership.validation) {
        summary.push(`Validation Owner: ${exec.executiveOwnership.validation.name || exec.executiveOwnership.validation.roleId}`);
        if (exec.executiveOwnership.validation.email) {
          summary.push(`Email: ${exec.executiveOwnership.validation.email}`);
        }
        summary.push(`Responsibility: ${exec.executiveOwnership.validation.responsibility}`);
        summary.push('');
      }
      if (exec.executiveOwnership.legal) {
        summary.push(`Legal Owner: ${exec.executiveOwnership.legal.name || exec.executiveOwnership.legal.roleId}`);
        if (exec.executiveOwnership.legal.email) {
          summary.push(`Email: ${exec.executiveOwnership.legal.email}`);
        }
        summary.push(`Responsibility: ${exec.executiveOwnership.legal.responsibility}`);
        summary.push('');
      }
    }

    if (exec.auditEvidence) {
      summary.push('-'.repeat(80));
      summary.push('AUDIT EVIDENCE');
      summary.push('-'.repeat(80));
      summary.push(`Required: ${exec.auditEvidence.required ? 'Yes' : 'No'}`);
      if (exec.auditEvidence.description) {
        summary.push(`Description: ${exec.auditEvidence.description}`);
      }
      if (exec.auditEvidence.tests && exec.auditEvidence.tests.length > 0) {
        summary.push(`Required Tests: ${exec.auditEvidence.tests.join(', ')}`);
      }
      if (exec.auditEvidence.lastEvidenceDate) {
        summary.push(`Last Evidence: ${exec.auditEvidence.lastEvidenceDate}`);
      }
      summary.push('');
    }

    if (exec.recommendedActions && exec.recommendedActions.length > 0) {
      summary.push('-'.repeat(80));
      summary.push('RECOMMENDED ACTIONS');
      summary.push('-'.repeat(80));
      exec.recommendedActions.forEach((action, index) => {
        const priorityLabel = action.priority === 1 ? 'CRITICAL' : action.priority === 2 ? 'HIGH' : 'MEDIUM';
        summary.push(`${index + 1}. [${priorityLabel}] ${action.action}`);
        summary.push(`   Owner: ${action.owner}`);
        summary.push(`   Target Date: ${action.targetDate}`);
        summary.push(`   Status: ${action.status}`);
        summary.push('');
      });
    }

    summary.push('='.repeat(80));
    summary.push('Generated by CyberX-Ray');
    summary.push(`Generated: ${new Date().toISOString()}`);
    summary.push('='.repeat(80));

    return summary.join('\n');
  }

  /**
   * Format narrative content for PDF
   * @private
   */
  static _formatForPDF(narrative, options) {
    return {
      title: `Executive Narrative - ${narrative.finding.title}`,
      sections: [
        {
          heading: 'Executive Summary',
          content: narrative.executiveNarrative.summary
        },
        {
          heading: 'Finding Details',
          content: {
            title: narrative.finding.title,
            severity: narrative.finding.severity,
            status: narrative.finding.status,
            discoveredDate: narrative.finding.discoveredDate,
            source: narrative.finding.source
          }
        },
        {
          heading: 'Business Process Impact',
          content: narrative.executiveNarrative.businessProcess
        },
        {
          heading: 'Financial Exposure',
          content: narrative.executiveNarrative.financialExposure
        },
        {
          heading: 'Regulatory Obligations',
          content: narrative.executiveNarrative.regulatoryObligations
        },
        {
          heading: 'Executive Ownership',
          content: narrative.executiveNarrative.executiveOwnership
        },
        {
          heading: 'Recommended Actions',
          content: narrative.executiveNarrative.recommendedActions
        }
      ]
    };
  }

  /**
   * Format narrative content for Word
   * @private
   */
  static _formatForWord(narrative, options) {
    return {
      title: `Executive Narrative - ${narrative.finding.title}`,
      metadata: {
        finding: narrative.finding,
        generated: new Date().toISOString()
      },
      sections: [
        {
          type: 'heading',
          level: 1,
          text: 'Executive Summary'
        },
        {
          type: 'paragraph',
          text: narrative.executiveNarrative.summary
        },
        {
          type: 'heading',
          level: 1,
          text: 'Business Process Impact'
        },
        {
          type: 'paragraph',
          text: JSON.stringify(narrative.executiveNarrative.businessProcess, null, 2)
        },
        {
          type: 'heading',
          level: 1,
          text: 'Financial Exposure'
        },
        {
          type: 'paragraph',
          text: JSON.stringify(narrative.executiveNarrative.financialExposure, null, 2)
        },
        {
          type: 'heading',
          level: 1,
          text: 'Recommended Actions'
        },
        {
          type: 'list',
          items: narrative.executiveNarrative.recommendedActions
        }
      ]
    };
  }

  /**
   * Format narrative content for PowerPoint
   * @private
   */
  static _formatForPowerPoint(narrative, options) {
    return {
      slides: [
        {
          title: narrative.finding.title,
          subtitle: narrative.executiveNarrative.summary,
          metadata: {
            severity: narrative.finding.severity,
            status: narrative.finding.status
          }
        },
        {
          title: 'Business Impact',
          content: narrative.executiveNarrative.businessProcess
        },
        {
          title: 'Financial Exposure',
          content: {
            total: narrative.executiveNarrative.financialExposure.totalGrossExposure,
            breakdown: narrative.executiveNarrative.financialExposure.breakdown
          }
        },
        {
          title: 'Executive Ownership',
          content: narrative.executiveNarrative.executiveOwnership
        },
        {
          title: 'Recommended Actions',
          content: narrative.executiveNarrative.recommendedActions
        }
      ]
    };
  }

  /**
   * Format currency value
   * @private
   */
  static _formatCurrency(value) {
    if (!value) return '0';
    return parseFloat(value).toLocaleString('en-US', {
      minimumFractionDigits: 0,
      maximumFractionDigits: 0
    });
  }
}

module.exports = NarrativeExportService;
