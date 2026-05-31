#!/usr/bin/env python3
"""Decomposer — produces workspace/plans/month-{N}-{slug}.json for each of the
five production-readiness milestones in PRODUCTION_PROMPT.md.

Schema (v1.0):
  metadata          — month #, week range, source-of-truth pointers
  goal              — single-sentence outcome
  definition_of_done — how the manager knows the month is shipped
  acceptance_criteria — IDed, validator-checkable
  context_manifest  — files + App.jsx line ranges every worker on this month should consult
  tasks             — list of task contracts (T-MMM ids), each with:
       depends_on, blocks, owner_role, context_manifest, acceptance, validator_checks,
       artifact_paths, git_branch, estimated_effort, risk
  risks             — month-level risks
  out_of_scope      — explicit "not this month"
  stop_conditions   — things that require human sign-off

Every line-range reference into App.jsx is sourced from
workspace/context/appjsx-index.json so plans cannot drift from the cartography.
"""
from __future__ import annotations
import hashlib
import json
import subprocess
from datetime import datetime, timezone
from pathlib import Path

REPO = Path("/sessions/trusting-magical-pasteur/mnt/Cyber-Rx")
PLANS_DIR = REPO / "workspace/plans"
PLANS_DIR.mkdir(parents=True, exist_ok=True)

IDX = json.loads((REPO / "workspace/context/appjsx-index.json").read_text())

def comp(name):
    """Return the index record for a component (so we never hard-code line ranges)."""
    for c in IDX["components"]:
        if c["name"] == name:
            return c
    raise KeyError(name)

def slice_ref(name, reason):
    """Build a context-manifest entry that points at a component's slice."""
    c = comp(name)
    return {
        "path": "frontend/src/App.jsx",
        "line_range": c["line_range"],
        "anchor": c["anchor_signature"],
        "component": name,
        "reason": reason,
    }

try:
    git_head = subprocess.check_output(
        ["git", "-C", str(REPO), "rev-parse", "HEAD"], stderr=subprocess.DEVNULL,
    ).decode().strip()
except Exception:
    git_head = None

NOW = datetime.now(timezone.utc).strftime("%Y-%m-%dT%H:%M:%SZ")

COMMON_META = {
    "schema_version": "1.0",
    "generated_at": NOW,
    "generated_by": "Decomposer (manual run)",
    "git_head": git_head,
    "appjsx_index_sha256": hashlib.sha256(
        (REPO / "workspace/context/appjsx-index.json").read_bytes()
    ).hexdigest(),
    "source_of_truth": "COVERAGE_ASSESSMENT.md",
    "execution_prompt":  "PRODUCTION_PROMPT.md",
}

# ──────────────────────────────────────────────────────────────────────────
# Month 1-2 — Risk Correlation Engine
# ──────────────────────────────────────────────────────────────────────────
m12 = {
  **COMMON_META,
  "metadata": {
    **COMMON_META,
    "month": "1-2",
    "title": "Risk Correlation Engine",
    "weeks": [1, 8],
    "assessment_section": "§3 #2, §5 (data model), §9 Month 1-2",
    "production_prompt_clause": "Sequence step 1",
  },
  "goal": (
    "Stand up the data model + engine that turns a technical finding "
    "into an executive narrative with business-impact, framework citations, "
    "legal obligations, and owner assignment, exactly as shown in the "
    "assessment's Final Recommendation screenshot."
  ),
  "definition_of_done": [
    "Six new entities exist with migrations + rollbacks: BusinessProcess, Asset, "
    "DataObject, ThreatScenario, LegalObligation, ExecutiveOwner.",
    "Ten Tier-1 Crown Jewel BusinessProcess records are seeded for the BCBS demo tenant.",
    "POST /api/correlate accepts a findingId and returns the executive narrative "
    "in <300 ms p50 for the seeded data set.",
    "A 'Correlated Finding' route renders the narrative in <3 clicks from any executive dashboard.",
    "A healthcare CIO/CISO test viewer can answer 'what is this, who owns it, what's next?' "
    "in <30 seconds on the F-001 NASCO worked example.",
  ],
  "acceptance_criteria": [
    {"id": "ACC-12-01", "criterion": "BusinessProcess table includes id, name, tier, owner_role, supportedBy[], createsDataObjects[], governedByControls[]", "validator": "schema_check"},
    {"id": "ACC-12-02", "criterion": "Asset table includes hostname/ip, type, applicationId[], dataClassification[], owner",                                                  "validator": "schema_check"},
    {"id": "ACC-12-03", "criterion": "DataObject supports types PHI/PII/PCI/Financial/Legal/Confidential with sensitivity + recordCount",                                       "validator": "schema_check"},
    {"id": "ACC-12-04", "criterion": "ThreatScenario references mitreTechnique[] and probability/impactLevel",                                                                  "validator": "schema_check"},
    {"id": "ACC-12-05", "criterion": "LegalObligation stores source (HIPAA/CMS/State/NAIC/Contract), citation, notificationTimeline, applicability[]",                          "validator": "schema_check"},
    {"id": "ACC-12-06", "criterion": "ExecutiveOwner assigns a roleId per scope (processes[], controls[], risks[])",                                                            "validator": "schema_check"},
    {"id": "ACC-12-07", "criterion": "10 Tier-1 Crown Jewel processes seeded for demo tenant (Claims Adjudication, Enrollment, Provider Network, Care Mgmt, Payment Integrity, Member Services, Actuarial, Government Programs, Pharmacy/PBM, Compliance & Regulatory)", "validator": "seed_integrity_check"},
    {"id": "ACC-12-08", "criterion": "Sample LegalObligation seeds include OCR §164.400 (60-day notification), CMS 42 CFR §422.306(c)(1) (5-day), state DOI notification timelines",                                          "validator": "seed_integrity_check"},
    {"id": "ACC-12-09", "criterion": "POST /api/correlate accepts {findingId} and returns {findingId, businessProcess[], dataObjects[], threatScenario, frameworks[], legalObligations[], owner{remediation, oversight, legal}, auditEvidenceRequired}", "validator": "integration_test"},
    {"id": "ACC-12-10", "criterion": "Endpoint p50 latency <300 ms over 100 trials on seeded data",                                                                              "validator": "perf_test"},
    {"id": "ACC-12-11", "criterion": "Authenticated as a different org → 403; authenticated as same org → 200",                                                                  "validator": "security_test"},
    {"id": "ACC-12-12", "criterion": "Frontend route /correlated/:findingId renders the narrative matching the assessment's F-001 screenshot field-for-field",                  "validator": "visual_diff"},
    {"id": "ACC-12-13", "criterion": "From CISODash, CFODash, CRODash a row click opens the narrative in <3 clicks",                                                            "validator": "e2e_test"},
    {"id": "ACC-12-14", "criterion": "Healthcare CISO usability test: ≥4/5 testers identify owner + next step in <30s on the NASCO worked example",                              "validator": "user_test"},
  ],
  "context_manifest": {
    "must_read": [
      {"path": "COVERAGE_ASSESSMENT.md", "section": "§5 Recommended Data Model"},
      {"path": "COVERAGE_ASSESSMENT.md", "section": "§9 Final Recommendation (NASCO screenshot)"},
      {"path": "cyberrx-api/src/utils/db.js",                                  "reason": "Existing schema initializer; new entities slot in alongside it"},
      {"path": "cyberrx-api/src/routes/itsm.js",                               "reason": "Pattern for org-scoped routes; correlate endpoint follows same auth pattern"},
      slice_ref("CISODash",        "Findings render here today; correlate-button needs to attach to this row template"),
      slice_ref("CFODash",         "Financial exposure here today; engine output reuses revenue/surplus/ibnr inputs"),
      slice_ref("CRODash",         "Risk view consumes the same engine output"),
      slice_ref("MetricDetailModal","Click-through modal that the new correlation modal will replace or extend"),
    ],
    "should_not_read": [
      "frontend/src/App.jsx in full — use line ranges from workspace/context/appjsx-index.json",
    ],
  },
  "tasks": [
    {"id": "T-101", "title": "Migration: BusinessProcess entity",        "depends_on": [],               "blocks": ["T-108","T-112"], "owner_role": "worker", "artifact_paths": ["cyberrx-api/migrations/0006_business_process.sql","cyberrx-api/migrations/0006_business_process.down.sql"], "git_branch": "task/T-101-business-process",                "estimated_effort": "0.5d", "risk": "LOW",   "acceptance": ["ACC-12-01"]},
    {"id": "T-102", "title": "Migration: Asset entity",                  "depends_on": [],               "blocks": ["T-109","T-112"], "owner_role": "worker", "artifact_paths": ["cyberrx-api/migrations/0007_asset.sql","cyberrx-api/migrations/0007_asset.down.sql"], "git_branch": "task/T-102-asset",                              "estimated_effort": "0.5d", "risk": "LOW",   "acceptance": ["ACC-12-02"]},
    {"id": "T-103", "title": "Migration: DataObject entity",             "depends_on": [],               "blocks": ["T-112"],         "owner_role": "worker", "artifact_paths": ["cyberrx-api/migrations/0008_data_object.sql","cyberrx-api/migrations/0008_data_object.down.sql"], "git_branch": "task/T-103-data-object",                "estimated_effort": "0.5d", "risk": "LOW",   "acceptance": ["ACC-12-03"]},
    {"id": "T-104", "title": "Migration: ThreatScenario entity",         "depends_on": [],               "blocks": ["T-111","T-112"], "owner_role": "worker", "artifact_paths": ["cyberrx-api/migrations/0009_threat_scenario.sql","cyberrx-api/migrations/0009_threat_scenario.down.sql"], "git_branch": "task/T-104-threat-scenario",     "estimated_effort": "0.5d", "risk": "LOW",   "acceptance": ["ACC-12-04"]},
    {"id": "T-105", "title": "Migration: LegalObligation entity",        "depends_on": [],               "blocks": ["T-110","T-112"], "owner_role": "worker", "artifact_paths": ["cyberrx-api/migrations/0010_legal_obligation.sql","cyberrx-api/migrations/0010_legal_obligation.down.sql"], "git_branch": "task/T-105-legal-obligation", "estimated_effort": "0.5d", "risk": "LOW",   "acceptance": ["ACC-12-05"]},
    {"id": "T-106", "title": "Migration: ExecutiveOwner entity",         "depends_on": [],               "blocks": ["T-112"],         "owner_role": "worker", "artifact_paths": ["cyberrx-api/migrations/0011_executive_owner.sql","cyberrx-api/migrations/0011_executive_owner.down.sql"], "git_branch": "task/T-106-executive-owner",        "estimated_effort": "0.5d", "risk": "LOW",   "acceptance": ["ACC-12-06"]},
    {"id": "T-107", "title": "Extend Risk + Finding with FK columns (businessProcessId[], dataObjectIds[], threatScenarioId, legalObligationId[], executiveOwnerId)",
                                                                          "depends_on": ["T-101","T-102","T-103","T-104","T-105","T-106"], "blocks": ["T-112"], "owner_role": "worker",
                                                                          "artifact_paths": ["cyberrx-api/migrations/0012_risk_finding_correlation_columns.sql"],
                                                                          "git_branch": "task/T-107-risk-finding-correlation-cols", "estimated_effort": "0.5d", "risk": "MEDIUM",
                                                                          "acceptance": ["ACC-12-01","ACC-12-02","ACC-12-03","ACC-12-04","ACC-12-05","ACC-12-06"]},
    {"id": "T-108", "title": "Seed: 10 Tier-1 Crown Jewel BusinessProcess records (BCBS demo tenant)",
                                                                          "depends_on": ["T-101"],        "blocks": ["T-112"],         "owner_role": "worker",
                                                                          "artifact_paths": ["cyberrx-api/seeds/2026_06_01_crown_jewels.sql"],
                                                                          "git_branch": "task/T-108-seed-crown-jewels", "estimated_effort": "1d", "risk": "LOW",
                                                                          "acceptance": ["ACC-12-07"]},
    {"id": "T-109", "title": "Seed: NASCO + HealthEdge + Genesys assets (3 worked-example systems)",
                                                                          "depends_on": ["T-102"],        "blocks": ["T-112","T-114"], "owner_role": "worker",
                                                                          "artifact_paths": ["cyberrx-api/seeds/2026_06_02_demo_assets.sql"],
                                                                          "git_branch": "task/T-109-seed-demo-assets", "estimated_effort": "0.5d", "risk": "LOW",
                                                                          "acceptance": []},
    {"id": "T-110", "title": "Seed: LegalObligation rows for HIPAA/CMS/state notification regimes",
                                                                          "depends_on": ["T-105"],        "blocks": ["T-112"],         "owner_role": "worker",
                                                                          "artifact_paths": ["cyberrx-api/seeds/2026_06_03_legal_obligations.sql"],
                                                                          "git_branch": "task/T-110-seed-legal-obligations", "estimated_effort": "1d", "risk": "MEDIUM",
                                                                          "acceptance": ["ACC-12-08"]},
    {"id": "T-111", "title": "Seed: ThreatScenario library mapped to MITRE ATT&CK (use MITRE_SCENARIOS @ App.jsx 12,692-12,850)",
                                                                          "depends_on": ["T-104"],        "blocks": ["T-112"],         "owner_role": "worker",
                                                                          "context_manifest": {"must_read": [slice_ref("MitreTab", "MITRE_SCENARIOS is parsed and rendered here today")]},
                                                                          "artifact_paths": ["cyberrx-api/seeds/2026_06_04_threat_scenarios.sql"],
                                                                          "git_branch": "task/T-111-seed-threat-scenarios", "estimated_effort": "0.5d", "risk": "LOW",
                                                                          "acceptance": []},
    {"id": "T-112", "title": "Build correlation engine: POST /api/correlate {findingId} → narrative JSON",
                                                                          "depends_on": ["T-107","T-108","T-109","T-110","T-111"], "blocks": ["T-113","T-114","T-115"], "owner_role": "worker",
                                                                          "artifact_paths": ["cyberrx-api/src/routes/correlate.js","cyberrx-api/src/services/correlate.js"],
                                                                          "git_branch": "task/T-112-correlation-engine", "estimated_effort": "3d", "risk": "HIGH",
                                                                          "acceptance": ["ACC-12-09","ACC-12-10","ACC-12-11"]},
    {"id": "T-113", "title": "Frontend route + component: /correlated/:findingId narrative view (matches NASCO screenshot)",
                                                                          "depends_on": ["T-112"],        "blocks": ["T-114"],         "owner_role": "worker",
                                                                          "context_manifest": {"must_read": [slice_ref("MetricDetailModal","Pattern to follow for click-through modal")]},
                                                                          "artifact_paths": ["frontend/src/pages/CorrelatedFinding.jsx"],
                                                                          "git_branch": "task/T-113-correlated-finding-ui", "estimated_effort": "2d", "risk": "MEDIUM",
                                                                          "acceptance": ["ACC-12-12"]},
    {"id": "T-114", "title": "Wire CISODash + CFODash + CRODash to open correlation narrative on row click",
                                                                          "depends_on": ["T-113"],        "blocks": ["T-115"],         "owner_role": "worker",
                                                                          "context_manifest": {"must_read": [slice_ref("CISODash","Add onRowClick → /correlated/:id"), slice_ref("CFODash","Same"), slice_ref("CRODash","Same")]},
                                                                          "artifact_paths": ["frontend/src/App.jsx (CISODash, CFODash, CRODash row-click handlers)"],
                                                                          "git_branch": "task/T-114-wire-dashboards", "estimated_effort": "1d", "risk": "MEDIUM",
                                                                          "acceptance": ["ACC-12-13"]},
    {"id": "T-115", "title": "Validation: NASCO F-001 worked-example end-to-end test + healthcare CISO usability check (n≥5)",
                                                                          "depends_on": ["T-114"],        "blocks": [],                "owner_role": "validator",
                                                                          "artifact_paths": ["cyberrx-api/tests/e2e/nasco_f001.spec.js","docs/user-testing/2026-07-correlation-usability.md"],
                                                                          "git_branch": "task/T-115-validation", "estimated_effort": "2d", "risk": "MEDIUM",
                                                                          "acceptance": ["ACC-12-14"]},
  ],
  "validator_team_checks": {
    "acceptance":     "Every ACC-12-* listed in this plan is covered by a test in the artifact_paths.",
    "security":       "T-112 enforces JWT + X-Org-Id binding. No findingId from another org returns 200.",
    "no_regression":  "Existing CISO, CFO, CRO, Board dashboards render the same data; only an extra column/button is added.",
    "integration":    "Smoke test: seed reset → POST /api/correlate for NASCO F-001 → expect canonical narrative JSON snapshot.",
  },
  "risks": [
    {"risk": "ThreatScenario probability/impact numbers feel made-up to a healthcare CIO", "mitigation": "Cite Verizon DBIR + HHS OCR breach statistics in seeds; document source per row"},
    {"risk": "LegalObligation seed accidentally publishes wrong notification timelines",   "mitigation": "Outside-counsel review checkpoint before T-115 closes"},
    {"risk": "Correlation engine becomes slow with realistic data volumes",                "mitigation": "Indexes on (findingId), (orgId, businessProcessId); perf gate in ACC-12-10"},
  ],
  "out_of_scope": [
    "CIO/CLO dashboards (Month 3)",
    "Evidence collection / control drift (Month 4-5)",
    "Splitting App.jsx (Month 6)",
    "AI-generated executive summaries (Phase 2 of assessment)",
  ],
  "stop_conditions": [
    "Changes to LegalObligation copy that could be construed as legal advice — require outside-counsel sign-off.",
    "Any new endpoint that does not enforce JWT (per PRODUCTION_PROMPT.md Quality bars).",
    "Touching the BCBS demo tenant data outside of additive seed migrations.",
  ],
}

# ──────────────────────────────────────────────────────────────────────────
# Month 3 — CIO + CLO Dashboards
# ──────────────────────────────────────────────────────────────────────────
m3 = {
  **COMMON_META,
  "metadata": {**COMMON_META, "month": 3, "title": "CIO + CLO Dashboards", "weeks": [9, 12],
              "assessment_section": "§3 #3-#4, §4 (CIO + CLO user stories), §9 Month 3",
              "production_prompt_clause": "Sequence step 2"},
  "goal": "Ship the two missing executive dashboards (CIO, CLO) both backed by the Risk Correlation Engine, matching the user stories in §4 of the assessment.",
  "definition_of_done": [
    "NAV adds 'CIO Dashboard' and 'CLO Dashboard' entries; mods F08e, F08f.",
    "Every CIO acceptance criterion (assessment §4 CIO) renders against demo data.",
    "Every CLO acceptance criterion (assessment §4 CLO) renders against demo data.",
    "Both dashboards consume from POST /api/correlate; neither hard-codes findings.",
    "'Technology Risk Summary' export produces a PDF the CIO can hand to the Board.",
    "Breach Notification Workflow correctly computes notification windows for ≥3 US states using LegalObligation seeds.",
  ],
  "acceptance_criteria": [
    {"id": "ACC-03-01", "criterion": "CIO dashboard shows assets with crown-jewel flag, business process, criticality, data class, vulns, patch status, support status", "validator": "visual_check"},
    {"id": "ACC-03-02", "criterion": "Remediation backlog ranks by business impact, lists owner + cost-to-fix + ETA", "validator": "logic_check"},
    {"id": "ACC-03-03", "criterion": "Crown-jewel-only filter persists across reloads (URL query param)",            "validator": "e2e_test"},
    {"id": "ACC-03-04", "criterion": "Unsupported/EoL tech section pulls supported=false from Asset table",          "validator": "data_check"},
    {"id": "ACC-03-05", "criterion": "Technology Risk Summary PDF export contains: top 5 risks, asset table, remediation backlog, owner", "validator": "artifact_check"},
    {"id": "ACC-03-06", "criterion": "CLO dashboard shows OCR + state DOI + CMS exposure broken out by category",   "validator": "visual_check"},
    {"id": "ACC-03-07", "criterion": "Regulatory obligation tracker lists HIPAA/CMS/state laws sorted by applicability to org type", "validator": "logic_check"},
    {"id": "ACC-03-08", "criterion": "Breach notification workflow: pick state + data type → returns timeline + pre-populated draft (CA, NY, MA at minimum)", "validator": "e2e_test"},
    {"id": "ACC-03-09", "criterion": "Contract risk register supports CRUD on vendor contract terms (security clauses, audit rights, liability caps)", "validator": "crud_test"},
    {"id": "ACC-03-10", "criterion": "Policy exception view flags exceptions whose justification language matches 'regulatory non-compliance' patterns",   "validator": "nlp_check"},
    {"id": "ACC-03-11", "criterion": "Both dashboards' findings rows open the correlation narrative (re-use T-113 route)", "validator": "integration_test"},
    {"id": "ACC-03-12", "criterion": "Demo tenant: every CIO/CLO row references at least one BusinessProcess + one LegalObligation seeded in Month 1-2",   "validator": "fk_integrity_check"},
  ],
  "context_manifest": {
    "must_read": [
      {"path": "COVERAGE_ASSESSMENT.md", "section": "§4 CIO user story"},
      {"path": "COVERAGE_ASSESSMENT.md", "section": "§4 CLO / General Counsel user story"},
      slice_ref("CISODash",        "Layout/styling pattern to match"),
      slice_ref("CFODash",         "Same; copy the KPI strip + drilldown idiom"),
      slice_ref("VendorEcosystem", "Crown-jewel filter pattern exists here; reuse"),
      slice_ref("AppMap",          "Asset rendering pattern; CIO asset inventory follows this"),
      slice_ref("MetricDetailModal","Click-through to correlation narrative reuses this modal shell"),
    ],
    "should_not_read": ["frontend/src/App.jsx in full"],
  },
  "tasks": [
    {"id": "T-201", "title": "Add NAV entries: CIODash (F08e), CLODash (F08f); update routing in CyberRxApp",
                       "depends_on": [], "blocks": ["T-202","T-209"], "owner_role": "worker",
                       "context_manifest": {"must_read": [slice_ref("CyberRxApp","Page routing happens in renderPage() here")]},
                       "artifact_paths": ["frontend/src/App.jsx (NAV + CyberRxApp.renderPage)"],
                       "git_branch": "task/T-201-nav-entries", "estimated_effort": "0.5d", "risk": "LOW", "acceptance": []},
    {"id": "T-202", "title": "CIODash shell + KPI strip",                            "depends_on": ["T-201"],  "blocks": ["T-203","T-207"], "owner_role": "worker", "artifact_paths": ["frontend/src/pages/CIODash.jsx"], "git_branch": "task/T-202-ciodash-shell", "estimated_effort": "1d", "risk": "LOW",    "acceptance": []},
    {"id": "T-203", "title": "CIODash asset inventory table",                         "depends_on": ["T-202"],  "blocks": ["T-205"],         "owner_role": "worker", "artifact_paths": ["frontend/src/pages/CIODash.jsx"], "git_branch": "task/T-203-asset-table", "estimated_effort": "1d", "risk": "LOW",    "acceptance": ["ACC-03-01"]},
    {"id": "T-204", "title": "Crown-jewel filter (URL-persisted)",                    "depends_on": ["T-203"],  "blocks": [],                "owner_role": "worker", "artifact_paths": ["frontend/src/pages/CIODash.jsx"], "git_branch": "task/T-204-cj-filter", "estimated_effort": "0.5d", "risk": "LOW",  "acceptance": ["ACC-03-03"]},
    {"id": "T-205", "title": "Unsupported/EoL tech panel (consumes Asset.supported flag)", "depends_on": ["T-203"], "blocks": [],            "owner_role": "worker", "artifact_paths": ["frontend/src/pages/CIODash.jsx"], "git_branch": "task/T-205-eol-tech", "estimated_effort": "0.5d", "risk": "LOW",   "acceptance": ["ACC-03-04"]},
    {"id": "T-206", "title": "Backup/recovery readiness scoring widget (CIODash)",    "depends_on": ["T-202"],  "blocks": [],                "owner_role": "worker", "artifact_paths": ["frontend/src/pages/CIODash.jsx"], "git_branch": "task/T-206-backup-readiness", "estimated_effort": "1d", "risk": "MEDIUM", "acceptance": []},
    {"id": "T-207", "title": "CIODash remediation backlog table (cost-to-fix, owner, ETA)", "depends_on": ["T-202"], "blocks": ["T-208"],   "owner_role": "worker", "artifact_paths": ["frontend/src/pages/CIODash.jsx"], "git_branch": "task/T-207-remediation-backlog", "estimated_effort": "1.5d", "risk": "MEDIUM","acceptance": ["ACC-03-02"]},
    {"id": "T-208", "title": "Technology Risk Summary PDF export endpoint + button",   "depends_on": ["T-207"],  "blocks": [],                "owner_role": "worker", "artifact_paths": ["cyberrx-api/src/routes/exports.js","frontend/src/pages/CIODash.jsx"], "git_branch": "task/T-208-tech-risk-pdf", "estimated_effort": "1d", "risk": "MEDIUM", "acceptance": ["ACC-03-05"]},
    {"id": "T-209", "title": "CLODash shell + KPI strip",                            "depends_on": ["T-201"],  "blocks": ["T-210","T-211","T-212","T-213","T-214"], "owner_role": "worker", "artifact_paths": ["frontend/src/pages/CLODash.jsx"], "git_branch": "task/T-209-clodash-shell", "estimated_effort": "1d", "risk": "LOW", "acceptance": []},
    {"id": "T-210", "title": "Legal cyber exposure overview (OCR/CMS/state DOI categories)", "depends_on": ["T-209"], "blocks": [],          "owner_role": "worker", "artifact_paths": ["frontend/src/pages/CLODash.jsx"], "git_branch": "task/T-210-legal-exposure", "estimated_effort": "1d", "risk": "LOW",   "acceptance": ["ACC-03-06"]},
    {"id": "T-211", "title": "Regulatory obligation tracker (consumes LegalObligation seeds from T-110)", "depends_on": ["T-209"], "blocks": ["T-212"], "owner_role": "worker", "artifact_paths": ["frontend/src/pages/CLODash.jsx"], "git_branch": "task/T-211-reg-obligation", "estimated_effort": "1d", "risk": "LOW", "acceptance": ["ACC-03-07"]},
    {"id": "T-212", "title": "Breach notification workflow + pre-populated drafts (CA, NY, MA)", "depends_on": ["T-211"], "blocks": [],     "owner_role": "worker", "artifact_paths": ["frontend/src/pages/CLODash.jsx","cyberrx-api/src/services/breach_notification.js"], "git_branch": "task/T-212-breach-notification", "estimated_effort": "2d", "risk": "HIGH","acceptance": ["ACC-03-08"]},
    {"id": "T-213", "title": "Contract risk register CRUD",                           "depends_on": ["T-209"],  "blocks": [],                "owner_role": "worker", "artifact_paths": ["frontend/src/pages/CLODash.jsx","cyberrx-api/src/routes/contracts.js","cyberrx-api/migrations/0013_contract.sql"], "git_branch": "task/T-213-contract-register", "estimated_effort": "2d", "risk": "MEDIUM", "acceptance": ["ACC-03-09"]},
    {"id": "T-214", "title": "Policy exceptions with legal impact flagging",          "depends_on": ["T-209"],  "blocks": [],                "owner_role": "worker", "artifact_paths": ["frontend/src/pages/CLODash.jsx"], "git_branch": "task/T-214-policy-exceptions", "estimated_effort": "1d", "risk": "MEDIUM", "acceptance": ["ACC-03-10"]},
    {"id": "T-215", "title": "Wire CIO + CLO finding rows to /correlated/:findingId",   "depends_on": ["T-203","T-210"], "blocks": [],         "owner_role": "worker", "artifact_paths": ["frontend/src/pages/CIODash.jsx","frontend/src/pages/CLODash.jsx"], "git_branch": "task/T-215-wire-correlation", "estimated_effort": "0.5d", "risk": "LOW", "acceptance": ["ACC-03-11","ACC-03-12"]},
  ],
  "validator_team_checks": {
    "acceptance":    "Both user-story checklists from §4 covered.",
    "security":      "New routes (T-208, T-212, T-213) enforce JWT + org-id binding.",
    "no_regression": "Existing 4 dashboards untouched (T-201's NAV additions are append-only).",
    "integration":   "End-to-end test loads CIO dash → opens correlation narrative → returns to dash.",
  },
  "risks": [
    {"risk": "Breach notification draft language is read as legal advice",          "mitigation": "PRODUCTION_PROMPT stop-condition #2; outside counsel review before T-212 merges"},
    {"risk": "PDF export performance under realistic asset counts",                  "mitigation": "Stream PDF generation; cap at 1000 assets per export; warn beyond"},
    {"risk": "CLODash duplicates functionality of CRODash compliance grids",         "mitigation": "Compliance Officer review session before T-209 ships"},
  ],
  "out_of_scope": [
    "Internal Audit standalone view (Month 4)",
    "Exception approval workflow (Month 5)",
    "Splitting App.jsx (Month 6) — CIODash/CLODash MAY ship as new files; legacy stays in App.jsx",
  ],
  "stop_conditions": [
    "Any breach notification draft text shipping to prod without outside-counsel sign-off.",
    "Adding regulatory-coverage claims (e.g. 'HIPAA-certified') without sign-off.",
  ],
}

# ──────────────────────────────────────────────────────────────────────────
# Month 4 — Separation & Security
# ──────────────────────────────────────────────────────────────────────────
m4 = {
  **COMMON_META,
  "metadata": {**COMMON_META, "month": 4, "title": "Separation & Security",
              "weeks": [13, 16],
              "assessment_section": "§3 #1, #5, #6, §8 Risks (Critical), §9 Month 4",
              "production_prompt_clause": "Sequence step 3"},
  "goal": "Make the platform sellable: enforce auth, isolate orgs, split Internal Audit from CRO, and prove continuous evidence ingestion on 5 controls.",
  "definition_of_done": [
    "Every API route enforces JWT and X-Org-Id is validated against the JWT identity.",
    "CORS allowlist comes from FRONTEND_URL env-var; the `// allow all - tighten in production` comment is gone.",
    "Cross-org access returns 403; same-org returns 200 — verified by automated test.",
    "/audit route exists; Internal Audit view is no longer combined with CRO.",
    "Document ingestion accepts a SOC2 report and auto-extracts 5 controls (mapped to NIST CSF).",
    "Control drift detection compares attestation vs external validation for MFA (worked example).",
  ],
  "acceptance_criteria": [
    {"id": "ACC-04-01", "criterion": "Every /api/* route except /health rejects requests without a valid JWT", "validator": "security_test"},
    {"id": "ACC-04-02", "criterion": "X-Org-Id header must match the orgId claim in the JWT; mismatch = 403",   "validator": "security_test"},
    {"id": "ACC-04-03", "criterion": "CORS allowlist is built from FRONTEND_URL only (and localhost in NODE_ENV=development)", "validator": "static_analysis"},
    {"id": "ACC-04-04", "criterion": "POST /api/auth/login returns a JWT given valid credentials; rate-limited to 5/min/IP", "validator": "auth_test"},
    {"id": "ACC-04-05", "criterion": "POST /api/auth/signup creates a user scoped to an org (no cross-org signup)",          "validator": "auth_test"},
    {"id": "ACC-04-06", "criterion": "/audit route renders an Internal Audit dashboard with audit-universe map", "validator": "visual_check"},
    {"id": "ACC-04-07", "criterion": "Audit dashboard shows control testing UI: test plan, procedure, evidence, result", "validator": "visual_check"},
    {"id": "ACC-04-08", "criterion": "Audit findings management supports issue log, severity, MAP, target, status",       "validator": "crud_test"},
    {"id": "ACC-04-09", "criterion": "Repeat-finding detection flags same control + same deficiency across audit years",  "validator": "logic_check"},
    {"id": "ACC-04-10", "criterion": "POST /api/evidence accepts a PDF, OCRs it, extracts and links 5 named controls to NIST CSF refs (PR.AA-2, PR.DS-1, DE.CM-1, RS.AN-1, ID.AM-1)", "validator": "integration_test"},
    {"id": "ACC-04-11", "criterion": "Control drift detection: when attested MFA% diverges from Okta API by >5%, drift flagged", "validator": "integration_test"},
    {"id": "ACC-04-12", "criterion": "Multi-tenant secret isolation: Org A's tool credentials are unreadable to Org B (AWS Secrets Manager or scoped env namespace)", "validator": "security_test"},
  ],
  "context_manifest": {
    "must_read": [
      {"path": "COVERAGE_ASSESSMENT.md", "section": "§3 #1 Fix Critical Security Gaps"},
      {"path": "COVERAGE_ASSESSMENT.md", "section": "§4 Internal Auditor user story"},
      {"path": "COVERAGE_ASSESSMENT.md", "section": "§9 Month 4"},
      {"path": "cyberrx-api/src/index.js",        "reason": "Current CORS + middleware layout; auth middleware slots in here"},
      {"path": "cyberrx-api/src/routes/itsm.js",  "reason": "Pattern for an org-scoped route; all routes adopt the new auth gate"},
      {"path": "cyberrx-api/src/routes/tools.js", "reason": "Same"},
      {"path": "cyberrx-api/src/routes/credentials.js","reason": "Same; vault writes must be org-isolated"},
      {"path": "cyberrx-api/src/utils/vault.js",      "reason": "Local mode is single-tenant; multi-tenant requires AWS Secrets Manager path"},
      {"path": "cyberrx-api/src/utils/db.js",         "reason": "users table is here but no signup/login endpoints exist"},
      slice_ref("CRODash",  "Audit content lives mixed inside here; we will copy/extract — NOT delete — to /audit"),
      slice_ref("Evidence", "Evidence Repository page already exists as a placeholder; reuse its UI shell"),
    ],
    "should_not_read": ["frontend/src/App.jsx in full"],
  },
  "tasks": [
    {"id": "T-301", "title": "JWT middleware: reject requests without a valid token on /api/*",
                       "depends_on": [], "blocks": ["T-302","T-303","T-304","T-305","T-306"], "owner_role": "worker",
                       "artifact_paths": ["cyberrx-api/src/middleware/auth.js","cyberrx-api/src/index.js"],
                       "git_branch": "task/T-301-jwt-middleware", "estimated_effort": "1d", "risk": "HIGH", "acceptance": ["ACC-04-01"]},
    {"id": "T-302", "title": "Org-isolation middleware: bind X-Org-Id to JWT claim",
                       "depends_on": ["T-301"], "blocks": [], "owner_role": "worker",
                       "artifact_paths": ["cyberrx-api/src/middleware/org_isolation.js"],
                       "git_branch": "task/T-302-org-isolation", "estimated_effort": "0.5d", "risk": "HIGH", "acceptance": ["ACC-04-02"]},
    {"id": "T-303", "title": "Harden CORS to FRONTEND_URL allowlist; remove TODO comment",
                       "depends_on": [], "blocks": [], "owner_role": "worker",
                       "artifact_paths": ["cyberrx-api/src/index.js"],
                       "git_branch": "task/T-303-cors-allowlist", "estimated_effort": "0.5d", "risk": "MEDIUM", "acceptance": ["ACC-04-03"]},
    {"id": "T-304", "title": "POST /api/auth/login (rate-limited) + JWT issuance",
                       "depends_on": ["T-301"], "blocks": ["T-305"], "owner_role": "worker",
                       "artifact_paths": ["cyberrx-api/src/routes/auth.js","cyberrx-api/src/services/auth.js"],
                       "git_branch": "task/T-304-login", "estimated_effort": "1d", "risk": "MEDIUM", "acceptance": ["ACC-04-04"]},
    {"id": "T-305", "title": "POST /api/auth/signup — org-scoped, no cross-org creation",
                       "depends_on": ["T-304"], "blocks": [], "owner_role": "worker",
                       "artifact_paths": ["cyberrx-api/src/routes/auth.js"],
                       "git_branch": "task/T-305-signup", "estimated_effort": "1d", "risk": "MEDIUM", "acceptance": ["ACC-04-05"]},
    {"id": "T-306", "title": "NAV: add 'Internal Audit' page (F08g); copy audit chunks out of CRODash",
                       "depends_on": ["T-301"], "blocks": ["T-307","T-308","T-309"], "owner_role": "worker",
                       "context_manifest": {"must_read": [slice_ref("CRODash","Find and lift the audit-only sections; keep CRO unchanged")]},
                       "artifact_paths": ["frontend/src/pages/AuditDash.jsx","frontend/src/App.jsx (NAV)"],
                       "git_branch": "task/T-306-audit-split", "estimated_effort": "2d", "risk": "MEDIUM", "acceptance": ["ACC-04-06"]},
    {"id": "T-307", "title": "Audit dashboard: control testing UI (plan/procedure/evidence/result)",
                       "depends_on": ["T-306"], "blocks": [], "owner_role": "worker",
                       "artifact_paths": ["frontend/src/pages/AuditDash.jsx"],
                       "git_branch": "task/T-307-control-testing", "estimated_effort": "2d", "risk": "MEDIUM", "acceptance": ["ACC-04-07"]},
    {"id": "T-308", "title": "Findings management table + repeat-finding detection",
                       "depends_on": ["T-307"], "blocks": [], "owner_role": "worker",
                       "artifact_paths": ["frontend/src/pages/AuditDash.jsx","cyberrx-api/src/services/repeat_findings.js"],
                       "git_branch": "task/T-308-findings-mgmt", "estimated_effort": "1.5d", "risk": "MEDIUM", "acceptance": ["ACC-04-08","ACC-04-09"]},
    {"id": "T-309", "title": "Evidence ingestion API: POST /api/evidence (PDF → OCR → control extraction for 5 NIST CSF controls)",
                       "depends_on": ["T-301"], "blocks": ["T-310"], "owner_role": "worker",
                       "artifact_paths": ["cyberrx-api/src/routes/evidence.js","cyberrx-api/src/services/ocr.js","cyberrx-api/src/services/control_extraction.js"],
                       "git_branch": "task/T-309-evidence-ingestion", "estimated_effort": "3d", "risk": "HIGH", "acceptance": ["ACC-04-10"]},
    {"id": "T-310", "title": "Control drift detection: compare attested MFA% vs Okta /api/v1/users sample",
                       "depends_on": ["T-309"], "blocks": [], "owner_role": "worker",
                       "artifact_paths": ["cyberrx-api/src/services/drift_detection.js","cyberrx-api/tests/integration/mfa_drift.spec.js"],
                       "git_branch": "task/T-310-drift-mfa", "estimated_effort": "1.5d", "risk": "MEDIUM", "acceptance": ["ACC-04-11"]},
    {"id": "T-311", "title": "Multi-tenant secret isolation via AWS Secrets Manager scoped per orgId",
                       "depends_on": ["T-302"], "blocks": [], "owner_role": "worker",
                       "context_manifest": {"must_read": [{"path": "cyberrx-api/src/utils/vault.js", "reason": "VAULT_MODE='aws' path already drafted; finish it"}]},
                       "artifact_paths": ["cyberrx-api/src/utils/vault.js","docs/runbooks/secrets-manager-rotation.md"],
                       "git_branch": "task/T-311-tenant-secret-isolation", "estimated_effort": "2d", "risk": "HIGH", "acceptance": ["ACC-04-12"]},
  ],
  "validator_team_checks": {
    "acceptance":    "Every ACC-04-* has an automated test in artifact_paths.",
    "security":      "Pen-test sweep on Month-4 branches; OWASP top-10 baseline pass.",
    "no_regression": "BCBS demo flow green at every PR. CRODash content unchanged after audit split.",
    "integration":   "End-to-end: signup → login → JWT → CRUD on findings → cross-org access denied.",
  },
  "risks": [
    {"risk": "Hidden internal callers depend on the all-origins CORS",                "mitigation": "Audit caller list before merge; staged rollout"},
    {"risk": "JWT rollout breaks the BCBS demo flow",                                 "mitigation": "Demo tenant gets a long-lived demo JWT in dev mode; documented"},
    {"risk": "Evidence OCR + AI control extraction accuracy is unbounded",            "mitigation": "Hand-validate 50-document corpus; require >85% precision before ACC-04-10 closes"},
  ],
  "out_of_scope": [
    "Exception workflow (Month 5)",
    "SOC2 certification readiness (Month 6)",
    "Splitting App.jsx (Month 6)",
  ],
  "stop_conditions": [
    "Disabling auth in any environment to 'temporarily' unblock work.",
    "Any pivot that puts customer PHI in env vars instead of Secrets Manager.",
  ],
}

# ──────────────────────────────────────────────────────────────────────────
# Month 5 — Exception Workflow + Evidence Validation
# ──────────────────────────────────────────────────────────────────────────
m5 = {
  **COMMON_META,
  "metadata": {**COMMON_META, "month": 5, "title": "Exception Workflow + Evidence Validation",
              "weeks": [17, 20],
              "assessment_section": "§3 #6-#7, §9 Month 5",
              "production_prompt_clause": "Sequence step 4"},
  "goal": "Make risk acceptance and continuous control validation real: approval chain CISO→CRO→CLO→Board with time-bound expiry, and evidence-vs-attestation drift for MFA + 4 other controls.",
  "definition_of_done": [
    "Exception entity exists with state machine: pending → approved → expired (or denied).",
    "Approval chain enforces order: CISO ack → CRO ack → CLO ack → Board ack; skipping → 400.",
    "Time-bound expiry: cron job moves approved exceptions past expiryDate → expired daily.",
    "Drift detection: when external validation diverges from attestation >5% on MFA, EDR, patch%, MTTR, phishing% → drift flag raised + risk re-scored.",
    "Audit evidence repository links evidence files to controls and audit tests.",
  ],
  "acceptance_criteria": [
    {"id": "ACC-05-01", "criterion": "Exception schema: id, controlId, riskId, requestedBy, justification, approvalChain[], status, expiryDate, conditions[]", "validator": "schema_check"},
    {"id": "ACC-05-02", "criterion": "Request form posts to POST /api/exceptions; validation rejects empty justification + missing expiry", "validator": "crud_test"},
    {"id": "ACC-05-03", "criterion": "Approval chain enforces CISO → CRO → CLO → Board order via state transitions", "validator": "state_machine_test"},
    {"id": "ACC-05-04", "criterion": "Approver role check: a CLO cannot ack as a CRO; returns 403", "validator": "security_test"},
    {"id": "ACC-05-05", "criterion": "Auto-expiry cron job processes expired exceptions daily; idempotent", "validator": "cron_test"},
    {"id": "ACC-05-06", "criterion": "Exception tracking dashboard at /exceptions: queue view, status, days-to-expiry", "validator": "visual_check"},
    {"id": "ACC-05-07", "criterion": "Risk register integration: an approved exception annotates the related Risk with status='accepted' + expiryDate", "validator": "data_check"},
    {"id": "ACC-05-08", "criterion": "Drift detection runs for MFA, EDR, patch%, MTTR, phishing% on a daily schedule", "validator": "scheduler_test"},
    {"id": "ACC-05-09", "criterion": "Drift threshold (>5% absolute divergence) raises a drift_flag and lowers the control_effectiveness_score", "validator": "logic_check"},
    {"id": "ACC-05-10", "criterion": "Audit evidence repository: POST /api/audit/evidence/:controlId attaches files; auditor view lists evidence per control", "validator": "crud_test"},
    {"id": "ACC-05-11", "criterion": "Management assertion validation: control test result flips to 'unsubstantiated' when evidence is missing or drifted", "validator": "logic_check"},
  ],
  "context_manifest": {
    "must_read": [
      {"path": "COVERAGE_ASSESSMENT.md", "section": "§3 #7 Exception Workflow"},
      {"path": "COVERAGE_ASSESSMENT.md", "section": "§9 Month 5"},
      slice_ref("CRODash",  "Risk register is rendered here; exception status badge adds onto its rows"),
      {"path": "cyberrx-api/src/scheduler.js", "reason": "Existing scheduler pattern for daily/weekly metric syncs; drift detection runs the same way"},
      {"path": "cyberrx-api/src/routes/tools.js","reason": "Real-tool sync values (Okta MFA, CrowdStrike EDR, Tenable patch, etc.) — drift compares these to attested values"},
    ],
    "should_not_read": ["frontend/src/App.jsx in full"],
  },
  "tasks": [
    {"id": "T-401", "title": "Migration: Exception entity",
                       "depends_on": [], "blocks": ["T-402","T-403"], "owner_role": "worker",
                       "artifact_paths": ["cyberrx-api/migrations/0014_exception.sql","cyberrx-api/migrations/0014_exception.down.sql"],
                       "git_branch": "task/T-401-exception-schema", "estimated_effort": "0.5d", "risk": "LOW", "acceptance": ["ACC-05-01"]},
    {"id": "T-402", "title": "POST /api/exceptions (validation, persistence) + GET list",
                       "depends_on": ["T-401"], "blocks": ["T-403","T-405"], "owner_role": "worker",
                       "artifact_paths": ["cyberrx-api/src/routes/exceptions.js","cyberrx-api/src/services/exceptions.js"],
                       "git_branch": "task/T-402-exception-crud", "estimated_effort": "1d", "risk": "MEDIUM", "acceptance": ["ACC-05-02"]},
    {"id": "T-403", "title": "Approval chain state machine: CISO → CRO → CLO → Board with role enforcement",
                       "depends_on": ["T-402"], "blocks": ["T-404","T-407"], "owner_role": "worker",
                       "artifact_paths": ["cyberrx-api/src/services/approval_chain.js","cyberrx-api/tests/unit/approval_chain.spec.js"],
                       "git_branch": "task/T-403-approval-chain", "estimated_effort": "2d", "risk": "HIGH", "acceptance": ["ACC-05-03","ACC-05-04"]},
    {"id": "T-404", "title": "Daily cron: auto-expire exceptions past expiryDate",
                       "depends_on": ["T-403"], "blocks": [], "owner_role": "worker",
                       "artifact_paths": ["cyberrx-api/src/scheduler/exception_expiry.js"],
                       "git_branch": "task/T-404-exception-expiry", "estimated_effort": "0.5d", "risk": "LOW", "acceptance": ["ACC-05-05"]},
    {"id": "T-405", "title": "Exception tracking dashboard at /exceptions",
                       "depends_on": ["T-402"], "blocks": [], "owner_role": "worker",
                       "artifact_paths": ["frontend/src/pages/Exceptions.jsx","frontend/src/App.jsx (NAV)"],
                       "git_branch": "task/T-405-exception-dash", "estimated_effort": "1.5d", "risk": "LOW", "acceptance": ["ACC-05-06"]},
    {"id": "T-406", "title": "Drift detection service: daily compare external sync to attested values for MFA/EDR/patch/MTTR/phishing",
                       "depends_on": [], "blocks": ["T-407"], "owner_role": "worker",
                       "context_manifest": {"must_read": [{"path": "cyberrx-api/src/routes/tools.js","reason": "Sync values for these 5 metrics already implemented"}]},
                       "artifact_paths": ["cyberrx-api/src/services/drift_detection.js","cyberrx-api/src/scheduler/drift_cron.js"],
                       "git_branch": "task/T-406-drift-detection", "estimated_effort": "2d", "risk": "HIGH", "acceptance": ["ACC-05-08","ACC-05-09"]},
    {"id": "T-407", "title": "Re-score Risk and annotate with exception state when applicable",
                       "depends_on": ["T-403","T-406"], "blocks": [], "owner_role": "worker",
                       "artifact_paths": ["cyberrx-api/src/services/risk_rescore.js"],
                       "git_branch": "task/T-407-risk-rescore", "estimated_effort": "1d", "risk": "MEDIUM", "acceptance": ["ACC-05-07"]},
    {"id": "T-408", "title": "Audit evidence repository: link evidence to controls; auditor view",
                       "depends_on": [], "blocks": ["T-409"], "owner_role": "worker",
                       "artifact_paths": ["cyberrx-api/src/routes/audit_evidence.js","frontend/src/pages/AuditDash.jsx"],
                       "git_branch": "task/T-408-audit-evidence-repo", "estimated_effort": "2d", "risk": "MEDIUM", "acceptance": ["ACC-05-10"]},
    {"id": "T-409", "title": "Management assertion validation: 'unsubstantiated' when evidence missing/drifted",
                       "depends_on": ["T-408","T-406"], "blocks": [], "owner_role": "worker",
                       "artifact_paths": ["cyberrx-api/src/services/assertion_validation.js"],
                       "git_branch": "task/T-409-assertion-validation", "estimated_effort": "1d", "risk": "MEDIUM", "acceptance": ["ACC-05-11"]},
  ],
  "validator_team_checks": {
    "acceptance":    "Every ACC-05-* has an automated test in artifact_paths.",
    "security":      "Approval-chain bypass attempts return 403; exception creation requires authenticated session.",
    "no_regression": "Risk register continues to render unchanged for risks without exceptions.",
    "integration":   "End-to-end: create exception → CISO ack → CRO ack → CLO ack → Board ack → status='approved'; cron after expiry → status='expired'.",
  },
  "risks": [
    {"risk": "Board ack lacks an authentication path",                                "mitigation": "Board user role added in Month 4 auth; board ack via signed email link as backup, with audit log"},
    {"risk": "Drift detection false-positives erode trust in metrics",                "mitigation": "Hysteresis: require 3 consecutive days >5% before flagging; per-metric tuning"},
    {"risk": "Time-bound expiry silently re-opens risks",                             "mitigation": "Email notification 14/7/1 days before expiry to all approvers"},
  ],
  "out_of_scope": [
    "AI-generated executive summaries (Phase 2)",
    "App.jsx split (Month 6)",
    "Board PDF reports (Month 6)",
  ],
  "stop_conditions": [
    "Any change that allows an exception to skip an approver without explicit Board override + audit log.",
    "Disabling drift detection in prod for any reason — must be PR'd and reviewed.",
  ],
}

# ──────────────────────────────────────────────────────────────────────────
# Month 6 — Polish + MVP Handoff
# ──────────────────────────────────────────────────────────────────────────
# We let the index drive the per-component split tasks so they cannot drift.
LOW = [c for c in IDX["components"] if c.get("split_risk") == "LOW"  and c["role"] in {"utility","page","auth_flow"}]
MED = [c for c in IDX["components"] if c.get("split_risk") == "MEDIUM" and c["role"] in {"utility","page","auth_flow"}]

m6_split_tasks = []
TID = 601
# Extract LOW first, then MEDIUM. HIGH risk + the root stay in App.jsx this month.
for c in sorted(LOW, key=lambda c: c["loc"]) + sorted(MED, key=lambda c: c["loc"]):
    m6_split_tasks.append({
        "id": f"T-{TID}",
        "title": f"Extract {c['name']} → frontend/src/components/{c['name']}.jsx",
        "depends_on": [],
        "blocks": [],
        "owner_role": "worker",
        "context_manifest": {"must_read": [slice_ref(c["name"], "Lift this slice into its own file; preserve all behavior")]},
        "artifact_paths": [f"frontend/src/components/{c['name']}.jsx","frontend/src/App.jsx (remove extracted block)"],
        "git_branch": f"task/T-{TID}-extract-{c['name']}",
        "estimated_effort": "0.5d" if c["split_risk"] == "LOW" else "1d",
        "risk": c["split_risk"],
        "anchor": c["anchor_signature"],
        "line_range_at_plan_time": c["line_range"],
        "loc": c["loc"],
        "acceptance": ["ACC-06-01","ACC-06-02"],
    })
    TID += 1

m6 = {
  **COMMON_META,
  "metadata": {**COMMON_META, "month": 6, "title": "Polish + MVP Handoff",
              "weeks": [21, 24],
              "assessment_section": "§3 #8, §9 Month 6",
              "production_prompt_clause": "Sequence step 5"},
  "goal": "Move every extractable component out of App.jsx, ship exportable Board reports, write the docs, and stand up the SOC2-readiness checklist. By month-end App.jsx is a router shell.",
  "definition_of_done": [
    "App.jsx contains only: imports, NAV, the root CyberRxApp component, and JSX route routing.",
    "All LOW + MEDIUM split-risk components live in frontend/src/components/.",
    "All four executive dashboards (CISO, CRO, CFO, Board) export a one-page PDF.",
    "OpenAPI spec generated; data-model docs and onboarding guide live in docs/.",
    "SOC2 readiness checklist exists and has owners per row.",
  ],
  "acceptance_criteria": [
    {"id": "ACC-06-01", "criterion": "After each extraction, anchor_signature still matches the live App.jsx line (or has been removed entirely if extraction is complete)", "validator": "scripts/validate_appjsx_index.py"},
    {"id": "ACC-06-02", "criterion": "After extraction, the BCBS demo flow renders identically (visual diff <1% pixel delta on key pages)", "validator": "visual_regression"},
    {"id": "ACC-06-03", "criterion": "App.jsx final LOC ≤ 1,500",                                                                                                  "validator": "loc_gate"},
    {"id": "ACC-06-04", "criterion": "GET /api/exports/board/:dashboard.pdf returns a PDF for CISO, CRO, CFO, Board",                                              "validator": "artifact_check"},
    {"id": "ACC-06-05", "criterion": "GET /api/exports/board/:dashboard.xlsx returns an XLSX for CISO, CRO, CFO, Board",                                           "validator": "artifact_check"},
    {"id": "ACC-06-06", "criterion": "docs/api/openapi.yaml validates with redocly + matches deployed routes (CI check)",                                          "validator": "openapi_check"},
    {"id": "ACC-06-07", "criterion": "docs/data-model.md covers every entity from Month 1-2 + Month 4-5; each entity has fields + relationships + sample JSON",     "validator": "manual_review"},
    {"id": "ACC-06-08", "criterion": "docs/onboarding.md gets a new dev to a green local + deployed env in <30 min",                                              "validator": "dogfood_test"},
    {"id": "ACC-06-09", "criterion": "docs/soc2-readiness.md lists CC1.1-CC9.2 with: in scope/out, evidence, owner, gap, target date",                            "validator": "manual_review"},
    {"id": "ACC-06-10", "criterion": "scripts/validate_appjsx_index.py runs on every PR to App.jsx (CI gate)",                                                      "validator": "ci_check"},
  ],
  "context_manifest": {
    "must_read": [
      {"path": "COVERAGE_ASSESSMENT.md", "section": "§9 Month 6"},
      {"path": "workspace/context/appjsx-index.json", "reason": "Drives the split order; the recommended_order list is authoritative for this month"},
      {"path": "workspace/context/README.md",         "reason": "Worker usage pattern for verifying anchor_signature before extraction"},
      {"path": "scripts/validate_appjsx_index.py",    "reason": "Gate run on every PR"},
    ],
    "should_not_read": ["frontend/src/App.jsx in full"],
  },
  "tasks": [
    *m6_split_tasks,
    {"id": "T-690", "title": "Final App.jsx slim-down to router-shell + final ACC-06-03 LOC gate",
                       "depends_on": [t["id"] for t in m6_split_tasks], "blocks": ["T-691"], "owner_role": "worker",
                       "artifact_paths": ["frontend/src/App.jsx"],
                       "git_branch": "task/T-690-appjsx-shell", "estimated_effort": "2d", "risk": "HIGH",
                       "acceptance": ["ACC-06-03"]},
    {"id": "T-691", "title": "Wire scripts/validate_appjsx_index.py into CI on every App.jsx PR",
                       "depends_on": ["T-690"], "blocks": [], "owner_role": "worker",
                       "artifact_paths": [".github/workflows/appjsx-validate.yml"],
                       "git_branch": "task/T-691-ci-validation", "estimated_effort": "0.5d", "risk": "LOW",
                       "acceptance": ["ACC-06-10"]},
    {"id": "T-692", "title": "Board PDF exporter (CISO/CRO/CFO/Board)",
                       "depends_on": [], "blocks": ["T-693"], "owner_role": "worker",
                       "artifact_paths": ["cyberrx-api/src/routes/exports.js","cyberrx-api/src/services/pdf_export.js"],
                       "git_branch": "task/T-692-board-pdf", "estimated_effort": "2d", "risk": "MEDIUM",
                       "acceptance": ["ACC-06-04"]},
    {"id": "T-693", "title": "Board XLSX exporter",
                       "depends_on": ["T-692"], "blocks": [], "owner_role": "worker",
                       "artifact_paths": ["cyberrx-api/src/services/xlsx_export.js"],
                       "git_branch": "task/T-693-board-xlsx", "estimated_effort": "1d", "risk": "LOW",
                       "acceptance": ["ACC-06-05"]},
    {"id": "T-694", "title": "OpenAPI spec generation + CI check",
                       "depends_on": [], "blocks": [], "owner_role": "worker",
                       "artifact_paths": ["docs/api/openapi.yaml",".github/workflows/openapi-check.yml"],
                       "git_branch": "task/T-694-openapi", "estimated_effort": "1.5d", "risk": "LOW",
                       "acceptance": ["ACC-06-06"]},
    {"id": "T-695", "title": "Data-model docs (entities + relationships + sample JSON)",
                       "depends_on": [], "blocks": [], "owner_role": "worker",
                       "artifact_paths": ["docs/data-model.md"],
                       "git_branch": "task/T-695-data-model-docs", "estimated_effort": "1d", "risk": "LOW",
                       "acceptance": ["ACC-06-07"]},
    {"id": "T-696", "title": "Onboarding guide (local + deployed env in <30 min)",
                       "depends_on": [], "blocks": [], "owner_role": "worker",
                       "artifact_paths": ["docs/onboarding.md"],
                       "git_branch": "task/T-696-onboarding", "estimated_effort": "1d", "risk": "LOW",
                       "acceptance": ["ACC-06-08"]},
    {"id": "T-697", "title": "SOC2 readiness checklist (CC1.1-CC9.2 + owners + gaps)",
                       "depends_on": [], "blocks": [], "owner_role": "worker",
                       "artifact_paths": ["docs/soc2-readiness.md"],
                       "git_branch": "task/T-697-soc2-readiness", "estimated_effort": "2d", "risk": "MEDIUM",
                       "acceptance": ["ACC-06-09"]},
  ],
  "validator_team_checks": {
    "acceptance":    "Every ACC-06-* has either a CI gate or a documented dogfood test.",
    "security":      "Exports apply the same JWT + org-isolation middleware introduced in Month 4.",
    "no_regression": "Visual regression suite from T-115 stays green throughout the extraction parade.",
    "integration":   "Demo flow run before and after each extraction PR; diff must be <1% pixel delta.",
  },
  "risks": [
    {"risk": "App.jsx extractions cause subtle re-render or hook-order regressions",  "mitigation": "Strict before/after visual-regression CI; per-extraction PRs"},
    {"risk": "Export jobs OOM on Render free tier",                                   "mitigation": "Stream PDFs; cap row counts; bump plan if needed before launch"},
    {"risk": "SOC2 readiness reveals undocumented prod access paths",                 "mitigation": "Time-boxed evidence-gathering sweep; raise gaps to assessment §9 backlog"},
  ],
  "out_of_scope": [
    "HIGH-split-risk components (Setup, CISODash, CFODash, DashHub, Execution, CrownJewelsModule, CyberRxApp) — they stay in App.jsx until Phase 2",
    "AI executive summaries (Phase 2)",
    "Predictive breach likelihood model (Phase 3)",
  ],
  "stop_conditions": [
    "Any extraction that fails ACC-06-01 (anchor mismatch) — must regenerate the index first",
    "Bumping App.jsx LOC after T-690 — once it's a shell, additions need a separate plan",
  ],
}

# ──────────────────────────────────────────────────────────────────────────
# Write everything out.
# ──────────────────────────────────────────────────────────────────────────
plans = [
    ("month-1-2-risk-correlation-engine.json", m12),
    ("month-3-cio-clo-dashboards.json",        m3),
    ("month-4-separation-and-security.json",   m4),
    ("month-5-exception-and-evidence.json",    m5),
    ("month-6-polish-and-handoff.json",        m6),
]
summary = []
for filename, doc in plans:
    p = PLANS_DIR / filename
    p.write_text(json.dumps(doc, indent=2), encoding="utf-8")
    n_tasks = len(doc["tasks"])
    n_acc = len(doc["acceptance_criteria"])
    summary.append((filename, p.stat().st_size, n_tasks, n_acc))

print(f"{'file':<50} {'bytes':>8} {'tasks':>6} {'acc':>5}")
for f, b, t, a in summary:
    print(f"{f:<50} {b:>8,} {t:>6} {a:>5}")
print(f"\n   total plans: {len(plans)}")
print(f"   total tasks: {sum(s[2] for s in summary)}")
print(f"   total ACC : {sum(s[3] for s in summary)}")
