'use strict';

/**
 * ingest/loadCsfRefs.js — B2 upgrade (OFFICIAL CSF 2.0 informative references)
 * ----------------------------------------------------------------------------
 * Consumes a NIST CPRT "CSF 2.0 informative references" JSON export placed in
 * resources/nist/ (filename containing 'csf', e.g. cprt_CSF_2_0_0_*.json).
 *
 * Upgrades the derived/provisional CSF⇄800-53 crosswalks to OFFICIAL:
 * provenance='NIST CPRT', provisional=false. Official rows overwrite derived
 * rows on conflict; derived rows not covered by the export remain provisional.
 *
 * The parser is schema-defensive (the CPRT element structure mirrors the
 * 800-53A export already ingested): it scans response.elements.relationships
 * for pairs where one identifier matches a CSF subcategory (e.g. GV.OC-01)
 * and the other matches an 800-53 control (e.g. AC-02(03)), in either
 * direction, and normalizes zero-padded control IDs.
 */

const fs = require('fs');
const path = require('path');
const db = require('../utils/db');

const NIST = path.join(__dirname, '../../../resources/nist');

const CSF_RE = /^(GV|ID|PR|DE|RS|RC)\.[A-Z]{2}-\d{2}$/;
const CTRL_RE = /^([A-Z]{2})-(\d+)(?:\((\d+)\))?$/;
const ctrlNative = (id) => {
  const m = id.match(CTRL_RE); if (!m) return null;
  return m[3] ? `${m[1]}-${+m[2]}(${+m[3]})` : `${m[1]}-${+m[2]}`;
};
// CSF ids in CPRT may appear as 'GV.OC-01'; the engine stores 'GV.OC-01' too.
const csfNative = (id) => (CSF_RE.test(id) ? id : null);

function findExport() {
  if (!fs.existsSync(NIST)) return null;
  const f = fs.readdirSync(NIST).find((x) => /csf/i.test(x) && /\.json$/i.test(x));
  return f ? path.join(NIST, f) : null;
}

async function load() {
  const file = findExport();
  if (!file) return { skipped: true, reason: 'no CPRT CSF export in resources/nist/' };

  const raw = JSON.parse(fs.readFileSync(file, 'utf8'));
  const el = (raw.response && raw.response.elements) || raw.elements || raw;
  const rels = el.relationships || [];

  const validCsf = new Set(
    (await db.query(`SELECT requirement_id FROM framework_requirements WHERE framework_id='nist_csf_2'`)).map((r) => r.requirement_id));
  const validCtrl = new Set(
    (await db.query(`SELECT requirement_id FROM framework_requirements WHERE framework_id='nist_800_53_r5'`)).map((r) => r.requirement_id));

  let official = 0, unmatched = 0;
  const seen = new Set();
  for (const r of rels) {
    const a = r.source_element_identifier || '', b = r.dest_element_identifier || '';
    let csf = csfNative(a) || csfNative(b);
    let ctrl = ctrlNative(a) || ctrlNative(b);
    if (!csf || !ctrl) continue;
    if (!validCsf.has(csf) || !validCtrl.has(ctrl)) { unmatched++; continue; }
    const key = `${csf}|${ctrl}`;
    if (seen.has(key)) continue; seen.add(key);
    await db.query(`
      INSERT INTO requirement_crosswalks (from_framework, from_id, to_framework, to_id, relationship, provenance, provisional, meta)
      VALUES ('nist_csf_2',$1,'nist_800_53_r5',$2,'informative reference','NIST CPRT',false,$3)
      ON CONFLICT (from_framework, from_id, to_framework, to_id) DO UPDATE
        SET relationship='informative reference', provenance='NIST CPRT', provisional=false, meta=EXCLUDED.meta`,
      [csf, ctrl, JSON.stringify({ source: path.basename(file) })]);
    official++;
  }
  return { file: path.basename(file), official, unmatched };
}

module.exports = { load };

if (require.main === module) {
  db.init().then(load).then((r) => { console.log('loadCsfRefs:', JSON.stringify(r)); process.exit(0); })
    .catch((e) => { console.error(e); process.exit(1); });
}
