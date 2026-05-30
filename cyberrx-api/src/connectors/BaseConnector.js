'use strict';

const { v4: uuidv4 } = require('uuid');
const VendorRiskSignal = require('../models/VendorRiskSignal');

/**
 * Base Connector Class
 *
 * Abstract class for all vendor monitoring connectors.
 * Defines standard interface for signal collection, testing, and normalization.
 */
class BaseConnector {
  constructor(config) {
    this.connectorType = config.connectorType;
    this.sourceType = config.sourceType || 'api'; // api, webhook, file_upload, manual, web_scrape
    this.credentials = config.credentials || {};
    this.organizationId = config.organizationId;
    this.vendorId = config.vendorId;
  }

  /**
   * Collect signals from the connector source
   * Abstract method - must be implemented by subclasses
   * @param {string} vendorId - Vendor ID
   * @param {string} organizationId - Organization ID
   * @returns {Promise<Array>} Array of normalized signals
   */
  async collectSignals(vendorId, organizationId) {
    throw new Error('collectSignals() must be implemented by subclass');
  }

  /**
   * Test connection to the connector service
   * Abstract method - must be implemented by subclasses
   * @returns {Promise<Object>} Connection test result
   */
  async testConnection() {
    throw new Error('testConnection() must be implemented by subclass');
  }

  /**
   * Transform raw data from source to standard signal format
   * @param {Object} rawData - Raw data from source
   * @returns {Object} Normalized signal data
   */
  normalizeSignal(rawData) {
    // Default normalization - can be overridden by subclasses
    return {
      signalName: rawData.name || rawData.title || 'Unknown Signal',
      severity: this.mapSeverity(rawData.severity, rawData.risk, rawData.grade),
      confidence: rawData.confidence || rawData.score || 50,
      observedAt: rawData.observedAt || rawData.date || rawData.timestamp || new Date(),
      evidenceUrl: rawData.evidenceUrl || rawData.url || rawData.link || null,
      description: rawData.description || rawData.details || null,
      recommendedAction: rawData.recommendedAction || rawData.remediation || null,
      mappedFrameworks: rawData.frameworks || rawData.mappings || [],
      mappedPolicies: rawData.policies || [],
      rawData: rawData
    };
  }

  /**
   * Map severity from various formats to standard severity levels
   * @param {string} severity - Explicit severity
   * @param {string} risk - Risk level
   * @param {string} grade - Letter grade (A-F)
   * @returns {string} Standardized severity
   */
  mapSeverity(severity, risk, grade) {
    if (severity) {
      const s = severity.toLowerCase();
      if (['critical', 'severe', 'emergency'].includes(s)) return 'Critical';
      if (['high', 'important', 'elevated'].includes(s)) return 'High';
      if (['medium', 'moderate', 'significant'].includes(s)) return 'Medium';
      if (['low', 'minor', 'low'].includes(s)) return 'Low';
      if (['info', 'informational', 'none'].includes(s)) return 'Info';
    }

    if (risk) {
      const r = risk.toLowerCase();
      if (['critical', 'severe'].includes(r)) return 'Critical';
      if (['high', 'elevated'].includes(r)) return 'High';
      if (['medium', 'moderate'].includes(r)) return 'Medium';
      if (['low', 'minor'].includes(r)) return 'Low';
    }

    if (grade) {
      const g = grade.toUpperCase();
      if (['F'].includes(g)) return 'Critical';
      if (['D'].includes(g)) return 'High';
      if (['C'].includes(g)) return 'Medium';
      if (['B'].includes(g)) return 'Low';
      if (['A'].includes(g)) return 'Info';
    }

    return 'Medium'; // Default
  }

  /**
   * Store signals in database
   * @param {Array} signals - Array of signal objects
   * @param {string} vendorId - Vendor ID
   * @param {string} organizationId - Organization ID
   * @returns {Promise<Array>} Array of created signals
   */
  async storeSignals(signals, vendorId, organizationId) {
    const createdSignals = [];

    for (const signalData of signals) {
      try {
        const signal = await VendorRiskSignal.create({
          id: uuidv4(),
          organizationId,
          vendorId,
          vendorName: signalData.vendorName,
          sourceName: this.connectorType,
          sourceType: this.sourceType,
          signalCategory: signalData.signalCategory,
          signalName: signalData.signalName,
          severity: signalData.severity,
          confidence: signalData.confidence || 50,
          observedAt: signalData.observedAt || new Date(),
          status: 'active',
          evidenceUrl: signalData.evidenceUrl || null,
          description: signalData.description,
          recommendedAction: signalData.recommendedAction || null,
          mappedFrameworks: signalData.mappedFrameworks || [],
          mappedPolicies: signalData.mappedPolicies || [],
          rawData: signalData.rawData || {}
        });
        createdSignals.push(signal);
      } catch (error) {
        console.error(`Error storing signal from ${this.connectorType}:`, error.message);
        // Continue with next signal
      }
    }

    return createdSignals;
  }

  /**
   * Manual entry fallback for web scraping failures
   * @param {string} vendorId - Vendor ID
   * @param {string} organizationId - Organization ID
   * @param {string} reason - Reason for manual entry requirement
   * @returns {Promise<Object>} Manual entry task result
   */
  async promptManualEntry(vendorId, organizationId, reason) {
    // This will create a task in the UI for manual data entry
    // For now, return a placeholder
    return {
      status: 'manual_entry_required',
      message: reason,
      connectorType: this.connectorType,
      vendorId,
      organizationId
    };
  }

  /**
   * Sync connector and return results
   * @returns {Promise<Object>} Sync result
   */
  async sync() {
    try {
      const signals = await this.collectSignals(this.vendorId, this.organizationId);
      const storedSignals = await this.storeSignals(signals, this.vendorId, this.organizationId);

      return {
        connectorType: this.connectorType,
        status: 'success',
        signalsCollected: storedSignals.length,
        signals: storedSignals
      };
    } catch (error) {
      return {
        connectorType: this.connectorType,
        status: 'error',
        error: error.message,
        signalsCollected: 0
      };
    }
  }
}

module.exports = BaseConnector;
