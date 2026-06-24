# CyberRx — Phase 0 Plan

**Status:** Draft for founder approval. No application code has been written.
**Scope of this document:** repo structure, full data model with `tenant_id` +
RLS on every table, auth/MFA approach, connector strategy, secret handling, and
the phase-by-phase build plan with a "done" definition for each.

The four non-negotiables are baked into everything below:

1. **Tenant isolation (RLS)** is proven with two real test orgs **before** any
   real or PHI-like data is loaded.
2. **The Anthropic API is called server-side only** — no key, ever, in the browser.
3. **Every user-facing number** traces to **pulled evidence** or an **owned,
   labeled assumption** — never invented.
4. **One full security review** before launch.

---

## 1. What we're building (one paragraph)

CyberRx is an executive operating system for defensible cybersecurity
decisions: seven executive "seats" (CEO/CISO/CFO/CIO/CLO/CRO/Board) that each
answer "what's true right now, what does it mean in dollars, what do I decide,"
and produce a **signed, append-only record** that the executive acted
reasonably. A **deterministic engine owns all numbers**; the LLM only phrases
pre-computed values over this tenant's evidence. It is multi-tenant SaaS sold to
large healthcare payers first.

---

## 2. Where this lives in the repo

This is the **new, separate app** in `CyberRXNew/` — the existing root-level app
(`frontend/`, `cyberrx-api/`) is untouched. We restructure `CyberRXNew/` into a
small monorepo with a clear frontend / backend split:

```
CyberRXNew/
├── web/                     # React + Vite + TypeScript frontend (the seven seats)
│   ├── src/
│   │   ├── app/             # router, shell, theme
│   │   ├── seats/           # CISO first, then the other six
│   │   ├── evidence/        # drill-to-evidence drawer (reused everywhere)
│   │   ├── ledger/          # decision ledger UI
│   │   ├── onboarding/      # intake flow
│   │   └── lib/             # API client (React Query), formatting, currency
│   └── styles/              # design tokens ported from the mock
├── supabase/                # the backend + data layer (server-side)
│   ├── migrations/          # SQL: schema + RLS policies (source of truth)
│   ├── functions/           # Edge Functions: engine, retrieval, ALL Anthropic calls
│   └── seed/                # clearly-flagged seed data, real-shaped
├── packages/
│   └── shared/              # TypeScript types + zod schemas shared by web & functions
├── scripts/                 # the RLS two-tenant isolation test, catalog loaders
└── docs/                    # brief, prompt pack, mock, and these plans
```

**Why this shape:** the frontend never touches the database or Anthropic
directly — it only calls the backend. Everything that must stay secret or
authoritative (the engine, retrieval, the API key, RLS) lives behind
`supabase/`. The `web/` app is "just a renderer" of values the backend computed.

> **Note / decision needed:** the current `CyberRXNew/` scaffold is plain
> JavaScript. The brief calls for **TypeScript**. Phase 1 converts the scaffold
> to TS and moves it under `web/`. (Cheap to do now, expensive later.)

---

## 3. Tech stack (per brief §4)

| Layer        | Choice                                                            |
| ------------ | ----------------------------------------------------------------- |
| Frontend     | React + Vite + React Router + **TypeScript**; React Query for server state |
| Styling      | Design tokens ported from the mock (Space Grotesk / Public Sans / JetBrains Mono; warm-light default + dark mode) |
| Backend/data | **Supabase** — Postgres, Auth, Row-Level Security, Storage        |
| Server logic | Supabase **Edge Functions** (engine, retrieval, Anthropic) — keeps the key server-side |
| AI           | Anthropic API, server-side only, structured/JSON outputs, schema-validated |
| Hosting      | Vercel (frontend) + Supabase (data/auth); live preview URL from Phase 1.5 |
| Secrets      | Supabase secrets / Vercel env vars — never client-side            |

---

## 4. The data model (every table has `tenant_id` + RLS from day one)

All tables carry `tenant_id uuid not null` and have **Row-Level Security
enabled**. Reads are restricted to the caller's tenant; writes additionally
check the caller's role. Ledger/audit tables are **append-only** (no
update/delete policy) and signed.

| Table                     | Purpose (brief §5)                                                            | Write rule |
| ------------------------- | ---------------------------------------------------------------------------- | ---------- |
| `tenants`                 | Org profile: name, industry, ownership, regions, regulated data types, **primary currency (ISO)**, materiality threshold | Admin |
| `users` / `memberships`   | A user belongs to a tenant with a **role** (CEO/CISO/CFO/CIO/CLO/CRO/Board/Admin) | Admin |
| `connectors`              | Per-tenant integration config, status, last-sync, health                     | Admin |
| `evidence`                | **The spine** — normalized signals/docs: source system, `collected_at`, freshness, content hash/signature, value | System (ingestion) |
| `frameworks` / `controls` / `control_status` | Catalogs (CSF 2.0, 800-53, CIS v8, ISO 27001, SOC 2) + per-control CMMI 0–5, status, linked evidence, analyst review state | Analyst |
| `decisions` (the ledger)  | title, type, owner, timestamp, rationale, **evidence-snapshot-at-time**, options, chosen option, residual $, status, re-review trigger | **Append-only, signed** |
| `tickets`                 | External system (Jira/ServiceNow), external id, status, due date, linked decision | Seat owner |
| `assumptions`             | Owned values (loaded labor rate, downtime $/hr, breach $/record, discount rate): value, owner, basis, **version history** | Seat owner |
| `incident_plan` / `contacts` | IR plan doc + 24/7 call tree (role, name, phone) — powers Incident Commander | CISO/Admin |
| `benchmark_contributions` | Opt-in, anonymized, **high-level CMMI maturity only**; k-anonymity enforced server-side | System |
| `audit_log`               | **Append-only** record of every view, computation, model call, export, decision | System |

**RLS policy pattern (every table):**

```sql
-- read: only rows belonging to a tenant the caller is a member of
USING ( tenant_id IN (SELECT tenant_id FROM memberships WHERE user_id = auth.uid()) )

-- write: same, AND the caller holds an allowed role for that table
WITH CHECK ( tenant_id IN (...member tenants...) AND has_role(tenant_id, ARRAY['Admin', ...]) )
```

Ledger/audit tables get **no** update or delete policy at all — immutability is
enforced by the database, not by the UI.

---

## 5. Auth + MFA

- Supabase Auth: **email/password + MFA (TOTP)**, matching the mock's
  login → MFA → role-selection front door.
- A user signs in, the server resolves their `memberships`, and the UI shows a
  **role-aware seat switcher**. RBAC is enforced **server-side** (Edge Functions
  + RLS): you may edit only your own seat; all other seats are view-only. The
  client hiding a button is never treated as security.

---

## 6. Connector strategy (read-only)

- Every connector is **read-only**, via the vendor's official API, **least
  privilege**, OAuth where available (EDR, SIEM, firewall, IdP, CSPM, vuln,
  email, backup/DR, MDM, ITSM/GRC; plus financial: cloud bills, HRIS, contracts).
- Pipeline per connector: **ingest → normalize into `evidence` (with
  `collected_at`, freshness, content hash) → sign & store → compute in the
  engine → derive confidence → translate (LLM as slot-filler only) → render with
  the drill-to-evidence path intact.**
- Until real connectors land (Phase 6), seats run on **clearly-flagged,
  real-shaped seed data**, with the evidence drill path wired end-to-end so the
  swap to live data is mechanical.

---

## 7. How secrets stay server-side

- The Anthropic key and all connector credentials live in **Supabase secrets /
  Vercel env vars** — never in the repo, never shipped to the browser.
- The browser calls **our** Edge Functions; those functions call Anthropic. The
  key never crosses to the client. A CI check will fail the build if an
  `ANTHROPIC`/secret reference appears in client code.

---

## 8. Anti-hallucination architecture (brief §2) — how it's enforced

- **Deterministic engine owns the truth.** Verdicts, scores, CMMI, and dollars
  are **computed**, not generated.
- **Surface A (computed figures + five questions):** the LLM only slot-fills a
  template with engine-provided values and citations; it cannot change a number.
- **Surface B ("Ask your twin"):** two server-side gates — (1) scope router
  (cyber AND this org, else a fixed honest refusal), (2) retrieval gate (thin
  evidence → "I don't have evidence in your data for that"). Grounded generation
  only, schema-validated, human-in-the-loop for anything consequential.
- **The leaf rule:** every dollar decomposes to **● pulled** (a connector) or
  **◐ assumption** (the `assumptions` table — labeled, owned, editable,
  change-logged). Enforced in the data model, not just the UI.
- **No-data is a first-class state.** Confidence is mechanical (coverage +
  freshness). Citations or it doesn't ship.

---

## 9. The build, phase by phase ("done" = the stop gate)

Each phase ends with: a plain-English summary, a **live URL** to look at, stated
assumptions/risks, then **wait for approval**.

| Phase | What gets built | "Done" looks like |
| ----- | --------------- | ----------------- |
| **0 — Plan** *(this doc)* | The plan, no code | You approve this document |
| **1 — Foundation** | Supabase project; auth + MFA; full schema **with RLS**; role model | **Two test tenants with overlapping data; proof at the DB level that org A cannot read org B's rows.** Do not proceed until this passes |
| **1.5 — Live preview** | Deploy frontend (Vercel) + backend (Supabase) | A URL you can open: login screen + a placeholder authed page; secrets confirmed server-side |
| **2 — Exec shell + CISO seat** | Front door → seat switcher; the **CISO seat in full** (five questions, exec summary, drill-to-evidence drawer, decision ledger, ticketing UI), on flagged seed data | Each sub-step (2a/2b/2c) visible on the live URL and approved |
| **2B — Other six seats** | CEO/CFO/CIO/CLO/CRO/Board, reusing CISO patterns | Each seat visible on the live URL |
| **3 — Onboarding/intake** | Org profile (+ primary currency), connectors, processes & crown jewels, documents, per-seat needs, **incident command plan + call tree**, benchmark consent, go-live | Flow persists to the real tables; currency honored app-wide |
| **4 — Frameworks + CMMI engine** | Load **complete** authoritative catalogs (OSCAL/CIS/ISO/SOC 2); deterministic scorer (evidence → control → CMMI 0–5 + confidence); analyst review; signed exports | Posture UI drills to per-control evidence; exports are real, signed files |
| **5 — Executive Twin** | Surface A slot-filling, then Surface B (both gates, grounded, schema-validated), leaf rule, then server-side voice briefings | Anti-hallucination behavior demonstrably holds; gates refuse honestly |
| **6 — Orchestration + war room + security review** | Real Jira/ServiceNow sync; War Room + Incident Commander; then the **security review launch gate** (RLS audit, secrets, signed ledger, PHI, pen-test pass) | 6d passes — the platform is not launch-ready until it does |

---

## 10. What I'll need from you before Phase 1 starts

None of this is needed to approve Phase 0. Before I can build Phase 1, you'll
need to set up (I'll walk you through each, step by step):

1. A **Supabase** account + project (free tier is fine to start).
2. A **Vercel** account (for the live preview URL).
3. An **Anthropic API key** (used server-side only; not needed until Phase 5,
   but good to have ready).
4. Later, for real connectors (Phase 6): read-only API access to whichever
   security/IT/financial systems the first customer uses.

---

## 11. Things the mock papers over (flagged now, honored later)

- All mock numbers are illustrative; production computes them from evidence.
- "Signed / immutable / k-anonymous" must be enforced **server-side**, not asserted.
- Framework control titles load **verbatim** from authoritative catalogs.
- **My Liability** and CFO/CLO/CRO legal language **must be reviewed by real
  legal counsel** before it's customer-facing.
- Voice = server-side neural TTS in production, not browser speech.

---

## 12. Open decisions for you (small)

1. **TypeScript conversion** of the current scaffold — recommended, per brief §4. (Default: yes.)
2. **Server logic home:** Supabase Edge Functions (recommended, keeps everything
   in one place) vs. a separate thin Node service. (Default: Edge Functions.)

Neither blocks approval — I'll proceed with the recommended defaults unless you
say otherwise.

---

**Next step:** if this plan looks right, approve it and I'll begin **Phase 1 —
Foundation** (Supabase project, auth + MFA, the schema with RLS, and the
two-tenant isolation proof). I will stop and show you the proof before moving on.
