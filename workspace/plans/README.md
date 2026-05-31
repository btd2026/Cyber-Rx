# `workspace/plans/` — month-by-month task contracts

This directory holds the decomposed task contracts for the six-month
production-readiness sequence in `PRODUCTION_PROMPT.md`. Each plan is a
machine-readable JSON document that the Manager / Worker / Validator team
described in `CLAUDE.md` consumes directly — workers pick up a task by ID,
read only the line ranges named in the task's `context_manifest`, do the work
on a per-task branch, and the four-concern validator team (Acceptance,
Security, No-regression, Integration) gates the merge.

## Files

| File | Weeks | Tasks | ACC | Topic |
|---|--:|--:|--:|---|
| `month-1-2-risk-correlation-engine.json` | 1-8  | 15 | 14 | Data-model migrations + correlation engine + narrative UI |
| `month-3-cio-clo-dashboards.json`        | 9-12 | 15 | 12 | CIO dashboard + CLO dashboard |
| `month-4-separation-and-security.json`   | 13-16 | 11 | 12 | JWT, CORS, org isolation, audit split, evidence ingestion |
| `month-5-exception-and-evidence.json`    | 17-20 |  9 | 11 | Exception approval chain + control drift detection |
| `month-6-polish-and-handoff.json`        | 21-24 | 67 | 10 | App.jsx split + Board exports + docs + SOC2 readiness |

**Total: 117 tasks, 59 acceptance criteria.**

## Schema (v1.0)

Every plan has the same top-level shape:

```jsonc
{
  "schema_version": "1.0",
  "metadata": {
    "month": 1, "title": "...",
    "weeks": [1, 8],
    "appjsx_index_sha256": "...",   // pins the plan to a known App.jsx state
    "source_of_truth":   "COVERAGE_ASSESSMENT.md",
    "execution_prompt":  "PRODUCTION_PROMPT.md"
  },
  "goal": "One sentence outcome",
  "definition_of_done": [ "..." ],
  "acceptance_criteria": [
    { "id": "ACC-MM-NN", "criterion": "...", "validator": "schema_check | security_test | e2e_test | ..." }
  ],
  "context_manifest": {
    "must_read":        [ ... files + App.jsx slices a worker on this month should consult ... ],
    "should_not_read":  [ "frontend/src/App.jsx in full — use the index" ]
  },
  "tasks": [
    {
      "id": "T-MMM",
      "title": "...",
      "depends_on": [],   "blocks": [],
      "owner_role": "worker",
      "context_manifest": { "must_read": [ ... task-specific slices ... ] },
      "artifact_paths": [ ... ],
      "git_branch": "task/T-MMM-...",
      "estimated_effort": "0.5d",
      "risk": "LOW|MEDIUM|HIGH",
      "anchor": "function CISODash(props) {",       // M6 split tasks only
      "line_range_at_plan_time": [7326, 8407],       // M6 split tasks only
      "acceptance": [ "ACC-MM-NN", ... ]
    }
  ],
  "validator_team_checks": {
    "acceptance":    "...",
    "security":      "...",
    "no_regression": "...",
    "integration":   "..."
  },
  "risks":            [ { "risk": "...", "mitigation": "..." } ],
  "out_of_scope":     [ ... ],
  "stop_conditions":  [ ... ]
}
```

Per-task `context_manifest.must_read` line ranges and anchors are extracted
from `workspace/context/appjsx-index.json` at plan-build time so plans and
the cartography can't drift out of sync.

## Worker usage

```bash
# 1. Pick a task by ID
jq '.tasks[] | select(.id=="T-112")' workspace/plans/month-1-2-risk-correlation-engine.json

# 2. Read its context manifest — open only those files/slices
jq '.tasks[] | select(.id=="T-112") | .context_manifest.must_read' \
   workspace/plans/month-1-2-risk-correlation-engine.json

# 3. Cut the per-task branch
git checkout -b task/T-112-correlation-engine

# 4. Implement; produce the files in artifact_paths

# 5. The validator team checks acceptance + security + no-regression + integration
python3 scripts/validate_month_plans.py   # plan-level
python3 scripts/validate_appjsx_index.py  # if you touched App.jsx
```

## Validator team mapping

Each plan's `validator_team_checks` block maps directly to the four-concern
validator team described in `CLAUDE.md`:

- **Acceptance** validator — checks every `ACC-MM-NN` for the month has a
  passing test in one of the artifact_paths.
- **Security** validator — checks the month's auth/isolation invariants.
- **No-regression** validator — the BCBS demo flow stays green at every
  commit.
- **Integration** validator — an end-to-end test that ties the month's
  outputs to the prior month's contract.

A task passes only if **all four** of its plan's validator concerns hold.

## Regenerating the plans

```bash
python3 scripts/build_month_plans.py   # rewrites all 5 files
python3 scripts/validate_month_plans.py  # exits non-zero on any drift
```

The build script pins each plan to the current
`workspace/context/appjsx-index.json` SHA-256. If the index regenerates,
re-run `build_month_plans.py` so the M6 split-task line ranges and anchors
update to match.

## What this is and what it isn't

- **It is:** a structured handoff for the orchestration team described in
  CLAUDE.md. Every contract is small enough for one worker on one branch.
- **It is not:** a substitute for the assessment document. `goal` and
  `acceptance_criteria` summarize what the assessment already says — the
  assessment is still the source of truth for *why*.
- **It is not:** a Gantt chart. `estimated_effort` is in person-days, not a
  promise. The week ranges are sequence boundaries, not commitments.

## Cross-month dependencies (informal)

```
Month 1-2 ──▶ Month 3  (CIO/CLO dashes consume the correlation engine)
Month 1-2 ──▶ Month 4  (evidence ingestion populates the same entities)
Month 4   ──▶ Month 5  (exception approval requires JWT + role enforcement)
Month 4   ──▶ Month 6  (Board exports require the auth middleware)
all       ──▶ Month 6  (App.jsx split happens after every new dashboard has been added)
```

A plan-spanning Manager run would topologically sort tasks across months
using `metadata.month` + per-task `depends_on`; this directory is the input
to that scheduler.
