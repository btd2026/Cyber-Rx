# CyberRx — Connector Ingestion (Phase 8 scaffold)

Turns vendor APIs into **pulled evidence** that the deterministic CMMI scorer
(`src/engine/scorer.ts`) turns into live maturity. This is the layer the
readiness audit found missing entirely. It is now **scaffolded with twelve working
adapters** against genuinely-free, self-serve developer tiers, plus a registry
of the remaining categories (most of which are enterprise-gated).

## Architecture

```
vendor API ──(read-only)──▶ Adapter.pull() ──▶ RawSignal[]
                                                  │
                          ingest orchestrator (service-role, server-side)
                                                  │
              sha256 content-hash ─▶ evidence INSERT ─▶ scorer ─▶ CMMI
```

- **Adapters** (`supabase/functions/_shared/adapters/*`) are pure
  `config + secret → RawSignal[]` functions. They never touch the DB and never
  see another tenant.
- **Orchestrator** (`supabase/functions/ingest`) authenticates (tenant Admin or
  the `CRON_SECRET`), loads connectors + their **service-role-only** secrets,
  runs each adapter, content-hashes the signals, and inserts `evidence`. It
  records per-connector status/health and a signed `audit_log` line.
- **Secrets** live in `connector_secrets` (migration `0004`) — RLS forced, **no
  policies**, so only the service role (the Edge Functions) can read them.
  Credentials are set write-only via `set-connector-secret`. Prefer Supabase
  Vault in production.
- **Client helpers** (`src/lib/db.ts`): `loadConnectors`, `setConnectorSecret`,
  `runIngest`, `loadEvidence` — all `supabaseConfigured`-gated.

## Free API research — what you can actually sign up for

Verified June 2026. "Free" = self-serve, no sales call, real read-only API.

| Category | Provider | Free? | Adapter | Signup / signal |
|---|---|---|---|---|
| **Identity** | **Okta Integrator Free Plan** | ✅ free forever | ✅ wired | developer.okta.com/signup → SSWS API token → `mfa_coverage` (users×factors) |
| **Identity** | **Microsoft Entra / M365 Dev E5 (Graph)** | ✅ free* | ✅ wired | Azure tenant + app reg (client-credentials) → `userRegistrationDetails` → `mfa_coverage` + admin count. *report needs Entra P1/P2 (free P2 trial); M365 Dev Program now needs a Visual Studio sub |
| **ITSM / GRC** | **ServiceNow PDI** | ✅ free sandbox | ✅ wired | developer.servicenow.com → Basic auth → open security incidents (Aggregate API). Sandbox data; PDIs hibernate ~10d idle |
| **SIEM** | **Elasticsearch Basic** | ✅ free forever | ✅ wired | `docker run elasticsearch` → API key → log-ingestion presence + events-by-severity |
| **ITSM / GRC** | **Jira Cloud Free** | ✅ free (≤10 users) | ✅ wired | id.atlassian.com API token (Basic email:token) → JQL approximate-count of open security tickets |
| **EDR** | **Defender Secure Score (Graph)** | ✅ free via M365 Dev | ✅ wired | `/security/secureScores` → `currentScore/maxScore` (posture %) |
| **MDM** | **Intune (Graph)** | ✅ free via M365 Dev | ✅ wired | page `/deviceManagement/managedDevices` → % compliant |
| **Vuln mgmt** | **Nessus Essentials** | ✅ free (16 IPs) | ✅ wired | local API :8834, `X-ApiKeys` → critical/high counts from `/scans/{id}` |
| **CSPM** | **AWS Security Hub** | ✅ free tier (read) | ✅ wired | SigV4 `GetFindings` → severity counts + compliance pass rate |
| **Backup / DR** | **Veeam Community Edition** | ✅ free (10 workloads) | ✅ wired | OAuth2 :9419 → `/api/v1/sessions` → backup success rate |
| **SIEM** | **Splunk Free (self-hosted)** | ✅ free (500MB/day) | ✅ wired | bearer token → `/services/data/indexes` event counts. (Splunk *Cloud* trial blocks the API) |
| **Firewall** | **Cisco Meraki (DevNet)** | 🟡 free lab / API | ✅ wired | API key → `appliance/firewall/l3FirewallRules` → rule hygiene |
| EDR | CrowdStrike / SentinelOne | ❌ enterprise | — | API needs a licensed tenant |
| Email | Proofpoint / Mimecast / Abnormal | ❌ enterprise | — | no self-serve free tier |
| CSPM | Wiz / Prisma Cloud | ❌ sales-gated | — | demo/trial via sales only |
| Backup | Rubrik / Cohesity | ❌ enterprise | — | licensed tenant/appliance required |

**Easiest two to demo end-to-end today:** Okta (instant, free forever) and
Elasticsearch (zero signup, `docker run`). Both produce a real evidence row in
minutes.

## How to use it (once a backend is wired)

1. **Sign up** for a free source above and get its credential (e.g. an Okta SSWS
   token + your org URL).
2. **Provision** your tenant via onboarding go-live (creates the `connectors`
   rows for the categories you toggled).
3. **Configure the source** — open **🔌 Data sources** in the top bar
   (`src/connectors/DataSources.tsx`). Pick a provider for the connected
   category, paste the credential, **Save**, then **Sync now** — the pulled,
   content-hashed evidence row appears inline. (Under the hood:
   `setConnectorSecret` → `runIngest` → `loadEvidence`.)
4. **Schedule** ongoing pulls by invoking the `ingest` function via Supabase
   cron with `X-Cron-Key: $CRON_SECRET`. Evidence lands in the `evidence` table;
   the scorer picks it up.

### Deploy
```
supabase functions deploy ingest
supabase functions deploy set-connector-secret
supabase secrets set SUPABASE_SERVICE_ROLE_KEY=...
supabase secrets set CRON_SECRET=...      # optional, for scheduled runs
# apply migration 0004_connector_secrets.sql
```

## Honest scope of this scaffold

- ✅ Adapter contract + 12 real adapters (Okta, Entra/Graph, ServiceNow, Jira,
  Elastic, Splunk, Defender Secure Score, Intune, Nessus, AWS Security Hub,
  Veeam, Cisco Meraki).
- ✅ Server-side orchestrator with auth, secret isolation, content-hashed evidence
  writes, per-connector health, and signed audit logging.
- ✅ Service-role-only secret storage (migration `0004`).
- ✅ Client helpers to configure + trigger ingestion.
- ✅ **"Configure data sources" UI** — vendor picker + credential form (driven by
  the client catalog `src/connectors/catalog.ts`), Save → Sync → inline evidence,
  opened from the top bar.
- ✅ **Evidence → control mapping** (`src/engine/controlMap.ts`): each evidence
  `kind` is graded (value → 0..1) and mapped to the NIST CSF 2.0 controls it
  evidences; Framework Posture overrides seed with the graded real value, marks
  those controls **LIVE** with their pulled sources, and persists the engine's
  computed maturity to `control_status` (RLS-protected). So a real Okta
  `identity_mfa_coverage` reading moves PR.AA-05's CMMI on the dashboard. Proven:
  `supabase/scripts/map_proof.ts` + 3 `control_status` SQL checks.
- ✅ **AWS SigV4 signer** (`_shared/aws/sigv4.ts`) for Security Hub, validated
  against AWS's official test-suite "get-vanilla" vector + signing-key example
  (`supabase/scripts/aws_sigv4_proof.ts`).
- ✅ **Scheduled-sync cron** (`supabase/cron/ingest_cron.sql`) — pg_cron + pg_net
  fan out a read-only ingest to every tenant on a schedule (see below).
- ⬜ **Remaining:** broadening the control map (each new adapter adds a
  `controlMap` entry), and the enterprise-gated categories (no free API). The
  Edge Functions are Deno and aren't covered by the Vite build/lint; validate
  with `deno check` before deploy.

## Scheduled sync (hosted Supabase)

Connected sources refresh automatically — no manual "Sync now". Apply
`supabase/cron/ingest_cron.sql` in the Supabase SQL editor (it needs pg_cron +
pg_net, which is why it lives outside `migrations/` — keeps the local proof
green). Then populate the operator settings once:

```sql
insert into app.settings (key, value) values
  ('ingest_url', 'https://YOUR-REF.supabase.co/functions/v1/ingest'),
  ('cron_secret', 'YOUR-CRON-SECRET')   -- same as the ingest function's CRON_SECRET
on conflict (key) do update set value = excluded.value;
```

It runs every 6 hours by default (`cron.alter_job` to change). The fan-out reads
secrets from `app.settings` (the `app` schema isn't exposed to the client API),
hits the `ingest` function per tenant with `X-Cron-Key`, and the orchestrator
does the rest. No-pg_cron fallback: any external scheduler can `curl` the same
endpoint with the cron header (see the SQL file's footer).

### Evidence → control map (current)
| Evidence kind | Grades to | CSF control | Reading |
|---|---|---|---|
| `identity_mfa_coverage` | coverage ratio | **PR.AA-05** | MFA enrollment % (Okta / Entra) |
| `itsm_open_security_incidents` | 1 − open_high/10 | **RS.MA-01** | remediation throughput (ServiceNow / Jira) |
| `siem_log_ingestion` | present ? 1 : 0 | **DE.CM-01** | security monitoring present (Elastic / Splunk) |
| `edr_secure_score` | posture ratio | **PR.PS-01** | Defender Secure Score |
| `mdm_device_compliance` | compliant ratio | **PR.PS-01** | Intune device compliance % |
| `vuln_findings` | 1 − (crit·2+high)/50 | **ID.RA-01** | open critical/high vulns (Nessus) |
| `cspm_findings` | compliance pass rate | **PR.PS-01** | cloud posture (AWS Security Hub) |
| `backup_success_rate` | success rate | **RC.RP-01** | recovery readiness (Veeam) |
| `firewall_rule_hygiene` | hygiene ratio | **PR.IR-01** | network protection (Cisco Meraki) |
