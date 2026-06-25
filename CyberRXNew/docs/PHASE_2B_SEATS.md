# CyberRx — Phase 2B: the other six seats

**Status:** Complete, pending approval. CEO, CFO, CIO, CLO, CRO, and Board seats
are live in the React app, generalized from the CISO reference.

## Approach — reuse, don't fork
Rather than hand-build six more seats, I extracted the **data-driven `SEATS`
config** from today's mock (`docs/mock/cyberrx-ciso-os.html`) and built **one
generic `SeatRenderer`** that renders every block type the mock uses:

`head · band · brief · ansgrid · cols (srow/kv) · table · scn · dec2 · decisions · bigstat · panel · sec · raw`

All six seats are pure data (`src/seats/data/seatData.json`); the renderer turns
them into the same look and behavior as the CISO seat.

## What each seat answers (from the mock)
- **CEO** — Operating status · Principal business risk · Board & exec attention · Trajectory
- **CFO** — Financial exposure · Materiality · Decisions required · Return on investment
- **CIO** — Service status · Operational threats · Decisions required · Reliability trend
- **CLO** — Regulatory obligation · Disclosure & timelines · Decisions required · Defensibility
- **CRO** — (enterprise risk aggregation, appetite, decisions)
- **Board** — (oversight rollup)

Each carries its evidence answer-grid, costed multi-option decisions, and the
same drill-to-evidence behavior.

## Shared with the CISO seat
- **Drill-to-evidence drawer** — unified on the mock's richer **69-record**
  evidence set. The drawer now also renders the *"is it evidenced or assumed?"*
  Q&A, what-we-measure scope, scenarios, and "what this tells you" — for every
  seat, including CISO.
- **Decision ledger** — every "Choose & record" across all seven seats writes to
  the append-only, signed ledger (Phase 2c).
- **Seat switcher + view-only RBAC + theme** (Phase 2a).

## Verification
- `npm run build` + `npm run typecheck` pass; preview serves HTTP 200.

## Routing on the deploy
- `/` → the static prototype · `/app` → the React app (all seven seats, demo mode).

## A note on visual style
The React app keeps the warm-light palette from the earlier approved mock.
Today's mock is a **navy / "United-blue" re-skin** — a separate re-theme task
(swapping the `cyberrx.css` token values) if you want the app to match it.

## Next
Phase 3 — onboarding/intake (org profile, connectors, crown jewels, incident
command plan), which wires the real data behind these seats.
