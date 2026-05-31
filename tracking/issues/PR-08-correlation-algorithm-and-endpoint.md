---
id: PR-08
title: "feat(risk-engine): correlation algorithm + GET /correlate/:id"
status: Backlog
priority: P0
labels: [feat, risk-engine, api, core, month-1, priority-p0]
branch: feat/pr-08-correlation-algorithm
assignee: agent
estimated_hours: TBD
created: 2026-05-29
plan_ref: docs/plans/month-1-risk-correlation-engine.md#43-algorithm-pseudocode
---

## Summary

The core PR. Implement the correlation algorithm as a pure function in `cyberrx-api/src/engine/correlate.js`, then expose it through `GET /api/risk-engine/correlate/:findingId`. The function walks Finding → Asset → BusinessProcess → DataObject → ThreatScenario → FinancialExposure → Frameworks → LegalObligations → ExecutiveOwners and assembles the executive-narrative JSON shape from plan §4.2. Includes the `financialModelV1` closed-form calibration that produces ~$217M for the BCBS hero example, and the `frameworkCitations` lookup table.

## Acceptance Criteria

Per plan §4.2, §4.3, and §6 PR-8:

- [ ] `cyberrx-api/src/engine/correlate.js` exports `correlate(findingId, orgId, dbClient)` — a pure function returning the narrative shape.
- [ ] Algorithm implements all nine hops per plan §4.3 pseudocode (asset → process → data → threat → exposure → framework → legal → owner → audit-evidence).
- [ ] `financialModelV1` is a separate pure function: `base_loss_per_record[scenario.category][data_class] * total_records * criticality_multiplier`. Calibrated so the BCBS hero gives ~$217M.
- [ ] `frameworkCitations(scenario, dataObjects, processes)` is a separate pure function over a hardcoded lookup table. Ransomware × PHI → `[NIST PR.PS-1, HIPAA §164.308(a)(5), CIS Control 7]`.
- [ ] `resolveOwners(processes, executiveOwners)` returns the four-role ownership object: remediation, riskOversight (CISO + CRO), legalReview, auditEvidence.
- [ ] Audit-evidence rule: `ransomware → 'penetration_test'`; else `'control_attestation'`.
- [ ] `GET /api/risk-engine/correlate/:findingId` returns the §4.2 JSON shape exactly, modulo `generatedAt`.
- [ ] Top-level `demo` field mirrors `finding.is_demo`.
- [ ] supertest snapshot test against `f_001_demo_nasco_cve` matches a checked-in fixture byte-for-byte (modulo `generatedAt`).
- [ ] `docs/api/risk-engine.md` updated with the correlate endpoint and a worked example.
- [ ] `docs/architecture/correlation-engine.md` (new) — describes the nine-hop walk and the demo-tier calibration of `financialModelV1`.

## Dependencies

- **Upstream PRs:** PR-01 through PR-07.
- **Blocking open questions:**
  - Q2 (plan §11) — Confirm MITRE-ID-in-array + plain-English category dual-taxonomy is acceptable.
  - Q5 (plan §11) — Confirm the $217M demo calibration target.

## Test Plan

- **Unit (vitest/jest table-driven):**
  - `financialModelV1` for each (scenario_category × data_classification) combination in the lookup table.
  - `frameworkCitations` for each combination.
  - `resolveOwners` over multiple process inputs.
- **Integration (supertest):**
  - `GET /correlate/f_001_demo_nasco_cve` matches the checked-in §4.2 fixture (snapshot).
  - `GET /correlate/nonexistent` → 404.
  - `GET /correlate/<id>` for a wrong-org finding → 404.

## Documentation Updates

- `docs/api/risk-engine.md` — correlate endpoint + algorithm walk-through.
- `docs/architecture/correlation-engine.md` (new) — full algorithm explanation, the financial model placeholder caveat, the framework lookup table location, and Month 5+ replacement plan.

## Branch & Commit Convention

- Branch: `feat/pr-08-correlation-algorithm` off `main`.
- Commit prefix: `feat(risk-engine):`.

## Risks & Stop Conditions

- **Quality bar:** JWT not enforced (deferred to Month 4). Document the deferral in PR description.
- Risk: `financialModelV1` is a demo placeholder. If anyone treats its number as a real loss estimate, that's a misuse. Mitigation: the response includes `financialExposureBasis: "ransomware_default_model_v1"` and `docs/architecture/correlation-engine.md` documents the placeholder status.
- Risk: snapshot test brittleness. Mitigation: snapshot excludes `generatedAt`; rotation of seed data invalidates the fixture (intentionally).

## History

- 2026-05-29: Created
