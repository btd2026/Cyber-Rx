# Cyber Executive Operating System — Product Vision Coverage Assessment

**Date:** 2026-05-29
**Assessor:** Senior Product Architect / Enterprise Cybersecurity Strategist
**Product:** CyberRx Healthcare Cybersecurity Management Platform
**Version:** 1.0

---

## Executive Summary

This assessment evaluates CyberRx's current implementation against the product vision of a **"Cyber Executive Operating System for healthcare payers"** — a platform that continuously collects cybersecurity, technology, legal, financial, risk, and audit evidence; correlates it to business processes; and routes role-specific insights and actions to six executive roles (CIO, CISO, CFO, CRO, CLO, Internal Audit).

**Bottom Line:** The product has a solid foundation with 4 of 6 executive dashboards, real security tool integrations, and healthcare-specific domain models. However, **critical gaps exist** in risk correlation (the core differentiator), CIO/CLO dashboards, standalone audit view, and continuous evidence collection. The single 24,539-line App.jsx architecture poses maintainability risks, and authentication/multi-tenancy security is incomplete.

**Recommendation:** Prioritize the **Risk Correlation Engine** as the core differentiator, followed by CIO + CLO dashboards, audit separation, and evidence collection workflow.

---

## 1. Coverage Assessment

### ✅ Already Covered

**Executive Dashboards (4 of 6)**
- ✅ **CISO Dashboard:** Security posture, threat landscape, compliance grids (SOC2, NIST CSF, HIPAA, CMS, CIS, GDPR), control effectiveness scoring, KPI tracking
- ✅ **CFO Dashboard:** Financial exposure modeling ($285M gross exposure calculation), RBC capital impact simulation, insurance adequacy analysis, ROSI (security ROI = 311%), scenario analysis (Expected Annual Loss, PHI Breach, Catastrophic Event), peer benchmarking
- ✅ **CRO/Audit Dashboard:** Risk scoring, control validation, compliance drill-downs, risk heatmaps, KRIs tracking
- ✅ **Board Dashboard:** Executive summaries, strategic risk overviews

**Core Platform Components**
- ✅ Healthcare payer org templates (BCBS, Medicare Advantage, Commercial, Multi-line, Medicaid)
- ✅ Crown Jewels framework (Tier 1 Primary, Tier 2 Strategic) — just added
- ✅ CMMI 5-level scoring rubric (0/20/40/60/80 bands)
- ✅ Control library mapped to CIS v8, NIST 800-53 Rev 5, HIPAA Security Rule, CMS 42 CFR, SOC2
- ✅ Vendor ecosystem mapping with tier classification
- ✅ Evidence repository structure (document catalog)
- ✅ ITSM ticket routing to 5 systems: ServiceNow, Jira, Freshservice, BMC Remedy, Cherwell
- ✅ Risk scoring engine with weighted multi-signal model (20% posture + 25% breach + 20% compliance + 15% criticality + 10% data sensitivity)

**Integrations**
- ✅ Real API integrations for 7 security tools: Okta, CrowdStrike, Splunk, KnowBe4, Tenable, ServiceNow, CyberArk
- ✅ ITSM integrations create real tickets/change requests (not mocked)
- ✅ OCR Breach Portal monitoring capability
- ✅ Background scheduler architecture (code exists, unclear if running in production)

**New Capabilities (Just Added in Commit 32e4381)**
- ✅ Continuous multi-signal vendor risk engine (7-layer architecture: External Attack Surface, Breach Detection, Compliance Evidence, Continuous Questionnaires, Fourth-Party Risk, Regulatory Mapping, Dynamic Risk Scoring)
- ✅ Crown Jewels process selection framework (Tier 1: 7 Primary Crown Jewels, Tier 2: 5 Strategic Crown Jewels)

---

### ⚠️ Partially Covered

**Missing Executive Dashboards (2 of 6)**
- ❌ **No standalone CLO / General Counsel dashboard** — Legal/regulatory exposure exists in compliance grids but no dedicated legal view
- ⚠️ **Internal Audit combined with CRO** — No dedicated audit assurance dashboard with control testing UI, evidence repository, findings management, or repeat finding identification

**Data Collection**
- ⚠️ Security tools: 7 working integrations, but 5 are demo-only (Qualys, CyberArk, BeyondTrust, Workday, Microsoft Sentinel)
- ⚠️ No automated asset inventory or discovery
- ⚠️ No data classification engine (PHI/PII/PCI tagging is manual)
- ⚠️ No evidence collection engine (document ingestion, control testing, continuous auditing)

**Risk Correlation**
- ⚠️ Technical findings are NOT fully correlated to business processes as described in the vision
- ❌ The example use case — *"Critical CVE on server"* → business impact narrative* — **does not exist**
- ⚠️ Findings lack: business process linkage, data type tagging, threat scenario mapping, legal exposure quantification, audit evidence requirements

**Workflow & Remediation**
- ✅ ITSM routing exists
- ⚠️ No end-to-end remediation workflow tracking beyond ticket creation
- ❌ No exception/risk acceptance workflow
- ❌ No escalation workflow beyond ITSM ticket creation
- ❌ No approval gates for risk acceptance

**AI Assistant**
- ⚠️ "BrianaBar" narration exists but is accessibility/demo-focused, not functional AI
- ❌ No AI-generated executive summaries
- ❌ No AI that correlates technical issues to executive meaning

---

### ❌ Missing

**Executive Support Gaps**
- ❌ **CIO Dashboard:** No dedicated technology risk dashboard, asset inventory view, crown jewel system identification, patch status tracking, unsupported technology detection, configuration weakness assessment, backup/recovery readiness scoring, change risk analysis
- ❌ **CLO Dashboard:** Entire dashboard is missing (legal cyber exposure, regulatory obligations, breach notification workflow, contract risk, policy exceptions)
- ❌ **Internal Audit:** No independent assurance view, audit universe mapping, control testing UI, repeat finding identification, committee reporting

**Core Platform Gaps**
- ❌ No guided onboarding AI workflow
- ❌ No process-to-system-to-data-to-control mapping visualization
- ❌ No asset inventory module
- ❌ No vendor inventory beyond ecosystem mapping
- ❌ No crown jewel identification workflow
- ❌ No data classification engine
- ❌ No framework crosswalks (NIST↔HIPAA↔CIS mapping)
- ❌ No continuous audit evidence repository
- ❌ No scenario modeling UI
- ❌ No financial exposure modeling calculator (CFO has hard-coded formulas only)
- ❌ No legal/regulatory obligation mapping database
- ❌ No executive ownership assignment system
- ❌ No historical trend tracking
- ❌ No exportable reports (Board, Audit Committee)
- ❌ No role-based permissions enforcement

**Data Model Gaps**
- ❌ No `LegalObligation` entity
- ❌ No `ThreatScenario` entity
- ❌ No `DataObject` entity for PHI/PII/PCI classification
- ❌ No `AuditTest` entity
- ❌ No `Exception` entity with approval workflow
- ❌ No `ExecutiveOwner` assignment entity

---

### ❓ Unclear / Needs Investigation

1. **Background Scheduler Status** — Code exists (`scheduler.js`) but no Render Background Worker entry in `render.yaml`. Is it running in production?
2. **AI Strategy** — BrianaBar exists but is it demo-only or the product wedge? What's the AI positioning?
3. **Single-Tenant vs Multi-Tenant** — Vault is in "local" mode, org isolation via header only. Is the platform intended to be single-tenant per deployment?
4. **CLO Dashboard Placement** — No component exists. Was this planned for a later phase?
5. **Finding-to-Process Correlation** — Code doesn't show linkage. Is this manual or planned?
6. **JWT Authentication** — `users` table exists but no login/signup endpoints. Is auth truly "ready"?
7. **Production Customers** — No revenue, customer count, or pipeline mentioned. Are there real users or just demos?

---

## 2. Module-by-Module Gap Analysis

| Module | Status | Gap | Severity |
|--------|--------|-----|----------|
| **Executive Dashboards** | 4 of 6 built | No CIO dashboard, no CLO dashboard, Audit combined with CRO | **HIGH** |
| **Business Process Mapping** | Crown Jewels framework exists | No process-to-system-to-data-to-control visualization | MEDIUM |
| **Asset/Vendor Inventory** | Vendor ecosystem map exists | No asset inventory module, no vendor risk scoring integration, no fourth-party dependency mapping | **HIGH** |
| **Control Library** | Framework-mapped controls exist | No control testing UI, no effectiveness scoring methodology, no drift detection UI | MEDIUM |
| **Evidence Collection** | Document structure exists | No ingestion engine, no continuous monitoring evidence repository, no control drift alerts | **HIGH** |
| **Risk Scoring** | CMMI scoring exists | No business impact correlation engine, no threat scenario linkage, no automated financial exposure calculation | **HIGH** |
| **Financial Modeling** | CFO dashboard has hard-coded formulas | No calculator UI, no dynamic scenario builder, no peer benchmarking integration | MEDIUM |
| **Legal/Regulatory Mapping** | Compliance grids exist | No obligation database, no breach notification workflow, no contract risk register, no state-by-state notification automation | **HIGH** |
| **Audit Assurance** | Combined with CRO | No independent audit view, no control testing UI, no evidence validation interface, no repeat finding tracking | **HIGH** |
| **Workflow Engine** | ITSM routing exists | No exception request workflow, no risk acceptance approval chain, no escalation tracking beyond ticket creation | **HIGH** |
| **Reporting Engine** | Board report exists | No exportable reports (Word/Excel), no committee reporting packs, no historical trend tracking | MEDIUM |
| **AI Assistant** | BrianaBar narration | No executive summaries generation, no technical-to-executive translation, no predictive analytics | **HIGH** |
| **Integration Architecture** | 12 tools supported, 7 real | 5 are demo-only (Qualys, CyberArk, BeyondTrust, Workday, Sentinel), no evidence ingestion APIs, no asset discovery APIs | MEDIUM |
| **Permissions/Security Model** | Role-based UI exists | No JWT enforcement on API endpoints, no multi-tenant credential isolation, CORS allows all origins with TODO comment | **CRITICAL** |

---

## 3. Prioritized Product Backlog

### MVP MUST-HAVE (Prove Core Value Proposition)

#### 1. Fix Critical Security Gaps (Week 1-2)
**Why:** You can't sell a cybersecurity platform without proper authentication and multi-tenancy.

- [ ] Enforce JWT authentication on all API endpoints
- [ ] Implement real org isolation (header validation + auth identity binding)
- [ ] Tighten CORS to production allowlist (remove `// For now, allow all - tighten in production`)
- [ ] Either deploy background scheduler in production or remove dead code

#### 2. Build Risk Correlation Engine (Week 3-8) ⭐ **CORE DIFFERENTIATOR**
**Why:** This is the wedge. No one else translates technical issues to executive meaning for healthcare payers.

- [ ] **Data Model:** Implement `BusinessProcess`, `Asset`, `DataObject`, `ThreatScenario`, `LegalObligation`, `ExecutiveOwner`
- [ ] **Ingestion:** Manually map existing findings to business processes (start with 10 crown jewel processes)
- [ ] **Correlation Logic:** Build engine that takes "Critical CVE on NASCO" → outputs executive narrative
- [ ] **UI:** Single pane of glass showing finding → full executive narrative with all context
- [ ] **Validation:** Test with real healthcare CIO/CISO — can they understand this in < 30 seconds?

**Output Example:**
```
"F-001: Critical CVE-2024-1234 on NASCO server
Business Impact: Claims Adjudication process, 3M PHI records, $217M ransomware exposure
Frameworks: NIST CSF PR.PS-1, HIPAA §164.308(a)(5), CIS Control 7
Legal: OCR breach notification (60 days), CMS 42 CFR §422.306(c)(1) (5 days)
Owner: Remediation (CIO) | Oversight (CISO/CRO) | Legal (CLO)
Audit Evidence: Penetration test required"
```

#### 3. Build CIO Dashboard (Week 9-12)
**Why:** CIO is a primary stakeholder. This is a gap.

- [ ] Asset inventory view (servers, endpoints, cloud assets, applications)
- [ ] Crown jewel system identification with risk tags
- [ ] Vulnerability and patch status (fully integrate Tenable/Qualys)
- [ ] Unsupported technology detection and replacement tracking
- [ ] Backup/recovery readiness scoring
- [ ] Remediation backlog with IT team ownership and cost-to-fix
- [ ] "Technology Risk Summary" Board export

#### 4. Build CLO Dashboard (Week 13-16)
**Why:** General Counsel is critical for healthcare regulatory compliance. This is a gap.

- [ ] Legal cyber exposure overview (OCR fines, state penalties)
- [ ] Regulatory obligation tracker (HIPAA, CMS, state privacy laws)
- [ ] Breach notification workflow by state (timeline calculator, pre-populated forms)
- [ ] Contract risk register (vendor security clauses, audit rights, liability caps)
- [ ] Policy exceptions with legal impact analysis
- [ ] Liability/indemnification summary

#### 5. Separate Internal Audit Dashboard (Week 17-18)
**Why:** Internal auditors need independence from risk management. Combining with CRO dilutes both functions.

- [ ] Separate Audit dashboard from CRO view
- [ ] Audit universe mapping (processes, controls, tests, last test, next test)
- [ ] Control testing UI (test plan, procedure, evidence collection, result)
- [ ] Evidence repository (document upload, versioning, auditor notes)
- [ ] Findings management (severity, management action plan, target, status)
- [ ] Repeat finding detection (same control, same deficiency, different year)
- [ ] Committee reporting pack export

#### 6. Implement Evidence Collection Engine (Week 19-24)
**Why:** Prove continuous validation vs annual questionnaires. This is a key differentiator.

- [ ] Document ingestion (SOC2, HITRUST, pen test reports, policies)
- [ ] AI-powered control extraction ("MFA enabled for privileged accounts" → map to PR.AA-2)
- [ ] Control drift detection (attestation vs external validation)
- [ ] Continuous evidence refresh triggers
- [ ] Evidence-to-control linking

#### 7. Build Exception Workflow (Week 25-28)
**Why:** Risk acceptance is a real business process. It needs a workflow.

- [ ] Exception request form with business justification
- [ ] Approval workflow (CISO → CRO → CLO → Board)
- [ ] Time-bound exceptions with auto-expiry
- [ ] Risk register integration
- [ ] Exception tracking dashboard

#### 8. Split App.jsx into Components (Ongoing, Weeks 1-12)
**Why:** 24,539-line single file will scare enterprise buyers worried about maintainability.

- [ ] Break into component-per-page structure
- [ ] Maintain 100% functionality
- [ ] Improve development velocity
- [ ] Enable team scaling

---

### PHASE 2 (Complete Executive Coverage)

#### 9. Financial Exposure Calculator (Week 29-32)
- [ ] Dynamic scenario builder (ransomware, breach, FWA, business interruption)
- [ ] Organization-specific parameter input (revenue, surplus, PHI records)
- [ ] Insurance sub-limit modeling
- [ ] RBC impact simulation calculator
- [ ] Cost-to-remediate vs loss exposure comparison

#### 10. Scenario Modeling (Week 33-36)
- [ ] Pre-built threat scenarios (Supply chain, Ransomware on NASCO, Insider fraud)
- [ ] Monte Carlo loss distribution
- [ ] Business process impact simulation
- [ ] Capital adequacy stress testing

#### 11. Legal/Regulatory Obligation Database (Week 37-40)
- [ ] HIPAA Security/Privacy/Breach Notification rules
- [ ] State-by-state breach notification requirements
- [ ] CMS 42 CFR Part 422 (Medicare Advantage)
- [ ] NAIC Model Law adoption by state
- [ ] Contract clause library (security standards, audit rights, liability caps)

#### 12. Historical Trend Tracking (Week 41-44)
- [ ] Time-series for all metrics (posture, compliance, risk scores)
- [ ] Executive ownership changes over time
- [ ] Remediation velocity tracking
- [ ] Control effectiveness trends

#### 13. Board & Audit Committee Reporting (Week 45-48)
- [ ] Exportable PDF/Excel reports
- [ ] Executive presentation builder
- [ ] Committee pack generation
- [ ] Anonymous peer benchmarking

---

### PHASE 3 (Enterprise Differentiators)

#### 14. AI Executive Summaries (Week 49-52)
- [ ] "In plain English: This vulnerability on NASCO affects claims processing..."
- [ ] Natural language generation for findings
- [ ] Executive-ready one-pagers

#### 15. Guided Onboarding AI Workflow (Week 53-56)
- [ ] Conversational setup bot
- [ ] Healthcare payer template selection
- [ ] Process discovery interview
- [ ] System/vendor import wizard
- [ ] Control framework selection
- [ ] Executive owner assignment

#### 16. Continuous Audit Evidence Repository (Week 57-60)
- [ ] Control testing evidence auto-collection
- [ ] Evidence versioning
- [ ] Auditor access portal
- [ ] Finding recurrence analysis

#### 17. Fourth-Party Risk Mapping (Week 61-64)
- [ ] Vendor dependency graph
- [ ] Vendor-of-vendor monitoring
- [ ] Concentration risk analysis
- [ ] Supply chain breach impact

---

### ENTERPRISE DIFFERENTIATORS (Long-term Competitive Moat)

#### 18. Predictive Breach Likelihood Model
- [ ] ML model trained on healthcare breach data
- [ ] Vendor risk scoring
- [ ] Control effectiveness prediction
- [ ] Early warning system

#### 19. Autonomous Reassessment
- [ ] Trigger re-tests on control drift
- [ ] Auto-request updated vendor evidence
- [ ] Continuous questionnaire validation

#### 20. Vendor Attack Path Modeling
- [ ] Graph-based attack path visualization
- [ ] "Change Healthcare breach → our claims → our members" paths
- [ ] Blast radius calculation

---

## 4. User Stories for Each Executive

### CIO

**As a** CIO of a Medicare Advantage health plan
**I need** a technology risk dashboard that shows me which systems and vulnerabilities pose the greatest threat to our crown jewel business processes
**So that** I can prioritize my team's remediation efforts and justify security investments to the CFO and Board

**Acceptance Criteria:**
- [ ] Dashboard shows asset inventory (servers, endpoints, cloud assets, applications)
- [ ] Each asset displays: crown jewel tag (yes/no), business process supported, criticality tier, data classification, vulnerability count, patch status, support status (supported/end-of-life)
- [ ] Remediation backlog view shows: severity, business impact, owner, estimated fix time, cost-to-fix
- [ ] I can filter by crown jewel systems only
- [ ] I can see unsupported/end-of-life technology with replacement options
- [ ] I can export a "Technology Risk Summary" for Board meetings

---

### CISO

**As a** CISO of a BCBS-affiliated health plan
**I need** an enterprise cyber risk register that correlates technical controls to business processes, frameworks, and threat scenarios
**So that** I can answer the Board's question "Are our cyber controls reducing the right risks?" and demonstrate ROI

**Acceptance Criteria:**
- [ ] Risk register shows: technical finding, business process impacted, system, data type, threat scenario (ransomware/phishing/insider), frameworks (NIST/HIPAA/CIS citations), control effectiveness score, trend (improving/stable/degrading)
- [ ] Each risk has: executive owner (CIO/CISO/CFO/CRO/CLO), remediation owner, target resolution date, financial exposure, legal exposure
- [ ] Control effectiveness scored: design effectiveness vs operating effectiveness vs continuous validation
- [ ] Policy exception tracker with approval chain and expiry dates
- [ ] Board-ready one-page summary with: top 5 risks, control posture vs last quarter, major incidents, insurance adequacy
- [ ] Threat landscape view: healthcare sector breach activity, ransomware targeting health plans, OCR enforcement trends

---

### CFO

**As a** CFO of a multi-line health insurer
**I need** to see our cyber financial exposure in dollars, understand our insurance coverage gaps, and quantify the ROI of security investments
**So that** I can answer "What's our worst-case financial exposure?" and make informed decisions about cyber insurance and security budget

**Acceptance Criteria:**
- [ ] Gross exposure calculated from: PHI breach notification costs, regulatory fines (OCR/CMS), business interruption, fraud losses, reputational churn, legal costs, IT recovery
- [ ] Insurance adequacy table showing: exposure category, gross exposure, policy limit, coverage, gap, exclusions noted
- [ ] RBC capital impact simulation: pre-breach ratio vs post-breach ratio, regulatory intervention trigger
- [ ] Security ROI calculator: security spend vs avoided loss (ROSI), comparison to industry peers
- [ ] Scenario analysis: Expected Annual Loss, Significant PHI Breach (23% probability), Catastrophic Event (8% probability)
- [ ] Investment prioritization: cost-to-remediate vs loss exposure, NPV calculation
- [ ] Cyber budget tracking: planned vs actual, by control domain (IAM, endpoint, cloud, vendor risk)

---

### CRO

**As a** Chief Risk Officer of a Medicaid MCO
**I need** to understand whether cyber risk is within our enterprise risk appetite and how it correlates to other risk types (operational, financial, reputational)
**So that** I can report to the Audit Committee and coordinate with the CISO on risk acceptance decisions

**Acceptance Criteria:**
- [ ] Cyber-to-enterprise risk map: cyber KRIs vs operational/financial/reputational KRIs
- [ ] Risk appetite visualization: tolerance bands, current status, breaches
- [ ] Risk acceptance workflow: request form, CISO/CLO/CFO/Board approval chain, time-bound acceptance, justification
- [ ] Third-party risk view: vendor concentration, business process dependency, fourth-party exposure
- [ ] Business process risk scoring: each process (claims, enrollment, etc.) with cyber risk vs operational risk
- [ ] Enterprise risk register integration: cyber findings mapped to enterprise risk IDs
- [ ] Committee reporting: Audit Committee pack, Risk Committee pack, slide export

---

### CLO / General Counsel

**As a** General Counsel of a Medicare Advantage plan
**I need** to see where cyber issues create legal or regulatory exposure, track breach notification obligations, and manage vendor contract risk
**So that** I can advise the Board on regulatory risk and ensure our vendor contracts protect us from cyber incidents

**Acceptance Criteria:**
- [ ] Legal cyber exposure overview: OCR breach notification risk (by state), CMS sanction risk, state DOI regulatory risk, class action exposure
- [ ] Regulatory obligation tracker: HIPAA (Security/Privacy/Breach Notification), CMS 42 CFR, state privacy laws, NAIC Model Law adoption
- [ ] Breach notification workflow: by state, by data type (PHI/PII/PCI), by timeline (48-hour vs 60-day vs "unreasonable delay"), pre-populated notification forms
- [ ] Contract risk register: vendor contracts reviewed for security clauses, audit rights, breach notification terms, liability caps, indemnification
- [ ] Policy exceptions with legal impact: which exceptions create regulatory non-compliance, legal review workflow
- [ ] Legal hold workflow: preserve evidence for litigation, privilege log
- [ ] Board reporting: legal cyber exposure summary, significant cases, regulatory inquiries

---

### Internal Auditor

**As an** Internal Auditor for a BCBS plan
**I need** to independently validate that controls are working, collect evidence, and track findings from year to year
**So that** I can provide assurance to the Audit Committee and identify repeat control deficiencies

**Acceptance Criteria:**
- [ ] Audit universe map: processes, controls, test frequency, last test date, next test date
- [ ] Control testing UI: test plan, test procedure, evidence collection, result (pass/fail/n/a), findings
- [ ] Evidence repository: document upload, evidence linking to controls, versioning, auditor notes
- [ ] Findings management: issue log, severity, management action plan, target resolution, status (open/remediated/repeat)
- [ ] Repeat finding identification: same control, same deficiency, different year
- [ ] Management assertion validation: management says "MFA enabled" → auditor validates with evidence
- [ ] Committee reporting: Executive Summary, Significant Findings, Management Response, Next Quarter's Plan
- [ ] Export to Word/Excel for audit working papers

---

## 5. Recommended Data Model

### Core Entities

```javascript
// 1. Organization (exists, expand)
Organization {
  id, name, type, hasFEP, bcbsAffiliated, setupJson

  // Financial baseline
  revenue, surplus, ibnr, itBudget

  // Member/PPI data
  phiRecords, memberCount, providerCount

  // Insurance
  insLimit, insDeductible, insExclusions[]

  // RBC
  rbcRatioCurrent, rbcRatioTarget

  // Templates
  processes[], frameworks[], controls[]
}

// 2. BusinessProcess (NEW - align with Crown Jewels)
BusinessProcess {
  id, name, tier (Primary/Strategic), criticality, owner (exec role)

  // Examples from your framework:
  // Tier 1 Primary: Claims Adjudication, Membership & Enrollment,
  //               Provider Network & Contracting, Care Management,
  //               Payment Integrity, Member Services, Actuarial
  // Tier 2 Strategic: Government Programs, Pharmacy/PBM,
  //                 Compliance & Regulatory, Identity & Access,
  //                 Data & Analytics

  supportedBySystems[], createsDataObjects[], governedByControls[]
}

// 3. Application (expand current model)
Application {
  id, name, type (claims/enrollment/care_mgmt/etc), crownJewel (boolean)
  businessProcessesSupported[], hostsDataObjects[], hasControls[]

  // Tech risk
  supported (boolean), endOfSupportDate, vulnCount, patchStatus
  owner (IT team), contactEmail
}

// 4. Vendor (expand current model)
Vendor {
  id, name, tier (Critical/High/Medium/Low), category (clearinghouse/PBM/cloud/etc)

  // Services
  services[], businessProcessesSupported[], handlesDataTypes[]

  // Risk monitoring (from vendor risk engine)
  externalScore, breachRisk, complianceScore, criticality, dataSensitivity

  // Evidence
  soc2Report, hitrustReport, pentestReport, insuranceCert, sdlAttestation

  // Contracts
  contractId, securityClauses[], auditRights, liabilityCap, indemnification

  // Fourth-party
  dependsOnVendors[], fourthPartyRiskScore
}

// 5. Asset (NEW - critical gap)
Asset {
  id, name, type (server/endpoint/database/cloud/API/app), hostname/ip
  businessProcessId[], applicationId[], dataClassification[], owner
}

// 6. DataObject (NEW - for PHI/PII/PCI classification)
DataObject {
  id, name, type (PHI/PII/PCI/Financial/Legal/Confidential)
  sensitivity (Critical/High/Medium/Low), recordCount
  residesInSystems[], accessedByApps[], protectedByControls[]
}

// 7. Control (expand current model)
Control {
  id, name, frameworkId (NIST/HIPAA/CIS/etc), ref (PR.PS-1, etc.)
  description, type (preventive/detective/corrective)

  // Effectiveness
  designEffectiveness, operatingEffectiveness, lastTestDate, lastTestResult

  // Evidence
  evidence[], driftDetected (boolean), managementAssertion

  // Ownership
  processOwner, controlOwner, evidenceOwner
}

// 8. Framework (exists)
Framework {
  id, name, version, controls[]
  // NIST CSF 2.0, HIPAA Security Rule, CIS v8, etc.
}

// 9. Evidence (NEW - critical gap)
Evidence {
  id, controlId, type (SOC2/HITRUST/penetrationTest/screenshot/log/policy)
  documentUrl, uploadDate, validUntil, collectedBy (tool/manual)
  extractedControls[], validated (boolean), notes
}

// 10. Risk (expand current model)
Risk {
  id, title, severity, status (open/mitigating/accepted/closed)

  // Technical linkage
  findingId, assetId, applicationId, vendorId

  // Business impact (NEW - correlation engine)
  businessProcessId[], dataObjectIds[], threatScenarioId

  // Framework mapping
  frameworkMappings[] (NIST PR.PS-1, HIPAA §164.308(a)(5), CIS Control 7)

  // Financial
  financialExposure, costToRemediate

  // Legal (NEW)
  legalObligationId[], regulatoryCitation

  // Ownership
  executiveOwner, remediationOwner, evidenceOwner

  // Audit
  auditEvidenceRequired, auditTestIds[]
}

// 11. ThreatScenario (NEW - critical gap)
ThreatScenario {
  id, name, type (ransomware/phishing/insider/supply_chain/misconfig)
  probability, impactLevel, description, mitreTechnique[]

  // Mapped to risks
  exploitedRisks[]
}

// 12. FinancialImpact (NEW - CFO model)
FinancialImpact {
  id, riskId, scenarioId
  breachResponseCost, regulatoryFine, businessInterruption, fraudLoss
  reputationalLoss, legalCost, recoveryCost
  totalGross, insuranceCoverage, netExposure
}

// 13. LegalObligation (NEW - CLO model)
LegalObligation {
  id, name, source (HIPAA/CMS/State/NAIC/Contract)
  citation, notificationTimeline (hours/days), applicability[], penalties[]
}

// 14. AuditTest (NEW - Audit model)
AuditTest {
  id, controlId, name, testPlan, testProcedure, frequency (quarterly/annual)
  lastTestDate, lastTester, result (pass/fail/n/a), findings[]
  evidenceIds[], managementAssertion
}

// 15. Finding (exists, expand)
Finding {
  id, title, description, severity, status, discoveredDate

  // Link to risk
  riskId, assetId, applicationId, businessProcessId

  // Repeat detection
  isRepeat (boolean), originalFindingId, repeatCount

  // Remediation
  remediationPlan, targetDate, owner, status
}

// 16. RemediationTask (exists)
RemediationTask {
  id, findingId, actionId, status, assignedTo, assignedDate, dueDate
  itsmSystem, ticketRef, ticketUrl, completedDate
}

// 17. Exception (NEW - risk acceptance workflow)
Exception {
  id, controlId, riskId, requestedBy, justification
  approvalChain[], status (pending/approved/denied/expired), expiryDate
  conditions[]
}

// 18. ExecutiveOwner (NEW - governance)
ExecutiveOwner {
  id, roleId (CIO/CISO/CFO/CRO/CLO/Audit), userId, organizationId
  scope (processes[], controls[], risks[])
}
```

### Key Relationships

- **BusinessProcess** → **Application** → **Asset** (process-to-system-to-infrastructure)
- **Asset** → **DataObject** (what data lives where)
- **Control** → **Evidence** → **AuditTest** (control validation)
- **Finding** → **Risk** → **BusinessProcess** → **FinancialImpact** (correlation engine)
- **Vendor** → **BusinessProcess** → **DataObject** (third-party risk)
- **ThreatScenario** → **Risk** → **LegalObligation** (threat-to-regulatory mapping)

---

## 6. Recommended Dashboard Layout for Each Executive

See detailed dashboard mockups in the main assessment document. Each dashboard layout includes:
- Top KPI strip
- Role-specific visualizations
- Risk correlation output
- Executive actions
- Board reporting exports

---

## 7. Recommended MVP Scope

### What to Build First (90 days)

1. **Fix Critical Security Gaps** (Week 1-2)
   - Enforce JWT on all API endpoints
   - Tighten CORS to production allowlist
   - Implement org isolation via auth

2. **Build Risk Correlation Engine** (Week 3-6) ⭐ **CORE DIFFERENTIATOR**
   - Technical finding → Business process → System → Data type
   - Threat scenario assignment
   - Framework/control cross-reference
   - Executive ownership assignment
   - Single-pane-of-glass view: "This CVE affects claims processing, creates $217M exposure, maps to HIPAA §164.308(a)(5), CIO owns remediation"

3. **Build CIO Dashboard** (Week 7-10)
   - Asset inventory view
   - Crown jewel system identification
   - Vulnerability/patch status
   - Remediation backlog with ownership
   - "Technology Risk Summary" Board export

4. **Build CLO Dashboard** (Week 11-14)
   - Legal cyber exposure overview
   - Regulatory obligation tracker
   - Breach notification workflow (by state)
   - Contract risk register
   - Policy exceptions with legal impact

5. **Split Internal Audit from CRO** (Week 15-16)
   - Separate Audit dashboard
   - Control testing UI
   - Evidence repository
   - Findings management

6. **Implement Evidence Collection** (Week 17-20)
   - Document ingestion (SOC2, HITRUST, pen test)
   - AI-powered control extraction
   - Control drift detection

7. **Build Exception Workflow** (Week 21-24)
   - Exception request form
   - Approval workflow (CISO→CRO→CLO→Board)
   - Time-bound exceptions with auto-expiry

8. **Split App.jsx** (Ongoing)
   - Component-per-page structure
   - Maintain functionality

### What to Defer

- AI executive summaries (Phase 2)
- Guided onboarding AI (Phase 2)
- Autonomous reassessment (Phase 3)
- Predictive breach likelihood (Phase 3)
- Board reporting exports (Phase 2)
- Historical trend tracking (Phase 2)

### MVP Success Criteria

1. CIO can answer: "Which technology risks must my teams fix first?" in 5 minutes
2. CISO can answer: "Are our controls reducing the right risks?" with board-ready proof
3. CFO can answer: "What's our worst-case financial exposure?" with scenario analysis
4. CRO can answer: "Is cyber risk within our enterprise risk appetite?" with KRIs
5. CLO can answer: "Where do cyber issues create legal exposure?" with notification workflow
6. Auditor can answer: "Can we prove controls are working?" with evidence and repeat detection
7. **Risk correlation works:** Technical finding → executive narrative in < 3 clicks

---

## 8. Risks with Current Product Direction

### Too Broad
- **18 pages is too many for MVP** — You're trying to be everything at once. Focus on 6 executive dashboards + risk correlation engine.
- **All frameworks at once** — NIST + HIPAA + CIS + SOC2 + PCI + CMS + GDPR + NAIC. Pick 3 for healthcare: HIPAA, NIST CSF, CIS v8. Others are add-ons.

### Unrealistic
- **Background scheduler not running** — Code exists but no worker deployed. Either run it or remove it.
- **JWT "ready" but not enforced** — Auth is incomplete. Either build it or don't claim it.
- **Multi-tenant vault in "local" mode** — You're not multi-tenant today. Either fix it or document single-tenant boundary.

### Missing
- **No CIO dashboard** — CIO is a primary stakeholder. This is a gap.
- **No CLO dashboard** — General Counsel is critical for healthcare. This is a gap.
- **No standalone Audit dashboard** — Internal Audit is a distinct function. Combining with CRO dilutes both.
- **No risk correlation** — The "technical finding → executive meaning" engine you described doesn't exist. This is the core differentiator.

### Weakly Defined
- **AI strategy is unclear** — BrianaBar is accessibility/demo, not functional AI. What's the product wedge?
- **Role-based permissions** — UI has roles but no enforcement. What's the security model?
- **Data classification** — PHI/PII/PCI mentioned but no engine. Manual tagging doesn't scale.

### Likely to Confuse Buyers
- **"Healthcare Payer Edition" branding** — Are you expanding to providers, life sciences, employers? If so, when? Pick one vertical first.
- **Single-file architecture** — 24,539-line App.jsx will scare enterprise buyers worried about maintainability.
- **Demo data in production** — Fallbacks to demo values when integrations aren't connected. Buyers will distrust real data.

---

## 9. Final Recommendation

### Build Exactly This Next:

#### Month 1-2: Risk Correlation Engine ⭐ **THE CORE DIFFERENTIATOR**

**Technical Finding → Business Impact → Executive Action**

1. **Data Model:** Implement `BusinessProcess`, `Asset`, `DataObject`, `ThreatScenario`, `LegalObligation`, `ExecutiveOwner`
2. **Ingestion:** Map existing findings to business processes manually (start with 10 crown jewel processes)
3. **Correlation:** Build the engine that takes "Critical CVE on NASCO" and outputs:
   - "This vulnerability affects Claims Adjudication, supports 3M PHI records, creates $217M ransomware exposure, maps to NIST PR.PS-1 and HIPAA §164.308(a)(5), requires CIO remediation with CISO oversight, creates OCR breach notification obligation, audit evidence: penetration test required"
4. **UI:** Single pane of glass showing finding → full executive narrative
5. **Validation:** Test with real healthcare CIO/CISO — can they understand this in < 30 seconds?

#### Month 3: CIO + CLO Dashboards

1. **CIO Dashboard:** Asset inventory, crown jewel systems, remediation backlog, patch status
2. **CLO Dashboard:** Legal exposure, regulatory obligations, breach notification workflow, contract risk
3. **Integration:** Both dashboards consume from Risk Correlation Engine

#### Month 4: Separation & Security

1. **Split Internal Audit from CRO:** Standalone audit dashboard with control testing and evidence repository
2. **Enforce Auth:** JWT on all endpoints, org isolation, CORS hardening
3. **Evidence Collection:** Document ingestion + AI control extraction for 5 controls (prove the concept)

#### Month 5: Exception Workflow + Evidence Validation

1. **Exception Workflow:** Request → CISO→CRO→CLO→Board approval → time-bound expiry
2. **Control Drift Detection:** Attestation vs external validation (MFA example from vision)
3. **Audit Evidence Repository:** Link controls to evidence, validate management assertions

#### Month 6: Polish + MVP Handoff

1. **Split App.jsx:** Component-per-page (no functionality loss)
2. **Board Reports:** Exportable one-pagers for each executive
3. **Documentation:** Onboarding guide, API docs, data model docs
4. **Security:** SOC2 readiness (ironic gap — a cybersecurity platform without SOC2)

### Why This Order?

1. **Risk correlation is the wedge** — No one else translates technical issues to executive meaning for healthcare payers. This is your differentiator.
2. **CIO + CLO are the gaps** — You have CISO/CFO/CRO/Board. Build the missing 2.
3. **Audit separation** — Internal auditors are distinct from risk management. Give them their own view.
4. **Security is table stakes** — You can't sell a cybersecurity platform without proper auth and multi-tenancy.
5. **Evidence + drift detection** — Proves continuous validation vs annual questionnaires (your vision)

### What NOT to Build Yet

- AI executive summaries (correlation engine is more important)
- Guided onboarding AI (manual onboarding is fine for MVP)
- Fourth-party risk mapping (Phase 2)
- Historical trends (Phase 2)
- Board reporting exports (Phase 2)
- Autonomous reassessment (Phase 3)
- Predictive breach likelihood (Phase 3)

### Critical Success Question

**Can you show a healthcare CIO this screenshot and have them say "Yes, I understand exactly what this means, who owns it, and what to do next" in < 30 seconds?**

```
┌─────────────────────────────────────────────────────┐
│  F-001: Critical CVE-2024-1234 on NASCO server    │
│                                                     │
│  Business Impact:                                  │
│  ┌─────────────────────────────────────────────┐  │
│  │ Process: Claims Adjudication                 │  │
│  │ System: NASCO Claims Platform                │  │
│  │ Data: 3M PHI records                         │  │
│  │ Threat: Ransomware (LockBit)                │  │
│  │ Exposure: $217M business interruption        │  │
│  └─────────────────────────────────────────────┘  │
│                                                     │
│  Frameworks:                                         │
│  • NIST CSF PR.PS-1                               │
│  • HIPAA Security Rule §164.308(a)(5)             │
│  • CIS Control 7                                   │
│                                                     │
│  Legal Obligation:                                  │
│  • OCR breach notification (60 days)               │
│  • CMS 42 CFR §422.306(c)(1) (5 days)            │
│                                                     │
│  Ownership:                                          │
│  • Remediation Owner: CIO                          │
│  • Risk Oversight: CISO/CRO                        │
│  • Legal Review: CLO                               │
│  • Audit Evidence: Pen test required              │
│                                                     │
│  [Route to ServiceNow] [View in CIO Dashboard]    │
└─────────────────────────────────────────────────────┘
```

**If yes, you have a product. If no, keep building the correlation engine until they can.**

---

## Appendix: Current State Summary

### What Currently Exists (from codebase analysis)

**Frontend (React 19 + Vite 8)**
- 18 pages in single 24,539-line App.jsx file
- Executive dashboards: CISO, CRO/Audit, CFO, Board (4 of 6)
- Healthcare-specific org templates and process catalogs
- Embedded datasets: CIS v8, NIST, HIPAA, CMS controls, vendor ecosystem

**Backend (Node 20 + Express)**
- Real API integrations: 5 ITSM systems, 7 security tools
- Background scheduler code (deployment status unclear)
- PostgreSQL database with 5 tables (orgs, users, metrics, route_actions, tool_connections)
- Credential vault (local mode, not multi-tenant)

**Deployment**
- Frontend: Vercel
- Backend: Render
- Database: Render PostgreSQL
- Authentication: JWT configured but not enforced

**Security Gaps**
- CORS allows all origins with TODO comment
- No JWT enforcement on endpoints
- No multi-tenant credential isolation
- Demo data fallbacks in production

---

**Document Version:** 1.0
**Last Updated:** 2026-05-29
**Next Review:** After MVP completion (estimated 2026-09-01)
