'use strict';

const express = require('express');
const router = express.Router();
const Evidence = require('../models/Evidence');
const fs = require('fs').promises;
const path = require('path');
const { authenticateJWT } = require('../middleware/auth');

// Apply authentication to all routes
router.use(authenticateJWT);

/**
 * GET /api/evidence
 * List all evidence for an organization with optional filters
 */
router.get('/', async (req, res) => {
  try {
    const organizationId = req.orgId;
    const { status, evidence_type } = req.query;

    const filters = {};
    if (status) filters.status = status;
    if (evidence_type) filters.evidenceType = evidence_type;

    const evidenceList = await Evidence.findByOrganization(organizationId, filters);
    res.json({ data: evidenceList, total: evidenceList.length });
  } catch (error) {
    console.error('Error fetching evidence:', error);
    res.status(500).json({ error: error.message });
  }
});

/**
 * POST /api/evidence
 * Upload evidence (supports multipart/form-data)
 *
 * Note: For production, use multer or similar middleware for proper file handling.
 * This is a simplified implementation for V1.
 */
router.post('/', async (req, res) => {
  try {
    const organizationId = req.orgId;

    // Check if file is included in request
    let file = null;
    if (req.file) {
      file = req.file;
    } else if (req.body && req.body.fileData) {
      // Handle base64 encoded file
      file = {
        buffer: Buffer.from(req.body.fileData, 'base64'),
        originalname: req.body.fileName || 'evidence.dat',
        size: req.body.fileSize || 0
      };
    }

    const evidenceData = {
      ...req.body,
      organizationId,
      ...(req.body.evidenceType && { evidenceType: req.body.evidenceType }),
      ...(req.body.uploadedBy && { uploadedBy: req.body.uploadedBy })
    };

    // Remove file-related fields from evidenceData
    delete evidenceData.fileData;
    delete evidenceData.fileName;
    delete evidenceData.fileSize;

    const evidence = await Evidence.create(evidenceData, file);
    res.status(201).json({ data: evidence });
  } catch (error) {
    console.error('Error creating evidence:', error);
    res.status(500).json({ error: error.message });
  }
});

/**
 * POST /api/evidence/metadata
 * Create evidence without file (metadata only)
 */
router.post('/metadata', async (req, res) => {
  try {
    const organizationId = req.orgId;
    const evidenceData = { ...req.body, organizationId };
    const evidence = await Evidence.createMetadataOnly(evidenceData);
    res.status(201).json({ data: evidence });
  } catch (error) {
    console.error('Error creating evidence metadata:', error);
    res.status(500).json({ error: error.message });
  }
});

/**
 * GET /api/evidence/statistics
 * Get evidence statistics for organization
 */
router.get('/statistics', async (req, res) => {
  try {
    const { org_id } = req.headers;

    if (!org_id) {
      return res.status(400).json({ error: 'Organization ID required' });
    }

    const stats = await Evidence.getStatistics(org_id);
    res.json({ data: stats });
  } catch (error) {
    console.error('Error fetching evidence statistics:', error);
    res.status(500).json({ error: error.message });
  }
});

/**
 * GET /api/evidence/expired
 * Get expired evidence
 */
router.get('/expired', async (req, res) => {
  try {
    const { org_id } = req.headers;

    if (!org_id) {
      return res.status(400).json({ error: 'Organization ID required' });
    }

    const evidenceList = await Evidence.findExpired(org_id);
    res.json({ data: evidenceList, total: evidenceList.length });
  } catch (error) {
    console.error('Error fetching expired evidence:', error);
    res.status(500).json({ error: error.message });
  }
});

/**
 * GET /api/evidence/for-control/:controlId
 * Get evidence for a control
 */
router.get('/for-control/:controlId', async (req, res) => {
  try {
    const { controlId } = req.params;
    const evidenceList = await Evidence.findByControl(controlId);
    res.json({ data: evidenceList, total: evidenceList.length });
  } catch (error) {
    console.error('Error fetching evidence for control:', error);
    res.status(500).json({ error: error.message });
  }
});

/**
 * GET /api/evidence/for-finding/:findingId
 * Get evidence for a finding
 */
router.get('/for-finding/:findingId', async (req, res) => {
  try {
    const { findingId } = req.params;
    const evidenceList = await Evidence.findByFinding(findingId);
    res.json({ data: evidenceList, total: evidenceList.length });
  } catch (error) {
    console.error('Error fetching evidence for finding:', error);
    res.status(500).json({ error: error.message });
  }
});

/**
 * GET /api/evidence/for-task/:taskId
 * Get evidence for a task
 */
router.get('/for-task/:taskId', async (req, res) => {
  try {
    const { taskId } = req.params;
    const evidenceList = await Evidence.findByTask(taskId);
    res.json({ data: evidenceList, total: evidenceList.length });
  } catch (error) {
    console.error('Error fetching evidence for task:', error);
    res.status(500).json({ error: error.message });
  }
});

/**
 * GET /api/evidence/:id
 * Get evidence metadata by ID
 */
router.get('/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const evidence = await Evidence.findById(id);

    if (!evidence) {
      return res.status(404).json({ error: 'Evidence not found' });
    }

    res.json({ data: evidence });
  } catch (error) {
    console.error('Error fetching evidence:', error);
    res.status(500).json({ error: error.message });
  }
});

/**
 * GET /api/evidence/:id/download
 * Download evidence file
 */
router.get('/:id/download', async (req, res) => {
  try {
    const { id } = req.params;
    const evidence = await Evidence.findById(id);

    if (!evidence) {
      return res.status(404).json({ error: 'Evidence not found' });
    }

    if (!evidence.fileName) {
      return res.status(404).json({ error: 'No file associated with this evidence' });
    }

    const filePath = Evidence.getFilePath(evidence.fileName);

    try {
      await fs.access(filePath);
    } catch {
      return res.status(404).json({ error: 'File not found on disk' });
    }

    // Set appropriate headers
    res.setHeader('Content-Disposition', `attachment; filename="${evidence.fileName}"`);
    res.setHeader('Content-Type', 'application/octet-stream');

    // Stream file
    res.sendFile(filePath);
  } catch (error) {
    console.error('Error downloading evidence:', error);
    res.status(500).json({ error: error.message });
  }
});

/**
 * GET /api/evidence/file/:fileName/download
 * Download evidence file by filename (internal use)
 */
router.get('/file/:fileName/download', async (req, res) => {
  try {
    const { fileName } = req.params;
    const filePath = Evidence.getFilePath(fileName);

    try {
      await fs.access(filePath);
    } catch {
      return res.status(404).json({ error: 'File not found' });
    }

    // Set appropriate headers
    res.setHeader('Content-Disposition', `attachment; filename="${fileName}"`);
    res.setHeader('Content-Type', 'application/octet-stream');

    // Stream file
    res.sendFile(filePath);
  } catch (error) {
    console.error('Error downloading file:', error);
    res.status(500).json({ error: error.message });
  }
});

/**
 * PUT /api/evidence/:id
 * Update evidence metadata
 */
router.put('/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const evidence = await Evidence.update(id, req.body);
    res.json({ data: evidence });
  } catch (error) {
    console.error('Error updating evidence:', error);
    res.status(500).json({ error: error.message });
  }
});

/**
 * DELETE /api/evidence/:id
 * Delete evidence
 */
router.delete('/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const deleted = await Evidence.delete(id);

    if (!deleted) {
      return res.status(404).json({ error: 'Evidence not found' });
    }

    res.json({ message: 'Evidence deleted successfully' });
  } catch (error) {
    console.error('Error deleting evidence:', error);
    res.status(500).json({ error: error.message });
  }
});

module.exports = router;
