# CyberRx — Status Report

**Project:** CyberRx Production Readiness
**Phase:** Month 1 — Risk Correlation Engine (Weeks 1–4)
**Reporting period:** Session-01, 2026-05-29
**Branch under work:** `feat/month-1-risk-correlation-engine`
**Plan reference:** [`docs/plans/month-1-risk-correlation-engine.md`](../docs/plans/month-1-risk-correlation-engine.md)
**Backlog:** [`BACKLOG.md`](./BACKLOG.md)

---

## Executive summary

Planning phase for Month 1 is complete. The Month-1 implementation plan, the in-repo tracking system, and fourteen issue files are checked in on `feat/month-1-risk-correlation-engine` (uncommitted, pending user review). Work cannot start on PR-01 until the user reviews the plan and answers the five blocking open questions in §11 of the plan (mirrored in `BACKLOG.md`'s "Open Questions" section). No production code has been written this session. The BCBS demo is unchanged and remains green.

## This session — Delivered

- **Coverage assessment** (`COVERAGE_ASSESSMENT.md`) — read in full as the product source of truth.
- **Production-readiness prompt** (`PRODUCTION_PROMPT.md`) — read in full as the engineering source of truth.
- **Current-state codebase survey** — read backend (`cyberrx-api/`: Express index, four route modules, `db.js`, vault, scheduler, render.yaml), frontend (`App.jsx` 24,559 lines; routing switch; existing four executive dashboards; BCBS demo preset; crown-jewels module), and repo-level docs. Identified five tension points between the assessment and the code, documented in plan §1.4.
- **Month-1 implementation plan** (`docs/plans/month-1-risk-correlation-engine.md`, ~890 lines): current-state diagnosis, six new entities with full migration SQL, seed strategy with the 10-vs-12 reconciliation, engine API shape with nine-hop algorithm pseudocode, UI route + component plan, eleven required + three optional PRs sequenced with acceptance criteria each, test plan, doc-update schedule per PR, twelve open questions, stop-condition mapping.
- **In-repo tracking system** (`tracking/`): README, BACKLOG (kanban), STATUS (this file), CHANGELOG (Keep-a-Changelog format), the first session standup, fourteen GitHub-Issue-compatible issue files with YAML frontmatter convertible via `gh issue create -F`.
- **Branch hygiene:** the work moved from `main` to `feat/month-1-risk-correlation-engine` mid-session per user instruction. `main` is untouched. Nothing committed; nothing pushed.

## This session — In progress

Nothing. Awaiting user review.

## Blockers

Five open questions block code start on PR-01:

1. **Q9** — Confirm GitHub Actions is permitted (no Actions billing or org-policy blockers).
2. **Q10** — Confirm PG 15 as the target version (and that Render's PG is on 15).

Three additional questions block downstream PRs but not PR-01 itself:

3. **Q1** — "10 vs 12" crown-jewel canonical answer. Blocks PR-04.
4. **Q3** — Add a `findings` table in Month 1, or defer to Month 2. Blocks PR-02 schema decisions and all downstream engine work.
5. **Q5** — Confirm the $217M demo calibration target for `financialModelV1`. Blocks PR-08.

Three stop-condition confirmations (per `PRODUCTION_PROMPT.md`) need user sign-off:

6. HIPAA/CMS citations in the narrative UI — are these citations of the customer's obligations (fine) or claims about CyberRx's compliance (not fine)? Blocks PR-10.
7. Feature-flag mechanism (`VITE_FEATURE_RISK_NARRATIVE`, default off in prod) acceptable for new dashboard routes? Blocks PR-10.
8. Per-PR sign-off on BCBS demo data migrations? Blocks PR-03 onward.

## Next session — Planned

Subject to user clearing the blockers above:

- **Kick off PR-01** (`feat/pr-01-test-harness`): set up Jest + supertest in `cyberrx-api/`, vitest in `frontend/`, the hand-rolled migration runner at `scripts/migrate.js` with the `001_init_legacy` no-op marker, the GitHub Actions CI workflow.
- **Expected duration:** ~2 days per plan §6 PR-1 estimate.
- **Acceptance gate:** all of PR-01's checkboxes green, CI passing on a draft PR, and `npm run migrate status` reporting `001_init_legacy` as applied on a fresh DB.
- If the user clears Q1 + Q3 in the same review, **PR-02 (schema)** can start in parallel from PR-01 once the migration runner exists, since the work is independent. Default sequencing is strict (PR-01 → PR-02), but the user may choose to fan out.

## Risk register

Surfaced from plan §10 (stop conditions) and §11 (risks/open questions):

| Risk | Surfaced from | Mitigation in plan | Owner |
|------|---------------|---------------------|-------|
| Treating `financialModelV1`'s $217M as a real loss estimate | Plan §4.3 step 5; Q5 | Response includes `financialExposureBasis: "ransomware_default_model_v1"` and the architecture doc flags the placeholder status | Engineering |
| New UI route shipped to production without a flag | `PRODUCTION_PROMPT.md` §47 stop conditions | `VITE_FEATURE_RISK_NARRATIVE` default off in production environments | Engineering + product |
| HIPAA / CMS citations read as compliance claims about CyberRx | `PRODUCTION_PROMPT.md` §47 stop conditions | Plan §10 — confirm with user; add disclaimer footer to `RiskNarrative` if interpretation is at all ambiguous | Product + legal |
| BCBS demo regression during Month 2 refactor churn | `PRODUCTION_PROMPT.md` §24 quality bar; plan §7.4 | PR-11 ships a smoke regression suite that gates every subsequent merge | Engineering |
| `App.jsx` 24,559 lines becomes harder to split as Month 1 work lands new component imports | Plan §1.2 + §5.5 | PR-10 lands `RiskNarrative` outside `App.jsx` from day one; PR-12 (optional) starts the helper-extraction; full split is Month 6 | Engineering |
| JWT enforcement deferred to Month 4 — new engine endpoints rely on `X-Org-Id` header only | Plan §1.1, Q6 | Document the conscious deferral in every PR description; Month 4 is the hardening phase | Engineering + security |
| Permissive CORS continues through Month 1 | Plan §1.1 | Out of scope this month; tracked for Month 4 | Engineering + security |
| Background scheduler unwired in Render | Plan §1.1, Q7 | Out of scope this month; defer decision (run it or remove it) to Month 4 | Engineering |

## Velocity / throughput

No baseline yet. Velocity measurement starts when PR-01 lands. Once three PRs are merged, we'll start tracking a rolling estimate of PRs-per-week and cycle time per PR (ready → done).

## Notes for the manager

- The plan is deliberately long (~890 lines) because the assessment is dense and the prompt's "tests gate every PR, docs ship in same PR" rule needs each PR's deliverables to be unambiguous up-front. The trade-off is read time now vs. cheaper review later. If the plan is too long to review in one sitting, the prioritized order is: §0 (TL;DR), §3 (10-vs-12 reconciliation), §4 (engine API + algorithm), §6 (PR sequence), §11 (open questions).
- The five blocking open questions are concrete decisions, not preferences. Each has a plan-recommended answer; a "go with the recommendation" reply unblocks PR-01 and most of the downstream work.
- The tracking system in `tracking/` is local-first by design (no GitHub MCP), but every issue file is GitHub-compatible — `gh issue create -F tracking/issues/PR-XX-*.md` mirrors any issue to GitHub at any point if/when that becomes useful.
