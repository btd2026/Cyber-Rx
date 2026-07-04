'use strict';

/**
 * Minimal AWS Signature Version 4 signer (no SDK dependency).
 *
 * Implements the documented SigV4 process — canonical request → string to sign
 * → derived signing key → HMAC signature — for JSON REST services such as AWS
 * Security Hub. Verified against AWS's published worked example (see
 * awssig.test.js) so the crypto is known-correct even though it is not exercised
 * against a live endpoint here.
 */

const crypto = require('crypto');

const hmac = (key, data) => crypto.createHmac('sha256', key).update(data, 'utf8').digest();
const hexHmac = (key, data) => crypto.createHmac('sha256', key).update(data, 'utf8').digest('hex');
const sha256hex = (data) => crypto.createHash('sha256').update(data, 'utf8').digest('hex');

// YYYYMMDD'T'HHMMSS'Z' and YYYYMMDD from an ISO instant.
function stamps(date) {
  const iso = date.toISOString().replace(/[:-]|\.\d{3}/g, '');
  return { amzDate: iso.slice(0, 15) + 'Z', dateStamp: iso.slice(0, 8) };
}

function signingKey(secretKey, dateStamp, region, service) {
  const kDate = hmac('AWS4' + secretKey, dateStamp);
  const kRegion = hmac(kDate, region);
  const kService = hmac(kRegion, service);
  return hmac(kService, 'aws4_request');
}

/**
 * Build SigV4 headers for a request.
 * @returns {{headers: Object}} headers to merge into the fetch options.
 */
function signRequest({ method, url, service, region, accessKeyId, secretAccessKey, sessionToken, body = '', date = new Date(), extraHeaders = {}, signContentSha = true }) {
  const u = new URL(url);
  const { amzDate, dateStamp } = stamps(date);
  const host = u.host;
  const payloadHash = sha256hex(body || '');

  const baseHeaders = { host, 'x-amz-date': amzDate, ...lower(extraHeaders) };
  if (signContentSha) baseHeaders['x-amz-content-sha256'] = payloadHash;
  if (sessionToken) baseHeaders['x-amz-security-token'] = sessionToken;

  const signedHeaderNames = Object.keys(baseHeaders).sort();
  const canonicalHeaders = signedHeaderNames.map((h) => `${h}:${String(baseHeaders[h]).trim()}\n`).join('');
  const signedHeaders = signedHeaderNames.join(';');
  const canonicalQuery = [...u.searchParams.entries()].sort().map(([k, v]) => `${encodeURIComponent(k)}=${encodeURIComponent(v)}`).join('&');

  const canonicalRequest = [method.toUpperCase(), u.pathname || '/', canonicalQuery, canonicalHeaders, signedHeaders, payloadHash].join('\n');
  const scope = `${dateStamp}/${region}/${service}/aws4_request`;
  const stringToSign = ['AWS4-HMAC-SHA256', amzDate, scope, sha256hex(canonicalRequest)].join('\n');
  const signature = hexHmac(signingKey(secretAccessKey, dateStamp, region, service), stringToSign);

  return {
    headers: {
      ...toHeaderCase(baseHeaders),
      Authorization: `AWS4-HMAC-SHA256 Credential=${accessKeyId}/${scope}, SignedHeaders=${signedHeaders}, Signature=${signature}`,
    },
    signature,
  };
}

function lower(obj) { const o = {}; for (const k of Object.keys(obj || {})) o[k.toLowerCase()] = obj[k]; return o; }
function toHeaderCase(obj) { const o = {}; for (const k of Object.keys(obj)) o[k] = obj[k]; return o; }

module.exports = { signRequest, signingKey, _internal: { sha256hex, stamps } };
