# Security Review — Phase 8 (connector ingestion surface)

Independent adversarial review of the new server-side surface (provision, ingest,
set-connector-secret, the SigV4 signer, all 12 adapters, the cron SQL, secret
storage, and the client helpers), followed by remediation. This complements the
launch-gate review in `SECURITY_REVIEW.md`.

## Findings & resolution

| # | Sev | Finding | Status |
|---|---|---|---|
| **C1** | Critical | **SSRF** — the ingest orchestrator fetched fully Admin-controlled `baseUrl`s with no host validation; an Admin could point a connector at `http://169.254.169.254/…` or internal services and read the response back via `evidence`/`connectors.health` (a readable SSRF oracle). | **Fixed** |
| **H1** | High | Shared cron key compared with non-constant-time `===`; the cron path triggers tenant-agnostic ingest. | **Fixed** (constant-time compare; egress guard removes the SSRF blast radius) |
| **H2** | High | Any authenticated user could mint unlimited tenants + self-grant Admin (resource abuse + privilege-bootstrap). | **Fixed** (per-user tenant cap) |
| **H3** | High | Raw adapter exception text (could carry request URLs / SSRF response data) was persisted to client-readable `connectors.health` and `audit_log`. | **Fixed** (generic code persisted; full detail to server logs only) |
| **M1** | Med | Unbounded onboarding arrays in `provision` → mass insert. | **Fixed** (`MAX_ROWS = 200` cap) |
| **M2** | Med | Unbounded vendor response bodies → memory/DB bloat. | **Fixed** (response-size cap in the safe fetch) |
| **M3** | Med | `set-connector-secret` didn't validate `tenantId`/`connectorId` format. | **Fixed** (UUID validation; isolation was already sound) |
| **M4** | Med | JQL/query values from `config` passed verbatim to vendors. | **Accepted** — self-scoped (an Admin acting on their own tenant's own vendor account with their own credentials); not a CyberRx-side injection (all DB writes are parameterized). Documented. |
| **L1** | Low | SigV4 signer is minimal (no `x-amz-content-sha256` signed header). | **Accepted** — correct for Security Hub; validated against AWS's official `get-vanilla` vector. |
| **L2–L4** | — | Cron SQL (`SECURITY DEFINER` + pinned `search_path`), the RLS Admin checks, tenant isolation in ingest, and the closed secret read-path were all reviewed and confirmed **sound**. | No change |

## What changed

- **`_shared/safeFetch.ts`** — per-provider egress policy. Cloud providers
  (`okta`, `msgraph*`, `servicenow`, `jira`, `securityhub`, `meraki`) are
  `public`: any target resolving to private / loopback / link-local / ULA / the
  cloud-metadata range is blocked. Self-hosted providers (`elastic`, `splunk`,
  `nessus`, `veeam`) are `self_hosted`: RFC1918/loopback allowed (their own
  boxes), but metadata/link-local always blocked. Literal IPs (incl. IPv4-mapped
  IPv6 and `@`-userinfo smuggling) are checked synchronously; hostnames are
  resolved and re-checked where the runtime exposes DNS (public-policy lookups
  fail closed). Also enforces http(s)-only, a 20s timeout, and an 8 MB response
  cap. Proven by `supabase/scripts/safefetch_proof.ts` (29 checks).
- **`ingest/index.ts`** — uses `makeSafeFetch(policyForProvider(provider))` per
  connector; constant-time cron-key compare; persists only `error_code:
  'pull_failed'` to client-readable columns (full detail → `console.error`).
- **`provision/index.ts`** — `MAX_TENANTS_PER_USER = 10`; onboarding arrays
  capped at 200.
- **`set-connector-secret/index.ts`** — UUID + provider-length validation.

## Residual risk / recommendations

- **DNS rebinding (public policy):** we resolve + re-check, but a true TOCTOU
  between our resolution and `fetch`'s own resolution remains theoretically
  possible. Full defense would pin the validated IP and set the `Host` header.
  Low priority given the egress guard already blocks literal private targets and
  fails closed on resolution failure.
- **Cron secret** is long-lived and shared — rotate it periodically; it lives in
  `app.settings` (not client-exposed) and the egress guard means a leak can no
  longer be turned into SSRF.
- **Self-hosted egress** intentionally allows RFC1918 for customer tools — if a
  deployment doesn't use self-hosted connectors, consider tightening all
  providers to `public`.
- Pre-launch, run `deno check` over `supabase/functions/**` (the Edge Functions
  are Deno and aren't covered by the Vite build/lint), and re-run the legal +
  launch-gate review in `SECURITY_REVIEW.md`.
