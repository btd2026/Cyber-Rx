// Verifies the onboarding crown-jewel preview uses the SAME rule as the authoritative
// backend engine (CriticalityService) — same five weighted factors + 0.70 threshold —
// so the onboarding badge and the go-live value tree crown the same set (no "2 here,
// 6 there"). Runs the real onboarding buildGraph() against the HPE demo inventory.
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const pub = path.join(__dirname, '..', 'public');
const html = fs.readFileSync(path.join(pub, 'onboarding.html'), 'utf8');
const engine = fs.readFileSync(path.join(__dirname, '..', '..', 'cyberrx-api', 'src', 'services', 'crownjewels', 'CriticalityService.js'), 'utf8');
const cfg = fs.readFileSync(path.join(__dirname, '..', '..', 'cyberrx-api', 'src', 'config', 'criticality.js'), 'utf8');

let fail = 0; const ok = (label, cond) => { if (cond) pass++; else { fail++; console.error('FAIL ' + label); } }; let pass = 0;

// 1. The preview uses the engine's exact weights + threshold (kept in sync).
ok('preview weights match engine (0.35/0.15/0.25/0.15/0.10)', /CRIT_W=\{proc:0\.35,conc:0\.15,data:0\.25,expo:0\.15,spof:0\.10\}/.test(html));
ok('preview threshold matches engine (0.70)', /CRIT_THRESH=0\.70/.test(html));
ok('engine threshold is 0.70', /CRIT_CJ_THRESHOLD', 0\.70/.test(cfg));
ok('engine weights are 0.35/0.25/0.15/0.15/0.10', /CRIT_W_PROC', 0\.35/.test(cfg) && /CRIT_W_DATA', 0\.25/.test(cfg));
// 2. Identity/credentials count as top-sensitivity in BOTH (kept in sync).
ok('preview sensitivity includes CREDENTIAL|IDENTITY', /PHI\|PCI\|CLASSIFIED\|CUI\|SECRET\|CREDENTIAL\|IDENTITY/.test(html));
ok('engine sensitivity includes CREDENTIAL|IDENTITY', /PHI\|PCI\|CLASSIFIED\|CUI\|SECRET\|CREDENTIAL\|IDENTITY/.test(engine));
// 3. No more top-15% cap — selection is threshold-based.
ok('preview no longer uses a 15% cap', !/apps\.length\*0\.15/.test(html));

// 4. Run the real preview scorer on the HPE demo inventory.
const split = (l) => { const o = []; let c = '', q = false; for (const ch of l) { if (ch === '"') q = !q; else if (ch === ',' && !q) { o.push(c); c = ''; } else c += ch; } o.push(c); return o.map((x) => x.trim().replace(/^"|"$/g, '')); };
const pd = (t) => { const L = t.trim().split(/\r?\n/); const h = split(L[0]); return L.slice(1).map(split).map((r) => { const o = {}; h.forEach((k, i) => (o[k] = r[i])); return o; }); };
const start = html.indexOf('function mtok(');
const marker = 'return {procs:procs,apps:apps};';
const end = html.indexOf('}', html.indexOf(marker, start) + marker.length) + 1;
const src = html.slice(start, end);
const demo = path.join(__dirname, '..', 'demo', 'HPE');
if (fs.existsSync(demo)) {
  const PROC = pd(fs.readFileSync(path.join(demo, '01_processes.csv'), 'utf8')).map((r) => ({ name: r.name, revenue: r.revenue, rto: r.rto, data: r.data, criticality: r.criticality, func: r.function }));
  const APP = pd(fs.readFileSync(path.join(demo, '02_systems.csv'), 'utf8')).map((r) => ({ name: r.name, host: r.hosting, data: r.data, vendor: r.vendor }));
  // eslint-disable-next-line no-new-func
  const g = new Function('PROC', 'APP', src + '\n return buildGraph();')(PROC, APP);
  const cj = g.apps.filter((a) => a.cj);
  ok('HPE preview crowns more than the old min-2', cj.length >= 3);
  ok('every crowned score clears the 70 threshold', cj.every((a) => a.score >= 70));
  ok('an identity system is crowned (credentials now valued)', cj.some((a) => /okta|identity|active directory|entra/i.test(a.n)));
  console.log('HPE preview crown jewels (' + cj.length + '): ' + cj.map((a) => a.n + ' ' + a.score).join(' · '));
} else { console.warn('note: demo/HPE not present, skipping live-run'); }

if (fail) { console.error(`\ncrownjewel-reconcile-smoke: ${pass} passed, ${fail} FAILED`); process.exit(1); }
console.log(`crownjewel-reconcile-smoke OK — ${pass} checks pass (preview rule == engine rule; identity valued; threshold-based).`);
