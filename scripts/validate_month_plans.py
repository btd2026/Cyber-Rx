#!/usr/bin/env python3
"""Validate workspace/plans/month-*.json — schema, ID uniqueness, DAG, anchors.

Checks:
  1. Every plan has required top-level keys.
  2. Task IDs are globally unique across all five plans.
  3. depends_on / blocks reference real task IDs.
  4. Dependency graph contains no cycles (per-plan).
  5. Every task's `acceptance` IDs exist in the plan's acceptance_criteria.
  6. Every line_range_at_plan_time / anchor pair still matches the live App.jsx
     (i.e. M6 split tasks still point at valid slices).
  7. Plan-level appjsx_index_sha256 matches the current
     workspace/context/appjsx-index.json.
"""
from __future__ import annotations
import glob, hashlib, json, sys
from collections import defaultdict
from pathlib import Path

REPO = Path("/sessions/trusting-magical-pasteur/mnt/Cyber-Rx")
PLANS_DIR = REPO / "workspace/plans"
APP = REPO / "frontend/src/App.jsx"
IDX = REPO / "workspace/context/appjsx-index.json"

REQUIRED_TOP_LEVEL = {
    "schema_version", "metadata", "goal", "definition_of_done",
    "acceptance_criteria", "context_manifest", "tasks",
    "validator_team_checks", "risks", "out_of_scope", "stop_conditions",
}
REQUIRED_TASK_KEYS = {"id","title","depends_on","blocks","owner_role","artifact_paths","git_branch","estimated_effort","risk","acceptance"}

idx_sha = hashlib.sha256(IDX.read_bytes()).hexdigest()
app_lines = APP.read_text(encoding="utf-8").split("\n")
if app_lines and app_lines[-1] == "":
    app_lines = app_lines[:-1]

all_failures: list[str] = []
all_ok: list[str] = []
def ok(msg):  all_ok.append(msg)
def fail(msg): all_failures.append(msg)

global_task_ids: dict[str, str] = {}  # id → plan filename

plan_files = sorted(PLANS_DIR.glob("month-*.json"))
print(f"Found {len(plan_files)} plan(s) in {PLANS_DIR}\n")

for pf in plan_files:
    doc = json.loads(pf.read_text(encoding="utf-8"))
    name = pf.name

    missing = REQUIRED_TOP_LEVEL - set(doc.keys())
    if missing:
        fail(f"{name}: missing top-level keys: {sorted(missing)}")
    else:
        ok(f"{name}: schema keys present")

    # appjsx_index_sha256 freshness
    plan_sha = doc.get("appjsx_index_sha256") or doc.get("metadata", {}).get("appjsx_index_sha256")
    if plan_sha != idx_sha:
        fail(f"{name}: appjsx_index_sha256 doesn't match current index (plan {plan_sha[:8] if plan_sha else 'None'} vs current {idx_sha[:8]})")
    else:
        ok(f"{name}: appjsx_index_sha256 matches current index")

    # ── tasks ──
    tasks_by_id = {t["id"]: t for t in doc["tasks"]}
    # ID uniqueness within plan
    if len(tasks_by_id) != len(doc["tasks"]):
        fail(f"{name}: duplicate task IDs within plan")
    else:
        ok(f"{name}: {len(tasks_by_id)} task IDs unique within plan")

    # ID uniqueness across all plans
    for tid in tasks_by_id:
        if tid in global_task_ids:
            fail(f"{name}: task {tid} already used in {global_task_ids[tid]}")
        else:
            global_task_ids[tid] = name

    # required task keys
    bad_keys = [t["id"] for t in doc["tasks"] if not REQUIRED_TASK_KEYS.issubset(t.keys())]
    if bad_keys:
        fail(f"{name}: tasks missing required keys: {bad_keys[:5]}{'...' if len(bad_keys)>5 else ''}")
    else:
        ok(f"{name}: all tasks have required keys")

    # depends_on / blocks reference real IDs (within plan)
    bad_refs = []
    for t in doc["tasks"]:
        for ref in t.get("depends_on", []) + t.get("blocks", []):
            if ref not in tasks_by_id:
                bad_refs.append((t["id"], ref))
    if bad_refs:
        fail(f"{name}: invalid task refs: {bad_refs[:5]}")
    else:
        ok(f"{name}: depends_on/blocks reference real task IDs")

    # cycle detection — depth-first
    WHITE, GRAY, BLACK = 0, 1, 2
    color = {tid: WHITE for tid in tasks_by_id}
    cycle = []
    def dfs(u):
        color[u] = GRAY
        for v in tasks_by_id[u].get("depends_on", []):
            if color[v] == GRAY:
                cycle.append((u, v)); return
            if color[v] == WHITE:
                dfs(v)
                if cycle: return
        color[u] = BLACK
    for tid in tasks_by_id:
        if color[tid] == WHITE:
            dfs(tid)
            if cycle: break
    if cycle:
        fail(f"{name}: dependency cycle: {cycle}")
    else:
        ok(f"{name}: dependency graph is a DAG ({len(tasks_by_id)} nodes)")

    # acceptance criterion IDs
    acc_ids = {a["id"] for a in doc["acceptance_criteria"]}
    bad_acc = []
    for t in doc["tasks"]:
        for aid in t.get("acceptance", []):
            if aid not in acc_ids:
                bad_acc.append((t["id"], aid))
    if bad_acc:
        fail(f"{name}: tasks reference unknown acceptance IDs: {bad_acc[:5]}")
    else:
        ok(f"{name}: all task.acceptance IDs exist in plan.acceptance_criteria")

    # M6: anchor + line_range_at_plan_time validation
    anchor_failures = []
    for t in doc["tasks"]:
        anc = t.get("anchor")
        rng = t.get("line_range_at_plan_time")
        if anc and rng:
            line = app_lines[rng[0] - 1] if 0 <= rng[0] - 1 < len(app_lines) else ""
            if not line.startswith(anc):
                anchor_failures.append(f"{t['id']} ({anc[:40]}...) @ line {rng[0]}")
    if anchor_failures:
        fail(f"{name}: anchor mismatch: {anchor_failures[:5]}")
    elif any(t.get("anchor") for t in doc["tasks"]):
        anc_count = sum(1 for t in doc["tasks"] if t.get("anchor"))
        ok(f"{name}: {anc_count} anchor signatures match the live file")

    print()  # blank line between plans in the live log

print("──────────────────────────────────────────────────────────")
for line in all_ok:     print(f"  OK    {line}")
for line in all_failures: print(f"  FAIL  {line}")
print()
print(f"Total tasks across all plans: {len(global_task_ids)}")
if all_failures:
    print(f"FAILED: {len(all_failures)} check(s) did not pass.")
    sys.exit(1)
print(f"OK: all {len(all_ok)} checks passed.")
