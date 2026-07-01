'use strict';

/** Qualys VMDR connector tests — mocks global.fetch with XML bodies (no network/DB). */

const qualys = require('../../../src/services/connectors/qualys');
const registry = require('../../../src/services/connectors');

global.fetch = jest.fn();
const xml = (body) => ({ ok: true, status: 200, json: async () => ({}), text: async () => body });
const fail = (status) => ({ ok: false, status, json: async () => ({}), text: async () => 'err' });
const creds = { pod: 'qg3', username: 'u', password: 'p' };

const detectionXml = (statuses) => `<?xml version="1.0"?>
<HOST_LIST_VM_DETECTION_OUTPUT><RESPONSE><HOST_LIST>
  <HOST><DETECTION_LIST>
    ${statuses.map((s) => `<DETECTION><STATUS>${s}</STATUS></DETECTION>`).join('')}
  </DETECTION_LIST></HOST></HOST_LIST>
</RESPONSE></HOST_LIST_VM_DETECTION_OUTPUT>`;

describe('qualys connector', () => {
  beforeEach(() => { jest.clearAllMocks(); });

  test('exposes safe catalog metadata + is registered', () => {
    expect(qualys.key).toBe('qualys');
    expect(qualys.category).toBe('Vulnerability Management');
    expect(qualys.signals).toContain('vuln_sla_pct');
    expect(qualys.fields.find((f) => f.key === 'password').secret).toBe(true);
    expect(registry.get('qualys').key).toBe('qualys'); // wrapped by demo-mode registry
  });

  test('test() requires pod/baseUrl + credentials before any network call', async () => {
    await expect(qualys.test({ username: 'u', password: 'p' })).rejects.toThrow(/required/i);
    expect(global.fetch).not.toHaveBeenCalled();
  });

  test('test() uses Basic auth + X-Requested-With against the pod host', async () => {
    global.fetch.mockResolvedValueOnce(xml('<HOST_LIST_OUTPUT><RESPONSE/></HOST_LIST_OUTPUT>'));
    const r = await qualys.test(creds);
    expect(r.ok).toBe(true);
    const [url, opts] = global.fetch.mock.calls[0];
    expect(url).toContain('https://qualysapi.qg3.apps.qualys.com/api/2.0/fo/asset/host/');
    expect(opts.headers.Authorization).toBe(`Basic ${Buffer.from('u:p').toString('base64')}`);
    expect(opts.headers['X-Requested-With']).toBeDefined();
  });

  test('test() surfaces an auth failure', async () => {
    global.fetch.mockResolvedValueOnce(fail(401));
    await expect(qualys.test(creds)).rejects.toThrow(/Qualys returned HTTP 401/);
  });

  test('fetchSignals() computes vuln_sla_pct from fixed vs total detections', async () => {
    global.fetch.mockResolvedValueOnce(xml(detectionXml(['Fixed', 'Fixed', 'Active', 'New'])));
    const r = await qualys.fetchSignals(creds);
    const s = r.signals.find((x) => x.key === 'vuln_sla_pct');
    expect(s.value).toBe(50); // 2 fixed of 4
    expect(s.raw).toEqual({ detections: 4, fixed: 2 });
    expect(r.meta.vendor).toBe('Qualys VMDR');
  });

  test('fetchSignals() handles a single detection node (XML non-array)', async () => {
    global.fetch.mockResolvedValueOnce(xml(detectionXml(['Fixed'])));
    const r = await qualys.fetchSignals(creds);
    expect(r.signals.find((x) => x.key === 'vuln_sla_pct').value).toBe(100);
  });

  test('fetchSignals() throws when there are no detections', async () => {
    global.fetch.mockResolvedValueOnce(xml('<HOST_LIST_VM_DETECTION_OUTPUT><RESPONSE><HOST_LIST></HOST_LIST></RESPONSE></HOST_LIST_VM_DETECTION_OUTPUT>'));
    await expect(qualys.fetchSignals(creds)).rejects.toThrow(/no readable signals/i);
  });
});
