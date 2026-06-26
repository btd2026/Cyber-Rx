# CyberRx — Production Setup & Credentials Checklist

This is the precise, ordered list to take CyberRx from demo mode to a live,
multi-tenant deployment that handles **real user-entered data behind real auth**.

The application is built **demo-safe**: with no backend configured
(`supabaseConfigured === false`) it runs entirely on seed data + `localStorage`
and **cannot** write to or read a database. The moment the two `VITE_SUPABASE_*`
vars are present, every persistence path below activates automatically.

---

## What was wired (Phase 7 — "production wiring")

| Path | Before | Now |
|---|---|---|
| **Tenant provisioning** | none | `provision` Edge Function (service-role) creates tenant + your Admin/CISO membership + connectors/assumptions/inventory/incident-plan/contacts in one privileged call |
| **Onboarding → go live** | localStorage only | calls `provision`, then uploads any attached files to Storage |
| **Identity / tenant / role** | hardcoded `ownSeat:'ciso'` | resolved from `memberships` (RLS) via `TenantProvider`; seat switcher filtered to roles you hold |
| **Decision ledger** | localStorage | `decisions` insert; DB trigger signs + hash-chains; loads on init |
| **Tickets** | localStorage | `tickets` insert/update; loads on init |
| **Audit log** | table existed, never populated | DB triggers auto-log every decision + document upload, signed & append-only |
| **File uploads** | text placeholders | real `<input type=file>` (documents + IR plan) → Supabase Storage with SHA-256 content hashing; CSV bulk-import for processes/apps |
| **`documents` / `org_processes` / `org_applications`** | missing | added in `0003_documents_audit.sql` with RLS |
| **Twin** | client only sent `{question}` | now sends `{question, tenantId}` to the server-side Edge Function |

**Proven at the DB level** (run `bash scripts/local/run_isolation_test.sh`):
14 tenant-isolation checks + 7 wiring checks (audit auto-population, signed
audit rows, `documents` isolation read/write, append-only audit log) — all pass.

---

## Step-by-step to go live

### 1. Supabase project
- Create a project → **Project Settings → API**: copy the **Project URL** and
  **anon public key**.
- **Authentication → Providers**: enable Email; **enable TOTP MFA**.

### 2. Apply the schema
Apply migrations in order (SQL editor, or `supabase db push`):
```
supabase/migrations/0001_schema.sql
supabase/migrations/0002_rls.sql
supabase/migrations/0003_documents_audit.sql
```

### 3. Load the framework catalogs
```
node supabase/scripts/load_catalogs.mjs <oscal-path> | psql "$SUPABASE_DB_URL"
```
Loads NIST 800-53 (1,196 controls). CIS / ISO 27001 / SOC 2 control titles are
licensed — supply those distributions yourself.

### 4. Storage buckets
Create **private** buckets and tenant-scoped policies:
- `documents` (used by uploads today)
- `incident-plans`, `exports` (reserved for future use)

Suggested RLS on `storage.objects` for the `documents` bucket — restrict to the
caller's tenant by path prefix (`{tenant_id}/...`), mirroring the table RLS.

### 5. Deploy Edge Functions + secrets
```
supabase functions deploy provision
supabase functions deploy twin
supabase secrets set SUPABASE_SERVICE_ROLE_KEY=...   # provisioning (server-only)
supabase secrets set ANTHROPIC_API_KEY=...           # Twin model
supabase secrets set ANTHROPIC_MODEL=claude-sonnet-4-6   # optional
```

### 6. Frontend env (local `.env` and Vercel project env)
```
VITE_SUPABASE_URL=...
VITE_SUPABASE_ANON_KEY=...
VITE_TWIN_URL=${VITE_SUPABASE_URL}/functions/v1/twin     # optional
# VITE_SUPABASE_FUNCTIONS_URL=...                          # optional override
```

### 7. First run
Sign up → **Onboarding → Go live**. The `provision` function creates your tenant
and grants you Admin + CISO. You now own a live, isolated tenant; decisions,
tickets, and document uploads persist behind RLS.

---

## Credentials checklist (only you can supply these)

- [ ] Supabase **Project URL** + **anon key** (`VITE_SUPABASE_*`)
- [ ] Supabase **service-role key** (`provision` secret — server only)
- [ ] **Anthropic API key** (`twin` secret — server only)
- [ ] Run migrations `0001`/`0002`/`0003` against your DB
- [ ] Run the catalog loader (+ licensed CIS/ISO/SOC 2 distributions)
- [ ] Create Storage buckets (`documents`, `incident-plans`, `exports`) + RLS
- [ ] Vercel project env vars + production deploy
- [ ] (Later) Per-vendor connector OAuth apps / API tokens — see below
- [ ] (Later) Virus-scanning service key (VirusTotal / ClamAV) for the upload path

---

## What is still NOT production (honest scope)

Phase 7 makes the app handle **real user-entered data** (org profile, decisions,
tickets, uploaded documents, incident plans) under real auth + RLS. It does **not**
make live security telemetry flow.

**Connector ingestion does not exist.** All ten connectors (EDR, SIEM, Firewall,
IdP, CSPM, VulnMgmt, Email, Backup/DR, MDM, ITSM) are still UI toggles — selecting
one records a `connectors` row (config metadata) but there is **no** OAuth flow,
no API polling, no normalization into the `evidence` table. Until that exists, the
CMMI scores and risk figures on the dashboards run on seed/illustrative data.

Building it is a multi-month effort: per-vendor OAuth apps + a server-side
ingestion pipeline (read-only API calls → normalize → `evidence` insert via
service-role with `content_hash` + `freshness_seconds`) → the existing
deterministic scorer then computes live maturity. The scorer (`src/engine/scorer.ts`)
is already real and tested; it just needs real evidence rows to score.

**Before customer launch**, the brief's non-negotiables still apply: a fresh
security review of the new server-side `provision` path, and legal review of the
My Liability / CFO-CLO-CRO language.
