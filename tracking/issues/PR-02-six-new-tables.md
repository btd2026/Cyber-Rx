---
id: PR-02
title: "feat(risk-engine): add six new tables + join tables"
status: Backlog
priority: P1
labels: [feat, risk-engine, schema, month-1, priority-p1]
branch: feat/pr-02-six-new-tables
assignee: agent
estimated_hours: TBD
created: 2026-05-29
plan_ref: docs/plans/month-1-risk-correlation-engine.md#2-six-new-entities--schemas-and-migrations
---

## Summary

Land the six new entities the Risk Correlation Engine needs — `business_processes`, `assets`, `data_objects`, `threat_scenarios`, `legal_obligations`, `executive_owners` — plus the join tables (`process_assets`, `process_data_objects`, `asset_data_objects`, `process_legal_obligations`, `process_threat_scenarios`) and the `findings` extension table with `finding_processes`. Schema only; no seed data, no API code.

## Acceptance Criteria

Per plan §2.1–§2.8 and §6 PR-2:

- [ ] Migration `002_business_processes.up.sql` / `.down.sql` per plan §2.1 (with FK to `orgs`, tier CHECK, indexes).
- [ ] Migration `003_assets.up.sql` / `.down.sql` per plan §2.2.
- [ ] Migration `004_data_objects.up.sql` / `.down.sql` per plan §2.3.
- [ ] Migration `005_threat_scenarios.up.sql` / `.down.sql` per plan §2.4 (`mitre_techniques TEXT[]`).
- [ ] Migration `006_legal_obligations.up.sql` / `.down.sql` per plan §2.5.
- [ ] Migration `007_executive_owners.up.sql` / `.down.sql` per plan §2.6 (role CHECK constraint).
- [ ] Migration `008_process_links.up.sql` / `.down.sql` per plan §2.7 (all five join tables).
- [ ] Migration `009_extend_risks_findings.up.sql` / `.down.sql` per plan §2.8 (creates `findings`, `finding_processes`).
- [ ] All tables carry `org_id TEXT NOT NULL REFERENCES orgs(id) ON DELETE CASCADE`, `created_at`, `updated_at`, and `is_demo BOOLEAN NOT NULL DEFAULT FALSE`.
- [ ] All migration IDs use the slug-style `TEXT PRIMARY KEY` convention (not UUID) per plan §2.0.
- [ ] `docs/data-model.md` created with entity diagram and FK summary.
- [ ] Integration test: run all migrations `up` then `down` on an ephemeral DB; resulting schema matches expectations.

## Dependencies

- **Upstream PRs:** PR-01 (the migration runner has to exist before any migration can apply).
- **Blocking open questions:**
  - Q3 (plan §11) — Add the `findings` table now (plan recommends yes). Decision required before `009` writes.

## Test Plan

- **Integration:** ephemeral PG round-trip — run `002`–`009` up, snapshot the schema, run them all down, confirm only the `schema_migrations` + the five legacy tables remain.
- **Unit:** none — this PR is pure DDL.

## Documentation Updates

- `docs/data-model.md` (new) — full ERD-style description of the six new entities + the join tables + the extended `findings` table. Includes the JSONB column documentation (`attributes`, `applicability`, `penalties`, `mitre_techniques`).

## Branch & Commit Convention

- Branch: `feat/pr-02-six-new-tables` off `main`.
- Commit prefix: `feat(risk-engine):`.

## Risks & Stop Conditions

- No `PRODUCTION_PROMPT.md` stop condition applies (no copy changes, no compliance claims, no new dashboard, no demo data).
- Risk: a future tenant might want UUID PKs. The plan deliberately picks slug-style for readability in the BCBS seed; if a customer later requires UUIDs we'll add a parallel column rather than rename.

## History

- 2026-05-29: Created
