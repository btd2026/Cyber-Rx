'use strict';

const { query } = require('../utils/db');

/**
 * BusinessProcessGraph Model
 *
 * Stores the complete business process graph structure with nodes and edges
 * Supports graph traversal, visualization, and versioning
 */
class BusinessProcessGraph {
  /**
   * Create a new business process graph
   * @param {Object} data - Graph data
   * @param {string} data.id - UUID
   * @param {string} data.organizationId - Organization ID
   * @param {string} data.version - Graph version
   * @param {string} data.name - Graph name
   * @param {string} [data.description] - Graph description
   * @param {string} [data.status] - 'draft', 'validated', 'locked'
   * @param {Array} [data.nodes] - Graph nodes
   * @param {Array} [data.edges] - Graph edges
   * @param {Object} [data.metadata] - Additional metadata
   * @returns {Promise<Object>} Created graph
   */
  static async create(data) {
    const {
      id,
      organizationId,
      version = '1.0',
      name,
      description = null,
      status = 'draft',
      nodes = [],
      edges = [],
      metadata = {}
    } = data;

    const result = await query(
      `INSERT INTO business_process_graph (
        id, organization_id, version, name, description, status, nodes, edges, metadata
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
      RETURNING *`,
      [id, organizationId, version, name, description, status, JSON.stringify(nodes), JSON.stringify(edges), JSON.stringify(metadata)]
    );

    return this._transformFromDb(result[0]);
  }

  /**
   * Find graph by ID
   * @param {string} id - Graph ID
   * @returns {Promise<Object|null>} Graph or null
   */
  static async findById(id) {
    const result = await query(
      'SELECT * FROM business_process_graph WHERE id = $1',
      [id]
    );
    return result.length > 0 ? this._transformFromDb(result[0]) : null;
  }

  /**
   * Find graphs by organization
   * @param {string} organizationId - Organization ID
   * @param {Object} [options] - Query options
   * @param {string} [options.status] - Filter by status
   * @returns {Promise<Array>} Array of graphs
   */
  static async findByOrganization(organizationId, options = {}) {
    let sql = 'SELECT * FROM business_process_graph WHERE organization_id = $1';
    const params = [organizationId];

    if (options.status) {
      sql += ' AND status = $2';
      params.push(options.status);
    }

    sql += ' ORDER BY created_at DESC';

    const result = await query(sql, params);
    return result.map(row => this._transformFromDb(row));
  }

  /**
   * Find latest validated graph for organization
   * @param {string} organizationId - Organization ID
   * @returns {Promise<Object|null>} Latest validated graph or null
   */
  static async findLatestValidated(organizationId) {
    const result = await query(
      `SELECT * FROM business_process_graph
       WHERE organization_id = $1 AND status = 'validated'
       ORDER BY validated_at DESC
       LIMIT 1`,
      [organizationId]
    );
    return result.length > 0 ? this._transformFromDb(result[0]) : null;
  }

  /**
   * Update graph
   * @param {string} id - Graph ID
   * @param {Object} data - Updated data
   * @returns {Promise<Object>} Updated graph
   */
  static async update(id, data) {
    const updates = [];
    const values = [];
    let paramCount = 1;

    const allowedFields = [
      'version', 'name', 'description', 'status', 'nodes', 'edges', 'metadata',
      'validatedBy', 'validatedAt'
    ];

    for (const field of allowedFields) {
      if (data[field] !== undefined) {
        const dbField = this._camelToSnake(field);
        if (Array.isArray(data[field]) || typeof data[field] === 'object') {
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
      `UPDATE business_process_graph SET ${updates.join(', ')} WHERE id = $${paramCount} RETURNING *`,
      values
    );

    return this._transformFromDb(result[0]);
  }

  /**
   * Delete graph
   * @param {string} id - Graph ID
   * @returns {Promise<boolean>} True if deleted
   */
  static async delete(id) {
    const result = await query('DELETE FROM business_process_graph WHERE id = $1 RETURNING id', [id]);
    return result.length > 0;
  }

  /**
   * Validate graph structure
   * @param {string} id - Graph ID
   * @param {string} validatedBy - User who validated
   * @returns {Promise<Object>} Updated graph
   */
  static async validate(id, validatedBy) {
    const result = await query(
      `UPDATE business_process_graph
       SET status = 'validated', validated_by = $2, validated_at = NOW()
       WHERE id = $1
       RETURNING *`,
      [id, validatedBy]
    );

    return this._transformFromDb(result[0]);
  }

  /**
   * Lock graph for pilot
   * @param {string} id - Graph ID
   * @returns {Promise<Object>} Updated graph
   */
  static async lock(id) {
    const result = await query(
      `UPDATE business_process_graph
       SET status = 'locked'
       WHERE id = $1 AND status = 'validated'
       RETURNING *`,
      [id]
    );

    return result.length > 0 ? this._transformFromDb(result[0]) : null;
  }

  /**
   * Get graph statistics
   * @param {string} id - Graph ID
   * @returns {Promise<Object>} Graph statistics
   */
  static async getStatistics(id) {
    const graph = await this.findById(id);
    if (!graph) {
      return null;
    }

    const nodes = graph.nodes || [];
    const edges = graph.edges || [];

    // Count node types
    const nodeTypes = {};
    nodes.forEach(node => {
      const type = node.type || 'unknown';
      nodeTypes[type] = (nodeTypes[type] || 0) + 1;
    });

    // Count edge types
    const edgeTypes = {};
    edges.forEach(edge => {
      const type = edge.type || 'unknown';
      edgeTypes[type] = (edgeTypes[type] || 0) + 1;
    });

    return {
      totalNodes: nodes.length,
      totalEdges: edges.length,
      nodeTypes,
      edgeTypes,
      version: graph.version,
      status: graph.status
    };
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
      version: row.version,
      name: row.name,
      description: row.description,
      status: row.status,
      nodes: row.nodes || [],
      edges: row.edges || [],
      metadata: row.metadata || {},
      validatedBy: row.validated_by,
      validatedAt: row.validated_at,
      createdAt: row.created_at,
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

module.exports = BusinessProcessGraph;
