# Launch Prompts — copy/paste into the Claude Code CLI

Launch the CLI from the **repo root** (where `CLAUDE.md` lives) so it auto-loads context:

```bash
cd /path/to/cyberrx-repo
claude
```

Then paste ONE of these.

## 1) First run — cartography only (DO THIS FIRST, then review)
```
Read CLAUDE.md. Run only task T-000 from workspace/task-board.json, following
orchestration/prompts/worker.md. Build workspace/context/appjsx-index.json by scanning
src/App.jsx structurally in bounded chunks — never load the whole file. Then stop and show me
the index so I can review it before anything else touches App.jsx.
```

## 2) Smoke-test M0 (after you've reviewed the index)
```
Read CLAUDE.md and act as the Manager (orchestration/prompts/manager.md). Run only the M0 tasks
in workspace/task-board.json (T-001..T-004) one at a time: dispatch as a worker, then run the
four validators, then checkpoint. Stop after M0 and give me a status line.
```

## 3) Full run
```
Read CLAUDE.md and act as the Manager (orchestration/prompts/manager.md). First run the
Decomposer (orchestration/prompts/decomposer.md) to extend workspace/task-board.json with
M1..M6, then run your loop. Gate M2/M3 behind M1. Checkpoint after every change and emit a
status line per milestone. Escalate any blocker to me instead of guessing.
```

## 4) Extend the plan only (no execution)
```
Read CLAUDE.md and act as the Decomposer (orchestration/prompts/decomposer.md). Append M1..M6
Task Contracts to workspace/task-board.json in the same shape as the seed tasks. For M6, create
one extraction task per page using line ranges from workspace/context/appjsx-index.json. Then
stop and summarize the plan.
```

## Tips
- Use `/clear` between milestones to keep the session's context small.
- If a worker hits a context limit, it's touching too much of App.jsx — tighten the line range.
- Run heavy milestones in separate sessions; the task board + checkpoints carry state across them.
