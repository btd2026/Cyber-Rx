'use strict';
const express = require('express');
const router = express.Router();
const EnhancedCorrelationEngine = require('../services/EnhancedCorrelationEngine');
const NarrativeTemplateService = require('../services/NarrativeTemplateService');
const NarrativeExportService = require('../services/NarrativeExportService');
const { Narrative, Finding } = require('../models');
const { authenticateJWT } = require('../middleware/auth');
const { v4: uuidv4 } = require('uuid');

/**
 * Narratives API Routes
 *
 * Comprehensive narrative management endpoints
 * All routes are authenticated and org-scoped
 */

/**
 * POST /api/narratives/generate - Generate executive narrative for a finding
 */
router.post('/generate', authenticateJWT, async (req, res) => {
  try {
    const { findingId, save = true, applyTemplate = true } = req.body;
    const organizationId = req.orgId;

    if (!findingId) {
      return res.status(400).json({ error: 'findingId is required' });
    }

    const startTime = Date.now();
    const narrative = await EnhancedCorrelationEngine.generateExecutiveNarrative(
      findingId,
      organizationId,
      { saveNarrative: save, applyTemplate }
    );
    const generationTime = Date.now() - startTime;

    res.json({
      ...narrative,
      _meta: {
        generationTimeMs: generationTime,
        generatedAt: new Date().toISOString()
      }
    });
  } catch (err) {
    console.error('Generate narrative error:', err.message);
    if (err.message === 'Finding not found') {
      return res.status(404).json({ error: 'Finding not found' });
    }
    if (err.message === 'Access denied') {
      return res.status(403).json({ error: 'Access denied' });
    }
    res.status(500).json({ error: 'Failed to generate executive narrative', message: err.message });
  }
});

/**
 * POST /api/narratives/batch - Batch generate narratives for multiple findings
 */
router.post('/batch', authenticateJWT, async (req, res) => {
  try {
    const { findingIds } = req.body;
    const organizationId = req.orgId;

    if (!findingIds || !Array.isArray(findingIds)) {
      return res.status(400).json({ error: 'findingIds array is required' });
    }

    if (findingIds.length > 50) {
      return res.status(400).json({ error: 'Maximum 50 findings per batch' });
    }

    const startTime = Date.now();
    const narratives = await EnhancedCorrelationEngine.batchCorrelate(findingIds, organizationId);
    const generationTime = Date.now() - startTime;

    res.json({
      organizationId,
      count: narratives.length,
      successful: narratives.filter(n => !n.error).length,
      failed: narratives.filter(n => n.error).length,
      data: narratives,
      _meta: {
        generationTimeMs: generationTime,
        generatedAt: new Date().toISOString()
      }
    });
  } catch (err) {
    console.error('Batch generate narratives error:', err.message);
    res.status(500).json({ error: 'Failed to batch generate narratives', message: err.message });
  }
});

/**
 * GET /api/narratives/narrative/:id - Get saved narrative by ID
 */
router.get('/narrative/:id', authenticateJWT, async (req, res) => {
  try {
    const { id } = req.params;
    const organizationId = req.orgId;

    const narrative = await Narrative.findById(id);
    if (!narrative) {
      return res.status(404).json({ error: 'Narrative not found' });
    }

    if (narrative.organizationId !== organizationId) {
      return res.status(403).json({ error: 'Access denied' });
    }

    res.json(narrative.narrativeData);
  } catch (err) {
    console.error('Get narrative error:', err.message);
    res.status(500).json({ error: 'Failed to retrieve narrative', message: err.message });
  }
});

/**
 * GET /api/narratives/finding/:findingId - Get narrative for a finding
 */
router.get('/finding/:findingId', authenticateJWT, async (req, res) => {
  try {
    const { findingId } = req.params;
    const organizationId = req.orgId;

    const narrative = await Narrative.findByFindingId(findingId, organizationId);
    if (!narrative) {
      return res.status(404).json({ error: 'Narrative not found' });
    }

    res.json({
      id: narrative.id,
      findingId: narrative.findingId,
      narrativeData: narrative.narrativeData,
      version: narrative.version,
      isPublished: narrative.isPublished,
      generatedAt: narrative.generatedAt
    });
  } catch (err) {
    console.error('Get narrative by finding error:', err.message);
    res.status(500).json({ error: 'Failed to retrieve narrative', message: err.message });
  }
});

/**
 * GET /api/narratives - List all narratives for organization
 */
router.get('/', authenticateJWT, async (req, res) => {
  try {
    const organizationId = req.orgId;
    const { isPublished, templateId, limit = 50, offset = 0, search } = req.query;

    let narratives;
    if (search) {
      narratives = await Narrative.search(organizationId, search, {
        isPublished: isPublished !== undefined ? isPublished === 'true' : undefined,
        limit: parseInt(limit),
        offset: parseInt(offset)
      });
    } else {
      narratives = await Narrative.findByOrganization(organizationId, {
        isPublished: isPublished !== undefined ? isPublished === 'true' : undefined,
        templateId,
        limit: parseInt(limit),
        offset: parseInt(offset)
      });
    }

    // Get statistics
    const stats = await Narrative.getStatistics(organizationId);

    res.json({
      organizationId,
      count: narratives.length,
      statistics: stats,
      data: narratives.map(n => ({
        id: n.id,
        findingId: n.findingId,
        findingTitle: n.narrativeData.finding?.title,
        severity: n.narrativeData.finding?.severity,
        version: n.version,
        isPublished: n.isPublished,
        templateId: n.templateId,
        generatedAt: n.generatedAt,
        updatedAt: n.updatedAt
      }))
    });
  } catch (err) {
    console.error('List narratives error:', err.message);
    res.status(500).json({ error: 'Failed to list narratives', message: err.message });
  }
});

/**
 * PUT /api/narratives/:id/publish - Publish narrative
 */
router.put('/:id/publish', authenticateJWT, async (req, res) => {
  try {
    const { id } = req.params;
    const organizationId = req.orgId;

    const narrative = await Narrative.findById(id);
    if (!narrative) {
      return res.status(404).json({ error: 'Narrative not found' });
    }

    if (narrative.organizationId !== organizationId) {
      return res.status(403).json({ error: 'Access denied' });
    }

    const published = await Narrative.publish(id);

    res.json({
      id: published.id,
      isPublished: published.isPublished,
      publishedAt: published.publishedAt
    });
  } catch (err) {
    console.error('Publish narrative error:', err.message);
    if (err.message === 'Narrative not found') {
      return res.status(404).json({ error: 'Narrative not found' });
    }
    res.status(500).json({ error: 'Failed to publish narrative', message: err.message });
  }
});

/**
 * PUT /api/narratives/:id/unpublish - Unpublish narrative
 */
router.put('/:id/unpublish', authenticateJWT, async (req, res) => {
  try {
    const { id } = req.params;
    const organizationId = req.orgId;

    const narrative = await Narrative.findById(id);
    if (!narrative) {
      return res.status(404).json({ error: 'Narrative not found' });
    }

    if (narrative.organizationId !== organizationId) {
      return res.status(403).json({ error: 'Access denied' });
    }

    const unpublished = await Narrative.unpublish(id);

    res.json({
      id: unpublished.id,
      isPublished: unpublished.isPublished
    });
  } catch (err) {
    console.error('Unpublish narrative error:', err.message);
    if (err.message === 'Narrative not found') {
      return res.status(404).json({ error: 'Narrative not found' });
    }
    res.status(500).json({ error: 'Failed to unpublish narrative', message: err.message });
  }
});

/**
 * GET /api/narratives/:id/versions - Get all versions of a narrative
 */
router.get('/:id/versions', authenticateJWT, async (req, res) => {
  try {
    const { id } = req.params;
    const organizationId = req.orgId;

    // Get the narrative to find the findingId
    const narrative = await Narrative.findById(id);
    if (!narrative) {
      return res.status(404).json({ error: 'Narrative not found' });
    }

    if (narrative.organizationId !== organizationId) {
      return res.status(403).json({ error: 'Access denied' });
    }

    const versions = await Narrative.findVersionsByFindingId(narrative.findingId, organizationId);

    res.json({
      findingId: narrative.findingId,
      count: versions.length,
      data: versions.map(v => ({
        id: v.id,
        version: v.version,
        isPublished: v.isPublished,
        generatedAt: v.generatedAt
      }))
    });
  } catch (err) {
    console.error('Get narrative versions error:', err.message);
    res.status(500).json({ error: 'Failed to retrieve narrative versions', message: err.message });
  }
});

/**
 * GET /api/narratives/:id/export/pdf - Export narrative to PDF
 */
router.get('/:id/export/pdf', authenticateJWT, async (req, res) => {
  try {
    const { id } = req.params;
    const organizationId = req.orgId;

    const narrative = await Narrative.findById(id);
    if (!narrative) {
      return res.status(404).json({ error: 'Narrative not found' });
    }

    if (narrative.organizationId !== organizationId) {
      return res.status(403).json({ error: 'Access denied' });
    }

    const pdf = await NarrativeExportService.exportToPDF(narrative.narrativeData);

    // For now, return JSON structure
    // In production, set Content-Type: application/pdf and send buffer
    res.json(pdf);
  } catch (err) {
    console.error('Export PDF error:', err.message);
    res.status(500).json({ error: 'Failed to export PDF', message: err.message });
  }
});

/**
 * GET /api/narratives/:id/export/word - Export narrative to Word
 */
router.get('/:id/export/word', authenticateJWT, async (req, res) => {
  try {
    const { id } = req.params;
    const organizationId = req.orgId;

    const narrative = await Narrative.findById(id);
    if (!narrative) {
      return res.status(404).json({ error: 'Narrative not found' });
    }

    if (narrative.organizationId !== organizationId) {
      return res.status(403).json({ error: 'Access denied' });
    }

    const word = await NarrativeExportService.exportToWord(narrative.narrativeData);

    // For now, return JSON structure
    // In production, set Content-Type: application/vnd.openxmlformats-officedocument.wordprocessingml.document
    res.json(word);
  } catch (err) {
    console.error('Export Word error:', err.message);
    res.status(500).json({ error: 'Failed to export Word', message: err.message });
  }
});

/**
 * GET /api/narratives/:id/export/powerpoint - Export narrative to PowerPoint
 */
router.get('/:id/export/powerpoint', authenticateJWT, async (req, res) => {
  try {
    const { id } = req.params;
    const organizationId = req.orgId;

    const narrative = await Narrative.findById(id);
    if (!narrative) {
      return res.status(404).json({ error: 'Narrative not found' });
    }

    if (narrative.organizationId !== organizationId) {
      return res.status(403).json({ error: 'Access denied' });
    }

    const ppt = await NarrativeExportService.exportToPowerPoint(narrative.narrativeData);

    // For now, return JSON structure
    // In production, set Content-Type: application/vnd.openxmlformats-officedocument.presentationml.presentation
    res.json(ppt);
  } catch (err) {
    console.error('Export PowerPoint error:', err.message);
    res.status(500).json({ error: 'Failed to export PowerPoint', message: err.message });
  }
});

/**
 * GET /api/narratives/:id/export/summary - Get executive summary text
 */
router.get('/:id/export/summary', authenticateJWT, async (req, res) => {
  try {
    const { id } = req.params;
    const organizationId = req.orgId;

    const narrative = await Narrative.findById(id);
    if (!narrative) {
      return res.status(404).json({ error: 'Narrative not found' });
    }

    if (narrative.organizationId !== organizationId) {
      return res.status(403).json({ error: 'Access denied' });
    }

    const summary = await NarrativeExportService.generateExecutiveSummary(narrative.narrativeData);

    res.set('Content-Type', 'text/plain');
    res.send(summary);
  } catch (err) {
    console.error('Generate summary error:', err.message);
    res.status(500).json({ error: 'Failed to generate summary', message: err.message });
  }
});

/**
 * DELETE /api/narratives/:id - Delete narrative
 */
router.delete('/:id', authenticateJWT, async (req, res) => {
  try {
    const { id } = req.params;
    const organizationId = req.orgId;

    const narrative = await Narrative.findById(id);
    if (!narrative) {
      return res.status(404).json({ error: 'Narrative not found' });
    }

    if (narrative.organizationId !== organizationId) {
      return res.status(403).json({ error: 'Access denied' });
    }

    await Narrative.delete(id);

    res.json({ success: true, message: 'Narrative deleted' });
  } catch (err) {
    console.error('Delete narrative error:', err.message);
    res.status(500).json({ error: 'Failed to delete narrative', message: err.message });
  }
});

/**
 * GET /api/narratives/templates - List all available templates
 */
router.get('/templates', authenticateJWT, async (req, res) => {
  try {
    const templates = await NarrativeTemplateService.getAllTemplates();
    res.json({ count: templates.length, data: templates });
  } catch (err) {
    console.error('List templates error:', err.message);
    res.status(500).json({ error: 'Failed to list templates', message: err.message });
  }
});

/**
 * GET /api/narratives/templates/healthcare - Get healthcare-specific templates
 */
router.get('/templates/healthcare', authenticateJWT, async (req, res) => {
  try {
    const templates = await NarrativeTemplateService.getHealthcareTemplates();
    res.json({ count: templates.length, data: templates });
  } catch (err) {
    console.error('Get healthcare templates error:', err.message);
    res.status(500).json({ error: 'Failed to get healthcare templates', message: err.message });
  }
});

/**
 * GET /api/narratives/templates/customizations - Get organization template customizations
 */
router.get('/templates/customizations', authenticateJWT, async (req, res) => {
  try {
    const organizationId = req.orgId;
    const customizations = await NarrativeTemplateService.getOrganizationCustomizations(organizationId);
    res.json({ count: customizations.length, data: customizations });
  } catch (err) {
    console.error('Get customizations error:', err.message);
    res.status(500).json({ error: 'Failed to get customizations', message: err.message });
  }
});

/**
 * POST /api/narratives/templates/:templateId/customize - Customize a template
 */
router.post('/templates/:templateId/customize', authenticateJWT, async (req, res) => {
  try {
    const { templateId } = req.params;
    const { customizations } = req.body;
    const organizationId = req.orgId;

    if (!customizations) {
      return res.status(400).json({ error: 'customizations object is required' });
    }

    const customization = await NarrativeTemplateService.setCustomization(
      organizationId,
      templateId,
      customizations
    );

    res.json(customization);
  } catch (err) {
    console.error('Customize template error:', err.message);
    res.status(500).json({ error: 'Failed to customize template', message: err.message });
  }
});

/**
 * DELETE /api/narratives/templates/customizations/:id - Delete template customization
 */
router.delete('/templates/customizations/:id', authenticateJWT, async (req, res) => {
  try {
    const { id } = req.params;

    await NarrativeTemplateService.deleteCustomization(id);

    res.json({ success: true, message: 'Customization deleted' });
  } catch (err) {
    console.error('Delete customization error:', err.message);
    res.status(500).json({ error: 'Failed to delete customization', message: err.message });
  }
});

/**
 * GET /api/narratives/statistics - Get narrative statistics
 */
router.get('/statistics', authenticateJWT, async (req, res) => {
  try {
    const organizationId = req.orgId;
    const stats = await Narrative.getStatistics(organizationId);

    res.json(stats);
  } catch (err) {
    console.error('Get statistics error:', err.message);
    res.status(500).json({ error: 'Failed to get statistics', message: err.message });
  }
});

module.exports = router;
