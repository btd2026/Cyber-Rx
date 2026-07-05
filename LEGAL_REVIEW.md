# Legal Review Required Before Launch — Litigation Discoverability of Risk Acceptances

> **Status: OPEN — must be reviewed and signed off by Legal / outside counsel before this behavior ships.**

## What the platform does

Nerion records executive risk decisions to a shared **decision/evidence ledger**
(`decision_ledger`). When a leader chooses **"Accept & monitor"** (or, in the CIO
lens, **"Ship on time"** deferring a security control), the platform **requires a
written rationale** and stores it with the decider, role, timestamp, and the
engine state at the time of decision.

The CLO / General Counsel lens surfaces this ledger as a legal artifact ("who knew
what, when") and explicitly tells users it is **discoverable in litigation**.

## The caveat being flagged

**Logged risk acceptances — and their rationale text — are discoverable in
litigation and regulatory investigations.** This cuts both ways:

- **Upside (defensibility):** a contemporaneous, well-reasoned record demonstrates
  good-faith oversight (helpful under *Caremark* and SEC governance expectations).
- **Downside (exposure):** a thin, careless, or admission-laden rationale becomes
  adverse evidence. "We knew and did nothing" in writing is worse than no record.

To manage this, the product **guides the rationale toward defensible reasoning**
(business justification, compensating controls, accountable owner, review date)
and flags thin acceptances as a blind spot. It does **not** suppress or auto-edit
what users write.

## Why Legal must review before launch

1. **Privilege:** Should acceptance rationales be captured under attorney-client
   privilege / work-product (e.g., counsel-directed), and how does that interact
   with storing them in a shared product database?
2. **Guidance wording:** Confirm the on-screen rationale prompts encourage
   defensible documentation without coaching users into waiving privilege or
   manufacturing self-serving records.
3. **Retention & export:** The ledger is exportable (CSV). Confirm retention,
   access controls, and whether export should be gated/labeled.
4. **Discoverability disclosure:** Confirm the in-app notice ("discoverable in
   litigation") is accurate and sufficient for the target jurisdictions.

## Where this behavior lives (for the reviewer)

- Rationale requirement + storage: `cyberrx-api/src/services/DecisionEngineService.js` (`record()`), `decision_ledger` table.
- Rationale prompts (UI): `frontend/src/components/DecisionQueue.jsx`, `CioFrictionMap.jsx`, `CloTriggerMap.jsx`.
- Defensibility surfacing + discoverability notice: `cyberrx-api/src/services/CloDefensibilityService.js`, `frontend/src/components/CloDefensibility.jsx`.
- Blind-spot flag for thin acceptances: `cyberrx-api/src/services/BlindSpotService.js`.

## Sign-off

- [ ] Reviewed by: __________________________  Date: __________
- [ ] Privilege approach confirmed
- [ ] Rationale guidance wording approved
- [ ] Retention / export controls approved
- [ ] Discoverability notice approved
