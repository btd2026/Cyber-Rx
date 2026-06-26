# CyberRx — Security Review (Phase 6d · launch gate)

**Result: PASS** (with documented production prerequisites). This is the
brief's non-negotiable launch gate. Checks were run against the real code and a
real PostgreSQL 16 (the engine Supabase uses), not asserted.

## 1. Multi-tenant isolation (RLS) — PASS
`bash scripts/local/run_isolation_test.sh` — two tenants with overlapping data:
- Tenant B is invisible to a tenant-A user across tenants/connectors/evidence/
  assumptions/decisions/memberships.
- A sees only its own rows; cross-tenant INSERT is blocked; direct-id read of
  B's row returns nothing (no IDOR); anonymous callers see nothing.
- Verified at the **database** level, not the UI.

## 2. Signed, append-only ledger & audit log — PASS
Same test:
- `decisions` UPDATE and DELETE are blocked **even for `service_role`** (triggers).
- Entries are SHA-256 hash-chained (`prev_hash` links to the prior `row_hash`).
- "Immutable" is enforced by the database, not a UI label.

## 3. Secret handling — PASS
- Built client bundle (`dist/`) scanned: **no** `service_role` / Anthropic key /
  `sk-ant` material. Only the public `VITE_SUPABASE_URL` + `VITE_SUPABASE_ANON_KEY`
  (anon key is public by design; RLS controls access).
- Production **sourcemaps disabled** so no source/comments ship to the client.
- The Anthropic API is called **only** server-side (`supabase/functions/twin`);
  the key lives in a server secret.

## 4. Engine integrity (anti-hallucination) — PASS
- Deterministic scorer proof (`score_proof.ts`): CMMI/confidence computed, not
  generated; deterministic.
- Twin gates proof (`twin_proof.ts`): off-topic refused at scope; unevidenced
  refused at retrieval; grounded answers carry citations; deterministic.

## 5. Dependencies — PASS
- `npm audit --omit=dev`: **0 vulnerabilities**.

## Production prerequisites before real PHI (must be true on the live stack)
These are enforced by the architecture but require the live Supabase project:
1. Apply migrations (`supabase db push`) and **re-run the isolation test against
   the production database** with two real orgs before loading any PHI.
2. Set `ANTHROPIC_API_KEY` as a Supabase secret; deploy the `twin` function;
   point `VITE_TWIN_URL` at it. Confirm the key is not in any client env.
3. Enable encryption at rest (Supabase default) + TLS in transit; confirm the
   benchmark endpoint sends only high-level CMMI maturity (k-anonymity ≥ 8).
4. **Legal counsel review** of My Liability + CFO/CLO/CRO language before it is
   customer-facing (brief §10).
5. Connector credentials in a secret manager (never `connectors.config`).
6. A dependency/pen-test pass against the deployed environment.

## Reproduce
```bash
bash CyberRXNew/scripts/local/run_isolation_test.sh
node --experimental-strip-types CyberRXNew/supabase/scripts/score_proof.ts
node --experimental-strip-types CyberRXNew/supabase/scripts/twin_proof.ts
cd CyberRXNew && npm audit --omit=dev
```
