# CyberRx — In-Repo Tracking System

This directory is the lightweight project-management layer for CyberRx production-readiness work. It exists because the team doesn't currently have a GitHub Issues / Linear / Jira integration wired in, but still wants the discipline of issue-per-PR, kanban status, manager-facing weekly status, and a changelog. Every file here is plain Markdown; every issue is one command away from becoming a real GitHub Issue if/when that becomes useful.

## Layout

```
tracking/
├── README.md          ← you are here
├── BACKLOG.md         ← kanban-style queue: every PR with status, branch, deps, links
├── STATUS.md          ← manager-facing status report (delivered / in-progress / blocked / planned / risks)
├── CHANGELOG.md       ← Keep-a-Changelog format; appended each time a PR merges
├── issues/            ← one file per PR/issue, GitHub-Issue-compatible
│   ├── PR-01-test-harness-migration-runner-ci.md
│   ├── PR-02-six-new-tables.md
│   ├── ...
│   └── PR-14-optional-generate-narrative-demo-button.md
└── standups/          ← one file per work session
    └── 2026-05-29-session-01.md
```

## What each file is for

- **`BACKLOG.md`** — the kanban board. Every PR has one row in one status column (Ready / Backlog / In Progress / In Review / Blocked / Done). Includes a section at the bottom listing the open questions that block code start.
- **`STATUS.md`** — the manager-facing report. Written for someone who isn't reading every commit — they need executive summary, what shipped this session, what's in progress, what's blocked, what's next, and a risk register. Updated on every work session.
- **`CHANGELOG.md`** — Keep-a-Changelog format. Append-only. New entry when a PR merges. Sections: Added / Changed / Deprecated / Removed / Fixed / Security.
- **`issues/PR-XX-….md`** — one file per PR. Each file has YAML frontmatter compatible with `gh issue create -F <file>` (so the file can become a real GitHub Issue with one command — see below) and a body with: Summary, Acceptance Criteria, Dependencies, Test Plan, Documentation Updates, Branch & Commit Convention, Risks & Stop Conditions, History.
- **`standups/YYYY-MM-DD-session-NN.md`** — one file per work session. Format: What I did / What I'm doing next / Blockers / Notes for the manager. Quick to write, scannable.

## Issue lifecycle

```
Backlog ─→ Ready ─→ In Progress ─→ In Review ─→ Done
                        │
                        └──→ Blocked ──→ back to In Progress when unblocked
```

- **Backlog** — known work, not yet ready (upstream deps incomplete, open questions blocking).
- **Ready** — all blockers cleared. Anyone can pick this up.
- **In Progress** — actively being worked on. Branch exists. WIP commits land on the issue's branch.
- **In Review** — PR is open, awaiting review.
- **Blocked** — temporary side-state. Reason documented in the issue's `## History` and surfaced in `STATUS.md` blockers.
- **Done** — merged. CHANGELOG, STATUS, and BACKLOG all updated in the same commit. Issue file's `## History` gets a final `- YYYY-MM-DD: Done (merged in <commit>)` line.

Every status transition gets recorded in three places:

1. The issue file's `## History` (append a line).
2. `BACKLOG.md` (move the row to the new status table).
3. `STATUS.md` (mention in next session's report).

## Branch-per-PR convention

- Every PR gets its own branch off `main` (or off the active month's plan branch if it's been merged first).
- Branch names match the `branch:` field in the issue's frontmatter — usually `feat/pr-NN-<short-slug>` for new features, `chore/pr-NN-…` for chores, `docs/pr-NN-…` for docs.
- The current month's umbrella branch (`feat/month-1-risk-correlation-engine`) is where the planning docs and tracking system live. Implementation PRs branch off `main` independently; the umbrella branch is **not** their parent.
- Nothing merges to `main` without explicit user approval.

## Converting an issue file to a real GitHub Issue

Every issue file's YAML frontmatter is compatible with [`gh issue create -F`](https://cli.github.com/manual/gh_issue_create). When/if you want to mirror to GitHub:

```bash
gh issue create -F tracking/issues/PR-01-test-harness-migration-runner-ci.md
```

The frontmatter provides:

- `title` → the GitHub Issue title
- `labels` → the GitHub labels (auto-create if missing with `gh label create`)
- `assignee` → mapped to a GitHub username if matching one exists
- the rest (`id`, `status`, `priority`, `branch`, `plan_ref`, `estimated_hours`, `created`) is metadata that lives in the local file and isn't pushed to GitHub.

The body is plain Markdown — GitHub renders it as-is.

If you mirror to GitHub, **the in-repo file remains the source of truth.** When state changes on either side, sync the local file. The local file's `## History` should record the GitHub issue number once one is created.

## Standup cadence

- One standup file per work session, named `standups/YYYY-MM-DD-session-NN.md`. If a single day has multiple sessions, `NN` increments.
- Format is fixed: branch, active issues, hours, "What I did", "What I'm doing next", "Blockers", "Notes for the manager".
- Standups are *brief.* If a standup runs more than a screen, you're probably writing a status report — that goes in `STATUS.md`.

## Done-criteria checklist (for every PR)

Before any PR moves to **Done**:

- [ ] All acceptance criteria in the issue file are checked.
- [ ] Tests pass in CI.
- [ ] Documentation updates listed in the issue file have shipped in the same PR.
- [ ] `BACKLOG.md` row moved to Done.
- [ ] `CHANGELOG.md` updated.
- [ ] `STATUS.md` reflects the new state in the next session report.
- [ ] Issue file's `## History` has a final `- YYYY-MM-DD: Done (merged in <commit>)` line.

This checklist isn't bureaucracy for its own sake. It's the difference between "we shipped" and "we shipped and the next person knows where to pick up."

## When to mirror to GitHub

Local-first works fine for a solo engineer. Mirror to GitHub when:

- The team grows beyond one engineer and they need centralized visibility.
- An outside reviewer (board, investor, partner) needs read access to the issue queue.
- You start using GitHub Projects boards or GitHub Actions referencing issues.

Until then, this in-repo system is enough and faster.
