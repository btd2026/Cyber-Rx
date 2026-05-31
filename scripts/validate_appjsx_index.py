#!/usr/bin/env python3
"""Validate workspace/context/appjsx-index.json against the live App.jsx.

Checks:
  1. metadata.total_lines == wc -l of App.jsx
  2. metadata.file_sha256 matches current file
  3. Every component's anchor_signature is the prefix of the line at
     function_definition_line (1-indexed)
  4. line_range ends at exactly the line before the next top-level definition
  5. No overlapping component ranges
  6. recommended_order names all exist in components
  7. shared_state_root.useState_count matches grep result

Exits non-zero on any failure so the orchestration validator can gate on it.
"""
import hashlib
import json
import re
import subprocess
import sys
from pathlib import Path

ROOT = Path("/sessions/trusting-magical-pasteur/mnt/Cyber-Rx")
SRC = ROOT / "frontend/src/App.jsx"
IDX = ROOT / "workspace/context/appjsx-index.json"

text = SRC.read_text(encoding="utf-8")
lines = text.split("\n")
if lines and lines[-1] == "":
    lines = lines[:-1]
total_lines = len(lines)
file_sha = hashlib.sha256(text.encode("utf-8")).hexdigest()

idx = json.loads(IDX.read_text(encoding="utf-8"))

failures = []
ok = []

def check(cond, msg):
    (ok if cond else failures).append(msg)

# 1. total_lines
check(
    idx["metadata"]["total_lines"] == total_lines,
    f"total_lines == {total_lines}",
)
# 2. sha256
check(
    idx["metadata"]["file_sha256"] == file_sha,
    f"file_sha256 matches ({file_sha[:16]}...)",
)

# 3. anchor signatures
sig_failures = []
for c in idx["components"]:
    ln = c["function_definition_line"]
    actual = lines[ln - 1] if 0 <= ln - 1 < total_lines else ""
    if not actual.startswith(c["anchor_signature"]):
        sig_failures.append(
            f"  {c['name']} @ line {ln}: anchor mismatch\n"
            f"     expected prefix: {c['anchor_signature']!r}\n"
            f"     actual line:     {actual[:90]!r}"
        )
check(
    not sig_failures,
    f"all {len(idx['components'])} component anchor_signatures match" if not sig_failures
    else "anchor signature failures:\n" + "\n".join(sig_failures),
)

# 4. line_range endings precede next top-level definition
fn_starts = sorted([c["function_definition_line"] for c in idx["components"]])
range_failures = []
for c in idx["components"]:
    s, e = c["line_range"]
    # find first fn_start strictly greater than s
    next_fns = [n for n in fn_starts if n > s]
    if next_fns:
        if e >= next_fns[0]:
            range_failures.append(
                f"  {c['name']}: end={e} >= next fn start {next_fns[0]}"
            )
check(
    not range_failures,
    "no component range overlaps the next function start" if not range_failures
    else "range overlap failures:\n" + "\n".join(range_failures),
)

# 5. no component ranges overlap each other
sorted_comps = sorted(idx["components"], key=lambda c: c["line_range"][0])
overlap_failures = []
for a, b in zip(sorted_comps, sorted_comps[1:]):
    if a["line_range"][1] >= b["line_range"][0]:
        overlap_failures.append(f"  {a['name']} [{a['line_range']}] overlaps {b['name']} [{b['line_range']}]")
check(
    not overlap_failures,
    "no component ranges overlap" if not overlap_failures
    else "overlap failures:\n" + "\n".join(overlap_failures),
)

# 6. recommended_order names all exist
component_names = {c["name"] for c in idx["components"]}
missing = [n for n in idx["split_planning"]["recommended_order"] if n not in component_names]
check(
    not missing,
    f"recommended_order references {len(idx['split_planning']['recommended_order'])} known components"
    if not missing else f"recommended_order has unknown names: {missing}",
)

# 7. shared_state_root useState_count matches grep
ssr = idx["shared_state_root"]
fs, fe = ssr["function_range"]
body = "\n".join(lines[fs - 1: fe])
n_use_state = len(re.findall(r"\buseState\(", body))
check(
    n_use_state == ssr["useState_count"],
    f"shared_state_root.useState_count == {ssr['useState_count']} (grep finds {n_use_state})",
)

# 8. covered_lines + len(uncovered) >= total
cov = idx["coverage"]
uncov_total = sum(b - a + 1 for a, b in cov["uncovered_ranges"])
check(
    cov["covered_lines"] + uncov_total == total_lines,
    f"coverage accounting: {cov['covered_lines']} covered + {uncov_total} uncovered = {total_lines}",
)

# Output
print(f"Validating {IDX.name} against {SRC.name}")
print(f"  file SHA-256: {file_sha[:16]}...")
print(f"  total lines:  {total_lines}")
print()
for line in ok:
    print(f"  OK    {line}")
for line in failures:
    print(f"  FAIL  {line}")
print()
if failures:
    print(f"FAILED: {len(failures)} check(s) did not pass.")
    sys.exit(1)
print(f"OK: all {len(ok)} checks passed.")
