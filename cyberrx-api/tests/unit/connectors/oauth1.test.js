'use strict';

/** OAuth 1.0a HMAC-SHA256 signer — deterministic base-string + signature. */

const { authHeader } = require('../../../src/services/connectors/oauth1');

describe('oauth1 signer', () => {
  const common = {
    method: 'POST', url: 'https://1234567.suitetalk.api.netsuite.com/services/rest/query/v1/suiteql',
    consumerKey: 'ck', consumerSecret: 'cs', tokenKey: 'tk', tokenSecret: 'ts', realm: '1234567',
    nonce: 'abc123', timestamp: 1700000000,
  };

  test('builds an OAuth header with realm, HMAC-SHA256 method and a signature', () => {
    const { header, signature } = authHeader(common);
    expect(header).toMatch(/^OAuth realm="1234567", /);
    expect(header).toContain('oauth_signature_method="HMAC-SHA256"');
    expect(header).toContain('oauth_consumer_key="ck"');
    expect(header).toContain('oauth_token="tk"');
    expect(header).toContain(`oauth_signature="${encodeURIComponent(signature)}"`);
  });

  test('is deterministic for fixed inputs and changes when the token secret changes', () => {
    const a = authHeader(common).signature;
    const b = authHeader(common).signature;
    const c = authHeader({ ...common, tokenSecret: 'different' }).signature;
    expect(a).toBe(b);
    expect(a).not.toBe(c);
  });
});
