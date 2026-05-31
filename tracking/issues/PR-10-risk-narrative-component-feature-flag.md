---
id: PR-10
title: "feat(ui): RiskNarrative component + feature flag"
status: Backlog
priority: P0
labels: [feat, ui, risk-engine, month-1, priority-p0]
branch: feat/pr-10-risk-narrative-ui
assignee: agent
estimated_hours: TBD
created: 2026-05-29
plan_ref: docs/plans/month-1-risk-correlation-engine.md#5-ui-route--component-plan
---

## Summary

Ship the user-facing single-pane-of-glass that renders the correlation engine's output. New route `page === "risknarrative"` (NAV entry behind `VITE_FEATURE_RISK_NARRATIVE` flag), new component tree under `frontend/src/components/risk/`, new thin API client wrapper at `frontend/src/lib/api.js`. This is also the first extraction in the App.jsx split — the new page lives outside App.jsx from day one. The rendered narrative matches the assessment's Final Recommendation ASCII screenshot (plan §5.2 component tree).

## Acceptance Criteria

Per plan §5.1–§5.7 and §6 PR-10:

- [ ] New files per plan §5.3:
  - [ ] `frontend/src/components/risk/RiskNarrative.jsx` (default export, page component)
  - [ ] `frontend/src/components/risk/NarrativeCard.jsx`
  - [ ] `frontend/src/components/risk/BusinessImpactPanel.jsx`
  - [ ] `frontend/src/components/risk/FrameworksPanel.jsx`
  - [ ] `frontend/src/components/risk/LegalPanel.jsx`
  - [ ] `frontend/src/components/risk/OwnershipPanel.jsx`
  - [ ] `frontend/src/components/risk/FindingPicker.jsx`
  - [ ] `frontend/src/components/risk/useRiskNarrative.js` — data hook with loading/error
  - [ ] `frontend/src/lib/api.js` — thin fetch wrapper
- [ ] `App.jsx` switch arm added: `if (page === "risknarrative") return React.createElement(RiskNarrative, sharedProps);`
- [ ] `NAV` entry added: `{id:"risknarrative", label:"Risk Narrative", icon:"⚡", mod:"F-RC"}`. Entry rendered only when `import.meta.env.VITE_FEATURE_RISK_NARRATIVE === "1"`.
- [ ] `<BrianaBar pageKey="risknarrative" .../>` included in the page.
- [ ] When `findingId` absent → `<FindingPicker>` renders.
- [ ] When `findingId` present → `<NarrativeCard>` renders with sub-panels.
- [ ] Demo badge visible on the card when `narrative.demo === true`.
- [ ] vitest unit tests: `<RiskNarrative>` renders with fixture, loading state, error state; `<FindingPicker>` empty/one/many; `<NarrativeCard>` snapshot against plan §4.2 fixture.
- [ ] **End-to-end acceptance:** with flag on, navigating to "Risk Narrative" and selecting `f_001_demo_nasco_cve` renders a panel whose text content matches the assessment's Final Recommendation ASCII (titles, $ exposure, framework refs, owner names).
- [ ] `frontend/.env.example` adds `VITE_FEATURE_RISK_NARRATIVE=0`.
- [ ] `docs/ui/risk-narrative.md` (new) — component map, props contract, feature flag operation.

## Dependencies

- **Upstream PRs:** PR-01 through PR-08 (need the correlate endpoint live). PR-09 nice-to-have but not strictly required.
- **Blocking open questions:**
  - Q12 (plan §11) — Confirm there's no higher-fidelity Figma/PNG mock we should match instead of the ASCII screenshot.

## Test Plan

- **Unit (vitest + react-testing-library):**
  - `<RiskNarrative>` renders with provided `narrative` fixture without crashing.
  - Loading state renders skeleton.
  - Error state renders message + retry.
  - `<FindingPicker>` renders empty, single, and sorted-list states.
  - `<NarrativeCard>` snapshot test against plan §4.2 fixture.
- **Smoke:** covered in PR-11.

## Documentation Updates

- `docs/ui/risk-narrative.md` (new) — component tree, props, hooks, feature flag mechanics.
- `frontend/.env.example` — `VITE_FEATURE_RISK_NARRATIVE`.

## Branch & Commit Convention

- Branch: `feat/pr-10-risk-narrative-ui` off `main`.
- Commit prefix: `feat(ui):`.

## Risks & Stop Conditions

- **Stop condition (plan §10):** *"Shipping a new dashboard route to production without a feature flag."* This PR's whole protection is the `VITE_FEATURE_RISK_NARRATIVE` flag with default `0` in production. Confirm the mechanism (Vercel env var per environment) is acceptable before PR-10 ships.
- **Stop condition (plan §10):** *"Adding any user-facing claim about regulatory compliance status (HIPAA, SOC2, etc.)."* The narrative cites HIPAA §164.308(a)(5) and CMS 42 CFR §422.306(c)(1). These are **citations of the customer's obligations**, not claims about CyberRx's compliance status. Confirm with user before PR-10 ships; add a disclaimer footer to `RiskNarrative` if not (plan §10 explicit ask).
- Risk: the new feature-flag mechanism (`VITE_FEATURE_RISK_NARRATIVE`) sets a precedent. Document the env-var naming convention in `docs/ui/risk-narrative.md`.

## History

- 2026-05-29: Created
