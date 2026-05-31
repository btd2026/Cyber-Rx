---
id: PR-14
title: "feat(ui): \"Generate narrative\" demo button on CISO dashboard [OPTIONAL]"
status: Backlog
priority: P3
labels: [feat, ui, demo, optional, month-1, priority-p3]
branch: feat/pr-14-generate-narrative-button
assignee: agent
estimated_hours: TBD
optional: true
created: 2026-05-29
plan_ref: docs/plans/month-1-risk-correlation-engine.md#6-pr-sequencing--eleven-prs-for-month-1
---

## Summary

OPTIONAL PR — wires the CISO dashboard to the engine without extracting the dashboard. Adds a button to a CISO dashboard finding row that POSTs to `/api/risk-engine/findings` (PR-09) and routes the user to `risknarrative?findingId=<new>`. Proves the end-to-end "I see a CISO finding → I get an executive narrative" story for sales/demo conversations.

## Acceptance Criteria

Per plan §6 PR-14:

- [ ] CISO dashboard finding rows expose a "Generate executive narrative" action (visible when `VITE_FEATURE_RISK_NARRATIVE === "1"`).
- [ ] Click → POST to `/api/risk-engine/findings` with the row's data → navigate to `risknarrative?findingId=<new>`.
- [ ] Narrative renders for the newly-created finding via the engine.
- [ ] Smoke test (PR-11) extended to exercise the click flow.
- [ ] `docs/demo/bcbs-narrative-demo.md` (new) — script of the demo flow for sales conversations.

## Dependencies

- **Upstream PRs:** PR-01 through PR-11.
- **Blocking open questions:** none.

## Test Plan

- vitest: button renders only when flag on; click triggers POST + navigation.
- Smoke: button path included in the BCBS suite.

## Documentation Updates

- `docs/demo/bcbs-narrative-demo.md` (new).

## Branch & Commit Convention

- Branch: `feat/pr-14-generate-narrative-button` off `main`.
- Commit prefix: `feat(ui):`.

## Risks & Stop Conditions

- **Stop condition (plan §10):** This is a *new* user-facing action on an existing dashboard. Gated by the same `VITE_FEATURE_RISK_NARRATIVE` flag — confirm the flag-protection is acceptable.
- Risk: the button changes how CISOs interact with the dashboard. Get explicit user sign-off on the placement/copy before shipping.

## History

- 2026-05-29: Created
