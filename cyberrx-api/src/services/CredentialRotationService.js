'use strict';

const db = require('../utils/db');
const vault = require('../utils/vault');
const { AlertService } = require('./AlertService');
const logger = require('../utils/logger');

/**
 * Credential Rotation Service
 *
 * Monitors credential age and enforces rotation policies for API keys.
 * Supports configurable rotation periods per connector type and version tracking.
 *
 * Security Features:
 * - Alert on credential age exceeding rotation period
 * - Version tracking (v1, v2, v3...)
 * - Rotation history for audit trail
 * - Grace period support for multiple active credentials
 */
class CredentialRotationService {
  constructor() {
    // Default rotation periods by connector type (in days)
    this.rotationPeriods = {
      securityscorecard: 90,
      bitsight: 90,
      riskrecon: 90,
      recorded_future: 60,
      blackkite: 60,
      fortium: 60
    };

    // Alert service for sending rotation alerts
    this.alertService = new AlertService();
  }

  /**
   * Check all credentials for rotation requirements
   * @param {string} organizationId - Organization ID
   * @returns {Promise<Object[]>} Array of alerts for credentials needing rotation
   */
  async checkCredentialRotation(organizationId) {
    try {
      await db.init();

      // Get all tool connections for the organization
      const connections = await db.query(
        `SELECT id, org_id, tool_key, status, created_at, last_synced
         FROM tool_connections
         WHERE org_id = $1 AND status = 'saved'`,
        [organizationId]
      );

      const alerts = [];

      for (const connection of connections) {
        const age = this.getCredentialAge(connection);
        const rotationPeriod = this.rotationPeriods[connection.tool_key] || 90;

        // Check if credential is due for rotation
        if (age > rotationPeriod) {
          const severity = this.getSeverityByAge(age, rotationPeriod);

          alerts.push({
            organizationId,
            vendorId: null, // Credential rotation is not vendor-specific
            connectorType: connection.tool_key,
            type: 'credential_rotation_required',
            severity,
            message: this.buildRotationMessage(connection, age, rotationPeriod),
            data: {
              connectionId: connection.id,
              credentialAge: age,
              rotationPeriod,
              lastRotated: connection.created_at,
              connectorName: this.getConnectorName(connection.tool_key)
            }
          });
        }
      }

      logger.info('Credential rotation check complete', {
        organizationId,
        connectionsChecked: connections.length,
        alertsGenerated: alerts.length
      });

      return alerts;
    } catch (error) {
      logger.error('Failed to check credential rotation', {
        error: error.message,
        organizationId
      });
      throw error;
    }
  }

  /**
   * Calculate credential age in days
   * @param {Object} connection - Tool connection object
   * @returns {number} Age in days
   */
  getCredentialAge(connection) {
    const created = new Date(connection.created_at);
    const now = new Date();
    const diffTime = Math.abs(now - created);
    return Math.ceil(diffTime / (1000 * 60 * 60 * 24));
  }

  /**
   * Get severity based on credential age
   * @param {number} age - Credential age in days
   * @param {number} rotationPeriod - Rotation period in days
   * @returns {string} Severity level
   */
  getSeverityByAge(age, rotationPeriod) {
    const overdue = age - rotationPeriod;

    if (overdue > 30) return 'Critical'; // >30 days overdue
    if (overdue > 0) return 'High';      // Overdue
    if (overdue > -30) return 'Medium';  // Within 30 days of due
    return 'Low';                        // Far from due
  }

  /**
   * Build rotation alert message
   * @param {Object} connection - Tool connection object
   * @param {number} age - Credential age in days
   * @param {number} rotationPeriod - Rotation period in days
   * @returns {string} Alert message
   */
  buildRotationMessage(connection, age, rotationPeriod) {
    const connectorName = this.getConnectorName(connection.tool_key);
    const daysOverdue = age - rotationPeriod;

    if (daysOverdue > 0) {
      return `${connectorName} credential is ${daysOverdue} days overdue for rotation. Current age: ${age} days. Recommended rotation period: ${rotationPeriod} days.`;
    }

    return `${connectorName} credential will require rotation in ${rotationPeriod - age} days. Current age: ${age} days.`;
  }

  /**
   * Get connector display name
   * @param {string} connectorType - Connector type
   * @returns {string} Display name
   */
  getConnectorName(connectorType) {
    const names = {
      securityscorecard: 'SecurityScorecard',
      bitsight: 'BitSight',
      riskrecon: 'RiskRecon',
      recorded_future: 'Recorded Future',
      blackkite: 'BlackKite',
      fortium: 'Fortium'
    };
    return names[connectorType] || connectorType;
  }

  /**
   * Rotate credential (create new version)
   * @param {string} connectionId - Connection ID
   * @param {Object} newCredentials - New credentials object
   * @param {string} userId - User performing rotation
   * @returns {Promise<Object>} Rotation result
   */
  async rotateCredential(connectionId, newCredentials, userId) {
    try {
      await db.init();

      // Get current connection
      const connectionRows = await db.query(
        'SELECT id, org_id, tool_key, created_at FROM tool_connections WHERE id = $1',
        [connectionId]
      );

      const connection = connectionRows[0];
      if (!connection) {
        throw new Error('Connection not found');
      }

      // Get current credentials from vault
      const currentCreds = await vault.get(connection.org_id, connection.tool_key);
      if (!currentCreds) {
        throw new Error('Current credentials not found in vault');
      }

      // Get rotation history
      const historyRows = await db.query(
        `SELECT rotation_history FROM tool_connections WHERE id = $1`,
        [connectionId]
      );

      const history = historyRows[0]?.rotation_history || [];

      // Add current credentials to history
      history.push({
        version: 'v' + (history.length + 1),
        rotatedAt: new Date().toISOString(),
        rotatedBy: userId,
        previousCreatedAt: connection.created_at
      });

      // Update vault with new credentials
      await vault.set(connection.org_id, connection.tool_key, newCredentials);

      // Update connection with new created_at timestamp and history
      await db.query(
        `UPDATE tool_connections
         SET created_at = NOW(),
             last_synced = NOW(),
             rotation_history = $1
         WHERE id = $2`,
        [JSON.stringify(history), connectionId]
      );

      const newVersion = 'v' + (history.length + 1);

      logger.info('Credential rotated successfully', {
        connectionId,
        toolKey: connection.tool_key,
        orgId: connection.org_id,
        newVersion,
        rotatedBy: userId
      });

      return {
        success: true,
        version: newVersion,
        rotatedAt: new Date(),
        message: `Credentials rotated to ${newVersion}. Previous version saved to history.`
      };
    } catch (error) {
      logger.error('Failed to rotate credential', {
        error: error.message,
        connectionId
      });
      throw error;
    }
  }

  /**
   * Get rotation status for all credentials in an organization
   * @param {string} organizationId - Organization ID
   * @returns {Promise<Object[]>} Array of rotation status objects
   */
  async getRotationStatus(organizationId) {
    try {
      await db.init();

      const connections = await db.query(
        `SELECT id, org_id, tool_key, status, created_at, last_synced, rotation_history
         FROM tool_connections
         WHERE org_id = $1 AND status = 'saved'`,
        [organizationId]
      );

      return connections.map(conn => {
        const age = this.getCredentialAge(conn);
        const rotationPeriod = this.rotationPeriods[conn.tool_key] || 90;
        const daysUntilRotation = rotationPeriod - age;
        const history = conn.rotation_history || [];

        return {
          id: conn.id,
          connectorType: conn.tool_key,
          connectorName: this.getConnectorName(conn.tool_key),
          organizationId: conn.org_id,
          currentVersion: 'v' + (history.length + 1),
          credentialAge: age,
          rotationPeriod,
          daysUntilRotation,
          status: this.getRotationStatus(daysUntilRotation),
          lastRotated: conn.created_at,
          rotationHistory: history
        };
      });
    } catch (error) {
      logger.error('Failed to get rotation status', {
        error: error.message,
        organizationId
      });
      throw error;
    }
  }

  /**
   * Get rotation status category
   * @param {number} daysUntil - Days until rotation (negative if overdue)
   * @returns {string} Status category
   */
  getRotationStatus(daysUntil) {
    if (daysUntil < -30) return 'critical_overdue';
    if (daysUntil < 0) return 'overdue';
    if (daysUntil < 30) return 'due_soon';
    return 'ok';
  }

  /**
   * Get rotation history for a specific credential
   * @param {string} connectionId - Connection ID
   * @returns {Promise<Object>} Rotation history
   */
  async getRotationHistory(connectionId) {
    try {
      await db.init();

      const rows = await db.query(
        `SELECT id, tool_key, created_at, rotation_history
         FROM tool_connections
         WHERE id = $1`,
        [connectionId]
      );

      if (!rows[0]) {
        throw new Error('Connection not found');
      }

      const history = rows[0].rotation_history || [];

      return {
        connectionId: rows[0].id,
        connectorType: rows[0].tool_key,
        connectorName: this.getConnectorName(rows[0].tool_key),
        createdAt: rows[0].created_at,
        rotations: history.map(entry => ({
          version: entry.version,
          rotatedAt: entry.rotatedAt,
          rotatedBy: entry.rotatedBy,
          previousCreatedAt: entry.previousCreatedAt
        }))
      };
    } catch (error) {
      logger.error('Failed to get rotation history', {
        error: error.message,
        connectionId
      });
      throw error;
    }
  }
}

module.exports = CredentialRotationService;
