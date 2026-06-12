'use strict';

/**
 * ingest/loadAttack.js — STEP B4
 * ------------------------------
 * Loads MITRE ATT&CK content and the CTID ATT&CK⇄800-53 mapping.
 *
 * Sources (resources/, identified by content):
 *   - Mitre.txt                              STIX 2.1 bundle, Enterprise ATT&CK v19.1
 *   - nist_800_53-rev5_attack-16.1-...json   CTID mapping (ATT&CK v16.1 ⇄ 800-53 r5)
 *
 * Writes:
 *   - frameworks 'attack_enterprise' (provenance MITRE, version 19.1)
 *   - attack_tactics, attack_techniques (deprecated/revoked honored), attack_mitigations
 *   - requirement_crosswalks attack_enterprise⇄nist_800_53_r5 (provenance 'CTID',
 *     attack_version 16.1). Rows whose technique is deprecated/revoked in the
 *     loaded v19.1 bundle are flagged in meta for review (version skew).
 *
 * Version skew note (v19.1 bundle vs v16.1 mapping) → FOLLOW_UPS.md.
 * 10-row spot-check → spot-check/attack.json.
 */

const fs = require('fs');
const path = require('path');
const db = require('../utils/db');

const RES = path.join(__dirname, '../../../resources');
const SPOT = path.join(__dirname, '../../../spot-check');
const ROOT = path.join(__dirname, '../../..');
const J = (f) => JSON.parse(fs.readFileSync(path.join(RES, f), 'utf8'));

const attackId = (o) => {
  const r = (o.external_references || []).find((x) => x.source_name === 'mitre-attack');
  return r ? r.external_id : null;
};
// CTID 'CM-03' / 'AC-02(01)' -> 'CM-3' / 'AC-2(1)'
function ctrlNative(id) {
  const m = id.match(/^([A-Z]{2})-(\d+)(?:\((\d+)\))?$/);
  if (!m) return id;
  return m[3] ? `${m[1]}-${+m[2]}(${+m[3]})` : `${m[1]}-${+m[2]}`;
}

async function load() {
  fs.mkdirSync(SPOT, { recursive: true });
  const bundle = J('Mitre.txt');
  const objs = bundle.objects;

  const collection = objs.find((o) => o.type === 'x-mitre-collection');
  const version = (collection && collection.x_mitre_version) || '19.1';
  await db.query(`
    INSERT INTO frameworks (id, name, version, provenance) VALUES
      ('attack_enterprise','MITRE ATT&CK (Enterprise)',$1,'MITRE')
    ON CONFLICT (id) DO UPDATE SET version=EXCLUDED.version`, [version]);

  // Tactics
  const tactics = objs.filter((o) => o.type === 'x-mitre-tactic');
  let tac = 0;
  for (let i = 0; i < tactics.length; i++) {
    const t = tactics[i];
    await db.query(`
      INSERT INTO attack_tactics (id, name, shortname, ordinal) VALUES ($1,$2,$3,$4)
      ON CONFLICT (id) DO UPDATE SET name=EXCLUDED.name, shortname=EXCLUDED.shortname, ordinal=EXCLUDED.ordinal`,
      [attackId(t), t.name, t.x_mitre_shortname, i]);
    tac++;
  }

  // Techniques (incl. sub-techniques), honoring deprecated/revoked.
  const techs = objs.filter((o) => o.type === 'attack-pattern');
  const idByStix = {};
  techs.forEach((t) => { idByStix[t.id] = attackId(t); });
  // parent links from subtechnique-of relationships
  const parentOf = {};
  objs.filter((o) => o.type === 'relationship' && o.relationship_type === 'subtechnique-of')
    .forEach((r) => { parentOf[idByStix[r.source_ref]] = idByStix[r.target_ref]; });

  let nTech = 0, deprecated = 0;
  for (const t of techs) {
    const id = attackId(t); if (!id) continue;
    const dep = !!t.x_mitre_deprecated, rev = !!t.revoked;
    if (dep || rev) deprecated++;
    const tac2 = (t.kill_chain_phases || []).filter((k) => k.kill_chain_name === 'mitre-attack').map((k) => k.phase_name);
    await db.query(`
      INSERT INTO attack_techniques (id, name, tactics, is_subtechnique, parent_id, deprecated, revoked, attack_version, description)
      VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9)
      ON CONFLICT (id) DO UPDATE SET name=EXCLUDED.name, tactics=EXCLUDED.tactics, is_subtechnique=EXCLUDED.is_subtechnique,
        parent_id=EXCLUDED.parent_id, deprecated=EXCLUDED.deprecated, revoked=EXCLUDED.revoked, attack_version=EXCLUDED.attack_version`,
      [id, t.name, tac2, !!t.x_mitre_is_subtechnique, parentOf[id] || null, dep, rev, version,
        (t.description || '').slice(0, 2000)]);
    nTech++;
  }

  // Mitigations
  const mits = objs.filter((o) => o.type === 'course-of-action');
  let nMit = 0;
  for (const m of mits) {
    const id = attackId(m); if (!id) continue;
    await db.query(`
      INSERT INTO attack_mitigations (id, name, description, deprecated) VALUES ($1,$2,$3,$4)
      ON CONFLICT (id) DO UPDATE SET name=EXCLUDED.name, deprecated=EXCLUDED.deprecated`,
      [id, m.name, (m.description || '').slice(0, 1000), !!m.x_mitre_deprecated]);
    nMit++;
  }

  // CTID ATT&CK ⇄ 800-53 mapping → crosswalks (technique -> control).
  const ctid = J('nist_800_53-rev5_attack-16.1-enterprise.json');
  const attackVer = (ctid.metadata && ctid.metadata.attack_version) || '16.1';
  const validControls = new Set(
    (await db.query(`SELECT requirement_id FROM framework_requirements WHERE framework_id='nist_800_53_r5'`)).map((r) => r.requirement_id));
  const knownTech = {};
  (await db.query(`SELECT id, deprecated, revoked FROM attack_techniques`)).forEach((r) => { knownTech[r.id] = r; });

  let xwalks = 0, skewFlagged = 0, orphanCtrl = 0, orphanTech = 0;
  for (const o of ctid.mapping_objects || []) {
    if (o.mapping_type !== 'mitigates' || !o.capability_id || !o.attack_object_id) continue;
    const tech = o.attack_object_id;
    const ctrl = ctrlNative(o.capability_id);
    const tinfo = knownTech[tech];
    const skew = !tinfo || tinfo.deprecated || tinfo.revoked;       // not active in v19.1
    if (skew) skewFlagged++;
    if (!tinfo) orphanTech++;
    if (!validControls.has(ctrl)) { orphanCtrl++; continue; }       // control must exist
    await db.query(`
      INSERT INTO requirement_crosswalks (from_framework, from_id, to_framework, to_id, relationship, provenance, provisional, meta)
      VALUES ('attack_enterprise',$1,'nist_800_53_r5',$2,'mitigates','CTID',false,$3)
      ON CONFLICT (from_framework, from_id, to_framework, to_id) DO UPDATE SET meta=EXCLUDED.meta`,
      [tech, ctrl, JSON.stringify({ attack_version: attackVer, version_skew: skew })]);
    xwalks++;
  }

  // Spot-check
  const sample = await db.query(`
    SELECT x.from_id AS technique, t.name AS technique_name, t.deprecated, x.to_id AS control, r.title AS control_title, x.meta
    FROM requirement_crosswalks x
    JOIN attack_techniques t ON t.id=x.from_id
    JOIN framework_requirements r ON r.framework_id='nist_800_53_r5' AND r.requirement_id=x.to_id
    WHERE x.provenance='CTID' ORDER BY random() LIMIT 10`);
  fs.writeFileSync(path.join(SPOT, 'attack.json'), JSON.stringify(sample, null, 2));

  // FOLLOW_UPS: version skew.
  const followPath = path.join(ROOT, 'FOLLOW_UPS.md');
  const block = [
    '## B4 — ATT&CK version skew (bundle v' + version + ' vs CTID mapping v' + attackVer + ')',
    '',
    `- ATT&CK techniques loaded (v${version}): **${nTech}** (${deprecated} deprecated/revoked)`,
    `- CTID crosswalks written: **${xwalks}** (provenance 'CTID', attack_version ${attackVer})`,
    `- CTID rows whose technique is deprecated/revoked in v${version}: **${skewFlagged}** (flagged meta.version_skew=true)`,
    `- CTID rows referencing a technique not in the v${version} bundle: **${orphanTech}**`,
    `- CTID rows referencing an unknown 800-53 control (skipped): **${orphanCtrl}**`,
    '',
    'These are expected from the v16.1→v19.1 gap. Supplying a v19.x CTID mapping would clear the skew.',
    '',
  ].join('\n');
  let existing = ''; try { existing = fs.readFileSync(followPath, 'utf8'); } catch (_) {}
  if (!/B4 — ATT&CK version skew/.test(existing)) {
    fs.writeFileSync(followPath, existing ? `${existing}\n${block}` : `# FOLLOW-UPS\n\n${block}`);
  }

  return { tactics: tac, techniques: nTech, deprecated, mitigations: nMit,
    crosswalks: xwalks, attack_version: version, ctid_version: attackVer,
    skew: skewFlagged, orphanControls: orphanCtrl, orphanTechniques: orphanTech };
}

module.exports = { load };

if (require.main === module) {
  db.init().then(load).then((r) => { console.log('loadAttack:', JSON.stringify(r)); process.exit(0); })
    .catch((e) => { console.error(e); process.exit(1); });
}
