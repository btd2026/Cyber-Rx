'use strict';

const BaseService = require('../../BaseService');

/**
 * Audit Service
 *
 * Handles all audit-related business logic:
 * - Audit test management
 * - Evidence collection
 * - Deficiency tracking
 */
class AuditService extends BaseService {
  constructor(models, logger) {
    super(models, logger);
    this.taskModel = models.RemediationTask;
    this.evidenceModel = models.Evidence;
  }

  /**
   * Get audit tests with filters
   */
  async getTests(orgId, filters = {}) {
    this.logInfo('Fetching audit tests', { orgId, filters });

    try {
      // Would integrate with audit test model
      const tests = [];
      return this.enrichTests(tests);
    } catch (error) {
      this.handleError(error, 'fetching audit tests');
    }
  }

  /**
   * Create audit test
   */
  async createTest(orgId, data) {
    this.logInfo('Creating audit test', { orgId, title: data.title });

    try {
      // Validate required fields
      const title = this.validateRequiredString(data.title, 'Test title');
      const type = this.validateEnum(
        data.type,
        ['control_test', 'compliance_check', 'vulnerability_scan', 'penetration_test'],
        'Test type'
      );

      // Generate ID
      const id = this.generateTestId();

      // Create test
      const test = {
        id,
        title: this.sanitize(title),
        type,
        organizationId: orgId,
        description: data.description,
        framework: data.framework,
        controlIds: data.controlIds || [],
        scheduledDate: data.scheduledDate,
        assignedTo: data.assignedTo,
        status: 'pending',
        createdAt: new Date().toISOString()
      };

      this.logInfo('Audit test created successfully', { id });
      return test;
    } catch (error) {
      this.handleError(error, 'creating audit test');
    }
  }

  /**
   * Get evidence with filters
   */
  async getEvidence(orgId, filters = {}) {
    this.logInfo('Fetching evidence', { orgId, filters });

    try {
      const evidence = await this.evidenceModel.findByOrganization(orgId, filters);
      return this.enrichEvidence(evidence);
    } catch (error) {
      this.handleError(error, 'fetching evidence');
    }
  }

  /**
   * Collect evidence for a test
   */
  async collectEvidence(testId, orgId, evidenceData) {
    this.logInfo('Collecting evidence', { testId });

    try {
      // Business logic for evidence collection
      const evidence = {
        id: this.generateEvidenceId(),
        testId,
        organizationId: orgId,
        type: evidenceData.type,
        description: evidenceData.description,
        collectedBy: evidenceData.collectedBy,
        collectedAt: new Date().toISOString(),
        status: 'collected',
        metadata: evidenceData.metadata || {}
      };

      this.logInfo('Evidence collected successfully', { evidenceId: evidence.id });
      return evidence;
    } catch (error) {
      this.handleError(error, 'collecting evidence');
    }
  }

  /**
   * Get deficiencies with filters
   */
  async getDeficiencies(orgId, filters = {}) {
    this.logInfo('Fetching deficiencies', { orgId, filters });

    try {
      // Would integrate with deficiency model
      const deficiencies = [];
      return this.prioritizeDeficiencies(deficiencies);
    } catch (error) {
      this.handleError(error, 'fetching deficiencies');
    }
  }

  /**
   * Track deficiency
   */
  async trackDeficiency(deficiencyId, updateData) {
    this.logInfo('Tracking deficiency', { deficiencyId });

    try {
      // Business logic for deficiency tracking
      const deficiency = {
        id: deficiencyId,
        status: updateData.status || 'open',
        remediationPlan: updateData.remediationPlan,
        targetDate: updateData.targetDate,
        assignedTo: updateData.assignedTo,
        updatedAt: new Date().toISOString()
      };

      this.logInfo('Deficiency tracked successfully', { deficiencyId });
      return deficiency;
    } catch (error) {
      this.handleError(error, 'tracking deficiency');
    }
  }

  /**
   * Get remediation tasks with filters
   */
  async getTasks(orgId, filters = {}) {
    this.logInfo('Fetching remediation tasks', { orgId, filters });

    try {
      const tasks = await this.taskModel.findByOrganization(orgId, filters);
      return this.enrichTasks(tasks);
    } catch (error) {
      this.handleError(error, 'fetching remediation tasks');
    }
  }

  /**
   * Mark task as complete
   */
  async markTaskComplete(taskId, orgId, completionData) {
    this.logInfo('Marking task complete', { taskId });

    try {
      // Verify access
      const task = await this.taskModel.findById(taskId);
      this.verifyOrgAccess(task, orgId, 'Task');

      // Mark as complete
      const completed = await this.taskModel.markComplete(taskId, {
        actualCost: completionData.actualCost,
        notes: completionData.notes
      });

      this.logInfo('Task marked complete successfully', { taskId });
      return completed;
    } catch (error) {
      this.handleError(error, 'marking task complete');
    }
  }

  /**
   * Verify task completion
   */
  async verifyTask(taskId, orgId, verificationData) {
    this.logInfo('Verifying task', { taskId });

    try {
      // Verify access
      const task = await this.taskModel.findById(taskId);
      this.verifyOrgAccess(task, orgId, 'Task');

      // Verify task
      const verified = await this.taskModel.verify(taskId, {
        verified: verificationData.verified,
        verifiedBy: verificationData.verifiedBy,
        notes: verificationData.notes
      });

      this.logInfo('Task verified successfully', { taskId });
      return verified;
    } catch (error) {
      this.handleError(error, 'verifying task');
    }
  }

  /**
   * Get audit statistics
   */
  async getAuditStatistics(orgId) {
    this.logInfo('Fetching audit statistics', { orgId });

    try {
      const tasks = await this.taskModel.findByOrganization(orgId);
      const evidence = await this.evidenceModel.findByOrganization(orgId);

      return {
        organizationId: orgId,
        tasks: {
          total: tasks.length,
          pending: tasks.filter(t => t.status === 'pending').length,
          inProgress: tasks.filter(t => t.status === 'in_progress').length,
          complete: tasks.filter(t => t.status === 'complete').length,
          overdue: tasks.filter(t => t.dueDate && new Date(t.dueDate) < new Date()).length
        },
        evidence: {
          total: evidence.length,
          valid: evidence.filter(e => e.status === 'valid').length,
          expired: evidence.filter(e => e.status === 'expired').length,
          pending: evidence.filter(e => e.status === 'pending').length
        },
        generatedAt: new Date().toISOString()
      };
    } catch (error) {
      this.handleError(error, 'fetching audit statistics');
    }
  }

  /**
   * Get expired evidence
   */
  async getExpiredEvidence(orgId) {
    this.logInfo('Fetching expired evidence', { orgId });

    try {
      return await this.evidenceModel.findExpired(orgId);
    } catch (error) {
      this.handleError(error, 'fetching expired evidence');
    }
  }

  /**
   * Enrich audit tests
   * @private
   */
  enrichTests(tests) {
    return tests.map(test => ({
      ...test,
      completionPercentage: this.calculateCompletionPercentage(test),
      status: this.getTestStatus(test)
    }));
  }

  /**
   * Enrich evidence
   * @private
   */
  enrichEvidence(evidenceList) {
    return evidenceList.map(evidence => ({
      ...evidence,
      expirationStatus: this.getExpirationStatus(evidence),
      validityDays: this.calculateValidityDays(evidence)
    }));
  }

  /**
   * Enrich remediation tasks
   * @private
   */
  enrichTasks(tasks) {
    return tasks.map(task => ({
      ...task,
      overdue: this.isOverdue(task),
      daysUntilDue: this.daysUntilDue(task),
      priority: this.calculatePriority(task)
    }));
  }

  /**
   * Prioritize deficiencies
   * @private
   */
  prioritizeDeficiencies(deficiencies) {
    return deficiencies.sort((a, b) => {
      const severityOrder = { critical: 0, high: 1, medium: 2, low: 3 };
      return severityOrder[a.severity] - severityOrder[b.severity];
    });
  }

  /**
   * Calculate test completion percentage
   * @private
   */
  calculateCompletionPercentage(test) {
    // Business logic for completion calculation
    if (test.status === 'complete') return 100;
    if (test.status === 'in_progress') return 50;
    return 0;
  }

  /**
   * Get test status
   * @private
   */
  getTestStatus(test) {
    return test.status || 'pending';
  }

  /**
   * Get evidence expiration status
   * @private
   */
  getExpirationStatus(evidence) {
    if (!evidence.expirationDate) return 'none';

    const now = new Date();
    const expiration = new Date(evidence.expirationDate);

    if (expiration < now) return 'expired';
    if (expiration < new Date(now.getTime() + 30 * 24 * 60 * 60 * 1000)) return 'expiring_soon';
    return 'valid';
  }

  /**
   * Calculate evidence validity days
   * @private
   */
  calculateValidityDays(evidence) {
    if (!evidence.expirationDate) return null;

    const now = new Date();
    const expiration = new Date(evidence.expirationDate);
    const diffTime = expiration - now;
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    return diffDays;
  }

  /**
   * Check if task is overdue
   * @private
   */
  isOverdue(task) {
    if (!task.dueDate) return false;
    return new Date(task.dueDate) < new Date();
  }

  /**
   * Calculate days until task is due
   * @private
   */
  daysUntilDue(task) {
    if (!task.dueDate) return null;

    const now = new Date();
    const due = new Date(task.dueDate);
    const diffTime = due - now;
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    return diffDays;
  }

  /**
   * Calculate task priority
   * @private
   */
  calculatePriority(task) {
    // Business logic for priority calculation
    if (this.isOverdue(task)) return 'urgent';
    if (task.severity === 'critical') return 'high';
    if (task.severity === 'high') return 'medium';
    return 'low';
  }

  /**
   * Generate test ID
   * @private
   */
  generateTestId() {
    return `test_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  /**
   * Generate evidence ID
   * @private
   */
  generateEvidenceId() {
    return `evid_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }
}

module.exports = AuditService;
