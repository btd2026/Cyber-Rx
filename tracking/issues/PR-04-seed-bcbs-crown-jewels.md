---
id: PR-04
title: "feat(risk-engine): seed BCBS twelve crown-jewel processes"
status: Backlog
priority: P1
labels: [feat, risk-engine, seed, month-1, priority-p1]
branch: feat/pr-04-seed-bcbs-crown-jewels
assignee: agent
estimated_hours: TBD
created: 2026-05-29
plan_ref: docs/plans/month-1-risk-correlation-engine.md#32-the-twelve-canonical-processes-bcbs-demo-seed-values
---

## Summary

Seed the canonical twelve crown-jewel business processes for the BCBS demo tenant (seven Primary, five Strategic) matching the assessment's §5 enumeration. Reconciles the "10 vs 12" discrepancy in the source assessment (assessment §1 says "10", §5 enumerates 12, code's BCBS template has 12–14 depending on Government Programs sub-row treatment). Plan §3.1 picks **twelve**; this PR ships those twelve and amends `COVERAGE_ASSESSMENT.md` in the same commit.

## Acceptance Criteria

Per plan §3.1, §3.2, and §6 PR-4:

- [ ] Migration `011_seed_bcbs_processes.up.sql` inserts the twelve rows per plan §3.2 table (slugs `bp_bcbs_claims_adjudication` through `bp_bcbs_data_analytics`), each with `org_id = 'bcbs-demo'`, `is_demo = TRUE`, correct `tier`, `criticality`, `exec_owner_role`, and `business_line`.
- [ ] "Government Programs" (Tier 2) row stores the MA/FEP/Medicaid breakdown in `attributes.sub_programs` JSON array; the engine treats it as a single process for correlation.
- [ ] Gated on `SEED_BCBS_DEMO=1` and no-op when `org_id = 'bcbs-demo'` is not present (plan §2.10).
- [ ] Idempotent on re-apply.
- [ ] `down` deletes only `WHERE is_demo = TRUE AND id IN (twelve known IDs)`.
- [ ] **Same PR amends `COVERAGE_ASSESSMENT.md`:** §1 "10" → "12" with a footnote explaining the reconciliation.
- [ ] `docs/data-model.md` updated with the canonical twelve table.
- [ ] Integration test: 12 rows present, IDs match expected list.

## Dependencies

- **Upstream PRs:** PR-01, PR-02, PR-03.
- **Blocking open questions:**
  - Q1 (plan §11) — Confirm canonical-twelve recommendation before this PR ships.
- **Stop condition:** "Migrating data that affects the BCBS demo tenant" (plan §10).

## Test Plan

- **Integration:** assert 12 rows after `up`; assert each ID is present and unique; assert `down` removes exactly those 12 rows when `is_demo = TRUE` and leaves any non-demo rows untouched.
- **Unit:** none.

## Documentation Updates

- `COVERAGE_ASSESSMENT.md` — §1 reconciliation footnote (the "10" → "12" amendment).
- `docs/data-model.md` — crown-jewel seed table reproduced from plan §3.2.

## Branch & Commit Convention

- Branch: `feat/pr-04-seed-bcbs-crown-jewels` off `main`.
- Commit prefix: `feat(risk-engine):` for the seed, `docs(assessment):` for the COVERAGE_ASSESSMENT amendment (squash if needed).

## Risks & Stop Conditions

- **Stop condition gate (plan §10):** confirm with user before running against the BCBS demo deployment.
- Risk: changing the BCBS template in `App.jsx` (L185–L202) to align IDs is **out of scope** for this PR — the frontend still reads its own template. PR-10 wires the new processes through the engine, not via the App.jsx template. Avoid edits to App.jsx in this PR.

## History

- 2026-05-29: Created
