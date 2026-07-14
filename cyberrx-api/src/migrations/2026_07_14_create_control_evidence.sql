-- Append-only evidence store for continuous control assessment.
-- Every row is an immutable observation: source, method, when it was collected, the raw
-- payload, and a content hash. Rows are only ever INSERTed and SELECTed — never UPDATEd or
-- DELETEd — so the audit trail is defensible and scores can be recomputed as-of any date by
-- replaying the evidence under the rule version in effect.

CREATE TABLE IF NOT EXISTS control_evidence (
  id            BIGSERIAL PRIMARY KEY,
  org_id        TEXT NOT NULL,
  control_id    TEXT NOT NULL,                       -- e.g. 'PR.AA-03'
  source        TEXT NOT NULL,                       -- connector / tool that produced it
  method        TEXT NOT NULL CHECK (method IN ('live','hybrid','attestation')),
  collected_at  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  payload       JSONB NOT NULL DEFAULT '{}',         -- { value, observed, known, ... }
  hash          TEXT NOT NULL,                       -- sha256 of payload
  created_at    TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- The read path is "latest evidence for a control as-of a date" — index for it.
CREATE INDEX IF NOT EXISTS idx_control_evidence_lookup
  ON control_evidence (org_id, control_id, collected_at DESC);

-- Enforce append-only at the database level: block UPDATE and DELETE on the evidence table.
CREATE OR REPLACE FUNCTION control_evidence_append_only() RETURNS trigger AS $$
BEGIN
  RAISE EXCEPTION 'control_evidence is append-only: % is not permitted', TG_OP;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_control_evidence_no_mutate ON control_evidence;
CREATE TRIGGER trg_control_evidence_no_mutate
  BEFORE UPDATE OR DELETE ON control_evidence
  FOR EACH ROW EXECUTE FUNCTION control_evidence_append_only();
