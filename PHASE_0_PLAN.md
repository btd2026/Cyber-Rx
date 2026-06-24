# CyberRx — Phase 0 Plan (no application code)

**Status:** Draft for founder approval. Nothing here writes product code. This is the
blueprint we approve before Phase 1.

**Source of truth:** `cyberrx-build-brief.md` (the brief) + `cyberrx-platform.html` (the
approved mock). Where this plan and the brief ever disagree, the brief wins.

**The one rule that governs everything:** every number a user sees is either *pulled from a
connected system* or an *explicitly owned assumption* — never invented. The whole
architecture below exists to make that rule true and provable.

---

## 0. The most important thing you need to decide first (please read)

You asked me to plan a fresh build. But **this repository is not empty** — it already
contains a substantial, in-flight CyberRx product built by previous work:

- A Node/Express backend (`cyberrx-api/`) with ~25 SQL migrations, **16 read-only
  connectors already written** (SecurityScorecard, BitSight, Black Kite, RiskRecon,
  ServiceNow, RecordedFuture, HHS/OCR, and more), the **Anthropic SDK already used
  server-side only** (good), SAML login, and app-level "org isolation" middleware.
- A React frontend (`frontend/`) with many built screens, a shared component kit, and
  design tokens.
- ~40 planning/status documents and deployment configs for **Vercel + Render**.

**This matters because the existing foundation differs from the brief in two big ways:**

| | The brief prescribes | What's in the repo today |
|---|---|---|
| Data + auth | **Supabase** (Postgres + Auth + **database-level RLS** + Storage) | Plain Postgres on Render; **no database RLS**; isolation done in app code |
| Tenant isolation | **Row-Level Security at the database**, proven before real data | `organization_id` columns + middleware checks. **Zero `CREATE POLICY` / `ENABLE ROW LEVEL SECURITY` anywhere** |

**Why this is the headline finding:** your #1 non-negotiable is *"tenant isolation via RLS,
proven with two test orgs before any real data."* The current code does **not** meet that
bar — isolation today lives in application logic, which is exactly the thing the brief says
is not good enough ("'immutable' must be true at the database level, not a UI label";
"the client hiding a button is not security"). A single bug in app code could leak one
customer's data to another. Database RLS is a second, independent wall that holds even when
app code has a bug. We do not have that wall yet.

### Your three options

- **Option A — Greenfield on Supabase (literal to the brief).** New Supabase project, build
  the RLS foundation clean, and re-port the valuable existing pieces (connectors, engine,
  prompts) into it over time. Cleanest isolation story; slowest to first light because we
  rebuild scaffolding that already exists.
- **Option B — Retrofit RLS onto the existing Express/Postgres stack.** Keep everything,
  add real Postgres RLS policies. Salvages the most code, but we'd be bolting Supabase-style
  isolation onto a stack that wasn't designed for it, and we'd lose Supabase Auth/MFA/Storage
  that the brief leans on.
- **Option C — Hybrid (my recommendation).** Adopt **Supabase as the data + auth + RLS +
  storage foundation exactly as the brief says**, and keep a **thin Node service** for the
  engine, connectors, and all Anthropic calls. The brief explicitly allows this: *"Server-side
  logic in Supabase Edge Functions or a thin Node service — whichever keeps the Anthropic key
  server-side."* This gives us real database RLS (non-negotiable #1) **and** lets us reuse the
  16 connectors and the AI services already written, by lifting them into the thin service.

**My recommendation: Option C.** It honors the brief's non-negotiable isolation model while
salvaging the genuinely valuable domain work already in the repo. **The rest of this plan is
written for Option C.** If you prefer A or B, I'll revise before we touch any code.

> Everything below describes the *target* architecture. The existing code becomes a parts
> bin we draw from during Phases 2–6 — not the foundation we build on.

---

## 1. Proposed repo structure (frontend + backend)

A clean two-app layout plus shared schema/infra. We grow into this; we don't build it all at
once.

```
cyberrx/
├─ apps/
│  ├─ web/                      # React + Vite + TypeScript executive UI (the seven seats)
│  │  ├─ src/
│  │  │  ├─ app/                # router, providers, theme (light default + dark)
│  │  │  ├─ seats/              # ceo/ ciso/ cfo/ cio/ clo/ cro/ board/ — one folder per seat
│  │  │  ├─ shared/            # the reusable kit: answer-grid, drill-to-evidence drawer,
│  │  │  │                      #   decision-ledger card, costed-decision card, no-data state
│  │  │  ├─ onboarding/         # the Phase 3 intake flow
│  │  │  ├─ warroom/            # War Room + Incident Commander console (Phase 6)
│  │  │  ├─ lib/                # api client (React Query), supabase client, formatting/currency
│  │  │  └─ styles/             # cyberrx-design-tokens.css ported from the mock
│  │  └─ index.html
│  │
│  └─ api/                      # thin Node service: the engine, connectors, all Anthropic calls
│     ├─ src/
│     │  ├─ engine/             # DETERMINISTIC truth: scores, verdicts, CMMI, FAIR $ (no LLM here)
│     │  ├─ ai/                 # Anthropic calls ONLY — spec-sheet prompts, the two gates,
│     │  │                      #   schema validation. Key lives here, server-side, never shipped
│     │  ├─ connectors/         # read-only integrations (ported from existing cyberrx-api)
│     │  ├─ ingest/             # normalize → evidence schema → sign → store
│     │  ├─ retrieval/          # pull this tenant's evidence for grounded answers (RLS-scoped)
│     │  ├─ routes/             # REST endpoints; every handler is tenant-scoped
│     │  ├─ middleware/         # verify session → derive tenant_id → SET LOCAL app.current_tenant
│     │  └─ db/                 # query layer that always runs inside a tenant-scoped transaction
│     └─ tests/                 # incl. the Phase 1 two-tenant isolation test
│
├─ supabase/
│  ├─ migrations/               # the schema + RLS policies (§2). Versioned, reviewable
│  ├─ seed/                     # the two test tenants for the isolation proof
│  └─ config.toml
│
├─ packages/
│  └─ shared-types/             # TypeScript types shared by web + api (table shapes, enums, roles)
│
├─ docs/                        # this plan, ADRs (architecture decisions), the security-review checklist
├─ .env.example                 # names only, never values
└─ README.md
```

**Why this shape:** the UI never holds secrets and never talks to Anthropic; the `api`
service is the only thing with the Anthropic key and the only thing that computes numbers;
the `engine` folder is deliberately separate from the `ai` folder so it's structurally
obvious that **the engine owns the truth and the LLM only phrases it.**

---

## 2. The full data model — every table, `tenant_id`, and an RLS policy

### 2.1 How RLS works here (the isolation mechanism, in plain English)

1. **Every tenant-owned table has a `tenant_id` column** and is switched into Row-Level
   Security with `ENABLE ROW LEVEL SECURITY` **and** `FORCE ROW LEVEL SECURITY` (so even the
   table owner is subject to the rules — no accidental bypass).
2. The database is told, for the duration of each request, *which tenant is asking*, via a
   per-transaction setting: `SET LOCAL app.current_tenant = '<verified tenant id>'`.
   That id comes **only** from the verified login session — never from anything the browser
   sends in the request body.
3. Each table gets a policy of the form:
   ```sql
   CREATE POLICY tenant_isolation ON <table>
     USING      (tenant_id = current_setting('app.current_tenant', true)::uuid)
     WITH CHECK (tenant_id = current_setting('app.current_tenant', true)::uuid);
   ```
   `USING` blocks reading other tenants' rows; `WITH CHECK` blocks writing a row stamped with
   someone else's `tenant_id`.
4. The application connects as a **non-superuser role without `BYPASSRLS`.** The powerful
   `service_role` key is used **only** for narrow admin jobs (e.g. creating a tenant), never
   on tenant data paths.
5. **Append-only tables** (`decisions`, `audit_log`) additionally get *no* `UPDATE`/`DELETE`
   policy at all, plus row signing (§2.4) — so "immutable" is enforced by the database.

**Result:** even if app code forgets a `WHERE tenant_id = …`, the database returns zero of
the other tenant's rows. That is the wall the brief requires, and Phase 1 proves it before
any real data lands.

### 2.2 The tables

Every table below carries `tenant_id uuid not null` (except the two global catalog tables,
noted), `id uuid primary key`, `created_at`, and the `tenant_isolation` RLS policy from §2.1.
I list each table's purpose and anything special about its policy.

**Identity & tenancy**

| Table | Purpose & key columns | RLS / special rules |
|---|---|---|
| `tenants` | Org profile: name, industry, ownership, regions[], regulated_data_types[], **primary_currency (ISO 4217)**, materiality_threshold. | A user can read a tenant row only if they're a member (policy via `memberships`). Created by the admin/service path only. |
| `users` | Maps 1:1 to a Supabase Auth user (`auth.users`). Display name, email, MFA status. | A user reads only their own row + co-members of their tenant. |
| `memberships` | The join: `(user_id, tenant_id, role)`. Role ∈ CEO/CISO/CFO/CIO/CLO/CRO/Board/Admin. Drives RBAC. | Read rows for tenants you belong to. The *source* of `app.current_tenant` and the role checks. |

**The evidence spine**

| Table | Purpose & key columns | RLS / special rules |
|---|---|---|
| `connectors` | Per-tenant integration config + status + last_sync_at + health + scope. Credentials are **references** to the secret manager, not the secret values. | Tenant-isolated. Only Admin/owning-seat may edit. |
| `evidence` | **The spine.** Normalized signals & documents: source_system, signal_type, collected_at, freshness, content_hash, signature, raw_ref, normalized_value (jsonb). | Tenant-isolated; effectively append-only (corrections add new rows). Every figure in the UI cites rows here. |
| `documents` | Uploaded files (IR plans, contracts, policies) in Supabase Storage; metadata + hash here. | Tenant-isolated; Storage bucket also RLS-scoped by `tenant_id` path prefix. |

**Frameworks & scoring**

| Table | Purpose & key columns | RLS / special rules |
|---|---|---|
| `frameworks` | **Global catalog** (CSF 2.0, 800-53, CIS v8, ISO 27001, SOC 2). No `tenant_id`. | Read-only to all authenticated users; written only by the catalog loader. |
| `controls` | **Global catalog** of controls per framework, **verbatim IDs + titles** from OSCAL/CIS/ISO. No `tenant_id`. | Same as `frameworks`. |
| `control_status` | Per-tenant per-control state: CMMI maturity 0–5, status, confidence, linked evidence ids[], analyst_review_state. | Tenant-isolated. Maturity is **engine-computed**; an LLM proposal is stored separately with its citation and never overwrites the computed value without analyst sign-off. |

**Decisions, money & follow-through**

| Table | Purpose & key columns | RLS / special rules |
|---|---|---|
| `decisions` | **The ledger / the wedge.** title, type, owner, decided_at, rationale, evidence_snapshot (jsonb, frozen at decision time), options_considered, chosen_option, residual_risk_amount + currency, status, re_review_trigger, **row signature**. | Tenant-isolated **and append-only**: `INSERT` + `SELECT` policies only, **no `UPDATE`/`DELETE`**. Status changes are new linked rows. Signed (§2.4). |
| `assumptions` | Tenant-owned ◐ values: loaded labor rate, downtime $/hr, record-breach cost, discount rate… value, currency, owner, basis/benchmark, version. Cost/FAIR models reference these. | Tenant-isolated. Editable by the owning seat; **every edit writes a new version row + an `audit_log` entry** and triggers recompute + re-review. |
| `tickets` | external_system (Jira/ServiceNow), external_id, status, due_date, linked decision_id. | Tenant-isolated. Reflects external state; blinks near/overdue in the UI. |

**Incident readiness, benchmarking, audit**

| Table | Purpose & key columns | RLS / special rules |
|---|---|---|
| `incident_plan` | IR plan doc ref + metadata; last_verified_at (call trees go stale → dangerous). | Tenant-isolated; CISO/Admin edit. |
| `incident_contacts` | The 24/7 call tree: role, name, phone, internal/external, order. Powers Incident Commander click-to-call. | Tenant-isolated; encrypted at rest; periodic re-verification reminder. |
| `benchmark_contributions` | **Opt-in, anonymized, high-level CMMI maturity only** — never findings/identifiers. Consent state + version. | Tenant-isolated for the row; the cross-tenant *aggregate* is computed server-side with **k-anonymity ≥ 8 peers or fall back to overall maturity**, exposed via a function, never raw rows. |
| `audit_log` | **Append-only** record of every view, computation, model call, export, decision. actor, action, target, evidence_used, model_io_ref, at. | Tenant-isolated; `INSERT` + `SELECT` only, **no `UPDATE`/`DELETE`**; signed (§2.4). |

> Naming note: the existing repo uses `organization_id`. The brief uses `tenant_id`. We
> standardize on **`tenant_id`** for the new schema and map old → new when we port data.

### 2.3 RBAC (who can edit what)

Membership role drives permissions, enforced **server-side** (and mirrored as RLS where it's
data-level): you may **edit your own seat's** objects and **view** the others. Admin manages
connectors, members, and onboarding. The UI hides buttons for nicety only — the server is the
real gate.

### 2.4 "Immutable" and "signed" made real

`decisions` and `audit_log` are append-only at the database (no update/delete policy). Each
row carries a signature over its content + the previous row's signature (a hash chain), so
tampering is detectable and the ledger is verifiably ordered. The signing key lives in the
secret manager, server-side. This is verified in the Phase 6 security review.

---

## 3. Auth + MFA approach

- **Supabase Auth** for identity: **email/password + MFA (TOTP)**. MFA enrollment required
  for every user before they reach a seat. (SSO/SAML can be added later for enterprise buyers;
  the existing repo already has SAML code we can draw on.)
- **The front door matches the mock:** email/password → MFA challenge → role-aware seat
  switcher. A user with no MFA enrolled is routed to enrollment first.
- **Sessions:** short-lived access token + refresh, stored as httpOnly cookies (not readable
  by browser JavaScript). The thin API verifies the token on every request, looks up the
  caller's `memberships`, derives the **one** `tenant_id` + role for this session, and sets
  `app.current_tenant` for the query transaction. **The browser never gets to name its own
  tenant.**
- **RBAC server-side:** every mutating endpoint checks the caller's role for the target seat
  before doing anything. Failing that check is a 403, regardless of what the UI showed.

**Phase 1 acceptance for auth:** a user can sign up, is forced through MFA, and lands scoped
to exactly one tenant with one role.

---

## 4. Connector strategy (read-only integrations)

- **Read-only, least-privilege, official APIs only.** OAuth where the vendor supports it;
  scoped API tokens otherwise. We never request write scopes. Categories per the brief: EDR,
  SIEM, firewall, IdP, CSPM, vuln, email security, backup/DR, MDM, ITSM/GRC, and the financial
  sources that feed money leaves (cloud bills, HRIS, contracts).
- **Reuse what exists:** the 16 connectors already in `cyberrx-api/src/connectors` are lifted
  into `apps/api/src/connectors` behind one `BaseConnector` interface. Each connector's only
  job is: authenticate read-only → fetch → hand raw data to ingest.
- **One ingestion path for everything:** `ingest/` normalizes every connector's output into
  the single `evidence` schema with `collected_at`, `freshness`, and a `content_hash`, then
  **signs and stores** it. Nothing downstream knows or cares which vendor it came from.
- **Confidence is mechanical:** computed from **coverage** (how much of the in-scope estate
  reported) × **freshness** (how recent) — not a vibe, not the LLM.
- **No-data is a designed state:** a connector that returns nothing yields an explicit "no
  evidence" state in the UI, never a guess.
- **Credentials never sit in the database:** `connectors` stores a *reference* to a secret in
  the secret manager (§5); the actual token lives only there.
- **Phasing:** Phases 1–3 run on clearly-flagged *seeded-but-real-shaped* evidence so we can
  build and demo the UI; **real connector sync lands in Phase 4** (feeding the engine) and the
  ITSM write-back loop in Phase 6.

---

## 5. How secrets stay server-side (Anthropic key never in the client)

- **The browser never holds a secret and never calls Anthropic.** The React app only ever
  talks to our own `api` service. There is no Anthropic key, connector credential, or signing
  key anywhere in the frontend bundle — we add a CI check that **fails the build** if an
  `ANTHROPIC`/secret-looking string appears in client code.
- **The Anthropic key lives only in the `api` service's environment** (Supabase secrets /
  hosting env vars / a secret manager). All model calls originate there, behind the two gates,
  on locked spec sheets.
- **Connector credentials and the ledger signing key** live in the secret manager too,
  referenced by id from the database — never stored as values in tables or the repo.
- **`.env.example` lists names only**, never values; real `.env` is git-ignored. Production
  uses the host's secret store, not files.
- **Verified in Phase 1.5** (bundle scan + config review) and again in the **Phase 6 security
  review** (full secret-handling audit).

---

## 6. The phase-by-phase build plan and what "done" looks like

Each phase ends the same way: **I stop, explain in plain English what I built and decided,
give you a live URL to click (from Phase 1.5 on), and wait for your approval.** No phase
starts before you approve the one before it.

| Phase | What gets built | "Done" means (acceptance) |
|---|---|---|
| **0 — Plan** *(this doc)* | Repo structure, data model + RLS, auth/MFA, connector + secrets strategy, the phase plan, and the Option A/B/C decision. **No code.** | You've read it, picked a foundation option, and approved. |
| **1 — Foundation** | Supabase project; the §2 schema with **`tenant_id` + RLS on every table**; email/password **+ MFA**; the role/membership model. | **The isolation proof:** two test tenants with overlapping data; an automated test sets `app.current_tenant` to A and shows **zero** of B's rows for *every* table — at the database, not the UI. **We do not proceed until this passes.** I show you the test and its output. |
| **1.5 — Live preview** | Deploy `web` (Vercel) + Supabase backend so there's always a URL. Minimal is fine (login + MFA + a placeholder authed page). | You can open the URL and log in. Bundle scan confirms **no secrets / no Anthropic key client-side.** From here on every phase ends with something you can see. |
| **2 — Exec shell + CISO seat** | Front door → seat switcher (RBAC server-side) → the **CISO seat in full** (five questions, exec summary, **drill-to-evidence drawer**, decision-ledger UI, ticketing shell, trajectory, framework posture, My Liability) on the mock's tokens. Then generalize to the other six seats. Wired to **clearly-flagged seeded-but-real-shaped** data. | You can click into every CISO figure and see its (seeded) evidence breakdown, sources, freshness, confidence; record a decision and see it stamped. Each seat shown on the live URL. |
| **3 — Onboarding / intake** | The full intake: org profile **(+ primary currency as ISO)**, connector setup, processes & apps → auto-map + crown jewels, documents, per-seat data needs, **incident command plan + 24/7 call tree**, benchmark consent, review & go-live. Persists to `tenants`/`connectors`/`assumptions`/`incident_plan`. | You can run onboarding end-to-end; the chosen currency is then **honored everywhere**; the call tree is captured and stored securely. |
| **4 — Frameworks + CMMI engine** | Load the **complete** authoritative catalogs (OSCAL CSF/800-53, CIS v8, ISO 27001, SOC 2) with verbatim IDs/titles. Build the **deterministic scorer** (evidence → controls → CMMI 0–5, confidence from coverage+freshness). LLM may **propose** a maturity *with a citation*; engine computes; analyst reviews. **Real connectors begin feeding evidence.** Signed auditor + evidence-manifest exports. | Posture drills function→category→control→evidence; numbers trace to pulled evidence or owned assumptions; exports are real, signed files. |
| **5 — Executive Twin (anti-hallucination)** | **Surface A** (computed five-question verdicts + figures; LLM only slot-fills a locked template with engine values). Then **Surface B** (free-text Ask) with **both gates** — scope router + retrieval gate — grounded generation, **schema-validated** output, human-in-the-loop for consequential answers, chips generated from the org profile. The **leaf rule** (every $ = ● pulled or ◐ assumption) enforced in data. Voice briefings (server-side neural TTS) last. | Ask a thin/off-topic question → honest refusal, never a guess. Every dollar drills to pulled/assumption leaves. No claim ships without a citation. |
| **6 — Orchestration, War Room, security review** | Real Jira/ServiceNow ticket sync from decisions (status/age/due back; blink near/overdue; closure loops back). War Room wired to live detections (feeds, kill-chain, blast radius, ticker; blink+alarm on a qualifying detection, with a sound preference). Incident Commander console (runbook, playbooks, click-to-call from the onboarding call tree). Then the **security review**. | **Launch gate:** the security review passes — RLS audit, secret handling, signed append-only ledger + audit log verified, PHI handling, dependency/pen-test pass. I show you the results. We do **not** call it launch-ready until this passes. |

---

## 7. The non-negotiables, and exactly where each is enforced

| Non-negotiable | Where it's made true |
|---|---|
| **Tenant isolation via RLS, proven with two test orgs before real data** | §2.1 RLS on every table; **Phase 1 isolation proof is a hard gate** before any real/PHI-like data. |
| **Anthropic API server-side only** | §5; only `apps/api/src/ai` calls Anthropic; CI build fails on client-side keys; re-audited Phase 6. |
| **Every user-facing number traces to pulled evidence or an owned assumption** | The `evidence` spine (§2.2), the leaf rule (Phase 5), engine-computes-not-LLM (§1, Phase 4), citations-or-it-doesn't-ship. |
| **One security review before launch** | Phase 6d, an explicit launch gate; checklist drafted now in `docs/`. |

---

## 8. Open questions for you (don't block reading this — we can decide as we go)

1. **Foundation option A / B / C?** I recommend **C (Hybrid)**. *(This is the one I need
   before Phase 1.)*
2. **Hosting:** the brief says Vercel + Supabase; the repo has Render configs. I'll go with
   **Vercel + Supabase** per the brief unless you say otherwise.
3. **Beachhead data sensitivity:** confirm we treat all customer data as PHI-like from day one
   (encryption at rest/in transit, minimize egress). I'm assuming **yes**.
4. **Legal-reviewed copy:** My Liability / CFO / CLO / CRO language must be reviewed by real
   counsel before it's customer-facing (brief §10). Who is that reviewer, and when?

---

## 9. What I am explicitly NOT doing in Phase 0

No Supabase project created, no tables, no policies, no screens, no connectors wired, no
Anthropic calls — **only this plan.** All of that starts in Phase 1, and only after you
approve this and pick a foundation option.
