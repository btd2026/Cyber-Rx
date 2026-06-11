# Setup Question → Process / Calculation Mapping

Every setup question maps deterministically to the processes it preselects and
the calculations/dashboards it feeds — nothing is random (Papa items #7, dev
tickets #01/#06). This is the reference table.

## Question → business-process selection

| Setup question | Drives process selection | Logic |
|---|---|---|
| Organization type | Entire process template | `getOrgTemplate(orgType)` selects the org-type template; `mandatoryProcs` become the suggested set |
| CMS contracts (`cmsContract`) | Medicare Advantage (`govt_ma`), Medicaid (`govt_mcaid`), FEP (`govt_fep`) | `computeSuggestedProcs()` — government processes appear **only** when the org holds those contracts |
| BCBS affiliation | FEP (`govt_fep`) | `hasFEP` flag |
| Org delivers care (integrated payer-provider) | Provider Operations section (`patient_access`, `clinical_ops`, `revenue_cycle`, `him_records`, `telehealth`) | Offered in the master table; user selects when applicable |

## Master process taxonomy (payers + providers)

Payer (HFMA / AHIP / CAQH CORE): Claims Adjudication & Payment · Membership &
Enrollment · Provider Network & Contracting · Care/Medical Management · Prior
Authorization & Utilization Management · Payment Integrity / FWA · Member
Services · Premium Billing & Collections · Actuarial/Underwriting ·
Pharmacy/PBM · Compliance & Regulatory Reporting · Identity & Access ·
Data & Analytics Platforms · Government Programs (MA, FEP, Medicaid).

Provider (HFMA revenue cycle / ONC / HIM): Patient Access & Scheduling ·
Clinical Care Delivery & EHR Operations · Provider Revenue Cycle Management ·
Health Information Management · Telehealth & Remote Care.

## Question → calculation / dashboard consumers

| Question (chat id) | metric_inputs key | Consumed by |
|---|---|---|
| revenue | `revenue` | CFO exposure model, inherent risk, CISO exec summary |
| memberCount | `member_count` | CFO/Board models, inherent risk |
| phiRecs | `phi_records` | Breach cost model, CFO/CISO/CRO, inherent risk |
| claimsAmt | — (setup_json) | CFO claims-risk context |
| surplus | `surplus` | Capital-at-risk %, RBC impact, agent status |
| rbcRatio | `rbc_ratio_current` | CFO RBC pre/post |
| ibnr | `ibnr` | CFO claims stress |
| insCarrier / insLimit / insDeduct | `ins_limit`, `ins_deductible` | Insurance adequacy, net exposure |
| itBudget | `it_budget` | ROSI, recovery cost |
| employees / endpoints | `endpoints` | Training/EDR denominators |
| cmsContract | — | Process preselection (above), CMS framework relevance |
| Step 5 posture baseline (MFA, PAM, training, phishing, patch, vuln SLA, EDR, SIEM, MTTD, MTTR) | `mfa_pct` … `mttr_hrs` | Posture score, CISO Top-10, NIST CSF automatic categories, all framework scorecards |
| Security Evidence interview (19 q) | `csf_evidence` | NIST CSF manual/partial categories, all 9 framework scorecards, Zadkiel document review |

Application→process mapping in Step 3 is performed against this taxonomy by
the AI import parser prompted with health-insurance domain context
(claims/enroll/provider/care/finance/member_svc/compliance/it_sec).
