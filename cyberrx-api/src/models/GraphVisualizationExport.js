'use strict';

const { query } = require('../utils/db');

/**
 * GraphVisualizationExport Model
 *
 * Stores exported graph visualizations
 * Supports PDF, PNG, SVG, and JSON exports
 */
class GraphVisualizationExport {
  /**
   * Create a new visualization export
   * @param {Object} data - Export data
   * @param {string} data.id - UUID
   * @param {string} data.organizationId - Organization ID
   * @param {string} [data.graphId] - Graph ID
   * @param {string} data.exportType - 'pdf', 'png', 'svg', 'json'
   * @param {string} data.exportFormat - Export format
   * @param {string} [data.fileUrl] - File URL
   * @param {number} [data.fileSize] - File size in bytes
   * @param {Object} [data.visualizationConfig] - Visualization configuration
   * @param {string} [data.exportedBy] - User who exported
   * @param {Date} [data.expiresAt] - Expiration date
   * @returns {Promise<Object>} Created export
   */
  static async create(data) {
    const {
      id,
      organizationId,
      graphId = null,
      exportType,
      exportFormat,
      fileUrl = null,
      fileSize = null,
      visualizationConfig = {},
      exportedBy = null,
      expiresAt = null
    } = data;

    const result = await query(
      `INSERT INTO graph_visualization_exports (
        id, organization_id, graph_id, export_type, export_format,
        file_url, file_size, visualization_config, exported_by, expires_at
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)
      RETURNING *`,
      [
        id, organizationId, graphId, exportType, exportFormat,
        fileUrl, fileSize, JSON.stringify(visualizationConfig), exportedBy, expiresAt
      ]
    );

    return this._transformFromDb(result[0]);
  }

  /**
   * Find export by ID
   * @param {string} id - Export ID
   * @returns {Promise<Object|null>} Export or null
   */
  static async findById(id) {
    const result = await query(
      'SELECT * FROM graph_visualization_exports WHERE id = $1',
      [id]
    );
    return result.length > 0 ? this._transformFromDb(result[0]) : null;
  }

  /**
   * Find all exports for an organization
   * @param {string} organizationId - Organization ID
   * @param {Object} [options] - Query options
   * @param {string} [options.exportType] - Filter by export type
   * @returns {Promise<Array>} Array of exports
   */
  static async findByOrganization(organizationId, options = {}) {
    let sql = 'SELECT * FROM graph_visualization_exports WHERE organization_id = $1';
    const params = [organizationId];

    if (options.exportType) {
      sql += ' AND export_type = $2';
      params.push(options.exportType);
    }

    sql += ' ORDER BY export_date DESC';

    const result = await query(sql, params);
    return result.map(row => this._transformFromDb(row));
  }

  /**
   * Find exports by graph
   * @param {string} graphId - Graph ID
   * @returns {Promise<Array>} Array of exports
   */
  static async findByGraph(graphId) {
    const result = await query(
      `SELECT * FROM graph_visualization_exports
       WHERE graph_id = $1
       ORDER BY export_date DESC`,
      [graphId]
    );
    return result.map(row => this._transformFromDb(row));
  }

  /**
   * Find exports by user
   * @param {string} organizationId - Organization ID
   * @param {string} exportedBy - User who exported
   * @returns {Promise<Array>} Array of exports
   */
  static async findByExporter(organizationId, exportedBy) {
    const result = await query(
      `SELECT * FROM graph_visualization_exports
       WHERE organization_id = $1 AND exported_by = $2
       ORDER BY export_date DESC`,
      [organizationId, exportedBy]
    );
    return result.map(row => this._transformFromDb(row));
  }

  /**
   * Find expired exports
   * @returns {Promise<Array>} Array of exports
   */
  static async findExpired() {
    const result = await query(
      `SELECT * FROM graph_visualization_exports
       WHERE expires_at IS NOT NULL AND expires_at < NOW()
       ORDER BY expires_at ASC`
    );
    return result.map(row => this._transformFromDb(row));
  }

  /**
   * Delete expired exports
   * @returns {Promise<number>} Number of exports deleted
   */
  static async deleteExpired() {
    const result = await query(
      `DELETE FROM graph_visualization_exports
       WHERE expires_at IS NOT NULL AND expires_at < NOW()
       RETURNING id`
    );
    return result.length;
  }

  /**
   * Update export
   * @param {string} id - Export ID
   * @param {Object} data - Updated data
   * @returns {Promise<Object>} Updated export
   */
  static async update(id, data) {
    const updates = [];
    const values = [];
    let paramCount = 1;

    const allowedFields = ['fileUrl', 'fileSize', 'visualizationConfig', 'expiresAt'];

    for (const field of allowedFields) {
      if (data[field] !== undefined) {
        const dbField = this._camelToSnake(field);
        if (typeof data[field] === 'object') {
          updates.push(`${dbField} = $${paramCount}`);
          values.push(JSON.stringify(data[field]));
        } else {
          updates.push(`${dbField} = $${paramCount}`);
          values.push(data[field]);
        }
        paramCount++;
      }
    }

    if (updates.length === 0) {
      return this.findById(id);
    }

    values.push(id);

    const result = await query(
      `UPDATE graph_visualization_exports SET ${updates.join(', ')} WHERE id = $${paramCount} RETURNING *`,
      values
    );

    return this._transformFromDb(result[0]);
  }

  /**
   * Delete export
   * @param {string} id - Export ID
   * @returns {Promise<boolean>} True if deleted
   */
  static async delete(id) {
    const result = await query('DELETE FROM graph_visualization_exports WHERE id = $1 RETURNING id', [id]);
    return result.length > 0;
  }

  /**
   * Get export statistics
   * @param {string} organizationId - Organization ID
   * @returns {Promise<Object>} Export statistics
   */
  static async getStatistics(organizationId) {
    const result = await query(
      `SELECT
         export_type,
         COUNT(*) AS total_exports,
         SUM(file_size) AS total_size,
         AVG(file_size) AS avg_size
       FROM graph_visualization_exports
       WHERE organization_id = $1
       GROUP BY export_type`,
      [organizationId]
    );

    const stats = {};
    result.forEach(row => {
      stats[row.export_type] = {
        totalExports: parseInt(row.total_exports),
        totalSize: parseInt(row.total_size || 0),
        avgSize: parseFloat(row.avg_size || 0)
      };
    });

    return stats;
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
      graphId: row.graph_id,
      exportType: row.export_type,
      exportFormat: row.export_format,
      fileUrl: row.file_url,
      fileSize: row.file_size ? parseInt(row.file_size) : null,
      visualizationConfig: row.visualization_config || {},
      exportedBy: row.exported_by,
      exportDate: row.export_date,
      expiresAt: row.expires_at,
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

module.exports = GraphVisualizationExport;
