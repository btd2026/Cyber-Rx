'use strict';
require('dotenv').config();
const db = require('./utils/db');
const vault = require('./utils/vault');

const SYNC_SCHEDULE = {
  okta:        { metric: 'mfaPct',      intervalHrs: 24 },
  crowdstrike: { metric: 'edrPct',      intervalHrs: 24 },
  tenable:     { metric: 'patchPct',    intervalHrs: 24 },
  splunk:      { metric: 'siemDays',    intervalHrs: 168 },
  knowbe4:     { metric: 'phishingPct', intervalHrs: 720 },
  servicenow:  { metric: 'mttrHrs',     intervalHrs: 168 },
  cyberark:    { metric: 'pamPct',      intervalHrs: 168 },
  workday:     { metric: 'trainingPct', intervalHrs: 720 },
};

const API_BASE = process.env.API_BASE || 'http://api:3001';

async function syncOrg(orgId, tool) {
  try {
    const creds = await vault.get(orgId, tool);
    if (!creds) return;
    const res = await fetch(`${API_BASE}/api/tools/${tool}/sync`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'X-Org-Id': orgId },
    });
    const data = await res.json();
    if (data.value != null) {
      await db.query(
        `INSERT INTO metrics (org_id, metric_key, value, source, demo)
         VALUES ($1, $2, $3, $4, $5)`,
        [orgId, data.metric_key, data.value, tool, data.demo || false]
      );
      console.log(`[scheduler] ${orgId}/${tool} → ${data.metric_key}=${data.value}`);
    }
  } catch (err) {
    console.error(`[scheduler] sync error ${orgId}/${tool}:`, err.message);
  }
}

async function runScheduler() {
  await db.init();
  console.log('[scheduler] CyberRx metric scheduler started');

  const tick = async () => {
    try {
      const orgs = await db.query('SELECT id FROM orgs');
      for (const org of orgs) {
        for (const [tool, cfg] of Object.entries(SYNC_SCHEDULE)) {
          const lastRows = await db.query(
            `SELECT collected_at FROM metrics
             WHERE org_id=$1 AND source=$2
             ORDER BY collected_at DESC LIMIT 1`,
            [org.id, tool]
          );
          const lastSync = lastRows[0]?.collected_at;
          const ageHrs = lastSync
            ? (Date.now() - new Date(lastSync)) / 3600000
            : Infinity;
          if (ageHrs >= cfg.intervalHrs) {
            await syncOrg(org.id, tool);
          }
        }
      }
    } catch (err) {
      console.error('[scheduler] tick error:', err.message);
    }
  };

  // Run immediately then every 15 minutes
  await tick();
  setInterval(tick, 15 * 60 * 1000);
}

runScheduler();
