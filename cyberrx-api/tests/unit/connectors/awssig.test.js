'use strict';

/**
 * AWS SigV4 signer — verified against AWS's published aws-sig-v4-test-suite
 * "get-vanilla" worked example, so the crypto is known-correct.
 */

const { signRequest, signingKey } = require('../../../src/services/connectors/awssig');

describe('awssig (SigV4)', () => {
  test('matches the AWS published get-vanilla signature', () => {
    const r = signRequest({
      method: 'GET', url: 'https://example.amazonaws.com/', service: 'service', region: 'us-east-1',
      accessKeyId: 'AKIDEXAMPLE', secretAccessKey: 'wJalrXUtnFEMI/K7MDENG+bPxRfiCYEXAMPLEKEY',
      body: '', date: new Date('2015-08-30T12:36:00Z'), signContentSha: false,
    });
    expect(r.signature).toBe('5fa00fa31553b73ebf1942676e86291e8372ff2a2260956d9b8aae1d763fbf31');
    expect(r.headers.Authorization).toContain('Credential=AKIDEXAMPLE/20150830/us-east-1/service/aws4_request');
    expect(r.headers.Authorization).toContain('SignedHeaders=host;x-amz-date');
  });

  test('derives a deterministic signing key and includes x-amz-content-sha256 by default', () => {
    const k = signingKey('secret', '20240101', 'us-east-1', 'securityhub');
    expect(Buffer.isBuffer(k)).toBe(true);
    const r = signRequest({
      method: 'POST', url: 'https://securityhub.us-east-1.amazonaws.com/findings', service: 'securityhub', region: 'us-east-1',
      accessKeyId: 'AKID', secretAccessKey: 'sk', body: '{}', date: new Date('2024-01-01T00:00:00Z'),
    });
    expect(r.headers['x-amz-content-sha256']).toBeDefined();
    expect(r.headers.Authorization).toContain('SignedHeaders=host;x-amz-content-sha256;x-amz-date');
  });
});
