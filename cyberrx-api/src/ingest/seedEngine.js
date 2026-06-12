'use strict';

/**
 * seedEngine — STEP A foundation seeds (idempotent upserts)
 * ---------------------------------------------------------
 * Seeds the generalized framework engine from in-repo sources of truth:
 *   - frameworks:            NIST CSF 2.0 (from data/nistCsfControlLibrary.js)
 *   - framework_requirements: all 106 CSF subcategories
 *   - checks:                 every API check in data/securityToolCatalog.js
 *   - requirement_mappings:   CSF requirement -> check (provenance 'curated',
 *                             coverage 'full' when the control is fully 'auto',
 *                             'partial' otherwise)
 *   - default check_parameters thresholds per signal
 *
 * 800-53 / CIS / ATT&CK content is ingested by the STEP B loaders, not here.
 * Run: node src/ingest/seedEngine.js   (or via db boot — it is cheap + idempotent)
 */

const db = require('../utils/db');
const { FUNCTIONS, CATEGORIES, CONTROLS } = require('../data/nistCsfControlLibrary');
const { TOOLS } = require('../data/securityToolCatalog');

// Default pass thresholds per signal (direction: 'gte' higher-is-better).
const SIGNAL_THRESHOLDS = {
  mfa_pct: { threshold: 95, direction: 'gte' },
  pam_pct: { threshold: 90, direction: 'gte' },
  edr_pct: { threshold: 95, direction: 'gte' },
  patch_pct: { threshold: 90, direction: 'gte' },
  vuln_sla_pct: { threshold: 90, direction: 'gte' },
  training_pct: { threshold: 95, direction: 'gte' },
  siem_days: { threshold: 90, direction: 'gte' },
  phishing_pct: { threshold: 5, direction: 'lte' },
  mttd_hrs: { threshold: 24, direction: 'lte' },
  mttr_hrs: { threshold: 48, direction: 'lte' },
  vendor: { threshold: 1, direction: 'gte' },          // signal presence
  endpoints: { threshold: 1, direction: 'gte' },
  phi_records: { threshold: 1, direction: 'gte' },
};

const slug = (s) => String(s).toLowerCase().replace(/[^a-z0-9]+/g, '_').replace(/^_+|_+$/g, '').slice(0, 48);
const checkIdFor = (tool, api) => `${tool.id}.${slug(api.purpose)}`;

async function seedEngine() {
  // 1) Framework: NIST CSF 2.0
  await db.query(`
    INSERT INTO frameworks (id, name, version, provenance) VALUES
      ('nist_csf_2', 'NIST Cybersecurity Framework', '2.0', 'in-repo control library')
    ON CONFLICT (id) DO UPDATE SET name=EXCLUDED.name, version=EXCLUDED.version`);

  // 2) CSF requirements (106 subcategories; family = function id)
  for (const c of CONTROLS) {
    await db.query(`
      INSERT INTO framework_requirements (framework_id, requirement_id, parent_id, family, title, text, meta)
      VALUES ('nist_csf_2', $1, $2, $3, $4, $5, $6)
      ON CONFLICT (framework_id, requirement_id) DO UPDATE
        SET family=EXCLUDED.family, title=EXCLUDED.title, text=EXCLUDED.text, meta=EXCLUDED.meta`,
      [c.id, c.cat, c.fn, ((CATEGORIES.find((x) => x.id === c.cat) || {}).name || c.cat), c.name,
        JSON.stringify({ test: c.test, signal: c.signal, evidence: c.evidence })]);
  }

  // 3) Checks from the tool catalog
  let checks = 0;
  for (const tool of TOOLS) {
    for (const api of tool.apis || []) {
      if (!api.purpose) continue;
      const id = checkIdFor(tool, api);
      const params = api.signal && SIGNAL_THRESHOLDS[api.signal] ? SIGNAL_THRESHOLDS[api.signal] : null;
      await db.query(`
        INSERT INTO checks (id, tool_id, name, method, path, signal, extract, kind, default_params)
        VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9)
        ON CONFLICT (id) DO UPDATE SET name=EXCLUDED.name, method=EXCLUDED.method, path=EXCLUDED.path,
          signal=EXCLUDED.signal, extract=EXCLUDED.extract, default_params=EXCLUDED.default_params`,
        [id, tool.id, api.purpose, api.method, api.path, api.signal || null, api.extract || null,
          api.signal ? 'telemetry' : 'config', params ? JSON.stringify(params) : null]);
      checks++;
    }
  }

  // 4) CSF requirement -> check mappings (curated, from the library's tools arrays
  //    plus each API's own controls list)
  const apiByTool = {};
  TOOLS.forEach((t) => { apiByTool[t.id] = (t.apis || []).map((a) => ({ id: checkIdFor(t, a), controls: a.controls || [], signal: a.signal })); });
  let mappings = 0;
  for (const c of CONTROLS) {
    const wanted = new Set();
    (c.tools || []).forEach((toolId) => (apiByTool[toolId] || []).forEach((a) => {
      // map the tool's APIs that either declare this control or share the control's signal
      if (a.controls.includes(c.id) || (c.signal && a.signal === c.signal)) wanted.add(a.id);
    }));
    // also any API that names this control even if the library didn't list the tool
    Object.values(apiByTool).flat().forEach((a) => { if (a.controls.includes(c.id)) wanted.add(a.id); });
    for (const checkId of wanted) {
      await db.query(`
        INSERT INTO requirement_mappings (framework_id, requirement_id, check_id, coverage, justification, provenance)
        VALUES ('nist_csf_2', $1, $2, $3, $4, 'curated')
        ON CONFLICT (framework_id, requirement_id, check_id) DO UPDATE SET coverage=EXCLUDED.coverage`,
        [c.id, checkId, c.test === 'auto' ? 'full' : 'partial',
          c.test === 'auto' ? 'Control library marks this subcategory fully testable via this tool API.'
            : 'Tool API provides partial signal; attestation completes the control.']);
      mappings++;
    }
  }
  return { requirements: CONTROLS.length, checks, mappings };
}

module.exports = { seedEngine, SIGNAL_THRESHOLDS };

if (require.main === module) {
  db.init().then(seedEngine).then((r) => { console.log('seedEngine:', r); process.exit(0); })
    .catch((e) => { console.error(e); process.exit(1); });
}
