/**
 * Executive Onboarding Service
 *
 * Service for onboarding executives (CFO, CISO, Board members) to the platform.
 * Handles account creation, dashboard navigation training, on-demand query
 * training, alert notification configuration, and ongoing support.
 *
 * Task: T-PILOT-004
 * Phase: Phase 2 - Pilot Deployment & Customer Onboarding
 */

const { Pool } = require('pg');
const bcrypt = require('bcrypt');
const crypto = require('crypto');

class ExecutiveOnboardingService {
  constructor(databaseUrl = null) {
    this.pool = new Pool(databaseUrl || {
      connectionString: process.env.DATABASE_URL
    });
  }

  /**
   * Onboard executive
   * @param {string} organizationId - Organization ID
   * @param {object} executiveData - Executive data
   * @returns {object} Onboarding result
   */
  async onboardExecutive(organizationId, executiveData) {
    const {
      email,
      name,
      role,
      department,
      phoneNumber = null,
      skipTraining = false
    } = executiveData;

    const result = {
      organizationId,
      email,
      role,
      status: 'pending',
      steps: [],
      warnings: [],
      createdAt: new Date().toISOString()
    };

    try {
      // Step 1: Create user account
      const accountResult = await this.createExecutiveAccount({
        organizationId,
        email,
        name,
        role,
        department
      });
      result.steps.push({ step: 'create_account', status: 'completed', result: accountResult });
      result.userId = accountResult.userId;

      // Step 2: Generate temporary password
      const tempPassword = await this.generateTemporaryPassword(accountResult.userId);
      result.steps.push({ step: 'generate_password', status: 'completed' });
      result.temporaryPassword = tempPassword;

      // Step 3: Configure dashboard access
      const accessResult = await this.configureDashboardAccess(accountResult.userId, role);
      result.steps.push({ step: 'configure_access', status: 'completed', result: accessResult });

      // Step 4: Configure notification preferences
      const notificationConfig = await this.configureNotifications(accountResult.userId, executiveData);
      result.steps.push({ step: 'configure_notifications', status: 'completed', result: notificationConfig });

      // Step 5: Create onboarding checklist
      const checklist = await this.createOnboardingChecklist(accountResult.userId, role, skipTraining);
      result.steps.push({ step: 'create_checklist', status: 'completed', result: checklist });
      result.onboardingChecklist = checklist;

      // Step 6: Schedule training sessions (if not skipped)
      if (!skipTraining) {
        const trainingSchedule = await this.scheduleTraining(accountResult.userId, role);
        result.steps.push({ step: 'schedule_training', status: 'completed', result: trainingSchedule });
        result.trainingSchedule = trainingSchedule;
      }

      result.status = 'onboarded';

    } catch (error) {
      result.status = 'failed';
      result.error = error.message;
    }

    // Store onboarding record
    await this.storeOnboardingRecord(organizationId, result);

    return result;
  }

  /**
   * Create executive account
   * @param {object} accountData - Account data
   * @returns {object} Account creation result
   */
  async createExecutiveAccount(accountData) {
    const { organizationId, email, name, role, department } = accountData;

    try {
      // Check if user already exists
      const existingUser = await this.pool.query(
        'SELECT id FROM users WHERE email = $1',
        [email]
      );

      if (existingUser.rows.length > 0) {
        return {
          success: true,
          userId: existingUser.rows[0].id,
          existing: true
        };
      }

      // Generate user ID
      const userId = crypto.randomUUID();

      // Create user record
      await this.pool.query(
        `INSERT INTO users (id, email, name, role, organization_id, department, status, created_at)
         VALUES ($1, $2, $3, $4, $5, $6, 'pending_activation', $7)`,
        [userId, email, name, role, organizationId, department, new Date()]
      );

      // Assign executive role
      await this.pool.query(
        `INSERT INTO user_roles (user_id, role, assigned_at)
         VALUES ($1, $2, $3)`,
        [userId, this.mapExecutiveRole(role), new Date()]
      );

      return {
        success: true,
        userId,
        existing: false
      };
    } catch (error) {
      return {
        success: false,
        error: error.message
      };
    }
  }

  /**
   * Generate temporary password
   * @param {string} userId - User ID
   * @returns {string} Temporary password
   */
  async generateTemporaryPassword(userId) {
    // Generate 16-character temporary password
    const tempPassword = crypto.randomBytes(16).toString('base64').substring(0, 16);

    // Hash password
    const hashedPassword = await bcrypt.hash(tempPassword, 10);

    // Store hashed password
    await this.pool.query(
      `UPDATE users SET password_hash = $1, password_changed_at = NULL, updated_at = $2
       WHERE id = $3`,
      [hashedPassword, new Date(), userId]
    );

    // Set password expiry to 7 days
    const expiresAt = new Date();
    expiresAt.setDate(expiresAt.getDate() + 7);

    await this.pool.query(
      `UPDATE users SET password_expires_at = $1 WHERE id = $2`,
      [expiresAt, userId]
    );

    return tempPassword;
  }

  /**
   * Configure dashboard access
   * @param {string} userId - User ID
   * @param {string} role - Executive role
   * @returns {object} Access configuration result
   */
  async configureDashboardAccess(userId, role) {
    const dashboards = this.getAccessibleDashboards(role);

    try {
      // Grant dashboard permissions
      for (const dashboard of dashboards) {
        await this.pool.query(
          `INSERT INTO user_permissions (user_id, resource_type, resource_id, permission, granted_at)
           VALUES ($1, 'dashboard', $2, $3, $4)
           ON CONFLICT (user_id, resource_type, resource_id)
           DO NOTHING`,
          [userId, dashboard.id, dashboard.permission, new Date()]
        );
      }

      return {
        success: true,
        dashboards: dashboards.map(d => d.id)
      };
    } catch (error) {
      return {
        success: false,
        error: error.message
      };
    }
  }

  /**
   * Configure notification preferences
   * @param {string} userId - User ID
   * @param {object} executiveData - Executive data
   * @returns {object} Notification configuration
   */
  async configureNotifications(userId, executiveData) {
    const { email, phoneNumber, role } = executiveData;

    const config = {
      channels: ['email'],
      alertTypes: this.getDefaultAlertTypes(role),
      frequency: 'daily',
      quietHours: {
        enabled: true,
        start: '18:00',
        end: '08:00'
      }
    };

    // Add SMS if phone number provided
    if (phoneNumber) {
      config.channels.push('sms');
    }

    try {
      await this.pool.query(
        `INSERT INTO notification_preferences (user_id, config, created_at)
         VALUES ($1, $2, $3)
         ON CONFLICT (user_id)
         DO UPDATE SET config = $2, updated_at = $3`,
        [userId, JSON.stringify(config), new Date()]
      );

      return {
        success: true,
        config
      };
    } catch (error) {
      return {
        success: false,
        error: error.message
      };
    }
  }

  /**
   * Create onboarding checklist
   * @param {string} userId - User ID
   * @param {string} role - Role
   * @param {boolean} skipTraining - Skip training items
   * @returns {object} Onboarding checklist
   */
  async createOnboardingChecklist(userId, role, skipTraining) {
    const checklist = {
      userId,
      role,
      items: [],
      createdAt: new Date().toISOString()
    };

    // Week 1: Platform Access & Navigation
    checklist.items.push({
      week: 1,
      category: 'Platform Access',
      tasks: [
        { id: 'login', task: 'Log in to platform', completed: false },
        { id: 'change_password', task: 'Change temporary password', completed: false },
        { id: 'navigate_dashboard', task: 'Navigate to assigned dashboard', completed: false },
        { id: 'explore_features', task: 'Explore dashboard features', completed: false }
      ]
    });

    if (!skipTraining) {
      // Week 2: Agent Interpretation Training
      checklist.items.push({
        week: 2,
        category: 'Agent Interpretation',
        tasks: [
          { id: 'review_briefing', task: 'Review sample agent briefing', completed: false },
          { id: 'understand_metrics', task: 'Understand key metrics', completed: false },
          { id: 'interpret_methodology', task: 'Interpret methodology trail', completed: false },
          { id: 'practice_queries', task: 'Practice on-demand queries', completed: false }
        ]
      });

      // Week 3: Interactive Query Training
      checklist.items.push({
        week: 3,
        category: 'Interactive Queries',
        tasks: [
          { id: 'formulate_queries', task: 'Formulate custom queries', completed: false },
          { id: 'use_filters', task: 'Use filters and drill-downs', completed: false },
          { id: 'export_reports', task: 'Export reports', completed: false },
          { id: 'manage_alerts', task: 'Manage alert preferences', completed: false }
        ]
      });

      // Week 4: First Live Briefing
      checklist.items.push({
        week: 4,
        category: 'First Briefing',
        tasks: [
          { id: 'attend_briefing', task: 'Attend first live briefing', completed: false },
          { id: 'provide_feedback', task: 'Provide briefing feedback', completed: false },
          { id: 'schedule_followup', task: 'Schedule recurring briefings', completed: false }
        ]
      });
    }

    try {
      await this.pool.query(
        `INSERT INTO onboarding_checklists (user_id, checklist_data, created_at)
         VALUES ($1, $2, $3)`,
        [userId, JSON.stringify(checklist), new Date()]
      );
    } catch (error) {
      checklist.storageError = error.message;
    }

    return checklist;
  }

  /**
   * Schedule training sessions
   * @param {string} userId - User ID
   * @param {string} role - Role
   * @returns {object} Training schedule
   */
  async scheduleTraining(userId, role) {
    const schedule = {
      userId,
      role,
      sessions: [],
      createdAt: new Date().toISOString()
    };

    // Week 1: Platform Navigation (1:1)
    const week1Date = new Date();
    week1Date.setDate(week1Date.getDate() + 2);

    schedule.sessions.push({
      week: 1,
      title: 'Platform Navigation Training',
      type: '1_on_1',
      scheduledFor: week1Date.toISOString(),
      duration: 60,
      topics: ['Dashboard overview', 'Navigation', 'Account settings', 'Support channels']
    });

    // Week 2: Agent Interpretation (Small Group)
    const week2Date = new Date(week1Date);
    week2Date.setDate(week2Date.getDate() + 7);

    schedule.sessions.push({
      week: 2,
      title: 'Agent Interpretation Training',
      type: 'small_group',
      scheduledFor: week2Date.toISOString(),
      duration: 90,
      topics: ['Reading briefings', 'Methodology interpretation', 'Understanding metrics']
    });

    // Week 3: Interactive Queries (Workshop)
    const week3Date = new Date(week2Date);
    week3Date.setDate(week3Date.getDate() + 7);

    schedule.sessions.push({
      week: 3,
      title: 'Interactive Query Workshop',
      type: 'workshop',
      scheduledFor: week3Date.toISOString(),
      duration: 90,
      topics: ['Query formulation', 'Filters and drill-downs', 'Export and reporting']
    });

    try {
      for (const session of schedule.sessions) {
        await this.pool.query(
          `INSERT INTO training_sessions (user_id, session_data, scheduled_for, status)
           VALUES ($1, $2, $3, 'scheduled')`,
          [userId, JSON.stringify(session), new Date(session.scheduledFor)]
        );
      }
    } catch (error) {
      schedule.storageError = error.message;
    }

    return schedule;
  }

  /**
   * Complete onboarding task
   * @param {string} userId - User ID
   * @param {string} taskId - Task ID
   * @returns {object} Completion result
   */
  async completeOnboardingTask(userId, taskId) {
    try {
      await this.pool.query(
        `UPDATE onboarding_checklists
         SET checklist_data = jsonb_set(
           checklist_data,
           '{items}',
           (
             SELECT jsonb_agg(
               CASE
                 WHEN item->'tasks' ? $2
                 THEN jsonb_set(
                   item,
                   '{tasks}',
                   (
                     SELECT jsonb_agg(
                       CASE
                         WHEN task->>'id' = $2
                         THEN task || '{"completed": true, "completedAt": "' || NOW() || '"}'
                         ELSE task
                       END
                     )
                     FROM jsonb_array_elements(item->'tasks') task
                   )
                 )
                 ELSE item
               END
             )
             FROM jsonb_array_elements(checklist_data->'items') item
           ),
           true
         ),
         updated_at = $3
         WHERE user_id = $4`,
        [taskId, taskId, new Date(), userId]
      );

      return {
        success: true,
        taskId,
        completedAt: new Date().toISOString()
      };
    } catch (error) {
      return {
        success: false,
        error: error.message
      };
    }
  }

  /**
   * Get onboarding status
   * @param {string} userId - User ID
   * @returns {object} Onboarding status
   */
  async getOnboardingStatus(userId) {
    try {
      const result = await this.pool.query(
        'SELECT checklist_data FROM onboarding_checklists WHERE user_id = $1',
        [userId]
      );

      if (result.rows.length === 0) {
        return {
          success: false,
          error: 'Onboarding checklist not found'
        };
      }

      const checklist = result.rows[0].checklist_data;

      const totalTasks = checklist.items.reduce(
        (sum, week) => sum + week.tasks.length,
        0
      );

      const completedTasks = checklist.items.reduce(
        (sum, week) => sum + week.tasks.filter(t => t.completed).length,
        0
      );

      return {
        success: true,
        userId,
        totalTasks,
        completedTasks,
        progress: Math.round((completedTasks / totalTasks) * 100),
        checklist
      };
    } catch (error) {
      return {
        success: false,
        error: error.message
      };
    }
  }

  /**
   * Map executive role to system role
   * @param {string} executiveRole - Executive role
   * @returns {string} System role
   */
  mapExecutiveRole(executiveRole) {
    const roleMap = {
      'CFO': 'executive_finance',
      'CISO': 'executive_security',
      'Board Member': 'executive_board',
      'CRO': 'executive_risk',
      'Corporate Secretary': 'executive_board'
    };

    return roleMap[executiveRole] || 'executive';
  }

  /**
   * Get accessible dashboards for role
   * @param {string} role - Role
   * @returns {Array<object>} Accessible dashboards
   */
  getAccessibleDashboards(role) {
    const dashboardMap = {
      'CFO': [
        { id: 'cfo-dashboard', permission: 'read' }
      ],
      'CISO': [
        { id: 'ciso-dashboard', permission: 'read' }
      ],
      'Board Member': [
        { id: 'board-dashboard', permission: 'read' },
        { id: 'cfo-dashboard', permission: 'read' },
        { id: 'ciso-dashboard', permission: 'read' }
      ],
      'CRO': [
        { id: 'cfo-dashboard', permission: 'read' },
        { id: 'ciso-dashboard', permission: 'read' }
      ],
      'Corporate Secretary': [
        { id: 'board-dashboard', permission: 'read' }
      ]
    };

    return dashboardMap[role] || [];
  }

  /**
   * Get default alert types for role
   * @param {string} role - Role
   * @returns {Array<string>} Alert types
   */
  getDefaultAlertTypes(role) {
    const alertMap = {
      'CFO': ['mlr_breach', 'stop_loss_warning', 'reserve_adequacy', 'high_exposure'],
      'CISO': ['security_incident', 'compliance_violation', 'critical_vulnerability', 'high_likelihood'],
      'Board Member': ['governance_alert', 'material_breach', 'regulatory_fine'],
      'CRO': ['high_exposure', 'emerging_risk', 'aggregate_exposure'],
      'Corporate Secretary': ['governance_alert', 'regulatory_fine']
    };

    return alertMap[role] || [];
  }

  /**
   * Store onboarding record
   * @param {string} organizationId - Organization ID
   * @param {object} result - Onboarding result
   * @returns {object} Storage result
   */
  async storeOnboardingRecord(organizationId, result) {
    try {
      await this.pool.query(
        `INSERT INTO executive_onboarding (organization_id, onboarding_data, created_at)
         VALUES ($1, $2, $3)`,
        [organizationId, JSON.stringify(result), new Date()]
      );

      return { success: true };
    } catch (error) {
      return { success: false, error: error.message };
    }
  }

  /**
   * Get onboarding summary for organization
   * @param {string} organizationId - Organization ID
   * @returns {object} Onboarding summary
   */
  async getOnboardingSummary(organizationId) {
    try {
      const result = await this.pool.query(
        `SELECT
          COUNT(DISTINCT onboarding_data->>'userId') as total_executives,
          COUNT(DISTINCT CASE WHEN onboarding_data->>'status' = 'onboarded' THEN onboarding_data->>'userId' END) as onboarded_executives,
          COUNT(DISTINCT CASE WHEN onboarding_data->>'role' = 'CFO' THEN onboarding_data->>'userId' END) as cfo_count,
          COUNT(DISTINCT CASE WHEN onboarding_data->>'role' = 'CISO' THEN onboarding_data->>'userId' END) as ciso_count,
          COUNT(DISTINCT CASE WHEN onboarding_data->>'role' = 'Board Member' THEN onboarding_data->>'userId' END) as board_count
         FROM executive_onboarding
         WHERE organization_id = $1`,
        [organizationId]
      );

      const row = result.rows[0];

      return {
        success: true,
        organizationId,
        totalExecutives: parseInt(row.total_executives || 0),
        onboardedExecutives: parseInt(row.onboarded_executives || 0),
        cfoCount: parseInt(row.cfo_count || 0),
        cisoCount: parseInt(row.ciso_count || 0),
        boardCount: parseInt(row.board_count || 0),
        onboardingRate: row.total_executives > 0
          ? Math.round((row.onboarded_executives / row.total_executives) * 100)
          : 0
      };
    } catch (error) {
      return {
        success: false,
        error: error.message
      };
    }
  }
}

module.exports = ExecutiveOnboardingService;
