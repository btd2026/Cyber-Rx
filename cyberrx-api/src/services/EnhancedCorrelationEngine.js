'use strict';

const {
  BusinessProcess,
  Asset,
  DataObject,
  ThreatScenario,
  LegalObligation,
  ExecutiveOwner,
  Risk,
  Finding,
  FinancialImpact
} = require('../models');

const NarrativeTemplateService = require('./NarrativeTemplateService');

/**
 * Enhanced Correlation Engine Service
 *
 * Takes a technical finding and produces the comprehensive executive narrative
 * Correlates: business process, data, threat, financial, frameworks, legal, owners, audit
 * Produces C-level ready narratives with complete context
 */
class EnhancedCorrelationEngine {
  /**
   * Generate comprehensive executive narrative for a finding
   * @param {string} findingId - Finding ID
   * @param {string} organizationId - Organization ID
   * @param {Object} [options] - Generation options
   * @param {boolean} [options.saveNarrative] - Whether to save the narrative
   * @param {boolean} [options.applyTemplate] - Whether to apply template
   * @returns {Promise<Object>} Comprehensive executive narrative
   */
  static async generateExecutiveNarrative(findingId, organizationId, options = {}) {
    const { saveNarrative = true, applyTemplate = true } = options;

    // Step 1: Get the finding with all relationships
    const finding = await Finding.findById(findingId);
    if (!finding) {
      throw new Error('Finding not found');
    }
    if (finding.organizationId !== organizationId) {
      throw new Error('Access denied');
    }

    // Step 2: Get related risk if exists
    let risk = null;
    if (finding.riskId) {
      risk = await Risk.findById(finding.riskId);
    }

    // Step 3: Correlate business process
    const businessProcess = await this._getBusinessProcess(finding, risk);

    // Step 4: Correlate system/asset impact
    const systemImpact = await this._getSystemImpact(finding, businessProcess);

    // Step 5: Correlate data objects
    const dataInvolvement = await this._getDataInvolvement(finding, risk, businessProcess, systemImpact);

    // Step 6: Correlate threat scenario
    const threatScenario = await this._getThreatScenario(risk, finding);

    // Step 7: Correlate financial impact
    const financialExposure = await this._getFinancialExposure(risk, threatScenario, dataInvolvement);

    // Step 8: Get framework mappings
    const frameworkMappings = risk?.frameworkMappings || [];

    // Step 9: Correlate legal obligations with urgency
    const regulatoryObligations = await this._getRegulatoryObligations(risk, threatScenario, dataInvolvement, organizationId);

    // Step 10: Get executive ownership with responsibilities
    const executiveOwnership = await this._getExecutiveOwnership(risk, businessProcess, organizationId);

    // Step 11: Get audit evidence requirements
    const auditEvidence = await this._getAuditEvidence(risk, finding);

    // Step 12: Build the comprehensive executive narrative
    let narrative = this._buildComprehensiveNarrative({
      finding,
      risk,
      businessProcess,
      systemImpact,
      dataInvolvement,
      threatScenario,
      financialExposure,
      frameworkMappings,
      regulatoryObligations,
      executiveOwnership,
      auditEvidence
    });

    // Step 13: Apply template if requested
    if (applyTemplate) {
      const template = await NarrativeTemplateService.getTemplateForFinding(finding, organizationId);
      narrative = await NarrativeTemplateService.applyTemplate(template, narrative);
    }

    // Step 14: Save narrative if requested
    if (saveNarrative) {
      const { Narrative } = require('../models');
      const { v4: uuidv4 } = require('uuid');

      await Narrative.create({
        id: uuidv4(),
        findingId,
        organizationId,
        narrativeData: narrative,
        isPublished: false,
        templateId: applyTemplate ? await this._getTemplateIdForFinding(finding) : null
      });
    }

    return narrative;
  }

  /**
   * Get business process for the finding with tier information
   * @private
   */
  static async _getBusinessProcess(finding, risk) {
    let processId = finding.businessProcessId;

    if (!processId && risk && risk.businessProcessIds && risk.businessProcessIds.length > 0) {
      processId = risk.businessProcessIds[0];
    }

    if (!processId && finding.assetId) {
      const asset = await Asset.findById(finding.assetId);
      if (asset && asset.businessProcessIds && asset.businessProcessIds.length > 0) {
        processId = asset.businessProcessIds[0];
      }
    }

    if (processId) {
      const process = await BusinessProcess.findById(processId);
      if (process) {
        // Add tier label
        const tierLabels = {
          'Tier 1': 'Primary',
          'Tier 2': 'Strategic',
          'Tier 3': 'Supporting'
        };
        return {
          ...process,
          tierLabel: tierLabels[process.tier] || process.tier
        };
      }
    }

    return null;
  }

  /**
   * Get system impact details
   * @private
   */
  static async _getSystemImpact(finding, businessProcess) {
    if (!finding.assetId) {
      return null;
    }

    const asset = await Asset.findById(finding.assetId);
    if (!asset) {
      return null;
    }

    // Get business processes supported by this system
    const supportedProcesses = [];
    if (asset.businessProcessIds) {
      for (const processId of asset.businessProcessIds) {
        const process = await BusinessProcess.findById(processId);
        if (process) {
          supportedProcesses.push(process.name);
        }
      }
    }

    return {
      system: asset.name,
      location: asset.location || (asset.cloudProvider ? `Cloud (${asset.cloudProvider})` : 'On-Premise'),
      businessProcessesSupported: supportedProcesses.length > 0 ? supportedProcesses : ['Unknown'],
      assetType: asset.type,
      hostname: asset.hostname,
      ipAddress: asset.ipAddress
    };
  }

  /**
   * Get data involvement with volumes and sensitivity
   * @private
   */
  static async _getDataInvolvement(finding, risk, businessProcess, systemImpact) {
    const dataObjects = [];
    const dataObjectIds = new Set();

    // From risk
    if (risk && risk.dataObjectIds) {
      risk.dataObjectIds.forEach(id => dataObjectIds.add(id));
    }

    // From business process
    if (businessProcess && businessProcess.createsDataObjects) {
      businessProcess.createsDataObjects.forEach(id => dataObjectIds.add(id));
    }

    // From asset/system
    if (finding.assetId) {
      const assetDataObjects = await DataObject.findByAssetId(finding.assetId);
      assetDataObjects.forEach(obj => dataObjectIds.add(obj.id));
    }

    // Fetch all data objects with details
    for (const id of dataObjectIds) {
      const obj = await DataObject.findById(id);
      if (obj) {
        // Format volume string
        let volume = null;
        if (obj.recordCount) {
          if (obj.recordCount >= 1000000) {
            volume = `${(obj.recordCount / 1000000).toFixed(1)}M records`;
          } else if (obj.recordCount >= 1000) {
            volume = `${(obj.recordCount / 1000).toFixed(1)}K records`;
          } else {
            volume = `${obj.recordCount} records`;
          }
        }

        dataObjects.push({
          type: obj.type,
          classification: obj.type === 'PHI' ? 'Protected Health Information' :
                       obj.type === 'PII' ? 'Personally Identifiable Information' :
                       obj.type === 'PCI' ? 'Payment Card Information' :
                       obj.type === 'Financial' ? 'Financial Data' : obj.type,
          volume: volume,
          sensitivity: obj.sensitivity,
          description: obj.description
        });
      }
    }

    return dataObjects;
  }

  /**
   * Get threat scenario with MITRE mapping
   * @private
   */
  static async _getThreatScenario(risk, finding) {
    if (!risk || !risk.threatScenarioId) {
      // Infer threat scenario from finding
      if (finding.title && finding.title.toLowerCase().includes('ransomware')) {
        return {
          type: 'Ransomware',
          name: 'Ransomware Attack',
          probability: 75,
          probabilityLabel: 'High',
          impactLevel: finding.severity === 'Critical' ? 'Critical' : 'High',
          mitreTechnique: 'T1486',
          mitreTechniqueName: 'Data Encrypted for Impact',
          mitreTactic: 'Impact'
        };
      }
      return null;
    }

    const scenario = await ThreatScenario.findById(risk.threatScenarioId);
    if (!scenario) {
      return null;
    }

    // Add probability label
    const probabilityLabels = {
      [90]: 'Critical',
      [80]: 'Very High',
      [70]: 'High',
      [60]: 'Medium-High',
      [50]: 'Medium',
      [40]: 'Low-Medium',
      [30]: 'Low',
      [20]: 'Very Low',
      [10]: 'Minimal'
    };

    const getProbabilityLabel = (probability) => {
      if (probability >= 85) return 'Critical';
      if (probability >= 70) return 'High';
      if (probability >= 50) return 'Medium';
      return 'Low';
    };

    // Get MITRE technique name
    const mitreTechniqueNames = {
      'T1486': 'Data Encrypted for Impact',
      'T1566': 'Phishing',
      'T1078': 'Valid Accounts',
      'T1190': 'Exploit Public-Facing Application',
      'T1195': 'Supply Chain Compromise'
    };

    return {
      type: scenario.type,
      name: scenario.name,
      probability: scenario.probability || 50,
      probabilityLabel: getProbabilityLabel(scenario.probability),
      impactLevel: scenario.impactLevel || finding.severity,
      mitreTechnique: scenario.mitreTechnique?.[0] || null,
      mitreTechniqueName: scenario.mitreTechnique?.[0] ? (mitreTechniqueNames[scenario.mitreTechnique[0]] || scenario.mitreTechnique[0]) : null,
      mitreTactic: scenario.mitreTactic,
      mitigationStrategy: scenario.mitigationStrategy
    };
  }

  /**
   * Get comprehensive financial exposure
   * @private
   */
  static async _getFinancialExposure(risk, threatScenario, dataInvolvement) {
    let financialImpact = null;

    if (risk) {
      financialImpact = await FinancialImpact.findByRiskId(risk.id);
    }

    // If no financial impact exists, estimate it
    if (!financialImpact) {
      const baseExposure = risk?.financialExposure || this._estimateFinancialExposure(threatScenario, dataInvolvement);

      // Estimate components based on threat type
      let breachResponseCost = baseExposure * 0.30;
      let regulatoryFine = baseExposure * 0.20;
      let businessInterruption = baseExposure * 0.25;
      let reputationalLoss = baseExposure * 0.15;
      let legalCosts = baseExposure * 0.10;

      // Adjust based on threat scenario
      if (threatScenario) {
        switch (threatScenario.type) {
          case 'Ransomware':
            breachResponseCost = baseExposure * 0.40;
            businessInterruption = baseExposure * 0.35;
            break;
          case 'Phishing':
            // Add fraud component
            regulatoryFine = baseExposure * 0.30;
            break;
          case 'Supply Chain':
            businessInterruption = baseExposure * 0.40;
            regulatoryFine = baseExposure * 0.25;
            break;
        }
      }

      return {
        totalGrossExposure: Math.round(baseExposure),
        netExposure: Math.round(baseExposure),
        insuranceCoverage: 0,
        breakdown: {
          breachResponseCost: Math.round(breachResponseCost),
          regulatoryFine: Math.round(regulatoryFine),
          businessInterruption: Math.round(businessInterruption),
          reputationalLoss: Math.round(reputationalLoss),
          legalCosts: Math.round(legalCosts)
        }
      };
    }

    // Transform existing financial impact
    return {
      totalGrossExposure: financialImpact.totalGross,
      netExposure: financialImpact.netExposure,
      insuranceCoverage: financialImpact.insuranceCoverage,
      breakdown: {
        breachResponseCost: financialImpact.breachResponseCost,
        regulatoryFine: financialImpact.regulatoryFine,
        businessInterruption: financialImpact.businessInterruption,
        reputationalLoss: financialImpact.reputationalLoss,
        legalCosts: financialImpact.legalCost
      }
    };
  }

  /**
   * Estimate financial exposure based on threat and data
   * @private
   */
  static _estimateFinancialExposure(threatScenario, dataInvolvement) {
    let baseExposure = 100000; // $100K base

    // Adjust based on data involvement
    if (dataInvolvement && dataInvolvement.length > 0) {
      const phiCount = dataInvolvement.filter(d => d.type === 'PHI').length;
      const piiCount = dataInvolvement.filter(d => d.type === 'PII').length;
      const financialCount = dataInvolvement.filter(d => d.type === 'Financial').length;

      // PHI involvement significantly increases exposure
      if (phiCount > 0) {
        baseExposure *= 5;
      }

      // PII involvement
      if (piiCount > 0) {
        baseExposure *= 3;
      }

      // Financial data involvement
      if (financialCount > 0) {
        baseExposure *= 4;
      }
    }

    // Adjust based on threat scenario
    if (threatScenario) {
      switch (threatScenario.type) {
        case 'Ransomware':
          baseExposure *= 2.5;
          break;
        case 'Phishing':
          baseExposure *= 1.5;
          break;
        case 'Insider':
          baseExposure *= 2.0;
          break;
      }
    }

    return baseExposure;
  }

  /**
   * Get regulatory obligations with urgency indicators
   * @private
   */
  static async _getRegulatoryObligations(risk, threatScenario, dataInvolvement, organizationId) {
    const obligations = [];

    // From risk
    if (risk && risk.legalObligationIds) {
      for (const id of risk.legalObligationIds) {
        const obligation = await LegalObligation.findById(id);
        if (obligation) {
          obligations.push(this._formatObligationWithUrgency(obligation));
        }
      }
    }

    // Auto-add HIPAA obligations if PHI is involved
    if (dataInvolvement && dataInvolvement.some(d => d.type === 'PHI')) {
      const hipaaObligations = await LegalObligation.getHIPAAObligations(organizationId);
      const existingNames = new Set(obligations.map(o => o.name));
      hipaaObligations.forEach(obl => {
        if (!existingNames.has(obl.name)) {
          obligations.push(this._formatObligationWithUrgency(obl));
        }
      });
    }

    // Add CMS obligations for healthcare payers
    if (dataInvolvement && dataInvolvement.some(d => d.type === 'PHI')) {
      const cmsObligation = {
        name: 'CMS Breach Notification',
        source: 'CMS 42 CFR §422.306(c)(1)',
        notificationTimeline: '5 days',
        citation: '42 CFR §422.306(c)(1)',
        maxPenalty: '$100,000 per violation',
        urgency: 'critical'
      };
      if (!obligations.find(o => o.name === cmsObligation.name)) {
        obligations.unshift(cmsObligation);
      }
    }

    return obligations;
  }

  /**
   * Format obligation with urgency indicator
   * @private
   */
  static _formatObligationWithUrgency(obligation) {
    let urgency = 'medium';

    if (obligation.notificationTimeline) {
      if (obligation.notificationTimeline.includes('hour') ||
          obligation.notificationTimeline.includes('24') ||
          obligation.notificationTimeline.includes('5 days') ||
          obligation.notificationTimeline.includes('72')) {
        urgency = 'critical';
      } else if (obligation.notificationTimeline.includes('day')) {
        const days = parseInt(obligation.notificationTimeline);
        if (days <= 10) {
          urgency = 'high';
        }
      }
    }

    return {
      name: obligation.name,
      source: obligation.source,
      notificationTimeline: obligation.notificationTimeline,
      citation: obligation.citation,
      maxPenalty: obligation.maxPenaltyAmount ? `$${obligation.maxPenaltyAmount.toLocaleString()}` : obligation.maxPenaltyAmount,
      urgency: urgency
    };
  }

  /**
   * Get executive ownership with detailed responsibilities
   * @private
   */
  static async _getExecutiveOwnership(risk, businessProcess, organizationId) {
    const ownership = {
      remediation: null,
      validation: null,
      legal: null
    };

    // Default role assignments
    const remediationRole = businessProcess?.owner || 'CIO';
    const validationRole = 'CISO';
    const legalRole = 'CLO';

    // Get actual executives from organization
    const remediationOwner = await ExecutiveOwner.findByRole(remediationRole, organizationId);
    const validationOwner = await ExecutiveOwner.findByRole(validationRole, organizationId);
    const legalOwner = await ExecutiveOwner.findByRole(legalRole, organizationId);

    ownership.remediation = {
      roleId: remediationRole,
      name: remediationOwner?.name || remediationRole,
      email: remediationOwner?.email || null,
      responsibility: this._getRoleResponsibility(remediationRole, 'remediation')
    };

    ownership.validation = {
      roleId: validationRole,
      name: validationOwner?.name || validationRole,
      email: validationOwner?.email || null,
      responsibility: this._getRoleResponsibility(validationRole, 'validation')
    };

    ownership.legal = {
      roleId: legalRole,
      name: legalOwner?.name || legalRole,
      email: legalOwner?.email || null,
      responsibility: this._getRoleResponsibility(legalRole, 'legal')
    };

    return ownership;
  }

  /**
   * Get role-specific responsibility description
   * @private
   */
  static _getRoleResponsibility(role, type) {
    const responsibilities = {
      remediation: {
        'CIO': 'Technology asset remediation and system patching',
        'CISO': 'Security control implementation and vulnerability management',
        'CTO': 'Technical remediation and system hardening',
        'COO': 'Operational remediation coordination'
      },
      validation: {
        'CISO': 'Control effectiveness validation and security testing',
        'CIO': 'System validation and operational verification',
        'Audit': 'Control validation and audit verification'
      },
      legal: {
        'CLO': 'Regulatory compliance, breach notification, and legal counsel',
        'CISO': 'Security compliance and regulatory reporting',
        'Audit': 'Compliance verification and regulatory reporting'
      }
    };

    return responsibilities[type]?.[role] || `${type} responsibilities`;
  }

  /**
   * Get audit evidence requirements
   * @private
   */
  static async _getAuditEvidence(risk, finding) {
    const evidence = {
      required: false,
      description: null,
      tests: []
    };

    if (risk && risk.auditEvidenceRequired) {
      evidence.required = true;
      evidence.description = risk.auditEvidenceRequired;
      evidence.tests = risk.auditTestIds || [];
    }

    // Auto-determine evidence requirements based on severity
    if (!evidence.required && finding) {
      if (finding.severity === 'Critical') {
        evidence.required = true;
        evidence.description = 'Penetration test required to validate exploitability and confirm business impact';
        evidence.tests = ['Penetration Test', 'Configuration Review', 'Access Control Review'];
      } else if (finding.severity === 'High') {
        evidence.required = true;
        evidence.description = 'Vulnerability scan and control validation required';
        evidence.tests = ['Vulnerability Scan', 'Configuration Review'];
      }
    }

    // Add last evidence date if available
    if (risk && risk.lastEvidenceDate) {
      evidence.lastEvidenceDate = risk.lastEvidenceDate;
    }

    return evidence;
  }

  /**
   * Build the comprehensive executive narrative
   * @private
   */
  static _buildComprehensiveNarrative(data) {
    const {
      finding,
      risk,
      businessProcess,
      systemImpact,
      dataInvolvement,
      threatScenario,
      financialExposure,
      regulatoryObligations,
      executiveOwnership,
      auditEvidence
    } = data;

    // Build comprehensive summary
    const summary = this._buildComprehensiveSummary({
      finding,
      businessProcess,
      dataInvolvement,
      threatScenario,
      financialExposure
    });

    return {
      finding: {
        id: finding.id,
        title: finding.title,
        severity: finding.severity,
        status: finding.status,
        discoveredDate: finding.discoveredDate,
        source: finding.tool || finding.source
      },
      executiveNarrative: {
        summary,
        businessProcess: businessProcess ? {
          id: businessProcess.id,
          name: businessProcess.name,
          tier: businessProcess.tier,
          tierLabel: businessProcess.tierLabel,
          criticality: businessProcess.criticality,
          owner: businessProcess.owner
        } : null,
        systemImpact: systemImpact,
        dataInvolvement: dataInvolvement,
        threatScenario: threatScenario,
        financialExposure: financialExposure,
        regulatoryObligations: regulatoryObligations,
        executiveOwnership: executiveOwnership,
        auditEvidence: auditEvidence,
        recommendedActions: [] // Will be filled by template
      },
      correlation: {
        riskId: risk?.id || null,
        assetId: finding.assetId || null,
        applicationId: finding.applicationId || null,
        businessProcessId: businessProcess?.id || null,
        threatScenarioId: threatScenario?.type || null
      }
    };
  }

  /**
   * Build comprehensive executive summary
   * @private
   */
  static _buildComprehensiveSummary({ finding, businessProcess, dataInvolvement, threatScenario, financialExposure }) {
    let summary = `${finding.severity} ${finding.title} detected`;

    if (businessProcess) {
      summary += ` affecting ${businessProcess.name} (${businessProcess.tier} ${businessProcess.tierLabel})`;
    }

    if (dataInvolvement && dataInvolvement.length > 0) {
      const dataTypes = [...new Set(dataInvolvement.map(d => d.type))].join(', ');
      const totalRecords = dataInvolvement
        .filter(d => d.volume)
        .map(d => d.volume)
        .join(', ');
      summary += ` involving ${dataTypes}`;
      if (totalRecords) {
        summary += ` (${totalRecords})`;
      }
    }

    if (threatScenario) {
      summary += ` with potential for ${threatScenario.type}`;
    }

    if (financialExposure && financialExposure.totalGrossExposure) {
      const formattedExposure = financialExposure.totalGrossExposure.toLocaleString('en-US', {
        style: 'currency',
        currency: 'USD',
        minimumFractionDigits: 0,
        maximumFractionDigits: 0
      });
      summary += `, exposing ${formattedExposure} financial exposure`;
    }

    return summary;
  }

  /**
   * Get template ID for finding
   * @private
   */
  static async _getTemplateIdForFinding(finding) {
    if (finding.metadata?.vendorId) {
      return 'vendor_finding';
    } else if (finding.metadata?.complianceFrameworks) {
      return 'compliance_finding';
    } else if (finding.severity === 'Critical') {
      return 'critical_severity';
    } else if (finding.severity === 'High') {
      return 'high_severity';
    }
    return 'high_severity';
  }

  /**
   * Batch correlate multiple findings
   * @param {string[]} findingIds - Array of finding IDs
   * @param {string} organizationId - Organization ID
   * @returns {Promise<Array>} Array of executive narratives
   */
  static async batchCorrelate(findingIds, organizationId) {
    const narratives = [];

    for (const findingId of findingIds) {
      try {
        const narrative = await this.generateExecutiveNarrative(findingId, organizationId, {
          saveNarrative: true,
          applyTemplate: true
        });
        narratives.push(narrative);
      } catch (err) {
        console.error(`Failed to correlate finding ${findingId}:`, err.message);
        narratives.push({
          findingId,
          error: err.message
        });
      }
    }

    return narratives;
  }
}

module.exports = EnhancedCorrelationEngine;
