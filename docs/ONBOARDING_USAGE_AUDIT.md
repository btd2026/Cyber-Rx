# Onboarding usage audit — is anything collected "for the sake of it"?

Traced every field the onboarding sends (the go-live payload) through to where the
cockpit or backend actually **consumes** it. Verdict up front: **onboarding is largely
earned — almost nothing is dead.** The real waste was a couple of registers that
re-collected data we already infer; those are now removed.

## Consumed — every one of these drives a real read or computation

| Onboarding input | Consumed by |
|---|---|
| financials (revenue, net income, EV, shares) | CFO exposure/earnings, % of revenue, EPS impact, materiality |
| appetite / budget | CFO/Board appetite-vs-tail, ROI, investment adequacy |
| dataRecords | CLO legal liability (records × cost-per-record = class-action exposure) |
| principalRisks (credit/ops/3rd-party/compliance) | CRO "one scale" portfolio |
| insurance (limit/premium/renewal) | CFO insurance gap + transfer efficiency + renewal lever |
| processes (revenue, RTO, criticality, tolerance, tx) | crown-jewel scoring, downtime cost, COO recovery tolerance, value/hr |
| apps (host, data, vendor, eol, value/day, value/yr) | crown jewels, vendor concentration, tech-debt/EOL, revenue-at-risk |
| risks | material exposure, decisions |
| initiatives | CISO/CFO ROI portfolio |
| **governance** (committee, cadence, **cisoReportsTo**, boardExpertise, ermIntegrated, IR: tested/retainer/ransomware/tabletop) | **CEO/Board "Governance & oversight" panel + SEC Reg S-K Item 106 disclosure-readiness score** |
| aiGovernance (systems, decisioning, framework, policy, EU AI Act, inventory) | CEO/CISO AI-risk panels |
| strategicInitiatives | CEO go/no-go per-initiative safety check |
| objectives | CEO "objectives protected" |
| growth (pipeline, review time, deals gated, certs) | CISO security-as-growth view |
| seatNames | leader name on every decision |
| capabilities | CISO "business capabilities with highest exposure" |
| compliance.frameworksInScope | Framework tab scope |

**On your example — "CISO reports to (CIO)":** it's *not* busywork. It's one of the five
governance inputs that compute the **SEC Item 106 governance-maturity read** on the
CEO/Board seat (rendered as "CISO reporting line" and scored into disclosure readiness).
Regulators specifically ask public companies to disclose the management reporting line
for cyber, so it earns its place on a Fortune-100-grade product.

## Removed — collected twice / already inferred (this change)

| Removed | Why | What replaces it |
|---|---|---|
| **Crown Jewel Register** upload | Crown jewels are already inferred in the "Map applications → processes" step (data-sensitivity × exposure × process-criticality) and are **editable there** via "Adjust the auto-mapping". | The inferred, adjustable map — no re-entry. |
| **BIA** register (removed earlier) | The Business-processes step already captures per-process RTO, criticality and impact. | Derived from processes at go-live. |

## Newest additions — keep only if you want their tiles

These feed *only* the new Board/CLO/CRO/CFO oversight dashboard tiles (via
`/api/dashboards`), not the older seats. They're honest and gated, but optional:

- **Risk Appetite Statements** — Board/CRO "vs appetite" tiles
- **Regulatory Register** — Board/CLO regulatory-exposure tiles
- **Materiality Criteria** — Board material-incident tile
- **Benchmark Data** — Board investment-adequacy tile
- **SBOM** — CISO/CTO supply-chain tile

If you don't use those specific oversight tiles, say the word and I'll pull the
corresponding sections (and gate the tiles as "connect a source" instead).

## Bottom line
The onboarding isn't padded with questions asked for nothing — the governance-style
questions in particular drive the board/SEC readiness reads. The only true redundancy
was re-collecting inferred inventory (crown jewels, BIA), which is now gone.
