# Microsoft Corporation — CyberX-Ray demo org

**Sector:** Technology / SaaS  ·  **Regions:** US, EU, Global  ·  **Org ID:** `org_microsoft`

Global platform & cloud provider (Azure, M365, GitHub). Crown jewels are source code, signing infrastructure, and the identity plane — nation-state targeting (Midnight Blizzard) and supply-chain integrity dominate the risk picture.

## How to load this org

**Option A — full end-to-end (recommended):** seed the backend, then point the browser at it.
```bash
# from the kit root, with the API running (default http://localhost:3001):
API_BASE=http://localhost:3001 node load-all.mjs        # seeds ALL 7 orgs
# or just this one:
API_BASE=http://localhost:3001 node load-all.mjs microsoft
```
Then paste `microsoft/browser-localStorage.js` into the app's DevTools console. The cockpit reloads into this org with live crown-jewels, economics, governance, AI, resilience, legal and strategic-initiative data.

**Option B — exercise the onboarding UI:** open onboarding and upload the four CSVs in this folder (`processes.csv`, `systems.csv`, `risks.csv`, `initiatives.csv`), then type the field values from the tables below and click **Go live**.

**No API keys needed:** connectors run in **demo mode** (`cyberrx_tools` seeds 12 tools as `demo:true`), so tool-driven panels (EDR, MFA, PAM, CSPM, backup, product-security, audit-GRC, etc.) light up with representative telemetry. Mapping, scoring and every calculation run fully offline.

## Organization & financials
| Field | Value |
|---|---|
| Annual revenue | $245.1B |
| Operating income | $109.4B |
| Net income | $88.1B |
| Enterprise value / market cap | $3000B |
| Shares outstanding | 7.43B |
| Board cyber-risk appetite | $1B |
| Annual cyber budget | $2B |
| Sensitive records held | 1400.0M |
| Cyber insurance limit / premium | $500M / $25M (renews 2026-09-01) |

## Enterprise-risk portfolio (CRO)
| Risk | Value |
|---|---|
| Credit / market | $20B |
| Operational | $14B |
| Third-party | $8B |
| Compliance / legal | $10B |

## Board governance (type these into onboarding step 2)
| Field | Value |
|---|---|
| Committee that owns cyber | Audit Committee |
| Reporting cadence | Every board meeting |
| CISO reports to | CEO |
| Board cyber expertise | Yes |
| Cyber in ERM | Yes |
| IR plan tested | Yes — tabletop within 12 months |
| Last tabletop | 2026-04-10 |
| IR / breach-counsel retainer | Yes |
| Ransomware-payment policy | Board-approved policy |

## AI governance
| Field | Value |
|---|---|
| AI/LLM systems in production | 120 |
| AI in automated decisioning | Yes |
| AI governance framework | Both |
| AI acceptable-use policy | Board-approved |
| EU AI Act scope | Yes — high-risk system |
| AI systems inventoried | Yes — inventoried |

## Inventory (also in the CSVs)
- **5 business processes** → `processes.csv`
- **6 systems** → `systems.csv`  (crown jewels emerge from data-class + criticality + exposure)
- **5 risks** → `risks.csv`  (each links to a system by name; open risks drive material exposure)
- **4 cyber initiatives** → `initiatives.csv`  (per-initiative ROI for CISO/CFO)
- **3 strategic initiatives** (CEO Go/No-Go): Copilot enterprise expansion ($10B); Sovereign cloud (EU) buildout ($6B); Activision integration ($3B)

## Frameworks in scope
`NIST CSF 2.0` · `ISO 27001` · `SOC 2` · `FedRAMP` · `EU AI Act` · `ISO 42001`

*Financials are illustrative, grounded in the company's most recent public filings; cyber-specific figures are sector-modelled, not disclosed.*
