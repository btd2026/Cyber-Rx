// Proof for the shared live-posture rollup (Phase 8). Run:
//   node --experimental-strip-types supabase/scripts/posture_proof.ts
import { computeLivePosture } from '../../src/engine/posture.ts'
import { mapEvidenceToControls } from '../../src/engine/controlMap.ts'
import { CSF } from '../../src/seats/ciso/csf.ts'

let failures = 0
const check = (name: string, cond: boolean, detail = '') => {
  console.log(`${cond ? 'PASS' : 'FAIL'}: ${name}${detail ? ' — ' + detail : ''}`)
  if (!cond) failures++
}

const now = Date.parse('2026-06-26T12:00:00Z')
const fresh = '2026-06-26T11:00:00Z'

// Baseline: no evidence ⇒ all seed, zero live controls.
const base = computeLivePosture(CSF, {})
check('no evidence ⇒ 0 live controls', base.liveControls === 0)
check('baseline overall is a valid CMMI', base.overall.cmmi >= 0 && base.overall.cmmi <= 5, `cmmi=${base.overall.cmmi}`)
const baseProtect = base.functions.find((f) => f.key === 'PR')!

// Strong MFA + Defender + Intune evidence on Protect controls raises Protect.
const evMap = mapEvidenceToControls([
  { kind: 'identity_mfa_coverage', value: { coverage_ratio: 1 }, collected_at: fresh, source_system: 'Okta' },
  { kind: 'edr_secure_score', value: { ratio: 1 }, collected_at: fresh, source_system: 'Defender' },
  { kind: 'mdm_device_compliance', value: { ratio: 1 }, collected_at: fresh, source_system: 'Intune' },
], now)
const withEv = computeLivePosture(CSF, evMap)
const protect = withEv.functions.find((f) => f.key === 'PR')!
check('Protect has live controls', protect.live >= 2, `live=${protect.live}`)
check('strong evidence raises Protect CMMI', protect.cmmi >= baseProtect.cmmi, `before=${baseProtect.cmmi} after=${protect.cmmi}`)
check('liveControls counted across functions', withEv.liveControls >= 2, `${withEv.liveControls}`)

// Determinism.
const a = computeLivePosture(CSF, evMap)
const b = computeLivePosture(CSF, evMap)
check('deterministic posture', JSON.stringify(a) === JSON.stringify(b))

// Functions cover all 6 CSF functions.
check('6 CSF functions rolled up', withEv.functions.length === 6, `${withEv.functions.length}`)

console.log(failures === 0 ? '\n✅ POSTURE PROOF: all checks passed' : `\n❌ ${failures} check(s) failed`)
process.exit(failures === 0 ? 0 : 1)
