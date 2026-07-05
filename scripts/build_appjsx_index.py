#!/usr/bin/env python3
"""Generate workspace/context/appjsx-index.json — T-000 (Code Cartography).

Reads frontend/src/App.jsx ONCE inside this script (a Python process — not the
LLM context) and emits a JSON page-map that lets downstream workers read only
the slice they need.

Adds, vs. the seed index:
  * schema_version
  * exact, validated line_range per component (end = next_func_start - 1)
  * anchor_signature (first ~80 chars of the function-definition line)
  * complete coverage including post-export region (lines 24,021-24,559)
  * SetupBot range (filled in — was a gap in the seed)
  * BrianaBar, Atk*, Cjd*, NerionApp (root!), ExposureColumnChart,
    ExposureModelCard — missing from the seed
  * concrete local_state (useState/useRef names) per component
  * concrete shared_state_used (props.X destructuring)
  * cross_refs: top-level constants/components referenced from inside
  * split_risk: LOW/MEDIUM/HIGH heuristic
  * accurate total_lines (24,559) and file SHA-256
  * accurate generation timestamp
"""
import hashlib
import json
import re
import subprocess
from datetime import datetime, timezone
from pathlib import Path

SRC = Path("/sessions/trusting-magical-pasteur/mnt/Cyber-Rx/frontend/src/App.jsx")
OUT_DIR = Path("/sessions/trusting-magical-pasteur/mnt/Cyber-Rx/workspace/context")
OUT_FILE = OUT_DIR / "appjsx-index.json"

text = SRC.read_text(encoding="utf-8")
lines = text.split("\n")
# `split("\n")` returns N+1 entries when the file ends with a newline. Drop
# that trailing empty so total_lines matches `wc -l`.
if lines and lines[-1] == "":
    lines = lines[:-1]
total_lines = len(lines)
file_sha256 = hashlib.sha256(text.encode("utf-8")).hexdigest()
gen_iso = datetime.now(timezone.utc).strftime("%Y-%m-%dT%H:%M:%SZ")

# Try to get git HEAD for provenance.
try:
    head = subprocess.check_output(
        ["git", "-C", "/sessions/trusting-magical-pasteur/mnt/Cyber-Rx", "rev-parse", "HEAD"],
        stderr=subprocess.DEVNULL,
    ).decode().strip()
except Exception:
    head = None

# ----------------------------------------------------------------------
# Pass 1: find every top-level definition (function, var, let, const, export).
# Line numbers are 1-indexed for sed/grep compatibility.
# ----------------------------------------------------------------------
FN_RE  = re.compile(r"^function\s+([A-Z][A-Za-z0-9_]*)\s*\(")
VAR_RE = re.compile(r"^var\s+([A-Z_][A-Za-z0-9_]*)\s*=")
EXPORT_RE = re.compile(r"^export\s+default\s+([A-Za-z0-9_]+)")

functions = []   # [(line_no, name)]
var_defs  = []   # [(line_no, name)] — only ALL_CAPS or PascalCase top-level vars
export_default_line = None
export_default_name = None

for i, raw in enumerate(lines, start=1):
    m = FN_RE.match(raw)
    if m:
        functions.append((i, m.group(1)))
        continue
    m = VAR_RE.match(raw)
    if m:
        var_defs.append((i, m.group(1)))
        continue
    m = EXPORT_RE.match(raw)
    if m:
        export_default_line = i
        export_default_name = m.group(1)

# All top-level constant/dataset names — used downstream to detect cross-refs
# inside each component body.
TOP_LEVEL_NAMES = {name for _, name in var_defs}
COMPONENT_NAMES = {name for _, name in functions}

# ----------------------------------------------------------------------
# Pass 2: build accurate line_ranges. A function's range ends at the line
# BEFORE the next top-level definition of ANY kind (function OR var), so
# data constants interleaved between functions don't inflate the function
# LOC (matters for split-risk scoring of small utility components).
# ----------------------------------------------------------------------
_all_top_starts = sorted(
    [ln for ln, _ in functions] + [ln for ln, _ in var_defs]
)

def _next_top_start(after_line):
    """First top-level definition line strictly greater than after_line."""
    for s in _all_top_starts:
        if s > after_line:
            return s
    return total_lines + 1

def func_range(idx):
    start = functions[idx][0]
    end = _next_top_start(start) - 1
    return start, end

# ----------------------------------------------------------------------
# Pass 3: per-component analysis (useState/useRef, props, cross-refs).
# Each component's body is a slice of `lines` — only the slice is scanned,
# never the whole file at once for the analysis loop.
# ----------------------------------------------------------------------
USE_STATE_RE = re.compile(r"var\s+_([A-Za-z0-9_]+)\s*=\s*useState\s*\(")
USE_REF_RE   = re.compile(r"var\s+([A-Za-z0-9_]+)\s*=\s*useRef\s*\(")
USE_EFFECT_RE = re.compile(r"\buseEffect\s*\(")
# Names destructured from props (this codebase uses `props.X` reads directly)
PROPS_DOT_RE = re.compile(r"\bprops\.([A-Za-z0-9_]+)")
# `var foo = props.foo;` pattern is common — already captured by PROPS_DOT_RE

def analyse(start, end):
    """Return dict of structural info for body slice [start, end] inclusive."""
    body = "\n".join(lines[start - 1 : end])

    # local state — collect var-name suffixes from useState calls
    use_state_pairs = []
    for m in re.finditer(
        r"var\s+_([A-Za-z0-9_]+)\s*=\s*useState\s*\(",
        body,
    ):
        use_state_pairs.append(m.group(1))
    # also catch the conventional pair-unpacking like
    # `var _s0=useState(_initialStep); var step=_s0[0]; var setStep=_s0[1];`
    state_names = sorted(set(use_state_pairs))

    refs = sorted(set(USE_REF_RE.findall(body)))
    use_effect_count = len(USE_EFFECT_RE.findall(body))

    props_used = sorted(set(PROPS_DOT_RE.findall(body)))

    # Cross-references to other top-level names (components or constants).
    # Exclude the component's own name.
    referenced = set()
    for name in TOP_LEVEL_NAMES | COMPONENT_NAMES:
        if re.search(r"\b" + re.escape(name) + r"\b", body):
            referenced.add(name)
    return {
        "local_state": state_names,
        "refs": refs,
        "use_effect_count": use_effect_count,
        "props_used": props_used,
        "cross_refs": sorted(referenced),
        "loc": end - start + 1,
    }

# ----------------------------------------------------------------------
# Pass 4: classify split-risk per component.
#   LOW    — leaf-ish: small LoC, few cross-refs, no setRoot* writes
#   MEDIUM — moderate cross-refs, reads sharedProps, no/few root mutations
#   HIGH   — tightly entangled: many root cross-refs OR writes setRoot*/setExecActions
# ----------------------------------------------------------------------
SET_ROOT_RE = re.compile(r"\bset(Root[A-Z][A-Za-z0-9_]*|ExecActions|Page|Phase)\b")

def split_risk(body, info):
    mutates_root = bool(SET_ROOT_RE.search(body))
    n_cross = len(info["cross_refs"])
    loc = info["loc"]
    if mutates_root or n_cross >= 25 or loc > 1500:
        return "HIGH"
    if n_cross >= 10 or loc > 400 or info["use_effect_count"] >= 3:
        return "MEDIUM"
    return "LOW"

# ----------------------------------------------------------------------
# Build component records.
# ----------------------------------------------------------------------
# NAV map: id → label/icon (parsed from the NAV array spanning ~lines 113-132)
NAV_BLOCK = "\n".join(lines[112:132])
nav_map = {}
for m in re.finditer(
    r'\{id:\s*"([^"]+)",\s*label:\s*"([^"]+)",\s*icon:\s*"([^"]*)",\s*mod:\s*"([^"]*)"',
    NAV_BLOCK,
):
    nav_map[m.group(1)] = {"label": m.group(2), "icon": m.group(3), "mod": m.group(4)}

# Map: component name → (nav_id, "routed_by")
ROUTE_MAP = {
    "Landing":        ("landing",       "phase==='landing'"),
    "Login":          ("login",         "phase==='login'"),
    "MFA":            ("mfa",           "phase==='mfa'"),
    "Setup":          ("setup",         "phase==='app' && page==='setup'"),
    "Home":           ("home",          "page==='home'"),
    "DashHub":        ("hub",           "page==='hub'"),
    "BizLines":       ("bizlines",      "page==='bizlines'"),
    "AppMap":         ("appmap",        "page==='appmap'"),
    "CISODash":       ("dashboard",     "page==='dashboard'"),
    "CRODash":        ("cro",           "page==='cro'"),
    "CFODash":        ("cfo",           "page==='cfo'"),
    "BoardDash":      ("boarddash",     "page==='boarddash'"),
    "Controls":       ("controls",      "page==='controls'"),
    "ClaimLifecycle": ("assets",        "page==='assets'"),
    "VendorEcosystem":("vendormap",     "page==='vendormap'"),
    "Scoring":        ("scoring",       "page==='scoring'"),
    "Evidence":       ("evidence",      "page==='evidence'"),
    "Board":          ("board",         "page==='board'"),
    "Execution":      ("execution",     "page==='execution'"),
    "CrownJewelsModule": ("crownjewels","page==='crownjewels'"),
    "AttackPathsModule": ("attackpaths","page==='attackpaths'"),
    "BusinessMapDash":("bizmap",        "page==='bizmap'"),
    "NerionAPIAdapter":("apiadapter",  "page==='apiadapter'"),
    "ProcessFlowDash":("processflow",   "page==='processflow'"),
    "DocDash":        ("docdash",       "page==='docdash'"),
    "CrownJewelMap":  ("crown",         "page==='crown'"),
    "WelcomePage":    (None,            "phase==='welcome'"),
    "NerionApp":     ("__root__",      "root component (default export)"),
}

# Components that are utility, not routed pages
UTILITY = {
    "CmmiBadge", "CmmiBar", "InfoModal", "JustifiedStat", "Btn", "Card", "SH",
    "StatCard", "Input", "Spark", "DrilldownModal", "NonDemoPlaceholder",
    "CisTag", "DocValidationAgent", "MetricDetailModal", "ComplianceReport",
    "MitreTab", "ProcessControlMap", "DashNav", "QuickNav", "Shell",
    "QuickVoicePicker", "SetupBot", "BrianaBar",
    "ModHBar", "ModBadge", "AtkNodeBox", "AtkCJNode", "AtkEdgeLayer",
    "AtkDetailPanel", "CjdToolCard", "CjdDiscoverTab", "CjdClassifyTab",
    "CjdMapTab", "CjdFindingsTab",
    "Assets",  # subcomponent (NOT the assets page — that's ClaimLifecycle per NAV)
    "ExposureColumnChart", "ExposureModelCard",
}

components = []
for idx, (lineno, name) in enumerate(functions):
    start, end = func_range(idx)
    sig_line = lines[lineno - 1].strip()
    anchor = sig_line[:80]
    info = analyse(start, end)
    body = "\n".join(lines[start - 1 : end])
    risk = split_risk(body, info)

    routed_by = ROUTE_MAP.get(name, (None, None))[1]
    nav_id   = ROUTE_MAP.get(name, (None, None))[0]
    role = "page" if name in ROUTE_MAP and ROUTE_MAP[name][0] not in (None, "__root__") \
        else "auth_flow" if name in {"Landing", "Login", "MFA"} \
        else "root" if name == "NerionApp" \
        else "utility"

    nav_info = nav_map.get(nav_id, {}) if nav_id and nav_id != "__root__" else {}

    components.append({
        "name": name,
        "role": role,
        "nav_id": nav_id if nav_id and nav_id != "__root__" else None,
        "nav_label": nav_info.get("label"),
        "nav_icon": nav_info.get("icon"),
        "nav_mod":  nav_info.get("mod"),
        "routed_by": routed_by,
        "line_range": [start, end],
        "loc": info["loc"],
        "function_definition_line": lineno,
        "anchor_signature": anchor,
        "local_state": info["local_state"],
        "refs": info["refs"],
        "use_effect_count": info["use_effect_count"],
        "props_used": info["props_used"],
        "cross_refs": info["cross_refs"],
        "split_risk": risk,
    })

# ----------------------------------------------------------------------
# Top-level data / constants section (the embedded datasets).
# Line ranges = up to the next var def or function def.
# ----------------------------------------------------------------------
all_top = sorted(
    [(ln, name, "function") for ln, name in functions]
    + [(ln, name, "var") for ln, name in var_defs],
    key=lambda t: t[0],
)
constants = []
for i, (ln, name, kind) in enumerate(all_top):
    if kind != "var":
        continue
    end = all_top[i + 1][0] - 1 if i + 1 < len(all_top) else total_lines
    sig = lines[ln - 1].strip()[:80]
    constants.append({
        "name": name,
        "line_range": [ln, end],
        "loc": end - ln + 1,
        "anchor_signature": sig,
    })

# ----------------------------------------------------------------------
# Coverage check: every line from 1..total_lines must fall inside some
# top-level definition OR be flagged as a header region.
# ----------------------------------------------------------------------
covered = [False] * (total_lines + 2)
for c in components:
    s, e = c["line_range"]
    for k in range(s, e + 1):
        covered[k] = True
for c in constants:
    s, e = c["line_range"]
    for k in range(s, e + 1):
        covered[k] = True

# Identify uncovered runs (these will be header / import / comment regions
# before the first top-level definition).
uncovered_ranges = []
k = 1
while k <= total_lines:
    if not covered[k]:
        run_start = k
        while k <= total_lines and not covered[k]:
            k += 1
        uncovered_ranges.append([run_start, k - 1])
    else:
        k += 1

# ----------------------------------------------------------------------
# Find the root component's shared-state location precisely.
# NerionApp body holds all useState calls for the root state.
# ----------------------------------------------------------------------
root = next((c for c in components if c["name"] == "NerionApp"), None)
shared_state_root = None
if root:
    s, e = root["line_range"]
    # The block of `var _sN=useState(...)` calls is the shared-state root.
    # Find first and last useState line inside the component.
    body_lines = lines[s - 1 : e]
    state_lines = [s + i for i, ln in enumerate(body_lines) if "useState(" in ln]
    if state_lines:
        shared_state_root = {
            "component": "NerionApp",
            "useState_line_range": [state_lines[0], state_lines[-1]],
            "useState_count": len(state_lines),
            "function_range": [s, e],
        }

# ----------------------------------------------------------------------
# Assemble the JSON.
# ----------------------------------------------------------------------
doc = {
    "schema_version": "2.0",
    "metadata": {
        "generated_by": "T-000 (Code Cartography)",
        "regeneration_note": (
            "Replaces seed index. Adds schema_version, anchor_signatures, "
            "exact line_ranges, concrete local_state/props_used/cross_refs, "
            "split_risk classification, full coverage including post-export "
            "region (lines 24021-24559), and missing components "
            "(SetupBot, BrianaBar, NerionApp, Atk*, Cjd*, Exposure*)."
        ),
        "file_path": "frontend/src/App.jsx",
        "total_lines": total_lines,
        "file_sha256": file_sha256,
        "git_head": head,
        "generated_at": gen_iso,
        "extractor": "scripts/build_appjsx_index.py",
        "rules": [
            "Components are listed in source order.",
            "line_range is [start, end] inclusive, 1-indexed.",
            "A worker MUST verify anchor_signature matches before trusting range.",
            "split_risk is a HEURISTIC, not a guarantee — re-evaluate during M6 planning.",
            "cross_refs include both component references and top-level constant references.",
        ],
    },
    "navigation": {
        "nav_line_range": [113, 132],
        "pages": nav_map,
    },
    "shared_state_root": shared_state_root,
    "export_default": {
        "name": export_default_name,
        "line": export_default_line,
        "note": (
            "Note: export sits at line "
            f"{export_default_line}, but ExposureColumnChart and ExposureModelCard "
            "(both consumed by CFODash) are declared AFTER the export "
            "(lines 24198 and 24344). Hoisting makes this work, but the "
            "M6 split must preserve this ordering or move declarations above export."
        ),
    },
    "constants": constants,
    "components": components,
    "coverage": {
        "total_lines": total_lines,
        "covered_lines": sum(1 for v in covered[1: total_lines + 1] if v),
        "uncovered_ranges": uncovered_ranges,
        "uncovered_note": (
            "Uncovered ranges are pre-definition header regions "
            "(imports, top-level comments) — safe to ignore for the M6 split."
        ),
    },
    "split_planning": None,  # filled in below
    "deprecations_vs_seed": [
        "Seed metadata.total_lines was 24559 but timestamp dated 2025-01-19 — both replaced.",
        "Seed listed SetupBot only as a utility with line=17333 — now has full range [17333, 18518].",
        "Seed omitted NerionApp (root component) — included.",
        "Seed omitted BrianaBar (20796), Atk* (21853-22059), Cjd* (22188-22576), "
        "ExposureColumnChart (24198), ExposureModelCard (24344) — included.",
        "Seed's local_state and shared_state_used were placeholder strings — replaced with extracted arrays.",
        "Seed had no anchor_signature, no schema_version, no SHA-256, no cross_refs — added.",
    ],
}

# Build split_planning after components are scored.
_eligible = [c for c in components if c["role"] in {"utility", "page", "auth_flow"}]
_ordered = sorted(_eligible, key=lambda c: (
    {"LOW": 0, "MEDIUM": 1, "HIGH": 2}[c["split_risk"]],
    c["loc"],
))
_ord_names = [c["name"] for c in _ordered]
doc["split_planning"] = {
    "recommended_order": _ord_names,
    "extract_first": _ord_names[:8],
    "extract_last":  _ord_names[-5:],
    "do_not_extract_yet": [c["name"] for c in components if c["split_risk"] == "HIGH"],
    "method": (
        "Components are ordered LOW → MEDIUM → HIGH split-risk, then by LOC asc. "
        "Start at extract_first; finish at extract_last; NerionApp stays in App.jsx "
        "until everything else has been moved."
    ),
}

OUT_DIR.mkdir(parents=True, exist_ok=True)
OUT_FILE.write_text(json.dumps(doc, indent=2), encoding="utf-8")
print(f"Wrote {OUT_FILE}  ({OUT_FILE.stat().st_size:,} bytes)")
print(f"  components = {len(components)}")
print(f"  constants  = {len(constants)}")
print(f"  covered    = {doc['coverage']['covered_lines']:,} / {total_lines:,} lines")
print(f"  uncovered  = {len(uncovered_ranges)} runs")
