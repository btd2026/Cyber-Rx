# AT&T Inc. — CyberX-Ray demo org

**Sector:** Telecommunications  ·  **Regions:** US  ·  **Org ID:** `org_att`

Largest U.S. wireless & fiber carrier (~118M wireless subscribers). Crown jewels are the mobile/network core, subscriber CPNI, and lawful-intercept infrastructure — the 2024 Salt Typhoon telecom intrusions and CPNI/call-records breaches are the defining sector scenarios.

## How to load this org

**Option A — full end-to-end (recommended):** seed the backend, then point the browser at it.
```bash
# from the kit root, with the API running (default http://localhost:3001):
API_BASE=http://localhost:3001 node load-all.mjs        # seeds ALL 7 orgs
# or just this one:
API_BASE=http://localhost:3001 node load-all.mjs att
```
Then paste `att/browser-localStorage.js` into the app's DevTools console. The cockpit reloads into this org with live crown-jewels, economics, governance, AI, resilience, legal and strategic-initiative data.

**Option B — exercise the onboarding UI:** open onboarding and upload the four CSVs in this folder (`processes.csv`, `systems.csv`, `risks.csv`, `initiatives.csv`), then type the field values from the tables below and click **Go live**.

**No API keys needed:** connectors run in **demo mode** (`cyberrx_tools` seeds 12 tools as `demo:true`), so tool-driven panels (EDR, MFA, PAM, CSPM, backup, product-security, audit-GRC, etc.) light up with representative telemetry. Mapping, scoring and every calculation run fully offline.

## Organization & financials
| Field | Value |
|---|---|
| Annual revenue | $122.3B |
| Operating income | $23B |
| Net income | $10.7B |
| Enterprise value / market cap | $160B |
| Shares outstanding | 7.18B |
| Board cyber-risk appetite | $300M |
| Annual cyber budget | $500M |
| Sensitive records held | 110.0M |
| Cyber insurance limit / premium | $150M / $9M (renews 2026-10-15) |

## Enterprise-risk portfolio (CRO)
| Risk | Value |
|---|---|
| Credit / market | $130B |
| Operational | $25B |
| Third-party | $8B |
| Compliance / legal | $6B |

## Board governance (type these into onboarding step 2)
| Field | Value |
|---|---|
| Committee that owns cyber | Audit Committee |
| Reporting cadence | Quarterly |
| CISO reports to | CIO |
| Board cyber expertise | Yes |
| Cyber in ERM | Yes |
| IR plan tested | Yes — tabletop within 12 months |
| Last tabletop | 2026-02-20 |
| IR / breach-counsel retainer | Yes |
| Ransomware-payment policy | Board-approved policy |

## AI governance
| Field | Value |
|---|---|
| AI/LLM systems in production | 25 |
| AI in automated decisioning | Piloting |
| AI governance framework | NIST AI RMF |
| AI acceptable-use policy | Drafted |
| EU AI Act scope | Not in scope |
| AI systems inventoried | Partially |

## Inventory (also in the CSVs)
- **5 business processes** → `processes.csv`
- **6 systems** → `systems.csv`  (crown jewels emerge from data-class + criticality + exposure)
- **5 risks** → `risks.csv`  (each links to a system by name; open risks drive material exposure)
- **4 cyber initiatives** → `initiatives.csv`  (per-initiative ROI for CISO/CFO)
- **3 strategic initiatives** (CEO Go/No-Go): AI network-ops & customer care ($1.5B); Fiber expansion to 60M locations ($4B); 5G standalone core rollout ($2B)

## Frameworks in scope
`NIST CSF 2.0` · `FCC CPNI Rules` · `CISA Cross-Sector` · `SOC 2` · `ISO 27001`

*Financials are illustrative, grounded in the company's most recent public filings; cyber-specific figures are sector-modelled, not disclosed.*
