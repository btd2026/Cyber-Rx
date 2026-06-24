# CyberRx — Phase 2: Executive shell + the CISO seat

**Status:** Complete (sub-steps 2a, 2b, 2c), pending founder approval.

Built CISO-first as the reference depth. Everything runs on clearly-flagged
**seed data** shaped like the real thing; the drill-to-evidence path is wired
end-to-end so the swap to the live engine (Phase 4) is mechanical.

---

## 2a — Executive shell
- Design tokens ported from the approved mock (warm-light default + dark).
- Top bar: brand, live/integrity pill, identity + sign-out, action buttons,
  light/dark toggle (persisted).
- "View as" seat switcher across all seven seats; own seat marked **YOU**.
- View-only RBAC banner when viewing another seat (server-side RLS from Phase 1
  is the real gate; the UI mirrors it).
- **Demo mode:** with no backend wired, the shell opens on seed data so it's
  viewable immediately; real auth + RLS apply once Supabase is configured.

## 2b — The CISO seat in full
- **Exec summary** band (headline verdict, metric tiles, provenance bar, the
  five questions answered).
- **The five questions**, each a full view: Threat & Compromise, Operational
  Safety, Material Exposure (attack path + dollar-modeled scenarios), Decisions
  (costed options with ● pulled / ◐ assumption leaf tags), Trajectory.
- **Framework Posture** — CSF 2.0 seed tree + CMMI 0–5 legend (full
  authoritative catalogs load in Phase 4).
- **My Liability** — defensibility checklist, attestations & D&O coverage, owned
  risks, plus a legal-counsel-review note (brief §10).
- **Drill-to-evidence drawer** — every figure opens its evidence: what it
  measures, source systems, signals, breakdown, freshness, confidence, with
  cross-links. 22 evidence records. "Every claim is a door."

## 2c — Decision ledger + ticketing
- **"Choose & record"** on any costed option writes a ledger entry stamped with
  who, when, the chosen option, cost, risk removed, rationale, and the
  **evidence known at the time**.
- The ledger is **append-only and SHA-256 hash-chained in the browser** — each
  entry signs over the previous — mirroring the Phase 1 server-side trigger.
  No edit/delete path exists. (In production this writes to the signed
  `decisions` table; in demo it persists locally and is clearly flagged.)
- **Ticketing UI shell** — open a ticket from a recorded decision into
  Jira / ServiceNow / Azure DevOps / GitLab, with a linked ticket chip. Real
  two-way sync lands in Phase 6.

---

## How to see it
- **Demo mode:** deploy to Vercel (or `npm run dev`) and the CISO seat opens
  directly on seed data — no login required until a backend is wired.
- With Supabase configured, sign in and the same seat renders behind real auth.

## Verification
- `npm run build` and `npm run typecheck` pass.
- Preview server serves HTTP 200.
- Client bundle references no Anthropic / service_role secrets.

## What's next — Phase 2B (the other six seats)
Generalize CEO / CFO / CIO / CLO / CRO / Board from the CISO patterns (core
questions, evidence answer-grid, costed decisions, same drill-to-evidence),
reusing the components rather than forking. Then Phase 3 (onboarding) wires the
real org profile, connectors, and the data behind these seats.

**To proceed, reply "approved — Phase 2B"** (the other six seats), or **"let's
deploy"** to get a live URL first.
