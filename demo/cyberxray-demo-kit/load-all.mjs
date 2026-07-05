// Seed the CyberX-Ray backend with the demo orgs (no API keys required).
//   API_BASE=http://localhost:3001 node load-all.mjs           # all 7 orgs
//   API_BASE=http://localhost:3001 node load-all.mjs boeing    # one org by folder name
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const HERE = path.dirname(fileURLToPath(import.meta.url));
const API = (process.env.API_BASE || 'http://localhost:3001').replace(/\/+$/, '');
const only = process.argv[2];
const orgs = fs.readdirSync(HERE, { withFileTypes: true })
  .filter((d) => d.isDirectory() && fs.existsSync(path.join(HERE, d.name, 'ingest.json')))
  .map((d) => d.name)
  .filter((name) => !only || name === only);

if (!orgs.length) { console.error('No org folders found' + (only ? ' matching ' + only : '') + '.'); process.exit(1); }

for (const name of orgs) {
  const body = fs.readFileSync(path.join(HERE, name, 'ingest.json'), 'utf8');
  try {
    const r = await fetch(API + '/api/crown-jewels/ingest', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body });
    const j = await r.json().catch(() => ({}));
    if (!r.ok) { console.error('✗ ' + name + ' → HTTP ' + r.status + ' ' + JSON.stringify(j).slice(0, 200)); continue; }
    console.log('✓ ' + name + ' → ' + (j.org_id || '') + '  processes=' + (j.counts?.processes ?? '?') + ' assets=' + (j.counts?.assets ?? '?') + ' risks=' + (j.counts?.risks ?? '?'));
  } catch (e) { console.error('✗ ' + name + ' → ' + e.message + '  (is the API running at ' + API + '?)'); }
}
console.log('\nDone. Then paste <org>/browser-localStorage.js into the app console to view each org.');
