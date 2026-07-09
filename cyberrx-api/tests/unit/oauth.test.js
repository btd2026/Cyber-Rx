'use strict';

/**
 * OAuth one-click connect — the signed-state round-trip, provider gating, and
 * authorize-URL construction. No network: token exchange is not exercised here.
 */

const state = require('../../src/services/oauth/state');
const providers = require('../../src/services/oauth/providers');

describe('oauth signed state', () => {
  test('round-trips org/connector/provider and verifies', () => {
    const tok = state.sign({ org_id: 'org_acme', connector: 'entra', provider: 'microsoft', domain: '', tenant: 't1' });
    const out = state.verify(tok);
    expect(out.org_id).toBe('org_acme');
    expect(out.connector).toBe('entra');
    expect(out.provider).toBe('microsoft');
    expect(out.tenant).toBe('t1');
  });
  test('rejects a tampered state', () => {
    const tok = state.sign({ org_id: 'org_acme', connector: 'entra', provider: 'microsoft' });
    const bad = tok.slice(0, -2) + (tok.slice(-2) === 'aa' ? 'bb' : 'aa');
    expect(state.verify(bad)).toBeNull();
  });
  test('rejects an expired state', () => {
    const tok = state.sign({ org_id: 'o', connector: 'c', provider: 'microsoft' }, -1000);
    expect(state.verify(tok)).toBeNull();
  });
});

describe('oauth providers', () => {
  test('lists the four scaffolded providers, read-only scopes only', () => {
    const list = providers.list();
    const names = list.map((p) => p.provider).sort();
    expect(names).toEqual(['github', 'google', 'microsoft', 'okta']);
    // no write scopes are ever requested
    Object.values(providers.PROVIDERS).forEach((p) => {
      p.scopes.forEach((s) => expect(s).not.toMatch(/write|manage|admin\.directory\.user$/i));
    });
  });

  test('configured() is false without env, true when env is set', () => {
    expect(providers.configured('microsoft')).toBe(false);
    const save = { id: process.env.OAUTH_MICROSOFT_CLIENT_ID, sec: process.env.OAUTH_MICROSOFT_CLIENT_SECRET, base: process.env.OAUTH_REDIRECT_BASE };
    process.env.OAUTH_MICROSOFT_CLIENT_ID = 'abc';
    process.env.OAUTH_MICROSOFT_CLIENT_SECRET = 'shh';
    process.env.OAUTH_REDIRECT_BASE = 'https://app.nerion.example';
    expect(providers.configured('microsoft')).toBe(true);
    const url = providers.authorizeUrl('microsoft', 'STATE123', { tenant: 'organizations' });
    expect(url).toContain('login.microsoftonline.com/organizations/oauth2/v2.0/authorize');
    expect(url).toContain('client_id=abc');
    expect(url).toContain('response_type=code');
    expect(url).toContain('state=STATE123');
    expect(url).toContain('redirect_uri=');
    expect(decodeURIComponent(url)).toContain('offline_access');
    // restore
    process.env.OAUTH_MICROSOFT_CLIENT_ID = save.id || '';
    process.env.OAUTH_MICROSOFT_CLIENT_SECRET = save.sec || '';
    process.env.OAUTH_REDIRECT_BASE = save.base || '';
  });

  test('okta authorize URL substitutes the org domain', () => {
    process.env.OAUTH_OKTA_CLIENT_ID = 'oid';
    process.env.OAUTH_OKTA_CLIENT_SECRET = 'osec';
    process.env.OAUTH_REDIRECT_BASE = 'https://app.nerion.example';
    const url = providers.authorizeUrl('okta', 'S', { domain: 'acme.okta.com' });
    expect(url).toContain('https://acme.okta.com/oauth2/v1/authorize');
    process.env.OAUTH_OKTA_CLIENT_ID = ''; process.env.OAUTH_OKTA_CLIENT_SECRET = ''; process.env.OAUTH_REDIRECT_BASE = '';
  });
});
