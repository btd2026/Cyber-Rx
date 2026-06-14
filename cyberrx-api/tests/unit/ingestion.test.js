'use strict';

/**
 * Phase 2 ingestion — offline unit tests: parsers, schema-agnostic field mapping
 * with confidence, and row normalization → records vs. exception queue.
 */

const { parse, parseCsv, parseJson, parseXml } = require('../../src/ingestion/parsers');
const { proposeMapping } = require('../../src/ingestion/fieldMapper');
const { normalizeRows, criticalityEnum, tierEnum } = require('../../src/ingestion/IngestionService');

describe('parsers', () => {
  test('CSV handles quotes, embedded commas and newlines', () => {
    const csv = 'Name,Owner\n"Claims, Core","A. Smith"\n"Member ""Portal""","B. Lee"';
    const { headers, rows } = parseCsv(csv);
    expect(headers).toEqual(['Name', 'Owner']);
    expect(rows[0]).toEqual({ Name: 'Claims, Core', Owner: 'A. Smith' });
    expect(rows[1].Name).toBe('Member "Portal"');
  });
  test('JSON parses an array of objects', () => {
    const { headers, rows } = parseJson('[{"name":"App A","id":1},{"name":"App B","id":2}]');
    expect(headers).toEqual(expect.arrayContaining(['name', 'id']));
    expect(rows).toHaveLength(2);
    expect(rows[0].name).toBe('App A');
  });
  test('JSON finds the array inside a wrapper object', () => {
    const { rows } = parseJson('{"result":[{"name":"X"}],"meta":{}}');
    expect(rows).toHaveLength(1);
  });
  test('XML extracts the repeated row element', () => {
    const xml = '<cmdb><ci><name>App A</name><owner>A</owner></ci><ci><name>App B</name><owner>B</owner></ci></cmdb>';
    const { rows } = parseXml(xml);
    expect(rows).toHaveLength(2);
    expect(rows[0].name).toBe('App A');
  });
  test('parse() auto-detects format from content', () => {
    expect(parse('[{"a":1}]').format).toBe('json');
    expect(parse('<r><x><a>1</a></x></r>').format).toBe('xml');
    expect(parse('a,b\n1,2').format).toBe('csv');
  });
});

describe('field mapper (schema-agnostic, confidence-scored)', () => {
  test('maps CMDB headers to canonical fields with high confidence', () => {
    const { mapping, missingRequired } = proposeMapping('cmdb', ['CI Name', 'Assignment Group', 'Sys ID', 'Environment']);
    expect(mapping.name.column).toBe('CI Name');
    expect(mapping.name.confidence).toBeGreaterThanOrEqual(0.8);
    expect(mapping.external_ref.column).toBe('Sys ID');
    expect(mapping.owner.column).toBe('Assignment Group');
    expect(missingRequired).toEqual([]);
  });
  test('maps process-inventory headers and flags missing required process', () => {
    const { mapping, missingRequired } = proposeMapping('process_inventory', ['Business Function', 'RTO', 'Owner']);
    expect(mapping.function.column).toBe('Business Function');
    expect(mapping.rto.column).toBe('RTO');
    expect(missingRequired).toContain('process'); // no process column present
  });
  test('each header is used at most once', () => {
    const { mapping } = proposeMapping('cmdb', ['name', 'application name']);
    const cols = Object.values(mapping).map((m) => m.column);
    expect(new Set(cols).size).toBe(cols.length);
  });
});

describe('normalizeRows → records vs. exceptions (never silently drop)', () => {
  const mapping = { process: { column: 'Process' }, function: { column: 'Function' }, tier: { column: 'Tier' }, rto: { column: 'RTO' } };
  test('valid rows become records; missing-required and empty rows become exceptions', () => {
    const rows = [
      { Function: 'Claims', Process: 'Adjudication', Tier: '1', RTO: '4h' },
      { Function: 'Claims', Process: '', Tier: '2' },     // missing required process
      { Function: '', Process: '', Tier: '' },            // empty row
    ];
    const { records, exceptions } = normalizeRows('process_inventory', rows, mapping);
    expect(records).toHaveLength(1);
    expect(records[0].process).toBe('Adjudication');
    expect(exceptions).toHaveLength(2);
    expect(exceptions[0].reason).toMatch(/missing required/);
    expect(exceptions[1].reason).toMatch(/empty/);
  });
  test('combined "Function - Process - Sub" column is split', () => {
    const m = { fps_combined: { column: 'Hierarchy' } };
    const { records } = normalizeRows('process_inventory', [{ Hierarchy: 'Claims - Adjudication - Pricing' }], m);
    expect(records[0].function).toBe('Claims');
    expect(records[0].process).toBe('Adjudication');
    expect(records[0].subprocess).toBe('Pricing');
  });
  test('criticality/tier enums map to existing CHECK values', () => {
    expect(criticalityEnum({ tier: '1' })).toBe('Critical');
    expect(criticalityEnum({ criticality: 'high' })).toBe('High');
    expect(criticalityEnum({})).toBe('Medium');
    expect(tierEnum({ tier: '1' })).toBe('Primary');
    expect(tierEnum({ tier: '3' })).toBe('Strategic');
  });
});
