# RUNBOOK — CyberRx Orchestration

## What's in this bundle
```
CLAUDE.md                                  auto-loaded by Claude Code; orients every session
orchestration/
  RUNBOOK.md                               this file
  launch-prompts.md                        the one-line prompts to start
  prompts/{manager,worker,validator,decomposer}.md
workspace/
  task-board.json                          seeded M0 + start of M1 (the source of truth)
  context/
    assessment-full.md                     the full assessment (reference)
    appjsx-index.json                      CREATED by T-000 (not present yet)
    assessment-chunks/                      the assessment pre-split into small files
  artifacts/  verdicts/  checkpoints/       outputs (start empty)
```

## One-time setup
1. Clone your CyberRx repo locally.
2. Copy `CLAUDE.md`, `orchestration/`, and `workspace/` from this bundle into the **repo root**.
   (If you already have a `CLAUDE.md`, merge this one's content into it.)
3. Install the Claude Code CLI and make sure `git` is set up in the repo.
4. From the repo root: `claude`

## Run order (matches launch-prompts.md)
1. **Cartography first.** Paste launch prompt #1. It builds `appjsx-index.json` without ever
   loading the whole `App.jsx`. **Open the index and sanity-check it** — all 18 pages present,
   line ranges sensible. Everything downstream depends on this being right.
2. **Smoke-test M0.** Paste prompt #2. This runs the security tasks through the full
   dispatch -> validate -> checkpoint cycle with one worker, so you confirm the loop works before
   going wide. For this pass you can effectively be the manager yourself.
3. **Extend + run.** Paste prompt #3 (or #4 first if you want to review the full plan before any
   code changes). The Decomposer fills in M1-M6; the manager runs the loop with milestone gating.

## The two things most likely to bite you
- **A bad cartography index** -> every UI task inherits wrong line ranges. Verify in step 1.
- **Validator criteria for non-user-story tasks** (security, data model) -> skim the
  `acceptance_criteria` in `task-board.json` and adjust to your real definition of done.

## Keeping context small (the whole point)
- Run milestones in separate CLI sessions; `/clear` between them. State lives in `task-board.json`
  + `checkpoints/`, not in the session.
- Workers read App.jsx by line range only (`sed -n 'START,ENDp' src/App.jsx`).
- Workers read one assessment chunk, not the whole doc.
- The manager references `artifacts/T-xxx.out` by path; it never inlines outputs.

## If you still hit "context window limit"
It's almost always a task touching too much of App.jsx. Narrow its line range or split the page
extraction further, then retry. Lower `token_budget` as the first lever.
