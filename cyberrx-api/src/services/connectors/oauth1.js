'use strict';

/**
 * Minimal OAuth 1.0a signer (HMAC-SHA256) for token-based authentication —
 * used by NetSuite's REST/SuiteQL API. Builds the signature base string and the
 * Authorization header per RFC 5849. Verified deterministically in oauth1.test.js.
 */

const crypto = require('crypto');

const enc = (s) => encodeURIComponent(String(s)).replace(/[!*'()]/g, (c) => '%' + c.charCodeAt(0).toString(16).toUpperCase());

function authHeader({ method, url, consumerKey, consumerSecret, tokenKey, tokenSecret, realm, nonce, timestamp, signatureMethod = 'HMAC-SHA256' }) {
  const u = new URL(url);
  const oauth = {
    oauth_consumer_key: consumerKey,
    oauth_token: tokenKey,
    oauth_signature_method: signatureMethod,
    oauth_timestamp: String(timestamp),
    oauth_nonce: nonce,
    oauth_version: '1.0',
  };
  // Collect + normalize params (query string + oauth), sorted.
  const params = { ...oauth };
  for (const [k, v] of u.searchParams.entries()) params[k] = v;
  const paramString = Object.keys(params).sort().map((k) => `${enc(k)}=${enc(params[k])}`).join('&');
  const baseUrl = `${u.protocol}//${u.host}${u.pathname}`;
  const baseString = [method.toUpperCase(), enc(baseUrl), enc(paramString)].join('&');
  const signingKey = `${enc(consumerSecret)}&${enc(tokenSecret)}`;
  const algo = signatureMethod === 'HMAC-SHA256' ? 'sha256' : 'sha1';
  const signature = crypto.createHmac(algo, signingKey).update(baseString).digest('base64');

  const headerParams = { ...oauth, oauth_signature: signature };
  const parts = Object.keys(headerParams).sort().map((k) => `${enc(k)}="${enc(headerParams[k])}"`);
  const realmPart = realm ? `realm="${enc(realm)}", ` : '';
  return { header: `OAuth ${realmPart}${parts.join(', ')}`, signature, baseString };
}

module.exports = { authHeader, _enc: enc };
