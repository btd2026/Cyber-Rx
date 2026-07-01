'use strict';

/**
 * GET /api/siem/incidents — poll for confirmed critical incidents from the
 * connected SIEM (Splunk, Sentinel, etc.).
 *
 * The War Room UI polls this every 30s when a SIEM is connected. When a SEV-1
 * incident is confirmed, the War Room auto-activates.
 *
 * In production this queries the connected SIEM via its API. When no SIEM is
 * configured, returns an empty list (no incidents).
 */

const express = require('express');
const router = express.Router();
const logger = require('../utils/logger');
const Connectors = require('../services/connectors');
const vault = require('../utils/vault');

const SIEM_KEYS = ['splunk', 'sentinel'];

async function querySplunk(creds) {
  const { http, jsonOrThrow } = require('../services/connectors/http');
  const host = creds.host || 'localhost';
  const port = creds.port || 8089;
  const url = `https://${host}:${port}/services/search/jobs/export`;
  const search = 'search index=notable severity=critical status=confirmed earliest=-5m | head 5';
  const body = new URLSearchParams({ search, output_mode: 'json' });
  const r = await http(url, {
    method: 'POST',
    headers: { Authorization: `Bearer ${creds.token}`, 'Content-Type': 'application/x-www-form-urlencoded' },
    body,
  });
  const data = await jsonOrThrow(r, 'Splunk');
  const incidents = (data.results || []).map(r => ({
    id: r.event_id || r._raw?.substring(0, 32),
    severity: 'critical',
    summary: r.search_name || r.rule_name || 'SIEM-confirmed critical incident',
    source: 'Splunk',
    time: r._time || new Date().toISOString(),
  }));
  return incidents;
}

async function querySentinel(creds) {
  const { http, jsonOrThrow } = require('../services/connectors/http');
  const url = `https://management.azure.com/subscriptions/${creds.subscriptionId}/resourceGroups/${creds.resourceGroup}/providers/Microsoft.OperationalInsights/workspaces/${creds.workspaceId}/providers/Microsoft.SecurityInsights/incidents?api-version=2023-11-01&$filter=properties/severity eq 'High' and properties/status eq 'Active'&$top=5`;
  const r = await http(url, {
    headers: { Authorization: `Bearer ${creds.accessToken}`, Accept: 'application/json' },
  });
  const data = await jsonOrThrow(r, 'Sentinel');
  const incidents = (data.value || []).map(i => ({
    id: i.name,
    severity: 'critical',
    summary: i.properties?.title || 'Sentinel incident',
    source: 'Microsoft Sentinel',
    time: i.properties?.createdTimeUtc || new Date().toISOString(),
  }));
  return incidents;
}

router.get('/incidents', async (req, res) => {
  const orgId = req.orgId || req.headers['x-org-id'] || req.query.org_id || '';

  const incidents = [];

  for (const key of SIEM_KEYS) {
    try {
      const creds = await vault.get(orgId, `integration:${key}`).catch(() => null);
      if (!creds) continue;

      let results = [];
      if (key === 'splunk') results = await querySplunk(creds);
      else if (key === 'sentinel') results = await querySentinel(creds);

      incidents.push(...results);
    } catch (e) {
      logger.debug('SIEM incident poll failed', { key, error: e.message });
    }
  }

  res.json({ incidents, polled: SIEM_KEYS, timestamp: new Date().toISOString() });
});

module.exports = router;
