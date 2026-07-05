# State of California — Nerion demo org

**Sector:** Government / Public sector  ·  **Regions:** US  ·  **Org ID:** `org_state_california`

Largest U.S. state government (~39.5M residents, ~$414B total budget). Crown jewels are resident PII/benefits systems, tax records, and critical public services. No net income / EPS — a good null-handling test. State breach-notification law and public-service continuity dominate.

## How to load this org

**Option A — full end-to-end (recommended):** seed the backend, then point the browser at it.
```bash
# from the kit root, with the API running (default http://localhost:3001):
API_BASE=http://localhost:3001 node load-all.mjs        # seeds ALL orgs
# or just this one:
API_BASE=http://localhost:3001 node load-all.mjs state-california
```
Then paste `state-california/browser-localStorage.js` into the app's DevTools console. The cockpit reloads into this org with live crown-jewels, economics, governance, AI, resilience, legal and strategic-initiative data.

**Option B — exercise the onboarding UI:** open onboarding and upload the four CSVs in this folder (`processes.csv`, `systems.csv`, `risks.csv`, `initiatives.csv`), then type the field values from the tables below and click **Go live**.

**No API keys needed:** connectors run in **demo mode** (`cyberrx_tools` seeds 10 tools as `demo:true`), so tool-driven panels (EDR, MFA, PAM, CSPM, backup, product-security, audit-GRC, etc.) light up with representative telemetry. Mapping, scoring and every calculation run fully offline.

## Organization & financials
| Field | Value |
|---|---|
| Annual revenue | $413.8B |
| Operating income | — |
| Net income | — (n/a — public sector) |
| Enterprise value / market cap | — (n/a — public sector) |
| Shares outstanding | — (n/a) |
| Board cyber-risk appetite | $200M |
| Annual cyber budget | $250M |
| Sensitive records held | 39.5M |
| Cyber insurance limit / premium | $50M / $4M (renews 2026-07-01) |

## Enterprise-risk portfolio (CRO)
| Risk | Value |
|---|---|
| Credit / market | — (n/a) |
| Operational | $12B |
| Third-party | $4B |
| Compliance / legal | $3B |

## Board governance (type these into onboarding step 2)
| Field | Value |
|---|---|
| Committee that owns cyber | Technology Committee |
| Reporting cadence | Semi-annually |
| CISO reports to | CIO |
| Board cyber expertise | No |
| Cyber in ERM | Partially |
| IR plan tested | Yes — older than 12 months |
| Last tabletop | 2024-11-01 |
| IR / breach-counsel retainer | No |
| Ransomware-payment policy | Informal |

## AI governance
| Field | Value |
|---|---|
| AI/LLM systems in production | 15 |
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
- **3 strategic initiatives** (CEO Go/No-Go): GenAI resident-services pilots ($500M); Benefits-systems cloud migration ($1.2B); Digital-identity (mDL) program ($300M)
- **Business functions** (Framework value chain): Health & human services, Revenue, Labor & employment, Motor vehicles, Public safety

## Frameworks in scope
`NIST CSF 2.0` · `NIST 800-53` · `FedRAMP` · `CCPA` · `State breach-notification law`

*Financials are illustrative, grounded in the company's most recent public filings; cyber-specific figures are sector-modelled, not disclosed.*
