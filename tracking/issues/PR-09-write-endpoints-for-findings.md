---
id: PR-09
title: "feat(risk-engine): POST /findings + POST /findings/:id/correlate"
status: Backlog
priority: P2
labels: [feat, risk-engine, api, month-1, priority-p2]
branch: feat/pr-09-write-endpoints
assignee: agent
estimated_hours: TBD
created: 2026-05-29
plan_ref: docs/plans/month-1-risk-correlation-engine.md#41-endpoints
---

## Summary

Add write endpoints to the engine: `POST /api/risk-engine/findings` creates a finding row; `POST /api/risk-engine/findings/:id/correlate` re-runs the correlation algorithm and writes the resolved `primary_*_id` pointers back into the finding row. Lets demo flows manually inject a finding and immediately see it narrated end-to-end.

## Acceptance Criteria

Per plan §4.1 and §6 PR-9:

- [ ] `POST /api/risk-engine/findings` accepts a JSON body with required fields `title`, `severity`, `source`. Optional: `description`, `source_ref`, `primary_asset_id`, `primary_process_id`, `primary_scenario_id`, `attributes`.
- [ ] Hand-rolled validator (no new dep) — `validateFindingBody(body)` returns `{ok, errors}`.
- [ ] Validation errors → 400 with structured error array.
- [ ] Nonexistent referenced asset/process/scenario IDs → 404.
- [ ] Successful create → 201 with the created row.
- [ ] `POST /findings/:id/correlate` re-resolves primary pointers and writes them back; returns the updated finding.
- [ ] supertest: happy path, missing required field, bad reference, wrong org.
- [ ] `docs/api/risk-engine.md` updated with write endpoints.
- [ ] **Demo flow validated:** create a finding via POST, immediately GET its narrative via PR-08's endpoint, narrative renders correctly.

## Dependencies

- **Upstream PRs:** PR-01 through PR-08.
- **Blocking open questions:** Q6 (auth posture).

## Test Plan

- **Unit:** `validateFindingBody` table-driven (each required field, each optional field, each bad type).
- **Integration (supertest):**
  - happy path → 201, row exists.
  - missing `title` → 400.
  - nonexistent `primary_asset_id` → 404.
  - wrong `X-Org-Id` for `:id/correlate` → 404.
  - end-to-end: POST creates, POST `/correlate` updates pointers, GET `/correlate/:id` returns narrative referencing the new finding.

## Documentation Updates

- `docs/api/risk-engine.md` — write endpoints with request/response examples.

## Branch & Commit Convention

- Branch: `feat/pr-09-write-endpoints` off `main`.
- Commit prefix: `feat(risk-engine):`.

## Risks & Stop Conditions

- **Quality bar:** JWT not enforced. Anyone with `X-Org-Id: bcbs-demo` can write findings into the demo tenant. Acceptable per current Month-1 posture; flag for Month 4 hardening.
- Risk: POST endpoint becomes an attack surface once the backend is reachable. Mitigation: minimal input validation in PR-9, full rate-limiting + auth in Month 4.

## History

- 2026-05-29: Created
