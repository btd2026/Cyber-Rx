'use strict';

const BaseService = require('../../BaseService');

/**
 * Security Service
 *
 * Handles all security-related business logic:
 * - Finding management and repeat detection
 * - Threat scenario analysis
 * - Control effectiveness assessment
 */
class SecurityService extends BaseService {
  constructor(models, logger) {
    super(models, logger);
    this.findingModel = models.Finding;
    this.threatModel = models.ThreatScenario;
    this.controlModel = models.Control;
  }

  /**
   * Get findings with filters and enrichment
   */
  async getFindings(orgId, filters = {}) {
    this.logInfo('Fetching findings', { orgId, filters });

    try {
      const findings = await this.findingModel.findByOrganization(orgId, filters);
      return this.enrichFindings(findings);
    } catch (error) {
      this.handleError(error, 'fetching findings');
    }
  }

  /**
   * Create finding with repeat detection
   */
  async createFinding(orgId, data) {
    this.logInfo('Creating finding', { orgId, title: data.title });

    try {
      // Validate required fields
      const title = this.validateRequiredString(data.title, 'Finding title');
      const severity = this.validateEnum(data.severity, ['Critical', 'High', 'Medium', 'Low', 'Info'], 'Severity');
      const status = this.validateEnum(data.status, ['open', 'in_progress', 'resolved', 'closed', 'false_positive', 'risk_accepted'], 'Status');

      if (!data.discoveredDate) {
        const error = new Error('Discovered date is required');
        error.statusCode = 400;
        throw error;
      }

      // Check for similar existing findings (repeat detection)
      const similar = await this.findingModel.findSimilar({
        organizationId: orgId,
        title: data.title,
        assetId: data.assetId,
        tool: data.tool
      });

      let finalIsRepeat = data.isRepeat || false;
      let finalOriginalFindingId = data.originalFindingId;
      let finalRepeatCount = data.repeatCount || 0;

      // Auto-detect repeats based on similarity
      if (similar && similar.length > 0 && !data.isRepeat) {
        const bestMatch = similar[0];
        if (bestMatch.title.toLowerCase() === title.toLowerCase() &&
            bestMatch.assetId === data.assetId &&
            bestMatch.tool === data.tool) {
          finalIsRepeat = true;
          finalOriginalFindingId = bestMatch.id;
          finalRepeatCount = (bestMatch.repeatCount || 0) + 1;
        }
      }

      // Generate ID
      const id = this.generateFindingId();

      // Create finding
      const finding = await this.findingModel.create({
        id,
        title: this.sanitize(title),
        severity,
        status,
        organizationId: orgId,
        discoveredDate: data.discoveredDate,
        riskId: data.riskId,
        assetId: data.assetId,
        applicationId: data.applicationId,
        businessProcessId: data.businessProcessId,
        isRepeat: finalIsRepeat,
        originalFindingId: finalOriginalFindingId,
        repeatCount: finalRepeatCount,
        remediationPlan: data.remediationPlan,
        targetDate: data.targetDate,
        owner: data.owner,
        source: data.source,
        sourceRef: data.sourceRef,
        tool: data.tool,
        metadata: data.metadata
      });

      // If detected as repeat, update original finding's repeat count
      if (finalIsRepeat && finalOriginalFindingId && finalOriginalFindingId !== id) {
        await this.findingModel.markAsRepeat(id, finalOriginalFindingId);
      }

      this.logInfo('Finding created successfully', { id, isRepeat: finalIsRepeat });
      return finding;
    } catch (error) {
      this.handleError(error, 'creating finding');
    }
  }

  /**
   * Update finding
   */
  async updateFinding(id, orgId, data) {
    this.logInfo('Updating finding', { id });

    try {
      // Verify access
      const existing = await this.findingModel.findById(id);
      this.verifyOrgAccess(existing, orgId, 'Finding');

      // Update finding
      const updated = await this.findingModel.update(id, data);
      this.logInfo('Finding updated successfully', { id });
      return updated;
    } catch (error) {
      this.handleError(error, 'updating finding');
    }
  }

  /**
   * Get threats with risk analysis
   */
  async getThreats(orgId, filters = {}) {
    this.logInfo('Fetching threat scenarios', { orgId, filters });

    try {
      const threats = await this.threatModel.findByOrganization(orgId, filters);
      return threats;
    } catch (error) {
      this.handleError(error, 'fetching threats');
    }
  }

  /**
   * Create threat scenario
   */
  async createThreatScenario(orgId, data) {
    this.logInfo('Creating threat scenario', { orgId, name: data.name });

    try {
      // Validate required fields
      const name = this.validateRequiredString(data.name, 'Threat scenario name');
      const type = this.validateEnum(
        data.type,
        ['ransomware', 'phishing', 'insider', 'supply_chain', 'misconfig'],
        'Type'
      );

      if (data.probability !== undefined) {
        this.validateRange(data.probability, 0, 100, 'Probability');
      }

      // Generate ID
      const id = this.generateThreatId();

      // Create threat scenario
      const threat = await this.threatModel.create({
        id,
        name: this.sanitize(name),
        type,
        organizationId: orgId,
        probability: data.probability,
        impactLevel: data.impactLevel,
        description: data.description,
        mitreTechnique: data.mitreTechnique || [],
        exploitedRisks: data.exploitedRisks || [],
        mitreTactic: data.mitreTactic,
        mitigationStrategy: data.mitigationStrategy
      });

      this.logInfo('Threat scenario created successfully', { id });
      return threat;
    } catch (error) {
      this.handleError(error, 'creating threat scenario');
    }
  }

  /**
   * Get controls with effectiveness filters
   */
  async getControls(orgId, filters = {}) {
    this.logInfo('Fetching controls', { orgId, filters });

    try {
      const controls = await this.controlModel.findByOrganization(orgId, filters);
      return this.enrichControls(controls);
    } catch (error) {
      this.handleError(error, 'fetching controls');
    }
  }

  /**
   * Assess control effectiveness
   */
  async assessControlEffectiveness(controlId, orgId, assessment) {
    this.logInfo('Assessing control effectiveness', { controlId });

    try {
      // Verify access
      const control = await this.controlModel.findById(controlId);
      this.verifyOrgAccess(control, orgId, 'Control');

      // Record test result
      const result = await this.controlModel.recordTest(controlId, {
        result: assessment.result,
        testedBy: assessment.testedBy,
        evidenceIds: assessment.evidenceIds,
        notes: assessment.notes
      });

      this.logInfo('Control assessment recorded', { controlId, result: assessment.result });
      return result;
    } catch (error) {
      this.handleError(error, 'assessing control effectiveness');
    }
  }

  /**
   * Get finding statistics
   */
  async getFindingStatistics(orgId) {
    this.logInfo('Fetching finding statistics', { orgId });

    try {
      return await this.findingModel.getStatistics(orgId);
    } catch (error) {
      this.handleError(error, 'fetching finding statistics');
    }
  }

  /**
   * Get repeat findings
   */
  async getRepeatFindings(orgId) {
    this.logInfo('Fetching repeat findings', { orgId });

    try {
      return await this.findingModel.findRepeats(orgId);
    } catch (error) {
      this.handleError(error, 'fetching repeat findings');
    }
  }

  /**
   * Mark finding as repeat
   */
  async markAsRepeat(findingId, originalFindingId, orgId) {
    this.logInfo('Marking finding as repeat', { findingId, originalFindingId });

    try {
      // Verify access to both findings
      const finding = await this.findingModel.findById(findingId);
      this.verifyOrgAccess(finding, orgId, 'Finding');

      const original = await this.findingModel.findById(originalFindingId);
      this.verifyOrgAccess(original, orgId, 'Original finding');

      // Mark as repeat
      const updated = await this.findingModel.markAsRepeat(findingId, originalFindingId);
      this.logInfo('Finding marked as repeat', { findingId });
      return updated;
    } catch (error) {
      this.handleError(error, 'marking finding as repeat');
    }
  }

  /**
   * Delete finding
   */
  async deleteFinding(id, orgId) {
    this.logInfo('Deleting finding', { id });

    try {
      // Verify access
      const existing = await this.findingModel.findById(id);
      this.verifyOrgAccess(existing, orgId, 'Finding');

      // Delete
      await this.findingModel.delete(id);
      this.logInfo('Finding deleted successfully', { id });
      return { message: 'Finding deleted successfully', id };
    } catch (error) {
      this.handleError(error, 'deleting finding');
    }
  }

  /**
   * Enrich findings with business context
   * @private
   */
  enrichFindings(findings) {
    return findings.map(finding => ({
      ...finding,
      businessProcess: this.mapToProcess(finding),
      financialExposure: this.calculateExposure(finding)
    }));
  }

  /**
   * Enrich controls with effectiveness metrics
   * @private
   */
  enrichControls(controls) {
    return controls.map(control => ({
      ...control,
      effectivenessScore: this.calculateEffectivenessScore(control),
      lastTested: control.lastTestDate || null
    }));
  }

  /**
   * Map finding to business process
   * @private
   */
  mapToProcess(finding) {
    // Business logic to map findings to processes
    if (!finding.businessProcessId) return null;
    return {
      id: finding.businessProcessId,
      name: finding.businessProcessId // Would fetch from BusinessProcess model
    };
  }

  /**
   * Calculate financial exposure for finding
   * @private
   */
  calculateExposure(finding) {
    // Business logic for exposure calculation
    const severityMultipliers = {
      'Critical': 100000,
      'High': 50000,
      'Medium': 10000,
      'Low': 5000,
      'Info': 0
    };
    return severityMultipliers[finding.severity] || 0;
  }

  /**
   * Calculate effectiveness score for control
   * @private
   */
  calculateEffectivenessScore(control) {
    // Business logic for effectiveness calculation
    if (!control.implementationStatus) return 0;

    const statusScores = {
      'implemented': 100,
      'partially_implemented': 50,
      'not_implemented': 0,
      'not_applicable': null
    };

    return statusScores[control.implementationStatus] || 0;
  }

  /**
   * Generate finding ID
   * @private
   */
  generateFindingId() {
    return `find_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  /**
   * Generate threat scenario ID
   * @private
   */
  generateThreatId() {
    return `ts_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }
}

module.exports = SecurityService;
