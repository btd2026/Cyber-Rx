# CyberRx — Phase 1: Foundation (built & proven)

**Status:** Complete, pending founder approval. The hard acceptance test —
**tenant isolation proven at the database level** — passes.

This phase delivers the data foundation only (schema, RLS, role model, signed
ledger). No executive screens yet — those are Phase 2.

---

## What was built

| Artifact | Path | What it is |
| --- | --- | --- |
| Core schema | `supabase/migrations/0001_schema.sql` | Every table from the brief §5, `tenant_id` on every tenant-scoped row |
| RLS + roles + ledger | `supabase/migrations/0002_rls.sql` | Row-Level Security on every table, the role model, and the append-only **signed** decision ledger / audit log |
| Auth shim (local only) | `scripts/local/00_supabase_shim.sql` | Mirrors Supabase's `auth.users` / `auth.uid()` / roles so the same SQL runs locally |
| Isolation test | `scripts/local/10_isolation_test.sql` | The two-tenant acceptance test |
| Test runner | `scripts/local/run_isolation_test.sh` | Recreates a DB, applies migrations, runs the test |
| **Proof output** | `docs/PHASE_1_ISOLATION_PROOF.txt` | The captured passing result |

### The role model
Eight roles (`CEO/CISO/CFO/CIO/CLO/CRO/Board/Admin`) via `memberships` — a user
belongs to a tenant with a role. Reads are tenant-scoped; writes are role-scoped
(e.g. only `Admin` edits org settings; only `CISO`/`Admin` edit the incident
plan). Enforced in the **database**, not the UI.

### Two things made *true* at the DB level (not just labelled)
- **Tenant isolation** — RLS policies key every read/write to the caller's
  membership. A user simply cannot see or touch another org's rows.
- **Immutable, signed ledger** — `decisions` and `audit_log` reject any
  UPDATE/DELETE (even from the privileged `service_role`) and are SHA-256
  hash-chained on insert, so tampering is detectable.

---

## The proof (acceptance test)

Run against a real PostgreSQL 16 (the engine Supabase uses). Two tenants were
seeded with **structurally identical, overlapping data** — only `tenant_id`
differs — then queried as each tenant's user via JWT claims, exactly as Supabase
authenticates requests. Every check passed:

```
PASS: tenant B invisible to A in public.tenants
PASS: tenant B invisible to A in public.connectors
PASS: tenant B invisible to A in public.evidence
PASS: tenant B invisible to A in public.assumptions
PASS: tenant B invisible to A in public.decisions
PASS: tenant B invisible to A in public.memberships
PASS: user A sees its own evidence (rows: 1)
PASS: cross-tenant INSERT by A into tenant B blocked
PASS: direct-id read of tenant B decision returns nothing   (no IDOR)
PASS: user B sees only tenant B
PASS: anonymous caller sees no tenant data
PASS: decision UPDATE blocked (append-only) even for service_role
PASS: decision DELETE blocked (append-only)
PASS: ledger is signed and hash-chained
================================================================
  PHASE 1 ISOLATION TEST: ALL CHECKS PASSED
================================================================
```

Reproduce it yourself: `bash CyberRXNew/scripts/local/run_isolation_test.sh`

---

## Applying this to YOUR Supabase project

The migrations are written to run **unchanged** on Supabase (they use the real
`auth.users` / `auth.uid()` that already exist there — the local shim is only for
the test above). When you're ready:

1. Create a project at supabase.com (free tier is fine).
2. Install the CLI: `npm i -g supabase`, then `supabase login`.
3. From `CyberRXNew/`: `supabase link --project-ref <your-ref>`.
4. Push the schema: `supabase db push`  (applies `supabase/migrations/*`).
5. In the dashboard: **Auth → Providers** enable Email, and **Auth → MFA**
   enable TOTP.

That's the complete Phase 1 backend. No secrets are in the repo; the Anthropic
key isn't referenced anywhere yet (it arrives, server-side only, in Phase 5).

---

## Design decisions worth knowing (plain English)

1. **Framework catalogs are global, not per-tenant.** CSF/800-53/CIS/ISO/SOC 2
   control lists are public reference data, identical for everyone, and contain
   no customer info — so they carry no `tenant_id`. Only each org's *status*
   against those controls is isolated. (The brief's "tenant_id on every row"
   rule is about customer data; this is the deliberate, documented exception.)
2. **Secrets never live in `connectors.config`** — only non-secret settings.
   Credentials go in a secret manager when connectors land (Phase 6).
3. **The scaffold is still JavaScript; Phase 2 converts the frontend to
   TypeScript** (per brief §4) as we build the first real screens.

---

## What's next — Phase 2 (after your approval)

The executive UI shell, CISO-first: login → MFA → role-aware seat switcher, then
the full CISO seat (five questions, exec summary, drill-to-evidence drawer,
decision ledger UI), on clearly-flagged seed data. It ends — like every phase
from here — with a **live URL you can click**. (Phase 1.5 stands up that URL
first; it needs your Supabase + Vercel accounts, which I'll walk you through.)

**To proceed, reply "approved — Phase 1.5" (or "Phase 2").** Or tell me what to
change.
