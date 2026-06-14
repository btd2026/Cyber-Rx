'use strict';

/**
 * assessment_type backfill mapping — pure function, offline.
 * Maps a control framework requirement's catalog test flag to its assessment_type.
 */

const { assessmentTypeFor } = require('../../src/ingest/seedReferenceModel');

describe('assessmentTypeFor', () => {
  test('auto -> automated', () => {
    expect(assessmentTypeFor({ framework_id: 'nist_csf_2', meta: { test: 'auto' } })).toBe('automated');
  });
  test('manual -> manual', () => {
    expect(assessmentTypeFor({ framework_id: 'nist_csf_2', meta: { test: 'manual' } })).toBe('manual');
  });
  test('partial -> hybrid', () => {
    expect(assessmentTypeFor({ framework_id: 'nist_csf_2', meta: { test: 'partial' } })).toBe('hybrid');
  });
  test('missing test flag defaults to hybrid', () => {
    expect(assessmentTypeFor({ framework_id: 'nist_800_53_r5', meta: {} })).toBe('hybrid');
    expect(assessmentTypeFor({ framework_id: 'cis_v8_1' })).toBe('hybrid');
  });
  test('handles meta provided as a JSON string', () => {
    expect(assessmentTypeFor({ framework_id: 'nist_csf_2', meta: '{"test":"auto"}' })).toBe('automated');
  });
});
