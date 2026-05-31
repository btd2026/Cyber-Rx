'use strict';

const { query } = require('../utils/db');

/**
 * Vendor Sync Job Model
 *
 * Tracks async vendor sync operations in the BullMQ queue
 * Links queue jobs to database records for status tracking
 */
class VendorSyncJob {
  /**
   * Create a new sync job record
   * @param {Object} data - Job data
   * @param {string} data.id - Job ID (from BullMQ)
   * @param {string} data.organizationId - Organization UUID
   * @param {string} [data.vendorId] - Vendor UUID
   * @param {string} data.connectorType - Connector type
   * @param {string} data.jobType - Job type: sync_vendor, sync_connector, assessment
   * @returns {Promise<Object>} Created job record
   */
  static async create(data) {
    const {
      id,
      organizationId,
      vendorId = null,
      connectorType,
      jobType
    } = data;

    const result = await query(
      `INSERT INTO vendor_sync_jobs (
        id, organization_id, vendor_id, connector_type, job_type, status, retry_count
      ) VALUES ($1, $2, $3, $4, $5, 'queued', 0)
      RETURNING *`,
      [id, organizationId, vendorId, connectorType, jobType]
    );

    return this._transformFromDb(result[0]);
  }

  /**
   * Find job by ID
   * @param {string} id - Job ID
   * @returns {Promise<Object|null>} Job record or null
   */
  static async findById(id) {
    const result = await query(
      'SELECT * FROM vendor_sync_jobs WHERE id = $1',
      [id]
    );
    return result.length > 0 ? this._transformFromDb(result[0]) : null;
  }

  /**
   * Find all jobs for an organization
   * @param {string} organizationId - Organization ID
   * @param {Object} [options] - Query options
   * @param {string} [options.status] - Filter by status
   * @param {string} [options.vendorId] - Filter by vendor
   * @param {number} [options.limit=50] - Max results
   * @param {number} [options.offset=0] - Result offset
   * @returns {Promise<Array>} Array of job records
   */
  static async findByOrganization(organizationId, options = {}) {
    const {
      status = null,
      vendorId = null,
      limit = 50,
      offset = 0
    } = options;

    let sql = 'SELECT * FROM vendor_sync_jobs WHERE organization_id = $1';
    const params = [organizationId];
    let paramCount = 2;

    if (status) {
      sql += ` AND status = $${paramCount}`;
      params.push(status);
      paramCount++;
    }

    if (vendorId) {
      sql += ` AND vendor_id = $${paramCount}`;
      params.push(vendorId);
      paramCount++;
    }

    sql += ' ORDER BY created_at DESC LIMIT $' + paramCount + ' OFFSET $' + (paramCount + 1);
    params.push(limit, offset);

    const result = await query(sql, params);
    return result.map(row => this._transformFromDb(row));
  }

  /**
   * Find jobs by status
   * @param {string} status - Job status
   * @param {number} [limit=100] - Max results
   * @returns {Promise<Array>} Array of job records
   */
  static async findByStatus(status, limit = 100) {
    const result = await query(
      'SELECT * FROM vendor_sync_jobs WHERE status = $1 ORDER BY created_at ASC LIMIT $2',
      [status, limit]
    );
    return result.map(row => this._transformFromDb(row));
  }

  /**
   * Find jobs by vendor
   * @param {string} vendorId - Vendor ID
   * @param {Object} [options] - Query options
   * @param {string} [options.status] - Filter by status
   * @returns {Promise<Array>} Array of job records
   */
  static async findByVendor(vendorId, options = {}) {
    const { status = null } = options;

    let sql = 'SELECT * FROM vendor_sync_jobs WHERE vendor_id = $1';
    const params = [vendorId];

    if (status) {
      sql += ' AND status = $2';
      params.push(status);
    }

    sql += ' ORDER BY created_at DESC';

    const result = await query(sql, params);
    return result.map(row => this._transformFromDb(row));
  }

  /**
   * Update job status
   * @param {string} id - Job ID
   * @param {string} status - New status: queued, running, completed, failed
   * @param {Object} [options] - Additional update options
   * @param {string} [options.errorMessage] - Error message (for failed jobs)
   * @param {number} [options.retryCount] - Retry count
   * @returns {Promise<Object>} Updated job record
   */
  static async updateStatus(id, status, options = {}) {
    const { errorMessage = null, retryCount = null } = options;

    const updates = ['status = $2', 'updated_at = CURRENT_TIMESTAMP'];
    const params = [id, status];
    let paramCount = 3;

    if (status === 'running' && !errorMessage) {
      updates.push('started_at = CURRENT_TIMESTAMP');
    }

    if (status === 'completed' && !errorMessage) {
      updates.push('completed_at = CURRENT_TIMESTAMP');
    }

    if (errorMessage) {
      updates.push(`error_message = $${paramCount}`);
      params.push(errorMessage);
      paramCount++;
    }

    if (retryCount !== null) {
      updates.push(`retry_count = $${paramCount}`);
      params.push(retryCount);
      paramCount++;
    }

    const result = await query(
      `UPDATE vendor_sync_jobs SET ${updates.join(', ')} WHERE id = $1 RETURNING *`,
      params
    );

    return this._transformFromDb(result[0]);
  }

  /**
   * Increment retry count
   * @param {string} id - Job ID
   * @returns {Promise<Object>} Updated job record
   */
  static async incrementRetry(id) {
    const result = await query(
      `UPDATE vendor_sync_jobs
       SET retry_count = retry_count + 1, updated_at = CURRENT_TIMESTAMP
       WHERE id = $1
       RETURNING *`,
      [id]
    );

    return this._transformFromDb(result[0]);
  }

  /**
   * Delete old completed jobs
   * @param {number} days - Days to retain
   * @returns {Promise<number>} Number of deleted jobs
   */
  static async deleteOld(days = 30) {
    const result = await query(
      `DELETE FROM vendor_sync_jobs
       WHERE status IN ('completed', 'failed')
       AND completed_at < CURRENT_TIMESTAMP - INTERVAL '${days} days'
       RETURNING id`
    );

    return result.length;
  }

  /**
   * Get job statistics
   * @param {string} organizationId - Organization ID
   * @returns {Promise<Object>} Job statistics
   */
  static async getStatistics(organizationId) {
    const result = await query(
      `SELECT
        status,
        COUNT(*) as count,
        AVG(EXTRACT(EPOCH FROM (completed_at - started_at))) as avg_duration_seconds
       FROM vendor_sync_jobs
       WHERE organization_id = $1
       AND started_at IS NOT NULL
       GROUP BY status`,
      [organizationId]
    );

    return result.reduce((stats, row) => {
      stats[row.status] = {
        count: parseInt(row.count),
        avgDurationSeconds: row.avg_duration_seconds ? parseFloat(row.avg_duration_seconds) : null
      };
      return stats;
    }, {});
  }

  /**
   * Get recent job activity
   * @param {string} organizationId - Organization ID
   * @param {number} hours - Hours to look back
   * @returns {Promise<Array>} Array of recent jobs
   */
  static async getRecentActivity(organizationId, hours = 24) {
    const result = await query(
      `SELECT * FROM vendor_sync_jobs
       WHERE organization_id = $1
       AND created_at > CURRENT_TIMESTAMP - INTERVAL '${hours} hours'
       ORDER BY created_at DESC
       LIMIT 20`,
      [organizationId]
    );

    return result.map(row => this._transformFromDb(row));
  }

  /**
   * Update job progress
   * @param {string} id - Job ID
   * @param {number} progress - Progress percentage (0-100)
   * @param {Object} [metadata] - Additional metadata to merge
   * @returns {Promise<Object>} Updated job record
   */
  static async updateProgress(id, progress, metadata = {}) {
    const validatedProgress = Math.min(100, Math.max(0, progress));

    const result = await query(
      `UPDATE vendor_sync_jobs
       SET metadata = COALESCE(metadata, '{}'::jsonb) || $2,
           updated_at = CURRENT_TIMESTAMP
       WHERE id = $1
       RETURNING *`,
      [id, JSON.stringify({ ...metadata, progress: validatedProgress })]
    );

    return this._transformFromDb(result[0]);
  }

  /**
   * Update job metadata
   * @param {string} id - Job ID
   * @param {Object} metadata - Metadata to merge into existing metadata
   * @returns {Promise<Object>} Updated job record
   */
  static async updateMetadata(id, metadata) {
    const result = await query(
      `UPDATE vendor_sync_jobs
       SET metadata = COALESCE(metadata, '{}'::jsonb) || $2,
           updated_at = CURRENT_TIMESTAMP
       WHERE id = $1
       RETURNING *`,
      [id, JSON.stringify(metadata)]
    );

    return this._transformFromDb(result[0]);
  }

  /**
   * Get count of jobs for an organization
   * @param {string} organizationId - Organization ID
   * @param {Object} [options] - Query options
   * @param {string} [options.status] - Filter by status
   * @param {string} [options.vendorId] - Filter by vendor
   * @returns {Promise<number>} Count of jobs
   */
  static async countByOrganization(organizationId, options = {}) {
    const { status = null, vendorId = null } = options;

    let sql = 'SELECT COUNT(*) as count FROM vendor_sync_jobs WHERE organization_id = $1';
    const params = [organizationId];
    let paramCount = 2;

    if (status) {
      sql += ` AND status = $${paramCount}`;
      params.push(status);
      paramCount++;
    }

    if (vendorId) {
      sql += ` AND vendor_id = $${paramCount}`;
      params.push(vendorId);
    }

    const result = await query(sql, params);
    return parseInt(result[0].count);
  }

  /**
   * Transform database row to camelCase model
   * @private
   */
  static _transformFromDb(row) {
    if (!row) return null;
    return {
      id: row.id,
      organizationId: row.organization_id,
      vendorId: row.vendor_id,
      connectorType: row.connector_type,
      jobType: row.job_type,
      status: row.status,
      startedAt: row.started_at,
      completedAt: row.completed_at,
      errorMessage: row.error_message,
      retryCount: row.retry_count,
      metadata: row.metadata || {},
      createdAt: row.created_at,
      updatedAt: row.updated_at
    };
  }
}

module.exports = VendorSyncJob;
