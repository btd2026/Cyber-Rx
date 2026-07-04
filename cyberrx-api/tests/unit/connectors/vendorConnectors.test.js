'use strict';

/**
 * Unit tests for the full second wave of native connectors (CSPM, backup,
 * threat-intel, ERP, privacy, email). Mocks global.fetch — no network, no DB.
 * Each case asserts catalog metadata, registration, credential validation and
 * the computed signal from a realistic mocked API response.
 */

const crypto = require('crypto');
const registry = require('../../../src/services/connectors');

const ok = (d) => ({ ok: true, status: 200, json: async () => d, text: async () => '' });
const fail = (s) => ({ ok: false, status: s, json: async () => ({}), text: async () => 'err' });
function queue(...responses) { const q = [...responses]; global.fetch = jest.fn(async () => (q.length > 1 ? q.shift() : q[0])); }
const sig = (r, k) => r.signals.find((s) => s.key === k);

beforeEach(() => { jest.clearAllMocks(); });

describe('registration + catalog metadata', () => {
  const expected = {
    aws: 'cspm_pct', azure: 'cspm_pct', prisma: 'cspm_pct', gcp: 'cspm_pct',
    veeam: 'backup_immutable_pct', cohesity: 'backup_immutable_pct', commvault: 'backup_immutable_pct',
    mandiant: 'threat_actors_active', anomali: 'threat_actors_active',
    oracle: 'sod_conflicts', workday: 'sod_conflicts', netsuite: 'payment_anomalies',
    trustarc: 'dsar_open', relativity: 'legal_holds', exterro: 'legal_holds', abnormal: 'bec_blocked',
  };
  test('all 16 are registered and advertise their primary signal + a secret field', () => {
    for (const [key, primary] of Object.entries(expected)) {
      const c = registry.get(key);
      expect(c).toBeTruthy();
      expect(c.signals).toContain(primary);
      expect(c.fields.some((f) => f.secret)).toBe(true);
      expect(registry.list().some((x) => x.key === key)).toBe(true);
    }
  });
});

describe('CSPM connectors → cspm_pct', () => {
  test('aws tallies PASSED vs FAILED Security Hub findings', async () => {
    const aws = require('../../../src/services/connectors/aws');
    await expect(aws.test({})).rejects.toThrow(/required/i);
    queue(ok({ Findings: [{ Compliance: { Status: 'PASSED' } }, { Compliance: { Status: 'PASSED' } }, { Compliance: { Status: 'FAILED' } }] }));
    const r = await aws.fetchSignals({ accessKeyId: 'A', secretAccessKey: 'S', region: 'us-east-1' });
    expect(sig(r, 'cspm_pct').value).toBe(67);
  });
  test('azure tallies Healthy vs Unhealthy assessments across pages', async () => {
    const azure = require('../../../src/services/connectors/azure');
    queue(ok({ access_token: 't' }), ok({ value: [...Array(82).fill({ properties: { status: { code: 'Healthy' } } }), ...Array(18).fill({ properties: { status: { code: 'Unhealthy' } } })] }));
    const r = await azure.fetchSignals({ tenantId: 't', clientId: 'c', clientSecret: 's', subscriptionId: 'sub' });
    expect(sig(r, 'cspm_pct').value).toBe(82);
  });
  test('prisma reads the compliance posture summary', async () => {
    const prisma = require('../../../src/services/connectors/prisma');
    queue(ok({ token: 't' }), ok({ totalPassed: 8200, totalFailed: 1800 }));
    const r = await prisma.fetchSignals({ apiUrl: 'https://api.prismacloud.io', accessKeyId: 'a', secretKey: 's' });
    expect(sig(r, 'cspm_pct').value).toBe(82);
  });
  test('gcp signs an RS256 SA JWT and groups findings by state', async () => {
    const { privateKey } = crypto.generateKeyPairSync('rsa', { modulusLength: 2048 });
    const pem = privateKey.export({ type: 'pkcs8', format: 'pem' });
    const gcp = require('../../../src/services/connectors/gcp');
    queue(ok({ access_token: 't' }), ok({ groupByResults: [{ properties: { state: 'ACTIVE' }, count: 1800 }, { properties: { state: 'INACTIVE' }, count: 8200 }] }));
    const r = await gcp.fetchSignals({ organizationId: '123', serviceAccountJson: JSON.stringify({ client_email: 'x@y.iam', private_key: pem, token_uri: 'https://oauth2.googleapis.com/token' }) });
    expect(sig(r, 'cspm_pct').value).toBe(82);
  });
  test('gcp rejects malformed service-account JSON before any network call', async () => {
    const gcp = require('../../../src/services/connectors/gcp');
    global.fetch = jest.fn();
    await expect(gcp.fetchSignals({ organizationId: '1', serviceAccountJson: 'not json' })).rejects.toThrow(/valid JSON/i);
    expect(global.fetch).not.toHaveBeenCalled();
  });
});

describe('backup connectors → backup_immutable_pct', () => {
  test('veeam counts immutable repositories', async () => {
    const veeam = require('../../../src/services/connectors/veeam');
    queue(ok({ access_token: 't' }), ok({ data: [{ immutabilityEnabled: true }, { makeRecentBackupsImmutableDays: 7 }, { immutabilityEnabled: false }] }));
    const r = await veeam.fetchSignals({ baseUrl: 'https://v:9419', username: 'u', password: 'p' });
    expect(sig(r, 'backup_immutable_pct').value).toBe(67);
  });
  test('cohesity counts DataLock policies', async () => {
    const cohesity = require('../../../src/services/connectors/cohesity');
    queue(ok({ policies: [{ retentionOptions: { datalockConfig: {} } }, { backupPolicy: { regular: { retention: { dataLockConfig: {} } } } }, {}, {}] }));
    const r = await cohesity.fetchSignals({ baseUrl: 'https://c', apiKey: 'k' });
    expect(sig(r, 'backup_immutable_pct').value).toBe(50);
  });
  test('commvault counts WORM storage pools', async () => {
    const commvault = require('../../../src/services/connectors/commvault');
    queue(ok({ token: 't' }), ok({ storagePoolList: [{ wormStoragePoolFlag: 1 }, {}] }));
    const r = await commvault.fetchSignals({ baseUrl: 'https://cv', username: 'u', password: 'p' });
    expect(sig(r, 'backup_immutable_pct').value).toBe(50);
  });
});

describe('threat-intel connectors → threat_actors_active', () => {
  test('mandiant counts active (or recently-active) actors', async () => {
    const mandiant = require('../../../src/services/connectors/mandiant');
    queue(ok({ access_token: 't' }), ok({ threat_actors: [{ is_active: true }, { last_activity_time: new Date().toISOString() }, { last_activity_time: '2000-01-01T00:00:00Z' }] }));
    const r = await mandiant.fetchSignals({ keyId: 'k', keySecret: 's' });
    expect(sig(r, 'threat_actors_active').value).toBe(2);
  });
  test('anomali counts distinct active actors', async () => {
    const anomali = require('../../../src/services/connectors/anomali');
    queue(ok({ objects: [{ name: 'APT29', status: 'active' }, { name: 'APT29', status: 'active' }, { name: 'Sandworm', status: 'active' }] }));
    const r = await anomali.fetchSignals({ username: 'u', apiKey: 'k' });
    expect(sig(r, 'threat_actors_active').value).toBe(2);
  });
});

describe('ERP connectors', () => {
  test('oracle counts open SoD incidents', async () => {
    const oracle = require('../../../src/services/connectors/oracle');
    queue(ok({ items: [{}, {}, {}], totalResults: 3 }));
    const r = await oracle.fetchSignals({ baseUrl: 'https://o', username: 'u', password: 'p' });
    expect(sig(r, 'sod_conflicts').value).toBe(3);
  });
  test('workday counts RaaS report rows', async () => {
    const workday = require('../../../src/services/connectors/workday');
    queue(ok({ Report_Entry: [{}, {}, {}] }));
    const r = await workday.fetchSignals({ reportUrl: 'https://w/ccx/service/customreport2/x', username: 'u', password: 'p' });
    expect(sig(r, 'sod_conflicts').value).toBe(3);
  });
  test('netsuite signs OAuth1 and reads the SuiteQL count', async () => {
    const netsuite = require('../../../src/services/connectors/netsuite');
    queue(ok({ items: [{ c: 2 }] }));
    const r = await netsuite.fetchSignals({ accountId: '1234567', consumerKey: 'ck', consumerSecret: 'cs', tokenId: 'ti', tokenSecret: 'ts' });
    expect(sig(r, 'payment_anomalies').value).toBe(2);
    const [, opts] = global.fetch.mock.calls[0];
    expect(opts.headers.Authorization).toMatch(/^OAuth realm="1234567"/);
  });
});

describe('privacy + legal-hold + email connectors', () => {
  test('trustarc computes open + overdue DSARs', async () => {
    const trustarc = require('../../../src/services/connectors/trustarc');
    const now = Date.now();
    queue(ok({ access_token: 't' }), ok({ requests: [{ status: 'InProgress', dueDate: new Date(now - 1e6).toISOString() }, { status: 'InProgress', dueDate: new Date(now + 1e8).toISOString() }, { status: 'Closed' }] }));
    const r = await trustarc.fetchSignals({ clientId: 'c', clientSecret: 's' });
    expect(sig(r, 'dsar_open').value).toBe(2);
    expect(sig(r, 'dsar_overdue').value).toBe(1);
  });
  test('relativity counts active legal-hold projects', async () => {
    const relativity = require('../../../src/services/connectors/relativity');
    queue(ok({ projects: [{ status: 'Active' }, { status: 'Issued' }, { status: 'Released' }] }));
    const r = await relativity.fetchSignals({ baseUrl: 'https://r', workspaceId: '1', username: 'u', password: 'p' });
    expect(sig(r, 'legal_holds').value).toBe(2);
  });
  test('exterro counts active legal holds', async () => {
    const exterro = require('../../../src/services/connectors/exterro');
    queue(ok({ legalHolds: [{ status: 'active' }, { status: 'active' }, { status: 'released' }] }));
    const r = await exterro.fetchSignals({ baseUrl: 'https://e', apiKey: 'k' });
    expect(sig(r, 'legal_holds').value).toBe(2);
  });
  test('abnormal reports BEC threats blocked', async () => {
    const abnormal = require('../../../src/services/connectors/abnormal');
    queue(ok({ threats: [{}, {}], total: 14 }));
    const r = await abnormal.fetchSignals({ token: 't' });
    expect(sig(r, 'bec_blocked').value).toBe(14);
  });
  test('abnormal requires a token before any network call', async () => {
    const abnormal = require('../../../src/services/connectors/abnormal');
    global.fetch = jest.fn();
    await expect(abnormal.test({})).rejects.toThrow(/required/i);
    expect(global.fetch).not.toHaveBeenCalled();
  });
});
