# JPMorgan Chase & Co. — Nerion demo org

**Sector:** Financial services  ·  **Regions:** US, EU, UK  ·  **Org ID:** `org_jpmorgan`

Largest U.S. bank by assets. Crown jewels are the payments rails, trading & settlement, and customer financial data. SEC 4-business-day disclosure, DORA, and wire/payment fraud (BEC) dominate.

## How to load this org

**Option A — full end-to-end (recommended):** seed the backend, then point the browser at it.
```bash
# from the kit root, with the API running (default http://localhost:3001):
API_BASE=http://localhost:3001 node load-all.mjs        # seeds ALL orgs
# or just this one:
API_BASE=http://localhost:3001 node load-all.mjs jpmorgan
```
Then paste `jpmorgan/browser-localStorage.js` into the app's DevTools console. The cockpit reloads into this org with live crown-jewels, economics, governance, AI, resilience, legal and strategic-initiative data.

**Option B — exercise the onboarding UI:** open onboarding and upload the four CSVs in this folder (`processes.csv`, `systems.csv`, `risks.csv`, `initiatives.csv`), then type the field values from the tables below and click **Go live**.

**No API keys needed:** connectors run in **demo mode** (`cyberrx_tools` seeds 13 tools as `demo:true`), so tool-driven panels (EDR, MFA, PAM, CSPM, backup, product-security, audit-GRC, etc.) light up with representative telemetry. Mapping, scoring and every calculation run fully offline.

## Organization & financials
| Field | Value |
|---|---|
| Annual revenue | $177.6B |
| Operating income | $61B |
| Net income | $58.5B |
| Enterprise value / market cap | $670B |
| Shares outstanding | 2.86B |
| Board cyber-risk appetite | $750M |
| Annual cyber budget | $1.5B |
| Sensitive records held | 80.0M |
| Cyber insurance limit / premium | $400M / $20M (renews 2026-12-01) |

## Enterprise-risk portfolio (CRO)
| Risk | Value |
|---|---|
| Credit / market | $210B |
| Operational | $45B |
| Third-party | $18B |
| Compliance / legal | $25B |

## Board governance (type these into onboarding step 2)
| Field | Value |
|---|---|
| Committee that owns cyber | Risk Committee |
| Reporting cadence | Every board meeting |
| CISO reports to | CRO / Chief Risk |
| Board cyber expertise | Yes |
| Cyber in ERM | Yes |
| IR plan tested | Yes — tabletop within 12 months |
| Last tabletop | 2026-03-20 |
| IR / breach-counsel retainer | Yes |
| Ransomware-payment policy | Board-approved policy |

## AI governance
| Field | Value |
|---|---|
| AI/LLM systems in production | 60 |
| AI in automated decisioning | Yes |
| AI governance framework | NIST AI RMF |
| AI acceptable-use policy | Board-approved |
| EU AI Act scope | Yes — limited-risk |
| AI systems inventoried | Yes — inventoried |

## Inventory (also in the CSVs)
- **5 business processes** → `processes.csv`
- **6 systems** → `systems.csv`  (crown jewels emerge from data-class + criticality + exposure)
- **5 risks** → `risks.csv`  (each links to a system by name; open risks drive material exposure)
- **4 cyber initiatives** → `initiatives.csv`  (per-initiative ROI for CISO/CFO)
- **3 strategic initiatives** (CEO Go/No-Go): AI fraud & underwriting models ($4B); Core-banking cloud migration ($3B); UK/EU digital-bank expansion ($2B)

## Frameworks in scope
`NIST CSF 2.0` · `PCI DSS` · `SOC 2` · `DORA` · `GLBA` · `SEC Cyber Disclosure`

*Financials are illustrative, grounded in the company's most recent public filings; cyber-specific figures are sector-modelled, not disclosed.*
