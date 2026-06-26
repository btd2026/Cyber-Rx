# CyberRx — Phase 6: orchestration, War Room, Incident Commander, launch gate

**Status:** Complete (6a–6d). This is the final phase; 6d is the launch gate.

## 6a — Ticket-system sync
- `src/engine/ticketSync.ts` defines the production adapter contract (Jira /
  ServiceNow / Azure DevOps / GitLab): `create` + poll `getStatus`.
- The decision ledger's tickets now show **status, age, and due** with a
  **blink** when near or overdue, an **advance** control that walks the status
  lifecycle (Open → In Progress → Resolved → Closed), and **closure that loops
  back to the decision** (✓ closed → decision). Real two-way sync is the adapter,
  server-side.

## 6b — War Room (command center)
- `⚠ War Room` in the top bar opens a full incident command center with two
  modes: **standby** (calm system feeds + response-readiness) and **live**.
- Live: banner with elapsed clock + revenue-at-risk, **live system feeds**
  (SIEM/TI/EDR/identity/network/email), **kill chain**, **automated containment**,
  **blast radius**, recovery & resilience, threat intel + **MITRE ATT&CK**, a
  **live event ticker**, **regulatory clocks**, decisions required, incident
  bridge, and comms status.
- On a (simulated) live detection the **War Room button blinks across the shell**
  and an **alarm sounds**, respecting browser autoplay (audio armed on the user
  gesture) and a **per-user mute** preference.

## 6c — Incident Commander mode (CISO)
- During a live incident the CISO seat gains a command console: an 8-step
  **runbook checklist**, the matching **ransomware playbook** (trigger + steps),
  and the **24/7 call tree with click-to-call** (`tel:`) — **sourced from the
  onboarding incident command plan** (falls back to defaults).

## 6d — Security review (launch gate) — PASS
See `docs/SECURITY_REVIEW.md`. RLS + signed ledger proven; client bundle free of
secrets/source; engine proofs pass; 0 dependency vulnerabilities. Production
prerequisites (live RLS re-test with PHI, server Anthropic key, legal review,
pen-test) are documented as the gate before real PHI.

## Build status
`npm run build` + `npm run typecheck` pass; `/app` serves 200.

---

**Phases 1 → 6 complete.** The platform the mock promised is built, made true
where it can be (RLS, signed ledger, deterministic engine, anti-hallucination
gates), and demo-safe everywhere else — ready to wire to a live Supabase +
Anthropic stack.
