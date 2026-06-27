'use strict';

/** Stage 7: reverse coverage pass + reconciliation + heatmap. */

const Reverse = require('../../src/services/assessment/ReverseCoverageService');
const Recon = require('../../src/services/assessment/ReconciliationService');

describe('ReverseCoverageService.runReverse', () => {
  const chunks = [
    { section_ref: '§2.2', text: 'User access is reviewed quarterly; dormant accounts disabled.' },
    { section_ref: '§3', text: 'Multi-factor authentication is required for remote access.' },
  ];
  const validIds = new Set(['AC-2', 'IA-2', 'AC-2(3)']);
  // mock model: returns ids per chunk, including one bogus id that must be filtered
  const anthropic = {
    messages: {
      create: jest.fn(async (req) => {
        const txt = req.messages[0].content;
        const controls = txt.includes('dormant') ? ['AC-2', 'XX-99'] : ['IA-2'];
        return { content: [{ type: 'text', text: JSON.stringify({ controls }) }] };
      }),
    },
  };

  test('maps chunks to corpus-valid controls and inverts to touchedByControl', async () => {
    const { chunkTouches, touchedByControl } = await Reverse.runReverse(chunks, { anthropic, validIds });
    expect(chunkTouches[0].controls).toEqual(['AC-2']); // XX-99 filtered (not in corpus)
    expect(chunkTouches[1].controls).toEqual(['IA-2']);
    expect(touchedByControl['AC-2']).toEqual(['§2.2']);
    expect(touchedByControl['IA-2']).toEqual(['§3']);
  });

  test('no model -> empty touches (no crash)', async () => {
    const { touchedByControl } = await Reverse.runReverse(chunks, { anthropic: null, validIds });
    expect(touchedByControl).toEqual({});
  });
});

describe('ReconciliationService.reconcile', () => {
  const verdicts = {
    'AC-2': { control_id: 'AC-2', status: 'Not addressed', confidence: 1 },
    'IA-2': { control_id: 'IA-2', status: 'Fully addressed', confidence: 0.95 },
    'AU-6': { control_id: 'AU-6', status: 'Fully addressed', confidence: 0.4 }, // low confidence
    'SC-7': { control_id: 'SC-7', status: 'Partially addressed', confidence: 0.9 }, // no doc touch
  };
  const touched = { 'AC-2': ['§2.2'], 'IA-2': ['§3'], 'PM-9': ['§7'] }; // PM-9 not assessed

  test('flags missed coverage, unsupported verdicts, low confidence, and unassessed touches', () => {
    const { conflicts } = Recon.reconcile(verdicts, touched, { lowConfidence: 0.5 });
    const byType = (t) => conflicts.filter((c) => c.type === t).map((c) => c.control_id);
    expect(byType('missed_coverage')).toEqual(expect.arrayContaining(['AC-2', 'PM-9']));
    expect(byType('unsupported_verdict')).toContain('SC-7'); // positive, no doc touch
    expect(byType('low_confidence')).toContain('AU-6');
    // IA-2 is positive AND touched AND high-confidence -> no conflict
    expect(conflicts.find((c) => c.control_id === 'IA-2')).toBeUndefined();
  });
});

describe('ReconciliationService.heatmap', () => {
  test('aggregates per family with coverage % and doc-touch counts', () => {
    const verdicts = {
      'AC-2': { control_id: 'AC-2', status: 'Fully addressed' },
      'AC-3': { control_id: 'AC-3', status: 'Partially addressed' },
      'AU-6': { control_id: 'AU-6', status: 'Not addressed' },
    };
    const touched = { 'AC-2': ['§1'], 'AU-6': ['§5'] };
    const hm = Recon.heatmap(verdicts, touched);
    const ac = hm.find((h) => h.family === 'AC');
    expect(ac.assessed).toBe(2); expect(ac.fully).toBe(1); expect(ac.partially).toBe(1);
    expect(ac.coverage_pct).toBe(75); // (1 + 0.5)/2
    expect(ac.doc_touched).toBe(1);
    const au = hm.find((h) => h.family === 'AU');
    expect(au.coverage_pct).toBe(0); expect(au.doc_touched).toBe(1);
  });
});
