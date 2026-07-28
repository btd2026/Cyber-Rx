# Control-Signal Connector Roadmap

**Correction (supersedes the first draft of this doc).** The first version claimed only 3 of 11
controls were wired and 7 connectors had to be built. That was read off a **stale branch** whose
`services/connectors/index.js` registered only 6 connectors. On `main` the registry has ~90
connectors making real authenticated API calls, and **10 of the 11 controls already have live
connectors** (most with 4–6 vendor options). The real gap is far smaller than first stated.

## Verified state on `main` (per `services/connectors/` + `index.js` registry)

Each control is scored from the signal in `CAP_SIGKEY` (cockpit.html). A control is "sensor-proven"
when a registered connector emits that signal. Verified by grepping the emitted `key:` across the
registry:

| Capability | Signal | Registered connectors emitting it | Status |
|---|---|---|---|
| EDR | `edr_pct` | CrowdStrike, Defender, SentinelOne, Cortex XDR, Trend Micro | ✅ |
| MFA | `mfa_pct` | Entra, Okta, Ping, Duo, OneLogin | ✅ |
| PAM | `pam_pct` | CyberArk, BeyondTrust, Delinea, HashiCorp Vault, One Identity | ✅ |
| Vuln & Patch | `patch_pct` / `vuln_sla_pct` | Tenable, Qualys, Rapid7, Defender VM, Ivanti | ✅ |
| Awareness | `training_pct` | KnowBe4 | ✅ (single vendor) |
| SIEM | `siem_log_sources` | Splunk, Sentinel, Elastic, QRadar, Chronicle | ✅ |
| CSPM | `cspm_pct` | Wiz, Prisma, AWS, Azure, GCP, Orca | ✅ |
| Backup | `backup_immutable_pct` | Rubrik, Veeam, Cohesity, Commvault, Dell PowerProtect | ✅ |
| DLP | `dlp_pct` | Purview, Forcepoint, Symantec, Zscaler, Netskope | ✅ |
| Segmentation | `seg_pct` | Illumio, Zscaler ZPA, Palo Alto, Cisco, Guardicore | ✅ |
| SSPM | `sspm_pct` | **AppOmni** (built — closes the last gap) | ✅ |

**Update:** the one gap (SSPM) is now closed — `appomni.js` emits `sspm_pct` (share of known
SaaS apps under active AppOmni posture management), registered in `index.js`, unit-tested, and
`CAP_BY_KEY.sspm` moved from `manual` (attested) to `semi`. **All 11 controls now have a producer.**
`CAP_LIVE_CONNECTOR` in `cockpit.html` lists all 11.

## The actual remaining work (in priority order)

### 1. Tenant validation of the existing connectors — the real gap, not "build"
Every control connector is **built to the vendor's API docs but carries a "validate against a real
container/CID before relying on it" caveat**. None should be marketed as GA until run against a
production tenant.

**Harness delivered:** `scripts/validate-connectors.js` (`npm run validate:connectors`). Point it at
read-only creds and it authenticates, pulls live signals, checks each against the declared catalog +
sane ranges (pct 0-100, counts ≥ 0, freshness + raw provenance), maps them to the 11 control metrics,
prints a **console-reconciliation checklist** (the exact vendor figure to eyeball each number against),
writes a JSON report, and reports which controls got a live in-range number. `--self-test` verifies the
harness itself with no creds. Never touches the DB, never prints secrets; creds files + reports are
gitignored.

**Remaining human step (needs real credentials — cannot be done from the repo):** run the harness
against a sandbox tenant per vendor, canonical-connector-first (CrowdStrike, Entra, CyberArk, Tenable,
Sentinel, Wiz, Rubrik, Purview, Illumio, KnowBe4, AppOmni), and sign off each derived number against
the vendor console before it is marketed as live.

### 2. SSPM connector — DONE (AppOmni)
`appomni.js` emits `sspm_pct` = SaaS apps under active AppOmni posture management ÷ the SaaS
inventory AppOmni knows about; registered and unit-tested. Still carries the standard
validate-against-a-real-tenant caveat. A second vendor (Adaptive Shield / Obsidian) can follow the
same shape if needed.

### 3. The denominator (accuracy, not coverage)
Several %'s are `covered ÷ in-scope total` and need a trusted asset count (EDR's `edr_pct` already
takes `assetTotal`). Wire the CMDB/asset-inventory join (ServiceNow connector exists) as the shared
denominator so the percentages are exact and the drill can name the *specific* uncovered hosts.

### 4. Signal-history store (real trend)
Section 3 of the control drill uses a first-seen localStorage baseline. A
`signal_history(org, scope, key, value, as_of)` table turns it into true quarter-over-quarter movement.

### 5. Peer-benchmark GA
`/api/benchmark` exists as a consent-bounded, k-anonymized scaffold; the cockpit calls a stale
`/api/peer/*` path. Reconcile the path and take it off the feature flag.

## Definition of done per connector (for the SSPM build and any new vendor)
- `test(creds)` authenticates read-only; `fetchSignals(creds)` returns the exact `CAP_SIGKEY` signal
  with `asOf` + `raw` provenance.
- Registered in `services/connectors/index.js`; capability added to `CAP_LIVE_CONNECTOR` if it opens
  a new control.
- Validated against a real tenant before being called live.
