# CyberRx — Phase 5: the Executive Twin (anti-hallucination)

**Status:** 5a/5b core complete & proven, pending approval. 5c (editable leaf
rule) and 5d (voice) are the next sub-steps.

This is the brief's most important phase. The defense is **architectural**, not
prompt-tuning: a deterministic engine owns the truth and the model is only ever a
translator on a locked spec sheet.

## 5a — Surface A (computed)
The five-question verdicts and dashboard figures already come from the engine
(seed today, computed in Phase 4). The prose is a template slot-filled with
engine-provided values + citations — the model has no latitude to change a number.

## 5b — Surface B ("Ask your Executive Twin")
- **Two gates, enforced before any answer** (`src/engine/twin.ts`):
  1. **Scope router** — is the question about cyber (and, implicitly, this org)?
     If not → a fixed, honest refusal.
  2. **Retrieval gate** — is there evidence in *this tenant's* data (≥2 matching
     terms)? If thin → "I don't have evidence in your data for that," never a guess.
- **Grounded answer only** — phrased strictly from retrieved evidence + engine
  values, with **citations** (source systems) and mechanical **confidence**.
- **Suggested chips** are generated from the evidence the org actually has — a
  safe on-ramp that's guaranteed answerable (brief §2).
- **Proof** (`supabase/scripts/twin_proof.ts`, `node --experimental-strip-types`):
  off-topic → refused at scope; in-scope but unevidenced → refused at retrieval;
  in-scope + evidence → grounded with citations + confidence; deterministic.

### Server-side (the only place Anthropic is called)
`supabase/functions/twin/index.ts` — a Supabase Edge Function that runs both
gates server-side, retrieves the tenant's evidence via RLS, then calls Anthropic
**as a translator on a locked spec sheet** (system prompt forbids new facts),
**schema-validates** the JSON output, and flags anything consequential for
human-in-the-loop. The `ANTHROPIC_API_KEY` lives in a server secret and **never
reaches the browser**. Model is configurable (`ANTHROPIC_MODEL`).

### Demo vs production
- **Demo (no backend):** the gates + grounding run client-side and answer
  **deterministically from the engine's evidence — no model call, so it cannot
  hallucinate.** Clearly flagged in the UI.
- **Production:** set `VITE_TWIN_URL` to the deployed Edge Function; the UI POSTs
  there and the model phrases the grounded values.

## Verify
```bash
node --experimental-strip-types CyberRXNew/supabase/scripts/twin_proof.ts
```
Open `/app` → **✦ Ask Twin** in the top bar.

## 5c — The leaf rule (complete)
- Every dollar in a decision's cost decomposes to **● pulled** (from a connected
  system, read-only) or **◐ assumption** (owned, editable).
- Assumption leaves are now **editable inline**; the option total **recomputes
  live**, and every edit is **logged** (`src/engine/assumptionsLog.ts`) with
  old→new + timestamp. In production this writes the `assumptions` version
  history + an `audit_log` entry behind RLS.

## 5d — Voice briefings (complete)
- A grounded per-seat **briefing script** (`src/engine/briefing.ts`) assembled
  from the seat's engine verdicts — same on-screen values, no new claims.
- **🔊 Brief** in the top bar plays it, **one voice per seat** (chosen
  deterministically). Demo uses browser speech, clearly flagged; **production
  uses server-side neural TTS** on the same script.

**Phase 5 complete.** Next: Phase 6 — orchestration (real Jira/ServiceNow sync),
the War Room + Incident Commander, and the launch-gate security review.
