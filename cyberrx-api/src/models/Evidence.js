'use strict';

const fs = require('fs').promises;
const path = require('path');
const { db } = require('../utils/db');

/**
 * Evidence Entity
 *
 * Manages audit evidence collection and storage
 * Supports document uploads and linking to controls, findings, and tasks
 */
class Evidence {
  /**
   * Get upload directory from environment or use default
   */
  static getUploadDir() {
    return process.env.EVIDENCE_UPLOAD_DIR || path.join(__dirname, '../../uploads/evidence');
  }

  /**
   * Ensure upload directory exists
   */
  static async ensureUploadDir() {
    const uploadDir = this.getUploadDir();
    try {
      await fs.mkdir(uploadDir, { recursive: true });
    } catch (error) {
      if (error.code !== 'EEXIST') {
        throw error;
      }
    }
  }

  /**
   * Create a new evidence record with file upload
   * @param {Object} data - Evidence metadata
   * @param {Object} file - Uploaded file object (from multer or similar)
   * @returns {Promise<Object>} Created evidence
   */
  static async create(data, file = null) {
    const {
      id,
      organizationId,
      title,
      description = null,
      evidenceType = 'Document',
      uploadedBy,
      relatedFindingId = null,
      relatedControlId = null,
      relatedTaskId = null,
      evidenceDate = null,
      validityStart = null,
      validityEnd = null,
      status = 'Pending'
    } = data;

    let fileName = null;
    let fileSize = null;
    let fileUrl = null;

    // Handle file upload
    if (file) {
      await this.ensureUploadDir();
      const uploadDir = this.getUploadDir();

      // Generate unique filename
      const ext = path.extname(file.originalname || file.name || '.dat');
      const uniqueId = `${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
      fileName = `evidence_${uniqueId}${ext}`;
      const filePath = path.join(uploadDir, fileName);

      // Write file
      await fs.writeFile(filePath, file.buffer);

      fileSize = file.size || (file.buffer ? file.buffer.length : 0);
      fileUrl = `/api/evidence/${fileName}/download`;
    }

    const now = new Date();
    const query = `
      INSERT INTO evidence (
        id, organization_id, title, description, evidence_type,
        file_url, file_name, file_size, upload_date, uploaded_by,
        related_finding_id, related_control_id, related_task_id,
        evidence_date, validity_start, validity_end, status,
        review_date, reviewed_by, created_at
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17, $18, $19, $20)
      RETURNING *
    `;

    const values = [
      id || `evd_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      organizationId,
      title,
      description,
      evidenceType,
      fileUrl,
      fileName,
      fileSize,
      now,
      uploadedBy,
      relatedFindingId,
      relatedControlId,
      relatedTaskId,
      evidenceDate || now,
      validityStart,
      validityEnd,
      status,
      null, // review_date
      null, // reviewed_by
      now
    ];

    try {
      const result = await db.query(query, values);
      return this._mapFromDb(result.rows[0]);
    } catch (error) {
      // Clean up file if DB insert fails
      if (fileName) {
        try {
          await fs.unlink(path.join(this.getUploadDir(), fileName));
        } catch (cleanupError) {
          // Ignore cleanup errors
        }
      }
      throw new Error(`Failed to create evidence: ${error.message}`);
    }
  }

  /**
   * Create evidence without file (metadata only)
   * @param {Object} data - Evidence data
   * @returns {Promise<Object>} Created evidence
   */
  static async createMetadataOnly(data) {
    return this.create(data, null);
  }

  /**
   * Find evidence by ID
   * @param {string} id - Evidence ID
   * @returns {Promise<Object|null>} Evidence or null
   */
  static async findById(id) {
    const query = 'SELECT * FROM evidence WHERE id = $1';
    try {
      const result = await db.query(query, [id]);
      return result.rows.length > 0 ? this._mapFromDb(result.rows[0]) : null;
    } catch (error) {
      throw new Error(`Failed to find evidence: ${error.message}`);
    }
  }

  /**
   * Find all evidence for an organization
   * @param {string} organizationId - Organization ID
   * @param {Object} filters - Optional filters
   * @returns {Promise<Array>} Array of evidence
   */
  static async findByOrganization(organizationId, filters = {}) {
    const conditions = ['organization_id = $1'];
    const values = [organizationId];
    let paramIndex = 2;

    if (filters.status) {
      conditions.push(`status = $${paramIndex++}`);
      values.push(filters.status);
    }

    if (filters.evidenceType) {
      conditions.push(`evidence_type = $${paramIndex++}`);
      values.push(filters.evidenceType);
    }

    const query = `
      SELECT * FROM evidence
      WHERE ${conditions.join(' AND ')}
      ORDER BY created_at DESC
    `;

    try {
      const result = await db.query(query, values);
      return result.rows.map(row => this._mapFromDb(row));
    } catch (error) {
      throw new Error(`Failed to find evidence: ${error.message}`);
    }
  }

  /**
   * Find evidence for a control
   * @param {string} controlId - Control ID
   * @returns {Promise<Array>} Array of evidence
   */
  static async findByControl(controlId) {
    const query = `
      SELECT * FROM evidence
      WHERE related_control_id = $1
      ORDER BY created_at DESC
    `;
    try {
      const result = await db.query(query, [controlId]);
      return result.rows.map(row => this._mapFromDb(row));
    } catch (error) {
      throw new Error(`Failed to find evidence for control: ${error.message}`);
    }
  }

  /**
   * Find evidence for a finding
   * @param {string} findingId - Finding ID
   * @returns {Promise<Array>} Array of evidence
   */
  static async findByFinding(findingId) {
    const query = `
      SELECT * FROM evidence
      WHERE related_finding_id = $1
      ORDER BY created_at DESC
    `;
    try {
      const result = await db.query(query, [findingId]);
      return result.rows.map(row => this._mapFromDb(row));
    } catch (error) {
      throw new Error(`Failed to find evidence for finding: ${error.message}`);
    }
  }

  /**
   * Find evidence for a task
   * @param {string} taskId - Task ID
   * @returns {Promise<Array>} Array of evidence
   */
  static async findByTask(taskId) {
    const query = `
      SELECT * FROM evidence
      WHERE related_task_id = $1
      ORDER BY created_at DESC
    `;
    try {
      const result = await db.query(query, [taskId]);
      return result.rows.map(row => this._mapFromDb(row));
    } catch (error) {
      throw new Error(`Failed to find evidence for task: ${error.message}`);
    }
  }

  /**
   * Find expired evidence
   * @param {string} organizationId - Organization ID
   * @returns {Promise<Array>} Array of expired evidence
   */
  static async findExpired(organizationId) {
    const query = `
      SELECT * FROM evidence
      WHERE organization_id = $1
        AND validity_end IS NOT NULL
        AND validity_end < CURRENT_DATE
        AND status = 'Valid'
      ORDER BY validity_end ASC
    `;
    try {
      const result = await db.query(query, [organizationId]);
      return result.rows.map(row => this._mapFromDb(row));
    } catch (error) {
      throw new Error(`Failed to find expired evidence: ${error.message}`);
    }
  }

  /**
   * Update evidence
   * @param {string} id - Evidence ID
   * @param {Object} data - Data to update
   * @returns {Promise<Object>} Updated evidence
   */
  static async update(id, data) {
    const updates = [];
    const values = [];
    let paramIndex = 1;

    const allowedFields = [
      'title', 'description', 'evidenceType', 'status',
      'evidenceDate', 'validityStart', 'validityEnd',
      'reviewDate', 'reviewedBy'
    ];

    for (const field of allowedFields) {
      if (data[field] !== undefined) {
        const dbField = this._camelToSnake(field);
        updates.push(`${dbField} = $${paramIndex++}`);
        values.push(data[field]);
      }
    }

    if (updates.length === 0) {
      throw new Error('No fields to update');
    }

    values.push(id);

    const query = `
      UPDATE evidence
      SET ${updates.join(', ')}
      WHERE id = $${paramIndex}
      RETURNING *
    `;

    try {
      const result = await db.query(query, values);
      if (result.rows.length === 0) {
        throw new Error('Evidence not found');
      }
      return this._mapFromDb(result.rows[0]);
    } catch (error) {
      throw new Error(`Failed to update evidence: ${error.message}`);
    }
  }

  /**
   * Delete evidence
   * @param {string} id - Evidence ID
   * @returns {Promise<boolean>} True if deleted
   */
  static async delete(id) {
    const evidence = await this.findById(id);
    if (!evidence) {
      return false;
    }

    // Delete file if exists
    if (evidence.fileName) {
      try {
        await fs.unlink(path.join(this.getUploadDir(), evidence.fileName));
      } catch (error) {
        // Ignore file deletion errors
      }
    }

    const query = 'DELETE FROM evidence WHERE id = $1 RETURNING id';
    try {
      const result = await db.query(query, [id]);
      return result.rows.length > 0;
    } catch (error) {
      throw new Error(`Failed to delete evidence: ${error.message}`);
    }
  }

  /**
   * Get file path for download
   * @param {string} fileName - File name
   * @returns {string} Full file path
   */
  static getFilePath(fileName) {
    return path.join(this.getUploadDir(), fileName);
  }

  /**
   * Get evidence statistics for organization
   * @param {string} organizationId - Organization ID
   * @returns {Promise<Object>} Statistics
   */
  static async getStatistics(organizationId) {
    const query = `
      SELECT
        COUNT(*) as total,
        COUNT(*) FILTER (WHERE status = 'Valid') as valid,
        COUNT(*) FILTER (WHERE status = 'Expired') as expired,
        COUNT(*) FILTER (WHERE status = 'Pending') as pending,
        COUNT(*) FILTER (WHERE status = 'Rejected') as rejected,
        COUNT(*) FILTER (WHERE file_name IS NOT NULL) as with_files,
        SUM(file_size) as total_storage_bytes,
        COUNT(*) FILTER (WHERE related_control_id IS NOT NULL) as for_controls,
        COUNT(*) FILTER (WHERE related_finding_id IS NOT NULL) as for_findings,
        COUNT(*) FILTER (WHERE related_task_id IS NOT NULL) as for_tasks
      FROM evidence
      WHERE organization_id = $1
    `;

    try {
      const result = await db.query(query, [organizationId]);
      const row = result.rows[0];
      return {
        total: parseInt(row.total),
        valid: parseInt(row.valid),
        expired: parseInt(row.expired),
        pending: parseInt(row.pending),
        rejected: parseInt(row.rejected),
        withFiles: parseInt(row.with_files),
        totalStorageBytes: row.total_storage_bytes ? parseInt(row.total_storage_bytes) : 0,
        forControls: parseInt(row.for_controls),
        forFindings: parseInt(row.for_findings),
        forTasks: parseInt(row.for_tasks)
      };
    } catch (error) {
      throw new Error(`Failed to get evidence statistics: ${error.message}`);
    }
  }

  /**
   * Map database row to application model
   * @private
   */
  static _mapFromDb(row) {
    if (!row) return null;
    return {
      id: row.id,
      organizationId: row.organization_id,
      title: row.title,
      description: row.description,
      evidenceType: row.evidence_type,
      fileUrl: row.file_url,
      fileName: row.file_name,
      fileSize: row.file_size,
      uploadDate: row.upload_date,
      uploadedBy: row.uploaded_by,
      relatedFindingId: row.related_finding_id,
      relatedControlId: row.related_control_id,
      relatedTaskId: row.related_task_id,
      evidenceDate: row.evidence_date,
      validityStart: row.validity_start,
      validityEnd: row.validity_end,
      status: row.status,
      reviewDate: row.review_date,
      reviewedBy: row.reviewed_by,
      createdAt: row.created_at
    };
  }

  /**
   * Convert camelCase to snake_case
   * @private
   */
  static _camelToSnake(str) {
    return str.replace(/[A-Z]/g, letter => `_${letter.toLowerCase()}`);
  }
}

module.exports = Evidence;
