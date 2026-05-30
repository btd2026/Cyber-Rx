'use strict';
const express = require('express');
const router = express.Router();
const { ExecutiveOwner } = require('../models');
const { authenticateJWT } = require('../middleware/auth');

/**
 * Executive Owners API Routes
 *
 * CRUD operations for executive owner entities (governance model)
 * All routes are authenticated and org-scoped
 */

// Generate UUID helper
function generateId() {
  return `eo_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
}

/**
 * POST /api/executive-owners - Create a new executive owner
 */
router.post('/', authenticateJWT, async (req, res) => {
  try {
    const {
      roleId,
      userId,
      name,
      email,
      title,
      scopeProcesses,
      scopeControls,
      scopeRisks
    } = req.body;

    // Validation
    const validRoles = ['CIO', 'CISO', 'CFO', 'CRO', 'CLO', 'Audit', 'CTO', 'COO', 'CEO'];
    if (!roleId || !validRoles.includes(roleId)) {
      return res.status(400).json({ error: `Role ID must be one of: ${validRoles.join(', ')}` });
    }
    if (!userId || !userId.trim()) {
      return res.status(400).json({ error: 'User ID is required' });
    }

    const id = generateId();
    const organizationId = req.orgId;

    const executiveOwner = await ExecutiveOwner.create({
      id,
      roleId,
      userId,
      organizationId,
      name,
      email,
      title,
      scopeProcesses: scopeProcesses || [],
      scopeControls: scopeControls || [],
      scopeRisks: scopeRisks || []
    });

    res.status(201).json(executiveOwner);
  } catch (err) {
    console.error('Create executive owner error:', err.message);
    res.status(500).json({ error: 'Failed to create executive owner', message: err.message });
  }
});

/**
 * GET /api/executive-owners - List all executive owners for the org
 */
router.get('/', authenticateJWT, async (req, res) => {
  try {
    const organizationId = req.orgId;
    const { roleId } = req.query;

    const owners = await ExecutiveOwner.findByOrganization(organizationId, { roleId });

    res.json({
      organizationId,
      count: owners.length,
      data: owners
    });
  } catch (err) {
    console.error('List executive owners error:', err.message);
    res.status(500).json({ error: 'Failed to list executive owners' });
  }
});

/**
 * GET /api/executive-owners/roster - Get executive roster grouped by role
 */
router.get('/roster', authenticateJWT, async (req, res) => {
  try {
    const organizationId = req.orgId;

    const roster = await ExecutiveOwner.getExecutiveRoster(organizationId);

    res.json({
      organizationId,
      roster
    });
  } catch (err) {
    console.error('Get executive roster error:', err.message);
    res.status(500).json({ error: 'Failed to retrieve executive roster' });
  }
});

/**
 * GET /api/executive-owners/role/:roleId - Get executive by role
 */
router.get('/role/:roleId', authenticateJWT, async (req, res) => {
  try {
    const { roleId } = req.params;
    const organizationId = req.orgId;

    const owner = await ExecutiveOwner.findByRole(roleId, organizationId);

    if (!owner) {
      return res.status(404).json({ error: 'Executive owner not found for role', roleId });
    }

    res.json(owner);
  } catch (err) {
    console.error('Get executive by role error:', err.message);
    res.status(500).json({ error: 'Failed to retrieve executive owner' });
  }
});

/**
 * GET /api/executive-owners/user/:userId - Get executive by user ID
 */
router.get('/user/:userId', authenticateJWT, async (req, res) => {
  try {
    const { userId } = req.params;

    const owner = await ExecutiveOwner.findByUserId(userId);

    if (!owner) {
      return res.status(404).json({ error: 'Executive owner not found for user', userId });
    }

    // Verify org access
    if (owner.organizationId !== req.orgId) {
      return res.status(403).json({ error: 'Forbidden', message: 'You do not have access to this executive owner' });
    }

    res.json(owner);
  } catch (err) {
    console.error('Get executive by user error:', err.message);
    res.status(500).json({ error: 'Failed to retrieve executive owner' });
  }
});

/**
 * GET /api/executive-owners/:id - Get a specific executive owner
 */
router.get('/:id', authenticateJWT, async (req, res) => {
  try {
    const { id } = req.params;

    const owner = await ExecutiveOwner.findById(id);

    if (!owner) {
      return res.status(404).json({ error: 'Executive owner not found', id });
    }

    // Verify org access
    if (owner.organizationId !== req.orgId) {
      return res.status(403).json({ error: 'Forbidden', message: 'You do not have access to this executive owner' });
    }

    res.json(owner);
  } catch (err) {
    console.error('Get executive owner error:', err.message);
    res.status(500).json({ error: 'Failed to retrieve executive owner' });
  }
});

/**
 * PUT /api/executive-owners/:id - Update an executive owner
 */
router.put('/:id', authenticateJWT, async (req, res) => {
  try {
    const { id } = req.params;
    const {
      roleId,
      userId,
      name,
      email,
      title,
      scopeProcesses,
      scopeControls,
      scopeRisks
    } = req.body;

    // Verify ownership first
    const existing = await ExecutiveOwner.findById(id);
    if (!existing) {
      return res.status(404).json({ error: 'Executive owner not found', id });
    }
    if (existing.organizationId !== req.orgId) {
      return res.status(403).json({ error: 'Forbidden', message: 'You do not have access to this executive owner' });
    }

    const updated = await ExecutiveOwner.update(id, {
      roleId,
      userId,
      name,
      email,
      title,
      scopeProcesses,
      scopeControls,
      scopeRisks
    });

    res.json(updated);
  } catch (err) {
    console.error('Update executive owner error:', err.message);
    res.status(500).json({ error: 'Failed to update executive owner' });
  }
});

/**
 * POST /api/executive-owners/:id/scope/:scopeType/:scopeId - Add scope to executive owner
 */
router.post('/:id/scope/:scopeType/:scopeId', authenticateJWT, async (req, res) => {
  try {
    const { id, scopeType, scopeId } = req.params;

    // Verify ownership first
    const existing = await ExecutiveOwner.findById(id);
    if (!existing) {
      return res.status(404).json({ error: 'Executive owner not found', id });
    }
    if (existing.organizationId !== req.orgId) {
      return res.status(403).json({ error: 'Forbidden', message: 'You do not have access to this executive owner' });
    }

    const validScopeTypes = ['processes', 'controls', 'risks'];
    if (!validScopeTypes.includes(scopeType)) {
      return res.status(400).json({ error: `Scope type must be one of: ${validScopeTypes.join(', ')}` });
    }

    const updated = await ExecutiveOwner.addScope(id, scopeType, scopeId);

    res.json(updated);
  } catch (err) {
    console.error('Add scope error:', err.message);
    res.status(500).json({ error: 'Failed to add scope to executive owner' });
  }
});

/**
 * DELETE /api/executive-owners/:id/scope/:scopeType/:scopeId - Remove scope from executive owner
 */
router.delete('/:id/scope/:scopeType/:scopeId', authenticateJWT, async (req, res) => {
  try {
    const { id, scopeType, scopeId } = req.params;

    // Verify ownership first
    const existing = await ExecutiveOwner.findById(id);
    if (!existing) {
      return res.status(404).json({ error: 'Executive owner not found', id });
    }
    if (existing.organizationId !== req.orgId) {
      return res.status(403).json({ error: 'Forbidden', message: 'You do not have access to this executive owner' });
    }

    const validScopeTypes = ['processes', 'controls', 'risks'];
    if (!validScopeTypes.includes(scopeType)) {
      return res.status(400).json({ error: `Scope type must be one of: ${validScopeTypes.join(', ')}` });
    }

    const updated = await ExecutiveOwner.removeScope(id, scopeType, scopeId);

    res.json(updated);
  } catch (err) {
    console.error('Remove scope error:', err.message);
    res.status(500).json({ error: 'Failed to remove scope from executive owner' });
  }
});

/**
 * DELETE /api/executive-owners/:id - Delete an executive owner
 */
router.delete('/:id', authenticateJWT, async (req, res) => {
  try {
    const { id } = req.params;

    // Verify ownership first
    const existing = await ExecutiveOwner.findById(id);
    if (!existing) {
      return res.status(404).json({ error: 'Executive owner not found', id });
    }
    if (existing.organizationId !== req.orgId) {
      return res.status(403).json({ error: 'Forbidden', message: 'You do not have access to this executive owner' });
    }

    await ExecutiveOwner.delete(id);

    res.json({ message: 'Executive owner deleted successfully', id });
  } catch (err) {
    console.error('Delete executive owner error:', err.message);
    res.status(500).json({ error: 'Failed to delete executive owner' });
  }
});

module.exports = router;
