---
id: PR-13
title: "docs(api): OpenAPI spec for /api/risk-engine [OPTIONAL]"
status: Backlog
priority: P3
labels: [docs, api, optional, month-1, priority-p3]
branch: feat/pr-13-openapi-spec
assignee: agent
estimated_hours: TBD
optional: true
created: 2026-05-29
plan_ref: docs/plans/month-1-risk-correlation-engine.md#6-pr-sequencing--eleven-prs-for-month-1
---

## Summary

OPTIONAL PR — first OpenAPI document in the repo. Spec for the four read endpoints (PR-07), the correlate endpoint (PR-08), and the two write endpoints (PR-09). Spec lives at `docs/api/openapi/risk-engine.yaml` and is referenced from `docs/api/risk-engine.md`. Sets precedent for future engine APIs (CIO/CLO endpoints in Month 3).

## Acceptance Criteria

Per plan §6 PR-13:

- [ ] `docs/api/openapi/risk-engine.yaml` (new) — OpenAPI 3.1 spec covering all `/api/risk-engine/*` endpoints introduced in PR-07/08/09.
- [ ] Spec validates against `spectral` or `openapi-cli` (added as a dev dep + CI check).
- [ ] Request/response schemas match the actual implementations (i.e. the spec was derived from the running code, not invented).
- [ ] `docs/api/risk-engine.md` links to the spec.

## Dependencies

- **Upstream PRs:** PR-07, PR-08, PR-09.
- **Blocking open questions:** none.

## Test Plan

- Schema validator runs in CI; spec lints clean.
- Manual: import the spec into Postman/Insomnia and confirm requests succeed against the local API.

## Documentation Updates

- `docs/api/openapi/risk-engine.yaml` (new).
- `docs/api/risk-engine.md` — link to spec, instructions on regenerating it.

## Branch & Commit Convention

- Branch: `feat/pr-13-openapi-spec` off `main`.
- Commit prefix: `docs(api):`.

## Risks & Stop Conditions

- No `PRODUCTION_PROMPT.md` stop conditions triggered.
- Risk: spec drifts from implementation. Mitigation: spec-validation CI step makes drift detectable.

## History

- 2026-05-29: Created
