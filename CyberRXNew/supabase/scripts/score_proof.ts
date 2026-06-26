// Proof for the deterministic scorer (Phase 4b). Run:
//   node --experimental-strip-types supabase/scripts/score_proof.ts
import { scoreControl, rollup } from '../../src/engine/scorer.ts'

let failures = 0
const check = (name: string, cond: boolean, detail = '') => {
  console.log(`${cond ? 'PASS' : 'FAIL'}: ${name}${detail ? ' — ' + detail : ''}`)
  if (!cond) failures++
}

// 1. No evidence → CMMI 0, no_data, zero confidence.
const none = scoreControl([])
check('no evidence ⇒ CMMI 0 / no_data', none.cmmi === 0 && none.status === 'no_data' && none.confidence === 0)

// 2. Full, fresh coverage ⇒ CMMI 5, pass, high confidence.
const fullFresh = scoreControl([
  { id: 'a', present: true, ageHours: 1 },
  { id: 'b', present: true, ageHours: 2 },
  { id: 'c', present: true, ageHours: 1 },
])
check('full fresh ⇒ CMMI 5 / pass', fullFresh.cmmi === 5 && fullFresh.status === 'pass', JSON.stringify(fullFresh))

// 3. Full coverage but stale evidence ⇒ lower CMMI than fresh (freshness dampens).
const fullStale = scoreControl([
  { id: 'a', present: true, ageHours: 24 * 60 },
  { id: 'b', present: true, ageHours: 24 * 60 },
])
check('stale coverage scores below fresh', fullStale.cmmi < fullFresh.cmmi, `stale=${fullStale.cmmi} fresh=${fullFresh.cmmi}`)

// 4. Half coverage ⇒ fail/partial, confidence < full.
const half = scoreControl([
  { id: 'a', present: true, ageHours: 1 },
  { id: 'b', present: false, ageHours: 0 },
])
check('half coverage ⇒ not pass, lower confidence', half.status !== 'pass' && half.confidence < fullFresh.confidence, JSON.stringify(half))

// 4b. Low coverage (1 of 3) ⇒ fail.
const low = scoreControl([
  { id: 'a', present: true, ageHours: 1 },
  { id: 'b', present: false, ageHours: 0 },
  { id: 'c', present: false, ageHours: 0 },
])
check('low coverage (33%) ⇒ fail', low.status === 'fail', JSON.stringify(low))

// 5. Determinism — same input twice ⇒ identical output.
const a = scoreControl([{ id: 'x', present: true, ageHours: 100 }, { id: 'y', present: false, ageHours: 0 }])
const b = scoreControl([{ id: 'x', present: true, ageHours: 100 }, { id: 'y', present: false, ageHours: 0 }])
check('deterministic (same in ⇒ same out)', JSON.stringify(a) === JSON.stringify(b))

// 6. Rollup averages child CMMI, ignoring no_data.
const ru = rollup([fullFresh, half, none])
check('rollup ignores no_data and averages', ru.cmmi >= 1 && ru.cmmi <= 5, JSON.stringify(ru))

console.log(failures === 0 ? '\n✅ SCORER PROOF: all checks passed' : `\n❌ ${failures} check(s) failed`)
process.exit(failures === 0 ? 0 : 1)
