# Walmart Inc. — Nerion demo org

**Sector:** Retail / e-commerce  ·  **Regions:** US  ·  **Org ID:** `org_walmart`

World's largest retailer. Crown jewels are the payment/POS estate, e-commerce platform, and supply-chain systems. PCI DSS, peak-season availability, and vendor/supply-chain risk dominate.

## How to load this org

**Option A — full end-to-end (recommended):** seed the backend, then point the browser at it.
```bash
# from the kit root, with the API running (default http://localhost:3001):
API_BASE=http://localhost:3001 node load-all.mjs        # seeds ALL orgs
# or just this one:
API_BASE=http://localhost:3001 node load-all.mjs walmart
```
Then paste `walmart/browser-localStorage.js` into the app's DevTools console. The cockpit reloads into this org with live crown-jewels, economics, governance, AI, resilience, legal and strategic-initiative data.

**Option B — exercise the onboarding UI:** open onboarding and upload the four CSVs in this folder (`processes.csv`, `systems.csv`, `risks.csv`, `initiatives.csv`), then type the field values from the tables below and click **Go live**.

**No API keys needed:** connectors run in **demo mode** (`cyberrx_tools` seeds 12 tools as `demo:true`), so tool-driven panels (EDR, MFA, PAM, CSPM, backup, product-security, audit-GRC, etc.) light up with representative telemetry. Mapping, scoring and every calculation run fully offline.

## Organization & financials
| Field | Value |
|---|---|
| Annual revenue | $681B |
| Operating income | $29B |
| Net income | $20.2B |
| Enterprise value / market cap | $780B |
| Shares outstanding | 8.03B |
| Board cyber-risk appetite | $300M |
| Annual cyber budget | $600M |
| Sensitive records held | 255.0M |
| Cyber insurance limit / premium | $150M / $9M (renews 2026-08-15) |

## Enterprise-risk portfolio (CRO)
| Risk | Value |
|---|---|
| Credit / market | $25B |
| Operational | $22B |
| Third-party | $12B |
| Compliance / legal | $6B |

## Board governance (type these into onboarding step 2)
| Field | Value |
|---|---|
| Committee that owns cyber | Technology Committee |
| Reporting cadence | Quarterly |
| CISO reports to | CIO |
| Board cyber expertise | Yes |
| Cyber in ERM | Partially |
| IR plan tested | Yes — tabletop within 12 months |
| Last tabletop | 2026-01-30 |
| IR / breach-counsel retainer | Yes |
| Ransomware-payment policy | Board-approved policy |

## AI governance
| Field | Value |
|---|---|
| AI/LLM systems in production | 35 |
| AI in automated decisioning | Yes |
| AI governance framework | NIST AI RMF |
| AI acceptable-use policy | Drafted |
| EU AI Act scope | Not in scope |
| AI systems inventoried | Partially |

## Inventory (also in the CSVs)
- **5 business processes** → `processes.csv`
- **6 systems** → `systems.csv`  (crown jewels emerge from data-class + criticality + exposure)
- **5 risks** → `risks.csv`  (each links to a system by name; open risks drive material exposure)
- **4 cyber initiatives** → `initiatives.csv`  (per-initiative ROI for CISO/CFO)
- **3 strategic initiatives** (CEO Go/No-Go): AI-driven personalization & search ($2B); Marketplace / advertising expansion ($3B); Warehouse automation rollout ($1.5B)

## Frameworks in scope
`PCI DSS` · `NIST CSF 2.0` · `SOC 2` · `CCPA`

*Financials are illustrative, grounded in the company's most recent public filings; cyber-specific figures are sector-modelled, not disclosed.*
