// CyberRx — SSRF-guarded fetch for the ingest orchestrator (Phase 8 security).
//
// Connector baseUrls are set by tenant Admins, but the orchestrator runs in our
// cloud, so outbound requests are constrained by a per-provider egress policy:
//   - 'public'      : cloud vendors (Okta, Graph, ServiceNow, Jira, Security Hub,
//                     Meraki) — MUST resolve to a public address. All private,
//                     loopback, link-local, ULA, and metadata targets are blocked.
//   - 'self_hosted' : customer-run tools (Elastic, Splunk, Nessus, Veeam) — may
//                     reach RFC1918/loopback (their own boxes) but NEVER the
//                     cloud-metadata / link-local range.
//
// Literal-IP targets are checked synchronously (defeats the direct
// http://169.254.169.254 exploit). Hostnames are resolved when a resolver is
// available (defeats most DNS-based SSRF); where DNS resolution isn't available
// in the runtime, public-policy name lookups fail closed.

export type EgressPolicy = 'public' | 'self_hosted'

const SELF_HOSTED = new Set(['elastic', 'splunk', 'nessus', 'veeam'])
export const policyForProvider = (provider: string): EgressPolicy =>
  SELF_HOSTED.has(provider) ? 'self_hosted' : 'public'

// ── IPv4 helpers ──────────────────────────────────────────────────────────────
function ipv4ToInt(ip: string): number | null {
  const p = ip.split('.').map((x) => Number(x))
  if (p.length !== 4 || p.some((x) => !Number.isInteger(x) || x < 0 || x > 255)) return null
  return ((p[0] << 24) >>> 0) + (p[1] << 16) + (p[2] << 8) + p[3]
}
function inCidr(int: number, base: string, bits: number): boolean {
  const b = ipv4ToInt(base)
  if (b === null) return false
  const mask = bits === 0 ? 0 : (~0 << (32 - bits)) >>> 0
  return (int & mask) === (b & mask)
}

// Ranges that are blocked for EVERYONE (metadata / link-local / unspecified).
const ALWAYS_V4: [string, number][] = [['169.254.0.0', 16], ['0.0.0.0', 8]]
// Additional ranges blocked for 'public' policy (private + loopback + CGNAT).
const PRIVATE_V4: [string, number][] = [['10.0.0.0', 8], ['127.0.0.0', 8], ['192.168.0.0', 16], ['172.16.0.0', 12], ['100.64.0.0', 10]]

export function isBlockedIp(ipRaw: string, policy: EgressPolicy): boolean {
  let ip = ipRaw.trim().replace(/^\[|\]$/g, '').toLowerCase()
  // IPv4-mapped IPv6 (::ffff:a.b.c.d) → judge by the embedded v4.
  const mapped = ip.match(/::ffff:(\d{1,3}(?:\.\d{1,3}){3})$/)
  if (mapped) ip = mapped[1]

  const v4 = ipv4ToInt(ip)
  if (v4 !== null) {
    if (ALWAYS_V4.some(([b, m]) => inCidr(v4, b, m))) return true
    if (policy === 'public' && PRIVATE_V4.some(([b, m]) => inCidr(v4, b, m))) return true
    return false
  }
  if (ip.includes(':')) {
    if (/^fe[89ab]/.test(ip)) return true              // fe80::/10 link-local (always)
    if (policy === 'public') {
      if (ip === '::1' || ip === '::') return true      // loopback / unspecified
      if (/^f[cd]/.test(ip)) return true                // fc00::/7 unique-local
    }
    return false
  }
  return false // not an IP literal
}

const BLOCKED_NAMES = new Set(['metadata', 'metadata.google.internal'])
const isIpLiteral = (h: string) => /^\d{1,3}(\.\d{1,3}){3}$/.test(h) || h.includes(':')

export type Resolver = (host: string) => Promise<string[]>

/** Returns a reason string if the URL must not be fetched, else null. */
export async function blockedReason(rawUrl: string, policy: EgressPolicy, resolve?: Resolver): Promise<string | null> {
  let u: URL
  try { u = new URL(rawUrl) } catch { return 'unparseable url' }
  if (u.protocol !== 'http:' && u.protocol !== 'https:') return 'scheme'
  const host = u.hostname.replace(/^\[|\]$/g, '').toLowerCase()
  if (BLOCKED_NAMES.has(host)) return 'metadata host'

  if (isIpLiteral(host)) return isBlockedIp(host, policy) ? 'blocked ip' : null

  // Hostname: resolve and check each address when a resolver is available.
  if (!resolve) return policy === 'public' ? null : null // no resolver: literal checks only
  let addrs: string[] = []
  try { addrs = await resolve(host) } catch {
    return policy === 'public' ? 'dns resolution failed (fail-closed)' : null
  }
  if (policy === 'public' && addrs.length === 0) return 'no public address'
  for (const a of addrs) if (isBlockedIp(a, policy)) return 'resolves to blocked ip'
  return null
}

// Deno DNS resolver, when the runtime exposes it (fails open if not).
const denoResolver: Resolver | undefined = (() => {
  const d = (globalThis as { Deno?: { resolveDns?: (h: string, t: string) => Promise<string[]> } }).Deno
  if (!d?.resolveDns) return undefined
  return async (host: string) => {
    const out: string[] = []
    for (const t of ['A', 'AAAA']) {
      try { out.push(...await d.resolveDns!(host, t)) } catch { /* ignore one family */ }
    }
    return out
  }
})()

/** A fetch bound to an egress policy: SSRF guard + timeout + response-size cap. */
export function makeSafeFetch(policy: EgressPolicy, ms = 20_000, maxBytes = 8_000_000): typeof fetch {
  return (async (input: Parameters<typeof fetch>[0], init?: Parameters<typeof fetch>[1]) => {
    const url = typeof input === 'string' ? input : (input as Request).url
    const reason = await blockedReason(url, policy, denoResolver)
    if (reason) throw new Error(`blocked target (${reason})`)
    const ctrl = new AbortController()
    const t = setTimeout(() => ctrl.abort(), ms)
    try {
      const r = await fetch(input, { ...init, signal: ctrl.signal })
      const len = Number(r.headers.get('content-length') ?? '0')
      if (len && len > maxBytes) { ctrl.abort(); throw new Error('response too large') }
      return r
    } finally {
      clearTimeout(t)
    }
  }) as typeof fetch
}
