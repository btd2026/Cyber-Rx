---
id: PR-05
title: "feat(risk-engine): seed BCBS assets, data objects, and join tables"
status: Backlog
priority: P1
labels: [feat, risk-engine, seed, month-1, priority-p1]
branch: feat/pr-05-seed-bcbs-assets-data-objects
assignee: agent
estimated_hours: TBD
created: 2026-05-29
plan_ref: docs/plans/month-1-risk-correlation-engine.md#33-companion-seed-sets
---

## Summary

Seed the BCBS demo's ~15 assets (NASCO, HealthEdge, Facets, Epic, QNXT, MMIS-Inovalon, Conduent, Okta, Splunk, CrowdStrike, Tenable, CyberArk, Snowflake, GuidingCare, Salesforce Service Cloud), the seven data objects (Member PHI 3M, Provider Tax IDs 250K, Claims History 45M, MA PHI 450K, FEP PHI 340K, Medicaid PHI 200K, Payment Card 1M), and wire them into the twelve crown-jewel processes via the join tables (`process_assets`, `process_data_objects`, `asset_data_objects`).

## Acceptance Criteria

Per plan §3.3 and §6 PR-5:

- [ ] Migration `012_seed_bcbs_assets.up.sql` writes the ~15 asset rows with `is_demo = TRUE`, accurate `vendor`, `type`, and `supported` fields.
- [ ] Migration `013_seed_bcbs_data_objects.up.sql` writes the seven data objects with accurate `classification`, `sensitivity`, and `record_count`.
- [ ] Migration `014_seed_bcbs_joins.up.sql` populates `process_assets` (every crown-jewel process gets at least one primary asset), `process_data_objects` (every process linked to the data it touches), and `asset_data_objects` (NASCO ↔ Member PHI, etc.).
- [ ] Every crown-jewel process has ≥1 asset linkage and ≥1 data-object linkage.
- [ ] `NASCO Claims Platform` is reachable from `bp_bcbs_claims_adjudication` via `process_assets`, and `Member PHI` is reachable from `NASCO Claims Platform` via `asset_data_objects`.
- [ ] All seeds gated on `SEED_BCBS_DEMO=1`, idempotent, and reversible (`down` deletes by `is_demo = TRUE AND id IN (...)`).
- [ ] Integration test walks `bp_bcbs_claims_adjudication → process_assets → asset → asset_data_objects → data_object` and confirms `Member PHI` is reachable.
- [ ] `docs/data-model.md` updated with the assets / data objects / join tables sections.

## Dependencies

- **Upstream PRs:** PR-01, PR-02, PR-03, PR-04.
- **Blocking open questions:** none specific to this PR (Q1 already resolved by PR-04 prerequisite).

## Test Plan

- **Integration:** the walk test described above plus row-count assertions per table.
- **Unit:** none.

## Documentation Updates

- `docs/data-model.md` — assets section, data objects section, joins section.

## Branch & Commit Convention

- Branch: `feat/pr-05-seed-bcbs-assets-data-objects` off `main`.
- Commit prefix: `feat(risk-engine):`.

## Risks & Stop Conditions

- **Stop condition gate (plan §10):** "Migrating data that affects the BCBS demo tenant" — already cleared at PR-03/PR-04 if running on the same demo deployment; re-confirm if the gate was per-PR.
- Risk: vendor names like "NASCO" and "HealthEdge" appear in customer-facing demo screens. Ensure the demo badge (`is_demo = TRUE` → UI badge in PR-10) is visible so prospects don't think we have real connections to those platforms.

## History

- 2026-05-29: Created
