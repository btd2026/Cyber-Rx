// Emits the Nerion executive demo kit from orgs.mjs.
import fs from 'node:fs';
import path from 'node:path';
import { ORGS } from './orgs.mjs';

const OUT = process.argv[2] || '/tmp/out/cyberxray-demo-kit';
fs.rmSync(OUT, { recursive: true, force: true });
fs.mkdirSync(OUT, { recursive: true });

const usd = (n) => n == null ? '—' : (Math.abs(n) >= 1e9 ? '$' + (n / 1e9).toFixed(n % 1e9 ? 1 : 0) + 'B'
  : Math.abs(n) >= 1e6 ? '$' + (n / 1e6).toFixed(0) + 'M' : '$' + n.toLocaleString());
const orgId = (o) => 'org_' + o.key.replace(/[^a-z0-9]+/g, '_');

// CSV cell: quote when it contains comma/quote/newline; double internal quotes.
const cell = (v) => {
  const s = v == null ? '' : String(v);
  return /[",\n]/.test(s) ? '"' + s.replace(/"/g, '""') + '"' : s;
};
const csv = (headers, rows) => [headers.join(','), ...rows.map((r) => r.map(cell).join(','))].join('\n') + '\n';

// ── NIST CSF 2.0 evidence (cyberrx_doc_scores) modelled off the org's doc maturity ──
const CTRLS = [
  ['GV.OC-01', 'Information-Security Policy'], ['GV.RM-01', 'Risk-Management Strategy'],
  ['GV.RR-02', 'Roles & Responsibilities'], ['GV.SC-01', 'Supply-Chain Risk Policy'],
  ['ID.AM-01', 'Asset-Management Standard'], ['ID.RA-01', 'Risk-Assessment Procedure'],
  ['PR.AA-01', 'Access-Control Policy'], ['PR.AA-05', 'Privileged-Access Standard'],
  ['PR.DS-01', 'Data-Protection Standard'], ['PR.PS-01', 'Configuration-Management Policy'],
  ['DE.CM-01', 'Continuous-Monitoring Standard'], ['DE.AE-02', 'Event-Analysis Procedure'],
  ['RS.MA-01', 'Incident-Response Plan'], ['RC.RP-01', 'Recovery Plan'],
];
function docScores(mat) {
  const out = {};
  CTRLS.forEach(([id, name], i) => {
    const cmmi = Math.max(1, Math.min(5, mat + ((i % 3) - 1))); // spread ±1 around maturity
    const total = 5, matched = Math.max(1, Math.round((cmmi / 5) * total));
    out[id] = { cmmi, doc: name + '.pdf', matched, total,
      attrs: [{ label: 'policy statement', found: cmmi >= 2 }, { label: 'roles defined', found: cmmi >= 3 },
        { label: 'metrics / KPIs', found: cmmi >= 4 }, { label: 'independent review', found: cmmi >= 5 }] };
  });
  return out;
}
function docsList(mat) {
  return CTRLS.slice(0, 8).map(([id, name]) => ({ name: name + '.pdf', type: id, cmmi: Math.max(1, Math.min(5, mat)), matched: 4, total: 5 }));
}

function toolsMap(keys) {
  const m = {};
  keys.forEach((k) => { m[k] = { vendor: 'Demo', key: k, itsm: k === 'servicenow', vmon: k === 'securityscorecard', demo: true, on: true }; });
  return m;
}

function ingestPayload(o) {
  return {
    org_name: o.org_name, org_id: orgId(o), industry: o.industry, regions: o.regions, currency: o.currency,
    financials: o.financials,
    appetite: o.appetite, budget: o.budget, dataRecords: o.dataRecords,
    principalRisks: o.principalRisks,
    insurance: o.insurance,
    processes: o.processes.map((p) => ({ name: p.name, data: p.data, rev: p.revenue, revenue: p.revenue, rto: p.rto, criticality: p.criticality, txPerDay: p.tx, tolerance: p.tolerance, function: (o.functions && o.functions[p.name]) || null })),
    apps: o.apps.map((a) => ({ name: a.name, host: a.host, data: a.data, vendor: a.vendor, eol: a.eol, recovery: a.recovery, txPerDay: a.tx, valuePerDay: a.value, processes: a.processes })),
    risks: o.risks.map((r) => ({ title: r.title, severity: r.severity, asset: r.asset, status: r.status, financial_exposure: r.exposure })),
    initiatives: o.initiatives,
    governance: o.governance,
    aiGovernance: o.aiGovernance,
    strategicInitiatives: o.strategicInitiatives,
    growth: o.growth,
    compliance: { frameworksInScope: o.frameworks },
  };
}

function browserSnippet(o) {
  const set = (k, v) => `localStorage.setItem(${JSON.stringify(k)}, ${JSON.stringify(typeof v === 'string' ? v : JSON.stringify(v))});`;
  return `/* Nerion demo loader — ${o.org_name}
   1. Open the Nerion app in your browser and log in.
   2. Open DevTools → Console (F12).
   3. Paste this whole file and press Enter. The page reloads into this org's cockpit.
   (Assumes the backend was seeded via load-all.mjs — or the cockpit will still show
    demo tool signals; ingest gives you the full crown-jewel / economics data.)      */
${set('cyberrx_demo_mode', '1')}
${set('cyberrx_org_id', orgId(o))}
${set('cyberrx_org_name', o.org_name)}
${set('cyberrx_industry', o.industry)}
${set('cyberrx_seat_names', o.seatNames)}
${set('cyberrx_frameworks', o.frameworks)}
${set('cyberrx_tools', toolsMap(o.tools))}
${set('cyberrx_initiatives', o.initiatives)}
${set('cyberrx_doc_scores', docScores(o.docMaturity))}
${set('cyberrx_docs', docsList(o.docMaturity))}
console.log('Nerion demo loaded: ${o.org_name} (${orgId(o)}). Reloading…');
location.reload();
`;
}

function orgReadme(o) {
  const p = ingestPayload(o);
  const gv = o.governance, ai = o.aiGovernance, f = o.financials;
  const line = (k, v) => `| ${k} | ${v} |`;
  return `# ${o.org_name} — Nerion demo org

**Sector:** ${o.industry}  ·  **Regions:** ${o.regions.join(', ')}  ·  **Org ID:** \`${orgId(o)}\`

${o.story}

## How to load this org

**Option A — full end-to-end (recommended):** seed the backend, then point the browser at it.
\`\`\`bash
# from the kit root, with the API running (default http://localhost:3001):
API_BASE=http://localhost:3001 node load-all.mjs        # seeds ALL orgs
# or just this one:
API_BASE=http://localhost:3001 node load-all.mjs ${o.key}
\`\`\`
Then paste \`${o.key}/browser-localStorage.js\` into the app's DevTools console. The cockpit reloads into this org with live crown-jewels, economics, governance, AI, resilience, legal and strategic-initiative data.

**Option B — exercise the onboarding UI:** open onboarding and upload the four CSVs in this folder (\`processes.csv\`, \`systems.csv\`, \`risks.csv\`, \`initiatives.csv\`), then type the field values from the tables below and click **Go live**.

**No API keys needed:** connectors run in **demo mode** (\`cyberrx_tools\` seeds ${o.tools.length} tools as \`demo:true\`), so tool-driven panels (EDR, MFA, PAM, CSPM, backup, product-security, audit-GRC, etc.) light up with representative telemetry. Mapping, scoring and every calculation run fully offline.

## Organization & financials
| Field | Value |
|---|---|
${line('Annual revenue', usd(f.revenue))}
${line('Operating income', usd(f.operatingIncome))}
${line('Net income', f.netIncome == null ? '— (n/a — public sector)' : usd(f.netIncome))}
${line('Enterprise value / market cap', f.enterpriseValue == null ? '— (n/a — public sector)' : usd(f.enterpriseValue))}
${line('Shares outstanding', f.sharesOutstanding == null ? '— (n/a)' : (f.sharesOutstanding / 1e9).toFixed(2) + 'B')}
${line('Board cyber-risk appetite', usd(o.appetite))}
${line('Annual cyber budget', usd(o.budget))}
${line('Sensitive records held', (o.dataRecords / 1e6).toFixed(1) + 'M')}
${line('Cyber insurance limit / premium', usd(o.insurance.limit) + ' / ' + usd(o.insurance.premium) + ' (renews ' + o.insurance.renewal + ')')}

## Enterprise-risk portfolio (CRO)
| Risk | Value |
|---|---|
${line('Credit / market', o.principalRisks.creditMarket == null ? '— (n/a)' : usd(o.principalRisks.creditMarket))}
${line('Operational', usd(o.principalRisks.operational))}
${line('Third-party', usd(o.principalRisks.thirdParty))}
${line('Compliance / legal', usd(o.principalRisks.compliance))}

## Board governance (type these into onboarding step 2)
| Field | Value |
|---|---|
${line('Committee that owns cyber', gv.committee)}
${line('Reporting cadence', gv.cadence)}
${line('CISO reports to', gv.cisoReportsTo)}
${line('Board cyber expertise', gv.boardExpertise)}
${line('Cyber in ERM', gv.ermIntegrated)}
${line('IR plan tested', gv.ir.tested)}
${line('Last tabletop', gv.ir.lastTabletop)}
${line('IR / breach-counsel retainer', gv.ir.retainer)}
${line('Ransomware-payment policy', gv.ir.ransomwarePolicy)}

## AI governance
| Field | Value |
|---|---|
${line('AI/LLM systems in production', ai.systems)}
${line('AI in automated decisioning', ai.decisioning)}
${line('AI governance framework', ai.framework)}
${line('AI acceptable-use policy', ai.policy)}
${line('EU AI Act scope', ai.euAiAct)}
${line('AI systems inventoried', ai.inventory)}

## Inventory (also in the CSVs)
- **${o.processes.length} business processes** → \`processes.csv\`
- **${o.apps.length} systems** → \`systems.csv\`  (crown jewels emerge from data-class + criticality + exposure)
- **${o.risks.length} risks** → \`risks.csv\`  (each links to a system by name; open risks drive material exposure)
- **${o.initiatives.length} cyber initiatives** → \`initiatives.csv\`  (per-initiative ROI for CISO/CFO)
- **${o.strategicInitiatives.length} strategic initiatives** (CEO Go/No-Go): ${o.strategicInitiatives.map((s) => s.name + ' (' + usd(s.valueUsd) + ')').join('; ')}
- **Business functions** (Framework value chain): ${o.functions ? Array.from(new Set(Object.values(o.functions))).join(', ') : '— (each process stands alone)'}

## Frameworks in scope
${o.frameworks.map((x) => '`' + x + '`').join(' · ')}

*Financials are illustrative, grounded in the company's most recent public filings; cyber-specific figures are sector-modelled, not disclosed.*
`;
}

// ── emit per-org ──
for (const o of ORGS) {
  const dir = path.join(OUT, o.key);
  fs.mkdirSync(dir, { recursive: true });
  fs.writeFileSync(path.join(dir, 'ingest.json'), JSON.stringify(ingestPayload(o), null, 2) + '\n');
  fs.writeFileSync(path.join(dir, 'processes.csv'),
    csv(['name', 'revenue', 'rto', 'data', 'criticality', 'transactions_per_day', 'downtime_tolerance', 'function'],
      o.processes.map((p) => [p.name, p.revenue, p.rto, p.data, p.criticality, p.tx, p.tolerance, (o.functions && o.functions[p.name]) || ''])));
  fs.writeFileSync(path.join(dir, 'systems.csv'),
    csv(['name', 'hosting', 'data', 'vendor', 'eol', 'recovery', 'transactions_per_day', 'value_per_day'],
      o.apps.map((a) => [a.name, a.host, a.data, a.vendor, a.eol, a.recovery, a.tx, a.value])));
  fs.writeFileSync(path.join(dir, 'risks.csv'),
    csv(['title', 'severity', 'asset', 'exposure', 'status'],
      o.risks.map((r) => [r.title, r.severity, r.asset, r.exposure, r.status])));
  fs.writeFileSync(path.join(dir, 'initiatives.csv'),
    csv(['name', 'owner', 'cost', 'roi', 'status', 'engagement'],
      o.initiatives.map((i) => [i.name, i.owner, i.cost, i.roi, i.status, i.engagement])));
  fs.writeFileSync(path.join(dir, 'browser-localStorage.js'), browserSnippet(o));
  fs.writeFileSync(path.join(dir, 'README.md'), orgReadme(o));
}

// ── loader ──
fs.writeFileSync(path.join(OUT, 'load-all.mjs'), `// Seed the Nerion backend with the demo orgs (no API keys required).
//   API_BASE=http://localhost:3001 node load-all.mjs           # all 7 orgs
//   API_BASE=http://localhost:3001 node load-all.mjs boeing    # one org by folder name
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const HERE = path.dirname(fileURLToPath(import.meta.url));
const API = (process.env.API_BASE || 'http://localhost:3001').replace(/\\/+$/, '');
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
console.log('\\nDone. Then paste <org>/browser-localStorage.js into the app console to view each org.');
`);

// ── master README ──
const matrix = ORGS.map((o) => `| ${o.org_name} | ${o.industry} | \`${o.key}\` | ${o.apps.length} sys · ${o.risks.length} risks | ${o.tools.length} demo tools |`).join('\n');
fs.writeFileSync(path.join(OUT, 'README.md'), `# Nerion — Executive Demo Kit (${ORGS.length} industry leaders)

Production-realistic onboarding data for **one recognized leader in each of ${ORGS.length} industries**, so you can test the whole platform end-to-end — **without any connector API keys**. Every mapping and calculation runs offline; connectors run in **demo mode** with representative telemetry.

## The ${ORGS.length} orgs
| Organization | Sector | Folder | Inventory | Tools |
|---|---|---|---|---|
${matrix}

## Quick start (full end-to-end)
\`\`\`bash
# 1. Run the API locally (from cyberrx-api/):  npm run dev     # → http://localhost:3001
# 2. Seed all 7 orgs into the backend:
API_BASE=http://localhost:3001 node load-all.mjs
# 3. Open the app, log in, open DevTools → Console, and paste one org's loader, e.g.:
#      unitedhealth/browser-localStorage.js
#    The cockpit reloads into that org. Repeat with another org's file to switch.
\`\`\`
> Using the hosted API instead of local? Set \`API_BASE\` to its URL (the ingest endpoint needs no auth).

## What each org exercises
- **Crown-jewel scoring & the process→system→risk chain** — every org (data-class + criticality + internet-exposure → tiers).
- **Material exposure ($)** — open risks link to systems by name; each org has 5 linked risks.
- **Economics** — ALE, tail, appetite headroom, insurance gap, %-of-revenue / %-of-EV ratios (all orgs).
- **Earnings / EPS impact** — orgs with net income + shares. *(State of California has none → tests graceful null-handling; Boeing has a **net loss** → tests negative-earnings handling.)*
- **Legal / jurisdiction clocks** — binding clock varies by footprint: US SEC 8-K 4-day (UnitedHealth, Walmart, Boeing, Duke, California, AT&T), **DORA** (JPMorgan — EU/UK), **NIS2** (Microsoft — EU/Global); sector regimes layered on (HIPAA, PCI, ITAR, NERC CIP, FCC CPNI).
- **Governance maturity** — deliberately varied: strong (Microsoft, Duke's dedicated cyber committee) vs weaker (California: semi-annual, no retainer, informal ransomware policy).
- **AI governance maturity** — from full (Microsoft: Both frameworks, EU AI Act high-risk) to nascent (Boeing/California: piloting, drafted).
- **Resilience / vendor concentration** — single-provider blast radius (UnitedHealth ↔ Change Healthcare; Duke ↔ SCADA vendor).
- **CRO enterprise-risk portfolio** — cyber vs credit/operational/third-party/compliance, on one scale.
- **Strategic-initiative Go/No-Go (CEO)** — 3 per org with value-at-stake.
- **Connectors / demo mode + evidence layer** — each org seeds a sector-appropriate tool stack (\`demo:true\`) and NIST-CSF document-evidence scores (\`cyberrx_doc_scores\`) so the ○ self-reported → ● evidenced flip is visible.
- **Business → control value chain (Framework report)** — every org groups its processes under business **functions** (the \`function\` column in processes.csv), so the Framework tab traces **function ($/yr,$/day) → process (fraction) → technology → cyber risk ($ stoppage) → the NIST CSF control that mitigates it**, showing how much each control saves when effective.
- **Industry localization** — all 8 cockpit buckets exercised: health / tech / fin / retail / gov / mfg / energy / telecom, so per-sector threats, regulators, continuity and framing all change.

## Per-org contents
Each folder has: \`ingest.json\` (ready-to-POST payload), \`processes.csv\` · \`systems.csv\` · \`risks.csv\` · \`initiatives.csv\` (onboarding upload templates), \`browser-localStorage.js\` (one-paste cockpit loader), and \`README.md\` (the full data sheet — every dropdown value).

## Notes
- Financials are illustrative, grounded in each company's most recent public filings; cyber-specific figures (appetite, budget, insurance, risk exposures, inventory) are sector-modelled, not disclosed.
- Executive names are placeholders.
- The ingest payload matches the exact contract the onboarding "Go live" button POSTs to \`/api/crown-jewels/ingest\`.

## Prove the calculations offline (no API, no DB, no keys)
\`verify-offline.mjs\` runs every org's \`ingest.json\` through the **real** engine modules
(mapping → crown-jewel scoring → economics → jurisdiction) and re-parses the CSVs with the
onboarding's exact parser — so you can confirm the mapping and math before ever standing up a server:
\`\`\`bash
# from the repo, with the kit at <repo>/demo/cyberxray-demo-kit (default path):
node demo/cyberxray-demo-kit/verify-offline.mjs
# or point it anywhere:
CJ_DIR=/abs/path/cyberrx-api/src/services/crownjewels node verify-offline.mjs
\`\`\`
It prints, per org: processes/systems/crown-jewels counts, material exposure, ALE, tail, %-of-revenue, top crown jewels, and the binding legal clock — and exits non-zero if any check fails.
`);

// Ship the offline verifier alongside the kit (source-of-truth lives next to this build).
try { fs.copyFileSync(new URL('./verify-offline.mjs', import.meta.url), path.join(OUT, 'verify-offline.mjs')); }
catch (e) { console.warn('verify-offline.mjs not copied: ' + e.message); }

console.log('Emitted kit to ' + OUT + ' (' + ORGS.length + ' orgs).');
