'use strict';

/**
 * Design-effectiveness (auditor document review) tests. Proves the engine finds
 * where each control-objective criterion is covered, judges appropriateness,
 * concludes design effectiveness, and never claims operating effectiveness.
 */

const design = require('../../src/control-assessment/design');
const { DESIGN_STATUS, COVERAGE } = design;

// A strong Access Control Policy that addresses every AC-1 criterion appropriately.
const STRONG_AC_POLICY = `
Access Control Policy
Purpose and Scope: This policy establishes access control requirements and applies to all employees and information systems.
Roles and Responsibilities: The System Owner is accountable; administrators are responsible for provisioning.
Access follows the principle of least privilege and need-to-know.
All access must be approved by the resource owner prior to being granted.
Access reviews (recertification) are performed at least annually.
Upon termination or role change, access is revoked immediately (same day).
This policy is reviewed and updated annually.
`;

// A weak policy that mentions topics but lacks the specifics an auditor expects.
const WEAK_AC_POLICY = `
Access Policy
We control access to systems. Users get roles. Access can be reviewed. We remove access when people leave.
`;

describe('design-effectiveness review (auditor document test)', () => {
  test('a strong policy is judged Design Effective with located, appropriate coverage', () => {
    const r = design.reviewById('AC-1', STRONG_AC_POLICY, { document_name: 'Access Control Policy.pdf', document_type: 'Access Control Policy' });
    expect(r.status).toBe(DESIGN_STATUS.EFFECTIVE);
    expect(r.evidence_layer).toBe('Design');
    // every criterion has a location excerpt when covered, and required ones are Covered
    const lp = r.criteria.find((c) => c.criterion_id === 'least_privilege');
    expect(lp.coverage).toBe(COVERAGE.COVERED);
    expect(lp.location).toBeTruthy();
    expect(lp.location.excerpt).toMatch(/least privilege/i);
    const rev = r.criteria.find((c) => c.criterion_id === 'review_cadence');
    expect(rev.coverage).toBe(COVERAGE.COVERED);
    expect(rev.appropriate).toBe(true);
  });

  test('a vague policy is Partially Effective — topics present but inadequate', () => {
    const r = design.reviewById('AC-1', WEAK_AC_POLICY);
    expect(r.status).toBe(DESIGN_STATUS.PARTIAL);
    // least privilege is NOT mentioned → Not Covered
    const lp = r.criteria.find((c) => c.criterion_id === 'least_privilege');
    expect(lp.coverage).toBe(COVERAGE.NOT_COVERED);
    // review is mentioned but with no cadence → Inadequate
    const rev = r.criteria.find((c) => c.criterion_id === 'review_cadence');
    expect(rev.coverage).toBe(COVERAGE.INADEQUATE);
    expect(rev.appropriate).toBe(false);
    // revocation mentioned but no timeframe → Inadequate
    const revoke = r.criteria.find((c) => c.criterion_id === 'revocation');
    expect([COVERAGE.INADEQUATE, COVERAGE.NOT_COVERED]).toContain(revoke.coverage);
  });

  test('no document → No Document Provided, never Effective', () => {
    const r = design.reviewById('AC-1', '');
    expect(r.status).toBe(DESIGN_STATUS.NO_DOCUMENT);
    expect(r.design_effectiveness_score).toBe(0);
    expect(r.criteria.every((c) => c.coverage === COVERAGE.NOT_COVERED)).toBe(true);
  });

  test('design review never claims operating effectiveness', () => {
    const r = design.reviewById('AC-1', STRONG_AC_POLICY);
    expect(r.what_the_review_does_not_prove).toMatch(/operating effectiveness/i);
    expect(r.evidence_layer).toBe('Design');
    // status vocabulary is design-scoped, not the telemetry "Effective"
    expect(r.status).not.toBe('Effective');
  });

  test('checklist is available without a document (what the engine will look for)', () => {
    const c = design.checklist('IR-1');
    expect(c.control_id).toBe('IR-1');
    expect(c.criteria.length).toBeGreaterThan(2);
    expect(c.criteria[0]).toHaveProperty('expectation');
  });

  test('criteria are framework-native (each control carries its own framework)', () => {
    const seen = {};
    design.CONTROL_KEYS.forEach((k) => { const d = design.CRITERIA[k]; seen[d.framework] = (seen[d.framework] || 0) + 1; });
    // spans multiple frameworks, each defined independently
    expect(Object.keys(seen).length).toBeGreaterThanOrEqual(4);
  });

  test('excerpt points to the real location in the document', () => {
    const r = design.reviewById('CP-1', 'Contingency Plan. Purpose and scope apply to all. The recovery coordinator leads. RTO is 4 hours and RPO is 60 minutes. Backups are immutable and daily. The plan is tested annually.');
    const rto = r.criteria.find((c) => c.criterion_id === 'rto_rpo');
    expect(rto.coverage).toBe(COVERAGE.COVERED);
    expect(rto.location.excerpt).toMatch(/rto|recovery/i);
  });
});
