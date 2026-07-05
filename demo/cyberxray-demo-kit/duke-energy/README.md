# Duke Energy Corporation — CyberX-Ray demo org

**Sector:** Energy / Utilities  ·  **Regions:** US  ·  **Org ID:** `org_duke_energy`

Regulated electric & gas utility (~8.4M customers). Crown jewels are the grid control systems (SCADA/EMS/DERMS), the OT estate, and customer/billing data. NERC CIP, OT/ICS safety, and grid continuity dominate.

## How to load this org

**Option A — full end-to-end (recommended):** seed the backend, then point the browser at it.
```bash
# from the kit root, with the API running (default http://localhost:3001):
API_BASE=http://localhost:3001 node load-all.mjs        # seeds ALL orgs
# or just this one:
API_BASE=http://localhost:3001 node load-all.mjs duke-energy
```
Then paste `duke-energy/browser-localStorage.js` into the app's DevTools console. The cockpit reloads into this org with live crown-jewels, economics, governance, AI, resilience, legal and strategic-initiative data.

**Option B — exercise the onboarding UI:** open onboarding and upload the four CSVs in this folder (`processes.csv`, `systems.csv`, `risks.csv`, `initiatives.csv`), then type the field values from the tables below and click **Go live**.

**No API keys needed:** connectors run in **demo mode** (`cyberrx_tools` seeds 12 tools as `demo:true`), so tool-driven panels (EDR, MFA, PAM, CSPM, backup, product-security, audit-GRC, etc.) light up with representative telemetry. Mapping, scoring and every calculation run fully offline.

## Organization & financials
| Field | Value |
|---|---|
| Annual revenue | $30.4B |
| Operating income | $8.2B |
| Net income | $4.6B |
| Enterprise value / market cap | $90B |
| Shares outstanding | 0.78B |
| Board cyber-risk appetite | $200M |
| Annual cyber budget | $300M |
| Sensitive records held | 8.4M |
| Cyber insurance limit / premium | $120M / $8M (renews 2026-09-15) |

## Enterprise-risk portfolio (CRO)
| Risk | Value |
|---|---|
| Credit / market | $70B |
| Operational | $18B |
| Third-party | $6B |
| Compliance / legal | $5B |

## Board governance (type these into onboarding step 2)
| Field | Value |
|---|---|
| Committee that owns cyber | Dedicated Cybersecurity Committee |
| Reporting cadence | Quarterly |
| CISO reports to | CEO |
| Board cyber expertise | Yes |
| Cyber in ERM | Yes |
| IR plan tested | Yes — tabletop within 12 months |
| Last tabletop | 2026-03-01 |
| IR / breach-counsel retainer | Yes |
| Ransomware-payment policy | Board-approved policy |

## AI governance
| Field | Value |
|---|---|
| AI/LLM systems in production | 8 |
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
- **3 strategic initiatives** (CEO Go/No-Go): AI grid-optimization & forecasting ($800M); Grid modernization (DER/EV) ($4B); Customer-platform cloud migration ($600M)

## Frameworks in scope
`NERC CIP` · `NIST CSF 2.0` · `IEC 62443` · `SOC 2` · `TSA Pipeline Security`

*Financials are illustrative, grounded in the company's most recent public filings; cyber-specific figures are sector-modelled, not disclosed.*
