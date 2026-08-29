# Nerion v2

A horizontal, federated cyber-assurance platform: the estate is **measured once**
and projected onto every framework. Built to the v2 mock as the specification.

## Layout

```
nerion/
  engine/   @nerion/engine — the domain engine (TypeScript). One estate, measured
            once; design ≠ operating enforced in the type system; federation,
            provenance and framework projections. 21 property tests.
  api/      @nerion/api — a thin Fastify read layer over the engine, and it also
            serves the frontend. No figure is computed in the API.
  web/      index.html — the "Nerion Control View", kept exactly as-is. Its own
            data today; the engine + API sit behind it for later wiring.
```

## The differentiators, encoded (not commented)

- **Design vs operating.** Operating effectiveness is a sum type derivable *only*
  from an interval evidence class (`telemetry` / `config_export`). The factory makes
  "an operating number from a document" unconstructable; a design-only class returns
  an explicit `not_measurable` reason, and an interval class measured on too few
  entities returns `below_threshold` with its coverage — never `null`, never `0`.
- **Deviation reconciliation.** For any measured control, the deviation intervals sum
  to exactly `round((1 − op) × 92)` days, and the count is zero iff that sum is zero.
- **One estate, three projections.** CSF 2.0 (106 = 19+11+29+30+17 = 31+21+22+11+13+8),
  ISO 27001 (93 = 37+8+14+34), CIS v8.1 (153, IG1 = 56). Switching re-labels; it never
  re-collects.
- **Federation.** Four origins; credited only for `local` + `inherited_verified`;
  `claim_false` contributes zero and raises a finding against the corporate provider;
  corporate reach is a measured count of 147. Aggregation is by count — a test greps
  the source for any mean of entity results.
- **Bitemporal.** Machine-carried re-derives 4 → 6 → 7 → 11 → 19 → 30 across six
  quarterly stops (4% → 28% of 106) — computed, not asserted.
- **Verification returns a payload, not a boolean.** A route that authenticates but
  lacks the SKU is `not_established: entitlement_missing`, never a control failure.
  Credentials are write-only: no endpoint returns a secret.

## Run

```bash
# engine — property tests
cd nerion/engine && npm install && npm test

# api + frontend (serves the Control View at / and the endpoints behind it)
cd nerion/api && npm install && npm start      # → http://localhost:8787
```

### API

| Method | Path | Returns |
|---|---|---|
| GET  | `/` | the Nerion Control View (frontend) |
| GET  | `/controls?framework=csf&as_of=5` | register + projection + census at a date |
| GET  | `/controls/:id/provenance?as_of=` | the re-performable derivation, by class |
| GET  | `/entities` | subjects, measured corporate reach, findings |
| GET  | `/catalog` | connector catalogue, capability-first |
| GET  | `/connections/methods?vendor=` | the read-only routes a vendor supports |
| POST | `/connections/verify` | verification payload (what came back) |
| GET  | `/timeline` | the bitemporal stops |
