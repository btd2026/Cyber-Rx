'use strict';

/**
 * ingest/loadCis.js — STEP B3
 * ---------------------------
 * Parses the licensed CIS Controls v8.1.2 workbook (resources/cis/) into the
 * generalized framework engine as 'cis_v8_1'.
 *
 *   - 18 Controls + 153 Safeguards, native IDs (e.g. 4.10) numbered by position
 *     within each control (the workbook stores them as floats, so 4.10 ≠ 4.1 is
 *     reconstructed from row order, not the lossy numeric value).
 *   - IG1/IG2/IG3 flags -> baselines; Asset Class + Security Function -> meta.
 *   - Safeguard text stored verbatim ONLY when VERBATIM_CIS=true (licensed);
 *     otherwise text = the (short) safeguard title and text_verbatim = null.
 *   - requirement_mappings to existing checks via signal keywords, with
 *     parameters extracted from safeguard text (dormancy days, cadences,
 *     retention windows) + justification.
 *   - Safeguards with no check coverage are classified (new-check candidate vs
 *     rubric-based) and listed in FOLLOW_UPS.md.
 *   - Provisional CIS<->CSF crosswalks derived via shared checks (no licensed
 *     CIS<->CSF mapping workbook was supplied). If CIS->NIST CSF / CIS->ATT&CK
 *     mapping workbooks are added to resources/cis/, they are ingested as
 *     OFFICIAL (provenance 'CIS').
 *
 * Spot-check -> spot-check/cis.json.
 */

const fs = require('fs');
const path = require('path');
const db = require('../utils/db');
const { readSheet, sheetNames } = require('./xlsx');
const { CIS_CHECKS } = require('../data/cisCheckCandidates');

const RES = path.join(__dirname, '../../../resources');
const CIS = path.join(RES, 'cis');
const SPOT = path.join(__dirname, '../../../spot-check');
const ROOT = path.join(__dirname, '../../..');
const VERBATIM = process.env.VERBATIM_CIS === 'true';

const cisCheckId = (c) => `${c.tool}.${c.signal}`;
const CIS_BY_SG = Object.fromEntries(CIS_CHECKS.map((c) => [c.sg, c]));

// Seed the 35 CIS-specific automated checks + mock-fixture defaults so the
// safeguards that share no existing telemetry signal still produce honest
// pass/partial/fail results in the validation runner (source 'simulated' until
// a live tool connection exists). Idempotent.
async function ensureCisChecks() {
  for (const c of CIS_CHECKS) {
    await db.query(`
      INSERT INTO checks (id, tool_id, name, method, path, signal, extract, kind, default_params)
      VALUES ($1,$2,$3,'GET',$4,$5,'value','telemetry',$6)
      ON CONFLICT (id) DO UPDATE SET name=EXCLUDED.name, signal=EXCLUDED.signal,
        default_params=EXCLUDED.default_params`,
      [cisCheckId(c), c.tool, c.name, `/cis/${c.sg}`, c.signal,
        JSON.stringify({ threshold: c.threshold, direction: c.direction })]);
    // Mock-fixture default ('_defaults'); a per-org value or live connector overrides it.
    await db.query(`
      INSERT INTO metric_inputs (org_id, key, value, category, label, unit)
      VALUES ('_defaults',$1,$2,'cis',$3,'%')
      ON CONFLICT (org_id, key) DO NOTHING`,
      [c.signal, c.fixture, c.name]);
  }
  return CIS_CHECKS.length;
}

function findWorkbook() {
  if (!fs.existsSync(CIS)) return null;
  const files = fs.readdirSync(CIS).filter((f) => /\.xlsx$/i.test(f));
  // the controls workbook has a "Controls v8" sheet
  for (const f of files) {
    try { if (sheetNames(path.join(CIS, f)).some((s) => /controls v8/i.test(s))) return path.join(CIS, f); } catch (_) {}
  }
  return files.length ? path.join(CIS, files[0]) : null;
}
function controlsSheet(file) {
  const name = sheetNames(file).find((s) => /controls v8/i.test(s));
  return readSheet(file, name);
}

// keyword -> engine signal (telemetry checks share these signals)
const SIGNAL_KEYWORDS = [
  [/multi-?factor|\bmfa\b/i, 'mfa_pct'],
  [/privileged|administrator account|admin account|dedicated administrative/i, 'pam_pct'],
  [/anti-?malware|malware defense|endpoint detection|\bedr\b|behavior-based/i, 'edr_pct'],
  [/patch|software updates|remediate.*vulnerab|operating system.*supported|currently supported/i, 'patch_pct'],
  [/vulnerabilit(y|ies)|penetration|automated.*scan/i, 'vuln_sla_pct'],
  [/audit log|logging|collect.*logs|retain.*logs|centralized.*log/i, 'siem_days'],
  [/security awareness|training|skills.*program/i, 'training_pct'],
  [/service provider|third-?party|vendor/i, 'vendor'],
  [/asset inventory|inventory of|enterprise asset/i, 'endpoints'],
  [/incident.*(response|handling|report)/i, 'mttr_hrs'],
];

function extractParams(text) {
  const p = {};
  const day = text.match(/(\d+)[\s-]day/i); if (day) p.window_days = +day[1];
  const cad = text.match(/\b(daily|weekly|monthly|quarterly|annually|bi-?annually|semi-?annually)\b/i);
  if (cad) p.cadence = cad[1].toLowerCase().replace('semi-annually', 'bi-annually');
  return Object.keys(p).length ? p : null;
}

async function load() {
  const file = findWorkbook();
  if (!file) { console.warn('loadCis: no CIS workbook in resources/cis/ — B3 skipped.'); return { skipped: true }; }
  fs.mkdirSync(SPOT, { recursive: true });

  await db.query(`
    INSERT INTO frameworks (id, name, version, provenance) VALUES
      ('cis_v8_1','CIS Critical Security Controls','8.1.2','CIS')
    ON CONFLICT (id) DO UPDATE SET version=EXCLUDED.version, provenance=EXCLUDED.provenance`);

  const cisChecks = await ensureCisChecks();

  const rows = controlsSheet(file);
  const header = rows[0].map((h) => (h || '').trim());
  const ix = (name) => header.findIndex((h) => h.toLowerCase() === name.toLowerCase());
  const cCtrl = ix('CIS Control'), cSg = ix('CIS Safeguard'), cAsset = ix('Asset Class'),
    cFn = ix('Security Function'), cTitle = ix('Title'), cDesc = ix('Description'),
    cIg1 = ix('IG1'), cIg2 = ix('IG2'), cIg3 = ix('IG3');

  // signal -> [check ids]
  const checksBySignal = {};
  (await db.query(`SELECT id, signal FROM checks WHERE signal IS NOT NULL`))
    .forEach((c) => { (checksBySignal[c.signal] = checksBySignal[c.signal] || []).push(c.id); });

  let controls = 0, safeguards = 0, mapped = 0, seq = 0, curCtrl = null;
  const igCount = { ig1: 0, ig2: 0, ig3: 0 };
  const uncovered = [];

  for (let i = 1; i < rows.length; i++) {
    const r = rows[i]; if (!r || !r.length) continue;
    const ctrlCell = (r[cCtrl] || '').trim();
    const sgCell = r[cSg];
    const title = (r[cTitle] || '').trim();
    const desc = (r[cDesc] || '').trim();
    if (!ctrlCell && !title) continue;

    const isControl = sgCell == null || sgCell === '';
    if (isControl) {
      curCtrl = ctrlCell; seq = 0;
      await db.query(`
        INSERT INTO framework_requirements (framework_id, requirement_id, parent_id, family, title, text, text_verbatim, meta)
        VALUES ('cis_v8_1',$1,NULL,$1,$2,$3,$4,$5)
        ON CONFLICT (framework_id, requirement_id) DO UPDATE SET title=EXCLUDED.title, text=EXCLUDED.text, text_verbatim=EXCLUDED.text_verbatim`,
        [curCtrl, title, title, VERBATIM ? desc : null, JSON.stringify({ kind: 'control' })]);
      controls++; continue;
    }
    if (!curCtrl) continue;
    seq++;
    const id = `${curCtrl}.${seq}`;
    const baselines = { ig1: /x/i.test(r[cIg1] || ''), ig2: /x/i.test(r[cIg2] || ''), ig3: /x/i.test(r[cIg3] || '') };
    if (baselines.ig1) igCount.ig1++; if (baselines.ig2) igCount.ig2++; if (baselines.ig3) igCount.ig3++;
    const params = extractParams(`${title} ${desc}`);
    await db.query(`
      INSERT INTO framework_requirements (framework_id, requirement_id, parent_id, family, title, text, text_verbatim, baselines, meta)
      VALUES ('cis_v8_1',$1,$2,$3,$4,$5,$6,$7,$8)
      ON CONFLICT (framework_id, requirement_id) DO UPDATE SET parent_id=EXCLUDED.parent_id, family=EXCLUDED.family,
        title=EXCLUDED.title, text=EXCLUDED.text, text_verbatim=EXCLUDED.text_verbatim, baselines=EXCLUDED.baselines, meta=EXCLUDED.meta`,
      [id, curCtrl, curCtrl, title, title, VERBATIM ? desc : null, JSON.stringify(baselines),
        JSON.stringify({ kind: 'safeguard', asset_class: r[cAsset] || null, security_function: r[cFn] || null, parameters: params })]);
    safeguards++;

    // map to checks by signal keyword
    const text = `${title} ${desc}`;
    const sigs = new Set();
    SIGNAL_KEYWORDS.forEach(([re, sig]) => { if (re.test(text)) sigs.add(sig); });
    let any = false;
    for (const sig of sigs) for (const cid of checksBySignal[sig] || []) {
      await db.query(`
        INSERT INTO requirement_mappings (framework_id, requirement_id, check_id, coverage, parameters, justification, provenance)
        VALUES ('cis_v8_1',$1,$2,'partial',$3,$4,'CIS')
        ON CONFLICT (framework_id, requirement_id, check_id) DO UPDATE SET parameters=EXCLUDED.parameters`,
        [id, cid, params ? JSON.stringify(params) : null,
          `Mapped via safeguard text → ${sig} telemetry${params ? ' (params ' + JSON.stringify(params) + ')' : ''}.`]);
      mapped++; any = true;
    }

    // Direct CIS-candidate check: a purpose-built automated check for safeguards
    // that share no existing telemetry signal (see data/cisCheckCandidates.js).
    const direct = CIS_BY_SG[id];
    if (direct) {
      await db.query(`
        INSERT INTO requirement_mappings (framework_id, requirement_id, check_id, coverage, parameters, justification, provenance)
        VALUES ('cis_v8_1',$1,$2,$3,$4,$5,'CIS')
        ON CONFLICT (framework_id, requirement_id, check_id) DO UPDATE SET coverage=EXCLUDED.coverage`,
        [id, cisCheckId(direct), direct.coverage, params ? JSON.stringify(params) : null,
          `Automated CIS check via ${direct.tool} → ${direct.signal} (pass ${direct.direction} ${direct.threshold}).`]);
      mapped++; any = true;
    }
    if (!any) uncovered.push({ id, title, asset_class: r[cAsset] || null,
      classification: /backup|recover|data|encrypt|dispose|retention|classif/i.test(text) ? 'rubric-based' : 'new-check candidate' });
  }

  // Optional official CIS mapping workbooks (CIS->CSF, CIS->ATT&CK).
  const xwalkOfficial = await ingestMappingWorkbooks();

  // Provisional CIS<->CSF crosswalks via shared checks (no official workbook).
  let provXwalk = 0;
  if (!xwalkOfficial.csf) provXwalk = await deriveCisCsf();

  // FOLLOW_UPS for uncovered safeguards.
  writeFollowups(uncovered, xwalkOfficial);

  // Spot-check
  const sample = await db.query(`
    SELECT requirement_id, title, baselines, meta->>'asset_class' AS asset_class, meta->>'security_function' AS fn,
      (SELECT COUNT(*)::int FROM requirement_mappings m WHERE m.framework_id='cis_v8_1' AND m.requirement_id=r.requirement_id) AS checks
    FROM framework_requirements r WHERE framework_id='cis_v8_1' AND meta->>'kind'='safeguard'
    ORDER BY random() LIMIT 10`);
  fs.writeFileSync(path.join(SPOT, 'cis.json'), JSON.stringify(sample, null, 2));

  return { workbook: path.basename(file), controls, safeguards, igCount, mappings: mapped,
    cisChecks, uncovered: uncovered.length, provisionalCsfCrosswalks: provXwalk, official: xwalkOfficial, verbatim: VERBATIM };
}

// Derive provisional CIS<->CSF crosswalks where a CIS safeguard and a CSF
// subcategory share a mapped check (same approach as B2).
async function deriveCisCsf() {
  const cis = await db.query(`SELECT requirement_id, check_id FROM requirement_mappings WHERE framework_id='cis_v8_1'`);
  const csf = await db.query(`SELECT requirement_id, check_id FROM requirement_mappings WHERE framework_id='nist_csf_2'`);
  const csfByCheck = {}; csf.forEach((m) => { (csfByCheck[m.check_id] = csfByCheck[m.check_id] || new Set()).add(m.requirement_id); });
  const pairs = {};
  cis.forEach((m) => (csfByCheck[m.check_id] || new Set()).forEach((csfId) => { pairs[`${m.requirement_id}|${csfId}`] = (pairs[`${m.requirement_id}|${csfId}`] || 0) + 1; }));
  let n = 0;
  for (const [k, c] of Object.entries(pairs)) {
    const [cisId, csfId] = k.split('|');
    await db.query(`
      INSERT INTO requirement_crosswalks (from_framework, from_id, to_framework, to_id, relationship, provenance, provisional, meta)
      VALUES ('cis_v8_1',$1,'nist_csf_2',$2,'related','derived',true,$3)
      ON CONFLICT (from_framework, from_id, to_framework, to_id) DO UPDATE SET meta=EXCLUDED.meta`,
      [cisId, csfId, JSON.stringify({ shared_checks: c })]);
    n++;
  }
  return n;
}

// Ingest official CIS mapping workbooks if present (relationship column preserved).
async function ingestMappingWorkbooks() {
  const out = { csf: 0, attack: 0 };
  if (!fs.existsSync(CIS)) return out;
  for (const f of fs.readdirSync(CIS).filter((x) => /\.xlsx$/i.test(x))) {
    const full = path.join(CIS, f); let names;
    try { names = sheetNames(full); } catch (_) { continue; }
    const isCsf = /csf|cybersecurity framework/i.test(f);
    const isAtt = /att.?ck/i.test(f);
    if (!isCsf && !isAtt) continue;
    // best-effort: read first data sheet, look for CIS id + target id + relationship columns
    try {
      const rows = readSheet(full, names.find((n) => !/intro|license|resource|version/i.test(n)) || names[0]);
      const hdr = (rows[0] || []).map((h) => (h || '').toLowerCase());
      const cCis = hdr.findIndex((h) => /cis (safeguard|control)/.test(h));
      const cRel = hdr.findIndex((h) => /relationship/.test(h));
      const cTo = hdr.findIndex((h) => isCsf ? /csf|subcategor/.test(h) : /technique|att/.test(h));
      if (cCis < 0 || cTo < 0) continue;
      const toFw = isCsf ? 'nist_csf_2' : 'attack_enterprise';
      for (let i = 1; i < rows.length; i++) {
        const r = rows[i]; if (!r) continue;
        const from = (r[cCis] || '').toString().trim(); const to = (r[cTo] || '').toString().trim();
        if (!from || !to) continue;
        await db.query(`
          INSERT INTO requirement_crosswalks (from_framework, from_id, to_framework, to_id, relationship, provenance, provisional)
          VALUES ('cis_v8_1',$1,$2,$3,$4,'CIS',false)
          ON CONFLICT (from_framework, from_id, to_framework, to_id) DO UPDATE SET relationship=EXCLUDED.relationship, provenance='CIS', provisional=false`,
          [from, toFw, to, cRel >= 0 ? (r[cRel] || 'related') : 'related']);
        out[isCsf ? 'csf' : 'attack']++;
      }
    } catch (_) {}
  }
  return out;
}

function writeFollowups(uncovered, official) {
  const followPath = path.join(ROOT, 'FOLLOW_UPS.md');
  const cand = uncovered.filter((u) => u.classification === 'new-check candidate');
  const rub = uncovered.filter((u) => u.classification === 'rubric-based');
  const block = [
    '## B3 — CIS v8.1.2 ingested',
    '',
    `Safeguards with no automated-check coverage: **${uncovered.length}** (${cand.length} new-check candidates, ${rub.length} rubric-based).`,
    '',
    '### New-check candidates (no existing telemetry signal)',
    cand.length ? cand.map((u) => `- ${u.id} ${u.title}`).join('\n') : '_(none)_',
    '',
    '### Rubric-based (evidence document; reuse the 46 assessment rubrics when supplied)',
    rub.length ? rub.map((u) => `- ${u.id} ${u.title}`).join('\n') : '_(none)_',
    '',
    official.csf || official.attack
      ? `Official CIS mapping workbooks ingested: CIS→CSF ${official.csf}, CIS→ATT&CK ${official.attack}.`
      : 'No CIS→NIST CSF or CIS→ATT&CK mapping workbook supplied — CIS↔CSF crosswalks are derived/provisional. Add those workbooks to resources/cis/ to ingest official crosswalks.',
    '',
  ].join('\n');
  let existing = ''; try { existing = fs.readFileSync(followPath, 'utf8'); } catch (_) {}
  const without = existing.replace(/## B3 — CIS v8\.1\.2 ingested[\s\S]*?(?=\n## |$)/, '');
  fs.writeFileSync(followPath, (without.trim() ? without.trim() + '\n\n' : '# FOLLOW-UPS\n\n') + block);
}

module.exports = { load };

if (require.main === module) {
  db.init().then(load).then((r) => { console.log('loadCis:', JSON.stringify(r)); process.exit(0); })
    .catch((e) => { console.error(e); process.exit(1); });
}
