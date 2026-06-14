'use strict';

/**
 * cae/schema — Control Assessment Engine, private schema (Milestone 1).
 *
 * The CSVs in src/data/cae are the control database. They are loaded into these
 * PRIVATE tables and are NEVER exposed to normal users — only a whitelisted
 * projection (see cae/projection.js) ever leaves the backend.
 *
 * Milestone 1 creates the connector-framework tables only:
 *   cae_catalog_version   provenance of a seed run
 *   cae_tool              tool library (160) — user sees category + name only
 *   cae_connector_template the 15 fully-specified connectors (INTERNAL)
 *   cae_connector_field   derived per-tool connection fields (labels/types only public)
 *   cae_connection        per-org connector state (secrets live in the vault, not here)
 *
 * Control / result / scoring tables arrive in later milestones.
 */

const db = require('../utils/db');

async function init() {
  await db.query(`
    CREATE TABLE IF NOT EXISTS cae_catalog_version (
      id          SERIAL PRIMARY KEY,
      version     TEXT,
      source      TEXT,
      counts      JSONB DEFAULT '{}',
      loaded_at   TIMESTAMPTZ DEFAULT NOW()
    );

    -- Tool library. A tool may appear in multiple categories (e.g. CyberArk in
    -- IAM and PAM), so identity is (category, name).
    CREATE TABLE IF NOT EXISTS cae_tool (
      id                  TEXT PRIMARY KEY,          -- slug(category).slug(name)
      category            TEXT NOT NULL,
      name                TEXT NOT NULL,
      rank                INTEGER,
      library_status      TEXT,
      implementation_note TEXT,
      has_connector       BOOLEAN DEFAULT false,     -- true when a template exists
      UNIQUE (category, name)
    );
    CREATE INDEX IF NOT EXISTS cae_tool_category ON cae_tool(category);

    -- Connector library (the 15 templated tools). Fully INTERNAL.
    CREATE TABLE IF NOT EXISTS cae_connector_template (
      id                    TEXT PRIMARY KEY,        -- slug(tool_name)
      tool_name             TEXT NOT NULL,
      category              TEXT,
      auth_type             TEXT,
      base_url              TEXT,
      evidence_endpoints    TEXT,
      required_scopes       TEXT,
      settings_template_json JSONB DEFAULT '{}',     -- raw template (mixed)
      internal_config_json  JSONB DEFAULT '{}',      -- non-credential half (hidden)
      evidence_objects      TEXT,
      reference             TEXT
    );

    -- Derived connection-field manifest: the ONLY connector data shown to users
    -- (label/type/required/secret). Endpoints, scopes, settings JSON never here.
    CREATE TABLE IF NOT EXISTS cae_connector_field (
      id            SERIAL PRIMARY KEY,
      connector_id  TEXT NOT NULL REFERENCES cae_connector_template(id) ON DELETE CASCADE,
      field_key     TEXT NOT NULL,
      label         TEXT NOT NULL,
      field_type    TEXT NOT NULL,                   -- url | text | secret | region
      is_secret     BOOLEAN DEFAULT false,
      required      BOOLEAN DEFAULT true,
      options_json  JSONB DEFAULT '[]',
      display_order INTEGER DEFAULT 0,
      UNIQUE (connector_id, field_key)
    );
    CREATE INDEX IF NOT EXISTS cae_connector_field_conn ON cae_connector_field(connector_id);

    -- Per-org connector configuration + health state. Secrets are NOT stored
    -- here — only a vault reference. last_error_sanitized is user-safe text.
    CREATE TABLE IF NOT EXISTS cae_connection (
      id                      TEXT PRIMARY KEY,
      org_id                  TEXT NOT NULL,
      connector_id            TEXT NOT NULL REFERENCES cae_connector_template(id) ON DELETE CASCADE,
      tool_name               TEXT NOT NULL,
      status                  TEXT NOT NULL DEFAULT 'not_connected', -- not_connected|connecting|connected|failed
      vault_secret_ref        TEXT,
      non_secret_config       JSONB DEFAULT '{}',    -- user-entered non-secret fields (url, ids, region)
      last_health_check       TIMESTAMPTZ,
      last_error_sanitized    TEXT,
      created_at              TIMESTAMPTZ DEFAULT NOW(),
      updated_at              TIMESTAMPTZ DEFAULT NOW(),
      UNIQUE (org_id, connector_id)
    );
    CREATE INDEX IF NOT EXISTS cae_connection_org ON cae_connection(org_id);
  `);

  // ── Milestones 3–5: control engine, evidence, scoring (all PRIVATE) ────────
  await db.query(`
    -- The control database (105 rows). Fully INTERNAL except framework/id/name.
    CREATE TABLE IF NOT EXISTS cae_control (
      id                     TEXT PRIMARY KEY,         -- slug(framework).slug(control_id)
      framework              TEXT NOT NULL,
      control_id             TEXT NOT NULL,
      control_name           TEXT,
      category               TEXT,
      assessment_method      TEXT,                     -- automated | hybrid | detection | manual
      recommended_tools      TEXT,
      api_query              TEXT,
      connector_settings_json JSONB DEFAULT '{}',
      normalized_evidence_json JSONB DEFAULT '{}',
      validation_logic       TEXT,
      metric                 TEXT,
      scoring_rule           TEXT,
      notes                  TEXT,
      UNIQUE (framework, control_id)
    );
    CREATE INDEX IF NOT EXISTS cae_control_framework ON cae_control(framework);

    -- Which tools/categories can evidence a control. INTERNAL mapping logic.
    CREATE TABLE IF NOT EXISTS cae_control_tool_map (
      id          SERIAL PRIMARY KEY,
      control_pk  TEXT NOT NULL REFERENCES cae_control(id) ON DELETE CASCADE,
      framework   TEXT NOT NULL,
      control_id  TEXT NOT NULL,
      match_type  TEXT NOT NULL,                       -- tool | category
      tool_name   TEXT,                                -- canonical cae_tool.name (match_type=tool)
      category    TEXT,                                -- (match_type=category)
      role        TEXT DEFAULT 'secondary',            -- primary | secondary
      resolved    BOOLEAN DEFAULT true,
      raw_token   TEXT,
      UNIQUE (control_pk, raw_token)
    );
    CREATE INDEX IF NOT EXISTS cae_ctm_control ON cae_control_tool_map(control_pk);

    -- An assessment run.
    CREATE TABLE IF NOT EXISTS cae_run (
      id              TEXT PRIMARY KEY,
      org_id          TEXT NOT NULL,
      frameworks      JSONB DEFAULT '[]',
      status          TEXT DEFAULT 'running',          -- running | complete | failed
      controls_total  INTEGER DEFAULT 0,
      controls_tested INTEGER DEFAULT 0,
      controls_manual INTEGER DEFAULT 0,
      started_at      TIMESTAMPTZ DEFAULT NOW(),
      finished_at     TIMESTAMPTZ
    );
    CREATE INDEX IF NOT EXISTS cae_run_org ON cae_run(org_id);

    -- Normalized evidence (population stats) per control test. INTERNAL.
    CREATE TABLE IF NOT EXISTS cae_evidence (
      id              TEXT PRIMARY KEY,
      run_id          TEXT NOT NULL,
      org_id          TEXT NOT NULL,
      framework       TEXT NOT NULL,
      control_id      TEXT NOT NULL,
      tool_name       TEXT,
      expected_count  INTEGER DEFAULT 0,
      covered_count   INTEGER DEFAULT 0,
      pass_count      INTEGER DEFAULT 0,
      fresh_count     INTEGER DEFAULT 0,
      exception_count INTEGER DEFAULT 0,
      exception_valid INTEGER DEFAULT 0,
      evidence_source TEXT,
      source_kind     TEXT,                            -- api | ticket | document | manual | none
      raw_evidence    JSONB DEFAULT '{}',              -- admin/auditor only
      collected_at    TIMESTAMPTZ DEFAULT NOW()
    );
    CREATE INDEX IF NOT EXISTS cae_evidence_run ON cae_evidence(run_id);

    -- Scored control result (latest per org+framework+control). User-safe subset
    -- is projected by cae/projection.js.
    CREATE TABLE IF NOT EXISTS cae_result (
      id                  TEXT PRIMARY KEY,            -- org::framework::control
      org_id              TEXT NOT NULL,
      run_id              TEXT,
      framework           TEXT NOT NULL,
      control_id          TEXT NOT NULL,
      control_name        TEXT,
      status              TEXT,                         -- passed|failed|partial|not_tested|needs_manual_evidence
      score               NUMERIC,                      -- 0–5 (display)
      score_pct           NUMERIC,                      -- 0–100 (weighted composite)
      confidence          INTEGER,                      -- 0–100
      business_risk       TEXT,
      summary_finding     TEXT,
      evidence_source_name TEXT,
      recommended_action  TEXT,
      owner               TEXT,
      due_date            TIMESTAMPTZ,
      raw_evidence_ref    TEXT,
      reviewed            BOOLEAN DEFAULT false,
      computed_at         TIMESTAMPTZ DEFAULT NOW(),
      UNIQUE (org_id, framework, control_id)
    );
    CREATE INDEX IF NOT EXISTS cae_result_org_fw ON cae_result(org_id, framework);

    -- Scoring model + evidence schema (config). INTERNAL.
    CREATE TABLE IF NOT EXISTS cae_scoring_model (
      id          SERIAL PRIMARY KEY,
      component   TEXT, weight NUMERIC, description TEXT, formula TEXT
    );
    CREATE TABLE IF NOT EXISTS cae_evidence_schema (
      id          SERIAL PRIMARY KEY,
      object      TEXT, field TEXT, type TEXT, required TEXT, description TEXT, example TEXT
    );

    -- Tools the org declares it uses in the Organization Intake (Technology step).
    -- These feed control enablement just like a connected connector does.
    CREATE TABLE IF NOT EXISTS cae_selected_tool (
      org_id      TEXT NOT NULL,
      tool_name   TEXT NOT NULL,                  -- canonical cae_tool.name
      category    TEXT,
      input_name  TEXT,                           -- what the user actually selected
      source      TEXT DEFAULT 'intake',
      created_at  TIMESTAMPTZ DEFAULT NOW(),
      PRIMARY KEY (org_id, tool_name)
    );
    CREATE INDEX IF NOT EXISTS cae_selected_tool_org ON cae_selected_tool(org_id);
  `);
  return true;
}

module.exports = { init };
