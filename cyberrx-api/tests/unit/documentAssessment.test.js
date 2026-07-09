'use strict';

/**
 * Document control assessment — the 20 required guarantees.
 *
 * These lock the conservative behavior of the document engine: existence is not
 * effectiveness, design and operating evidence stay separate, wrong/expired/
 * unreadable documents never pass, classification is content-driven, citations
 * are required for design coverage, and re-assessment fires on real changes.
 */

const {
  classify, assessDocument, scoreDocument, getRequirement, allRequirements,
  hashText, reassess, shouldReassess, combineEvidence, DOC_STATUS, EVIDENCE_LAYER,
  REASSESS_TRIGGER,
} = require('../../src/control-assessment/documents');

// ---- fixtures ----------------------------------------------------------------
const IR_PLAN = `Incident Response Plan. Document owner: CISO. This policy states its
purpose and scope and applies to all employees and systems. Roles and responsibilities are
assigned; the CISO is accountable. It defines the incident response lifecycle: detect, contain,
eradicate, and recover. Incident severity levels are defined (P1 critical/high/medium). Escalation
procedures are described. Internal and external communication procedures cover regulators and
customers. Coordination with legal, privacy and compliance is required. Evidence preservation and
chain of custody are covered. A lessons-learned / post-incident process is defined.`;

const TABLETOP = `Tabletop Exercise Report. Scenario: ransomware. Exercise findings and lessons
learned are documented. After-action report with remediation items. Conducted 2026-05-01.`;

const BACKUP_POLICY = `Backup and Recovery Procedure. Owner: Infrastructure. Purpose and scope
defined; applies to all critical systems. Roles and responsibilities assigned. Backup schedule is
daily. Backups are immutable and stored offsite, encrypted. Restore procedure is documented.`;

const RESTORE_TEST = `Restore Test Report. A recovery test was performed on 2026-06-10. Integrity
verified. Test failover result: pass. Data restored successfully.`;

const meta = (over) => Object.assign({
  owner: 'CISO', approval_date: '2026-01-01', effective_date: '2026-01-01', last_review_date: '2026-01-01',
}, over || {});
const NOW = new Date('2026-07-01').getTime();

// ---- 1. registry is framework-native, keyed per control ----------------------
test('1. requirement registry is keyed by framework:control and returns own requirements', () => {
  const r = getRequirement('nist_800_53_rev5', 'IR-8');
  expect(r).toBeTruthy();
  expect(r.framework).toMatch(/800-53/);
  expect(r.required_document_types).toContain('Incident Response Plan');
  expect(getRequirement('nist_csf_2_0', 'IR-8')).toBeNull(); // not derived across frameworks
});

// ---- 2. classification is content-driven -------------------------------------
test('2. classify detects the document type from content, not the client label', () => {
  const c = classify(IR_PLAN, 'random-name.txt');
  expect(c.type).toBe('Incident Response Plan');
  expect(c.confidence).toBeGreaterThan(0);
});

// ---- 3. wrong-type detection -------------------------------------------------
test('3. a document that classifies as another type is flagged wrong for the selected control', () => {
  const r = assessDocument({ framework_key: 'nist_800_53_rev5', control_id: 'CP-9', text: IR_PLAN, fileName: 'ir.txt', metadata: meta(), now: NOW });
  expect(r.status).toBe(DOC_STATUS.WRONG_TYPE);
  expect(r.control_design_score).toBe(0);
});

// ---- 4. extraction failure → Not Enough Evidence, never a pass ---------------
test('4. unreadable document → Not Enough Evidence with zero scores', () => {
  const r = assessDocument({ framework_key: 'nist_800_53_rev5', control_id: 'IR-8', text: '', extraction_failed: true, metadata: meta(), now: NOW });
  expect(r.status).toBe(DOC_STATUS.NOT_ENOUGH);
  expect(r.control_design_score).toBe(0);
  expect(r.operating_effectiveness_score).toBe(0);
});

// ---- 5. document existence is NOT effectiveness ------------------------------
test('5. a good design document alone never yields operating effectiveness', () => {
  const r = assessDocument({ framework_key: 'nist_800_53_rev5', control_id: 'IR-8', text: IR_PLAN, fileName: 'ir.txt', metadata: meta(), now: NOW });
  expect(r.design_threshold_met).toBe(true);
  expect(r.has_operating_evidence).toBe(false);
  expect(r.operating_effectiveness_score).toBe(0);
  expect(r.status).toBe(DOC_STATUS.NEEDS_SUPPORTING);
});

// ---- 6. design elements produce citations ------------------------------------
test('6. covered design elements carry page/section citations', () => {
  const r = assessDocument({ framework_key: 'nist_800_53_rev5', control_id: 'IR-8', text: IR_PLAN, fileName: 'ir.txt', metadata: meta(), now: NOW });
  expect(r.citations.length).toBeGreaterThan(0);
  r.citations.forEach((c) => { expect(typeof c.char_index).toBe('number'); expect(c.excerpt.length).toBeGreaterThan(0); });
});

// ---- 7. no "Satisfies" without operating evidence + metadata -----------------
test('7. Satisfies Requirement requires design + operating evidence + complete metadata', () => {
  const r = assessDocument({
    framework_key: 'nist_800_53_rev5', control_id: 'IR-8', text: IR_PLAN, fileName: 'ir.txt',
    metadata: meta(), supportingDocuments: [{ type: 'Tabletop Exercise Report', text: TABLETOP, fileName: 'tt.txt', date: '2026-05-01' }],
    now: NOW,
  });
  expect(r.has_operating_evidence).toBe(true);
  expect(r.status).toBe(DOC_STATUS.SATISFIES);
  expect(r.operating_effectiveness_score).toBeGreaterThanOrEqual(0.9);
});

// ---- 8. operating evidence must be the RIGHT record type ---------------------
test('8. a policy passed as supporting evidence does not count as operating evidence', () => {
  const r = assessDocument({
    framework_key: 'nist_800_53_rev5', control_id: 'IR-8', text: IR_PLAN, fileName: 'ir.txt',
    metadata: meta(), supportingDocuments: [{ type: 'Information Security Policy', text: IR_PLAN, fileName: 'p.txt', date: '2026-05-01' }],
    now: NOW,
  });
  expect(r.has_operating_evidence).toBe(false);
});

// ---- 9. backup: restore-test required for operating --------------------------
test('9. backup policy alone is design-only; restore-test report unlocks operating', () => {
  const designOnly = assessDocument({ framework_key: 'nist_800_53_rev5', control_id: 'CP-9', text: BACKUP_POLICY, fileName: 'backup.txt', metadata: meta(), now: NOW });
  expect(designOnly.status).toBe(DOC_STATUS.NEEDS_SUPPORTING);
  expect(designOnly.operating_effectiveness_score).toBe(0);
  const withRestore = assessDocument({
    framework_key: 'nist_800_53_rev5', control_id: 'CP-9', text: BACKUP_POLICY, fileName: 'backup.txt', metadata: meta(),
    supportingDocuments: [{ type: 'Restore Test Report', text: RESTORE_TEST, fileName: 'rt.txt', date: '2026-06-10' }], now: NOW,
  });
  expect(withRestore.has_operating_evidence).toBe(true);
  expect(withRestore.status).toBe(DOC_STATUS.SATISFIES);
});

// ---- 10. expired/stale documents are capped ----------------------------------
test('10. an expired document is marked Expired/Stale and discounted', () => {
  const r = assessDocument({
    framework_key: 'nist_800_53_rev5', control_id: 'IR-8', text: IR_PLAN, fileName: 'ir.txt',
    metadata: meta({ effective_date: '2023-01-01', approval_date: '2023-01-01', last_review_date: '2023-01-01' }), now: NOW,
  });
  expect(r.expired).toBe(true);
  expect(r.status).toBe(DOC_STATUS.EXPIRED);
  expect(r.control_design_score).toBeLessThanOrEqual(0.40);
  expect(r.operating_effectiveness_score).toBe(0);
});

// ---- 11. missing metadata caps the design score ------------------------------
test('11. missing approval/owner/review caps design at 0.60 and blocks Satisfies', () => {
  const r = assessDocument({
    framework_key: 'nist_800_53_rev5', control_id: 'IR-8', text: IR_PLAN, fileName: 'ir.txt',
    metadata: { owner: null, approval_date: null, effective_date: '2026-01-01', last_review_date: null }, now: NOW,
  });
  expect(r.control_design_score).toBeLessThanOrEqual(0.60);
  expect([DOC_STATUS.NEEDS_SUPPORTING, DOC_STATUS.PARTIALLY]).toContain(r.status);
});

// ---- 12. partial design coverage → Partially / Does Not ----------------------
test('12. a document missing required design elements does not satisfy design', () => {
  const thin = 'This incident policy exists. Owner: CISO. Approved.';
  const r = assessDocument({ framework_key: 'nist_800_53_rev5', control_id: 'IR-8', text: thin, fileName: 'thin.txt', metadata: meta(), now: NOW });
  expect(r.design_threshold_met).toBe(false);
  expect([DOC_STATUS.PARTIALLY, DOC_STATUS.DOES_NOT]).toContain(r.status);
});

// ---- 13. scoring bands are conservative & monotonic --------------------------
test('13. scoring bands: exists < elements < metadata < operating < remediated', () => {
  const exists = scoreDocument({ exists: true });
  const elements = scoreDocument({ exists: true, design_threshold_met: true });
  const full = scoreDocument({ exists: true, design_threshold_met: true, approved: true, current: true, has_owner: true, reviewed: true });
  const oper = scoreDocument({ exists: true, design_threshold_met: true, approved: true, current: true, has_owner: true, reviewed: true, operating_evidence: true });
  const rem = scoreDocument({ exists: true, design_threshold_met: true, approved: true, current: true, has_owner: true, reviewed: true, operating_evidence: true, findings_remediated: true });
  expect(exists.control_design_score).toBe(0.25);
  expect(elements.control_design_score).toBe(0.60);
  expect(full.control_design_score).toBe(0.75);
  expect(oper.operating_effectiveness_score).toBe(0.90);
  expect(rem.operating_effectiveness_score).toBe(1.0);
});

// ---- 14. wrong type and extraction fail score 0 in scoring -------------------
test('14. wrong type and extraction failure both score 0', () => {
  expect(scoreDocument({ exists: true, wrong_document_type: true }).overall_score).toBe(0);
  expect(scoreDocument({ extraction_failed: true }).overall_score).toBe(0);
});

// ---- 15. operating stays 0 without operating evidence, even at full metadata --
test('15. operating_effectiveness_score is 0 unless operating evidence exists', () => {
  const s = scoreDocument({ exists: true, design_threshold_met: true, approved: true, current: true, has_owner: true, reviewed: true });
  expect(s.operating_effectiveness_score).toBe(0);
});

// ---- 16. content hashing is stable & change-detecting ------------------------
test('16. hashText is deterministic and detects content change', () => {
  expect(hashText('abc')).toBe(hashText('abc'));
  expect(hashText('abc')).not.toBe(hashText('abcd'));
});

// ---- 17. reassessment triggers on hash change --------------------------------
test('17. shouldReassess fires replace + hash_change when content hash differs', () => {
  const d = shouldReassess({ hash: 'a', active: true }, { hash: 'b', active: true });
  expect(d.reassess).toBe(true);
  expect(d.triggers).toContain(REASSESS_TRIGGER.HASH_CHANGE);
  expect(d.triggers).toContain(REASSESS_TRIGGER.REPLACE);
});

// ---- 18. reassessment triggers on expire, delete, upload ---------------------
test('18. shouldReassess fires on upload, delete and expiry', () => {
  expect(shouldReassess(null, { hash: 'a', active: true }).triggers).toContain(REASSESS_TRIGGER.UPLOAD);
  expect(shouldReassess({ hash: 'a', active: true }, null).triggers).toContain(REASSESS_TRIGGER.DELETE);
  expect(shouldReassess({ hash: 'a', active: true, expired: false }, { hash: 'a', active: true, expired: true }).triggers).toContain(REASSESS_TRIGGER.EXPIRE);
});

// ---- 19. reassess diffs old vs new verdict -----------------------------------
test('19. reassess produces a diff between prior and new assessment', () => {
  const prev = assessDocument({ framework_key: 'nist_800_53_rev5', control_id: 'IR-8', text: IR_PLAN, fileName: 'ir.txt', metadata: meta(), now: NOW });
  const ev = reassess({
    framework_key: 'nist_800_53_rev5', control_id: 'IR-8', text: IR_PLAN, fileName: 'ir.txt', metadata: meta(),
    supportingDocuments: [{ type: 'Tabletop Exercise Report', text: TABLETOP, fileName: 'tt.txt', date: '2026-05-01' }],
  }, prev, NOW);
  expect(ev.previous_status).toBe(DOC_STATUS.NEEDS_SUPPORTING);
  expect(ev.new_status).toBe(DOC_STATUS.SATISFIES);
  expect(ev.changed.operating_effectiveness_score).toBeTruthy();
});

// ---- 20. mixed evidence: telemetry OR record can supply operating ------------
test('20. combineEvidence lets telemetry supply operating effectiveness for a design-only doc', () => {
  const doc = assessDocument({ framework_key: 'nist_800_53_rev5', control_id: 'AC-6', text:
    'Access Control Policy. Owner: CISO. Purpose and scope apply to all users. Roles and responsibilities assigned. ' +
    'Requires least privilege and need-to-know. Periodic access reviews are performed annually. Approval by the owner is required before access is granted.',
    fileName: 'ac.txt', metadata: meta(), now: NOW });
  expect(doc.status).toBe(DOC_STATUS.NEEDS_SUPPORTING); // design only, no access-review record
  const telemetry = { control_id: 'AC-6', control_name: 'Least Privilege', assessment_status: 'Effective', evidence_layer: 'Operating Effectiveness', control_effectiveness_score: 1.0 };
  const merged = combineEvidence(telemetry, doc);
  expect(merged.operating_from).toBe('telemetry');
  expect(merged.status).toBe('Satisfies Requirement');
});

// ---- sanity: every requirement entry is well-formed --------------------------
test('registry entries are well-formed (types, elements, operating evidence, conditions)', () => {
  allRequirements().forEach((r) => {
    expect(Array.isArray(r.required_document_types)).toBe(true);
    expect(r.required_document_types.length).toBeGreaterThan(0);
    expect(Array.isArray(r.required_document_elements)).toBe(true);
    expect(typeof r.pass_conditions).toBe('string');
    expect(typeof r.what_not_to_infer).toBe('string');
  });
});
