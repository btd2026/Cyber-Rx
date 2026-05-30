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

module.exports = {
  BusinessProcess,
  Asset,
  DataObject,
  ThreatScenario,
  LegalObligation,
  ExecutiveOwner,
  Risk,
  Finding
};
