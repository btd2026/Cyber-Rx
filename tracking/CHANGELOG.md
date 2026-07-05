# Changelog

All notable changes to Nerion production-readiness work are documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.1.0/),
and this project loosely follows [Semantic Versioning](https://semver.org/spec/v2.0.0.html) for the product itself; tracking entries here are scoped per branch/PR.

---

## [Unreleased] — `feat/month-1-risk-correlation-engine`

### Added

- **Coverage assessment** — `COVERAGE_ASSESSMENT.md`. Read-only source of truth for desired functionality, gap analysis, and acceptance criteria. (Pre-existing in repo as of `8253d6a`.)
- **Production-readiness prompt** — `PRODUCTION_PROMPT.md`. Role, sequence, quality bars, workflow rules, constraints, stop conditions.
- **Month-1 implementation plan** — `docs/plans/month-1-risk-correlation-engine.md`. Current-state diagnosis, six new entities with up/down migration SQL, BCBS seed strategy (twelve crown-jewel processes), correlation engine API shape with nine-hop algorithm pseudocode, UI route + component plan, eleven required + three optional PRs with acceptance criteria, test plan, twelve open questions, stop-condition mapping.
- **In-repo tracking system** — `tracking/` directory:
  - `tracking/README.md` — how the tracking system works.
  - `tracking/BACKLOG.md` — kanban-style overview of all PRs with status, branch, priority, dependencies, blocking open questions.
  - `tracking/STATUS.md` — manager-facing status report.
  - `tracking/CHANGELOG.md` — this file.
  - `tracking/issues/PR-01-…` through `tracking/issues/PR-14-…` — fourteen GitHub-Issue-compatible files with YAML frontmatter convertible via `gh issue create -F <file>`.
  - `tracking/standups/2026-05-29-session-01.md` — first session standup.

### Changed

_(nothing yet — no code modified this session.)_

### Deprecated

_(none)_

### Removed

_(none)_

### Fixed

_(none)_

### Security

_(none — JWT enforcement, CORS hardening, multi-tenant isolation are all deferred to Month 4 per the production prompt's sequence.)_

---

## How to use this file

- Every PR appends to `[Unreleased]` when it merges. The PR's commit message determines the section: `feat(…)` → Added; `fix(…)` → Fixed; `chore(…)` and `docs(…)` → as appropriate; security-relevant changes → Security regardless of commit prefix.
- When a phase (Month 1, Month 2, etc.) closes, `[Unreleased]` becomes `[YYYY-MM-DD] — month-N-<name>` and a fresh `[Unreleased]` block is added.
- `STATUS.md` and `BACKLOG.md` must be updated in the same commit that adds a changelog entry.
