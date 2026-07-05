# Nerion — Claude Code Prompt Pack (paste one at a time, in order)

**Before you start:** put `cyberrx-build-brief.md` and `cyberrx-platform.html` (the mock) in the Claude Code project folder so every prompt can reference them. Work through these **in order**. After each one, Claude Code should stop, explain in plain English, give you a **live URL**, and wait for your approval before you paste the next.

If a phase says "break this into sub-steps," let Claude Code pause and show you each sub-step before continuing — don't rush it.

---

## ▶ PROMPT 0 — Plan only (paste first)

```
I'm building Nerion, an executive cybersecurity decision platform. The full brief is cyberrx-build-brief.md and the approved UX is cyberrx-platform.html — read both before responding.

I'm non-technical, so we work in phases. After each phase you STOP, explain in plain English what you built and decided, give me a live URL to look at, and wait for my approval before continuing.

Do PHASE 0 ONLY right now — produce the plan, no application code:
- Proposed repo structure (frontend + backend).
- The full data model: every table with tenant_id and a row-level-security (RLS) policy.
- Auth + MFA approach.
- Connector strategy (read-only integrations).
- How secrets stay server-side (Anthropic key never in the client).
- The phase-by-phase build plan and what "done" looks like for each.

Non-negotiables to bake into the plan: tenant isolation via RLS proven with two test orgs before any real data; Anthropic API server-side only; every user-facing number must trace to pulled evidence or an owned assumption; one security review before launch.

When the plan is ready, stop and walk me through it.
```

---

## ▶ PROMPT 1 — Foundation: auth + RLS + schema

```
Phase 0 is approved. Do PHASE 1 — Foundation.

Build:
- The Supabase project: Postgres, Auth (email/password + MFA), Storage.
- The core schema from the brief (§5), with tenant_id on every table and RLS policies on all of them.
- The role model (CEO/CISO/CFO/CIO/CLO/CRO/Board/Admin) tied to a tenant membership.

Hard acceptance test before you call this done: create TWO test tenants with overlapping data, then prove that a user in tenant A cannot read any of tenant B's rows — at the database level, not just hidden in the UI. Show me the test and its result.

Do not build application screens yet. When the isolation test passes, stop and show me the schema, the RLS policies, and the proof of isolation.
```

---

## ▶ PROMPT 1.5 — Live preview deployment

```
Phase 1 is approved. Do PHASE 1.5 — stand up a live preview.

Deploy the frontend to Vercel and connect it to the Supabase backend so there is always a URL I can open. It can be minimal (a login screen + a placeholder authed page is fine) — the point is that from now on every phase ends with something I can see and click.

Confirm secrets are in environment variables and the Anthropic key is not referenced anywhere client-side. Then stop and give me the URL.
```

---

## ▶ PROMPT 2 — Executive UI shell + the CISO seat (reference depth)

```
Phase 1.5 is approved. Do PHASE 2 — the executive UI, built CISO-first. Break this into sub-steps and pause after each:

(2a) The front door + shell: login → MFA → role-aware seat switcher (View as: CEO/CISO/CFO/CIO/CLO/CRO/Board), using the mock's design tokens (port cyberrx-design-tokens.css). RBAC enforced SERVER-SIDE — you may only edit your own seat; others are view-only. Light/dark theme.

(2b) The CISO seat in full, matching the mock: the five questions (Threat & Compromise, Operational Safety, Material Exposure, Decisions, Trajectory), plus Framework Posture and My Liability tabs, the exec summary band, and the drill-to-evidence drawer (every figure/row opens a panel showing what it measures, sources, signals, breakdown, freshness, confidence).

(2c) The decision ledger UI (record a decision → timestamp + who + evidence-at-time) and the ticketing UI shell.

Use clearly-flagged seeded data shaped like the real thing — connectors come later. Keep the drill-to-evidence path real end-to-end so we can wire it to live evidence in Phase 4.

Stop after each sub-step and show me the live URL.
```

---

## ▶ PROMPT 2B — The other six seats

```
The CISO seat is approved. Now generalize to the other six seats (CEO, CFO, CIO, CLO, CRO, Board), each matching the mock: their core questions, an evidence answer-grid, a costed multi-option decision, and the same drill-to-evidence behavior. Reuse the CISO patterns; don't fork the code.

Stop and show me each seat on the live URL.
```

---

## ▶ PROMPT 3 — Onboarding / intake

```
The seats are approved. Do PHASE 3 — the onboarding flow, matching the mock end to end:
- Organization profile (incl. PRIMARY CURRENCY stored as an ISO code, materiality threshold, regions, regulated data types). Numbers entered cleanly: money in millions/billions with the currency symbol, members/employees with formatting, dates via a calendar picker.
- Connect-your-systems (the connector list + credibility meter).
- Business processes & applications (upload or connect), auto-map & crown-jewel deduction.
- Documents.
- Per-seat data needs, including the CISO INCIDENT COMMAND PLAN: upload IR plan/playbooks + a 24/7 call tree (role, name, phone) — this powers Incident Commander mode later.
- Benchmark consent (reciprocal — explained in the brief).
- Review & go live.

Persist everything to the tenant/connectors/assumptions/incident_plan tables. The chosen currency must then be honored across the whole platform. Stop and show me the flow on the live URL.
```

---

## ▶ PROMPT 4 — Framework catalogs + CMMI engine + exports

```
Onboarding is approved. Do PHASE 4 — framework mapping and the scoring engine. Break into sub-steps:

(4a) Load the COMPLETE authoritative catalogs from their real sources: NIST CSF 2.0 and 800-53 (OSCAL), CIS v8, ISO 27001:2022, SOC 2 — full control sets, with verbatim IDs and titles.

(4b) Build the DETERMINISTIC scorer: map evidence → controls → CMMI 0–5 maturity, with confidence derived from coverage + freshness. The engine does the math. An LLM may PROPOSE a per-control maturity but only WITH a citation, and an analyst reviews — the model never sets the score itself.

(4c) The Framework Posture UI (drill function → category → control → evidence, CMMI legend) and the per-framework benchmark on the CMMI scale (reciprocal + k-anonymity ≥8 or fall back to overall maturity).

(4d) Auditor report + evidence-manifest exports — real files, signed.

Stop after each sub-step and show me on the live URL.
```

---

## ▶ PROMPT 5 — Executive Twin (anti-hallucination) + voice

```
Phase 4 is approved. Do PHASE 5 — the Executive Twin, following the anti-hallucination architecture in brief §2 exactly. This is the most important phase; go carefully and break it into sub-steps:

(5a) Surface A (computed): the five-question verdicts and all dashboard figures come straight from the engine. The LLM only slot-fills a template with engine-provided values and citations — it cannot change a number. Confidence is mechanical (coverage + freshness).

(5b) Surface B (free-text "Ask your twin"): implement BOTH gates server-side. Gate 1 scope router (cyber AND this org, else a fixed honest refusal). Gate 2 retrieval gate (thin evidence → "I don't have evidence in your data for that," never a guess). Grounded generation only, scenario dollars from the engine, schema-validated output, human-in-the-loop for anything consequential. Generate the suggested chips from the org profile so they're always answerable.

(5c) The leaf rule for all cost/FAIR models: every dollar decomposes to ● pulled (from a connector) or ◐ assumption (from the tenant assumptions table, labeled, owned, editable, change-logged). No hardcoded leaves.

(5d) Voice briefings last: server-side neural TTS, one voice per seat, the dashboard-briefing script from the mock (no "ask me anything").

All Anthropic calls are server-side on locked spec sheets. Stop after each sub-step and show me.
```

---

## ▶ PROMPT 6 — Orchestration, war room, Incident Commander, security review

```
Phase 5 is approved. Do PHASE 6 — orchestration, the war room, and the launch security review. Break into sub-steps:

(6a) Real ticket-system sync: open a ticket from a decision into Jira/ServiceNow, reflect status/age/due back, blink near/overdue. Verify closure loops back to the decision.

(6b) War Room command center wired to live detections (system feeds, kill-chain, blast radius, live event ticker, role decisions, comms status). The button blinks + an alarm sounds on a real qualifying detection (respect browser autoplay + a per-user sound setting).

(6c) Incident Commander mode (CISO): on a live incident the CISO dashboard switches to a command console — runbook checklist, matching playbooks, and the 24/7 call tree with click-to-call, all sourced from the incident command plan captured at onboarding.

(6d) SECURITY REVIEW (launch gate): full RLS audit, secret handling, signed append-only ledger + audit log verified, PHI handling, dependency/pen-test pass. This must pass before launch.

Stop after each sub-step. Treat 6d as a gate — do not declare the platform launch-ready until it passes and you've shown me the results.
```

---

## Between every phase, say this if needed

```
Before continuing: give me a plain-English summary of what you just built, the live URL, anything you had to assume or decide, and any risk I should know about. Then wait for my approval.
```

## If Claude Code starts doing too much at once

```
Stop — that's more than one step. Do only [the current sub-step], show me the result on the live URL, and wait for my approval before the next.
```
