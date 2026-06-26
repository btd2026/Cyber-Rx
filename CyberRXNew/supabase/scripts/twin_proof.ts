// Proof for the Twin gates (Phase 5). Run:
//   node --experimental-strip-types supabase/scripts/twin_proof.ts
import { askTwin, scopeRouter, retrievalGate, type EvidenceMap } from '../../src/engine/twin.ts'

// Minimal injected evidence stub (shape-compatible with the real map).
const EV: EvidenceMap = {
  intrusions: { claim: 'Active intrusions / confirmed compromise', val: 'None', valCls: 'ok', what: 'Whether any confirmed adversary presence or active intrusion exists across the monitored estate right now.', sources: ['CrowdStrike EDR', 'Splunk SIEM'], detail: [], freshness: 'live', confidence: 'High · 99.4% coverage', links: [] },
  'exp-claims': { claim: 'Claims Processing material exposure', val: 'High', valCls: 'crit', what: 'Material exposure on claims processing — revenue and PHI at risk via an open ransomware path.', sources: ['SIEM', 'Vuln mgmt'], detail: [], freshness: 'daily', confidence: 'Medium', links: [] },
}

let failures = 0
const check = (name: string, cond: boolean, detail = '') => {
  console.log(`${cond ? 'PASS' : 'FAIL'}: ${name}${detail ? ' — ' + detail : ''}`)
  if (!cond) failures++
}

const lunch = askTwin('what should we have for lunch?', EV)
check('off-topic ⇒ refused at scope gate', lunch.kind === 'refused' && lunch.gate === 'scope')

check('cyber question passes scope', scopeRouter('are we compromised by ransomware?').inScope === true)

const obscure = askTwin('what is our quantum readiness posture?', EV)
check('thin evidence ⇒ refused at retrieval gate', obscure.kind === 'refused' && obscure.gate === 'retrieval', JSON.stringify(obscure).slice(0, 70))

const real = askTwin('are we compromised or under active intrusion right now?', EV)
check('in-scope + evidence ⇒ grounded answer', real.kind === 'grounded')
if (real.kind === 'grounded') {
  check('grounded answer carries citations', real.citations.length > 0, real.citations.join(', '))
  check('grounded answer carries confidence', !!real.confidence)
  check('answer grounded in retrieved key', real.evidenceKey === 'intrusions', real.evidenceKey)
}

const a = retrievalGate('claims processing material exposure', EV)
const b = retrievalGate('claims processing material exposure', EV)
check('retrieval deterministic', a?.key === b?.key && a?.key === 'exp-claims', a?.key)

console.log(failures === 0 ? '\n✅ TWIN GATES PROOF: all checks passed' : `\n❌ ${failures} check(s) failed`)
process.exit(failures === 0 ? 0 : 1)
