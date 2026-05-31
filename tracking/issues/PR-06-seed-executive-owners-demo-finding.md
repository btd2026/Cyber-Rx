---
id: PR-06
title: "feat(risk-engine): seed executive owners + one demo finding"
status: Backlog
priority: P1
labels: [feat, risk-engine, seed, month-1, priority-p1]
branch: feat/pr-06-seed-executive-owners-demo-finding
assignee: agent
estimated_hours: TBD
created: 2026-05-29
plan_ref: docs/plans/month-1-risk-correlation-engine.md#33-companion-seed-sets
---

## Summary

Seed the six executive-owner rows for the BCBS demo (one per role: CIO, CISO, CFO, CRO, CLO, Audit), then seed the hero finding `f_001_demo_nasco_cve` — "Critical CVE-2024-1234 on NASCO server" — and wire it to its primary asset (`asset_nasco_claims`), primary process (`bp_bcbs_claims_adjudication`), and primary threat scenario (`ts_ransomware_lockbit`). This is the finding the correlation engine will narrate end-to-end in PR-08 and PR-10.

## Acceptance Criteria

Per plan §3.3, §3.4, and §6 PR-6:

- [ ] Migration `015_seed_bcbs_executive_owners.up.sql` writes six `executive_owners` rows (one per role) with display names `"Demo CIO"`, `"Demo CISO"`, etc., emails like `cio-demo@bcbs.example`, `is_demo = TRUE`, and `user_id = NULL` (no JWT yet).
- [ ] Migration `016_seed_bcbs_demo_finding.up.sql` writes `f_001_demo_nasco_cve` to the `findings` table with `severity = 'critical'`, `source = 'tenable'`, `source_ref = 'CVE-2024-1234'`, `status = 'open'`, and the three `primary_*_id` pointers populated.
- [ ] `finding_processes` row links the finding to `bp_bcbs_claims_adjudication`.
- [ ] Both migrations gated on `SEED_BCBS_DEMO=1`, idempotent, and reversible.
- [ ] Integration test: querying the finding joined to its primary process resolves to an `executive_owners` row with `role = 'CIO'` (matches `business_processes.exec_owner_role`).

## Dependencies

- **Upstream PRs:** PR-01, PR-02, PR-03, PR-04, PR-05.
- **Blocking open questions:**
  - Q3 (plan §11) — `findings` table decision must be resolved (plan recommends adding it; this PR depends on that yes).
  - Q6 (plan §11) — Confirm `X-Org-Id`-only auth posture is acceptable for endpoints that will read these rows.

## Test Plan

- **Integration:** the finding joins correctly to its process and to the right executive owner role; the threat scenario foreign key resolves; the asset foreign key resolves.
- **Unit:** none.

## Documentation Updates

- `docs/data-model.md` — executive_owners section, findings section.

## Branch & Commit Convention

- Branch: `feat/pr-06-seed-executive-owners-demo-finding` off `main`.
- Commit prefix: `feat(risk-engine):`.

## Risks & Stop Conditions

- **Stop condition gate (plan §10):** "Migrating data that affects the BCBS demo tenant."
- Risk: the hero finding uses a *fictional* CVE ID (`CVE-2024-1234`). MITRE assigns real CVE IDs; using a placeholder is fine for a demo, but PR-10 must badge the row as demo-only so it doesn't look like a real intel claim. If we want a real CVE, pick a publicly disclosed NASCO/healthcare-payer-relevant CVE and document the choice.

## History

- 2026-05-29: Created
