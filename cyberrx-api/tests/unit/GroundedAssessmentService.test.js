'use strict';

/**
 * GroundedAssessmentService unit tests — embed/search/anthropic are injected, so
 * the pre-filter, grounded judgment, and the §1 evidence guardrail are tested
 * with no DB, vector store, or network.
 */

const GA = require('../../src/services/assessment/GroundedAssessmentService');

const CONTROL = {
  control_id: 'AC-2', framework: 'NIST_SP_800-53', framework_version: '5.2.0',
  control_nature: 'automated_capable',
};
const OBJ = { objective_id: 'AC-02f.[01]', determination_statement: 'dormant accounts are disabled after a defined period.' };
const CHUNK = { section_ref: '§2.2', heading: 'Access Reviews', text: 'Dormant accounts inactive for 45 days are automatically disabled.', similarity: 0.82 };

const embedOk = async () => [0.1, 0.2, 0.3];
const searchHit = async () => [CHUNK];
const searchLow = async () => [{ ...CHUNK, similarity: 0.30 }];
const searchNone = async () => [];
const anthropicReturning = (obj) => ({ messages: { create: jest.fn(async () => ({ content: [{ type: 'text', text: JSON.stringify(obj) }] })) } });

describe('buildJudgeRequest', () => {
  test('caches the stable prefix and puts dynamic content last', () => {
    const req = GA.buildJudgeRequest(OBJ, [CHUNK], {});
    expect(req.system).toHaveLength(2);
    req.system.forEach((blk) => expect(blk.cache_control).toEqual({ type: 'ephemeral' }));
    const user = req.messages[0].content;
    expect(user).toContain(OBJ.determination_statement);   // dynamic
    expect(user).toContain('§2.2');                          // retrieved evidence
    expect(req.model).toBeTruthy();
  });
});

describe('validateVerdict (the guardrail)', () => {
  test('passes a positive verdict whose quote is grounded in the excerpts', () => {
    const v = GA.validateVerdict({ status: 'Fully addressed', evidence: [{ quote: 'dormant accounts inactive for 45 days are automatically disabled', section_ref: '§2.2' }] }, [CHUNK]);
    expect(v.valid).toBe(true); expect(v.status).toBe('Fully addressed'); expect(v.evidence).toHaveLength(1);
  });
  test('rejects a positive verdict with empty evidence', () => {
    const v = GA.validateVerdict({ status: 'Fully addressed', evidence: [] }, [CHUNK]);
    expect(v.valid).toBe(false); expect(v.reason).toMatch(/empty evidence/);
  });
  test('rejects a positive verdict whose quote is NOT in the excerpts (hallucination)', () => {
    const v = GA.validateVerdict({ status: 'Partially addressed', evidence: [{ quote: 'we rotate accounts via blockchain', section_ref: '§9' }] }, [CHUNK]);
    expect(v.valid).toBe(false); expect(v.reason).toMatch(/grounded/);
  });
  test('Not addressed is always valid with empty evidence', () => {
    const v = GA.validateVerdict({ status: 'Not addressed', evidence: [{ quote: 'x', section_ref: 'y' }] }, [CHUNK]);
    expect(v.valid).toBe(true); expect(v.evidence).toEqual([]);
  });
});

describe('assessObjective — pre-filter (no LLM)', () => {
  test('below similarity threshold => Not addressed with ZERO LLM calls', async () => {
    const anthropic = anthropicReturning({ status: 'Fully addressed' });
    const r = await GA.assessObjective('o', 'u', CONTROL, OBJ, { embed: embedOk, search: searchLow, anthropic });
    expect(r.status).toBe('Not addressed');
    expect(r.assessment_method).toBe('embedding_prefilter');
    expect(r.evidence).toEqual([]);
    expect(anthropic.messages.create).not.toHaveBeenCalled();
  });
  test('no retrieved chunks => Not addressed, no LLM', async () => {
    const anthropic = anthropicReturning({ status: 'Fully addressed' });
    const r = await GA.assessObjective('o', 'u', CONTROL, OBJ, { embed: embedOk, search: searchNone, anthropic });
    expect(r.status).toBe('Not addressed');
    expect(anthropic.messages.create).not.toHaveBeenCalled();
  });
});

describe('assessObjective — grounded judgment', () => {
  test('grounded positive verdict is accepted with quoted evidence + OE handoff', async () => {
    const anthropic = anthropicReturning({
      status: 'Fully addressed', confidence: 0.9,
      evidence: [{ quote: 'Dormant accounts inactive for 45 days are automatically disabled.', section_ref: '§2.2' }],
      gap_description: '', remediation_suggestion: '',
    });
    const r = await GA.assessObjective('o', 'u', CONTROL, OBJ, { embed: embedOk, search: searchHit, anthropic });
    expect(r.status).toBe('Fully addressed');
    expect(r.assessment_method).toBe('llm');
    expect(r.evidence[0].section_ref).toBe('§2.2');
    expect(r.control_id).toBe('AC-02f.[01]');
    expect(r.framework_version).toBe('5.2.0');
    // operating-effectiveness handoff is always recorded + typed by nature
    expect(r.operating_effectiveness_evidence_type).toBe('system_signal'); // automated_capable
    expect(r.operating_effectiveness_note).toMatch(/operating-effectiveness/i);
    expect(anthropic.messages.create).toHaveBeenCalledTimes(1);
  });

  test('positive verdict with empty evidence is rejected, retried, then forced to Not addressed', async () => {
    const anthropic = anthropicReturning({ status: 'Fully addressed', evidence: [] });
    const r = await GA.assessObjective('o', 'u', CONTROL, OBJ, { embed: embedOk, search: searchHit, anthropic });
    expect(r.status).toBe('Not addressed');     // never infer compliance
    expect(r.evidence).toEqual([]);
    expect(anthropic.messages.create).toHaveBeenCalledTimes(2); // re-routed once
  });

  test('ungrounded (hallucinated) quote is rejected and forced to Not addressed', async () => {
    const anthropic = anthropicReturning({ status: 'Partially addressed', evidence: [{ quote: 'accounts are rotated via blockchain', section_ref: '§9' }] });
    const r = await GA.assessObjective('o', 'u', CONTROL, OBJ, { embed: embedOk, search: searchHit, anthropic });
    expect(r.status).toBe('Not addressed');
  });

  test('procedural control gets an attestation_record OE type', async () => {
    const anthropic = anthropicReturning({ status: 'Not addressed' });
    const proc = { ...CONTROL, control_nature: 'non_automated_procedural' };
    const r = await GA.assessObjective('o', 'u', proc, OBJ, { embed: embedOk, search: searchHit, anthropic });
    expect(r.operating_effectiveness_evidence_type).toBe('attestation_record');
  });

  test('evidence retrieved but no model available => manual-review Not addressed (no false positive)', async () => {
    const r = await GA.assessObjective('o', 'u', CONTROL, OBJ, { embed: embedOk, search: searchHit, anthropic: null });
    expect(r.status).toBe('Not addressed');
    expect(r.gap_description).toMatch(/manual review/i);
  });
});

describe('assessControl', () => {
  test('assesses every determination statement of a control', async () => {
    const ctrl = { ...CONTROL, assessment_objectives: [OBJ, { objective_id: 'AC-02g', determination_statement: 'privileged accounts are reviewed.' }] };
    const anthropic = anthropicReturning({ status: 'Not addressed' });
    const recs = await GA.assessControl('o', 'u', ctrl, { embed: embedOk, search: searchLow, anthropic });
    expect(recs).toHaveLength(2);
    expect(recs.map((r) => r.control_id)).toEqual(['AC-02f.[01]', 'AC-02g']);
  });
});
