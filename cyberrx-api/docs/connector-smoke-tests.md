# Connector smoke tests

Each connector is built to the vendor's documented API but must be validated once
against a real tenant with **read-only** credentials before you rely on it as
"live." Run each test, confirm the signal appears, and confirm the dashboard
flips from modeled → live.

## How to test any connector
1. In the dashboard hero, click **🔌 Connect data sources**.
2. Pick the connector, paste the read-only credentials, click **Connect & sync**.
   (Or: `POST /api/integrations/<key>/connect` with the creds in the JSON body.)
3. Expect status **connected** with a signal count > 0 and no error.
4. Open **Data Trust** (the "% live data" meter) → the connector's signals should
   now read **Live**, and the matching posture metric shows a green provenance dot.
5. Re-run with **Sync now**; confirm `as_of` updates.
6. Verify with: `GET /api/integrations?org_id=<org>` (status/lastSync/error) and
   `GET /api/ciso/coverage?org_id=<org>` (live % rises).

A connector that authenticates but returns no rows fails **closed** with a clear
message — it never fabricates a value.

---

## Microsoft Entra ID  (`entra`) — Identity
- **Creds:** Directory (tenant) ID, Application (client) ID, Client secret.
- **App permissions (read-only, admin-consented):** `User.Read.All`,
  `AuditLog.Read.All`, `RoleManagement.Read.Directory`.
- **Expect:** `mfa_pct` (MFA registration coverage) and `priv_accts` (privileged
  role members). `mfa_pct` needs Entra ID P1/P2 for the registration report.
- **Gotchas:** without P1/P2 the MFA report 403s (skipped, not fatal); confirm at
  least one signal returns. `$count` calls require the `ConsistencyLevel: eventual`
  header (already sent).

## CrowdStrike Falcon  (`crowdstrike`) — Endpoint (EDR)
- **Creds:** Falcon API client ID + secret; optional region base URL
  (e.g. `https://api.us-2.crowdstrike.com`); optional `assetTotal`.
- **Scope:** `Hosts: READ`.
- **Expect:** `edr_hosts` (managed host count) always; `edr_pct` only when
  `assetTotal` is supplied (managed ÷ total).
- **Gotchas:** pick the correct cloud base URL or auth 403s. `edr_pct` (the posture
  metric) stays modeled until you provide an asset total.

## Tenable.io  (`tenable`) — Vulnerability
- **Creds:** Access key + Secret key (read-only "Basic" user); optional base URL.
- **Expect:** `critical_vuln_assets`, and `patch_pct` / `vuln_sla_pct` derived as
  the clean-asset rate (assets with no critical vuln ÷ total assets).
- **Gotchas:** the workbenches endpoints can lag a fresh container; confirm
  `workbenches/assets/info` returns a non-zero total or the rate is skipped.

## Splunk  (`splunk`) — SIEM / Detection
- **Creds:** Management URL (`https://host:8089`), REST API token; optional search.
- **Scope:** a read-only role that can run searches.
- **Expect:** `notable_events_30d`, and `mttd_hrs`/`mttr_hrs` **only if** the
  search exposes those fields. Detection content varies — **override the search**
  to your environment (the default targets Enterprise Security's `notable` index).
- **Gotchas:** self-signed certs on `:8089` may need trust; confirm
  `services/server/info` returns before relying on search output.

## Azure OpenAI  (`azure_openai`) — AI Gateway (D5)
- **Creds:** Resource endpoint (`https://NAME.openai.azure.com`), API key.
- **Expect:** `ai_monitored=1` and `ai_deployments` (deployment count). Connecting
  flips **AI guardrail/agent posture** provenance to live.
- **Gotchas:** data-plane usage/cost metrics live in Azure Monitor, not here — this
  connector confirms a governed gateway is present, not per-call volumes.

## LangSmith  (`langsmith`) — AI Gateway (D5)
- **Creds:** API key; optional base URL.
- **Expect:** `ai_monitored=1` (run tracing present).
- **Gotchas:** confirm the key's workspace has runs; an empty workspace still
  authenticates but signals limited evidence.

---

## Auto-refresh
Set `INTEGRATION_SYNC_INTERVAL_MIN` (minutes) to enable the in-process scheduler
(`IntegrationScheduler`), which re-syncs every connected pair. For exact timing or
multi-instance deployments, prefer an external cron calling
`POST /api/integrations/<key>/sync`.

## Stale handling
Signals older than 7 days downgrade from `live` to `derived` (shown as stale).
Disconnecting a source marks its signals stale immediately.
