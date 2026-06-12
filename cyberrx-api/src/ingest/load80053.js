'use strict';

/**
 * ingest/load80053.js — STEP B1
 * -----------------------------
 * Loads NIST SP 800-53 rev 5.2.0 into the generalized framework engine:
 *   - frameworks row 'nist_800_53_r5' (provenance 'NIST OSCAL', version 5.2.0)
 *   - framework_requirements: every control + enhancement (withdrawn flagged),
 *     title, statement prose, baselines {low,moderate,high}, and the documented
 *     testing procedure in `assessment` (assessment objectives + examine/
 *     interview/test method targets — public domain, verbatim).
 *
 * Sources (resources/, identified by content per INVENTORY.md):
 *   - NIST_SP-800-53_rev5_catalog.txt            OSCAL 5.2.0 catalog (+embedded 800-53A)
 *   - NIST_SP-800-53_rev5_{LOW,MODERATE,HIGH}-baseline_profile.json  baselines
 *   - cprt_SP_800_53_A_5_2_0_06-11-2026.json      CPRT 800-53A assessment procedures
 *
 * Reconciliation (catalog ⇄ CPRT control IDs) → resources/RECONCILIATION.md.
 * Spot-check (10 random controls) → spot-check/80053.json.
 */

const fs = require('fs');
const path = require('path');
const db = require('../utils/db');

const RES = path.join(__dirname, '../../../resources');
const SPOT = path.join(__dirname, '../../../spot-check');

const J = (f) => JSON.parse(fs.readFileSync(path.join(RES, f), 'utf8'));

// OSCAL id 'ac-2' / 'ac-2.1' -> native 'AC-2' / 'AC-2(1)'
function nativeId(oscalId) {
  const m = oscalId.match(/^([a-z]{2})-(\d+)(?:\.(\d+))?$/i);
  if (!m) return oscalId.toUpperCase();
  return m[3] ? `${m[1].toUpperCase()}-${+m[2]}(${+m[3]})` : `${m[1].toUpperCase()}-${+m[2]}`;
}
// CPRT id 'AC-02' / 'AC-04(21)' -> 'AC-2' / 'AC-4(21)'
function cprtNative(id) {
  const m = id.match(/^([A-Z]{2})-(\d+)(?:\((\d+)\))?$/);
  if (!m) return id;
  return m[3] ? `${m[1]}-${+m[2]}(${+m[3]})` : `${m[1]}-${+m[2]}`;
}

function prose(part) {
  if (!part) return '';
  let s = part.prose || '';
  (part.parts || []).forEach((p) => { s += (s ? ' ' : '') + prose(p); });
  return s.replace(/\{\{\s*insert:\s*param,\s*([\w.-]+)\s*\}\}/g, '[$1]').trim();
}

// Collect assessment objectives + method "select from" targets from an OSCAL control.
function oscalAssessment(ctrl) {
  const objectives = [], methods = [];
  (ctrl.parts || []).forEach((p) => {
    if (p.name === 'assessment-objective') {
      const t = prose(p); if (t) objectives.push(t);
    } else if (p.name === 'assessment-method') {
      const methodProp = (p.props || []).find((x) => x.name === 'method');
      const obj = (p.parts || []).find((x) => x.name === 'objects');
      methods.push({ method: methodProp ? methodProp.value : 'EXAMINE', from: prose(obj) });
    }
  });
  return { objectives, methods };
}

// Baseline membership: read with-ids from each profile.
function baselineSets() {
  const out = { low: new Set(), moderate: new Set(), high: new Set() };
  for (const [k, f] of [['low', 'LOW'], ['moderate', 'MODERATE'], ['high', 'HIGH']]) {
    const prof = J(`NIST_SP-800-53_rev5_${f}-baseline_profile.json`).profile;
    (prof.imports || []).forEach((imp) => (imp['include-controls'] || []).forEach((ic) =>
      (ic['with-ids'] || []).forEach((id) => out[k].add(id))));
  }
  return out;
}

// CPRT: build control -> {examine,interview,test} target lists via projection tree.
function cprtMethodsByControl() {
  const d = J('cprt_SP_800_53_A_5_2_0_06-11-2026.json').response.elements;
  const byId = {}; d.elements.forEach((e) => { byId[e.element_identifier] = e; });
  const children = {};
  d.relationships.filter((r) => r.relationship_identifier === 'projection')
    .forEach((r) => { (children[r.source_element_identifier] = children[r.source_element_identifier] || []).push(r.dest_element_identifier); });

  const isCtrl = (e) => e && (e.element_type === 'control' || e.element_type === 'control_enhancement');
  const out = {};
  d.elements.filter(isCtrl).forEach((ctrl) => {
    const native = cprtNative(ctrl.element_identifier);
    const acc = { examine: new Set(), interview: new Set(), test: new Set(), objectives: [] };
    const seen = new Set();
    const stack = [...(children[ctrl.element_identifier] || [])];
    while (stack.length) {
      const id = stack.pop(); if (seen.has(id)) continue; seen.add(id);
      const e = byId[id]; if (!e) continue;
      if (e.element_type === 'examine' && e.text) acc.examine.add(e.text);
      else if (e.element_type === 'interview' && e.text) acc.interview.add(e.text);
      else if (e.element_type === 'test' && e.text) acc.test.add(e.text);
      else if (e.element_type === 'determination' && e.text) acc.objectives.push(e.text);
      (children[id] || []).forEach((c) => stack.push(c));
    }
    out[native] = {
      examine: [...acc.examine], interview: [...acc.interview], test: [...acc.test],
      determinations: acc.objectives,
    };
    out[native]._present = true;
  });
  return out;
}

async function load() {
  fs.mkdirSync(SPOT, { recursive: true });
  const cat = J('NIST_SP-800-53_rev5_catalog.txt').catalog;
  const base = baselineSets();
  const cprt = cprtMethodsByControl();

  await db.query(`
    INSERT INTO frameworks (id, name, version, provenance) VALUES
      ('nist_800_53_r5', 'NIST SP 800-53', '5.2.0', 'NIST OSCAL')
    ON CONFLICT (id) DO UPDATE SET version=EXCLUDED.version, provenance=EXCLUDED.provenance`);

  const catalogIds = new Set();
  let total = 0, withdrawn = 0, withCprt = 0;
  const families = {};

  async function upsert(ctrl, family, parentNative) {
    const native = nativeId(ctrl.id);
    catalogIds.add(native);
    const isWithdrawn = (ctrl.props || []).some((p) => p.name === 'status' && p.value === 'withdrawn');
    if (isWithdrawn) withdrawn++;
    const stmt = (ctrl.parts || []).find((p) => p.name === 'statement');
    const oa = oscalAssessment(ctrl);
    const cm = cprt[native]; if (cm && cm._present) withCprt++;
    const assessment = {
      objectives: oa.objectives,
      methods: oa.methods,
      cprt: cm ? { examine: cm.examine, interview: cm.interview, test: cm.test, determinations: cm.determinations } : null,
    };
    const baselines = {
      low: base.low.has(ctrl.id), moderate: base.moderate.has(ctrl.id), high: base.high.has(ctrl.id),
    };
    families[family] = (families[family] || 0) + 1;
    await db.query(`
      INSERT INTO framework_requirements
        (framework_id, requirement_id, parent_id, family, title, text, assessment, baselines, withdrawn, meta)
      VALUES ('nist_800_53_r5',$1,$2,$3,$4,$5,$6,$7,$8,$9)
      ON CONFLICT (framework_id, requirement_id) DO UPDATE SET
        parent_id=EXCLUDED.parent_id, family=EXCLUDED.family, title=EXCLUDED.title, text=EXCLUDED.text,
        assessment=EXCLUDED.assessment, baselines=EXCLUDED.baselines, withdrawn=EXCLUDED.withdrawn`,
      [native, parentNative, family.toUpperCase(), (ctrl.title || '').trim(),
        prose(stmt), JSON.stringify(assessment), JSON.stringify(baselines), isWithdrawn,
        JSON.stringify({ oscal_id: ctrl.id })]);
    total++;
    for (const enh of ctrl.controls || []) await upsert(enh, family, native);
  }

  for (const g of cat.groups || []) {
    const fam = (g.id || '').toLowerCase();
    for (const c of g.controls || []) await upsert(c, fam, null);
  }

  // Reconciliation: catalog vs CPRT control IDs.
  const cprtIds = new Set(Object.keys(cprt));
  const onlyCatalog = [...catalogIds].filter((x) => !cprtIds.has(x));
  const onlyCprt = [...cprtIds].filter((x) => !catalogIds.has(x));
  writeReconciliation(catalogIds.size, cprtIds.size, onlyCatalog, onlyCprt);

  // Spot-check: 10 random non-withdrawn controls.
  const sample = await db.query(`
    SELECT requirement_id, family, title, left(text,180) AS text_excerpt,
           baselines, jsonb_array_length(COALESCE(assessment->'objectives','[]'::jsonb)) AS objective_count,
           (assessment->'cprt') IS NOT NULL AS has_cprt
    FROM framework_requirements WHERE framework_id='nist_800_53_r5' AND withdrawn=false
    ORDER BY random() LIMIT 10`);
  fs.writeFileSync(path.join(SPOT, '80053.json'), JSON.stringify(sample, null, 2));

  return { total, withdrawn, families: Object.keys(families).length, withCprt,
    baselines: { low: base.low.size, moderate: base.moderate.size, high: base.high.size },
    reconcile: { onlyCatalog: onlyCatalog.length, onlyCprt: onlyCprt.length } };
}

function writeReconciliation(catN, cprtN, onlyCatalog, onlyCprt) {
  const lines = [
    '# 800-53 Reconciliation — OSCAL catalog ⇄ CPRT 800-53A',
    '', `Date: ${new Date().toISOString().slice(0, 10)} · both sources version 5.2.0`, '',
    `- OSCAL catalog control+enhancement IDs: **${catN}**`,
    `- CPRT control+enhancement IDs: **${cprtN}**`,
    `- In catalog, not in CPRT methods: **${onlyCatalog.length}**`,
    `- In CPRT, not in catalog: **${onlyCprt.length}**`, '',
    '## IDs only in OSCAL catalog (no CPRT assessment methods attached)',
    onlyCatalog.length ? onlyCatalog.sort().join(', ') : '_(none)_', '',
    '## IDs only in CPRT (no catalog control)',
    onlyCprt.length ? onlyCprt.sort().join(', ') : '_(none)_', '',
    '> Withdrawn controls are retained in the catalog with `withdrawn=true` and are',
    '> excluded from scoring and baselines; they may legitimately lack CPRT methods.',
  ];
  fs.writeFileSync(path.join(RES, 'RECONCILIATION.md'), lines.join('\n'));
}

module.exports = { load };

if (require.main === module) {
  db.init().then(load).then((r) => { console.log('load80053:', JSON.stringify(r)); process.exit(0); })
    .catch((e) => { console.error(e); process.exit(1); });
}
