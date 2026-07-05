// Drive each org's ingest.json through the REAL (DB-free) engine modules to prove
// mapping + crown-jewel scoring + economics + jurisdiction all compute. Also
// re-parse the CSVs with the onboarding's exact parser to catch column drift.
import fs from 'node:fs';
import path from 'node:path';
import { createRequire } from 'node:module';
// Point CJ_DIR at <repo>/cyberrx-api/src/services/crownjewels (default assumes
// the kit sits two levels below the repo root). Override: CJ_DIR=/path node verify-offline.mjs
const CJ = (process.env.CJ_DIR || new URL('../../cyberrx-api/src/services/crownjewels/', import.meta.url).pathname).replace(/\/?$/, '/');
const require = createRequire('file://' + CJ);
const { mapOnboarding, mapRisks } = require(CJ + 'IngestMapper.js');
const Criticality = require(CJ + 'CriticalityService.js');
const Economics = require(CJ + 'EconomicsService.js');
const Jurisdiction = require(CJ + 'JurisdictionService.js');

const KIT = process.argv[2] || new URL('.', import.meta.url).pathname;

// onboarding parseDelim (copied verbatim from onboarding.html) to verify CSVs parse.
function parseDelim(text) {
  const lines = String(text || '').split(/\r?\n/).map((l) => l.trim()).filter(Boolean);
  if (!lines.length) return { headers: null, rows: [] };
  function split(l) { const out = []; let cur = '', q = false; for (let i = 0; i < l.length; i++) { const ch = l[i]; if (ch === '"') q = !q; else if ((ch === ',' || ch === '\t') && !q) { out.push(cur); cur = ''; } else cur += ch; } out.push(cur); return out.map((x) => x.trim().replace(/^"|"$/g, '')); }
  const cells = split(lines[0]); const firstLow = cells[0].toLowerCase();
  const hasHeader = /^(name|process|application|app|system|title|risk|sys_id|id|ci_class)/.test(firstLow);
  const headers = hasHeader ? cells.map((h) => h.toLowerCase()) : null;
  const dataLines = hasHeader ? lines.slice(1) : lines;
  const rows = dataLines.map(split).filter((c) => c[0]);
  return { headers, rows };
}

const usd = (n) => n == null ? '—' : (Math.abs(n) >= 1e9 ? '$' + (n / 1e9).toFixed(1) + 'B' : '$' + (n / 1e6).toFixed(0) + 'M');
let fail = 0;
const flag = (cond, msg) => { if (!cond) { fail++; console.log('   ✗ ' + msg); } };

for (const key of fs.readdirSync(KIT).filter((d) => fs.statSync(path.join(KIT, d)).isDirectory()).sort()) {
  const dir = path.join(KIT, key);
  const payload = JSON.parse(fs.readFileSync(path.join(dir, 'ingest.json'), 'utf8'));
  console.log('\n■ ' + payload.org_name + '  [' + payload.industry + ']');

  // 1. CSV integrity — row counts match payload; every column present
  const expect = { 'processes.csv': payload.processes.length, 'systems.csv': payload.apps.length, 'risks.csv': payload.risks.length, 'initiatives.csv': payload.initiatives.length };
  for (const [file, n] of Object.entries(expect)) {
    const p = parseDelim(fs.readFileSync(path.join(dir, file), 'utf8'));
    flag(p.rows.length === n, `${file}: parsed ${p.rows.length} rows, expected ${n}`);
    flag(p.headers && p.rows.every((r) => r.length === p.headers.length), `${file}: column count drift`);
  }

  // 2. Referential integrity — risks link to real systems; systems map to real processes
  const procNames = new Set(payload.processes.map((p) => p.name.toLowerCase()));
  const appNames = new Set(payload.apps.map((a) => a.name.toLowerCase()));
  payload.apps.forEach((a) => (a.processes || []).forEach((pn) => flag(procNames.has(pn.toLowerCase()), `system "${a.name}" maps to unknown process "${pn}"`)));
  payload.risks.forEach((r) => flag(appNames.has(String(r.asset).toLowerCase()), `risk "${r.title}" links to unknown asset "${r.asset}"`));

  // 3. Real mapping → crown-jewel scoring
  const mapped = mapOnboarding(payload);
  const procById = Object.fromEntries(mapped.processes.map((p) => [p.id, p]));
  const risks = mapRisks(payload.risks, mapped);
  flag(mapped.assets.length === payload.apps.length, `mapped ${mapped.assets.length}/${payload.apps.length} assets`);
  flag(risks.every((r) => r.assetId), `all ${risks.length} risks linked to an asset id`);
  flag(risks.every((r) => r.financialExposure > 0), 'all risks parsed a positive financial exposure');

  let crowns = 0, exposureOnCrowns = 0; const crownIds = new Set();
  const scored = mapped.assets.map((a) => {
    const linkedProcs = (a.businessProcessIds || []).map((id) => procById[id]).filter(Boolean);
    const s = Criticality.scoreAsset({ name: a.name, data_classification: a.dataClassification, exposure: a.exposure }, { processes: linkedProcs });
    if (s.crown_jewel) { crowns++; crownIds.add(a.id); }
    return { name: a.name, score: Math.round(s.score * 100), crown: s.crown_jewel, tier: s.crown_jewel_tier };
  });
  // material exposure = open-risk exposure on crown-jewel assets
  risks.filter((r) => r.status === 'open' && crownIds.has(r.assetId)).forEach((r) => { exposureOnCrowns += r.financialExposure; });
  flag(crowns > 0, 'at least one crown jewel emerges');
  flag(exposureOnCrowns > 0, 'material exposure (open risk on crown jewels) > 0');

  // 4. Economics
  const econ = Economics.compose({ ale: exposureOnCrowns, financials: payload.financials, appetite: payload.appetite, insurance: payload.insurance, risks });
  flag(econ && econ.ale > 0, 'economics.ale computed');
  flag(econ.ratios && (econ.ratios.pct_of_revenue != null || payload.financials.revenue == null), 'economics ratios computed');

  // 5. Jurisdiction (legal clocks)
  const dataClasses = Array.from(new Set(mapped.assets.flatMap((a) => a.dataClassification)));
  const legal = Jurisdiction.derive({ regions: payload.regions, dataClasses, industry: payload.industry });
  flag(legal && (legal.binding || (legal.obligations && legal.obligations.length)), 'jurisdiction obligations derived');

  const topCrowns = scored.filter((s) => s.crown).sort((a, b) => b.score - a.score).slice(0, 3).map((s) => `${s.name} (${s.score}/${s.tier})`).join(', ');
  console.log(`   ✓ ${mapped.processes.length} processes · ${mapped.assets.length} systems · ${crowns} crown jewels`);
  console.log(`   ✓ material exposure ${usd(exposureOnCrowns)} · ALE ${usd(econ.ale)} · tail ${usd(econ.tail)}` + (payload.financials.revenue ? ` · ${(econ.ratios.pct_of_revenue * 100).toFixed(2)}% of revenue` : ' · (no revenue ratio — public sector)'));
  console.log(`   ✓ top crowns: ${topCrowns}`);
  console.log(`   ✓ legal: ${legal.binding ? (legal.binding.obligation || legal.binding.jurisdiction) + ' / ' + (legal.binding.clock || '?') : (legal.obligations || []).length + ' obligations'}`);
}

console.log('\n' + (fail ? '❌ ' + fail + ' check(s) FAILED' : '✅ ALL CHECKS PASSED — every org maps, scores crown jewels, computes economics & legal from the real engine.'));
process.exit(fail ? 1 : 0);
