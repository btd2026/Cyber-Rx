'use strict';

/**
 * vault — durable, encrypted credential persistence.
 *
 * Regression guard for "the API key is empty again this morning": a credential
 * set through vault must survive a process restart (module reload), be stored
 * encrypted (never plaintext), and be removable on disconnect. DB is mocked so
 * this runs without Postgres.
 */

// In-memory stand-in for the integration_secrets table (survives module reload).
const mockTable = new Map();
jest.mock('../../../src/utils/db', () => ({
  query: (text, params = []) => {
    if (/CREATE mockTable/i.test(text)) return Promise.resolve([]);
    if (/INSERT INTO integration_secrets/i.test(text)) { mockTable.set(params[0] + '|' + params[1], params[2]); return Promise.resolve([]); }
    if (/SELECT secret FROM integration_secrets/i.test(text)) { const v = mockTable.get(params[0] + '|' + params[1]); return Promise.resolve(v ? [{ secret: v }] : []); }
    if (/DELETE FROM integration_secrets/i.test(text)) { mockTable.delete(params[0] + '|' + params[1]); return Promise.resolve([]); }
    return Promise.resolve([]);
  },
}), { virtual: false });

function freshVault() { jest.resetModules(); return require('../../../src/utils/vault'); }

describe('vault durable credential store', () => {
  const OLD = { ...process.env };
  beforeAll(() => {
    process.env.CREDENTIAL_ENCRYPTION_KEY = 'unit-test-master-secret';
    delete process.env.AWS_REGION;
    process.env.VAULT_MODE = 'local';
  });
  afterAll(() => { process.env = OLD; });
  beforeEach(() => { mockTable.clear(); });

  it('persists a credential and reads it back', async () => {
    const vault = require('../../../src/utils/vault');
    await vault.set('org1', 'securityscorecard', { apiKey: 'SSC-KEY-123' });
    expect(await vault.get('org1', 'securityscorecard')).toEqual({ apiKey: 'SSC-KEY-123' });
  });

  it('stores ciphertext, never plaintext', async () => {
    const vault = require('../../../src/utils/vault');
    await vault.set('org1', 'bitsight', { apiKey: 'SECRET-PLAINTEXT-XYZ' });
    const raw = mockTable.get('org1|bitsight');
    expect(raw).toBeTruthy();
    expect(raw).not.toContain('SECRET-PLAINTEXT-XYZ');
    expect(raw.split('.')).toHaveLength(3); // iv.tag.ciphertext
  });

  it('survives a restart — key is still there the next morning', async () => {
    let vault = require('../../../src/utils/vault');
    await vault.set('org1', 'securityscorecard', { apiKey: 'SURVIVES-RESTART' });
    vault = freshVault(); // simulate process restart
    expect(await vault.get('org1', 'securityscorecard')).toEqual({ apiKey: 'SURVIVES-RESTART' });
  });

  it('keeps tools independent and clears on disconnect', async () => {
    const vault = require('../../../src/utils/vault');
    await vault.set('org1', 'integration:bitsight', { apiKey: 'BS' });
    await vault.set('org1', 'project:jira', { apiToken: 'JIRA' });
    expect((await vault.get('org1', 'integration:bitsight')).apiKey).toBe('BS');
    expect((await vault.get('org1', 'project:jira')).apiToken).toBe('JIRA');
    await vault.delete('org1', 'integration:bitsight');
    expect(await vault.get('org1', 'integration:bitsight')).toBeNull();
    expect((await vault.get('org1', 'project:jira')).apiToken).toBe('JIRA');
  });

  it('falls back to operator env vars when no stored credential', async () => {
    process.env.OKTA_APITOKEN = 'ENV-OKTA';
    process.env.OKTA_DOMAIN = 'acme.okta.com';
    const vault = freshVault();
    const c = await vault.get('org1', 'okta');
    expect(c && c.apiKey).toBe('ENV-OKTA');
    delete process.env.OKTA_APITOKEN; delete process.env.OKTA_DOMAIN;
  });
});
