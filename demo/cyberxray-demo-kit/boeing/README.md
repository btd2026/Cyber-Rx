# The Boeing Company — CyberX-Ray demo org

**Sector:** Manufacturing  ·  **Regions:** US  ·  **Org ID:** `org_boeing`

Aerospace & defense manufacturer (FY2024 was a $11.8B net-loss year — a good negative-earnings test). Crown jewels are design IP, the OT/factory floor, and defense programs. ITAR/CMMC, OT safety, and IP theft dominate.

## How to load this org

**Option A — full end-to-end (recommended):** seed the backend, then point the browser at it.
```bash
# from the kit root, with the API running (default http://localhost:3001):
API_BASE=http://localhost:3001 node load-all.mjs        # seeds ALL 7 orgs
# or just this one:
API_BASE=http://localhost:3001 node load-all.mjs boeing
```
Then paste `boeing/browser-localStorage.js` into the app's DevTools console. The cockpit reloads into this org with live crown-jewels, economics, governance, AI, resilience, legal and strategic-initiative data.

**Option B — exercise the onboarding UI:** open onboarding and upload the four CSVs in this folder (`processes.csv`, `systems.csv`, `risks.csv`, `initiatives.csv`), then type the field values from the tables below and click **Go live**.

**No API keys needed:** connectors run in **demo mode** (`cyberrx_tools` seeds 12 tools as `demo:true`), so tool-driven panels (EDR, MFA, PAM, CSPM, backup, product-security, audit-GRC, etc.) light up with representative telemetry. Mapping, scoring and every calculation run fully offline.

## Organization & financials
| Field | Value |
|---|---|
| Annual revenue | $66.5B |
| Operating income | $-10.7B |
| Net income | $-11.8B |
| Enterprise value / market cap | $130B |
| Shares outstanding | 0.75B |
| Board cyber-risk appetite | $250M |
| Annual cyber budget | $400M |
| Sensitive records held | 12.0M |
| Cyber insurance limit / premium | $150M / $10M (renews 2026-11-01) |

## Enterprise-risk portfolio (CRO)
| Risk | Value |
|---|---|
| Credit / market | $55B |
| Operational | $30B |
| Third-party | $15B |
| Compliance / legal | $8B |

## Board governance (type these into onboarding step 2)
| Field | Value |
|---|---|
| Committee that owns cyber | Audit Committee |
| Reporting cadence | Quarterly |
| CISO reports to | CIO |
| Board cyber expertise | Yes |
| Cyber in ERM | Yes |
| IR plan tested | Yes — tabletop within 12 months |
| Last tabletop | 2026-05-05 |
| IR / breach-counsel retainer | Yes |
| Ransomware-payment policy | Board-approved policy |

## AI governance
| Field | Value |
|---|---|
| AI/LLM systems in production | 10 |
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
- **3 strategic initiatives** (CEO Go/No-Go): Digital-twin manufacturing ($2B); 777X production ramp ($4B); Defense-cloud (IL5) migration ($1B)

## Frameworks in scope
`CMMC 2.0` · `NIST 800-171` · `ITAR` · `AS9100` · `NIST CSF 2.0`

*Financials are illustrative, grounded in the company's most recent public filings; cyber-specific figures are sector-modelled, not disclosed.*
