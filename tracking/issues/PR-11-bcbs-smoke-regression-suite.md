---
id: PR-11
title: "chore(demo): BCBS smoke regression suite + docs"
status: Backlog
priority: P1
labels: [chore, demo, testing, month-1, priority-p1]
branch: feat/pr-11-bcbs-smoke-suite
assignee: agent
estimated_hours: TBD
created: 2026-05-29
plan_ref: docs/plans/month-1-risk-correlation-engine.md#74-bcbs-demo-regression--what-counts-as-still-green
---

## Summary

Build the regression gate that protects the BCBS demo through Month 2's churn. `frontend/tests/smoke/bcbs-demo.spec.js` simulates the full demo flow (landing → login → MFA → welcome → setup via `loadBCBSDemoPreset` → walk every existing dashboard → walk the new risk-narrative page). Extend to capture a textual golden-file diff of the rendered narrative HTML so any change in $ amounts, framework citations, or owner strings fails loudly. Add operator-facing docs and the engine runbook.

## Acceptance Criteria

Per plan §7.3, §7.4, and §6 PR-11:

- [ ] `frontend/tests/smoke/bcbs-demo.spec.js` exists and runs under `npm run test:smoke` (new script).
- [ ] Suite walks: landing → login → MFA → welcome → setup (`loadBCBSDemoPreset`) → `dashboard` (CISO) → `cro` → `cfo` → `boarddash`. Each render asserted non-throwing.
- [ ] Suite asserts `dashboard.financialExposure` widget matches a checked-in pre-month-1 baseline (regression guard against CFO math drift).
- [ ] Suite navigates to `risknarrative` page with feature flag on and asserts the hero finding `f_001_demo_nasco_cve` narrative renders.
- [ ] Suite captures a textual diff of the narrative HTML against a golden file at `frontend/tests/smoke/__fixtures__/bcbs-hero-narrative.html`.
- [ ] Suite runs in CI (added to `.github/workflows/ci.yml`).
- [ ] `docs/demo/bcbs-regression.md` (new) — what's covered, how to update the golden file, when to refresh the baseline.
- [ ] `docs/runbooks/risk-engine.md` (new) — how to deploy, how to seed/un-seed, how to read engine logs.
- [ ] ITSM ticket creation flow covered by a supertest in `cyberrx-api/tests/itsm.spec.js` (added incidentally if not already in PR-01).

## Dependencies

- **Upstream PRs:** PR-01 through PR-10.
- **Blocking open questions:** none — this PR is purely additive testing + docs.

## Test Plan

- This PR *is* the test plan. Its own validation: the suite passes locally, passes in CI, and any deliberate change to the engine (e.g. updating `financialModelV1` calibration) requires an explicit golden-file refresh — which is the desired behavior.

## Documentation Updates

- `docs/demo/bcbs-regression.md` (new).
- `docs/runbooks/risk-engine.md` (new).
- `README.md` — `npm run test:smoke` command.

## Branch & Commit Convention

- Branch: `feat/pr-11-bcbs-smoke-suite` off `main`.
- Commit prefix: `chore(demo):` for the suite, `docs:` for the runbooks (squash).

## Risks & Stop Conditions

- No `PRODUCTION_PROMPT.md` stop condition triggers (no copy, no compliance claim, no new route, no demo data migration).
- Risk: golden file becomes a chore to update. Mitigation: provide a `npm run test:smoke -- --update` mode (vitest snapshot semantics) and document the refresh process in `docs/demo/bcbs-regression.md`.

## History

- 2026-05-29: Created
