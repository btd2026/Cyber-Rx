'use strict';

/**
 * POST /api/connectors/test — lightweight connector validation for the
 * onboarding UI.  Accepts the simplified { connector, vendor, apiKey } payload
 * the static prototype sends, maps it to the real connector's test() function,
 * and returns { ok, detail } or a descriptive error.
 */

const express = require('express');
const router = express.Router();
const logger = require('../utils/logger');
const Connectors = require('../services/connectors');

// Map the onboarding connector IDs to the backend registry keys.
// The onboarding UI uses short IDs like 'edr', 'siem'; the backend uses
// vendor-specific keys like 'crowdstrike', 'splunk'.
const VENDOR_MAP = {
  'CrowdStrike Falcon': 'crowdstrike',
  'Microsoft Defender for Endpoint': 'defender',
  'SentinelOne': null,
  'VMware Carbon Black': null,
  'Trend Micro': null,
  'Splunk': 'splunk',
  'Microsoft Sentinel': 'sentinel',
  'Elastic Security': null,
  'IBM QRadar': null,
  'Google Chronicle': null,
  'Okta': 'okta',
  'Microsoft Entra ID': 'entra',
  'Ping Identity': null,
  'Google Workspace': null,
  'Duo': null,
  'Tenable': 'tenable',
  'Qualys': 'qualys',
  'Rapid7 InsightVM': null,
  'Microsoft Defender VM': null,
  'AWS Security Hub': null,
  'Microsoft Defender for Cloud': 'defender',
  'Wiz': null,
  'Prisma Cloud': null,
  'Google SCC': null,
  'SailPoint': 'sailpoint',
  'CyberArk': 'cyberark',
  'KnowBe4': 'knowbe4',
};

function mapCreds(vendor, apiKey) {
  const v = (vendor || '').toLowerCase();
  if (v.includes('crowdstrike')) {
    const parts = apiKey.split(':');
    return { clientId: parts[0], clientSecret: parts[1] || apiKey };
  }
  if (v.includes('okta')) {
    const match = apiKey.match(/^([\w-]+\.okta\.com)[:/](.+)$/);
    if (match) return { domain: match[1], apiToken: match[2] };
    return { domain: '', apiToken: apiKey };
  }
  if (v.includes('splunk')) {
    const parts = apiKey.split('@');
    return { host: parts[1] || 'localhost', token: parts[0] || apiKey };
  }
  if (v.includes('tenable')) return { accessKey: apiKey.split(':')[0], secretKey: apiKey.split(':')[1] || '' };
  if (v.includes('qualys')) {
    const parts = apiKey.split(':');
    return { username: parts[0], password: parts[1] || '' };
  }
  if (v.includes('entra') || v.includes('sentinel') || v.includes('defender')) {
    return { tenantId: '', clientId: '', clientSecret: apiKey };
  }
  return { apiKey };
}

router.post('/test', async (req, res) => {
  const { connector, vendor, apiKey } = req.body || {};

  if (!apiKey || String(apiKey).trim().length < 8) {
    return res.status(400).json({ ok: false, error: 'API key is too short or missing.' });
  }

  const registryKey = VENDOR_MAP[vendor];
  const conn = registryKey ? Connectors.get(registryKey) : null;

  if (!conn) {
    // No backend connector for this vendor yet — validate format only
    if (String(apiKey).trim().length < 16) {
      return res.status(400).json({ ok: false, error: `API key for ${vendor || connector} appears too short (minimum 16 characters).` });
    }
    return res.json({ ok: true, detail: `Key format accepted for ${vendor || connector}. Live signal sync will activate when the backend connector is deployed.`, pending: true });
  }

  try {
    const creds = mapCreds(vendor, String(apiKey).trim());
    const result = await conn.test(creds);
    return res.json({ ok: true, detail: result.detail || `Connected to ${conn.label}.` });
  } catch (e) {
    const msg = e.message || 'Connection failed.';
    const status = msg.includes('401') || msg.includes('403') || msg.includes('Unauthorized') ? 401 : 502;
    logger.warn('connector test failed', { connector, vendor, error: msg });
    return res.status(status).json({ ok: false, error: msg });
  }
});

module.exports = router;
