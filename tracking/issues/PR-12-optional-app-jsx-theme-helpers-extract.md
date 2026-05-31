---
id: PR-12
title: "chore(ui): extract theme + utility helpers from App.jsx [OPTIONAL]"
status: Backlog
priority: P3
labels: [chore, ui, refactor, optional, month-1, priority-p3]
branch: feat/pr-12-theme-helpers-extract
assignee: agent
estimated_hours: TBD
optional: true
created: 2026-05-29
plan_ref: docs/plans/month-1-risk-correlation-engine.md#6-pr-sequencing--eleven-prs-for-month-1
---

## Summary

OPTIONAL PR — ship only if Week 4 has slack. Pulls `C` (palette), `CMMI_LEVELS`, `cmmi`, `CmmiBadge`, `CmmiBar`, `hc`, `hl`, `fmtD`, `fmtDS`, `fmtNum`, `fmtExp`, and `nameFromEmail` from `App.jsx` (lines ~3–112) into `frontend/src/lib/theme.js` and `frontend/src/lib/format.js`. Sets up the App.jsx split mechanics so Month 2 PRs can extract whole pages cleanly. Touches every page (every page imports `C` and at least one formatter).

## Acceptance Criteria

Per plan §6 PR-12:

- [ ] `frontend/src/lib/theme.js` exports `C` and the CMMI utilities.
- [ ] `frontend/src/lib/format.js` exports `fmtD`, `fmtDS`, `fmtNum`, `fmtExp`, `hc`, `hl`, `nameFromEmail`.
- [ ] `App.jsx` imports from these modules; the inline definitions are removed.
- [ ] Zero functional change — visual diff of every page is identical.
- [ ] BCBS smoke regression suite (PR-11) passes unchanged.
- [ ] CFO dashboard $ amounts byte-identical to pre-extraction (snapshot diff in smoke suite).

## Dependencies

- **Upstream PRs:** PR-01 through PR-11 (especially PR-11 — the smoke suite is the protection mechanism for this refactor).
- **Blocking open questions:**
  - Q8 (plan §11) — Confirm shipping PR-12 in Month 1 vs deferring to Month 6 (the App.jsx split). Plan recommends ship-if-slack.

## Test Plan

- BCBS smoke regression suite (PR-11) is the gate.
- vitest snapshot diff on every existing page render — no expected diffs.

## Documentation Updates

- `docs/ui/app-jsx-split.md` (new) — the strategy for the incremental App.jsx split, with this PR as the first concrete step. Documents naming convention for `lib/` modules.

## Branch & Commit Convention

- Branch: `feat/pr-12-theme-helpers-extract` off `main`.
- Commit prefix: `chore(ui):`.

## Risks & Stop Conditions

- **Quality bar from `PRODUCTION_PROMPT.md`:** "The four existing dashboards (CISO, CFO, CRO, Board) keep working through every refactor." Smoke suite is the verification.
- Risk: touching all 24,559 lines of App.jsx in one PR is exactly the kind of mega-PR the prompt warns against. Mitigation: this PR is bounded to imports/exports — no logic changes, no page extractions.

## History

- 2026-05-29: Created
