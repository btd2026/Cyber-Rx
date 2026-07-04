'use strict';

const { loadDemoJson, validateDemoSignals, hasDemoData } = require('./demoLoader');

const RAW_REGISTRY = {
  entra: require('./entra'),
  okta: require('./okta'),
  crowdstrike: require('./crowdstrike'),
  defender: require('./defender'),
  tenable: require('./tenable'),
  qualys: require('./qualys'),
  splunk: require('./splunk'),
  sentinel: require('./sentinel'),
  sailpoint: require('./sailpoint'),
  cyberark: require('./cyberark'),
  knowbe4: require('./knowbe4'),
  azure_openai: require('./azure_openai'),
  langsmith: require('./langsmith'),
  wiz: require('./wiz'),
  proofpoint: require('./proofpoint'),
  onetrust: require('./onetrust'),
  recordedfuture: require('./recordedfuture'),
  rubrik: require('./rubrik'),
  sap: require('./sap'),
  aws: require('./aws'),
  azure: require('./azure'),
  prisma: require('./prisma'),
  gcp: require('./gcp'),
  veeam: require('./veeam'),
  cohesity: require('./cohesity'),
  commvault: require('./commvault'),
  mandiant: require('./mandiant'),
  anomali: require('./anomali'),
  oracle: require('./oracle'),
  netsuite: require('./netsuite'),
  workday: require('./workday'),
  trustarc: require('./trustarc'),
  relativity: require('./relativity'),
  exterro: require('./exterro'),
  abnormal: require('./abnormal'),
};

// Per-connector demo mode state. Defaults to false (live).
// Set via setDemoMode() or the CYBERRX_DEMO_MODE env var.
const demoFlags = {};
const globalDemo = process.env.CYBERRX_DEMO_MODE === 'true' || process.env.CYBERRX_DEMO_MODE === '1';

function isDemoMode(key) {
  if (demoFlags[key] !== undefined) return demoFlags[key];
  return globalDemo;
}

function wrapConnector(connector) {
  const origTest = connector.test;
  const origFetch = connector.fetchSignals;

  const wrappedTest = async function (creds) {
    if (isDemoMode(connector.key)) {
      return { ok: true, detail: `[Demo] ${connector.label} connected (demo mode).` };
    }
    return origTest(creds);
  };

  const wrappedFetch = async function (creds) {
    if (isDemoMode(connector.key)) {
      const data = await loadDemoJson(connector.key);
      const validation = validateDemoSignals(data, connector.signals);
      if (!validation.valid) {
        const warn = `Demo data for ${connector.key} schema mismatch — missing: [${validation.missing}], extra: [${validation.extra}]`;
        console.warn(warn);
      }
      return data;
    }
    return origFetch(creds);
  };

  return Object.assign({}, connector, {
    test: wrappedTest,
    fetchSignals: wrappedFetch,
    get demoMode() { return isDemoMode(connector.key); },
  });
}

const REGISTRY = {};
for (const [k, c] of Object.entries(RAW_REGISTRY)) {
  REGISTRY[k] = wrapConnector(c);
}

function list() {
  return Object.values(REGISTRY).map((c) => ({
    key: c.key, label: c.label, vendor: c.vendor, category: c.category,
    signals: c.signals, scopes: c.scopes, demoMode: c.demoMode,
    hasDemoData: hasDemoData(c.key),
    fields: c.fields.map((f) => ({ key: f.key, label: f.label, secret: !!f.secret, optional: !!f.optional })),
  }));
}

function get(key) { return REGISTRY[key] || null; }

function setDemoMode(key, enabled) {
  if (key === '*') {
    Object.keys(REGISTRY).forEach((k) => { demoFlags[k] = !!enabled; });
  } else {
    demoFlags[key] = !!enabled;
  }
}

function getDemoMode(key) { return isDemoMode(key); }

module.exports = { list, get, REGISTRY, setDemoMode, getDemoMode };
