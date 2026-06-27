'use strict';

/**
 * AssessmentPipelineService — capstone wiring test. Runs the full pipeline with
 * injected chunks/corpus/embed/search/batch-client/anthropic and persist OFF, so
 * the real Rollup/Propagation/Reverse/Reconcile/Report compose end-to-end with
 * no DB or network.
 */

const Pipeline = require('../../src/services/assessment/AssessmentPipelineService');

const spineControls = [{
  control_id: 'AC-2', framework: 'NIST_SP_800-53', framework_version: '5.2.0', control_nature: 'automated_capable',
  crosswalk: { 'NIST_CSF_2.0': [{ control_id: 'PR.AA-01', mapping: 'full' }] },
  assessment_objectives: [
    { objective_id: 'AC-02a', determination_statement: 'dormant accounts are disabled after a defined period' },
    { objective_id: 'AC-02z', determination_statement: 'a quantum log is maintained' }, // absent -> prefiltered
  ],
}];
const csfControls = [{ control_id: 'PR.AA-01', framework: 'NIST_CSF_2.0', framework_version: '2.0', control_nature: 'automated_capable' }];
const chunks = [{ section_ref: '§2.2', text: 'Dormant accounts inactive for 45 days are automatically disabled.' }];

const embed = async () => [0.1];
const search = (() => { let n = 0; return async () => (n++ === 0 ? [{ section_ref: '§2.2', text: 'Dormant accounts inactive for 45 days are automatically disabled.', similarity: 0.8 }] : []); })();
const batchClient = {
  create: async ({ requests }) => ({ id: 'b1', processing_status: 'ended', _n: requests.length }),
  retrieve: async () => ({ processing_status: 'ended' }),
  results: async () => (async function* () {
    yield { custom_id: 'AC-2::AC-02a', result: { type: 'succeeded', message: { content: [{ type: 'text', text: JSON.stringify({ status: 'Fully addressed', confidence: 0.9, evidence: [{ quote: 'Dormant accounts inactive for 45 days are automatically disabled.', section_ref: '§2.2' }] }) }], usage: { input_tokens: 50, output_tokens: 10, cache_read_input_tokens: 400 } } } };
  })(),
};
// anthropic used for verify + reverse pass + (no escalation needed here)
const anthropic = { messages: { create: async (req) => {
  const c = req.messages[0].content;
  if (c.includes('CLAIMED STATUS')) return { content: [{ type: 'text', text: '{"supported":true}' }], usage: { input_tokens: 5, output_tokens: 2 } };
  if (c.includes('POLICY TEXT')) return { content: [{ type: 'text', text: '{"controls":["AC-2"]}' }] }; // reverse pass
  return { content: [{ type: 'text', text: '{}' }] };
} } };

describe('AssessmentPipelineService.run', () => {
  test('composes spine -> rollup -> propagate -> reverse -> reconcile -> report', async () => {
    const { report, usage, records } = await Pipeline.run('org', 'up', {
      persist: false, scanId: 'scan_x', generatedAt: '2026-06-27',
      deps: { chunks, spineControls, csfControls, embed, search, batchClient, anthropic, sleep: async () => {} },
    });

    // scorecards for both frameworks
    expect(report.frameworks['NIST_SP_800-53']).toBeTruthy();
    expect(report.frameworks['NIST_CSF_2.0']).toBeTruthy();
    // AC-2 rolled up to Partially (one objective addressed, one prefiltered Not addressed)
    const spineRec = records.find((r) => r.control_id === 'AC-2');
    expect(spineRec.status).toBe('Partially addressed');
    // full-mapping propagation produced a CSF record from AC-2
    const csfRec = records.find((r) => r.control_id === 'PR.AA-01');
    expect(csfRec.framework).toBe('NIST_CSF_2.0');
    expect(csfRec.assessment_method).toBe('propagated');
    // evidence-linked findings cite the policy section
    expect(report.findings.some((f) => f.evidence.some((e) => e.section_ref === '§2.2'))).toBe(true);
    // cost telemetry captured
    expect(usage.est_cost_usd).toBeGreaterThan(0);
    expect(report.coverage_caveat).toMatch(/DESIGN \/ DOCUMENTATION/);
  });
});
