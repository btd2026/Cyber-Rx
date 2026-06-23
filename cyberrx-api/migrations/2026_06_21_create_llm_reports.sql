-- Migration: llm_reports — LLM-composed multi-section board report (ReportBuilderService)
-- Created: LLM report builder
-- Description: Stores the full narrative board report as ordered sections. Same
--   human-in-the-loop model as exec_summaries: generated as a draft, stored for
--   consultant review, rendered from the reviewed (or deterministic) copy. The
--   renderer never auto-calls the LLM.

CREATE TABLE IF NOT EXISTS llm_reports (
  id            TEXT PRIMARY KEY,
  org_id        TEXT NOT NULL UNIQUE,
  report        JSONB NOT NULL,            -- { sections:[{id,heading,body,bullets}], model, generatedBy }
  status        TEXT DEFAULT 'draft',      -- draft | reviewed
  model         TEXT,
  generated_by  TEXT,                       -- llm | deterministic | edited
  generated_at  TIMESTAMPTZ DEFAULT NOW(),
  updated_at    TIMESTAMPTZ DEFAULT NOW(),
  edited_by     TEXT
);

COMMENT ON TABLE llm_reports IS 'LLM-composed, human-reviewed multi-section executive board report';
