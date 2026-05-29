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
