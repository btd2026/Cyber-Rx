# CEO seat — backend rollup spec (proposed)

Status: PROPOSAL for the backend team. The situation-room CEO seat currently has **no
dedicated endpoint** and therefore falls back to tagged-sample content. Every other seat
binds its Exec Summary spine to `/api/agents/briefs/:role` + `/api/agents/key-questions/:role`
(+ `/api/metrics/:role`). CEO is the only role missing from those.

The frontend already fetches these paths for every seat via `useSeatData` — so the
**cheapest fix needs no new route and no frontend change.**

---

## Option A (recommended) — add a `ceo` role to the existing agent service

Add one entry to `ROLES` in `cyberrx-api/src/services/ExecutiveAgentService.js`
(alongside `cfo`, `ciso`, `cro`, `clo`, `cio`, `board`):

```js
ceo: {
  persona:
    "You are the CEO's dedicated cyber-risk agent. You translate the security posture into " +
    "business terms — is the business safe to operate, what is the single biggest risk to " +
    "revenue/customers/brand, what needs the CEO or board, and are we improving — each in " +
    "plain language with no technical jargon.",
  question: 'Is the business safe, and are we in control?',
  deliverable: 'CEO business-risk brief',
},
```

Because the route validates against `ROLE_KEYS = Object.keys(ROLES)`, this immediately makes:
- `GET /api/agents/briefs/ceo` → `{ headline, status, summary, metrics[], highlights[], actions[] }`
- `GET /api/agents/key-questions/ceo` → `{ cards:[{question, answer, severity}] }`

…work with the **existing deterministic + AI paths**. The CEO seat then binds its Exec
Summary verdict / status / lede / briefing automatically — **zero frontend changes.**

Context the CEO brief should read (the service already loads most of this for other roles —
reuse `loadCtx`/the shared context): overall posture + trend, top business-process exposure,
open board-level decisions, financial exposure summary, and disclosure/materiality status.
Keep it business-framed (revenue/customers/brand), never CVEs or tool counts.

Optionally also add `'ceo'` to the `ROLES` array in `routes/metrics.js` if you want
`/api/metrics/ceo` to return a posture number for the CEO tile (it can reuse the same
enterprise posture as `board`).

**Effort:** ~1 file (a persona block), optionally a second one-line array edit. No DB, no
new route, no frontend work.

---

## Option B — a dedicated `/api/ceo/dashboard` rollup (only if bespoke CEO composition is wanted)

If the CEO view should be a hand-composed rollup rather than an agent brief, add
`routes/ceo.js` mounted at `/api/ceo`, composing from existing services (no new data):

`GET /api/ceo/dashboard?org_id=` →
```jsonc
{
  "role": "ceo",
  "generatedAt": "ISO-8601",
  "status": "green | amber | red",
  "headline": "one-sentence business verdict",
  "summary": "2–3 sentences, business language",
  "tiles": [ { "label": "Business risk", "value": "In tolerance" }, ... ],   // 6 tiles
  "briefing": [ { "question": "...", "answer": "...", "severity": "Low|High|Critical" } ],
  "provenance": { "coverage": 0, "signals": 0, "asOf": "ISO-8601" }
}
```

Compose from:
- `ExecDashboardService.getDashboard(orgId, 'ceo')` / `IncidentService.get(orgId)` — the shared incident + posture
- `MetricsEngine` — enterprise posture score (reuse `board`/`ciso`)
- `services/business-context` (`/api/business-context`) — revenue / customers / brand framing
- `BoardService.decisions(orgId)` — items rising to the board
- `CfoQuantService` — financial-exposure summary (dollars)

The frontend would then point CEO at `/api/ceo/dashboard` in `useSeatData` (a small adapter
branch). **Effort:** ~1 route file + ~1 frontend adapter branch.

---

## Recommendation

**Do Option A.** It reuses the entire executive-agent pipeline (deterministic fallback + AI),
needs ~one persona block, and the CEO seat lights up with no frontend change — consistent with
the other six seats. Reserve Option B only if the CEO view must diverge from the agent-brief shape.
