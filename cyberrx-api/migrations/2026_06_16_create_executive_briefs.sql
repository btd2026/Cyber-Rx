-- Executive Agent Briefs
-- Stores the latest continuously-generated, role-specific executive intelligence
-- produced by the Nerion AI agent layer. One row per (organization, role).
--
-- Vision: "AI agents that continuously read your security stack and deliver each
-- executive the live, role-specific intelligence they need to act."

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
