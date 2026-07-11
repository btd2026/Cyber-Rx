-- Assisted, human-confirmed revenue criticality (Phase B).
-- Additive only. Mirrors the ALTERs added in src/utils/db.js init().
-- See docs/CROWNJEWEL_PIPELINE_REVENUE_GATE.md (§2).
--
-- Revenue-criticality is a SUGGESTION (revenue_criticality_score) until a human
-- confirms it (criticality_confirmed). Crown jewels derive only from confirmed
-- revenue processes; jewels from unconfirmed processes are marked provisional.

ALTER TABLE business_processes ADD COLUMN IF NOT EXISTS revenue_criticality_score  NUMERIC;      -- advisory 0..1 (suggestion only)
ALTER TABLE business_processes ADD COLUMN IF NOT EXISTS revenue_criticality_basis  JSONB;        -- per-signal contributions (explainable)
ALTER TABLE business_processes ADD COLUMN IF NOT EXISTS brings_money               BOOLEAN;       -- user's confirm/deny flag
ALTER TABLE business_processes ADD COLUMN IF NOT EXISTS criticality_confirmed      BOOLEAN DEFAULT FALSE;
ALTER TABLE business_processes ADD COLUMN IF NOT EXISTS confirmed_financial_impact NUMERIC;      -- annual $, optional, user-entered
ALTER TABLE business_processes ADD COLUMN IF NOT EXISTS criticality_override       JSONB;        -- captured overrides for future tuning
ALTER TABLE business_processes ADD COLUMN IF NOT EXISTS confirmed_by               TEXT;
ALTER TABLE business_processes ADD COLUMN IF NOT EXISTS confirmed_at               TIMESTAMPTZ;

-- Rank candidates fast, and find the still-unconfirmed ones for the review step.
CREATE INDEX IF NOT EXISTS business_processes_rev_crit
  ON business_processes(organization_id, revenue_criticality_score DESC);
CREATE INDEX IF NOT EXISTS business_processes_crit_confirmed
  ON business_processes(organization_id, criticality_confirmed);
