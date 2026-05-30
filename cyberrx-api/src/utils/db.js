'use strict';
const { Pool } = require('pg');

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: process.env.NODE_ENV === 'production' ? { rejectUnauthorized: false } : false,
  max: 10,
  idleTimeoutMillis: 30000,
  connectionTimeoutMillis: 5000,
});

async function init() {
  try {
    await pool.query(`
      CREATE TABLE IF NOT EXISTS orgs (
        id           TEXT PRIMARY KEY,
        name         TEXT NOT NULL,
        type         TEXT,
        has_fep      BOOLEAN DEFAULT false,
        bcbs_affiliated BOOLEAN DEFAULT false,
        setup_json   JSONB DEFAULT '{}',
        created_at   TIMESTAMPTZ DEFAULT NOW()
      );

      CREATE TABLE IF NOT EXISTS users (
        id         TEXT PRIMARY KEY,
        org_id     TEXT REFERENCES orgs(id) ON DELETE CASCADE,
        role       TEXT DEFAULT 'viewer',
        email      TEXT UNIQUE NOT NULL,
        created_at TIMESTAMPTZ DEFAULT NOW()
      );

      CREATE TABLE IF NOT EXISTS metrics (
        id           SERIAL PRIMARY KEY,
        org_id       TEXT NOT NULL,
        metric_key   TEXT NOT NULL,
        value        NUMERIC NOT NULL,
        source       TEXT,
        raw          JSONB DEFAULT '{}',
        demo         BOOLEAN DEFAULT false,
        collected_at TIMESTAMPTZ DEFAULT NOW()
      );

      CREATE TABLE IF NOT EXISTS route_actions (
        id           SERIAL PRIMARY KEY,
        org_id       TEXT NOT NULL,
        action_id    TEXT NOT NULL,
        finding_id   TEXT,
        itsm_system  TEXT,
        ticket_ref   TEXT,
        ticket_url   TEXT,
        state        TEXT DEFAULT 'created',
        created_at   TIMESTAMPTZ DEFAULT NOW()
      );

      CREATE TABLE IF NOT EXISTS tool_connections (
        id           SERIAL PRIMARY KEY,
        org_id       TEXT NOT NULL,
        tool_key     TEXT NOT NULL,
        status       TEXT DEFAULT 'disconnected',
        last_synced  TIMESTAMPTZ,
        error_msg    TEXT,
        vault_key_ref TEXT,
        UNIQUE (org_id, tool_key)
      );

      CREATE INDEX IF NOT EXISTS metrics_org_key  ON metrics(org_id, metric_key);
      CREATE INDEX IF NOT EXISTS metrics_collected ON metrics(collected_at DESC);
      CREATE INDEX IF NOT EXISTS route_actions_org ON route_actions(org_id, action_id);

      -- M1: Risk Correlation Engine Entities

      CREATE TABLE IF NOT EXISTS business_processes (
        id            TEXT PRIMARY KEY,
        name          TEXT NOT NULL,
        tier          TEXT NOT NULL CHECK (tier IN ('Primary', 'Strategic')),
        criticality   TEXT NOT NULL CHECK (criticality IN ('Critical', 'High', 'Medium', 'Low')),
        owner         TEXT NOT NULL,
        organization_id TEXT NOT NULL REFERENCES orgs(id) ON DELETE CASCADE,
        description   TEXT,
        supported_by_systems JSONB DEFAULT '[]',
        creates_data_objects JSONB DEFAULT '[]',
        governed_by_controls JSONB DEFAULT '[]',
        created_at    TIMESTAMPTZ DEFAULT NOW(),
        updated_at    TIMESTAMPTZ DEFAULT NOW()
      );

      CREATE TABLE IF NOT EXISTS assets (
        id            TEXT PRIMARY KEY,
        name          TEXT NOT NULL,
        type          TEXT NOT NULL CHECK (type IN ('server', 'endpoint', 'database', 'cloud', 'API', 'app')),
        organization_id TEXT NOT NULL REFERENCES orgs(id) ON DELETE CASCADE,
        hostname      TEXT,
        ip_address    TEXT,
        owner         TEXT,
        description   TEXT,
        business_process_ids JSONB DEFAULT '[]',
        application_ids JSONB DEFAULT '[]',
        data_classification JSONB DEFAULT '[]',
        cloud_provider TEXT,
        location      TEXT,
        created_at    TIMESTAMPTZ DEFAULT NOW(),
        updated_at    TIMESTAMPTZ DEFAULT NOW()
      );

      CREATE TABLE IF NOT EXISTS data_objects (
        id            TEXT PRIMARY KEY,
        name          TEXT NOT NULL,
        type          TEXT NOT NULL CHECK (type IN ('PHI', 'PII', 'PCI', 'Financial', 'Legal', 'Confidential')),
        sensitivity   TEXT NOT NULL CHECK (sensitivity IN ('Critical', 'High', 'Medium', 'Low')),
        organization_id TEXT NOT NULL REFERENCES orgs(id) ON DELETE CASCADE,
        record_count  INTEGER,
        description   TEXT,
        resides_in_systems JSONB DEFAULT '[]',
        accessed_by_apps JSONB DEFAULT '[]',
        protected_by_controls JSONB DEFAULT '[]',
        retention_period TEXT,
        data_owner    TEXT,
        created_at    TIMESTAMPTZ DEFAULT NOW(),
        updated_at    TIMESTAMPTZ DEFAULT NOW()
      );

      CREATE TABLE IF NOT EXISTS threat_scenarios (
        id            TEXT PRIMARY KEY,
        name          TEXT NOT NULL,
        type          TEXT NOT NULL CHECK (type IN ('ransomware', 'phishing', 'insider', 'supply_chain', 'misconfig')),
        organization_id TEXT NOT NULL REFERENCES orgs(id) ON DELETE CASCADE,
        probability   INTEGER CHECK (probability >= 0 AND probability <= 100),
        impact_level  TEXT CHECK (impact_level IN ('Critical', 'High', 'Medium', 'Low')),
        description   TEXT,
        mitre_technique JSONB DEFAULT '[]',
        exploited_risks JSONB DEFAULT '[]',
        mitre_tactic  TEXT,
        mitigation_strategy TEXT,
        created_at    TIMESTAMPTZ DEFAULT NOW(),
        updated_at    TIMESTAMPTZ DEFAULT NOW()
      );

      CREATE TABLE IF NOT EXISTS legal_obligations (
        id            TEXT PRIMARY KEY,
        name          TEXT NOT NULL,
        source        TEXT NOT NULL CHECK (source IN ('HIPAA', 'CMS', 'State', 'NAIC', 'Contract')),
        organization_id TEXT NOT NULL REFERENCES orgs(id) ON DELETE CASCADE,
        citation      TEXT,
        notification_timeline TEXT,
        applicability JSONB DEFAULT '[]',
        penalties     JSONB DEFAULT '[]',
        description   TEXT,
        max_penalty_amount NUMERIC,
        jurisdiction  TEXT,
        created_at    TIMESTAMPTZ DEFAULT NOW(),
        updated_at    TIMESTAMPTZ DEFAULT NOW()
      );

      CREATE TABLE IF NOT EXISTS executive_owners (
        id            TEXT PRIMARY KEY,
        role_id       TEXT NOT NULL CHECK (role_id IN ('CIO', 'CISO', 'CFO', 'CRO', 'CLO', 'Audit', 'CTO', 'COO', 'CEO')),
        user_id       TEXT REFERENCES users(id) ON DELETE SET NULL,
        organization_id TEXT NOT NULL REFERENCES orgs(id) ON DELETE CASCADE,
        scope_processes JSONB DEFAULT '[]',
        scope_controls JSONB DEFAULT '[]',
        scope_risks   JSONB DEFAULT '[]',
        name          TEXT,
        email         TEXT,
        title         TEXT,
        created_at    TIMESTAMPTZ DEFAULT NOW(),
        updated_at    TIMESTAMPTZ DEFAULT NOW()
      );

      -- Indexes for correlation entities

      CREATE INDEX IF NOT EXISTS business_processes_org ON business_processes(organization_id);
      CREATE INDEX IF NOT EXISTS business_processes_tier ON business_processes(tier);
      CREATE INDEX IF NOT EXISTS business_processes_criticality ON business_processes(criticality);

      CREATE INDEX IF NOT EXISTS assets_org ON assets(organization_id);
      CREATE INDEX IF NOT EXISTS assets_type ON assets(type);
      CREATE INDEX IF NOT EXISTS assets_classification ON assets USING GIN (data_classification);

      CREATE INDEX IF NOT EXISTS data_objects_org ON data_objects(organization_id);
      CREATE INDEX IF NOT EXISTS data_objects_type ON data_objects(type);
      CREATE INDEX IF NOT EXISTS data_objects_sensitivity ON data_objects(sensitivity);

      CREATE INDEX IF NOT EXISTS threat_scenarios_org ON threat_scenarios(organization_id);
      CREATE INDEX IF NOT EXISTS threat_scenarios_type ON threat_scenarios(type);

      CREATE INDEX IF NOT EXISTS legal_obligations_org ON legal_obligations(organization_id);
      CREATE INDEX IF NOT EXISTS legal_obligations_source ON legal_obligations(source);

      CREATE INDEX IF NOT EXISTS executive_owners_org ON executive_owners(organization_id);
      CREATE INDEX IF NOT EXISTS executive_owners_role ON executive_owners(role_id);
      CREATE INDEX IF NOT EXISTS executive_owners_user ON executive_owners(user_id);
    `);
    console.log('Database schema initialized');
  } catch (err) {
    console.warn('DB init skipped (no database):', err.message);
  }
}

async function query(text, params = []) {
  const { rows } = await pool.query(text, params);
  return rows;
}

module.exports = { query, init, pool };
