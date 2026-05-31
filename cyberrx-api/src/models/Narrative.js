'use strict';

const { query } = require('../utils/db');

/**
 * Narrative Model
 *
 * Stores generated executive narratives for findings
 * Supports version history and publishing workflow
 */
class Narrative {
  /**
   * Create a new narrative
   * @param {Object} data - Narrative data
   * @param {string} data.id - UUID
   * @param {string} data.findingId - Finding ID
   * @param {string} data.organizationId - Organization ID
   * @param {Object} data.narrativeData - Complete narrative structure
   * @param {number} [data.version] - Version number
   * @param {boolean} [data.isPublished] - Published status
   * @param {string} [data.templateId] - Template ID used
   * @param {number} [data.templateVersion] - Template version
   * @returns {Promise<Object>} Created narrative
   */
  static async create(data) {
    const {
      id,
      findingId,
      organizationId,
      narrativeData,
      version = 1,
      isPublished = false,
      templateId = null,
      templateVersion = 1
    } = data;

    // Get next version if not provided
    let finalVersion = version;
    if (version === 1) {
      const versionResult = await query(
        `SELECT COALESCE(MAX(version), 0) + 1 as next_version
         FROM narratives
         WHERE finding_id = $1 AND organization_id = $2`,
        [findingId, organizationId]
      );
      finalVersion = versionResult[0].next_version;
    }

    const result = await query(
      `INSERT INTO narratives (
        id, finding_id, organization_id, narrative_data, version,
        is_published, template_id, template_version
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
      RETURNING *`,
      [
        id, findingId, organizationId,
        JSON.stringify(narrativeData),
        finalVersion,
        isPublished,
        templateId,
        templateVersion
      ]
    );

    return this._transformFromDb(result[0]);
  }

  /**
   * Find narrative by ID
   * @param {string} id - Narrative ID
   * @returns {Promise<Object|null>} Narrative or null
   */
  static async findById(id) {
    const result = await query(
      'SELECT * FROM narratives WHERE id = $1',
      [id]
    );
    return result.length > 0 ? this._transformFromDb(result[0]) : null;
  }

  /**
   * Find narrative by finding ID (latest version)
   * @param {string} findingId - Finding ID
   * @param {string} organizationId - Organization ID
   * @returns {Promise<Object|null>} Narrative or null
   */
  static async findByFindingId(findingId, organizationId) {
    const result = await query(
      `SELECT * FROM narratives
       WHERE finding_id = $1 AND organization_id = $2
       ORDER BY version DESC
       LIMIT 1`,
      [findingId, organizationId]
    );
    return result.length > 0 ? this._transformFromDb(result[0]) : null;
  }

  /**
   * Find all narratives for an organization
   * @param {string} organizationId - Organization ID
   * @param {Object} [options] - Query options
   * @param {boolean} [options.isPublished] - Filter by published status
   * @param {string} [options.templateId] - Filter by template ID
   * @param {number} [options.limit] - Limit results
   * @param {number} [options.offset] - Offset results
   * @returns {Promise<Array>} Array of narratives
   */
  static async findByOrganization(organizationId, options = {}) {
    let sql = 'SELECT * FROM narratives WHERE organization_id = $1';
    const params = [organizationId];
    let paramCount = 2;

    if (options.isPublished !== undefined) {
      sql += ` AND is_published = $${paramCount}`;
      params.push(options.isPublished);
      paramCount++;
    }

    if (options.templateId) {
      sql += ` AND template_id = $${paramCount}`;
      params.push(options.templateId);
      paramCount++;
    }

    sql += ' ORDER BY generated_at DESC';

    if (options.limit) {
      sql += ` LIMIT $${paramCount}`;
      params.push(options.limit);
      paramCount++;

      if (options.offset) {
        sql += ` OFFSET $${paramCount}`;
        params.push(options.offset);
      }
    }

    const result = await query(sql, params);
    return result.map(row => this._transformFromDb(row));
  }

  /**
   * Find all versions of a narrative for a finding
   * @param {string} findingId - Finding ID
   * @param {string} organizationId - Organization ID
   * @returns {Promise<Array>} Array of narrative versions
   */
  static async findVersionsByFindingId(findingId, organizationId) {
    const result = await query(
      `SELECT * FROM narratives
       WHERE finding_id = $1 AND organization_id = $2
       ORDER BY version ASC`,
      [findingId, organizationId]
    );
    return result.map(row => this._transformFromDb(row));
  }

  /**
   * Publish narrative
   * @param {string} id - Narrative ID
   * @returns {Promise<Object>} Updated narrative
   */
  static async publish(id) {
    const result = await query(
      `UPDATE narratives
       SET is_published = true, published_at = NOW(), updated_at = NOW()
       WHERE id = $1
       RETURNING *`,
      [id]
    );

    if (result.length === 0) {
      throw new Error('Narrative not found');
    }

    return this._transformFromDb(result[0]);
  }

  /**
   * Unpublish narrative
   * @param {string} id - Narrative ID
   * @returns {Promise<Object>} Updated narrative
   */
  static async unpublish(id) {
    const result = await query(
      `UPDATE narratives
       SET is_published = false, published_at = NULL, updated_at = NOW()
       WHERE id = $1
       RETURNING *`,
      [id]
    );

    if (result.length === 0) {
      throw new Error('Narrative not found');
    }

    return this._transformFromDb(result[0]);
  }

  /**
   * Update narrative
   * @param {string} id - Narrative ID
   * @param {Object} data - Updated data
   * @returns {Promise<Object>} Updated narrative
   */
  static async update(id, data) {
    const updates = [];
    const values = [];
    let paramCount = 1;

    const allowedFields = [
      'narrativeData', 'templateId', 'templateVersion'
    ];

    for (const field of allowedFields) {
      if (data[field] !== undefined) {
        const dbField = this._camelToSnake(field);
        if (field === 'narrativeData') {
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
      `UPDATE narratives SET ${updates.join(', ')}, updated_at = NOW() WHERE id = $${paramCount} RETURNING *`,
      values
    );

    if (result.length === 0) {
      throw new Error('Narrative not found');
    }

    return this._transformFromDb(result[0]);
  }

  /**
   * Delete narrative
   * @param {string} id - Narrative ID
   * @returns {Promise<boolean>} True if deleted
   */
  static async delete(id) {
    const result = await query('DELETE FROM narratives WHERE id = $1 RETURNING id', [id]);
    return result.length > 0;
  }

  /**
   * Get narrative statistics
   * @param {string} organizationId - Organization ID
   * @returns {Promise<Object>} Statistics
   */
  static async getStatistics(organizationId) {
    const result = await query(
      `SELECT
         COUNT(*) as total,
         COUNT(*) FILTER (WHERE is_published = true) as published_count,
         COUNT(*) FILTER (WHERE is_published = false) as draft_count,
         MAX(version) as max_version,
         COUNT(DISTINCT finding_id) as unique_findings
       FROM narratives
       WHERE organization_id = $1`,
      [organizationId]
    );

    const stats = result[0];
    return {
      total: parseInt(stats.total),
      publishedCount: parseInt(stats.published_count),
      draftCount: parseInt(stats.draft_count),
      maxVersion: parseInt(stats.max_version),
      uniqueFindings: parseInt(stats.unique_findings)
    };
  }

  /**
   * Get recent narratives
   * @param {string} organizationId - Organization ID
   * @param {number} [limit=10] - Limit results
   * @returns {Promise<Array>} Array of recent narratives
   */
  static async getRecent(organizationId, limit = 10) {
    return this.findByOrganization(organizationId, { limit });
  }

  /**
   * Search narratives
   * @param {string} organizationId - Organization ID
   * @param {string} searchTerm - Search term
   * @param {Object} [options] - Query options
   * @returns {Promise<Array>} Array of matching narratives
   */
  static async search(organizationId, searchTerm, options = {}) {
    let sql = `
      SELECT DISTINCT n.*
      FROM narratives n
      LEFT JOIN findings f ON n.finding_id = f.id
      WHERE n.organization_id = $1
      AND (
        n.narrative_data::text ILIKE $2
        OR f.title ILIKE $2
        OR f.description ILIKE $2
      )
    `;
    const params = [organizationId, `%${searchTerm}%`];
    let paramCount = 3;

    if (options.isPublished !== undefined) {
      sql += ` AND n.is_published = $${paramCount}`;
      params.push(options.isPublished);
      paramCount++;
    }

    sql += ' ORDER BY n.generated_at DESC';

    if (options.limit) {
      sql += ` LIMIT $${paramCount}`;
      params.push(options.limit);
    }

    const result = await query(sql, params);
    return result.map(row => this._transformFromDb(row));
  }

  /**
   * Transform database row to camelCase model
   * @private
   */
  static _transformFromDb(row) {
    if (!row) return null;
    return {
      id: row.id,
      findingId: row.finding_id,
      organizationId: row.organization_id,
      narrativeData: row.narrative_data,
      version: row.version,
      isPublished: row.is_published,
      publishedAt: row.published_at,
      templateId: row.template_id,
      templateVersion: row.template_version,
      generatedAt: row.generated_at,
      updatedAt: row.updated_at
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

module.exports = Narrative;
