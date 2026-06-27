'use strict';

/** Stage 6: rollup (objective -> control) + crosswalk propagation (spine -> CSF). */

const Rollup = require('../../src/services/assessment/RollupService');
const Prop = require('../../src/services/assessment/CrosswalkPropagationService');

const objRec = (parent, oid, status, evidence = []) => ({
  control_id: oid, parent_control_id: parent, framework: 'NIST_SP_800-53', framework_version: '5.2.0',
  control_nature: 'automated_capable', status, confidence: 0.9, evidence,
});
const EV = (q, ref) => ({ quote: q, section_ref: ref });

describe('RollupService.rollup', () => {
  test('all-full -> Fully; mix -> Partially; none -> Not addressed; unions evidence', () => {
    const recs = [
      objRec('AC-2', 'AC-02a', 'Fully addressed', [EV('a', '§1')]),
      objRec('AC-2', 'AC-02b', 'Not addressed', []),
      objRec('AU-2', 'AU-02a', 'Fully addressed', [EV('x', '§5')]),
      objRec('AU-2', 'AU-02b', 'Fully addressed', [EV('x', '§5')]), // dup evidence
    ];
    const v = Rollup.rollup(recs);
    expect(v['AC-2'].status).toBe('Partially addressed');
    expect(v['AC-2'].evidence).toHaveLength(1);
    expect(v['AU-2'].status).toBe('Fully addressed');
    expect(v['AU-2'].evidence).toHaveLength(1); // de-duped
    expect(v['AU-2'].objectives_total).toBe(2);
  });
  test('rollupStatus edge cases', () => {
    expect(Rollup.rollupStatus(['Not applicable', 'Not applicable'])).toBe('Not applicable');
    expect(Rollup.rollupStatus(['Fully addressed', 'Not applicable'])).toBe('Fully addressed');
    expect(Rollup.rollupStatus(['Not addressed', 'Not addressed'])).toBe('Not addressed');
  });
});

describe('CrosswalkPropagationService.propagate', () => {
  const verdicts = {
    'AC-2': { control_id: 'AC-2', status: 'Fully addressed', confidence: 0.9, evidence: [EV('Dormant accounts disabled', '§2.2')] },
    'AU-6': { control_id: 'AU-6', status: 'Partially addressed', confidence: 0.7, evidence: [EV('Logs reviewed weekly', '§5')] },
  };
  const spineCorpus = {
    'AC-2': { crosswalk: { 'NIST_CSF_2.0': [{ control_id: 'PR.AA-01', mapping: 'full' }] } },
    'AU-6': { crosswalk: { 'NIST_CSF_2.0': [{ control_id: 'DE.AE-02', mapping: 'partial' }] } },
  };
  const csfCorpus = {
    'PR.AA-01': { control_nature: 'automated_capable', framework_version: '2.0', requirement_text: 'Identities and credentials are managed.' },
    'DE.AE-02': { control_nature: 'hybrid', framework_version: '2.0', requirement_text: 'Detected events are analyzed.' },
  };

  test('FULL mapping propagates the spine verdict directly with NO model call', async () => {
    const anthropic = { messages: { create: jest.fn() } };
    const recs = await Prop.propagate(verdicts, { spineCorpus, csfCorpus, anthropic });
    const pr = recs.find((r) => r.control_id === 'PR.AA-01');
    expect(pr.status).toBe('Fully addressed');
    expect(pr.assessment_method).toBe('propagated');
    expect(pr.propagated_from).toBe('AC-2');
    expect(pr.evidence[0].section_ref).toBe('§2.2');
    // the model was only (possibly) used for the partial control, never the full one
    expect(anthropic.messages.create).toHaveBeenCalledTimes(1);
  });

  test('PARTIAL mapping re-invokes the model on the CSF outcome (guardrail applies)', async () => {
    const anthropic = { messages: { create: jest.fn(async () => ({ content: [{ type: 'text', text: JSON.stringify({ status: 'Partially addressed', confidence: 0.6, evidence: [{ quote: 'Logs reviewed weekly', section_ref: '§5' }], gap_description: 'no automated correlation' }) }] })) } };
    const recs = await Prop.propagate(verdicts, { spineCorpus, csfCorpus, anthropic });
    const de = recs.find((r) => r.control_id === 'DE.AE-02');
    expect(de.status).toBe('Partially addressed');
    expect(de.propagated_from).toBe('AU-6');
    expect(de.evidence[0].quote).toBe('Logs reviewed weekly');
  });

  test('PARTIAL mapping with no model is routed to review, never inferred compliant', async () => {
    const recs = await Prop.propagate(verdicts, { spineCorpus, csfCorpus, anthropic: null });
    const de = recs.find((r) => r.control_id === 'DE.AE-02');
    expect(de.status).toBe('Not addressed');
    expect(de.needs_review).toBe(true);
    // full mapping still propagates without a model
    expect(recs.find((r) => r.control_id === 'PR.AA-01').status).toBe('Fully addressed');
  });

  test('PARTIAL re-judge with an ungrounded quote is forced to Not addressed', async () => {
    const anthropic = { messages: { create: jest.fn(async () => ({ content: [{ type: 'text', text: JSON.stringify({ status: 'Fully addressed', evidence: [{ quote: 'we use AI magic', section_ref: '§9' }] }) }] })) } };
    const recs = await Prop.propagate(verdicts, { spineCorpus, csfCorpus, anthropic });
    expect(recs.find((r) => r.control_id === 'DE.AE-02').status).toBe('Not addressed');
  });
});
