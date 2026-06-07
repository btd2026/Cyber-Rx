'use strict';

/**
 * Models Index
 *
 * Central export point for all database models
 */

const BusinessProcess = require('./BusinessProcess');
const Asset = require('./Asset');
const Vendor = require('./Vendor');
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
const Narrative = require('./Narrative');
const VendorAlert = require('./VendorAlert');
const ExecutiveAlert = require('./ExecutiveAlert');
const AlertConfig = require('./AlertConfig');
const BusinessProcessGraph = require('./BusinessProcessGraph');
const ProcessDependency = require('./ProcessDependency');
const ProcessFinancialValue = require('./ProcessFinancialValue');
const SystemProcessMapping = require('./SystemProcessMapping');
const ProcessValidationWorkflow = require('./ProcessValidationWorkflow');
const ProcessImpactAnalysis = require('./ProcessImpactAnalysis');
const ProcessCatalog = require('./ProcessCatalog');
const GraphVisualizationExport = require('./GraphVisualizationExport');

module.exports = {
  BusinessProcess,
  Asset,
  Vendor,
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
  VendorRiskSignal,
  Narrative,
  VendorAlert,
  ExecutiveAlert,
  AlertConfig,
  BusinessProcessGraph,
  ProcessDependency,
  ProcessFinancialValue,
  SystemProcessMapping,
  ProcessValidationWorkflow,
  ProcessImpactAnalysis,
  ProcessCatalog,
  GraphVisualizationExport
};
