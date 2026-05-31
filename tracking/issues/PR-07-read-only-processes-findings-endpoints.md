---
id: PR-07
title: "feat(risk-engine): GET /processes + /findings (read-only)"
status: Backlog
priority: P1
labels: [feat, risk-engine, api, month-1, priority-p1]
branch: feat/pr-07-read-only-endpoints
assignee: agent
estimated_hours: TBD
created: 2026-05-29
plan_ref: docs/plans/month-1-risk-correlation-engine.md#41-endpoints
---

## Summary

Stand up the read-only endpoints of the Risk Correlation Engine: `GET /api/risk-engine/processes`, `GET /api/risk-engine/processes/:id`, `GET /api/risk-engine/findings`, and `GET /api/risk-engine/findings/:id`. Pure reads against the seed data from PR-04 through PR-06. No correlation logic yet — that's PR-08.

## Acceptance Criteria

Per plan §4.1 and §6 PR-7:

- [ ] New router `cyberrx-api/src/routes/risk-engine.js` mounted at `/api/risk-engine` from `index.js`.
- [ ] `GET /api/risk-engine/processes` returns array of business processes for the org from `X-Org-Id` header.
- [ ] `GET /api/risk-engine/processes/:id` returns one process with its join-table neighbors (assets, data objects, legal obligations, threat scenarios). 404 if not found or wrong org.
- [ ] `GET /api/risk-engine/findings` returns array of findings; supports `?status=open` and `?severity=critical` query params.
- [ ] `GET /api/risk-engine/findings/:id` returns one finding row. 404 if not found or wrong org.
- [ ] Missing `X-Org-Id` header → 404 (matches existing route posture per plan §1.1).
- [ ] All responses are pure JSON; no HTML, no plain text.
- [ ] supertest coverage: each endpoint — missing org → 404; happy path; unknown ID → 404.
- [ ] `docs/api/risk-engine.md` created with endpoint reference for the read endpoints.
- [ ] **Smoke test:** `curl -H 'X-Org-Id: bcbs-demo' .../api/risk-engine/processes` returns 12 rows.

## Dependencies

- **Upstream PRs:** PR-01 through PR-06 (need migrations + seed data to read from).
- **Blocking open questions:**
  - Q6 (plan §11) — Confirm `X-Org-Id`-only auth posture for new endpoints.

## Test Plan

- **Integration (supertest):**
  - `GET /processes` without `X-Org-Id` → 404.
  - `GET /processes` with `X-Org-Id: bcbs-demo` → 200 with 12 rows.
  - `GET /processes/bp_bcbs_claims_adjudication` → 200 with neighbors populated.
  - `GET /processes/nonexistent` → 404.
  - `GET /findings?status=open&severity=critical` → 200 with the hero finding.
- **Unit:** none — endpoints are thin wrappers.

## Documentation Updates

- `docs/api/risk-engine.md` (new) — read endpoints with request/response examples.

## Branch & Commit Convention

- Branch: `feat/pr-07-read-only-endpoints` off `main`.
- Commit prefix: `feat(risk-engine):`.

## Risks & Stop Conditions

- No `PRODUCTION_PROMPT.md` stop condition triggers here (no copy, no compliance claim, no dashboard route, no demo-data migration — that already happened in PR-03 onward).
- **Quality bar from `PRODUCTION_PROMPT.md`:** "Any new endpoint that doesn't enforce JWT, doesn't validate `X-Org-Id` against the JWT identity, or widens CORS is blocked." JWT enforcement is deferred to Month 4 per the prompt's sequence — these endpoints match the existing routes' posture exactly. Document this explicitly in the PR description so reviewers see the conscious deferral.

## History

- 2026-05-29: Created
