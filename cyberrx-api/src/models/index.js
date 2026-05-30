'use strict';

/**
 * Models Index
 *
 * Central export point for all database models
 */

const BusinessProcess = require('./BusinessProcess');
const Asset = require('./Asset');
const DataObject = require('./DataObject');
const ThreatScenario = require('./ThreatScenario');
const LegalObligation = require('./LegalObligation');
const ExecutiveOwner = require('./ExecutiveOwner');
const Risk = require('./Risk');
const Finding = require('./Finding');
const FinancialImpact = require('./FinancialImpact');
const Control = require('./Control');
const RemediationTask = require('./RemediationTask');
const Evidence = require('./Evidence');
const VendorRiskSignal = require('./VendorRiskSignal');

module.exports = {
  BusinessProcess,
  Asset,
  DataObject,
  ThreatScenario,
  LegalObligation,
  ExecutiveOwner,
  Risk,
  Finding,
  FinancialImpact,
  Control,
  RemediationTask,
  Evidence,
  VendorRiskSignal
};
