# Control-Signal Connector Roadmap

**Why this exists.** The control cockpit scores each of the 11 defensive capabilities from a
live telemetry signal (`CAP_SIGKEY` in `cockpit.html`). A control is only "sensor-proven" when
a connector emits that exact signal. Today the drill copy is honest about this (`CAP_LIVE_CONNECTOR`
/ `capConnectPrompt`), but honesty is a stopgap — the product value is in closing the coverage gap.

## Current state (verified against `cyberrx-api/src/services/connectors/`)

| Capability | Signal read (`CAP_SIGKEY`) | Connector today | Wired end-to-end? |
|---|---|---|---|
| EDR | `edr_pct` | CrowdStrike Falcon | ✅ (needs asset-total denominator) |
| MFA | `mfa_pct` | Microsoft Entra ID | ✅ |
| Vuln & Patch | `patch_pct` | Tenable.io | ✅ |
| SIEM | `siem_log_sources` | Splunk (registered) | ⚠️ emits MTTD/MTTR, **not** the coverage signal |
| PAM | `pam_pct` | — | ❌ |
| Awareness | `training_pct` | — | ❌ |
| DLP | `dlp_pct` | — | ❌ |
| Segmentation | `seg_pct` | — | ❌ |
| Backup | `backup_immutable_pct` | — | ❌ |
| CSPM | `cspm_pct` | — | ❌ |
| SSPM | `sspm_pct` | — | ❌ |

Every connector is ~50–120 lines following the proven `BaseConnector` shape (`test()` +
`fetchSignals()` → normalized `{key,value,asOf,raw}`), the same pattern as `tenable.js`.

## Cross-cutting prerequisite (do first) — the denominator

Most coverage %'s are `covered ÷ in-scope total`. EDR already needs `assetTotal`; PAM, DLP, Seg,
SSPM all do too. Without a trusted asset inventory these percentages are guesses.
**Enabler: finish the CMDB/asset-inventory join** (`ServiceNow CmdbConnector` exists — wire its
asset count as the denominator source). This unblocks accurate %'s across half the roadmap and
also feeds the "name the specific uncovered hosts" gap the control drill flags as a data join.

## Priority order

### Tier 0 — fix/extend what's half-built (days, highest integrity-per-effort)
1. **SIEM / Splunk signal reconciliation.** The connector exists but emits MTTD/MTTR. Either add a
   `siem_log_sources` derivation (indexed sourcetypes ÷ expected) or redefine `capDeploy('siem')`
   to score from what Splunk actually gives. Closes a control that *looks* connectable but isn't.
2. **Second vendor for the 3 wired categories** — same pattern, big Fortune-100 coverage bump:
   **Qualys** (vuln, mirrors Tenable's clean-asset-rate), **Okta** (MFA, mirrors Entra), **Microsoft
   Defender** (EDR, mirrors CrowdStrike). Low risk, high hit-rate against real stacks.

### Tier 1 — highest framework weight + ubiquity in F100
3. **CSPM — Wiz** (`cspm_pct` = resources without a critical misconfig ÷ total). Modern GraphQL API,
   clean metric, near-universal in cloud-first F100. Weight 1.1.
4. **PAM — CyberArk** (`pam_pct` = privileged accounts vaulted ÷ discovered privileged accounts).
   Highest-weight identity control (1.5); metric is well-defined via the CyberArk REST API.
5. **Backup — Rubrik / Veeam** (`backup_immutable_pct` = crown-jewel workloads with a verified
   immutable backup ÷ total). Board-critical for ransomware recovery; Rubrik API is clean.

### Tier 2 — valuable, more metric-definition work
6. **DLP — Microsoft Purview** (`dlp_pct` = channels/endpoints under an enforced policy). Common in
   the Microsoft estate; needs a coverage definition across email/web/endpoint.
7. **SSPM — AppOmni / Adaptive Shield** (`sspm_pct` = business-critical SaaS apps under posture mgmt
   ÷ SaaS inventory). Growing category; depends on the SaaS side of the asset inventory.
8. **Awareness — KnowBe4** (`training_pct` = users current on training; `phishing_pct` fallback).
   Easy REST API; low weight (0.9) so lower priority despite low effort.
9. **Segmentation — Illumio** (`seg_pct` = workloads under enforced segmentation ÷ total). Hardest
   metric to define honestly (enforcement vs visualization); do last so it isn't rushed.

## Definition of done per connector
- `test(creds)` authenticates read-only and returns a clear ok/err.
- `fetchSignals(creds)` returns the exact `CAP_SIGKEY` signal with `asOf` + `raw` provenance.
- Registered in `services/connectors/index.js` **and** added to `CAP_LIVE_CONNECTOR` in `cockpit.html`
  (so the drill flips from "attested / roadmap" to "connect <tool>" automatically).
- Validated against a real tenant (the existing connectors are spec-built, not yet tenant-proven —
  none should be marked live until run against a production instance).

## Parallel infra (not a connector, but gates real value)
- **Signal-history store** for per-control trend (today's drill uses a first-seen localStorage
  baseline). A `signal_history(org, scope, key, value, as_of)` table turns section 3 (Trend) into
  real quarter-over-quarter movement.
- **Peer benchmark GA.** `/api/benchmark` exists as a consent-bounded, k-anonymized scaffold; the
  cockpit currently calls a stale `/api/peer/*` path. Reconcile the path and take it off the flag.
