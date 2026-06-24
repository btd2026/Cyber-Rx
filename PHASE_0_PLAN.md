# CyberRx — Phase 0 Plan (no application code)

**Status:** Draft for founder approval. Nothing here writes product code. This is the
blueprint we approve before Phase 1.

**Approved direction (your call):** **Adopt & harden the existing build** — keep the
connectors, auth, and server-side Anthropic work already in this repo, and prioritize fixing
the gaps (real database row-level security, evidence-tracing, the launch security gate).
*Not* a clean rebuild, *not* a re-platform to Supabase.

**Source of truth:** `cyberrx-build-brief.md` (the brief) + `cyberrx-platform.html` (the
approved mock), both now saved in the repo root. Where this plan and the brief disagree, the
brief wins — **except** where you've explicitly chosen otherwise (the stack; see §0.3).

**The one rule that governs everything:** every number a user sees is either *pulled from a
connected system* or an *explicitly owned assumption* — never invented. The whole
architecture below exists to make that rule true and provable.

---

## 0. Where we actually stand (read this first)

### 0.1 What already exists and is worth keeping
This repo is **not** empty. Previous work built a real CyberRx:

- **Backend** (`cyberrx-api/`, Node/Express): **16 read-only connectors** (SecurityScorecard,
  BitSight, Black Kite, RiskRecon, ServiceNow, RecordedFuture, HHS/OCR, …), the **Anthropic
  SDK already used server-side only** across ~10 AI services, ~25 SQL migrations, JWT + SAML
  login, and a deterministic-engine family of services (scoring, FAIR-style, framework maps).
- **Frontend** (`frontend/`, React 19 + Vite + React Router + React Query): many built
  screens, a shared component kit, and design tokens.
- Deployment configs for **Vercel (frontend) + Render (backend + Postgres)**.

We keep all of this and build on it.

### 0.2 The gaps we must harden (what "adopt & harden" actually means)
Verified by reading the code, not assuming. These are the Phase-1 priorities:

| # | Gap found in the existing code | Why it matters | Fixed in |
|---|---|---|---|
| **G1** | **No database row-level security at all** — zero `CREATE POLICY` / `ENABLE ROW LEVEL SECURITY`. Isolation lives only in app code. | Your #1 non-negotiable. A single app bug could leak one customer's data to another. The database must hold the line independently. | Phase 1 |
| **G2** | The app-level isolation check is **defaulted OFF** (`STRICT_TENANT_ISOLATION` = "observe + log only") and trusts an `X-Org-Id` **header the browser sends**. | Today, cross-tenant isolation is effectively *not enforced*. | Phase 1 |
| **G3** | **No real MFA** (no TOTP library installed); login is JWT + SAML only. | Brief requires email/password **+ MFA** before any seat. | Phase 1 |
| **G4** | Numbers in the existing screens are **seeded/demo**, not yet traced to signed evidence with citations. | The whole product is "every number traces to evidence or an owned assumption." | Phases 4–5 |
| **G5** | Frontend is **plain JavaScript**, not TypeScript; isolation/secret checks aren't in CI. | Type-safety + automated guardrails reduce exactly the bugs that cause leaks. | Incremental (see §0.4) |
| **G6** | Decision ledger / audit log are **not yet append-only + signed at the database**. | "Immutable" must be true in the database, not a UI label. | Phases 2 & 6 |

### 0.3 One deviation from the brief you're knowingly accepting
The brief names **Supabase** (Postgres + Auth + RLS + Storage). You've chosen to **stay on the
existing stack** (Render Postgres + the existing JWT/SAML auth) and harden it. That's a sound
call: **row-level security is a core Postgres feature** and works identically on Render's
Postgres, so we get the brief's exact isolation guarantee *without* a risky migration, and we
keep the 16 connectors and AI services. The only things we forgo vs. Supabase are its
batteries-included Auth/MFA/Storage — which we instead **add to the existing auth** (TOTP MFA)
and object storage. I'm flagging this so it's a decision you made on purpose, not a drift.

### 0.4 Naming + TypeScript: pragmatic adopt-and-harden choices
- The brief says `tenant_id`; the existing schema uses **`organization_id`** everywhere. We
  **keep `organization_id`** (it *is* the tenant key) rather than churn 25 migrations and all
  the code. Wherever the brief says `tenant_id`, read `organization_id`.
- We **keep the frontend in JavaScript** for now and add TypeScript **incrementally** to new
  modules, rather than a stop-the-world rewrite. (Open question Q4 if you'd rather invest in a
  full TS migration first.)

---

## 1. Repo structure (the existing layout + what we add)

We harden in place. New hardening lives beside the existing code; nothing is relocated
wholesale in Phase 0–1.

```
Cyber-Rx/
├─ cyberrx-api/                 # EXISTING Node/Express backend — adopted
│  ├─ src/
│  │  ├─ connectors/            # 16 read-only connectors — KEEP, harden to least-privilege + secret refs
│  │  ├─ services/              # deterministic engine + AI services — KEEP; AI stays server-side only
│  │  ├─ routes/ controllers/   # KEEP; every handler made tenant-scoped (G2)
│  │  ├─ middleware/
│  │  │  ├─ auth.js             # HARDEN: derive org from verified session, not a browser header
│  │  │  ├─ org_isolation.js    # REPLACE header-trust with server-derived org + flip enforcement ON
│  │  │  └─ tenantScope.js      # NEW: opens a tenant-scoped DB txn; runs SET LOCAL app.current_tenant
│  │  ├─ db/                     # NEW: query layer that always runs inside the tenant-scoped txn
│  │  └─ auth/mfa/               # NEW: TOTP enrollment + challenge (G3)
│  ├─ migrations/                # EXISTING + NEW: add RLS policies to every tenant table (G1)
│  ├─ seeds/                     # EXISTING + NEW: the two test orgs for the isolation proof
│  └─ tests/integration/         # NEW: the two-tenant isolation test (the Phase 1 gate)
│
├─ frontend/                    # EXISTING React 19 + Vite app — adopted
│  ├─ src/
│  │  ├─ situation-room/ pages/ seats/   # KEEP/extend toward the mock's seven seats
│  │  ├─ ui/ components/ styles/         # KEEP shared kit + port cyberrx-design-tokens.css from the mock
│  │  └─ lib/                            # api client (React Query) — never holds a secret, never calls Anthropic
│  └─ vite.config.js
│
├─ docs/
│  ├─ security-review-checklist.md      # NEW: the Phase 6 launch gate, drafted now
│  └─ adr/                              # NEW: short "architecture decision records" (e.g. this stack choice)
│
├─ cyberrx-build-brief.md  cyberrx-build-prompts.md  cyberrx-platform.html   # source of truth, now in repo
├─ .env.example                         # names only, never values (already present)
└─ PHASE_0_PLAN.md                      # this file
```

**The structural guarantee we preserve:** the frontend only ever talks to our own API; the
API is the only thing holding the Anthropic key / connector creds / signing key; the
deterministic engine (which computes numbers) stays separate from the AI services (which only
phrase them). The LLM never decides a number.

---

## 2. The full data model — every table, its tenant key, and an RLS policy

### 2.1 How RLS works here (the isolation mechanism, in plain English)
This is the locked vault door we're adding (G1), on the existing Render Postgres:

1. **Every tenant-owned table has `organization_id`** and is switched into Row-Level Security
   with `ENABLE ROW LEVEL SECURITY` **and** `FORCE ROW LEVEL SECURITY` (so even the table
   owner obeys the rules — no accidental bypass).
2. Per request, the database is told **which org is asking** via a per-transaction setting:
   `SET LOCAL app.current_tenant = '<org id derived from the verified session>'`. That id
   comes **only** from the server-verified login — **never from the `X-Org-Id` header the
   browser sends** (that's the G2 fix).
3. Each table gets:
   ```sql
   CREATE POLICY tenant_isolation ON <table>
     USING      (organization_id = current_setting('app.current_tenant', true)::uuid)
     WITH CHECK (organization_id = current_setting('app.current_tenant', true)::uuid);
   ```
   `USING` blocks reading another org's rows; `WITH CHECK` blocks writing a row stamped with
   someone else's org.
4. The app connects as a **non-superuser role without `BYPASSRLS`.** Any admin-only job
   (creating an org) uses a separate, narrow path — never on tenant data routes.
5. **Append-only tables** (`decisions`, `audit_log`) get **no `UPDATE`/`DELETE` policy** plus
   row signing (§2.4), so "immutable" is enforced by the database (G6).

**Result:** even if a handler forgets its `WHERE organization_id = …`, the database returns
zero of the other org's rows. Phase 1 proves this with two orgs before any real data.

### 2.2 The tables
Each table below carries `organization_id` (the tenant key) and the `tenant_isolation` policy
from §2.1, except the two **global catalogs** (noted). We map the brief's entities onto the
existing schema, adding what's missing.

**Identity & tenancy**

| Table (brief name → ours) | Purpose & key columns | RLS / special rules |
|---|---|---|
| `tenants` → **`orgs`** *(exists)* | Org profile: name, industry, ownership, regions[], regulated_data_types[], **primary_currency (ISO 4217)**, materiality_threshold. | Readable only by members (via `memberships`); created on the admin path only. |
| `users` *(exists)* | Login identity; display name, email, **mfa_enrolled** *(new)*. | A user reads only self + co-members of their org. |
| `memberships` *(add/confirm)* | `(user_id, organization_id, role)`, role ∈ CEO/CISO/CFO/CIO/CLO/CRO/Board/Admin. | The **source** of `app.current_tenant` + role checks. |

**The evidence spine**

| Table | Purpose & key columns | RLS / special rules |
|---|---|---|
| `connectors` *(exists)* | Per-org integration config + status + last_sync_at + health + scope. Creds are **references** to the secret store, not values. | Org-isolated; Admin/owning-seat edit only. |
| `evidence` *(add canonical spine)* | source_system, signal_type, collected_at, freshness, content_hash, signature, raw_ref, normalized_value (jsonb). **Every UI figure cites rows here.** | Org-isolated; effectively append-only (corrections add rows). |
| `documents` *(exists/extend)* | Uploaded files (IR plans, contracts, policies) in object storage; metadata + hash here. | Org-isolated; storage path also scoped by org prefix. |

**Frameworks & scoring**

| Table | Purpose & key columns | RLS / special rules |
|---|---|---|
| `frameworks` *(global catalog)* | CSF 2.0, 800-53, CIS v8, ISO 27001, SOC 2. **No `organization_id`.** | Read-only to all authed users; written only by the catalog loader. |
| `controls` *(global catalog; `control_library` exists)* | Per-framework controls, **verbatim IDs + titles** from OSCAL/CIS/ISO. **No `organization_id`.** | Same as `frameworks`. |
| `control_status` *(exists/extend)* | Per-org per-control: CMMI 0–5, status, confidence, linked evidence ids[], analyst_review_state. | Org-isolated. Maturity is **engine-computed**; an LLM proposal is stored separately *with its citation* and never overwrites the computed value without analyst sign-off. |

**Decisions, money & follow-through**

| Table | Purpose & key columns | RLS / special rules |
|---|---|---|
| `decisions` *(the ledger — the wedge)* | title, type, owner, decided_at, rationale, **evidence_snapshot (jsonb, frozen at decision time)**, options_considered, chosen_option, residual_risk_amount + currency, status, re_review_trigger, **row signature**. | Org-isolated **and append-only**: `INSERT`+`SELECT` policies only, **no `UPDATE`/`DELETE`**; hash-chain signed (§2.4). |
| `assumptions` *(exists as evidence ledger / extend)* | Owned ◐ values: loaded labor rate, downtime $/hr, breach $/record, discount rate… value, currency, owner, basis/benchmark, version. | Org-isolated; owning-seat edits **write a new version row + an `audit_log` entry** and trigger recompute + re-review. |
| `tickets` *(ServiceNow connector exists)* | external_system, external_id, status, due_date, linked decision_id. | Org-isolated; blinks near/overdue in the UI. |

**Incident readiness, benchmarking, audit**

| Table | Purpose & key columns | RLS / special rules |
|---|---|---|
| `incident_plan` *(add)* | IR plan ref + metadata; **last_verified_at** (stale call trees are dangerous). | Org-isolated; CISO/Admin edit. |
| `incident_contacts` *(add)* | 24/7 call tree: role, name, phone, internal/external, order. Powers Incident Commander click-to-call. | Org-isolated; **encrypted at rest**; periodic re-verify reminder. |
| `benchmark_contributions` *(`cross_tenant_benchmarking` exists)* | **Opt-in, anonymized, high-level CMMI maturity only** — never findings/identifiers. Consent state + version. | Row org-isolated; the cross-org **aggregate** is computed server-side with **k-anonymity ≥ 8 peers, else fall back to overall maturity**, exposed via a function, never raw rows. |
| `audit_log` *(`security_audit_logs` exists/extend)* | Every view, computation, model call, export, decision: actor, action, target, evidence_used, model_io_ref, at. | Org-isolated; **`INSERT`+`SELECT` only, no `UPDATE`/`DELETE`**; hash-chain signed (§2.4). |

### 2.3 RBAC (who can edit what)
Membership role drives permissions, enforced **server-side** (and mirrored in RLS at the data
level): you may **edit your own seat's** objects and **view** the others; Admin manages
connectors, members, onboarding. The UI hiding a button is cosmetic — the server is the gate.

### 2.4 "Immutable" and "signed" made real
`decisions` and `audit_log` are append-only at the database (no update/delete policy). Each
row is signed over its content + the previous row's signature (a hash chain), so tampering is
detectable and ordering is verifiable. The signing key lives in the secret store, server-side.
Verified in the Phase 6 security review.

---

## 3. Auth + MFA approach (harden the existing auth; don't replace it)

- **Keep** the existing **JWT + passport/SAML** login; **add TOTP MFA** (G3): every user
  enrolls an authenticator app and must pass an MFA challenge before reaching any seat. SAML
  SSO stays available for enterprise buyers.
- **Front door matches the mock:** email/password → MFA challenge → role-aware seat switcher.
  No MFA enrolled → routed to enrollment first.
- **Server decides the tenant, not the browser (G2):** on every request the API verifies the
  session, looks up the caller's `memberships`, derives the **one** `organization_id` + role
  for this session, and sets `app.current_tenant` for the query transaction. **We stop trusting
  the `X-Org-Id` header**, and **flip `STRICT_TENANT_ISOLATION` to enforced**, backed by RLS.
- **RBAC server-side:** every mutating endpoint checks the caller's role for the target seat
  first; failure is a 403 regardless of what the UI showed.
- **Sessions:** httpOnly cookies (not readable by browser JS), short-lived access + refresh.

**Phase 1 acceptance for auth:** sign up → forced MFA → land scoped to exactly one org + role.

---

## 4. Connector strategy (read-only — adopt the 16, harden them)

- **Read-only, least-privilege, official APIs only.** OAuth where supported; scoped tokens
  otherwise. **Never** request write scopes. Categories per the brief: EDR, SIEM, firewall,
  IdP, CSPM, vuln, email, backup/DR, MDM, ITSM/GRC, plus the financial sources that feed money
  leaves (cloud bills, HRIS, contracts).
- **Adopt the existing 16 connectors**; harden each behind the one `BaseConnector` interface
  so its only job is: authenticate read-only → fetch → hand raw data to ingest.
- **One ingestion path:** normalize every connector's output into the single `evidence` schema
  with `collected_at`, `freshness`, `content_hash`, then **sign and store**. Downstream never
  knows which vendor it came from.
- **Confidence is mechanical:** coverage (how much of the in-scope estate reported) × freshness
  — not the LLM.
- **No-data is a designed state:** a connector returning nothing → explicit "no evidence" in
  the UI, never a guess.
- **Creds never sit in the database:** `connectors` stores a *reference* to a secret in the
  secret store; the token lives only there.
- **Phasing:** Phases 1–3 use clearly-flagged *seeded-but-real-shaped* evidence (already in the
  repo's seeds) so the UI is buildable/demoable; **real connector sync feeds the engine in
  Phase 4**; the ITSM write-back loop lands in Phase 6.

---

## 5. How secrets stay server-side (Anthropic key never in the client)

- **Already true and we keep it:** the Anthropic SDK is used **only** in `cyberrx-api` services
  — the browser never calls Anthropic and never holds the key.
- **Add a CI guardrail (G5):** a build check that **fails** if an `ANTHROPIC`/secret-looking
  string appears in any client bundle, so it can't regress.
- **Keys live only in the API's environment** (host env vars / secret manager): Anthropic key,
  connector credentials, and the ledger signing key — referenced from the DB by id, never
  stored as values in tables or the repo.
- **`.env.example` lists names only** (already present); real `.env` is git-ignored; production
  uses the host secret store, not files.
- **Verified** in Phase 1.5 (bundle scan + config review) and again in the **Phase 6 security
  review**.

---

## 6. The phase-by-phase build plan and what "done" looks like

Each phase ends the same way: **I stop, explain in plain English what I built and decided, give
you a live URL to click (from Phase 1.5 on), and wait for your approval.** No phase starts
before you approve the one before it.

| Phase | What gets built (adopt & harden) | "Done" means (acceptance) |
|---|---|---|
| **0 — Plan** *(this doc)* | The blueprint above + the adopt-and-harden decision. **No code.** | You've read it and approved (and answered §8 where you can). |
| **1 — Harden the foundation** | Add **RLS to every tenant table** (G1); replace header-trust with server-derived org + **enforce isolation** (G2); add **TOTP MFA** (G3); confirm the role/membership model. | **The isolation proof:** two test orgs with overlapping data; an automated test sets `app.current_tenant` to A and shows **zero** of B's rows for **every** table — at the database, not the UI. **We do not proceed until this passes.** I show you the test + output. |
| **1.5 — Live preview** | Confirm the existing Vercel + Render deploy serves a URL: login → MFA → a placeholder authed page. | You can open the URL and log in with MFA. Bundle scan confirms **no secrets / Anthropic key client-side.** Every phase from here ends with something you can see. |
| **2 — Exec shell + CISO seat** | Front door → seat switcher (RBAC **server-side**) → the **CISO seat in full** (five questions, exec summary, **drill-to-evidence drawer**, decision-ledger UI, ticketing shell, trajectory, framework posture, My Liability) on the mock's tokens; then the other six seats. Wired to **clearly-flagged seeded-but-real-shaped** data; ledger writes start going append-only. | Click any CISO figure → see its (seeded) evidence breakdown, sources, freshness, confidence; record a decision → stamped (who/when/evidence). Each seat shown on the live URL. |
| **3 — Onboarding / intake** | Org profile **(+ primary currency as ISO)**, connector setup, processes & apps → auto-map + crown jewels, documents, per-seat needs, **incident command plan + 24/7 call tree**, benchmark consent, review & go-live. Persists to `orgs`/`connectors`/`assumptions`/`incident_plan`. | Run onboarding end-to-end; chosen currency is then **honored everywhere**; call tree captured + stored securely. |
| **4 — Frameworks + CMMI engine** | Load **complete** authoritative catalogs (OSCAL CSF/800-53, CIS v8, ISO 27001, SOC 2) verbatim. Build the **deterministic scorer** (evidence → controls → CMMI 0–5, confidence from coverage+freshness). LLM may **propose** a maturity *with a citation*; engine computes; analyst reviews. **Real connectors begin feeding evidence (G4).** Signed auditor + evidence-manifest exports. | Posture drills function→category→control→evidence; every number traces to pulled evidence or an owned assumption; exports are real, signed files. |
| **5 — Executive Twin (anti-hallucination)** | **Surface A** (computed verdicts/figures; LLM only slot-fills a locked template with engine values + citations). Then **Surface B** (free-text Ask) with **both gates** — scope router + retrieval gate — grounded generation, **schema-validated** output, human-in-the-loop for consequential answers, chips generated from the org profile. The **leaf rule** (every $ = ● pulled or ◐ assumption) enforced in data. Voice briefings (server-side neural TTS) last. | A thin/off-topic question → honest refusal, never a guess. Every dollar drills to pulled/assumption leaves. No claim ships without a citation. |
| **6 — Orchestration, War Room, security review** | Real Jira/ServiceNow ticket sync from decisions (status/age/due back; blink near/overdue; closure loops back). War Room wired to live detections (feeds, kill-chain, blast radius, ticker; blink + alarm on a qualifying detection, with a sound preference). Incident Commander console (runbook, playbooks, **click-to-call** from the onboarding call tree). Then the **security review**. | **Launch gate:** the review passes — RLS audit, secret handling, **signed append-only ledger + audit log verified** (G6), PHI handling, dependency/pen-test pass. I show you the results. Not launch-ready until it passes. |

---

## 7. The non-negotiables, and exactly where each is enforced

| Non-negotiable | Where it's made true |
|---|---|
| **Tenant isolation via RLS, proven with two test orgs before real data** | §2.1 RLS on every table + G1/G2 fixes; **Phase 1 isolation proof is a hard gate** before any real/PHI-like data. |
| **Anthropic API server-side only** | §5 (already true); CI build fails on client-side keys; re-audited Phase 6. |
| **Every user-facing number traces to pulled evidence or an owned assumption** | The `evidence` spine (§2.2), the leaf rule (Phase 5), engine-computes-not-LLM (§1, Phase 4), citations-or-it-doesn't-ship. |
| **One security review before launch** | Phase 6 launch gate; checklist drafted now in `docs/security-review-checklist.md`. |

---

## 8. Open questions for you (don't block reading this — we can decide as we go)

1. **Hosting:** stay on **Vercel + Render** (consistent with adopt-and-harden)? I'll assume
   **yes** unless you'd rather move to Supabase/another host.
2. **Data sensitivity:** treat all customer data as **PHI-like from day one** (encryption at
   rest/in transit, minimize egress)? I'm assuming **yes**.
3. **Legal-reviewed copy:** My Liability / CFO / CLO / CRO language must be reviewed by real
   counsel before it's customer-facing (brief §10). **Who** is that reviewer, and **when**?
4. **TypeScript:** keep the frontend in JS and add TS incrementally (my default), or invest in
   a fuller TS migration during Phase 2?

---

## 9. What I am explicitly NOT doing in Phase 0

No RLS policies written, no MFA added, no schema changes, no screens, no connector hardening,
no Anthropic changes — **only this plan.** All of that starts in Phase 1, and only after you
approve.
