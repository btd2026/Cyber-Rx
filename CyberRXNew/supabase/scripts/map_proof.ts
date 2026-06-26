// Proof for the evidence→control mapping (Phase 8d). Run:
//   node --experimental-strip-types supabase/scripts/map_proof.ts
import { mapEvidenceToControls, scoreFromGrade, EVIDENCE_CONTROL_MAP } from '../../src/engine/controlMap.ts'

let failures = 0
const check = (name: string, cond: boolean, detail = '') => {
  console.log(`${cond ? 'PASS' : 'FAIL'}: ${name}${detail ? ' — ' + detail : ''}`)
  if (!cond) failures++
}

const now = Date.parse('2026-06-26T12:00:00Z')
const fresh = '2026-06-26T11:00:00Z' // 1h old

// 1. High MFA coverage ⇒ high CMMI on PR.AA-05; low coverage ⇒ low CMMI.
const high = mapEvidenceToControls([{ kind: 'identity_mfa_coverage', value: { coverage_ratio: 0.95 }, collected_at: fresh, source_system: 'Okta' }], now)
const low = mapEvidenceToControls([{ kind: 'identity_mfa_coverage', value: { coverage_ratio: 0.2 }, collected_at: fresh, source_system: 'Okta' }], now)
check('MFA maps to PR.AA-05', !!high['PR.AA-05'])
const highScore = scoreFromGrade(high['PR.AA-05'].coverage, high['PR.AA-05'].ageHours)
const lowScore = scoreFromGrade(low['PR.AA-05'].coverage, low['PR.AA-05'].ageHours)
check('higher MFA coverage ⇒ higher CMMI', highScore.cmmi > lowScore.cmmi, `high=${highScore.cmmi} low=${lowScore.cmmi}`)
check('0.95 coverage ⇒ pass', highScore.status === 'pass', JSON.stringify(highScore))

// 2. Open high-priority incidents grade inversely (fewer is better).
const fewInc = mapEvidenceToControls([{ kind: 'itsm_open_security_incidents', value: { open_high_priority: 0 }, collected_at: fresh }], now)
const manyInc = mapEvidenceToControls([{ kind: 'itsm_open_security_incidents', value: { open_high_priority: 12 }, collected_at: fresh }], now)
check('incidents map to RS.MA-01', !!fewInc['RS.MA-01'])
check('0 incidents grade 1.0, 12 grade 0', fewInc['RS.MA-01'].coverage === 1 && manyInc['RS.MA-01'].coverage === 0,
  `few=${fewInc['RS.MA-01'].coverage} many=${manyInc['RS.MA-01'].coverage}`)

// 2b. Jira feeds the same kind from a different source ⇒ still grades RS.MA-01.
const jira = mapEvidenceToControls([{ kind: 'itsm_open_security_incidents', value: { open_security_incidents: 3, open_high_priority: 1 }, collected_at: fresh, source_system: 'Jira' }], now)
check('Jira (same kind, Jira source) grades RS.MA-01 to 0.9', jira['RS.MA-01']?.sources[0]?.source === 'Jira' && Math.abs(jira['RS.MA-01'].coverage - 0.9) < 1e-9, JSON.stringify(jira['RS.MA-01']))

// 3. Log ingestion present ⇒ DE.CM-01 graded 1.0.
const siem = mapEvidenceToControls([{ kind: 'siem_log_ingestion', value: { log_ingestion_present: true, total_docs: 5000 }, collected_at: fresh }], now)
check('siem maps to DE.CM-01 graded 1.0', siem['DE.CM-01']?.coverage === 1)

// 3b. New signals: Defender Secure Score + Intune (→ PR.PS-01), Nessus (→ ID.RA-01).
const sscore = mapEvidenceToControls([{ kind: 'edr_secure_score', value: { ratio: 0.7 }, collected_at: fresh, source_system: 'Defender' }], now)
check('secure score maps to PR.PS-01 graded 0.7', Math.abs(sscore['PR.PS-01']?.coverage - 0.7) < 1e-9, JSON.stringify(sscore['PR.PS-01']))
const intune = mapEvidenceToControls([{ kind: 'mdm_device_compliance', value: { ratio: 0.9 }, collected_at: fresh }], now)
check('intune compliance also feeds PR.PS-01 (0.9)', intune['PR.PS-01']?.coverage === 0.9)
const vuln0 = mapEvidenceToControls([{ kind: 'vuln_findings', value: { critical: 0, high: 0 }, collected_at: fresh }], now)
const vulnMany = mapEvidenceToControls([{ kind: 'vuln_findings', value: { critical: 20, high: 10 }, collected_at: fresh }], now)
check('0 vulns ⇒ ID.RA-01 1.0; 20crit+10high ⇒ 0', vuln0['ID.RA-01'].coverage === 1 && vulnMany['ID.RA-01'].coverage === 0,
  `few=${vuln0['ID.RA-01'].coverage} many=${vulnMany['ID.RA-01'].coverage}`)

// 4. Unmapped evidence kind is ignored (no invented controls).
const unknown = mapEvidenceToControls([{ kind: 'totally_unknown_kind', value: { x: 1 }, collected_at: fresh }], now)
check('unmapped evidence ⇒ no controls', Object.keys(unknown).length === 0)

// 5. Stale evidence dampens CMMI vs fresh at the same coverage.
const stale = scoreFromGrade(0.95, 24 * 60) // 60 days
check('stale high coverage scores below fresh', stale.cmmi < highScore.cmmi, `stale=${stale.cmmi} fresh=${highScore.cmmi}`)

// 6. Multiple evidence for one control average; freshest age wins.
const multi = mapEvidenceToControls([
  { kind: 'identity_mfa_coverage', value: { coverage_ratio: 1.0 }, collected_at: '2026-06-20T12:00:00Z', source_system: 'Okta' },
  { kind: 'identity_mfa_coverage', value: { coverage_ratio: 0.5 }, collected_at: fresh, source_system: 'Entra' },
], now)
check('multi-evidence averages coverage (0.75)', Math.abs(multi['PR.AA-05'].coverage - 0.75) < 1e-9, `${multi['PR.AA-05'].coverage}`)
check('multi-evidence takes freshest age (~1h)', multi['PR.AA-05'].ageHours < 2, `${multi['PR.AA-05'].ageHours}`)

// 7. Determinism.
const d1 = mapEvidenceToControls([{ kind: 'identity_mfa_coverage', value: { coverage_ratio: 0.7 }, collected_at: fresh }], now)
const d2 = mapEvidenceToControls([{ kind: 'identity_mfa_coverage', value: { coverage_ratio: 0.7 }, collected_at: fresh }], now)
check('deterministic mapping', JSON.stringify(d1) === JSON.stringify(d2))
check('map covers all shipped adapter kinds', Object.keys(EVIDENCE_CONTROL_MAP).length >= 6)

console.log(failures === 0 ? '\n✅ MAPPING PROOF: all checks passed' : `\n❌ ${failures} check(s) failed`)
process.exit(failures === 0 ? 0 : 1)
