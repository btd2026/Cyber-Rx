---
id: PR-03
title: "feat(risk-engine): seed reference data — scenarios, obligations, frameworks"
status: Backlog
priority: P1
labels: [feat, risk-engine, seed, month-1, priority-p1]
branch: feat/pr-03-seed-reference-data
assignee: agent
estimated_hours: TBD
created: 2026-05-29
plan_ref: docs/plans/month-1-risk-correlation-engine.md#3-seeding-strategy--reconciling-the-10-vs-12-question
---

## Summary

Seed the org-agnostic reference rows the BCBS demo narrative cites: six demo threat scenarios (ransomware × 2, phishing, insider, supply-chain, misconfig), eight legal obligations (HIPAA Breach Notification, HIPAA Security Rule §164.308(a)(5), HIPAA §164.404, CMS 42 CFR §422.306(c)(1), OPM FEP Data Security, NAIC Model Law, CA AB 1950, NY DFS 23 NYCRR 500), and the three framework citations the engine needs for the hero example. Keyed by `org_id = 'bcbs-demo'` for now; we'll generalize when the second tenant lands. Gated on `SEED_BCBS_DEMO=1`.

## Acceptance Criteria

Per plan §3.3 and §6 PR-3:

- [ ] Migration `010_seed_reference.up.sql` writes the six threat scenarios with `is_demo = TRUE`, with realistic `probability` (0.23 for major-PHI-breach, 0.08 for catastrophic — matching the CFO dashboard's hard-coded assumptions) and `impact_level`, plus MITRE techniques where applicable (ransomware → `['T1486','T1490']`).
- [ ] Migration `010` writes the eight legal obligations with citations, notification timelines (`notification_hours`), and `source` per plan §3.3.
- [ ] Reference frameworks aren't a table this month — they live in the engine's hardcoded lookup (PR-08); but PR-03 documents the citations used.
- [ ] Migration is gated by env flag `SEED_BCBS_DEMO=1` — runner skips it when unset.
- [ ] Idempotent: `INSERT ... ON CONFLICT (id) DO UPDATE SET ...`. Re-running against an already-seeded tenant changes nothing.
- [ ] `down` migration deletes only `WHERE is_demo = TRUE AND id IN (...)`.
- [ ] Integration test confirms row counts after `up`, and after two consecutive `up` runs (idempotency).

## Dependencies

- **Upstream PRs:** PR-01 (runner), PR-02 (tables).
- **Blocking open questions:**
  - Q4 (plan §11) — Confirm hand-authored obligations (no scraping) is acceptable for the demo.
  - Q11 (plan §11) — Confirm seed deployment target (separate Render service vs `SEED_BCBS_DEMO` flag on the main service).
- **Stop condition:** "Migrating data that affects the BCBS demo tenant" (plan §10). This PR is the first that writes seed rows; gate before running against the demo deployment.

## Test Plan

- **Integration:** apply `010` against an ephemeral PG seeded with PR-02 schema; assert 6 scenarios and 8 obligations exist with the expected IDs and `is_demo = TRUE`. Apply `010` a second time; assert no changes.
- **Unit:** none.

## Documentation Updates

- `docs/data-model.md` — reference data section listing every seeded threat scenario and legal obligation with citation + rationale.

## Branch & Commit Convention

- Branch: `feat/pr-03-seed-reference-data` off `main`.
- Commit prefix: `feat(risk-engine):`.

## Risks & Stop Conditions

- **Stop condition gate (plan §10):** confirm with user before running `up` against the BCBS demo deployment.
- Risk: hand-authored citations could be incorrect or out of date. Mitigation: each obligation row carries a `citation` field and a comment in the migration linking to the public source. Audit-ready.

## History

- 2026-05-29: Created
