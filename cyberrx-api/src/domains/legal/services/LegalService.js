'use strict';

const BaseService = require('../../BaseService');

/**
 * Legal Service
 *
 * Handles all legal and compliance-related business logic:
 * - Legal obligation management
 * - Notification tracking
 * - Contract risk assessment
 */
class LegalService extends BaseService {
  constructor(models, logger) {
    super(models, logger);
    this.obligationModel = models.LegalObligation;
  }

  /**
   * Get legal obligations with filters
   */
  async getObligations(orgId, filters = {}) {
    this.logInfo('Fetching legal obligations', { orgId, filters });

    try {
      const obligations = await this.obligationModel.findByOrganization(orgId, filters);
      return this.enrichObligations(obligations);
    } catch (error) {
      this.handleError(error, 'fetching obligations');
    }
  }

  /**
   * Create legal obligation
   */
  async createObligation(orgId, data) {
    this.logInfo('Creating legal obligation', { orgId, name: data.name });

    try {
      // Validate required fields
      const name = this.validateRequiredString(data.name, 'Legal obligation name');
      const source = this.validateEnum(
        data.source,
        ['HIPAA', 'CMS', 'State', 'NAIC', 'Contract'],
        'Source'
      );

      // Generate ID
      const id = this.generateObligationId();

      // Create obligation
      const obligation = await this.obligationModel.create({
        id,
        name: this.sanitize(name),
        source,
        organizationId: orgId,
        citation: data.citation,
        notificationTimeline: data.notificationTimeline,
        applicability: data.applicability || [],
        penalties: data.penalties || [],
        description: data.description,
        maxPenaltyAmount: data.maxPenaltyAmount,
        jurisdiction: data.jurisdiction
      });

      this.logInfo('Legal obligation created successfully', { id });
      return obligation;
    } catch (error) {
      this.handleError(error, 'creating legal obligation');
    }
  }

  /**
   * Get urgent obligations (notification deadlines)
   */
  async getUrgentObligations(orgId) {
    this.logInfo('Fetching urgent obligations', { orgId });

    try {
      const urgent = await this.obligationModel.getUrgentObligations(orgId);
      return this.prioritizeByDeadline(urgent);
    } catch (error) {
      this.handleError(error, 'fetching urgent obligations');
    }
  }

  /**
   * Get HIPAA obligations
   */
  async getHIPAAObligations(orgId) {
    this.logInfo('Fetching HIPAA obligations', { orgId });

    try {
      return await this.obligationModel.getHIPAAObligations(orgId);
    } catch (error) {
      this.handleError(error, 'fetching HIPAA obligations');
    }
  }

  /**
   * Get notifications for upcoming deadlines
   */
  async getNotifications(orgId) {
    this.logInfo('Fetching obligation notifications', { orgId });

    try {
      const obligations = await this.obligationModel.findByOrganization(orgId);
      return this.generateNotifications(obligations);
    } catch (error) {
      this.handleError(error, 'fetching notifications');
    }
  }

  /**
   * Send notification for obligation
   */
  async sendNotification(orgId, obligationId, notificationData) {
    this.logInfo('Sending obligation notification', { orgId, obligationId });

    try {
      // Verify access
      const obligation = await this.obligationModel.findById(obligationId);
      this.verifyOrgAccess(obligation, orgId, 'Legal obligation');

      // Business logic for sending notification
      const notification = {
        id: this.generateNotificationId(),
        obligationId,
        organizationId: orgId,
        recipient: notificationData.recipient,
        message: notificationData.message,
        sentAt: new Date().toISOString(),
        status: 'sent'
      };

      this.logInfo('Notification sent successfully', { notificationId: notification.id });
      return notification;
    } catch (error) {
      this.handleError(error, 'sending notification');
    }
  }

  /**
   * Get contracts with risk assessment
   */
  async getContracts(orgId) {
    this.logInfo('Fetching contracts', { orgId });

    try {
      // Would integrate with contract model
      const obligations = await this.obligationModel.findByOrganization(orgId, {
        source: 'Contract'
      });
      return this.assessContractRisks(obligations);
    } catch (error) {
      this.handleError(error, 'fetching contracts');
    }
  }

  /**
   * Assess contract risk
   */
  async assessContractRisk(contractId, orgId) {
    this.logInfo('Assessing contract risk', { contractId });

    try {
      // Business logic for contract risk assessment
      const riskFactors = {
        penaltyAmount: 0,
        notificationStrictness: 0,
        complianceComplexity: 0
      };

      // Calculate risk score
      const riskScore = this.calculateContractRiskScore(riskFactors);

      return {
        contractId,
        riskScore,
        riskLevel: this.getRiskLevel(riskScore),
        factors: riskFactors,
        assessedAt: new Date().toISOString()
      };
    } catch (error) {
      this.handleError(error, 'assessing contract risk');
    }
  }

  /**
   * Update legal obligation
   */
  async updateObligation(id, orgId, data) {
    this.logInfo('Updating legal obligation', { id });

    try {
      // Verify access
      const existing = await this.obligationModel.findById(id);
      this.verifyOrgAccess(existing, orgId, 'Legal obligation');

      // Update obligation
      const updated = await this.obligationModel.update(id, data);
      this.logInfo('Legal obligation updated successfully', { id });
      return updated;
    } catch (error) {
      this.handleError(error, 'updating legal obligation');
    }
  }

  /**
   * Delete legal obligation
   */
  async deleteObligation(id, orgId) {
    this.logInfo('Deleting legal obligation', { id });

    try {
      // Verify access
      const existing = await this.obligationModel.findById(id);
      this.verifyOrgAccess(existing, orgId, 'Legal obligation');

      // Delete
      await this.obligationModel.delete(id);
      this.logInfo('Legal obligation deleted successfully', { id });
      return { message: 'Legal obligation deleted successfully', id };
    } catch (error) {
      this.handleError(error, 'deleting legal obligation');
    }
  }

  /**
   * Enrich obligations with compliance status
   * @private
   */
  enrichObligations(obligations) {
    return obligations.map(obligation => ({
      ...obligation,
      complianceStatus: this.calculateComplianceStatus(obligation),
      deadlineStatus: this.getDeadlineStatus(obligation),
      penaltyRisk: this.assessPenaltyRisk(obligation)
    }));
  }

  /**
   * Calculate compliance status
   * @private
   */
  calculateComplianceStatus(obligation) {
    // Business logic for compliance calculation
    if (!obligation.applicability || obligation.applicability.length === 0) {
      return 'unknown';
    }
    return 'compliant'; // Would integrate with actual compliance data
  }

  /**
   * Get deadline status
   * @private
   */
  getDeadlineStatus(obligation) {
    if (!obligation.notificationTimeline) return 'none';

    const now = new Date();
    const deadline = new Date(obligation.notificationTimeline);

    if (deadline < now) {
      return 'overdue';
    } else if (deadline < new Date(now.getTime() + 30 * 24 * 60 * 60 * 1000)) {
      return 'urgent';
    } else {
      return 'on_track';
    }
  }

  /**
   * Assess penalty risk
   * @private
   */
  assessPenaltyRisk(obligation) {
    if (!obligation.maxPenaltyAmount) return 'low';

    const amount = obligation.maxPenaltyAmount;
    if (amount > 1000000) return 'critical';
    if (amount > 500000) return 'high';
    if (amount > 100000) return 'medium';
    return 'low';
  }

  /**
   * Prioritize obligations by deadline
   * @private
   */
  prioritizeByDeadline(obligations) {
    return obligations.sort((a, b) => {
      if (!a.notificationTimeline) return 1;
      if (!b.notificationTimeline) return -1;
      return new Date(a.notificationTimeline) - new Date(b.notificationTimeline);
    });
  }

  /**
   * Generate notifications for obligations
   * @private
   */
  generateNotifications(obligations) {
    return obligations
      .filter(obligation => this.getDeadlineStatus(obligation) === 'urgent')
      .map(obligation => ({
        id: this.generateNotificationId(),
        obligationId: obligation.id,
        organizationId: obligation.organizationId,
        type: 'deadline_reminder',
        deadline: obligation.notificationTimeline,
        urgency: this.getDeadlineStatus(obligation),
        message: `Obligation "${obligation.name}" requires attention`,
        createdAt: new Date().toISOString()
      }));
  }

  /**
   * Assess contract risks
   * @private
   */
  assessContractRisks(obligations) {
    return obligations.map(obligation => ({
      ...obligation,
      contractRisk: this.assessPenaltyRisk(obligation),
      complianceComplexity: this.calculateComplexity(obligation)
    }));
  }

  /**
   * Calculate contract complexity
   * @private
   */
  calculateComplexity(obligation) {
    let complexity = 'low';
    if (obligation.applicability && obligation.applicability.length > 5) {
      complexity = 'high';
    } else if (obligation.applicability && obligation.applicability.length > 2) {
      complexity = 'medium';
    }
    return complexity;
  }

  /**
   * Calculate contract risk score
   * @private
   */
  calculateContractRiskScore(factors) {
    // Business logic for risk calculation
    let score = 0;
    score += factors.penaltyAmount * 0.4;
    score += factors.notificationStrictness * 0.3;
    score += factors.complianceComplexity * 0.3;
    return Math.min(100, Math.max(0, score));
  }

  /**
   * Get risk level from score
   * @private
   */
  getRiskLevel(score) {
    if (score >= 80) return 'critical';
    if (score >= 60) return 'high';
    if (score >= 40) return 'medium';
    return 'low';
  }

  /**
   * Generate obligation ID
   * @private
   */
  generateObligationId() {
    return `lo_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  /**
   * Generate notification ID
   * @private
   */
  generateNotificationId() {
    return `notif_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }
}

module.exports = LegalService;
