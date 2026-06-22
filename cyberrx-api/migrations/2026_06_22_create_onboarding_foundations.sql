-- Onboarding Redesign — Step 1: Foundations
-- Additive only. Mirrors the tables created in src/utils/db.js init().
-- See docs/plans/onboarding-redesign-blueprint.md (§3.1, §3.5 step M1).

-- One resumable onboarding journey per org.
CREATE TABLE IF NOT EXISTS onboarding_session (
  id              TEXT PRIMARY KEY,
  organization_id TEXT NOT NULL REFERENCES orgs(id) ON DELETE CASCADE,
  phase           TEXT NOT NULL DEFAULT 'business_context',
  status          TEXT NOT NULL DEFAULT 'in_progress',
  completeness    NUMERIC DEFAULT 0,
  phase_state     JSONB DEFAULT '{}',
  started_at      TIMESTAMPTZ DEFAULT NOW(),
  went_live_at    TIMESTAMPTZ,
  updated_at      TIMESTAMPTZ DEFAULT NOW()
);
CREATE UNIQUE INDEX IF NOT EXISTS onboarding_session_org ON onboarding_session(organization_id);

-- Completeness score broken down by the six coverage dimensions.
CREATE TABLE IF NOT EXISTS onboarding_completeness (
  id               TEXT PRIMARY KEY,
  organization_id  TEXT NOT NULL REFERENCES orgs(id) ON DELETE CASCADE,
  overall          NUMERIC NOT NULL,
  dimensions       JSONB NOT NULL,
  answer_readiness JSONB,
  computed_at      TIMESTAMPTZ DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS onboarding_completeness_org ON onboarding_completeness(organization_id, computed_at DESC);
