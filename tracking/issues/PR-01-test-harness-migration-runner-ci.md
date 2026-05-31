---
id: PR-01
title: "chore(api): test harness, migration runner, CI"
status: Ready
priority: P1
labels: [chore, infrastructure, month-1, priority-p1]
branch: feat/pr-01-test-harness
assignee: agent
estimated_hours: TBD
created: 2026-05-29
plan_ref: docs/plans/month-1-risk-correlation-engine.md#pr-1-chore-api-add-test-harness-migration-runner-ci-week-1-2d
---

## Summary

Stand up the foundation that makes every later PR's "tests gate every PR" rule enforceable: a Node test harness for the API, a `vitest` harness for the frontend, a hand-rolled forward-only PG migration runner with up/down support and an idempotent ledger, and a GitHub Actions CI workflow. Wires `npm run migrate` into Render's `startCommand`. This PR adds tooling only — no schema or product code yet.

## Acceptance Criteria

Per plan §6 PR-1 and §2.9:

- [ ] `cyberrx-api/` has `jest` + `supertest` dev dependencies and an `npm test` script.
- [ ] `frontend/` has `vitest` dev dependency and an `npm test` script.
- [ ] `cyberrx-api/migrations/` directory exists with the `NNN_name.up.sql` / `NNN_name.down.sql` pair convention.
- [ ] `cyberrx-api/scripts/migrate.js` supports `up`, `down`, and `status` commands.
- [ ] Migration ledger table: `schema_migrations (version TEXT PRIMARY KEY, applied_at TIMESTAMPTZ NOT NULL DEFAULT NOW())`.
- [ ] Each migration runs inside a single transaction; failures roll back and exit non-zero.
- [ ] `001_init_legacy.up.sql` is a no-op marker recording the five existing tables (`orgs`, `users`, `metrics`, `route_actions`, `tool_connections`) as already applied. Legacy `db.init()` stays in place as a safety net for those five tables only.
- [ ] `npm run migrate` is added to `package.json`. `render.yaml` `startCommand` becomes `npm run migrate && npm start`.
- [ ] `.github/workflows/ci.yml` runs `npm test` (API), `npm run lint` + `npm run build` (frontend) on PR. Ephemeral Postgres service available for migration round-trip tests.
- [ ] `docs/runbooks/migrations.md` created.
- [ ] `npm run migrate status` on a fresh DB reports `001_init_legacy` as applied.

## Dependencies

- **Upstream PRs:** none. This is the first PR.
- **Blocking open questions:**
  - Q9 (plan §11) — Confirm GitHub Actions is permitted (no Actions billing or org-policy blockers).
  - Q10 (plan §11) — Confirm PG 15 is the target version (and that Render is on PG 15).

## Test Plan

- **Unit:** one `migrate.js` test exercising apply + rollback against an ephemeral PG instance in CI.
- **Integration:** one supertest hitting `/health`.
- **Frontend smoke:** one `vitest` test that imports `App.jsx` without crashing.

## Documentation Updates

- `docs/runbooks/migrations.md` (new) — operator runbook for the runner.
- `README.md` — test commands added.
- `cyberrx-api/.env.example` — no new vars yet.

## Branch & Commit Convention

- Branch: `feat/pr-01-test-harness` off `main` (or off `feat/month-1-risk-correlation-engine` if the plan branch is merged first).
- Commit prefix: `chore(api):` and `chore(ci):` as appropriate.

## Risks & Stop Conditions

- No stop conditions from `PRODUCTION_PROMPT.md` apply to this PR (no pricing/positioning copy, no compliance claims, no new dashboard route, no BCBS demo data touched).
- Risk: introducing `npm run migrate` into Render's startup command could fail the boot if migration fails — mitigation is the transactional safety + the no-op `001_init_legacy` marker. Confirm by deploying to a Render preview before promoting to the demo service.

## History

- 2026-05-29: Created
