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
  return true;
}

module.exports = { init };
