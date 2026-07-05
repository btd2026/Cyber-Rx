# CyberX-Ray — Executive Demo Kit (8 industry leaders)

Production-realistic onboarding data for **one recognized leader in each of 8 industries**, so you can test the whole platform end-to-end — **without any connector API keys**. Every mapping and calculation runs offline; connectors run in **demo mode** with representative telemetry.

## The 8 orgs
| Organization | Sector | Folder | Inventory | Tools |
|---|---|---|---|---|
| UnitedHealth Group | Healthcare | `unitedhealth` | 6 sys · 5 risks | 12 demo tools |
| Microsoft Corporation | Technology / SaaS | `microsoft` | 6 sys · 5 risks | 12 demo tools |
| JPMorgan Chase & Co. | Financial services | `jpmorgan` | 6 sys · 5 risks | 13 demo tools |
| Walmart Inc. | Retail / e-commerce | `walmart` | 6 sys · 5 risks | 12 demo tools |
| State of California | Government / Public sector | `state-california` | 6 sys · 5 risks | 10 demo tools |
| The Boeing Company | Manufacturing | `boeing` | 6 sys · 5 risks | 12 demo tools |
| Duke Energy Corporation | Energy / Utilities | `duke-energy` | 6 sys · 5 risks | 12 demo tools |
| AT&T Inc. | Telecommunications | `att` | 6 sys · 5 risks | 12 demo tools |

## Quick start (full end-to-end)
```bash
# 1. Run the API locally (from cyberrx-api/):  npm run dev     # → http://localhost:3001
# 2. Seed all 7 orgs into the backend:
API_BASE=http://localhost:3001 node load-all.mjs
# 3. Open the app, log in, open DevTools → Console, and paste one org's loader, e.g.:
#      unitedhealth/browser-localStorage.js
#    The cockpit reloads into that org. Repeat with another org's file to switch.
```
> Using the hosted API instead of local? Set `API_BASE` to its URL (the ingest endpoint needs no auth).

## What each org exercises
- **Crown-jewel scoring & the process→system→risk chain** — every org (data-class + criticality + internet-exposure → tiers).
- **Material exposure ($)** — open risks link to systems by name; each org has 5 linked risks.
- **Economics** — ALE, tail, appetite headroom, insurance gap, %-of-revenue / %-of-EV ratios (all orgs).
- **Earnings / EPS impact** — orgs with net income + shares. *(State of California has none → tests graceful null-handling; Boeing has a **net loss** → tests negative-earnings handling.)*
- **Legal / jurisdiction clocks** — binding clock varies by footprint: US SEC 8-K 4-day (UnitedHealth, Walmart, Boeing, Duke, California, AT&T), **DORA** (JPMorgan — EU/UK), **NIS2** (Microsoft — EU/Global); sector regimes layered on (HIPAA, PCI, ITAR, NERC CIP, FCC CPNI).
- **Governance maturity** — deliberately varied: strong (Microsoft, Duke's dedicated cyber committee) vs weaker (California: semi-annual, no retainer, informal ransomware policy).
- **AI governance maturity** — from full (Microsoft: Both frameworks, EU AI Act high-risk) to nascent (Boeing/California: piloting, drafted).
- **Resilience / vendor concentration** — single-provider blast radius (UnitedHealth ↔ Change Healthcare; Duke ↔ SCADA vendor).
- **CRO enterprise-risk portfolio** — cyber vs credit/operational/third-party/compliance, on one scale.
- **Strategic-initiative Go/No-Go (CEO)** — 3 per org with value-at-stake.
- **Connectors / demo mode + evidence layer** — each org seeds a sector-appropriate tool stack (`demo:true`) and NIST-CSF document-evidence scores (`cyberrx_doc_scores`) so the ○ self-reported → ● evidenced flip is visible.
- **Industry localization** — all 8 cockpit buckets exercised: health / tech / fin / retail / gov / mfg / energy / telecom, so per-sector threats, regulators, continuity and framing all change.

## Per-org contents
Each folder has: `ingest.json` (ready-to-POST payload), `processes.csv` · `systems.csv` · `risks.csv` · `initiatives.csv` (onboarding upload templates), `browser-localStorage.js` (one-paste cockpit loader), and `README.md` (the full data sheet — every dropdown value).

## Notes
- Financials are illustrative, grounded in each company's most recent public filings; cyber-specific figures (appetite, budget, insurance, risk exposures, inventory) are sector-modelled, not disclosed.
- Executive names are placeholders.
- The ingest payload matches the exact contract the onboarding "Go live" button POSTs to `/api/crown-jewels/ingest`.

## Prove the calculations offline (no API, no DB, no keys)
`verify-offline.mjs` runs every org's `ingest.json` through the **real** engine modules
(mapping → crown-jewel scoring → economics → jurisdiction) and re-parses the CSVs with the
onboarding's exact parser — so you can confirm the mapping and math before ever standing up a server:
```bash
# from the repo, with the kit at <repo>/demo/cyberxray-demo-kit (default path):
node demo/cyberxray-demo-kit/verify-offline.mjs
# or point it anywhere:
CJ_DIR=/abs/path/cyberrx-api/src/services/crownjewels node verify-offline.mjs
```
It prints, per org: processes/systems/crown-jewels counts, material exposure, ALE, tail, %-of-revenue, top crown jewels, and the binding legal clock — and exits non-zero if any check fails.
