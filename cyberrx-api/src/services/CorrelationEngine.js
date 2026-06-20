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

/**
 * Correlation Engine Service
 *
 * Takes a technical finding and produces the executive narrative
 * Correlates: business process, data, threat, financial, frameworks, legal, owners, audit
 */
class CorrelationEngine {
  /**
   * Generate executive narrative for a finding
   * @param {string} findingId - Finding ID
   * @param {string} organizationId - Organization ID
   * @returns {Promise<Object>} Executive narrative
   */
  static async generateExecutiveNarrative(findingId, organizationId) {
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

    // Step 4: Correlate data objects
    const dataObjects = await this._getDataObjects(finding, risk, businessProcess);

    // Step 5: Correlate threat scenario
    const threatScenario = await this._getThreatScenario(risk);

    // Step 6: Correlate financial impact
    const financialImpact = await this._getFinancialImpact(risk, threatScenario);

    // Step 7: Get framework mappings
    const frameworkMappings = risk?.frameworkMappings || [];

    // Step 8: Correlate legal obligations
    const legalObligations = await this._getLegalObligations(risk, threatScenario);

    // Step 9: Get owners
    const owners = await this._getOwners(risk, businessProcess);

    // Step 10: Get audit evidence requirements
    const auditEvidence = this._getAuditEvidence(risk);

    // Step 11: Build the executive narrative
    return this._buildNarrative({
      finding,
      risk,
      businessProcess,
      dataObjects,
      threatScenario,
      financialImpact,
      frameworkMappings,
      legalObligations,
      owners,
      auditEvidence
    });
  }

  /**
   * Get business process for the finding
   * @private
   */
  static async _getBusinessProcess(finding, risk) {
    // First try finding's business process
    let processId = finding.businessProcessId;

    // Then try risk's business processes
    if (!processId && risk && risk.businessProcessIds && risk.businessProcessIds.length > 0) {
      processId = risk.businessProcessIds[0];
    }

    // Then try via asset
    if (!processId && finding.assetId) {
      const asset = await Asset.findById(finding.assetId);
      if (asset && asset.businessProcessIds && asset.businessProcessIds.length > 0) {
        processId = asset.businessProcessIds[0];
      }
    }

    if (processId) {
      return await BusinessProcess.findById(processId);
    }

    return null;
  }

  /**
   * Get data objects for the finding
   * @private
   */
  static async _getDataObjects(finding, risk, businessProcess) {
    const dataObjectIds = new Set();

    // From risk
    if (risk && risk.dataObjectIds) {
      risk.dataObjectIds.forEach(id => dataObjectIds.add(id));
    }

    // From business process
    if (businessProcess && businessProcess.createsDataObjects) {
      businessProcess.createsDataObjects.forEach(id => dataObjectIds.add(id));
    }

    // From asset
    if (finding.assetId) {
      const asset = await Asset.findById(finding.assetId);
      if (asset) {
        // Get data objects that reside in this asset
        const assetDataObjects = await DataObject.findByAssetId(finding.assetId);
        (assetDataObjects || []).forEach(obj => dataObjectIds.add(obj.id));
      }
    }

    // Fetch all data objects
    const dataObjects = [];
    for (const id of dataObjectIds) {
      const obj = await DataObject.findById(id);
      if (obj) {
        dataObjects.push(obj);
      }
    }

    return dataObjects;
  }

  /**
   * Get threat scenario for the finding
   * @private
   */
  static async _getThreatScenario(risk) {
    if (!risk || !risk.threatScenarioId) {
      return null;
    }
    return await ThreatScenario.findById(risk.threatScenarioId);
  }

  /**
   * Get financial impact for the finding
   * @private
   */
  static async _getFinancialImpact(risk, threatScenario) {
    if (!risk) {
      return null;
    }

    // Try to get existing financial impact
    let financialImpact = await FinancialImpact.findByRiskId(risk.id);

    // If not exists, create basic impact from risk data
    if (!financialImpact && risk.financialExposure) {
      // Estimate impact based on severity and threat
      const baseExposure = risk.financialExposure;

      // Estimate components based on threat type
      let breachResponseCost = baseExposure * 0.3;
      let regulatoryFine = baseExposure * 0.2;
      let businessInterruption = baseExposure * 0.25;
      let reputationalLoss = baseExposure * 0.15;
      let legalCost = baseExposure * 0.1;
      let fraudLoss = 0;

      // Adjust based on threat scenario
      if (threatScenario) {
        switch (threatScenario.type) {
          case 'ransomware':
            breachResponseCost = baseExposure * 0.4;
            businessInterruption = baseExposure * 0.35;
            break;
          case 'phishing':
            fraudLoss = baseExposure * 0.3;
            break;
          case 'supply_chain':
            businessInterruption = baseExposure * 0.4;
            regulatoryFine = baseExposure * 0.25;
            break;
        }
      }

      financialImpact = {
        totalGross: baseExposure,
        breachResponseCost,
        regulatoryFine,
        businessInterruption,
        fraudLoss: fraudLoss || 0,
        reputationalLoss,
        legalCost,
        recoveryCost: 0,
        insuranceCoverage: 0,
        netExposure: baseExposure
      };
    }

    return financialImpact;
  }

  /**
   * Get legal obligations for the finding
   * @private
   */
  static async _getLegalObligations(risk, threatScenario) {
    const obligations = [];

    // From risk
    if (risk && risk.legalObligationIds) {
      for (const id of risk.legalObligationIds) {
        const obligation = await LegalObligation.findById(id);
        if (obligation) {
          obligations.push(obligation);
        }
      }
    }

    // From threat scenario (if HIPAA-related data is involved)
    if (threatScenario && obligations.length === 0) {
      const hipaaObligations = await LegalObligation.getHIPAAObligations(risk?.organizationId || '');
      obligations.push(...hipaaObligations.slice(0, 3)); // Top 3 HIPAA obligations
    }

    return obligations;
  }

  /**
   * Get owners for the finding
   * @private
   */
  static async _getOwners(risk, businessProcess) {
    const owners = {
      executive: null,
      remediation: null,
      evidence: null,
      businessProcessOwner: null
    };

    // From risk
    if (risk) {
      if (risk.executiveOwner) {
        const execOwner = await ExecutiveOwner.findByUserId(risk.executiveOwner);
        if (execOwner) {
          owners.executive = execOwner;
        }
      }
      owners.remediation = risk.remediationOwner;
      owners.evidence = risk.evidenceOwner;
    }

    // From business process
    if (businessProcess) {
      owners.businessProcessOwner = businessProcess.owner;

      // If no executive owner from risk, try to find by role
      if (!owners.executive && businessProcess.owner) {
        const roleOwner = await ExecutiveOwner.findByRole(businessProcess.owner, risk?.organizationId || '');
        if (roleOwner) {
          owners.executive = roleOwner;
        }
      }
    }

    return owners;
  }

  /**
   * Get audit evidence requirements
   * @private
   */
  static async _getAuditEvidence(risk) {
    if (!risk) {
      return {
        required: false,
        description: null,
        testIds: []
      };
    }

    return {
      required: !!risk.auditEvidenceRequired,
      description: risk.auditEvidenceRequired,
      testIds: risk.auditTestIds || []
    };
  }

  /**
   * Build the executive narrative
   * @private
   */
  static _buildNarrative(data) {
    const {
      finding,
      risk,
      businessProcess,
      dataObjects,
      threatScenario,
      financialImpact,
      frameworkMappings,
      legalObligations,
      owners,
      auditEvidence
    } = data;

    // Build narrative summary
    const summary = this._buildSummary({
      finding,
      businessProcess,
      dataObjects,
      threatScenario
    });

    // Build financial summary
    const financialSummary = this._buildFinancialSummary(financialImpact, risk);

    // Build regulatory summary
    const regulatorySummary = this._buildRegulatorySummary(
      legalObligations,
      frameworkMappings
    );

    // Build ownership summary
    const ownershipSummary = this._buildOwnershipSummary(owners);

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
          criticality: businessProcess.criticality,
          owner: businessProcess.owner
        } : null,
        dataInvolvement: dataObjects.map(obj => ({
          type: obj.type,
          sensitivity: obj.sensitivity,
          classification: obj.type === 'PHI' ? 'Protected Health Information' :
                         obj.type === 'PII' ? 'Personally Identifiable Information' :
                         obj.type === 'PCI' ? 'Payment Card Information' : obj.type
        })),
        threat: threatScenario ? {
          type: threatScenario.type,
          name: threatScenario.name,
          probability: threatScenario.probability,
          impact: threatScenario.impactLevel,
          mitreTechnique: threatScenario.mitreTechnique
        } : null,
        financialExposure: financialSummary,
        regulatory: regulatorySummary,
        ownership: ownershipSummary,
        auditEvidence: auditEvidence
      },
      correlation: {
        riskId: risk?.id || null,
        assetId: finding.assetId || null,
        applicationId: finding.applicationId || null,
        businessProcessId: businessProcess?.id || null,
        threatScenarioId: threatScenario?.id || null
      }
    };
  }

  /**
   * Build narrative summary
   * @private
   */
  static _buildSummary({ finding, businessProcess, dataObjects, threatScenario }) {
    let summary = `${finding.title} detected`;

    if (businessProcess) {
      summary += ` affecting ${businessProcess.name} (${businessProcess.tier} tier)`;
    }

    if (dataObjects.length > 0) {
      const dataTypes = [...new Set(dataObjects.map(d => d.type))].join(', ');
      summary += ` involving ${dataTypes}`;
    }

    if (threatScenario) {
      summary += ` with potential for ${threatScenario.type}`;
    }

    return summary;
  }

  /**
   * Build financial summary
   * @private
   */
  static _buildFinancialSummary(financialImpact, risk) {
    if (!financialImpact) {
      return risk?.financialExposure ? {
        totalExposure: risk.financialExposure,
        breakdown: null
      } : null;
    }

    return {
      totalGrossExposure: financialImpact.totalGross,
      netExposure: financialImpact.netExposure,
      insuranceCoverage: financialImpact.insuranceCoverage,
      breakdown: {
        breachResponseCost: financialImpact.breachResponseCost,
        regulatoryFines: financialImpact.regulatoryFine,
        businessInterruption: financialImpact.businessInterruption,
        fraudLoss: financialImpact.fraudLoss,
        reputationalLoss: financialImpact.reputationalLoss,
        legalCosts: financialImpact.legalCost,
        recoveryCost: financialImpact.recoveryCost
      }
    };
  }

  /**
   * Build regulatory summary
   * @private
   */
  static _buildRegulatorySummary(legalObligations, frameworkMappings) {
    return {
      frameworks: frameworkMappings || [],
      obligations: legalObligations.map(obl => ({
        name: obl.name,
        source: obl.source,
        notificationTimeline: obl.notificationTimeline,
        citation: obl.citation,
        maxPenalty: obl.maxPenaltyAmount
      })),
      urgentNotifications: legalObligations
        .filter(obl => obl.notificationTimeline && (
          obl.notificationTimeline.includes('hour') ||
          obl.notificationTimeline.includes('24') ||
          obl.notificationTimeline.includes('48') ||
          obl.notificationTimeline.includes('72')
        ))
        .map(obl => ({
          obligation: obl.name,
          timeline: obl.notificationTimeline
        }))
    };
  }

  /**
   * Build ownership summary
   * @private
   */
  static _buildOwnershipSummary(owners) {
    return {
      executive: owners.executive ? {
        roleId: owners.executive.roleId,
        name: owners.executive.name,
        email: owners.executive.email
      } : null,
      remediationOwner: owners.remediationOwner,
      evidenceOwner: owners.evidence,
      businessProcessOwner: owners.businessProcessOwner
    };
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
        const narrative = await this.generateExecutiveNarrative(findingId, organizationId);
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

  /**
   * Get organization risk summary
   * @param {string} organizationId - Organization ID
   * @returns {Promise<Object>} Risk summary
   */
  static async getOrganizationRiskSummary(organizationId) {
    // Get all risks
    const risks = await Risk.findByOrganization(organizationId);

    // Get financial impact totals
    const financialTotals = await FinancialImpact.getTotalExposure(organizationId);

    // Get repeat findings
    const repeatFindings = await Finding.findRepeats(organizationId);

    // Get high-value data objects
    const highValueData = await DataObject.getHighValueDataObjects(organizationId);

    // Get high-probability threats
    const highProbThreats = await ThreatScenario.getHighProbabilityThreats(organizationId, 70);

    // Get executive roster
    const executiveRoster = await ExecutiveOwner.getExecutiveRoster(organizationId);

    return {
      organizationId,
      summary: {
        totalRisks: risks.length,
        openRisks: risks.filter(r => r.status === 'open').length,
        criticalRisks: risks.filter(r => r.severity === 'Critical').length,
        repeatFindings: repeatFindings.length
      },
      financialExposure: financialTotals,
      topRisks: risks.slice(0, 10),
      repeatFindings: repeatFindings.slice(0, 5),
      highValueData: highValueData,
      highProbabilityThreats: highProbThreats,
      executiveRoster
    };
  }
}

module.exports = CorrelationEngine;
