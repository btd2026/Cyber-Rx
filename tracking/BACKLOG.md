# CyberRx — Production Readiness Backlog

**Branch under work:** `feat/month-1-risk-correlation-engine`
**Active phase:** Month 1 — Risk Correlation Engine
**Plan reference:** [`docs/plans/month-1-risk-correlation-engine.md`](../docs/plans/month-1-risk-correlation-engine.md)
**Last updated:** 2026-05-29 (session-01)

This file is the queue. Every PR/issue has its own file in [`issues/`](./issues/). Status transitions for any PR get recorded here AND in the issue file's `## History` AND in [`STATUS.md`](./STATUS.md) before the PR is marked Done.

---

## Status — Month 1

### Ready

| ID | Title | Branch | Priority | Depends on | Open Qs blocking | Issue |
|----|-------|--------|----------|------------|------------------|-------|
| PR-01 | chore(api): test harness, migration runner, CI | `feat/pr-01-test-harness` | P1 | — | Q9, Q10 | [PR-01](./issues/PR-01-test-harness-migration-runner-ci.md) |

### Backlog

| ID | Title | Branch | Priority | Depends on | Open Qs blocking | Issue |
|----|-------|--------|----------|------------|------------------|-------|
| PR-02 | feat(risk-engine): add six new tables + join tables | `feat/pr-02-six-new-tables` | P1 | PR-01 | Q3 | [PR-02](./issues/PR-02-six-new-tables.md) |
| PR-03 | feat(risk-engine): seed reference data — scenarios, obligations, frameworks | `feat/pr-03-seed-reference-data` | P1 | PR-01, PR-02 | Q4, Q11 | [PR-03](./issues/PR-03-seed-reference-data.md) |
| PR-04 | feat(risk-engine): seed BCBS twelve crown-jewel processes | `feat/pr-04-seed-bcbs-crown-jewels` | P1 | PR-01–PR-03 | Q1 | [PR-04](./issues/PR-04-seed-bcbs-crown-jewels.md) |
| PR-05 | feat(risk-engine): seed BCBS assets, data objects, joins | `feat/pr-05-seed-bcbs-assets-data-objects` | P1 | PR-01–PR-04 | — | [PR-05](./issues/PR-05-seed-bcbs-assets-data-objects.md) |
| PR-06 | feat(risk-engine): seed executive owners + one demo finding | `feat/pr-06-seed-executive-owners-demo-finding` | P1 | PR-01–PR-05 | Q3, Q6 | [PR-06](./issues/PR-06-seed-executive-owners-demo-finding.md) |
| PR-07 | feat(risk-engine): GET /processes + /findings (read-only) | `feat/pr-07-read-only-endpoints` | P1 | PR-01–PR-06 | Q6 | [PR-07](./issues/PR-07-read-only-processes-findings-endpoints.md) |
| PR-08 | feat(risk-engine): correlation algorithm + GET /correlate/:id ⭐ CORE | `feat/pr-08-correlation-algorithm` | **P0** | PR-01–PR-07 | Q2, Q5 | [PR-08](./issues/PR-08-correlation-algorithm-and-endpoint.md) |
| PR-09 | feat(risk-engine): POST /findings + POST /findings/:id/correlate | `feat/pr-09-write-endpoints` | P2 | PR-01–PR-08 | Q6 | [PR-09](./issues/PR-09-write-endpoints-for-findings.md) |
| PR-10 | feat(ui): RiskNarrative component + feature flag ⭐ CORE | `feat/pr-10-risk-narrative-ui` | **P0** | PR-01–PR-08 (PR-09 nice-to-have) | Q12 | [PR-10](./issues/PR-10-risk-narrative-component-feature-flag.md) |
| PR-11 | chore(demo): BCBS smoke regression suite + docs | `feat/pr-11-bcbs-smoke-suite` | P1 | PR-01–PR-10 | — | [PR-11](./issues/PR-11-bcbs-smoke-regression-suite.md) |
| PR-12 | chore(ui): extract theme + helpers from App.jsx [OPTIONAL] | `feat/pr-12-theme-helpers-extract` | P3 | PR-01–PR-11 | Q8 | [PR-12](./issues/PR-12-optional-app-jsx-theme-helpers-extract.md) |
| PR-13 | docs(api): OpenAPI spec for /api/risk-engine [OPTIONAL] | `feat/pr-13-openapi-spec` | P3 | PR-07–PR-09 | — | [PR-13](./issues/PR-13-optional-openapi-spec.md) |
| PR-14 | feat(ui): "Generate narrative" demo button on CISO dashboard [OPTIONAL] | `feat/pr-14-generate-narrative-button` | P3 | PR-01–PR-11 | — | [PR-14](./issues/PR-14-optional-generate-narrative-demo-button.md) |

### In Progress

_(empty)_

### In Review

_(empty)_

### Blocked

_(empty)_

### Done

_(empty)_

---

## Optional / parking-lot items

PR-12, PR-13, PR-14 are explicitly `optional: true` in their frontmatter. Ship only if Week 4 has slack. None of them are required for the Month 1 acceptance gate.

---

## Open Questions Blocking Progress

The plan's §11 surfaces twelve open questions; five are actively blocking work on specific PRs and need user decisions before code starts. Listed here for visibility. **Status: Awaiting user decision** for all.

| # | Question | Blocks PR(s) | Plan's recommended answer | Status |
|---|----------|--------------|---------------------------|--------|
| Q1 | "10 vs 12" crown-jewel reconciliation. Assessment §1 says ten; §5 enumerates twelve; code's BCBS template has 12–14. | PR-04 | Canonical twelve. Amend `COVERAGE_ASSESSMENT.md` in PR-04's commit. | Awaiting user decision |
| Q3 | Add a `findings` table this month, or defer it to Month 2? | PR-02 (schema), PR-06 (seed), all downstream | Add now. Engine cannot function otherwise. | Awaiting user decision |
| Q5 | Calibrate the `financialModelV1` demo to ~$217M for the BCBS hero example? | PR-08 | Yes. Closed-form placeholder, replaced by `FinancialImpact` in Month 5. | Awaiting user decision |
| Q11 | BCBS demo deployment placement — separate Render service vs `SEED_BCBS_DEMO=1` flag on the main service? | PR-03, PR-04, PR-05, PR-06 | Separate Render service. | Awaiting user decision |
| Stop conditions §10 | (a) HIPAA/CMS citations in the UI as a "compliance claim"? (b) feature-flag mechanism for new dashboard routes? (c) BCBS-demo data migrations? | PR-03 onward (c), PR-10 (a + b) | (a) Citations are of the customer's obligations, not CyberRx claims — add disclaimer footer if needed. (b) `VITE_FEATURE_RISK_NARRATIVE` flag, default off in prod. (c) Confirm per-PR. | Awaiting user decision |

The other seven questions (Q2, Q4, Q6, Q7, Q8, Q9, Q10, Q12) are non-blocking — the plan has a recommended answer and the work can proceed with that recommendation if the user is silent — but they should still be reviewed.

---

## Conventions

- One PR per row in the kanban table.
- Branch per PR. All branches off `main` (or off the active month's plan branch if it has been merged first).
- Conventional commits: `feat(scope):`, `fix(scope):`, `chore(scope):`, `docs(scope):`, `test(scope):`.
- Status transitions: `Backlog → Ready → In Progress → In Review → Done`. `Blocked` is a temporary side-state with the reason documented in the issue's `## History`.
- Before a PR moves to Done: this file, the issue file, [`STATUS.md`](./STATUS.md), and [`CHANGELOG.md`](./CHANGELOG.md) must all be updated.
