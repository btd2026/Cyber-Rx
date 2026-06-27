'use strict';

/**
 * cae/seedControls — Milestone 3: load the 105 control rows into cae_control and
 * derive cae_control_tool_map (alias + category resolution).
 *
 * Frameworks stay independent: each row is keyed by (framework, control_id) and
 * carries its own validation/scoring text. NO cross-framework mapping is created.
 * Idempotent. Run standalone: node src/cae/seedControls.js
 */

const fs = require('fs');
const path = require('path');
const db = require('../utils/db');
const logger = require('../utils/logger');
const { parseCsv } = require('../ingestion/parsers');
const schema = require('./schema');
const { resolve, tokensFrom } = require('./aliasMap');

const DATA_DIR = path.join(__dirname, '..', 'data', 'cae');
const FILES = [
  'nist_csf_2_0_control_api_rows.csv',
  'nist_800_53_control_api_rows.csv',
  'mitre_attck_control_api_rows.csv',
];
const slug = (s) => String(s || '').toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '') || 'x';
const safeJson = (s) => { try { return JSON.parse(s); } catch (_) { return {}; } };

// Infer how a control is assessed (drives scoring branch later).
function methodFor(framework, notes, validation) {
  if (/mitre/i.test(framework)) return 'detection';
  const t = `${notes || ''} ${validation || ''}`.toLowerCase();
  if (/manual|policy|review|tabletop|quality/.test(t)) return 'hybrid';
  return 'automated';
}

async function loadToolContext() {
  const tools = await db.query('SELECT DISTINCT name, category FROM cae_tool');
  const toolByLower = new Map();
  const categories = new Set();
  for (const r of tools) { toolByLower.set(r.name.toLowerCase(), r.name); categories.add(r.category); }
  return { toolByLower, categories };
}

async function seed() {
  await schema.init();
  const ctx = await loadToolContext();

  let controls = 0, mappings = 0, resolved = 0; const unresolved = new Set();
  for (const file of FILES) {
    const rows = parseCsv(fs.readFileSync(path.join(DATA_DIR, file), 'utf8')).rows;
    for (const r of rows) {
      const framework = r.Framework, controlId = r.Control_ID;
      if (!framework || !controlId) continue;
      const id = `${slug(framework)}.${slug(controlId)}`;
      const settings = safeJson(r.Connector_Settings_JSON);
      const method = methodFor(framework, r.Notes, r.Validation_Logic);

      await db.query(
        `INSERT INTO cae_control
           (id, framework, control_id, control_name, category, assessment_method,
            recommended_tools, api_query, connector_settings_json, normalized_evidence_json,
            validation_logic, metric, scoring_rule, notes)
         VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14)
         ON CONFLICT (framework, control_id) DO UPDATE SET
           control_name=EXCLUDED.control_name, category=EXCLUDED.category,
           assessment_method=EXCLUDED.assessment_method, recommended_tools=EXCLUDED.recommended_tools,
           api_query=EXCLUDED.api_query, connector_settings_json=EXCLUDED.connector_settings_json,
           normalized_evidence_json=EXCLUDED.normalized_evidence_json, validation_logic=EXCLUDED.validation_logic,
           metric=EXCLUDED.metric, scoring_rule=EXCLUDED.scoring_rule, notes=EXCLUDED.notes`,
        [id, framework, controlId, r.Control_Name || null, r.Control_or_Tactic_Category || null, method,
          r.Recommended_Tool_Categories_and_Tools || null, r.API_or_Query_To_Run || null,
          JSON.stringify(settings), JSON.stringify(safeJson(r.Normalized_Evidence_JSON)),
          r.Validation_Logic || null, r.Metric || null, r.Scoring_Rule || null, r.Notes || null]);
      controls++;

      // Build the tool map. Primary = also named in settings tools[]; else secondary.
      const settingTools = new Set((Array.isArray(settings.tools) ? settings.tools : []).map((s) => String(s).toLowerCase()));
      await db.query('DELETE FROM cae_control_tool_map WHERE control_pk=$1', [id]);
      const seen = new Set();
      for (const tok of tokensFrom(r.Recommended_Tool_Categories_and_Tools)) {
        const res = resolve(tok, ctx);
        const key = res.tool_name || res.category || res.raw_token;
        if (seen.has((key || '').toLowerCase())) continue;
        seen.add((key || '').toLowerCase());
        const role = (res.tool_name && settingTools.has(res.tool_name.toLowerCase())) ? 'primary' : 'secondary';
        await db.query(
          `INSERT INTO cae_control_tool_map
             (control_pk, framework, control_id, match_type, tool_name, category, role, resolved, raw_token)
           VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9)
           ON CONFLICT (control_pk, raw_token) DO NOTHING`,
          [id, framework, controlId, res.match_type || 'unresolved', res.tool_name || null,
            res.category || null, role, !!res.resolved, res.raw_token]);
        mappings++;
        if (res.resolved) resolved++; else unresolved.add(res.raw_token);
      }
    }
  }

  const result = {
    controls, mappings, resolved, unresolvedCount: unresolved.size,
    unresolved: Array.from(unresolved).sort(),
    byFramework: (await db.query('SELECT framework, COUNT(*)::int n FROM cae_control GROUP BY framework ORDER BY framework'))
      .reduce((o, r) => { o[r.framework] = r.n; return o; }, {}),
  };
  logger.info('cae controls seeded', { controls, mappings, resolved, unresolved: result.unresolvedCount });
  return result;
}

module.exports = { seed, methodFor };

if (require.main === module) {
  db.init().then(seed).then((s) => { console.log('seedControls:', JSON.stringify(s)); process.exit(0); })
    .catch((e) => { console.error(e); process.exit(1); });
}
