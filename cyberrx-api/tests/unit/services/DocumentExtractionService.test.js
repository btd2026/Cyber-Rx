'use strict';

jest.mock('../../../src/utils/db', () => ({ query: jest.fn() }));
jest.mock('../../../src/services/DocumentPipelineService', () => ({ processUpload: jest.fn() }));
jest.mock('../../../src/services/EvidenceLedgerService', () => ({ recordForRequirement: jest.fn() }));

const ext = require('../../../src/services/DocumentExtractionService');

describe('DocumentExtractionService heuristics', () => {
  it('extracts owner, effective date, cadence and next review', () => {
    const text = 'Information Security Policy. Effective 2025-01-01. Owner: VP of Security. Reviewed annually. Next review by 2026-01-01.';
    const out = ext.heuristicExtract(text, 'Information Security Policy');
    expect(out.owner).toBe('VP of Security');
    expect(out.effective_date).toBe('2025-01-01');
    expect(out.review_cadence_months).toBe(12);
    expect(out.next_review_date).toBe('2026-01-01');
    expect(out.engine).toBe('heuristic');
  });

  it('maps cadence words to months', () => {
    expect(ext.reviewCadenceMonths('reviewed quarterly')).toBe(3);
    expect(ext.reviewCadenceMonths('every six months')).toBe(6);
    expect(ext.reviewCadenceMonths('on an annual basis')).toBe(12);
    expect(ext.reviewCadenceMonths('no cadence stated')).toBeNull();
  });

  it('stops owner capture at sentence and connective boundaries', () => {
    expect(ext.ownerGuess('owned by the Chief Information Security Officer and reviewed quarterly'))
      .toBe('the Chief Information Security Officer');
    expect(ext.ownerGuess('Approved by Jane Doe on Jan 5, 2025.')).toBe('Jane Doe');
  });

  it('returns null owner when no owner phrase is present', () => {
    expect(ext.ownerGuess('This document describes encryption standards.')).toBeNull();
  });
});
