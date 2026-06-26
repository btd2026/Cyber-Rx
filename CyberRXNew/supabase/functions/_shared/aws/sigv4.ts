// AWS Signature Version 4 — minimal request signer (Web Crypto, Deno + Node).
//
// Pure HMAC-SHA256 key derivation + canonical-request signing, no AWS SDK. Used
// by the Security Hub adapter. Validated against AWS's official SigV4 test-suite
// "get-vanilla" vector (see supabase/scripts/aws_sigv4_proof.ts) so the crypto is
// provably correct without needing live AWS credentials.

export type AwsCreds = { accessKeyId: string; secretAccessKey: string; sessionToken?: string }

const enc = new TextEncoder()
const toHex = (b: Uint8Array) => [...b].map((x) => x.toString(16).padStart(2, '0')).join('')

async function sha256Hex(data: string | Uint8Array): Promise<string> {
  const bytes = typeof data === 'string' ? enc.encode(data) : data
  return toHex(new Uint8Array(await crypto.subtle.digest('SHA-256', bytes)))
}

async function hmac(key: Uint8Array, msg: string): Promise<Uint8Array> {
  const k = await crypto.subtle.importKey('raw', key, { name: 'HMAC', hash: 'SHA-256' }, false, ['sign'])
  return new Uint8Array(await crypto.subtle.sign('HMAC', k, enc.encode(msg)))
}

/** Derive the SigV4 signing key (kSigning). Exposed for the test vector. */
export async function signingKey(secretAccessKey: string, dateStamp: string, region: string, service: string): Promise<Uint8Array> {
  const kDate = await hmac(enc.encode(`AWS4${secretAccessKey}`), dateStamp)
  const kRegion = await hmac(kDate, region)
  const kService = await hmac(kRegion, service)
  return hmac(kService, 'aws4_request')
}

export type SignOpts = {
  method: string
  service: string
  region: string
  host: string
  path: string
  body: string
  creds: AwsCreds
  /** Optional content-type to sign (omit for header-light GETs). */
  contentType?: string
  /** Already-canonical query string (sorted, encoded). Default ''. */
  canonicalQuery?: string
  /** Override the timestamp (YYYYMMDDTHHMMSSZ) — for deterministic tests only. */
  amzDate?: string
}

/** Returns the headers to attach to the request, including Authorization. */
export async function signedHeaders(opts: SignOpts): Promise<Record<string, string>> {
  const { method, service, region, host, path, body, creds } = opts
  const amzDate = opts.amzDate ?? new Date().toISOString().replace(/[:-]|\.\d{3}/g, '')
  const dateStamp = amzDate.slice(0, 8)
  const payloadHash = await sha256Hex(body)

  const headers: Record<string, string> = { host, 'x-amz-date': amzDate }
  if (opts.contentType) headers['content-type'] = opts.contentType
  if (creds.sessionToken) headers['x-amz-security-token'] = creds.sessionToken

  const keys = Object.keys(headers).sort()
  const canonicalHeaders = keys.map((k) => `${k}:${headers[k].trim()}\n`).join('')
  const signedHeadersStr = keys.join(';')

  const canonicalRequest = [method, path, opts.canonicalQuery ?? '', canonicalHeaders, signedHeadersStr, payloadHash].join('\n')
  const scope = `${dateStamp}/${region}/${service}/aws4_request`
  const stringToSign = ['AWS4-HMAC-SHA256', amzDate, scope, await sha256Hex(canonicalRequest)].join('\n')

  const signature = toHex(await hmac(await signingKey(creds.secretAccessKey, dateStamp, region, service), stringToSign))
  const authorization = `AWS4-HMAC-SHA256 Credential=${creds.accessKeyId}/${scope}, SignedHeaders=${signedHeadersStr}, Signature=${signature}`
  return { ...headers, authorization }
}
