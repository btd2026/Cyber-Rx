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
  otx: require('./otx'),
  cisa: require('./cisa'),
  salesforce: require('./salesforce'),
  whistic: require('./whistic'),
  github: require('./github'),
  servicenow_grc: require('./servicenow_grc'),
  // DELTA: Board / CLO / CRO connectors
  erm: require('./erm'),
  legal_matter: require('./legal_matter'),
  contract_lifecycle: require('./contract_lifecycle'),
  data_classification: require('./data_classification'),
  internal_audit: require('./internal_audit'),
  // Top-5-per-category expansion — one connector per market-leading vendor.
  ping: require('./ping'),                       // Identity / SSO → mfa_pct
  duo: require('./duo'),
  onelogin: require('./onelogin'),
  sentinelone: require('./sentinelone'),         // Endpoint / EDR → edr_pct
  cortexxdr: require('./cortexxdr'),
  trendmicro: require('./trendmicro'),
  rapid7: require('./rapid7'),                    // Vulnerability mgmt → patch_pct / vuln_sla_pct
  defender_vm: require('./defender_vm'),
  ivanti: require('./ivanti'),
  elastic: require('./elastic'),                  // SIEM / Log analytics
  qradar: require('./qradar'),
  chronicle: require('./chronicle'),
  beyondtrust: require('./beyondtrust'),          // Privileged access → pam_pct
  delinea: require('./delinea'),
  hashivault: require('./hashivault'),
  oneidentity: require('./oneidentity'),
  mimecast: require('./mimecast'),                // Awareness & email → bec_blocked
  mdo365: require('./mdo365'),
  orca: require('./orca'),                        // CSPM → cspm_pct
  dell_powerprotect: require('./dell_powerprotect'), // Backup → backup_immutable_pct
  saviynt: require('./saviynt'),                  // IGA → access_review_pct, dormant_accounts
  okta_iga: require('./okta_iga'),
  entra_id_gov: require('./entra_id_gov'),
  oneidentity_iga: require('./oneidentity_iga'),
  purview: require('./purview'),                  // DLP → dlp_pct
  forcepoint: require('./forcepoint'),
  symantec_dlp: require('./symantec_dlp'),
  zscaler_dlp: require('./zscaler_dlp'),
  netskope: require('./netskope'),
  illumio: require('./illumio'),                  // Segmentation / Zero-Trust → seg_pct
  zscaler_zpa: require('./zscaler_zpa'),
  paloalto_seg: require('./paloalto_seg'),
  cisco_workload: require('./cisco_workload'),
  guardicore: require('./guardicore'),
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
    tier: c.tier || null, // 'free' | 'paid' | null — the data-source cost, surfaced to the buyer
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
