'use strict';
const express = require('express');
const router = express.Router();
const db = require('../utils/db');
const { authenticateJWT, requireOrgAccess } = require('../middleware/auth');

// Helper: Generate org ID from org name
function generateOrgId(name) {
  return name
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '')
    .substring(0, 50);
}

// Helper: Sanitize input to prevent XSS
function sanitize(str) {
  if (typeof str !== 'string') return str;
  return str.replace(/[<>]/g, '');
}

// POST /api/orgs - Create/save org profile (bound to authenticated org)
router.post('/', authenticateJWT, async (req, res) => {
  try {
    const { orgName, orgType, ...rest } = req.body;

    // Validate required fields
    if (!orgName || !orgName.trim()) {
      return res.status(400).json({ error: 'Organization name is required' });
    }
    if (!orgType || !orgType.trim()) {
      return res.status(400).json({ error: 'Organization type is required' });
    }

    // Use orgId from JWT - user can only create org for their authenticated identity
    const orgId = req.orgId;

    if (!orgId) {
      return res.status(401).json({
        error: 'Unauthorized',
        message: 'Organization identity not found in authentication token'
      });
    }

    // Check if org already exists
    const existing = await db.query(
      'SELECT id FROM orgs WHERE id = $1',
      [orgId]
    );

    if (existing.length > 0) {
      return res.status(409).json({
        error: 'Organization already exists',
        orgId,
        message: 'Use PUT to update existing organization'
      });
    }

    // Build setup_json from all fields
    const setupJson = {};
    Object.keys(req.body).forEach(key => {
      if (req.body[key] !== undefined && req.body[key] !== null) {
        setupJson[key] = typeof req.body[key] === 'string'
          ? sanitize(req.body[key])
          : req.body[key];
      }
    });

    // Insert new org
    await db.query(
      `INSERT INTO orgs (id, name, type, setup_json, created_at)
       VALUES ($1, $2, $3, $4, NOW())`,
      [orgId, sanitize(orgName), sanitize(orgType), JSON.stringify(setupJson)]
    );

    res.status(201).json({
      orgId,
      name: orgName,
      type: orgType,
      setup_json: setupJson,
      message: 'Organization profile created successfully'
    });
  } catch (err) {
    console.error('Create org error:', err.message);
    res.status(500).json({ error: 'Failed to create organization profile' });
  }
});

// PUT /api/orgs/:id - Update existing org (org-isolated)
router.put('/:id', authenticateJWT, requireOrgAccess, async (req, res) => {
  try {
    const { id } = req.params;
    const { orgName, orgType, ...rest } = req.body;

    // Validate org ID format
    if (!id || !id.trim()) {
      return res.status(400).json({ error: 'Organization ID is required' });
    }

    // Check if org exists
    const existing = await db.query(
      'SELECT setup_json FROM orgs WHERE id = $1',
      [id]
    );

    if (existing.length === 0) {
      // If not found, create it (for first-time setup)
      if (!orgName || !orgType) {
        return res.status(400).json({
          error: 'Organization name and type required for creation'
        });
      }

      const setupJson = {};
      Object.keys(req.body).forEach(key => {
        if (req.body[key] !== undefined && req.body[key] !== null) {
          setupJson[key] = typeof req.body[key] === 'string'
            ? sanitize(req.body[key])
            : req.body[key];
        }
      });

      await db.query(
        `INSERT INTO orgs (id, name, type, setup_json, created_at)
         VALUES ($1, $2, $3, $4, NOW())`,
        [id, sanitize(orgName), sanitize(orgType), JSON.stringify(setupJson)]
      );

      return res.status(201).json({
        orgId: id,
        name: orgName,
        type: orgType,
        setup_json: setupJson,
        message: 'Organization profile created successfully'
      });
    }

    // Merge new data with existing setup_json
    const mergedData = { ...existing[0].setup_json, ...req.body };
    Object.keys(mergedData).forEach(key => {
      if (typeof mergedData[key] === 'string') {
        mergedData[key] = sanitize(mergedData[key]);
      }
    });

    // Update org
    await db.query(
      `UPDATE orgs
       SET setup_json = $1,
           name = COALESCE($2, name),
           type = COALESCE($3, type),
           created_at = NOW()
       WHERE id = $4`,
      [JSON.stringify(mergedData), orgName || null, orgType || null, id]
    );

    res.json({
      orgId: id,
      setup_json: mergedData,
      message: 'Organization profile updated successfully'
    });
  } catch (err) {
    console.error('Update org error:', err.message);
    res.status(500).json({ error: 'Failed to update organization profile' });
  }
});

// GET /api/orgs/:id - Retrieve org data (org-isolated)
router.get('/:id', authenticateJWT, requireOrgAccess, async (req, res) => {
  try {
    const { id } = req.params;

    if (!id || !id.trim()) {
      return res.status(400).json({ error: 'Organization ID is required' });
    }

    const result = await db.query(
      'SELECT id, name, type, setup_json, created_at FROM orgs WHERE id = $1',
      [id]
    );

    if (result.length === 0) {
      return res.status(404).json({
        error: 'Organization not found',
        orgId: id
      });
    }

    res.json({
      orgId: result[0].id,
      name: result[0].name,
      type: result[0].type,
      setup_json: result[0].setup_json,
      created_at: result[0].created_at
    });
  } catch (err) {
    console.error('Get org error:', err.message);
    res.status(500).json({ error: 'Failed to retrieve organization profile' });
  }
});

// GET /api/orgs/:id/exists - Check if org exists (org-isolated)
router.get('/:id/exists', authenticateJWT, requireOrgAccess, async (req, res) => {
  try {
    const { id } = req.params;

    if (!id || !id.trim()) {
      return res.status(400).json({ error: 'Organization ID is required' });
    }

    const result = await db.query(
      'SELECT id FROM orgs WHERE id = $1',
      [id]
    );

    res.json({
      exists: result.length > 0,
      orgId: id
    });
  } catch (err) {
    console.error('Check org exists error:', err.message);
    res.status(500).json({ error: 'Failed to check organization existence' });
  }
});

module.exports = router;
