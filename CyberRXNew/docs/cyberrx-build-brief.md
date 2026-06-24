# CyberRx — Master Build Brief for Claude Code

**Purpose:** Build a production platform from the approved mock. This brief is the single source of truth. The mock (`cyberrx-platform.html`) shows the *intended experience*; this document explains *what must be true underneath it*.

**The one rule that governs everything:** every number a user sees must be either **pulled from a connected system** or an **explicitly owned assumption** — never invented. If a value can't be traced to evidence, it does not ship. This is the whole product.

---

## 0. How to use this brief (working method — read first)

Do **not** try to build the whole thing in one pass. Work in the phases in §6. After each phase:

1. **Stop.** Summarize in plain English what you built and what you decided.
2. **Show a live URL** (deployed) so the founder can *see* it, not just read about it. The founder is non-technical — approval happens on what's on screen.
3. **Wait for approval** before the next phase.

Hard rules that are never deferred:
- **Tenant isolation (RLS) is verified with two real test orgs before any real or PHI-like data is loaded.**
- **Secrets live in environment variables / a secret manager — never in the repo, never in the client.**
- **The Anthropic API is called only server-side.** No API keys in the browser, ever.
- **One security review before launch.** Non-negotiable.

Start by having Claude Code do **Phase 0 only** (a plan), and approve that before it writes code.

---

## 1. What we're building

**CyberRx is an executive operating system for defensible cybersecurity decisions.** It is sold to Fortune-100-class organizations (beachhead: large healthcare payers) at enterprise pricing.

It is **not** a GRC tool, not Vanta, not a security dashboard. Those tell you compliance status bottom-up. CyberRx works top-down from the decisions each executive must defend: it tells a CEO/CISO/CFO/CIO/CLO/CRO/Board what's true right now, what it means in dollars, what to decide, and — critically — produces the **defensible record** that they acted reasonably.

**Three moats (build the product around these, not around feature parity):**
1. **The decision ledger** — decisions are first-class objects with rationale, the evidence known at the time, an owner, a timestamp, a residual-risk value, and a re-review trigger. This is institutional memory and legal defensibility. It is the wedge.
2. **Close-the-loop orchestration** — a decision assigns owners, pushes tickets to Jira/ServiceNow, and verifies closure. Not just insight — follow-through.
3. **Money as the native unit** — FAIR-style loss modeling; every decision and exposure carries a dollar figure traceable to pulled data or owned assumptions.

**Tone/identity:** a calm "situation room." Warm light default + dark mode. Headings in a display face, all evidence/IDs/timestamps in monospace. Blue = brand; green = verified/pass only; amber = exposure; red = critical; gold = crown jewels.

---

## 2. Information accuracy — the anti-hallucination architecture (the heart of the system)

This is the most important section. The founder's recurring, correct concern is that an executive tool that hallucinates is worthless and dangerous. The defense is architectural, not prompt-tuning.

**Shared principles across the whole platform:**
- **A deterministic engine owns the truth.** Verdicts, scores, maturity, and dollar figures are *computed*, not generated. The LLM never decides whether a control passes or what something costs.
- **The LLM is a translator on a locked spec sheet.** It only phrases pre-computed values and only sees this tenant's data. It cannot introduce facts.
- **No-data is a first-class state.** "We don't have evidence for this" is a valid, designed answer — never filled with a guess.
- **Claim-must-be-backed.** Every surfaced claim references the evidence that supports it. **Citations or it doesn't ship.**
- **Confidence is mechanical** — derived from evidence coverage and freshness, not vibes.
- **Everything is logged** — inputs, evidence used, model output, who saw it.

**Surface A — the computed "five questions" and all dashboard figures (lower risk):**
- The questions are fixed. The **verdict is pure engine output.** The prose summary is the LLM slot-filling a template with engine-provided values. The model has no latitude to change the number.

**Surface B — the free-text "Ask your executive twin" (highest risk):**
- **Gate 1 — scope router:** is the question about cyber *and* about this org? If not → a fixed, honest refusal. (This is why the suggested chips are generated from the org profile — they're a safe on-ramp that's guaranteed answerable.)
- **Gate 2 — retrieval gate:** pull the org's evidence. If retrieval is thin → "I don't have evidence in your data for that," not a generated answer.
- **Grounded generation only**, over retrieved evidence, with scenario dollar figures coming from the engine.
- **Schema-validated output**; **human-in-the-loop** for anything consequential.

**The leaf rule (cost & loss models):** every dollar figure decomposes until it hits a leaf. Each leaf is tagged **● pulled** (from a connected system — cloud bill, HRIS loaded rate, contract) or **◐ assumption** (seeded from a benchmark, labeled, owned by an exec, editable, and every edit is logged). A model whose leaves are invented is worthless; enforce this in the data model, not just the UI.

---

## 3. Architecture overview

```
Connectors ─▶ Ingestion/normalization ─▶ Evidence store (signed, time-stamped)
                                              │
                                              ▼
                              Deterministic engine (scores, verdicts, FAIR $, CMMI)
                                              │
                    ┌─────────────────────────┼───────────────────────────┐
                    ▼                          ▼                           ▼
            Surface A (computed)      Surface B (grounded Ask)      Exports/ledger
            LLM = slot-filler         LLM = grounded translator     (signed, append-only)
                    │                          │                           │
                    └──────────────▶  React executive UI  ◀────────────────┘
```

- **Frontend:** the executive UI (seven seats, drill-to-evidence, war room, onboarding).
- **Backend/API:** server-side only; owns the engine, retrieval, all Anthropic calls, RLS-scoped data access.
- **Data layer:** Postgres (Supabase) with row-level security for multi-tenant isolation; object storage for uploaded documents and exports.
- **AI layer:** Anthropic API, server-side, behind the two gates, on locked spec sheets.
- **Connector layer:** read-only integrations to the customer's security/IT/financial systems.

---

## 4. Tech stack & infrastructure

- **Frontend:** React + Vite + React Router + TypeScript. Styling per the mock's design tokens (port `cyberrx-design-tokens.css`). State: keep it simple (React Query for server state; no heavy global store early).
- **Backend & data:** **Supabase** — Postgres, Auth, **Row-Level Security** for multi-tenant isolation, Storage for documents/exports. Server-side logic in Supabase Edge Functions or a thin Node service — whichever keeps the Anthropic key server-side.
- **AI:** Anthropic API (`claude-*` server-side). All prompts are spec sheets; structured/JSON outputs; schema-validated.
- **Hosting:** Vercel (frontend) + Supabase (data/auth). Stand up a **live preview URL early** (Phase 1.5).
- **Secrets:** environment variables / Supabase secrets. Never client-side.

---

## 5. Core data model (entities to design first)

Design these tables with `tenant_id` on every row and RLS policies from day one:

- **tenants** — org profile: name, industry, ownership, regions, regulated data types, **primary currency (ISO code)**, materiality threshold.
- **users / memberships / roles** — a user belongs to a tenant with a role (CEO/CISO/CFO/CIO/CLO/CRO/Board/Admin). Role drives RBAC (edit only your own seat; view others).
- **connectors** — per-tenant integration config + status + last-sync + health.
- **evidence** — normalized signals & documents: source system, collected_at, freshness, a content hash/signature, and the raw/normalized value. **This is the spine.**
- **frameworks / controls / control_status** — the catalogs (CSF 2.0, 800-53, CIS v8, ISO 27001, SOC 2) loaded from authoritative sources; per-control CMMI maturity (0–5) + status + linked evidence + analyst review state.
- **decisions (the ledger)** — title, type, owner, timestamp, rationale, evidence-snapshot-at-time, options considered, chosen option, residual $ , status, re-review trigger. **Append-only, signed.**
- **tickets** — external system (Jira/ServiceNow/etc.), external id, status, due date, linked decision.
- **assumptions** — tenant-level owned values (loaded labor rate, downtime $/hr, record-breach cost, discount rate, etc.): value, owner, basis/benchmark, version history. Cost/FAIR models reference these.
- **incident_plan / contacts** — IR plan document + 24/7 call tree (role, name, phone, internal/external). Powers Incident Commander mode.
- **benchmark_contributions** — opt-in, anonymized, high-level CMMI maturity only; k-anonymity enforced server-side.
- **audit_log** — append-only record of every view, computation, model call, export, and decision.

---

## 6. The build, phase by phase (hard stops + live preview each time)

**Phase 0 — Plan (no code).** Repo structure, data model, RLS strategy, connector approach, environment/secrets plan, and the phase plan itself. **Stop. Approve.**

**Phase 1 — Foundation.** Supabase project; auth (email/password + MFA); the core schema with **RLS**; the role model. **Acceptance test: create two test tenants with overlapping data and prove org A cannot read org B's rows — at the database level.** Do not proceed until this passes. **Stop.**

**Phase 1.5 — Live preview URL.** Deploy frontend (Vercel) + backend (Supabase) so there is always a URL the founder can open. From here on, every phase ends with something visible. **Stop.**

**Phase 2 — Executive UI shell + seats (CISO first).** Login/MFA front door → role-aware seat switcher → the CISO seat fully (five questions, exec summary, drill-to-evidence drawer, decision ledger, ticketing UI, trajectory, framework posture, My Liability). Then generalize to the other six seats. Wire to the engine with **seeded-but-real-shaped** data (clearly flagged) until connectors land. **Stop.**

**Phase 3 — Onboarding/intake.** The full flow: org profile (+ primary currency), connector setup, business processes & apps, auto-map & crown jewels, documents, per-seat data needs (insurance via dropdown+other, money-in-millions with currency, dates via picker), **incident command plan + call tree**, benchmark consent, review & go-live. Persist to `tenants`/`connectors`/`assumptions`/`incident_plan`. **Stop.**

**Phase 4 — Framework mapping + CMMI engine.** Load the **complete** authoritative catalogs (NIST OSCAL for CSF/800-53, CIS, ISO, SOC 2). Build the deterministic scorer: map evidence → controls → **CMMI 0–5 maturity**, with confidence from coverage+freshness. LLM may *propose* a per-control maturity *with a citation*; the engine does the math; an analyst reviews. Auditor report + evidence-manifest exports (real, signed). **Stop.**

**Phase 5 — Executive Twin (anti-hallucination, §2).** Surface A slot-filling first (lower risk), then Surface B with both gates, grounded generation, schema validation, and the chips generated from the org profile. Voice briefings (server-side neural TTS, one voice per seat) last. **Stop.**

**Phase 6 — Orchestration, war room, security hardening.** Real ticket-system sync (Jira/ServiceNow). War Room + Incident Commander mode wired to live detections and the onboarding-captured call tree/playbooks. Then the **security review**: RLS audit, secret handling, signed-ledger verification, PHI handling, pen-test-style pass. **Stop. Launch gate.**

---

## 7. Feature spec — what each piece must do (folding the mock)

- **Front door:** email/password → MFA → role selection. RBAC enforced **server-side** (the client hiding a button is not security).
- **Seven seats:** each answers that executive's core questions, leads with an evidence answer-grid, and carries a costed multi-option decision. CISO is the reference depth.
- **Drill-to-evidence ("every claim is a door"):** every figure/row/control opens a panel showing what it measures, the **source systems**, the **signals**, the **breakdown that justifies it**, **freshness**, and **confidence**. This must be powered by real evidence, not generated.
- **Decision ledger:** record a decision and it's stamped (who, when, on what evidence) and written **append-only and signed**. "Choose & record" on any costed decision creates a ledger entry with a timestamp. Re-review triggers fire when assumptions change.
- **Ticketing/orchestration:** open a ticket from a decision into the real external system; reflect status/age/due back; blink when near/overdue.
- **Framework posture:** complete catalogs, **CMMI 0–5** scoring with a legend (0 Non-existent → 5 Optimizing), drill to per-control evidence. Auditor report + evidence package exports.
- **Costed decisions + leaf rule:** options with outcome/cost/risk-removed/tradeoff; cost derivation drills to **● pulled / ◐ assumption** leaves; assumptions are editable and recompute live and log the change.
- **Benchmarking:** per-framework, on the CMMI scale; **reciprocal** (must contribute anonymized maturity to view); k-anonymity (≥8 peers or fall back to overall maturity); consent captured at onboarding, changeable in-app, every change logged.
- **War Room:** live command center — system feeds (SIEM/TI/EDR/identity/network/email), kill-chain, blast radius, live event ticker, role decisions, comms/regulatory status. **Button blinks + alarm sounds on a live detection** (respect browser autoplay + a per-user sound preference).
- **Incident Commander mode (CISO):** on a live incident the CISO dashboard switches to a command console — runbook checklist, matching playbooks to trigger, and the **24/7 call tree with click-to-call**, all sourced from the onboarding incident-command-plan capture.
- **Currency:** chosen once at onboarding (primary currency), stored as ISO code, and **honored across the entire platform**. Data should be stored/displayed in the tenant's native currency — not naively FX-converted.

---

## 8. The data pipeline (information accuracy in practice)

This is "all the pipes." For each connector:

1. **Ingest** read-only via official APIs (EDR, SIEM, firewall, IdP, CSPM, vuln, email, backup/DR, MDM, ITSM/GRC). OAuth where possible; least privilege.
2. **Normalize** into the common `evidence` schema with `collected_at`, freshness, and a content hash.
3. **Sign & store** evidence so it's tamper-evident and citable later.
4. **Compute** in the deterministic engine: control status, CMMI maturity, FAIR loss, exposure — all from evidence + owned assumptions.
5. **Derive confidence** from coverage (how much of the in-scope estate reported) and freshness (how recent).
6. **Translate** with the LLM only as slot-filler/grounded responder, per §2.
7. **Render** with the drill-to-evidence path intact end-to-end.

Financial leaves come from financial connectors (cloud bills, HRIS, contracts) or the **assumptions** table — never hardcoded.

---

## 9. Security & compliance non-negotiables

- **Multi-tenant isolation via RLS, verified with two orgs before real data.** This is the first thing that must be provably correct.
- **PHI/regulated data:** encryption at rest and in transit; minimize what leaves the tenant; the benchmark sends only high-level maturity, never findings/evidence/identifiers.
- **Append-only, cryptographically signed decision ledger and audit log.** "Immutable" must be true at the database level, not a UI label.
- **Secrets** in env/secret manager; Anthropic key server-side only.
- **One full security review before launch** (RLS audit, secrets, signed-ledger verification, PHI handling, dependency/pen-test pass).

---

## 10. What must be TRUE in production (caveats the mock papers over)

- All mock numbers/scores/maturity/costs are illustrative — production computes them from real evidence with analyst review.
- "Signed / immutable / tamper-evident / k-anonymous" must be enforced server-side, not asserted.
- Framework per-control titles for CIS/ISO/800-53 must load **verbatim** from authoritative catalogs (OSCAL/CIS/ISO); 800-53 enhancements load on demand.
- **My Liability** content (attestations, D&O, indemnification, regulatory precedent) and CFO/CLO/CRO materiality/insurance/appetite language **must be reviewed by real legal counsel** before it's customer-facing.
- The incident call tree must be stored securely and **re-verified periodically** — a stale call tree is dangerous.
- Voice = server-side neural TTS (one voice per seat), not browser speech, in production.

---

## 11. First message to paste into Claude Code

> I'm building **CyberRx**, an executive cybersecurity decision platform (full brief attached as `cyberrx-build-brief.md`; the approved UX is `cyberrx-platform.html`). I'm non-technical, so we work in phases: after each phase you stop, explain in plain English, give me a live URL to look at, and wait for my approval.
>
> **Do Phase 0 only right now: produce the plan — repo structure, the data model with `tenant_id` + RLS on every table, the auth/MFA approach, the connector strategy, how secrets stay server-side, and the phase-by-phase plan.** Do not write application code yet. The non-negotiables: tenant isolation (RLS) proven with two test orgs before any real data; the Anthropic API server-side only; every user-facing number must trace to pulled evidence or an owned assumption; one security review before launch.
>
> When the plan's ready, stop and walk me through it.

Build the platform the mock promises — but only as fast as each piece can be made *true*.
