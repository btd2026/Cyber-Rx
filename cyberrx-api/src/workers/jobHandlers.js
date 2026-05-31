'use strict';

const logger = require('../utils/logger');
const Vendor = require('../models/Vendor');

// Dynamic connector imports
const connectorModules = {
  bcbs_210: '../connectors/BCBS210Connector',
  bcbs_210_sftp: '../connectors/BCBS210SFTPConnector',
  security_scorecard: '../connectors/SecurityScorecardConnector',
  bitsight: '../connectors/BitSightConnector',
  riskrecon: '../connectors/RiskReconConnector',
  blackkite: '../connectors/BlackKiteConnector',
  fourthparty: '../connectors/FourthPartyConnector',
  recorded_future: '../connectors/RecordedFutureConnector',
  hhs_ocr: '../connectors/HHSOCRConnector',
  cyware: '../connectors/CywareConnector',
  guidepoint: '../connectors/GuidePointConnector',
  asset_discovery: '../connectors/AssetDiscoveryConnector',
  google_alerts: '../connectors/GoogleAlertsConnector',
  compliance_evidence: '../connectors/ComplianceEvidenceConnector',
  questionnaire: '../connectors/QuestionnaireConnector'
};

/**
 * Job Handlers
 *
 * Handles specific job types for vendor sync operations
 * Each handler processes a job type and returns results
 */

/**
 * Load connector class dynamically
 * @param {string} connectorType - Connector type
 * @returns {Promise<BaseConnector>} Connector instance
 */
async function loadConnector(connectorType) {
  try {
    const modulePath = connectorModules[connectorType];

    if (!modulePath) {
      throw new Error(`Unknown connector type: ${connectorType}`);
    }

    const ConnectorClass = require(modulePath);
    return ConnectorClass;
  } catch (error) {
    logger.error('Failed to load connector', {
      connectorType,
      error: error.message
    });
    throw error;
  }
}

/**
 * Get available connector types for a vendor
 * @param {string} vendorId - Vendor ID
 * @param {string} organizationId - Organization ID
 * @returns {Promise<Array>} Array of connector types
 */
async function getVendorConnectorTypes(vendorId, organizationId) {
  try {
    const vendor = await Vendor.findById(vendorId);

    if (!vendor) {
      throw new Error(`Vendor not found: ${vendorId}`);
    }

    // Check vendor tier and data access to determine relevant connectors
    // For now, return all available connectors
    // In production, this would be based on vendor configuration
    const connectorTypes = Object.keys(connectorModules);

    logger.debug('Retrieved connector types for vendor', {
      vendorId,
      connectorTypes: connectorTypes.length
    });

    return connectorTypes;
  } catch (error) {
    logger.error('Failed to get vendor connector types', {
      vendorId,
      error: error.message
    });
    throw error;
  }
}

/**
 * Get all vendors for an organization
 * @param {string} organizationId - Organization ID
 * @param {string} connectorType - Connector type to filter by
 * @returns {Promise<Array>} Array of vendors
 */
async function getVendorsForConnector(organizationId, connectorType) {
  try {
    const vendors = await Vendor.findByOrganization(organizationId);

    // Filter vendors that have this connector configured
    // For now, return all vendors
    // In production, this would check vendor.tool_connections

    logger.debug('Retrieved vendors for connector', {
      organizationId,
      connectorType,
      vendorCount: vendors.length
    });

    return vendors;
  } catch (error) {
    logger.error('Failed to get vendors for connector', {
      organizationId,
      connectorType,
      error: error.message
    });
    throw error;
  }
}

/**
 * SYNC_VENDOR Handler
 * Sync all connectors for a specific vendor
 * @param {Object} jobData - Job data
 * @returns {Promise<Object>} Sync results
 */
async function handleSyncVendor(jobData) {
  const { vendorId, organizationId } = jobData;

  logger.info('Processing SYNC_VENDOR job', {
    vendorId,
    organizationId
  });

  try {
    // Get all available connectors for this vendor
    const connectorTypes = await getVendorConnectorTypes(vendorId, organizationId);

    const results = {
      vendorId,
      organizationId,
      connectorResults: [],
      totalSignalsCollected: 0,
      successfulConnectors: 0,
      failedConnectors: 0
    };

    // Process each connector
    for (const connectorType of connectorTypes) {
      try {
        logger.info(`Syncing connector ${connectorType} for vendor`, {
          vendorId,
          connectorType
        });

        const ConnectorClass = await loadConnector(connectorType);

        // Create connector instance
        const connector = new ConnectorClass({
          connectorType,
          organizationId,
          vendorId
        });

        // Collect signals
        const syncResult = await connector.sync();

        results.connectorResults.push({
          connectorType,
          ...syncResult
        });

        results.totalSignalsCollected += syncResult.signalsCollected || 0;

        if (syncResult.status === 'success') {
          results.successfulConnectors++;
        } else {
          results.failedConnectors++;
        }

        logger.info(`Connector ${connectorType} sync completed`, {
          vendorId,
          connectorType,
          signalsCollected: syncResult.signalsCollected,
          status: syncResult.status
        });

      } catch (connectorError) {
        logger.error(`Connector ${connectorType} failed for vendor`, {
          vendorId,
          connectorType,
          error: connectorError.message
        });

        results.connectorResults.push({
          connectorType,
          status: 'error',
          error: connectorError.message,
          signalsCollected: 0
        });

        results.failedConnectors++;
        // Continue with next connector
      }
    }

    logger.info('SYNC_VENDOR job completed', {
      vendorId,
      organizationId,
      totalSignalsCollected: results.totalSignalsCollected,
      successfulConnectors: results.successfulConnectors,
      failedConnectors: results.failedConnectors
    });

    return results;

  } catch (error) {
    logger.error('SYNC_VENDOR job failed', {
      vendorId,
      organizationId,
      error: error.message,
      stack: error.stack
    });
    throw error;
  }
}

/**
 * SYNC_CONNECTOR Handler
 * Sync one connector type for all vendors
 * @param {Object} jobData - Job data
 * @returns {Promise<Object>} Sync results
 */
async function handleSyncConnector(jobData) {
  const { connectorType, organizationId } = jobData;

  logger.info('Processing SYNC_CONNECTOR job', {
    connectorType,
    organizationId
  });

  try {
    // Get all vendors for this organization
    const vendors = await getVendorsForConnector(organizationId, connectorType);

    // Load connector class
    const ConnectorClass = await loadConnector(connectorType);

    const results = {
      connectorType,
      organizationId,
      vendorResults: [],
      totalSignalsCollected: 0,
      successfulVendors: 0,
      failedVendors: 0,
      skippedVendors: 0
    };

    // Process each vendor
    for (const vendor of vendors) {
      try {
        logger.info(`Syncing connector ${connectorType} for vendor`, {
          vendorId: vendor.id,
          vendorName: vendor.name,
          connectorType
        });

        // Create connector instance
        const connector = new ConnectorClass({
          connectorType,
          organizationId,
          vendorId: vendor.id
        });

        // Collect signals
        const syncResult = await connector.sync();

        results.vendorResults.push({
          vendorId: vendor.id,
          vendorName: vendor.name,
          ...syncResult
        });

        results.totalSignalsCollected += syncResult.signalsCollected || 0;

        if (syncResult.status === 'success') {
          results.successfulVendors++;
        } else {
          results.failedVendors++;
        }

      } catch (vendorError) {
        logger.error(`Connector ${connectorType} failed for vendor`, {
          vendorId: vendor.id,
          vendorName: vendor.name,
          connectorType,
          error: vendorError.message
        });

        results.vendorResults.push({
          vendorId: vendor.id,
          vendorName: vendor.name,
          status: 'error',
          error: vendorError.message,
          signalsCollected: 0
        });

        results.failedVendors++;
        // Continue with next vendor
      }
    }

    logger.info('SYNC_CONNECTOR job completed', {
      connectorType,
      organizationId,
      totalSignalsCollected: results.totalSignalsCollected,
      successfulVendors: results.successfulVendors,
      failedVendors: results.failedVendors
    });

    return results;

  } catch (error) {
    logger.error('SYNC_CONNECTOR job failed', {
      connectorType,
      organizationId,
      error: error.message,
      stack: error.stack
    });
    throw error;
  }
}

/**
 * ASSESSMENT Handler
 * Full vendor risk assessment using multiple data sources
 * @param {Object} jobData - Job data
 * @returns {Promise<Object>} Assessment results
 */
async function handleAssessment(jobData) {
  const { vendorId, organizationId } = jobData;

  logger.info('Processing ASSESSMENT job', {
    vendorId,
    organizationId
  });

  try {
    // Get vendor details
    const vendor = await Vendor.findById(vendorId);

    if (!vendor) {
      throw new Error(`Vendor not found: ${vendorId}`);
    }

    // Get all available connectors for comprehensive assessment
    const connectorTypes = await getVendorConnectorTypes(vendorId, organizationId);

    const results = {
      vendorId,
      vendorName: vendor.name,
      organizationId,
      assessmentType: 'comprehensive',
      connectorResults: [],
      totalSignalsCollected: 0,
      riskFactors: [],
      recommendations: []
    };

    // Process each connector for assessment
    for (const connectorType of connectorTypes) {
      try {
        logger.info(`Assessing vendor with connector ${connectorType}`, {
          vendorId,
          connectorType
        });

        const ConnectorClass = await loadConnector(connectorType);

        // Create connector instance
        const connector = new ConnectorClass({
          connectorType,
          organizationId,
          vendorId
        });

        // Collect signals
        const syncResult = await connector.sync();

        results.connectorResults.push({
          connectorType,
          ...syncResult
        });

        results.totalSignalsCollected += syncResult.signalsCollected || 0;

        // Analyze signals for risk factors
        if (syncResult.signals && syncResult.signals.length > 0) {
          const criticalSignals = syncResult.signals.filter(
            s => s.severity === 'Critical' || s.severity === 'High'
          );

          if (criticalSignals.length > 0) {
            results.riskFactors.push({
              source: connectorType,
              criticalSignals: criticalSignals.length,
              topIssues: criticalSignals.slice(0, 3).map(s => ({
                signalName: s.signalName,
                severity: s.severity,
                description: s.description
              }))
            });
          }
        }

        logger.info(`Assessment connector ${connectorType} completed`, {
          vendorId,
          connectorType,
          signalsCollected: syncResult.signalsCollected
        });

      } catch (connectorError) {
        logger.error(`Assessment connector ${connectorType} failed`, {
          vendorId,
          connectorType,
          error: connectorError.message
        });

        results.connectorResults.push({
          connectorType,
          status: 'error',
          error: connectorError.message,
          signalsCollected: 0
        });
        // Continue with next connector
      }
    }

    // Generate recommendations based on risk factors
    if (results.riskFactors.length > 0) {
      results.recommendations = [
        'Review critical findings with vendor',
        'Request remediation plan',
        'Consider alternative vendors if risks are not addressed',
        'Increase monitoring frequency'
      ];
    } else {
      results.recommendations = [
        'Continue regular monitoring',
        'Maintain current vendor relationship'
      ];
    }

    // Update vendor risk rating based on assessment
    const criticalRiskCount = results.riskFactors.reduce(
      (sum, rf) => sum + rf.criticalSignals, 0
    );

    let riskRating = 'Low';
    if (criticalRiskCount > 10) {
      riskRating = 'Critical';
    } else if (criticalRiskCount > 5) {
      riskRating = 'High';
    } else if (criticalRiskCount > 0) {
      riskRating = 'Medium';
    }

    results.assessedRiskRating = riskRating;

    // Update vendor record
    await Vendor.update(vendorId, {
      riskRating,
      lastAssessedAt: new Date()
    });

    logger.info('ASSESSMENT job completed', {
      vendorId,
      organizationId,
      totalSignalsCollected: results.totalSignalsCollected,
      riskFactors: results.riskFactors.length,
      assessedRiskRating: riskRating
    });

    return results;

  } catch (error) {
    logger.error('ASSESSMENT job failed', {
      vendorId,
      organizationId,
      error: error.message,
      stack: error.stack
    });
    throw error;
  }
}

module.exports = {
  handleSyncVendor,
  handleSyncConnector,
  handleAssessment,
  loadConnector
};
