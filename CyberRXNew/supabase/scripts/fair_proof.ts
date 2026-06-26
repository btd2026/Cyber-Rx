// Proof for the FAIR-lite exposure engine (Phase 9). Run:
//   node --experimental-strip-types supabase/scripts/fair_proof.ts
import { computeFair, vulnFromMaturity, DEFAULT_FAIR_ASSUMPTIONS, type FairAssumptions, type FairMaturity } from '../../src/engine/fair.ts'

let failures = 0
const check = (name: string, cond: boolean, detail = '') => {
  console.log(`${cond ? 'PASS' : 'FAIL'}: ${name}${detail ? ' — ' + detail : ''}`)
  if (!cond) failures++
}

const A = (insurance: number): FairAssumptions => ({ currency: 'USD', insuranceCoverage: insurance, ...DEFAULT_FAIR_ASSUMPTIONS })
const M = (cmmi: number): FairMaturity => ({ protect: cmmi, identify: cmmi, detect: cmmi, recover: cmmi })

// 1. Vulnerability falls as maturity rises, floored/capped.
check('vuln(0)=1.0 (no controls)', vulnFromMaturity(0) === 1)
check('vuln(5)=0.05 floor', Math.abs(vulnFromMaturity(5) - 0.05) < 1e-9)
check('vuln monotonic decreasing', vulnFromMaturity(2) > vulnFromMaturity(4))

// 2. Higher maturity ⇒ strictly lower exposure (the core promise).
const low = computeFair(A(0), M(1))
const high = computeFair(A(0), M(4))
check('higher maturity ⇒ lower gross ALE', high.aleGross < low.aleGross, `low=${Math.round(low.aleGross)} high=${Math.round(high.aleGross)}`)
check('higher maturity ⇒ lower residual ALE', high.aleResidual < low.aleResidual)

// 3. Insurance reduces residual (never below zero) and residual ≤ gross.
const noIns = computeFair(A(0), M(3))
const withIns = computeFair(A(50_000_000), M(3))
check('insurance reduces residual exposure', withIns.aleResidual < noIns.aleResidual, `noIns=${Math.round(noIns.aleResidual)} ins=${Math.round(withIns.aleResidual)}`)
check('residual ≤ gross', withIns.aleResidual <= withIns.aleGross + 1e-6)
check('residual never negative', computeFair(A(1e15), M(3)).aleResidual === 0)

// 4. ALE = LEF × LM per scenario (model integrity).
const r = computeFair(A(0), M(2))
const breach = r.scenarios.find((s) => s.key === 'data_breach')!
check('ALE_gross = LEF × LM', Math.abs(breach.aleGross - breach.lef * breach.lossMagnitude) < 1e-6)
check('two scenarios present', r.scenarios.length === 2)

// 5. PROVENANCE — every leaf is labeled; maturity is pulled, costs are assumptions.
const allLeaves = r.scenarios.flatMap((s) => s.leaves)
check('every leaf labeled pulled|assumption', allLeaves.every((l) => l.source === 'pulled' || l.source === 'assumption'))
check('maturity leaves are pulled', allLeaves.filter((l) => l.unit === 'CMMI').every((l) => l.source === 'pulled'))
check('cost/records/insurance are assumptions', allLeaves.filter((l) => ['records_held', 'breach_cost_per_record', 'insurance_coverage', 'downtime_cost_per_hour'].includes(l.key)).every((l) => l.source === 'assumption'))
check('every leaf has a basis', allLeaves.every((l) => typeof l.basis === 'string' && l.basis.length > 0))

// 6. Determinism.
const a = computeFair(A(50_000_000), M(3))
const b = computeFair(A(50_000_000), M(3))
check('deterministic', JSON.stringify(a) === JSON.stringify(b))

console.log(failures === 0 ? '\n✅ FAIR PROOF: all checks passed' : `\n❌ ${failures} check(s) failed`)
process.exit(failures === 0 ? 0 : 1)
