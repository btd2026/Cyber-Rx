#!/usr/bin/env node
'use strict';

/**
 * Connector smoke-test harness — validates the read-only security-tool connectors
 * against REAL tenants. Run by your team with real credentials (this exercises
 * live vendor APIs; it does not touch the database).
 *
 * Usage:
 *   node scripts/smoke-connectors.js <creds.json> [connectorKey]
 *
 * creds.json shape (only include the connectors you want to test):
 *   {
 *     "entra":        { "tenantId": "...", "clientId": "...", "clientSecret": "..." },
 *     "crowdstrike":  { "clientId": "...", "clientSecret": "...", "baseUrl": "https://api.us-2.crowdstrike.com", "assetTotal": 4200 },
 *     "tenable":      { "accessKey": "...", "secretKey": "..." },
 *     "splunk":       { "baseUrl": "https://splunk:8089", "token": "...", "search": "..." },
 *     "azure_openai": { "endpoint": "https://NAME.openai.azure.com", "apiKey": "..." },
 *     "langsmith":    { "apiKey": "..." }
 *   }
 *
 * Exit code is non-zero if any requested connector fails.
 */

const path = require('path');
const Connectors = require(path.join(__dirname, '..', 'src', 'services', 'connectors'));

async function main() {
  const file = process.argv[2];
  const only = process.argv[3];
  if (!file) {
    console.error('Usage: node scripts/smoke-connectors.js <creds.json> [connectorKey]');
    process.exit(2);
  }
  let creds;
  try { creds = require(path.resolve(file)); }
  catch (e) { console.error(`Could not read creds file: ${e.message}`); process.exit(2); }

  const keys = only ? [only] : Object.keys(creds);
  let failures = 0;

  for (const key of keys) {
    const c = Connectors.get(key);
    if (!c) { console.log(`✗ ${key}: unknown connector`); failures++; continue; }
    const cr = creds[key];
    if (!cr) { console.log(`– ${key}: no credentials in file, skipped`); continue; }
    process.stdout.write(`• ${c.label} … `);
    try {
      const t = await c.test(cr);
      const { signals } = await c.fetchSignals(cr);
      const summary = signals.map((s) => `${s.key}=${s.value}`).join(', ');
      console.log(`PASS — ${t.detail || 'ok'}\n    signals: ${summary || '(none)'}`);
    } catch (e) {
      console.log(`FAIL — ${e.message}`);
      failures++;
    }
  }

  console.log(`\n${keys.length - failures} passed, ${failures} failed.`);
  process.exit(failures ? 1 : 0);
}

main().catch((e) => { console.error(e); process.exit(1); });
