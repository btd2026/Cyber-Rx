# Nerion end-to-end demo — Hewlett Packard Enterprise (HPE)

A complete, self-consistent sample dataset for a **full end-to-end demo** — from onboarding
through to the operating cockpit — with **zero illustrative fallback**. Every upload slot in
onboarding has a matching file here, and every file has been verified to parse against the real
onboarding parser (`node _verify-parse.mjs`).

> These are **synthetic demo documents** modelled on a public company for realism. Figures are
> plausible but illustrative of the *demo*, not HPE's actual financials or security posture.

---

## 1. Data files → onboarding upload slots

Upload each file at the matching onboarding section. For sections that offer **⚡ Connect & pull**
vs **⤓ Upload**, switch to **Upload a file** and drop the CSV.

| # | Onboarding section | File | Pulls into the cockpit |
|---|---|---|---|
| 1 | **Business processes** (§4) | `01_processes.csv` | Crown-jewel value chain, function grouping, downtime cost, CEO process bars |
| 2 | **Systems & applications** (§5) | `02_systems.csv` | Crown-jewel systems, value/day & value/hour, vendor concentration, CIO "systems that carry the business" |
| 3 | **Risk register** (§6) | `03_risk_register.csv` | Material-exposure figure, risk→control mapping, War Room scenarios |
| 4 | **Business capability map** (CISO Enterprise-Risk) | `04_capabilities.csv` | "Business capabilities with highest exposure" tile |
| 5 | **SBOM** (supply chain) | `05_sbom.csv` | Third-party / software-supply-chain tile (components + critical vulns) |
| 6 | **Risk Appetite Statements** (Board & CRO) | `06_risk_appetite.csv` | Board/CRO appetite thresholds |
| 7 | **Regulatory Register** (Board & CLO) | `07_regulatory_register.csv` | Regulatory-exposure reads, obligations & status |
| 8 | **Materiality Criteria** (Board) | `08_materiality_criteria.csv` | Materiality thresholds, CLO materiality workbench |
| 9 | **Benchmark Data** (Board) | `09_benchmark_data.csv` | Peer benchmark comparison rows |
| 10 | **Current cyber projects & initiatives** | `10_initiatives.csv` | CISO/CFO initiative ROI, "engaged early" metric |
| 11 | **Tier-1/2 vendors** (Third-party risk) | `11_vendors.csv` | Third-party risk section, top-5 vendor scores |
| 12 | **AI inventory** (AI risk & governance §1c, and AI & supply-chain) | `12_ai_inventory.csv` | AI/ML system count, GenAI apps, machine identities, crypto assets, decisioning read, EU AI Act scope |
| 13 | **Strategic initiatives** (CEO/Board) | `13_strategic_initiatives.csv` | Per-initiative go/no-go safety check & decision briefs |

## 2. Policy documents → "Policy & document evidence" + AI governance

Upload each at **§1e Policy & document evidence** (pick the matching doc type from the dropdown),
and the three AI docs at the **AI risk & governance → Upload your AI governance documents** panel.
Each is written to score real CMMI maturity control-by-control and appears in the cockpit
**"📄 Documents reviewed"** modal.

| Doc type in dropdown | File |
|---|---|
| Information Security Policy | `d1_information_security_policy.pdf` |
| Risk Assessment / Register | `d2_risk_assessment.pdf` |
| Third-Party / Supply-Chain Policy | `d3_third_party_supply_chain_policy.pdf` |
| Access Control Policy | `d4_access_control_policy.pdf` |
| Identity & Authentication Policy | `d5_identity_authentication_policy.pdf` |
| Incident Response Plan | `d6_incident_response_plan.pdf` |
| Business Continuity / DR Plan | `d7_business_continuity_dr_plan.pdf` |
| Change Management Policy | `d8_change_management_policy.pdf` |
| Configuration Management Policy | `d9_configuration_management_policy.pdf` |
| Data Protection Policy | `d10_data_protection_policy.pdf` |
| AI Governance — NIST AI RMF | `d17_ai_governance_nist_rmf.pdf` |
| AI Governance — ISO/IEC 42001 | `d18_ai_governance_iso42001.pdf` |
| AI Acceptable-Use Policy | `d19_ai_acceptable_use_policy.pdf` |

## 3. Manual fields (typed in onboarding — no upload for these)

These come from the executive/board, not any system, so type them in to avoid illustrative
fallback.

**Organization (§1)**
- Organization name: `Hewlett Packard Enterprise`
- Industry: `Technology`
- Operating regions: select **US, EU, UK, APAC, Global** (drives EU AI Act + GDPR/NIS2 clocks)
- Reporting currency: `USD ($)`

**Executives (§1)** — names stamp every decision; emails let the CISO send reminders from the cockpit (optional — the reminder modal asks once if left blank)
- CEO: `Antonio Neri` · CFO: `Marie Myers` · CISO / Chief Security Officer: `Bobby Ford`
- CTO: `Fidelma Russo` · General Counsel (CLO): `Rishi Varma` · COO: `John Schultz`
- Chief Risk Officer (CRO): `Jon Faust` · Chief Audit Executive: `Karen Parkhill`
- Emails: use any address you control for the demo, e.g. `ceo@hpe-demo.com`, `cfo@hpe-demo.com`, … so the CISO “Decisions & projections” tab can send test reminders.

**Board governance & incident readiness (§1b)**
- Board committee that owns cyber: `Audit Committee (Technology Committee oversight)`
- Board reporting cadence: `Quarterly`
- Cyber integrated into ERM: `Yes`
- Incident-response plan tested: `Yes`
- Last tabletop exercise: `2026-04-15`
- IR / breach-counsel retainer: `Yes`
- Ransomware-payment policy: `Do not pay without board + counsel approval`

**Financials & appetite (§2)**
- Annual revenue: `30.1 B` · Operating income: `2.1 B` · Net income: `2.6 B`
- Enterprise value / market cap: `27.5 B`
- Board cyber-risk appetite: `150 M` · Annual cyber budget: `420 M`

**Enterprise risk portfolio — CRO (§2b)** — or use **⚡ Pull from ERM**
- Credit / market risk: `520 M` · Operational risk: `240 M` · Third-party risk: `95 M` · Compliance / legal risk: `120 M`

**Security as a growth engine — CISO (§2c)** — or use **⚡ Pull from CRM / compliance**
- Pipeline in security review: `120 M` · Review time before: `8` wks · now: `3` wks
- Deals gated / quarter: `14` · Trust reviews passed: `40`
- Certifications held: check **SOC 2 Type II, ISO 27001, PCI DSS, FedRAMP**

**Cyber insurance (§3)**
- Coverage limit: `200 M` · Annual premium: `8.5 M` · Renewal date: `2026-03-31`

**Strategic objectives (§1d-2)** — add a few:
- `Grow GreenLake ARR` (cyber dependency: Cloud Security Posture)
- `Integrate Juniper Networks securely` (Third-Party / Supply-Chain Risk)
- `Lead in AI infrastructure` (AI security & governance)
- `Protect operating margins` (Operational Resilience)

## 4. Suggested run-through

1. **Organization + executives + regions + governance + financials + insurance** — type §3 values above.
2. **Upload the 13 data files** at their slots (§1). Watch each section badge flip to "✓ N loaded".
3. **Upload the 13 policy docs** at §1e + the AI governance panel. Each returns a CMMI score and
   lands in **Documents reviewed**.
4. **AI inventory** (`12_ai_inventory.csv`) — load it once; it feeds both the AI risk & governance
   derived readout and the AI & supply-chain tab.
5. **Go live** → open the cockpit. Walk CISO Program Health, the crown-jewel value tree
   (Nerion's View), Frameworks (now evidenced by the uploaded policies), each executive seat, and
   the War Room. Nothing should read "illustrative / connect a source".

## 5. Verify the samples

```
cd demo/HPE && node _verify-parse.mjs   # data files parse & pull real rows
node _verify-docs.mjs                    # policy PDFs extract & score CMMI via the real server path
```
The policy files are **PDFs** (`d*.pdf`), generated from the `d*.md` sources by `_make-pdfs.mjs`.
They use literal-ASCII, uncompressed text so the cockpit's PDF text-extractor reads them cleanly —
`_verify-docs.mjs` confirms every one scores CMMI 5 through the backend's actual extraction path.
Both scripts exit non-zero if any file wouldn't pull/score.
