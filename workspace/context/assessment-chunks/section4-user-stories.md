## 4. User Stories for Each Executive

### CIO

As a CIO of a Medicare Advantage health plan, I need a technology risk dashboard that shows me which systems and vulnerabilities pose the greatest threat to our crown jewel business processes, so that I can prioritize my team's remediation efforts and justify security investments to the CFO and Board.

Acceptance Criteria:
- Dashboard shows asset inventory (servers, endpoints, cloud assets, applications)
- Each asset displays: crown jewel tag (yes/no), business process supported, criticality tier, data classification, vulnerability count, patch status, support status (supported/end-of-life)
- Remediation backlog view shows: severity, business impact, owner, estimated fix time, cost-to-fix
- I can filter by crown jewel systems only
- I can see unsupported/end-of-life technology with replacement options
- I can export a "Technology Risk Summary" for Board meetings

### CISO

As a CISO of a BCBS-affiliated health plan, I need an enterprise cyber risk register that correlates technical controls to business processes, frameworks, and threat scenarios, so that I can answer the Board's question "Are our cyber controls reducing the right risks?" and demonstrate ROI.

Acceptance Criteria:
- Risk register shows: technical finding, business process impacted, system, data type, threat scenario (ransomware/phishing/insider), frameworks (NIST/HIPAA/CIS citations), control effectiveness score, trend (improving/stable/degrading)
- Each risk has: executive owner (CIO/CISO/CFO/CRO/CLO), remediation owner, target resolution date, financial exposure, legal exposure
- Control effectiveness scored: design effectiveness vs operating effectiveness vs continuous validation
- Policy exception tracker with approval chain and expiry dates
- Board-ready one-page summary with: top 5 risks, control posture vs last quarter, major incidents, insurance adequacy
- Threat landscape view: healthcare sector breach activity, ransomware targeting health plans, OCR enforcement trends

### CFO

As a CFO of a multi-line health insurer, I need to see our cyber financial exposure in dollars, understand our insurance coverage gaps, and quantify the ROI of security investments, so that I can answer "What's our worst-case financial exposure?" and make informed decisions about cyber insurance and security budget.

Acceptance Criteria:
- Gross exposure calculated from: PHI breach notification costs, regulatory fines (OCR/CMS), business interruption, fraud losses, reputational churn, legal costs, IT recovery
- Insurance adequacy table showing: exposure category, gross exposure, policy limit, coverage, gap, exclusions noted
- RBC capital impact simulation: pre-breach ratio vs post-breach ratio, regulatory intervention trigger
- Security ROI calculator: security spend vs avoided loss (ROSI), comparison to industry peers
- Scenario analysis: Expected Annual Loss, Significant PHI Breach (23% probability), Catastrophic Event (8% probability)
- Investment prioritization: cost-to-remediate vs loss exposure, NPV calculation
- Cyber budget tracking: planned vs actual, by control domain (IAM, endpoint, cloud, vendor risk)

### CRO

As a Chief Risk Officer of a Medicaid MCO, I need to understand whether cyber risk is within our enterprise risk appetite and how it correlates to other risk types (operational, financial, reputational), so that I can report to the Audit Committee and coordinate with the CISO on risk acceptance decisions.

Acceptance Criteria:
- Cyber-to-enterprise risk map: cyber KRIs vs operational/financial/reputational KRIs
- Risk appetite visualization: tolerance bands, current status, breaches
- Risk acceptance workflow: request form, CISO/CLO/CFO/Board approval chain, time-bound acceptance, justification
- Third-party risk view: vendor concentration, business process dependency, fourth-party exposure
- Business process risk scoring: each process (claims, enrollment, etc.) with cyber risk vs operational risk
- Enterprise risk register integration: cyber findings mapped to enterprise risk IDs
- Committee reporting: Audit Committee pack, Risk Committee pack, slide export

### CLO

As a General Counsel of a Medicare Advantage plan, I need to see where cyber issues create legal or regulatory exposure, track breach notification obligations, and manage vendor contract risk, so that I can advise the Board on regulatory risk and ensure our vendor contracts protect us from cyber incidents.

Acceptance Criteria:
- Legal cyber exposure overview: OCR breach notification risk (by state), CMS sanction risk, state DOI regulatory risk, class action exposure
- Regulatory obligation tracker: HIPAA (Security/Privacy/Breach Notification), CMS 42 CFR, state privacy laws, NAIC Model Law adoption
- Breach notification workflow: by state, by data type (PHI/PII/PCI), by timeline (48-hour vs 60-day vs "unreasonable delay"), pre-populated notification forms
- Contract risk register: vendor contracts reviewed for security clauses, audit rights, breach notification terms, liability caps, indemnification
- Policy exceptions with legal impact: which exceptions create regulatory non-compliance, legal review workflow
- Legal hold workflow: preserve evidence for litigation, privilege log
- Board reporting: legal cyber exposure summary, significant cases, regulatory inquiries

### Auditor

As an Internal Auditor for a BCBS plan, I need to independently validate that controls are working, collect evidence, and track findings from year to year, so that I can provide assurance to the Audit Committee and identify repeat control deficiencies.

Acceptance Criteria:
- Audit universe map: processes, controls, test frequency, last test date, next test date
- Control testing UI: test plan, test procedure, evidence collection, result (pass/fail/n/a), findings
- Evidence repository: document upload, evidence linking to controls, versioning, auditor notes
- Findings management: issue log, severity, management action plan, target resolution, status (open/remediated/repeat)
- Repeat finding identification: same control, same deficiency, different year
- Management assertion validation: management says "MFA enabled" -> auditor validates with evidence
- Committee reporting: Executive Summary, Significant Findings, Management Response, Next Quarter's Plan
- Export to Word/Excel for audit working papers

---
