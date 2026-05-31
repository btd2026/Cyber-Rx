'use strict';

const BaseService = require('../../BaseService');

/**
 * Platform Service
 *
 * Handles all platform-level business logic:
 * - Organization management
 * - User management and invitations
 * - Role and permission management
 */
class PlatformService extends BaseService {
  constructor(models, logger, db) {
    super(models, logger);
    this.db = db;
  }

  /**
   * Get organizations with filters
   */
  async getOrgs(filters = {}) {
    this.logInfo('Fetching organizations', { filters });

    try {
      let query = 'SELECT id, name, type, created_at FROM orgs';
      const params = [];
      const conditions = [];

      if (filters.type) {
        conditions.push(`type = $${params.length + 1}`);
        params.push(filters.type);
      }

      if (conditions.length > 0) {
        query += ' WHERE ' + conditions.join(' AND ');
      }

      query += ' ORDER BY created_at DESC';

      if (filters.limit) {
        query += ` LIMIT $${params.length + 1}`;
        params.push(parseInt(filters.limit));
      }

      const result = await this.db.query(query, params);
      return result;
    } catch (error) {
      this.handleError(error, 'fetching organizations');
    }
  }

  /**
   * Create organization
   */
  async createOrg(data) {
    this.logInfo('Creating organization', { name: data.orgName });

    try {
      // Validate required fields
      const orgName = this.validateRequiredString(data.orgName, 'Organization name');
      const orgType = this.validateRequiredString(data.orgType, 'Organization type');

      // Generate org ID
      const orgId = this.generateOrgId(orgName);

      // Check if org already exists
      const existing = await this.db.query(
        'SELECT id FROM orgs WHERE id = $1',
        [orgId]
      );

      if (existing.length > 0) {
        const error = new Error('Organization already exists');
        error.statusCode = 409;
        error.orgId = orgId;
        throw error;
      }

      // Build setup_json from all fields
      const setupJson = {};
      Object.keys(data).forEach(key => {
        if (data[key] !== undefined && data[key] !== null) {
          setupJson[key] = typeof data[key] === 'string'
            ? this.sanitize(data[key])
            : data[key];
        }
      });

      // Insert new org
      await this.db.query(
        `INSERT INTO orgs (id, name, type, setup_json, created_at)
         VALUES ($1, $2, $3, $4, NOW())`,
        [orgId, this.sanitize(orgName), this.sanitize(orgType), JSON.stringify(setupJson)]
      );

      this.logInfo('Organization created successfully', { orgId });
      return {
        orgId,
        name: orgName,
        type: orgType,
        setup_json: setupJson,
        message: 'Organization profile created successfully'
      };
    } catch (error) {
      this.handleError(error, 'creating organization');
    }
  }

  /**
   * Update organization
   */
  async updateOrg(id, data) {
    this.logInfo('Updating organization', { id });

    try {
      // Validate org ID format
      if (!id || !id.trim()) {
        const error = new Error('Organization ID is required');
        error.statusCode = 400;
        throw error;
      }

      // Check if org exists
      const existing = await this.db.query(
        'SELECT setup_json FROM orgs WHERE id = $1',
        [id]
      );

      if (existing.length === 0) {
        const error = new Error('Organization not found');
        error.statusCode = 404;
        throw error;
      }

      // Merge new data with existing setup_json
      const mergedData = { ...existing[0].setup_json, ...data };
      Object.keys(mergedData).forEach(key => {
        if (typeof mergedData[key] === 'string') {
          mergedData[key] = this.sanitize(mergedData[key]);
        }
      });

      // Update org
      await this.db.query(
        `UPDATE orgs
         SET setup_json = $1,
             name = COALESCE($2, name),
             type = COALESCE($3, type),
             created_at = NOW()
         WHERE id = $4`,
        [JSON.stringify(mergedData), data.orgName || null, data.orgType || null, id]
      );

      this.logInfo('Organization updated successfully', { id });
      return {
        orgId: id,
        setup_json: mergedData,
        message: 'Organization profile updated successfully'
      };
    } catch (error) {
      this.handleError(error, 'updating organization');
    }
  }

  /**
   * Get organization by ID
   */
  async getOrgById(id) {
    this.logInfo('Fetching organization', { id });

    try {
      if (!id || !id.trim()) {
        const error = new Error('Organization ID is required');
        error.statusCode = 400;
        throw error;
      }

      const result = await this.db.query(
        'SELECT id, name, type, setup_json, created_at FROM orgs WHERE id = $1',
        [id]
      );

      if (result.length === 0) {
        const error = new Error('Organization not found');
        error.statusCode = 404;
        error.orgId = id;
        throw error;
      }

      return {
        orgId: result[0].id,
        name: result[0].name,
        type: result[0].type,
        setup_json: result[0].setup_json,
        created_at: result[0].created_at
      };
    } catch (error) {
      this.handleError(error, 'fetching organization');
    }
  }

  /**
   * Check if organization exists
   */
  async checkOrgExists(id) {
    this.logInfo('Checking organization existence', { id });

    try {
      if (!id || !id.trim()) {
        const error = new Error('Organization ID is required');
        error.statusCode = 400;
        throw error;
      }

      const result = await this.db.query(
        'SELECT id FROM orgs WHERE id = $1',
        [id]
      );

      return {
        exists: result.length > 0,
        orgId: id
      };
    } catch (error) {
      this.handleError(error, 'checking organization existence');
    }
  }

  /**
   * Get users for organization
   */
  async getUsers(orgId, filters = {}) {
    this.logInfo('Fetching users', { orgId });

    try {
      // Would integrate with user model
      const users = [];
      return users;
    } catch (error) {
      this.handleError(error, 'fetching users');
    }
  }

  /**
   * Invite user to organization
   */
  async inviteUser(orgId, invitationData) {
    this.logInfo('Inviting user', { orgId, email: invitationData.email });

    try {
      // Validate required fields
      const email = this.validateRequiredString(invitationData.email, 'Email');
      const role = this.validateEnum(
        invitationData.role,
        ['admin', 'user', 'viewer'],
        'Role'
      );

      // Business logic for user invitation
      const invitation = {
        id: this.generateInvitationId(),
        organizationId: orgId,
        email: this.sanitize(email),
        role,
        invitedBy: invitationData.invitedBy,
        status: 'pending',
        createdAt: new Date().toISOString(),
        expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString()
      };

      this.logInfo('User invited successfully', { invitationId: invitation.id });
      return invitation;
    } catch (error) {
      this.handleError(error, 'inviting user');
    }
  }

  /**
   * Get available roles
   */
  async getRoles() {
    this.logInfo('Fetching roles');

    try {
      const roles = [
        {
          id: 'admin',
          name: 'Administrator',
          description: 'Full access to all resources',
          permissions: ['read', 'write', 'delete', 'admin']
        },
        {
          id: 'user',
          name: 'User',
          description: 'Can create and edit resources',
          permissions: ['read', 'write']
        },
        {
          id: 'viewer',
          name: 'Viewer',
          description: 'Read-only access',
          permissions: ['read']
        }
      ];

      return roles;
    } catch (error) {
      this.handleError(error, 'fetching roles');
    }
  }

  /**
   * Assign permissions to user
   */
  async assignPermissions(userId, roleId, orgId) {
    this.logInfo('Assigning permissions', { userId, roleId, orgId });

    try {
      // Validate role
      const roles = await this.getRoles();
      const role = roles.find(r => r.id === roleId);

      if (!role) {
        const error = new Error('Invalid role');
        error.statusCode = 400;
        throw error;
      }

      // Business logic for permission assignment
      const assignment = {
        userId,
        roleId,
        organizationId: orgId,
        permissions: role.permissions,
        assignedAt: new Date().toISOString()
      };

      this.logInfo('Permissions assigned successfully', { userId, roleId });
      return assignment;
    } catch (error) {
      this.handleError(error, 'assigning permissions');
    }
  }

  /**
   * Generate organization ID from name
   * @private
   */
  generateOrgId(name) {
    return name
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/^-|-$/g, '')
      .substring(0, 50);
  }

  /**
   * Generate invitation ID
   * @private
   */
  generateInvitationId() {
    return `inv_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }
}

module.exports = PlatformService;
