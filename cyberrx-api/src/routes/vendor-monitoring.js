'use strict';

const express = require('express');
const router = express.Router();
const { v4: uuidv4 } = require('uuid');
const VendorRiskSignal = require('../models/VendorRiskSignal');
const ContinuousMonitoringService = require('../services/ContinuousMonitoringService');
const { authenticateJWT } = require('../middleware/auth');

// Apply authentication to all routes
router.use(authenticateJWT);

// Import all connectors
const SecurityScorecardConnector = require('../connectors/SecurityScorecardConnector');
const BitSightConnector = require('../connectors/BitSightConnector');
const RiskReconConnector = require('../connectors/RiskReconConnector');
const BlackKiteConnector = require('../connectors/BlackKiteConnector');
const RecordedFutureConnector = require('../connectors/RecordedFutureConnector');
const CywareConnector = require('../connectors/CywareConnector');
const GuidePointConnector = require('../connectors/GuidePointConnector');
const HHSOCRConnector = require('../connectors/HHSOCRConnector');
const GoogleAlertsConnector = require('../connectors/GoogleAlertsConnector');
const ComplianceEvidenceConnector = require('../connectors/ComplianceEvidenceConnector');
const QuestionnaireConnector = require('../connectors/QuestionnaireConnector');
const FourthPartyConnector = require('../connectors/FourthPartyConnector');

// Connector registry
const CONNECTORS = {
  securityscorecard: SecurityScorecardConnector,
  bitsight: BitSightConnector,
  riskrecon: RiskReconConnector,
  blackkite: BlackKiteConnector,
  recordedfuture: RecordedFutureConnector,
  cyware: CywareConnector,
  guidepoint: GuidePointConnector,
  hhsocr: HHSOCRConnector,
  googlealerts: GoogleAlertsConnector,
  compliance: ComplianceEvidenceConnector,
  questionnaire: QuestionnaireConnector,
  fourthparty: FourthPartyConnector
};

/**
 * GET /api/vendor-monitoring/signals
 * List all signals for organization with optional filters
 */
router.get('/signals', async (req, res) => {
  try {
    const organizationId = req.orgId;
    const { vendorId, sourceName, signalCategory, severity, status, limit } = req.query;

    const signals = await VendorRiskSignal.findByOrganization(organizationId, {
      vendorId,
      sourceName,
      signalCategory,
      severity,
      status,
      limit: limit ? parseInt(limit) : undefined
    });

    res.json({
      success: true,
      data: signals,
      count: signals.length
    });
  } catch (error) {
    console.error('Error fetching signals:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

/**
 * GET /api/vendor-monitoring/signals/:id
 * Get specific signal by ID
 */
router.get('/signals/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const signal = await VendorRiskSignal.findById(id);

    if (!signal) {
      return res.status(404).json({
        success: false,
        error: 'Signal not found'
      });
    }

    // Verify organization access
    if (signal.organizationId !== req.orgId) {
      return res.status(403).json({
        success: false,
        error: 'Access denied'
      });
    }

    res.json({
      success: true,
      data: signal
    });
  } catch (error) {
    console.error('Error fetching signal:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

/**
 * GET /api/vendor-monitoring/vendors/:vendorId/signals
 * Get all signals for a specific vendor
 */
router.get('/vendors/:vendorId/signals', async (req, res) => {
  try {
    const { vendorId } = req.params;
    const { organizationId } = req;

    const signals = await VendorRiskSignal.findByVendor(vendorId, organizationId);

    res.json({
      success: true,
      data: signals,
      count: signals.length
    });
  } catch (error) {
    console.error('Error fetching vendor signals:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

/**
 * GET /api/vendor-monitoring/vendors/:vendorId/dashboard
 * Get vendor risk dashboard with 7 key metrics
 */
router.get('/vendors/:vendorId/dashboard', async (req, res) => {
  try {
    const { vendorId } = req.params;
    const { organizationId } = req;

    const dashboard = await ContinuousMonitoringService.getVendorDashboard(vendorId, organizationId);

    res.json({
      success: true,
      data: dashboard
    });
  } catch (error) {
    console.error('Error fetching vendor dashboard:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

/**
 * POST /api/vendor-monitoring/vendors/:vendorId/sync
 * Sync all connectors for a vendor
 */
router.post('/vendors/:vendorId/sync', async (req, res) => {
  try {
    const { vendorId } = req.params;
    const { organizationId } = req;
    const { connectors } = req.body; // Optional: array of connector types to sync

    const connectorTypes = connectors || Object.keys(CONNECTORS);
    const results = [];

    for (const connectorType of connectorTypes) {
      const ConnectorClass = CONNECTORS[connectorType];
      if (!ConnectorClass) {
        results.push({
          connectorType,
          status: 'error',
          error: 'Unknown connector type'
        });
        continue;
      }

      try {
        const connector = new ConnectorClass({
          organizationId,
          vendorId
        });
        const result = await connector.sync();
        results.push(result);
      } catch (error) {
        results.push({
          connectorType,
          status: 'error',
          error: error.message
        });
      }
    }

    // Correlate signals to risks after sync
    await ContinuousMonitoringService.correlateSignalsToRisks(vendorId, organizationId);

    res.json({
      success: true,
      data: results,
      summary: {
        totalConnectors: results.length,
        successful: results.filter(r => r.status === 'success').length,
        failed: results.filter(r => r.status === 'error').length,
        totalSignals: results.reduce((sum, r) => sum + (r.signalsCollected || 0), 0)
      }
    });
  } catch (error) {
    console.error('Error syncing vendor connectors:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

/**
 * POST /api/vendor-monitoring/vendors/:vendorId/assessment
 * Run continuous assessment
 */
router.post('/vendors/:vendorId/assessment', async (req, res) => {
  try {
    const { vendorId } = req.params;
    const { organizationId } = req;

    // Sync all connectors
    const syncResult = await ContinuousMonitoringService.collectVendorSignals(vendorId, organizationId);

    // Calculate new risk score
    const riskScore = await ContinuousMonitoringService.calculateVendorRiskScore(vendorId, organizationId);

    // Correlate to risks
    const correlation = await ContinuousMonitoringService.correlateSignalsToRisks(vendorId, organizationId);

    res.json({
      success: true,
      data: {
        syncResult,
        riskScore,
        correlation
      }
    });
  } catch (error) {
    console.error('Error running assessment:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

/**
 * POST /api/vendor-monitoring/vendors/:vendorId/evidence-request
 * Request updated evidence from vendor
 */
router.post('/vendors/:vendorId/evidence-request', async (req, res) => {
  try {
    const { vendorId } = req.params;
    const { organizationId } = req;

    const result = await ContinuousMonitoringService.requestEvidenceRefresh(vendorId, organizationId);

    res.json({
      success: true,
      data: result
    });
  } catch (error) {
    console.error('Error requesting evidence:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

/**
 * POST /api/vendor-monitoring/vendors/:vendorId/reassessment
 * Create reassessment task
 */
router.post('/vendors/:vendorId/reassessment', async (req, res) => {
  try {
    const { vendorId } = req.params;
    const { organizationId } = req;
    const { reason } = req.body;

    const result = await ContinuousMonitoringService.createReassessmentTask(
      vendorId,
      organizationId,
      reason || 'Manual reassessment requested'
    );

    res.json({
      success: true,
      data: result
    });
  } catch (error) {
    console.error('Error creating reassessment task:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

/**
 * GET /api/vendor-monitoring/connectors
 * List available connector types
 */
router.get('/connectors', (req, res) => {
  const connectorList = Object.keys(CONNECTORS).map(key => ({
    id: key,
    name: key.charAt(0).toUpperCase() + key.slice(1),
    type: CONNECTORS[key].prototype.constructor.name.replace('Connector', '')
  }));

  res.json({
    success: true,
    data: connectorList
  });
});

/**
 * POST /api/vendor-monitoring/connectors/:connectorType/test
 * Test connector connection
 */
router.post('/connectors/:connectorType/test', async (req, res) => {
  try {
    const { connectorType } = req.params;
    const { organizationId, vendorId } = req.body;

    const ConnectorClass = CONNECTORS[connectorType.toLowerCase()];
    if (!ConnectorClass) {
      return res.status(400).json({
        success: false,
        error: 'Unknown connector type'
      });
    }

    const connector = new ConnectorClass({
      organizationId,
      vendorId
    });

    const result = await connector.testConnection();

    res.json({
      success: true,
      data: result
    });
  } catch (error) {
    console.error('Error testing connector:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

/**
 * POST /api/vendor-monitoring/connectors/:connectorType/manual-entry
 * Submit manual entry for web scraping fallback
 */
router.post('/connectors/:connectorType/manual-entry', async (req, res) => {
  try {
    const { connectorType } = req.params;
    const { organizationId, vendorId, signalData } = req.body;

    const result = await ContinuousMonitoringService.recordManualSignal(
      vendorId,
      organizationId,
      signalData
    );

    res.json({
      success: true,
      data: result
    });
  } catch (error) {
    console.error('Error recording manual signal:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

/**
 * GET /api/vendor-monitoring/categories
 * Get signal category summaries for organization
 */
router.get('/categories', async (req, res) => {
  try {
    const { organizationId } = req;

    const categories = await VendorRiskSignal.getSignalCategories(organizationId);

    res.json({
      success: true,
      data: categories
    });
  } catch (error) {
    console.error('Error fetching signal categories:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

module.exports = router;
