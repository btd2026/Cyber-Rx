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

      -- M1 T-011: Risk and Finding entities with correlation linkage

      CREATE TABLE IF NOT EXISTS risks (
        id                  TEXT PRIMARY KEY,
        title               TEXT NOT NULL,
        severity            TEXT NOT NULL CHECK (severity IN ('Critical', 'High', 'Medium', 'Low')),
        status              TEXT NOT NULL CHECK (status IN ('open', 'mitigating', 'accepted', 'closed')),
        organization_id     TEXT NOT NULL REFERENCES orgs(id) ON DELETE CASCADE,
        description         TEXT,
        likelihood          TEXT,
        finding_id          TEXT,
        asset_id            TEXT,
        application_id      TEXT,
        vendor_id           TEXT,
        business_process_ids JSONB DEFAULT '[]',
        data_object_ids     JSONB DEFAULT '[]',
        threat_scenario_id  TEXT,
        framework_mappings  JSONB DEFAULT '[]',
        financial_exposure  NUMERIC,
        cost_to_remediate   NUMERIC,
        legal_obligation_ids JSONB DEFAULT '[]',
        regulatory_citation TEXT,
        executive_owner     TEXT,
        remediation_owner   TEXT,
        evidence_owner      TEXT,
        audit_evidence_required TEXT,
        audit_test_ids      JSONB DEFAULT '[]',
        created_at          TIMESTAMPTZ DEFAULT NOW(),
        updated_at          TIMESTAMPTZ DEFAULT NOW()
      );

      CREATE TABLE IF NOT EXISTS findings (
        id                  TEXT PRIMARY KEY,
        title               TEXT NOT NULL,
        description         TEXT,
        severity            TEXT NOT NULL CHECK (severity IN ('Critical', 'High', 'Medium', 'Low', 'Info')),
        status              TEXT NOT NULL CHECK (status IN ('open', 'in_progress', 'resolved', 'closed', 'false_positive', 'risk_accepted')),
        organization_id     TEXT NOT NULL REFERENCES orgs(id) ON DELETE CASCADE,
        discovered_date     TIMESTAMPTZ NOT NULL,
        risk_id             TEXT,
        asset_id            TEXT,
        application_id      TEXT,
        business_process_id TEXT,
        is_repeat           BOOLEAN DEFAULT false,
        original_finding_id TEXT,
        repeat_count        INTEGER DEFAULT 0,
        remediation_plan    TEXT,
        target_date         TIMESTAMPTZ,
        owner               TEXT,
        source              TEXT,
        source_ref          TEXT,
        tool                TEXT,
        metadata            JSONB,
        created_at          TIMESTAMPTZ DEFAULT NOW(),
        updated_at          TIMESTAMPTZ DEFAULT NOW()
      );

      -- Indexes for Risk and Finding

      CREATE INDEX IF NOT EXISTS risks_org ON risks(organization_id);
      CREATE INDEX IF NOT EXISTS risks_severity ON risks(severity);
      CREATE INDEX IF NOT EXISTS risks_status ON risks(status);
      CREATE INDEX IF NOT EXISTS risks_asset ON risks(asset_id);
      CREATE INDEX IF NOT EXISTS risks_threat_scenario ON risks(threat_scenario_id);
      CREATE INDEX IF NOT EXISTS risks_executive_owner ON risks(executive_owner);
      CREATE INDEX IF NOT EXISTS risks_business_processes ON risks USING GIN (business_process_ids);
      CREATE INDEX IF NOT EXISTS risks_data_objects ON risks USING GIN (data_object_ids);
      CREATE INDEX IF NOT EXISTS risks_legal_obligations ON risks USING GIN (legal_obligation_ids);

      CREATE INDEX IF NOT EXISTS findings_org ON findings(organization_id);
      CREATE INDEX IF NOT EXISTS findings_severity ON findings(severity);
      CREATE INDEX IF NOT EXISTS findings_status ON findings(status);
      CREATE INDEX IF NOT EXISTS findings_discovered ON findings(discovered_date DESC);
      CREATE INDEX IF NOT EXISTS findings_risk ON findings(risk_id);
      CREATE INDEX IF NOT EXISTS findings_asset ON findings(asset_id);
      CREATE INDEX IF NOT EXISTS findings_business_process ON findings(business_process_id);
      CREATE INDEX IF NOT EXISTS findings_is_repeat ON findings(is_repeat);
      CREATE INDEX IF NOT EXISTS findings_tool ON findings(tool);

      -- M1 T-012: Financial Impact entity (CFO model)

      CREATE TABLE IF NOT EXISTS financial_impacts (
        id                  TEXT PRIMARY KEY,
        risk_id             TEXT NOT NULL UNIQUE,
        organization_id     TEXT NOT NULL REFERENCES orgs(id) ON DELETE CASCADE,
        scenario_id         TEXT,
        breach_response_cost NUMERIC DEFAULT 0,
        regulatory_fine     NUMERIC DEFAULT 0,
        business_interruption NUMERIC DEFAULT 0,
        fraud_loss          NUMERIC DEFAULT 0,
        reputational_loss   NUMERIC DEFAULT 0,
        legal_cost          NUMERIC DEFAULT 0,
        recovery_cost       NUMERIC DEFAULT 0,
        total_gross         NUMERIC DEFAULT 0,
        insurance_coverage  NUMERIC DEFAULT 0,
        net_exposure        NUMERIC DEFAULT 0,
        created_at          TIMESTAMPTZ DEFAULT NOW(),
        updated_at          TIMESTAMPTZ DEFAULT NOW()
      );

      CREATE INDEX IF NOT EXISTS financial_impacts_org ON financial_impacts(organization_id);
      CREATE INDEX IF NOT EXISTS financial_impacts_risk ON financial_impacts(risk_id);

      -- Core Workflow Entities: Controls, Remediation Tasks, Evidence

      CREATE TABLE IF NOT EXISTS controls (
        id                    TEXT PRIMARY KEY,
        organization_id       TEXT NOT NULL REFERENCES orgs(id) ON DELETE CASCADE,
        control_id            TEXT NOT NULL,
        framework             TEXT NOT NULL CHECK (framework IN ('NIST-CSF', 'CIS-v8', 'HIPAA', 'SOC2', 'ISO-27001', 'Other')),
        title                 TEXT NOT NULL,
        description           TEXT,
        implementation_status TEXT NOT NULL CHECK (implementation_status IN ('Implemented', 'Partial', 'Planned', 'None')),
        effectiveness_score   INTEGER CHECK (effectiveness_score BETWEEN 0 AND 100),
        owner                 TEXT,
        owner_department      TEXT,
        related_risk_ids      JSONB DEFAULT '[]',
        related_finding_ids   JSONB DEFAULT '[]',
        last_tested_date      DATE,
        next_review_date      DATE,
        test_evidence         JSONB DEFAULT '[]',
        control_type          TEXT CHECK (control_type IN ('Preventive', 'Detective', 'Corrective', 'Compensating')),
        tier                  TEXT CHECK (tier IN ('Tier 1', 'Tier 2', 'Tier 3')),
        created_at            TIMESTAMPTZ DEFAULT NOW(),
        updated_at            TIMESTAMPTZ DEFAULT NOW()
      );

      CREATE TABLE IF NOT EXISTS remediation_tasks (
        id                    TEXT PRIMARY KEY,
        organization_id       TEXT NOT NULL REFERENCES orgs(id) ON DELETE CASCADE,
        title                 TEXT NOT NULL,
        description           TEXT,
        source_finding_id     TEXT REFERENCES findings(id) ON DELETE SET NULL,
        source_risk_id        TEXT REFERENCES risks(id) ON DELETE SET NULL,
        related_control_id    TEXT REFERENCES controls(id) ON DELETE SET NULL,
        assigned_to           TEXT,
        assigned_team         TEXT,
        priority              TEXT CHECK (priority IN ('Critical', 'High', 'Medium', 'Low')),
        status                TEXT NOT NULL CHECK (status IN ('Pending', 'In Progress', 'Completed', 'Verified', 'Cancelled')),
        target_date           DATE,
        completed_date        DATE,
        estimated_cost        NUMERIC(12,2),
        actual_cost           NUMERIC(12,2),
        evidence_attachments  JSONB DEFAULT '[]',
        verification_status   TEXT,
        blocker_reason        TEXT,
        created_at            TIMESTAMPTZ DEFAULT NOW(),
        updated_at            TIMESTAMPTZ DEFAULT NOW()
      );

      CREATE TABLE IF NOT EXISTS evidence (
        id                    TEXT PRIMARY KEY,
        organization_id       TEXT NOT NULL REFERENCES orgs(id) ON DELETE CASCADE,
        title                 TEXT NOT NULL,
        description           TEXT,
        evidence_type         TEXT CHECK (evidence_type IN ('Document', 'Screenshot', 'Config', 'Log', 'Interview', 'Test')),
        file_url             TEXT,
        file_name             TEXT,
        file_size             INTEGER,
        upload_date           TIMESTAMPTZ DEFAULT NOW(),
        uploaded_by           TEXT,
        related_finding_id    TEXT REFERENCES findings(id) ON DELETE SET NULL,
        related_control_id    TEXT REFERENCES controls(id) ON DELETE SET NULL,
        related_task_id       TEXT REFERENCES remediation_tasks(id) ON DELETE SET NULL,
        evidence_date         DATE,
        validity_start        DATE,
        validity_end          DATE,
        status                TEXT CHECK (status IN ('Valid', 'Expired', 'Rejected', 'Pending')),
        review_date           DATE,
        reviewed_by           TEXT,
        created_at            TIMESTAMPTZ DEFAULT NOW()
      );

      -- Indexes for Controls

      CREATE INDEX IF NOT EXISTS controls_org ON controls(organization_id);
      CREATE INDEX IF NOT EXISTS controls_framework ON controls(framework);
      CREATE INDEX IF NOT EXISTS controls_effectiveness ON controls(effectiveness_score);
      CREATE INDEX IF NOT EXISTS controls_status ON controls(implementation_status);
      CREATE INDEX IF NOT EXISTS controls_tier ON controls(tier);
      CREATE INDEX IF NOT EXISTS controls_risk_ids ON controls USING GIN (related_risk_ids);
      CREATE INDEX IF NOT EXISTS controls_finding_ids ON controls USING GIN (related_finding_ids);

      -- Indexes for Remediation Tasks

      CREATE INDEX IF NOT EXISTS tasks_org ON remediation_tasks(organization_id);
      CREATE INDEX IF NOT EXISTS tasks_status ON remediation_tasks(status);
      CREATE INDEX IF NOT EXISTS tasks_assigned_to ON remediation_tasks(assigned_to);
      CREATE INDEX IF NOT EXISTS tasks_priority ON remediation_tasks(priority);
      CREATE INDEX IF NOT EXISTS tasks_target_date ON remediation_tasks(target_date);
      CREATE INDEX IF NOT EXISTS tasks_finding ON remediation_tasks(source_finding_id);
      CREATE INDEX IF NOT EXISTS tasks_risk ON remediation_tasks(source_risk_id);
      CREATE INDEX IF NOT EXISTS tasks_control ON remediation_tasks(related_control_id);

      -- Indexes for Evidence

      CREATE INDEX IF NOT EXISTS evidence_org ON evidence(organization_id);
      CREATE INDEX IF NOT EXISTS evidence_status ON evidence(status);
      CREATE INDEX IF NOT EXISTS evidence_type ON evidence(evidence_type);
      CREATE INDEX IF NOT EXISTS evidence_control ON evidence(related_control_id);
      CREATE INDEX IF NOT EXISTS evidence_finding ON evidence(related_finding_id);
      CREATE INDEX IF NOT EXISTS evidence_task ON evidence(related_task_id);
      CREATE INDEX IF NOT EXISTS evidence_validity_end ON evidence(validity_end);
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
