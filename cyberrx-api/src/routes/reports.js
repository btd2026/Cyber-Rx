'use strict';

const express = require('express');
const router = express.Router();
const PDFReportService = require('../services/PDFReportService');
const { authenticateJWT } = require('../middleware/auth');
const logger = require('../config/logger');

// Apply authentication to all routes
router.use(authenticateJWT);

/**
 * POST /api/reports/generate
 * Generate and return PDF report
 */
router.post('/generate', async (req, res) => {
  const startTime = Date.now();

  try {
    const { organizationId } = req;
    const { reportType, dateRange, includeCharts, includeAppendix } = req.body;

    // Validate request
    if (!organizationId) {
      return res.status(400).json({
        success: false,
        error: 'Organization ID is required'
      });
    }

    // Log report generation request
    logger.info('PDF report generation requested', {
      organizationId,
      reportType: reportType || 'executive',
      dateRange: dateRange || '12M',
      includeCharts: includeCharts !== false,
      includeAppendix: includeAppendix !== false,
      userId: req.user?.id
    });

    // Create PDF service instance
    const pdfService = new PDFReportService();

    // Generate report
    const pdfBuffer = await pdfService.generateReport(organizationId, {
      reportType: reportType || 'executive',
      dateRange: dateRange || '12M',
      includeCharts: includeCharts !== false,
      includeAppendix: includeAppendix !== false
    });

    // Generate filename
    const timestamp = new Date().toISOString().split('T')[0];
    const filename = `vendor-risk-report-${organizationId}-${timestamp}.pdf`;

    // Log success
    const duration = Date.now() - startTime;
    logger.info('PDF report generated successfully', {
      organizationId,
      filename,
      size: pdfBuffer.length,
      duration
    });

    // Set headers and send PDF
    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Length', pdfBuffer.length);
    res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
    res.setHeader('X-Content-Type-Options', 'nosniff');

    res.send(pdfBuffer);

  } catch (error) {
    const duration = Date.now() - startTime;

    logger.error('Error generating PDF report', {
      error: error.message,
      stack: error.stack,
      organizationId: req.organizationId,
      duration
    });

    res.status(500).json({
      success: false,
      error: 'Failed to generate PDF report',
      message: error.message
    });
  }
});

/**
 * GET /api/reports/preview
 * Preview report metadata without generating full PDF
 */
router.get('/preview', async (req, res) => {
  try {
    const { organizationId } = req;

    // Fetch preview data
    const pdfService = new PDFReportService();
    const vendors = await pdfService.getVendors(organizationId);
    const alerts = await pdfService.getAlerts(organizationId, '12M');

    // Calculate preview statistics
    const totalVendors = vendors.length;
    const avgRiskScore = vendors.reduce((sum, v) => sum + pdfService.getNumericRiskScore(v), 0) / totalVendors;
    const criticalVendors = vendors.filter(v => pdfService.getNumericRiskScore(v) < 40).length;
    const unacknowledgedAlerts = alerts.filter(a => !a.acknowledgedAt).length;

    res.json({
      success: true,
      data: {
        organizationId,
        preview: {
          totalVendors,
          averageRiskScore: avgRiskScore.toFixed(1),
          criticalVendors,
          unacknowledgedAlerts,
          totalAlerts: alerts.length
        },
        estimatedSize: `${Math.max(1, Math.floor(totalVendors / 10))} MB`,
        estimatedTime: '30-60 seconds'
      }
    });

  } catch (error) {
    logger.error('Error previewing report', {
      error: error.message,
      organizationId: req.organizationId
    });

    res.status(500).json({
      success: false,
      error: 'Failed to preview report',
      message: error.message
    });
  }
});

/**
 * GET /api/reports/health
 * Check if PDF generation service is healthy
 */
router.get('/health', async (req, res) => {
  try {
    // Test PDF generation with minimal data
    const pdfService = new PDFReportService();

    // Quick health check - create a simple PDF
    const testBuffer = await pdfService.generateReport('health-check', {
      reportType: 'executive',
      dateRange: '1D',
      includeCharts: false,
      includeAppendix: false
    });

    res.json({
      success: true,
      status: 'healthy',
      message: 'PDF generation service is operational',
      details: {
        canGeneratePDF: true,
        testPDFSize: testBuffer.length
      }
    });

  } catch (error) {
    logger.error('PDF service health check failed', {
      error: error.message
    });

    res.status(503).json({
      success: false,
      status: 'unhealthy',
      error: 'PDF generation service is not operational',
      message: error.message
    });
  }
});

module.exports = router;
