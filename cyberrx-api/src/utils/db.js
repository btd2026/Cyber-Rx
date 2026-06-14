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
        criticality   TEXT,
        tier          TEXT,
        supported     BOOLEAN DEFAULT true,
        end_of_support_date DATE,
        vuln_critical INTEGER DEFAULT 0,
        vuln_high     INTEGER DEFAULT 0,
        patch_pct     INTEGER,
        created_at    TIMESTAMPTZ DEFAULT NOW(),
        updated_at    TIMESTAMPTZ DEFAULT NOW()
      );

      -- CIO technology-risk fields on assets (idempotent for existing DBs)
      ALTER TABLE assets ADD COLUMN IF NOT EXISTS criticality TEXT;
      ALTER TABLE assets ADD COLUMN IF NOT EXISTS tier TEXT;
      ALTER TABLE assets ADD COLUMN IF NOT EXISTS supported BOOLEAN DEFAULT true;
      ALTER TABLE assets ADD COLUMN IF NOT EXISTS end_of_support_date DATE;
      ALTER TABLE assets ADD COLUMN IF NOT EXISTS vuln_critical INTEGER DEFAULT 0;
      ALTER TABLE assets ADD COLUMN IF NOT EXISTS vuln_high INTEGER DEFAULT 0;
      ALTER TABLE assets ADD COLUMN IF NOT EXISTS patch_pct INTEGER;

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

      -- Vendor Risk Signals Table (Phase 2: Vendor Continuous Monitoring)
      CREATE TABLE IF NOT EXISTS vendor_risk_signals (
        id                    TEXT PRIMARY KEY,
        organization_id       TEXT NOT NULL REFERENCES orgs(id) ON DELETE CASCADE,
        vendor_id             TEXT NOT NULL,
        vendor_name           TEXT NOT NULL,
        source_name           TEXT NOT NULL,
        source_type           TEXT NOT NULL CHECK (source_type IN ('api', 'webhook', 'file_upload', 'manual', 'web_scrape')),
        signal_category       TEXT NOT NULL CHECK (signal_category IN (
          'External Attack Surface', 'Breach/Incident Intelligence',
          'Dark Web/Credential Exposure', 'Regulatory Breach Disclosure',
          'Compliance Evidence', 'Questionnaire/Attestation',
          'Fourth-Party Risk', 'Policy Drift', 'Business Criticality'
        )),
        signal_name           TEXT NOT NULL,
        severity              TEXT NOT NULL CHECK (severity IN ('Critical', 'High', 'Medium', 'Low', 'Info')),
        confidence            INTEGER CHECK (confidence BETWEEN 0 AND 100),
        observed_at           TIMESTAMPTZ NOT NULL,
        status                TEXT NOT NULL CHECK (status IN ('active', 'mitigated', 'false_positive', 'under_review')),
        evidence_url          TEXT,
        description           TEXT,
        recommended_action    TEXT,
        mapped_frameworks     JSONB DEFAULT '[]',
        mapped_policies       JSONB DEFAULT '[]',
        raw_data              JSONB DEFAULT '{}',
        created_at            TIMESTAMPTZ DEFAULT NOW(),
        updated_at            TIMESTAMPTZ DEFAULT NOW()
      );

      -- Vendor Monitoring Connections Table
      CREATE TABLE IF NOT EXISTS vendor_monitoring_connections (
        id                    SERIAL PRIMARY KEY,
        organization_id       TEXT NOT NULL REFERENCES orgs(id) ON DELETE CASCADE,
        vendor_id             TEXT NOT NULL,
        connector_type        TEXT NOT NULL,
        status                TEXT DEFAULT 'disconnected' CHECK (status IN
          ('connected', 'disconnected', 'error', 'syncing', 'manual_entry_required')),
        credentials_ref       TEXT,
        last_synced           TIMESTAMPTZ,
        last_sync_status      TEXT,
        error_message         TEXT,
        sync_frequency        TEXT DEFAULT 'weekly',
        manual_entry_data     JSONB DEFAULT '{}',
        created_at            TIMESTAMPTZ DEFAULT NOW(),
        updated_at            TIMESTAMPTZ DEFAULT NOW(),
        UNIQUE (organization_id, vendor_id, connector_type)
      );

      -- Indexes for Vendor Risk Signals
      CREATE INDEX IF NOT EXISTS vendor_risk_signals_org ON vendor_risk_signals(organization_id);
      CREATE INDEX IF NOT EXISTS vendor_risk_signals_vendor ON vendor_risk_signals(vendor_id);
      CREATE INDEX IF NOT EXISTS vendor_risk_signals_source ON vendor_risk_signals(source_name);
      CREATE INDEX IF NOT EXISTS vendor_risk_signals_category ON vendor_risk_signals(signal_category);
      CREATE INDEX IF NOT EXISTS vendor_risk_signals_severity ON vendor_risk_signals(severity);
      CREATE INDEX IF NOT EXISTS vendor_risk_signals_observed ON vendor_risk_signals(observed_at DESC);
      CREATE INDEX IF NOT EXISTS vendor_risk_signals_frameworks ON vendor_risk_signals USING GIN (mapped_frameworks);

      -- Indexes for Vendor Monitoring Connections
      CREATE INDEX IF NOT EXISTS vendor_monitoring_conn_org ON vendor_monitoring_connections(organization_id);
      CREATE INDEX IF NOT EXISTS vendor_monitoring_conn_vendor ON vendor_monitoring_connections(vendor_id);
      CREATE INDEX IF NOT EXISTS vendor_monitoring_conn_type ON vendor_monitoring_connections(connector_type);

      -- Executive Agent Briefs (AI agent layer: continuous role-specific intelligence)
      CREATE TABLE IF NOT EXISTS executive_briefs (
        id                TEXT PRIMARY KEY,
        organization_id   TEXT NOT NULL REFERENCES orgs(id) ON DELETE CASCADE,
        role              TEXT NOT NULL CHECK (role IN ('CFO', 'CRO', 'CLO', 'CIO', 'CISO', 'Board')),
        question          TEXT NOT NULL,
        deliverable       TEXT NOT NULL,
        headline          TEXT,
        status            TEXT CHECK (status IN ('green', 'amber', 'red')),
        summary           TEXT,
        metrics           JSONB DEFAULT '[]',
        highlights        JSONB DEFAULT '[]',
        actions           JSONB DEFAULT '[]',
        source            TEXT DEFAULT 'deterministic',
        context_snapshot  JSONB DEFAULT '{}',
        generated_at      TIMESTAMPTZ DEFAULT NOW(),
        updated_at        TIMESTAMPTZ DEFAULT NOW(),
        UNIQUE (organization_id, role)
      );

      CREATE INDEX IF NOT EXISTS executive_briefs_org ON executive_briefs(organization_id);
      CREATE INDEX IF NOT EXISTS executive_briefs_role ON executive_briefs(role);
      CREATE INDEX IF NOT EXISTS executive_briefs_generated ON executive_briefs(generated_at DESC);

      -- NIST CSF 2.0 manual-control evidence collected during intake (answers
      -- to the CSF evidence interview, plus optional document references).
      CREATE TABLE IF NOT EXISTS csf_evidence (
        id              TEXT PRIMARY KEY,
        organization_id TEXT NOT NULL,
        question_key    TEXT NOT NULL,
        answer          TEXT,
        doc_name        TEXT,
        updated_at      TIMESTAMPTZ DEFAULT NOW(),
        UNIQUE (organization_id, question_key)
      );
      CREATE INDEX IF NOT EXISTS csf_evidence_org ON csf_evidence(organization_id);

      -- Latest NIST CSF 2.0 scorecard per organization (systemwide rankings).
      -- Upserted every time an assessment is computed.
      CREATE TABLE IF NOT EXISTS csf_scorecards (
        id                  TEXT PRIMARY KEY,
        organization_id     TEXT NOT NULL UNIQUE,
        org_name            TEXT,
        abbrev              TEXT,
        overall             NUMERIC,
        tier                INTEGER,
        tier_label          TEXT,
        inherent_risk       NUMERIC,
        functions           JSONB DEFAULT '{}',
        assessed_categories INTEGER,
        total_categories    INTEGER,
        generated_at        TIMESTAMPTZ DEFAULT NOW(),
        updated_at          TIMESTAMPTZ DEFAULT NOW()
      );
      CREATE INDEX IF NOT EXISTS csf_scorecards_overall ON csf_scorecards(overall DESC);

      -- Vendor documents reviewed by the Saraqael vendor-assessment agent, with
      -- the extracted assurance data and per-document findings it produced.
      CREATE TABLE IF NOT EXISTS vendor_documents (
        id              TEXT PRIMARY KEY,
        organization_id TEXT NOT NULL,
        vendor_id       TEXT NOT NULL,
        vendor_name     TEXT NOT NULL,
        doc_type        TEXT NOT NULL,
        file_name       TEXT,
        status          TEXT DEFAULT 'assessed',
        risk_rating     TEXT,
        extracted       JSONB DEFAULT '{}',
        findings        JSONB DEFAULT '[]',
        content_excerpt TEXT,
        assessed_at     TIMESTAMPTZ DEFAULT NOW(),
        updated_at      TIMESTAMPTZ DEFAULT NOW()
      );
      CREATE INDEX IF NOT EXISTS vendor_documents_org ON vendor_documents(organization_id);
      -- Per-document review scores (accuracy + completeness). Additive columns.
      ALTER TABLE vendor_documents ADD COLUMN IF NOT EXISTS completeness NUMERIC;
      ALTER TABLE vendor_documents ADD COLUMN IF NOT EXISTS accuracy     NUMERIC;
      ALTER TABLE vendor_documents ADD COLUMN IF NOT EXISTS doc_score    NUMERIC;
      ALTER TABLE vendor_documents ADD COLUMN IF NOT EXISTS doc_status   TEXT;

      -- Remediation path (Papa #12): every finding opens a ticket with
      -- high-level recommendations in the org's ticketing system (Jira /
      -- ServiceNow / demo). One row per finding->ticket, deduped by source_ref.
      CREATE TABLE IF NOT EXISTS remediation_tickets (
        id              TEXT PRIMARY KEY,
        organization_id TEXT NOT NULL,
        source          TEXT NOT NULL,
        source_ref      TEXT NOT NULL,
        title           TEXT NOT NULL,
        recommendation  TEXT,
        severity        TEXT,
        system          TEXT NOT NULL,
        ticket_id       TEXT,
        ticket_url      TEXT,
        status          TEXT DEFAULT 'open',
        created_at      TIMESTAMPTZ DEFAULT NOW(),
        updated_at      TIMESTAMPTZ DEFAULT NOW(),
        UNIQUE (organization_id, source_ref)
      );
      CREATE INDEX IF NOT EXISTS remediation_tickets_org ON remediation_tickets(organization_id);
      -- additive columns for the CISO remediation feedback loop (idempotent)
      ALTER TABLE remediation_tickets ADD COLUMN IF NOT EXISTS due_date TIMESTAMPTZ;
      ALTER TABLE remediation_tickets ADD COLUMN IF NOT EXISTS last_synced_at TIMESTAMPTZ;
      ALTER TABLE remediation_tickets ADD COLUMN IF NOT EXISTS owner TEXT;

      -- CISO risk acceptances — the documented decision to accept a risk as-is
      -- (the alternative to opening a remediation ticket). One per (org, source).
      CREATE TABLE IF NOT EXISTS risk_acceptances (
        id              TEXT PRIMARY KEY,
        organization_id TEXT NOT NULL,
        source_ref      TEXT NOT NULL,
        title           TEXT,
        justification   TEXT,
        risk_level      TEXT,
        accepted_by     TEXT,
        review_date     DATE,
        status          TEXT DEFAULT 'active',   -- active | expired | revoked
        created_at      TIMESTAMPTZ DEFAULT NOW(),
        updated_at      TIMESTAMPTZ DEFAULT NOW(),
        UNIQUE (organization_id, source_ref)
      );
      CREATE INDEX IF NOT EXISTS risk_acceptances_org ON risk_acceptances(organization_id);

      -- ===== Organization Intake — document request & review pipeline =====
      -- Canonical "thing we ask for" (requested at most once per org).
      CREATE TABLE IF NOT EXISTS document_type (
        id          TEXT PRIMARY KEY,
        name        TEXT NOT NULL,
        description TEXT,
        category    TEXT,                      -- Policy | Standard | Procedure | Plan | Record
        created_at  TIMESTAMPTZ DEFAULT NOW()
      );
      -- Many-to-many: a document_type evidences many controls (the dedup + fan-out).
      CREATE TABLE IF NOT EXISTS document_control_map (
        document_type_id    TEXT NOT NULL REFERENCES document_type(id),
        framework_id        TEXT NOT NULL,
        requirement_id      TEXT NOT NULL,
        expected_requirement TEXT,             -- what THIS control expects from the doc
        PRIMARY KEY (document_type_id, framework_id, requirement_id)
      );
      CREATE INDEX IF NOT EXISTS document_control_map_ctrl ON document_control_map(framework_id, requirement_id);
      -- One upload per (org, document_type).
      CREATE TABLE IF NOT EXISTS document_upload (
        id               TEXT PRIMARY KEY,
        org_id           TEXT NOT NULL,
        document_type_id TEXT NOT NULL REFERENCES document_type(id),
        file_name        TEXT,
        normalized_text  TEXT,
        format           TEXT,
        status           TEXT DEFAULT 'requested',  -- requested|uploaded|normalized|reviewed|failed
        error            TEXT,
        uploaded_at      TIMESTAMPTZ DEFAULT NOW(),
        UNIQUE (org_id, document_type_id)
      );
      -- One row per (upload, control) — the fan-out of a single document's review.
      CREATE TABLE IF NOT EXISTS control_assessment (
        id                 SERIAL PRIMARY KEY,
        org_id             TEXT NOT NULL,
        document_upload_id TEXT NOT NULL REFERENCES document_upload(id),
        framework_id       TEXT NOT NULL,
        requirement_id     TEXT NOT NULL,
        status             TEXT NOT NULL,         -- met | partially met | not met
        finding            TEXT,
        evidence_excerpt   TEXT,
        reviewed_at        TIMESTAMPTZ DEFAULT NOW()
      );
      CREATE INDEX IF NOT EXISTS control_assessment_org ON control_assessment(org_id, framework_id, requirement_id);

      -- CISO posture-domain snapshots — one row per (org, domain) per capture,
      -- so the dashboard can show whether each domain is improving/deteriorating.
      CREATE TABLE IF NOT EXISTS ciso_posture_snapshots (
        id           TEXT PRIMARY KEY,
        org_id       TEXT NOT NULL,
        domain_id    TEXT NOT NULL,
        score        NUMERIC,
        captured_at  TIMESTAMPTZ DEFAULT NOW()
      );
      CREATE INDEX IF NOT EXISTS ciso_posture_snap ON ciso_posture_snapshots(org_id, domain_id, captured_at DESC);
      CREATE INDEX IF NOT EXISTS vendor_documents_vendor ON vendor_documents(vendor_id);

      -- Editable "database of mock numbers" that drives every dashboard figure.
      -- org_id '_defaults' holds shared coefficients/assumptions; per-org rows
      -- hold setup-quiz responses and org-specific values. Edit value to change
      -- what the dashboards display.
      CREATE TABLE IF NOT EXISTS metric_inputs (
        org_id      TEXT NOT NULL,
        key         TEXT NOT NULL,
        value       NUMERIC NOT NULL,
        category    TEXT,
        label       TEXT,
        unit        TEXT,
        updated_at  TIMESTAMPTZ DEFAULT NOW(),
        PRIMARY KEY (org_id, key)
      );
      CREATE INDEX IF NOT EXISTS metric_inputs_org ON metric_inputs(org_id);

      -- Simulated live-source tool databases (demo). One table per security
      -- tool, mirroring the records the real connector reads from each vendor
      -- API (Okta, CrowdStrike, Splunk, KnowBe4, Tenable, ServiceNow,
      -- CyberArk, Workday). Org-scoped; see routes/sources.js for isolation.
      CREATE TABLE IF NOT EXISTS sim_okta_users (
        org_id TEXT NOT NULL, user_id TEXT NOT NULL, email TEXT,
        status TEXT DEFAULT 'ACTIVE', last_login TIMESTAMPTZ,
        PRIMARY KEY (org_id, user_id)
      );
      CREATE TABLE IF NOT EXISTS sim_okta_factors (
        org_id TEXT NOT NULL, user_id TEXT NOT NULL, factor_id TEXT NOT NULL,
        factor_type TEXT, status TEXT DEFAULT 'ACTIVE',
        PRIMARY KEY (org_id, factor_id)
      );
      CREATE TABLE IF NOT EXISTS sim_crowdstrike_devices (
        org_id TEXT NOT NULL, device_id TEXT NOT NULL, hostname TEXT,
        platform TEXT, status TEXT, last_seen TIMESTAMPTZ,
        PRIMARY KEY (org_id, device_id)
      );
      CREATE TABLE IF NOT EXISTS sim_splunk_indexes (
        org_id TEXT NOT NULL, index_name TEXT NOT NULL,
        frozen_time_period_in_secs BIGINT, current_db_size_mb INTEGER,
        PRIMARY KEY (org_id, index_name)
      );
      CREATE TABLE IF NOT EXISTS sim_knowbe4_campaigns (
        org_id TEXT NOT NULL, campaign_id INTEGER NOT NULL, name TEXT,
        status TEXT DEFAULT 'Closed', started_at TIMESTAMPTZ,
        recipient_count INTEGER, clicked_count INTEGER,
        PRIMARY KEY (org_id, campaign_id)
      );
      CREATE TABLE IF NOT EXISTS sim_tenable_assets (
        org_id TEXT NOT NULL, asset_id TEXT NOT NULL, hostname TEXT, ipv4 TEXT,
        PRIMARY KEY (org_id, asset_id)
      );
      CREATE TABLE IF NOT EXISTS sim_tenable_vulns (
        org_id TEXT NOT NULL, vuln_id TEXT NOT NULL, asset_id TEXT, cve TEXT,
        severity TEXT, state TEXT, past_sla BOOLEAN DEFAULT false, first_seen TIMESTAMPTZ,
        PRIMARY KEY (org_id, vuln_id)
      );
      CREATE TABLE IF NOT EXISTS sim_servicenow_incidents (
        org_id TEXT NOT NULL, number TEXT NOT NULL, priority INTEGER,
        occurred_at TIMESTAMPTZ, sys_created_on TIMESTAMPTZ, resolved_at TIMESTAMPTZ,
        short_description TEXT,
        PRIMARY KEY (org_id, number)
      );
      CREATE TABLE IF NOT EXISTS sim_cyberark_accounts (
        org_id TEXT NOT NULL, account_id TEXT NOT NULL, account_name TEXT,
        platform TEXT, privileged BOOLEAN DEFAULT true, vaulted BOOLEAN DEFAULT false,
        PRIMARY KEY (org_id, account_id)
      );
      CREATE TABLE IF NOT EXISTS sim_workday_workers (
        org_id TEXT NOT NULL, worker_id TEXT NOT NULL, department TEXT,
        training_completed BOOLEAN DEFAULT false, completed_date DATE,
        PRIMARY KEY (org_id, worker_id)
      );
      CREATE INDEX IF NOT EXISTS sim_okta_users_org ON sim_okta_users(org_id);
      CREATE INDEX IF NOT EXISTS sim_okta_factors_org_user ON sim_okta_factors(org_id, user_id);
      CREATE INDEX IF NOT EXISTS sim_cs_devices_org ON sim_crowdstrike_devices(org_id);
      CREATE INDEX IF NOT EXISTS sim_splunk_idx_org ON sim_splunk_indexes(org_id);
      CREATE INDEX IF NOT EXISTS sim_kb4_org ON sim_knowbe4_campaigns(org_id);
      CREATE INDEX IF NOT EXISTS sim_tenable_assets_org ON sim_tenable_assets(org_id);
      CREATE INDEX IF NOT EXISTS sim_tenable_vulns_org ON sim_tenable_vulns(org_id);
      CREATE INDEX IF NOT EXISTS sim_snow_org ON sim_servicenow_incidents(org_id);
      CREATE INDEX IF NOT EXISTS sim_cyberark_org ON sim_cyberark_accounts(org_id);
      CREATE INDEX IF NOT EXISTS sim_workday_org ON sim_workday_workers(org_id);

      -- ================= Four-lens posture engine (exec reporting) ==========
      -- Generalized framework catalog (Phase 7). Catalog tables are GLOBAL
      -- (no org_id): NIST CSF 2.0, SP 800-53 r5.2.0, CIS v8.1, ATT&CK.
      CREATE TABLE IF NOT EXISTS frameworks (
        id          TEXT PRIMARY KEY,          -- 'nist_csf_2', 'nist_800_53_r5', 'cis_v8_1', 'attack_enterprise'
        name        TEXT NOT NULL,
        version     TEXT,
        provenance  TEXT,                      -- 'NIST OSCAL', 'NIST CPRT', 'CIS', 'MITRE'
        ingested_at TIMESTAMPTZ DEFAULT NOW()
      );
      CREATE TABLE IF NOT EXISTS framework_requirements (
        framework_id  TEXT NOT NULL REFERENCES frameworks(id),
        requirement_id TEXT NOT NULL,          -- native ID: 'PR.AA-01', 'AC-2', 'AC-2(3)', '5.3'
        parent_id     TEXT,                    -- enhancement -> base control, safeguard -> control
        family        TEXT,                    -- 800-53 family / CSF function / CIS control #
        title         TEXT,
        text          TEXT,                    -- outcome/statement (paraphrase unless verbatim allowed)
        text_verbatim TEXT,                    -- gated by VERBATIM_CIS for CIS content
        assessment    JSONB,                   -- 800-53A objectives + examine/interview/test methods
        baselines     JSONB,                   -- {low,moderate,high} for 800-53; {ig1,ig2,ig3} for CIS
        withdrawn     BOOLEAN DEFAULT false,
        meta          JSONB,
        PRIMARY KEY (framework_id, requirement_id)
      );
      CREATE INDEX IF NOT EXISTS fw_req_family ON framework_requirements(framework_id, family);

      -- Requirement <-> automated check mappings (coverage + parameters + justification)
      CREATE TABLE IF NOT EXISTS requirement_mappings (
        framework_id  TEXT NOT NULL,
        requirement_id TEXT NOT NULL,
        check_id      TEXT NOT NULL,
        coverage      TEXT DEFAULT 'partial',  -- 'full' | 'partial'
        parameters    JSONB,                   -- extracted params (45-day dormancy, cadences)
        justification TEXT,
        provenance    TEXT,                    -- 'curated' | 'CIS' | 'derived'
        provisional   BOOLEAN DEFAULT false,
        PRIMARY KEY (framework_id, requirement_id, check_id)
      );
      -- Framework <-> framework crosswalks (CSF<->800-53, CIS<->CSF, relationship preserved)
      CREATE TABLE IF NOT EXISTS requirement_crosswalks (
        from_framework TEXT NOT NULL, from_id TEXT NOT NULL,
        to_framework   TEXT NOT NULL, to_id   TEXT NOT NULL,
        relationship   TEXT,                   -- equivalent | subset | superset | related
        provenance     TEXT NOT NULL,          -- 'NIST CPRT' | 'CIS' | 'CTID' | 'derived'
        provisional    BOOLEAN DEFAULT false,
        meta           JSONB,
        PRIMARY KEY (from_framework, from_id, to_framework, to_id)
      );
      CREATE INDEX IF NOT EXISTS xwalk_to ON requirement_crosswalks(to_framework, to_id);

      -- Parameterized automated checks (catalog; execution is org-scoped)
      CREATE TABLE IF NOT EXISTS checks (
        id          TEXT PRIMARY KEY,          -- 'okta.mfa_coverage'
        tool_id     TEXT NOT NULL,             -- securityToolCatalog id
        name        TEXT NOT NULL,
        method      TEXT, path TEXT,           -- the JSON API call
        signal      TEXT,                      -- metric_inputs key it evaluates, when applicable
        extract     TEXT,                      -- how the response becomes evidence
        kind        TEXT DEFAULT 'telemetry',  -- telemetry | config | inventory
        default_params JSONB                   -- e.g. {"threshold": 95, "dormancy_days": 45}
      );
      CREATE TABLE IF NOT EXISTS check_parameters (
        org_id   TEXT NOT NULL,
        check_id TEXT NOT NULL,
        params   JSONB NOT NULL,
        updated_at TIMESTAMPTZ DEFAULT NOW(),
        PRIMARY KEY (org_id, check_id)
      );

      -- Validation runs: every reported number traces to one of these.
      CREATE TABLE IF NOT EXISTS validation_runs (
        id          SERIAL PRIMARY KEY,
        org_id      TEXT NOT NULL,
        trigger     TEXT DEFAULT 'manual',     -- manual | sync | scheduled
        started_at  TIMESTAMPTZ DEFAULT NOW(),
        finished_at TIMESTAMPTZ,
        checks_total INTEGER DEFAULT 0, checks_passed INTEGER DEFAULT 0,
        checks_failed INTEGER DEFAULT 0, checks_skipped INTEGER DEFAULT 0,
        notes       TEXT
      );
      CREATE INDEX IF NOT EXISTS vruns_org ON validation_runs(org_id, started_at DESC);
      CREATE TABLE IF NOT EXISTS check_results (
        id          SERIAL PRIMARY KEY,
        run_id      INTEGER NOT NULL REFERENCES validation_runs(id),
        org_id      TEXT NOT NULL,
        check_id    TEXT NOT NULL,
        status      TEXT NOT NULL,             -- pass | fail | partial | skipped
        observed    NUMERIC,                   -- observed signal value
        expected    TEXT,                      -- threshold expression, e.g. '>=95'
        params      JSONB,                     -- effective parameters used
        source      TEXT,                      -- 'live' | 'simulated' | 'attested'
        evidence    JSONB,                     -- raw extract for click-through
        created_at  TIMESTAMPTZ DEFAULT NOW()
      );
      CREATE INDEX IF NOT EXISTS chkres_run ON check_results(run_id);
      CREATE INDEX IF NOT EXISTS chkres_org_check ON check_results(org_id, check_id, created_at DESC);

      -- Persisted evidence-agent reviews (traceable from reports)
      CREATE TABLE IF NOT EXISTS evidence_reviews (
        id          SERIAL PRIMARY KEY,
        org_id      TEXT NOT NULL,
        run_id      INTEGER,
        question_key TEXT,
        score       NUMERIC,
        finding     TEXT,
        recommendation TEXT,
        created_at  TIMESTAMPTZ DEFAULT NOW()
      );
      CREATE INDEX IF NOT EXISTS evrev_org ON evidence_reviews(org_id, created_at DESC);

      -- Score history at every rollup grain (framework / family / requirement)
      CREATE TABLE IF NOT EXISTS score_history (
        id          SERIAL PRIMARY KEY,
        org_id      TEXT NOT NULL,
        framework_id TEXT NOT NULL,
        scope       TEXT NOT NULL,             -- 'overall' | family/function id | requirement id
        score       NUMERIC NOT NULL,
        run_id      INTEGER,
        computed_at TIMESTAMPTZ DEFAULT NOW()
      );
      CREATE INDEX IF NOT EXISTS scorehist ON score_history(org_id, framework_id, scope, computed_at DESC);

      -- ATT&CK content (global) + per-org technique coverage (STEP C)
      CREATE TABLE IF NOT EXISTS attack_tactics (
        id TEXT PRIMARY KEY, name TEXT, shortname TEXT, ordinal INTEGER
      );
      CREATE TABLE IF NOT EXISTS attack_techniques (
        id          TEXT PRIMARY KEY,          -- 'T1110' / 'T1110.001'
        name        TEXT NOT NULL,
        tactics     TEXT[],                    -- kill-chain shortnames
        is_subtechnique BOOLEAN DEFAULT false,
        parent_id   TEXT,
        deprecated  BOOLEAN DEFAULT false,
        revoked     BOOLEAN DEFAULT false,
        attack_version TEXT,
        description TEXT
      );
      CREATE INDEX IF NOT EXISTS attack_tech_parent ON attack_techniques(parent_id);
      CREATE TABLE IF NOT EXISTS attack_mitigations (
        id TEXT PRIMARY KEY, name TEXT, description TEXT, deprecated BOOLEAN DEFAULT false
      );
      CREATE TABLE IF NOT EXISTS technique_coverage (
        org_id       TEXT NOT NULL,
        technique_id TEXT NOT NULL,
        status       TEXT NOT NULL,            -- prevent | detect | none
        confidence   TEXT DEFAULT 'low',       -- high | medium | low
        source_check TEXT,                     -- evidencing check id
        run_id       INTEGER,
        supporting   JSONB,                    -- CTID-derived supporting controls
        computed_at  TIMESTAMPTZ DEFAULT NOW(),
        PRIMARY KEY (org_id, technique_id)
      );

      -- ============= CISO Security Posture Dashboard (CISO persona only) =====
      -- Polymorphic store for the 14 dashboard entities (SecurityDomain,
      -- SecurityMetric, ControlArea, ControlRisk, Threshold, CISOQuestion,
      -- ExecutiveAnswer, SecurityAction, CriticalBusinessProcess, AttackPathway,
      -- CyberReadinessItem, SecurityInvestment, HiddenRisk, EvidenceSource).
      -- Mock seed today; a live integration replaces a row of the same shape.
      CREATE TABLE IF NOT EXISTS ciso_entities (
        org_id      TEXT NOT NULL,
        entity_type TEXT NOT NULL,
        entity_id   TEXT NOT NULL,
        ordinal     INTEGER,
        data        JSONB NOT NULL,
        updated_at  TIMESTAMPTZ DEFAULT NOW(),
        PRIMARY KEY (org_id, entity_type, entity_id)
      );
      CREATE INDEX IF NOT EXISTS ciso_entities_type ON ciso_entities(org_id, entity_type);
      -- Posture history for the period-over-period trend.
      CREATE TABLE IF NOT EXISTS ciso_dashboard_snapshots (
        id          SERIAL PRIMARY KEY,
        org_id      TEXT NOT NULL,
        period      TEXT,
        overall     NUMERIC,
        previous    NUMERIC,
        delta       NUMERIC,
        captured_at TIMESTAMPTZ DEFAULT NOW()
      );
      CREATE INDEX IF NOT EXISTS ciso_dash_snap ON ciso_dashboard_snapshots(org_id, captured_at DESC);
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
