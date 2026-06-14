'use strict';

/**
 * cae/seedConnectors — Milestone 1 seeder.
 *
 * Loads the control database's connector/tool catalogs from the in-repo CSVs
 * (src/data/cae) into the private cae_* tables, and derives the user-facing
 * connection-field manifest via cae/fieldSplit. Idempotent (ON CONFLICT upsert).
 *
 * Reads files from the repo (not the ephemeral upload path) so seeding is
 * reproducible on any deploy. Run standalone:  node src/cae/seedConnectors.js
 */

const fs = require('fs');
const path = require('path');
const db = require('../utils/db');
const logger = require('../utils/logger');
const { parseCsv } = require('../ingestion/parsers');
const { deriveFields } = require('./fieldSplit');
const schema = require('./schema');

const DATA_DIR = path.join(__dirname, '..', 'data', 'cae');
const slug = (s) => String(s || '').toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '') || 'x';

function readCsv(file) {
  const text = fs.readFileSync(path.join(DATA_DIR, file), 'utf8');
  return parseCsv(text).rows;
}

function safeJson(s) {
  if (!s) return {};
  try { return JSON.parse(s); } catch (_) { return {}; }   // never abort the seed on one bad row
}

async function seedTools() {
  const rows = readCsv('tool_library_top10_by_category.csv');
  let n = 0;
  for (const r of rows) {
    const category = r.Category, name = r.Tool;
    if (!category || !name) continue;
    const id = `${slug(category)}.${slug(name)}`;
    await db.query(
      `INSERT INTO cae_tool (id, category, name, rank, library_status, implementation_note)
       VALUES ($1,$2,$3,$4,$5,$6)
       ON CONFLICT (id) DO UPDATE SET rank=EXCLUDED.rank, library_status=EXCLUDED.library_status,
         implementation_note=EXCLUDED.implementation_note`,
      [id, category, name, parseInt(r.Rank, 10) || null, r.Library_Status || null, r.Implementation_Note || null]);
    n++;
  }
  return n;
}

async function seedConnectors() {
  const rows = readCsv('connector_library.csv');
  let connectors = 0, fields = 0;
  for (const r of rows) {
    const toolName = r.Tool;
    if (!toolName) continue;
    const id = slug(toolName);
    const template = safeJson(r.Connector_Settings_JSON_Template);
    const { fields: derived, internalConfig } = deriveFields(template, r.Auth_Type);

    await db.query(
      `INSERT INTO cae_connector_template
         (id, tool_name, category, auth_type, base_url, evidence_endpoints, required_scopes,
          settings_template_json, internal_config_json, evidence_objects, reference)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11)
       ON CONFLICT (id) DO UPDATE SET
         category=EXCLUDED.category, auth_type=EXCLUDED.auth_type, base_url=EXCLUDED.base_url,
         evidence_endpoints=EXCLUDED.evidence_endpoints, required_scopes=EXCLUDED.required_scopes,
         settings_template_json=EXCLUDED.settings_template_json,
         internal_config_json=EXCLUDED.internal_config_json,
         evidence_objects=EXCLUDED.evidence_objects, reference=EXCLUDED.reference`,
      [id, toolName, r.Category || null, r.Auth_Type || null, r.Base_URL || null,
        r.Evidence_Endpoints_or_Queries || null, r.Required_Read_Scopes_or_Roles || null,
        JSON.stringify(template), JSON.stringify(internalConfig),
        r.Evidence_Objects || null, r.Reference || null]);
    connectors++;

    // Replace this connector's derived field manifest.
    await db.query('DELETE FROM cae_connector_field WHERE connector_id=$1', [id]);
    for (const f of derived) {
      await db.query(
        `INSERT INTO cae_connector_field
           (connector_id, field_key, label, field_type, is_secret, required, options_json, display_order)
         VALUES ($1,$2,$3,$4,$5,$6,$7,$8)
         ON CONFLICT (connector_id, field_key) DO NOTHING`,
        [id, f.field_key, f.label, f.field_type, f.is_secret, f.required,
          JSON.stringify(f.options || []), f.display_order]);
      fields++;
    }
  }

  // Flag tools that have a connector template. Tolerant match: exact, or either
  // name contains the other (tool-library vs connector-library naming gap).
  await db.query(
    `UPDATE cae_tool t SET has_connector = EXISTS (
       SELECT 1 FROM cae_connector_template c
        WHERE c.tool_name = t.name
           OR position(lower(c.tool_name) in lower(t.name)) > 0
           OR position(lower(t.name) in lower(c.tool_name)) > 0)`);
  return { connectors, fields };
}

async function seed() {
  await schema.init();
  const tools = await seedTools();
  const { connectors, fields } = await seedConnectors();
  const withConnector = (await db.query('SELECT COUNT(*)::int n FROM cae_tool WHERE has_connector'))[0].n;
  const result = { tools, connectors, connectorFields: fields, toolsWithConnector: withConnector };
  await db.query(
    `INSERT INTO cae_catalog_version (version, source, counts) VALUES ($1,$2,$3)`,
    ['m1', 'src/data/cae csv', JSON.stringify(result)]);
  logger.info('cae connector framework seeded', result);
  return result;
}

module.exports = { seed, seedTools, seedConnectors };

if (require.main === module) {
  db.init().then(seed)
    .then((s) => { console.log('seedConnectors:', JSON.stringify(s)); process.exit(0); })
    .catch((e) => { console.error(e); process.exit(1); });
}
