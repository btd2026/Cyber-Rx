'use strict';

/**
 * ingest/deriveAttackXwalks.js — optional mappings (derived)
 * ----------------------------------------------------------
 * Derives provisional crosswalks linking CIS v8.1 safeguards and CSF 2.0
 * subcategories to ATT&CK techniques, via the chain:
 *
 *   technique —(CTID)→ 800-53 controls —(requirement_mappings)→ checks
 *   safeguard/subcategory —(requirement_mappings)→ checks
 *
 * Where a technique's control-mapped checks intersect a safeguard's or
 * subcategory's checks, the pair is recorded as 'addresses' with
 * provenance='derived', provisional=true, and the shared-check count in meta.
 *
 * These are honest, traceable approximations. When the licensed CIS↔ATT&CK
 * mapping workbook is supplied (resources/cis/), loadCis ingests it as
 * OFFICIAL (provenance='CIS') and those rows take precedence.
 */

const db = require('../utils/db');

async function checkSetsByRequirement(frameworkId) {
  const rows = await db.query(`SELECT requirement_id, check_id FROM requirement_mappings WHERE framework_id=$1`, [frameworkId]);
  const out = {};
  rows.forEach((r) => { (out[r.requirement_id] = out[r.requirement_id] || new Set()).add(r.check_id); });
  return out;
}

async function derive() {
  // technique -> set(check) via CTID controls' checks
  const ctrlChecks = await checkSetsByRequirement('nist_800_53_r5');
  const ctid = await db.query(`
    SELECT x.from_id AS technique, x.to_id AS control
    FROM requirement_crosswalks x
    JOIN attack_techniques t ON t.id=x.from_id
    WHERE x.provenance='CTID' AND COALESCE(t.deprecated,false)=false AND COALESCE(t.revoked,false)=false`);
  const techChecks = {};
  ctid.forEach((r) => {
    const checks = ctrlChecks[r.control]; if (!checks) return;
    const set = (techChecks[r.technique] = techChecks[r.technique] || new Set());
    checks.forEach((c) => set.add(c));
  });

  const results = {};
  for (const [fw, label] of [['cis_v8_1', 'cis'], ['nist_csf_2', 'csf']]) {
    const reqChecks = await checkSetsByRequirement(fw);
    let n = 0;
    for (const [reqId, rset] of Object.entries(reqChecks)) {
      for (const [tech, tset] of Object.entries(techChecks)) {
        let shared = 0;
        rset.forEach((c) => { if (tset.has(c)) shared++; });
        if (!shared) continue;
        await db.query(`
          INSERT INTO requirement_crosswalks (from_framework, from_id, to_framework, to_id, relationship, provenance, provisional, meta)
          VALUES ($1,$2,'attack_enterprise',$3,'addresses','derived',true,$4)
          ON CONFLICT (from_framework, from_id, to_framework, to_id) DO UPDATE
            SET meta=EXCLUDED.meta
            WHERE requirement_crosswalks.provenance='derived'`,
          [fw, reqId, tech, JSON.stringify({ shared_checks: shared })]);
        n++;
      }
    }
    results[label] = n;
  }
  return results;
}

module.exports = { derive };

if (require.main === module) {
  db.init().then(derive).then((r) => { console.log('deriveAttackXwalks:', JSON.stringify(r)); process.exit(0); })
    .catch((e) => { console.error(e); process.exit(1); });
}
