'use strict';

/** Stage 8: report model, exports (pdf/xlsx/docx), incremental diff. */

const JSZip = require('jszip');
const Report = require('../../src/services/assessment/AssessmentReportService');
const Export = require('../../src/services/assessment/ExportService');
const Diff = require('../../src/services/assessment/DocumentDiffService');

const spine = {
  'AC-2': { control_id: 'AC-2', framework: 'NIST_SP_800-53', framework_version: '5.2.0', control_nature: 'automated_capable', status: 'Fully addressed', evidence: [{ quote: 'Dormant accounts disabled', section_ref: '§2.2' }], gap_description: '', remediation_suggestion: '', operating_effectiveness_evidence_type: 'system_signal' },
  'AU-6': { control_id: 'AU-6', framework: 'NIST_SP_800-53', framework_version: '5.2.0', control_nature: 'hybrid', status: 'Not addressed', evidence: [], gap_description: 'No log review documented', remediation_suggestion: 'Document weekly log review', operating_effectiveness_evidence_type: 'either' },
};
const csf = [
  { control_id: 'PR.AA-01', framework: 'NIST_CSF_2.0', framework_version: '2.0', control_nature: 'automated_capable', status: 'Fully addressed', evidence: [{ quote: 'Dormant accounts disabled', section_ref: '§2.2' }], assessment_method: 'propagated', propagated_from: 'AC-2' },
];
const heatmap = [{ family: 'AC', assessed: 1, coverage_pct: 100, fully: 1, partially: 0, not_addressed: 0, doc_touched: 1 }];

describe('AssessmentReportService.buildReport', () => {
  const report = Report.buildReport({ spineVerdicts: spine, csfRecords: csf, heatmap, conflicts: [], scanId: 's1' });

  test('per-framework scorecards with coverage %', () => {
    const f = report.frameworks['NIST_SP_800-53'];
    expect(f.total).toBe(2); expect(f.fully).toBe(1); expect(f.not_addressed).toBe(1);
    expect(f.coverage_pct).toBe(50); // (1 + 0)/2
    expect(report.frameworks['NIST_CSF_2.0'].coverage_pct).toBe(100);
  });
  test('gap register lists only gaps with remediation + OE handoff', () => {
    expect(report.gap_register).toHaveLength(1);
    expect(report.gap_register[0].control_id).toBe('AU-6');
    expect(report.gap_register[0].operating_effectiveness_evidence_type).toBe('either');
  });
  test('evidence-linked findings cite section refs', () => {
    expect(report.findings.length).toBe(2); // AC-2 + PR.AA-01
    const pr = report.findings.find((f) => f.control_id === 'PR.AA-01');
    expect(pr.evidence[0].section_ref).toBe('§2.2');
    expect(pr.propagated_from).toBe('AC-2');
  });
  test('always carries the design/documentation-only caveat', () => {
    expect(report.coverage_caveat).toMatch(/DESIGN \/ DOCUMENTATION coverage only/);
  });
});

describe('ExportService', () => {
  const report = Report.buildReport({ spineVerdicts: spine, csfRecords: csf, heatmap, conflicts: [], scanId: 's1', generatedAt: '2026-06-27' });

  test('PDF export is a valid PDF buffer', async () => {
    const { buffer, contentType } = await Export.exportReport(report, 'pdf');
    expect(contentType).toBe('application/pdf');
    expect(buffer.slice(0, 5).toString()).toBe('%PDF-');
    expect(buffer.length).toBeGreaterThan(500);
  });

  test('XLSX export is a valid zip with the expected sheets', async () => {
    const { buffer, contentType } = await Export.exportReport(report, 'xlsx');
    expect(contentType).toMatch(/spreadsheetml/);
    const zip = await JSZip.loadAsync(buffer);
    expect(zip.file('[Content_Types].xml')).toBeTruthy();
    expect(zip.file('xl/workbook.xml')).toBeTruthy();
    expect(zip.file('xl/worksheets/sheet1.xml')).toBeTruthy();
    const wb = await zip.file('xl/workbook.xml').async('string');
    expect(wb).toContain('Gap Register');
    const s2 = await zip.file('xl/worksheets/sheet2.xml').async('string');
    expect(s2).toContain('AU-6'); // gap appears in the gap-register sheet
  });

  test('DOCX export is a valid zip with document.xml containing the findings', async () => {
    const { buffer, contentType } = await Export.exportReport(report, 'docx');
    expect(contentType).toMatch(/wordprocessingml/);
    const zip = await JSZip.loadAsync(buffer);
    const doc = await zip.file('word/document.xml').async('string');
    expect(doc).toContain('Compliance Assessment Report');
    expect(doc).toContain('PR.AA-01');
    expect(doc).toContain('§2.2');
  });

  test('rejects an unsupported format', async () => {
    await expect(Export.exportReport(report, 'rtf')).rejects.toThrow(/unsupported/);
  });
});

describe('DocumentDiffService', () => {
  const prev = [{ section_ref: '§1', text: 'a' }, { section_ref: '§2', text: 'b' }, { section_ref: '§3', text: 'c' }];
  const next = [{ section_ref: '§1', text: 'a' }, { section_ref: '§2', text: 'B-CHANGED' }, { section_ref: '§4', text: 'd' }];

  test('classifies added / removed / changed / unchanged by content hash', () => {
    const d = Diff.diffChunks(prev, next);
    expect(d.unchanged).toEqual(['§1']);
    expect(d.changed).toEqual(['§2']);
    expect(d.added).toEqual(['§4']);
    expect(d.removed).toEqual(['§3']);
  });

  test('plan re-assesses only controls grounded in changed/removed sections', () => {
    const controlSectionMap = { 'AC-2': ['§2'], 'IA-2': ['§1'], 'CP-9': ['§3'] };
    const p = Diff.plan(Diff.diffChunks(prev, next), controlSectionMap);
    expect(p.incremental).toBe(true);
    expect(p.reassessControls.sort()).toEqual(['AC-2', 'CP-9']); // §2 changed, §3 removed; §1 unchanged -> IA-2 reused
    expect(p.reembedSections.sort()).toEqual(['§2', '§4']); // changed + added
  });

  test('plan handles a section_ref with a #part suffix', () => {
    const p = Diff.plan({ added: [], removed: [], changed: ['§2'], unchanged: ['§1'] }, { 'AC-2': ['§2#1'] });
    expect(p.reassessControls).toEqual(['AC-2']);
  });
});
