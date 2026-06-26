// Proof for the SSRF egress policy (Phase 8 security). Run:
//   node --experimental-strip-types supabase/scripts/safefetch_proof.ts
import { isBlockedIp, blockedReason, policyForProvider } from '../functions/_shared/safeFetch.ts'

let failures = 0
const check = (name: string, cond: boolean, detail = '') => {
  console.log(`${cond ? 'PASS' : 'FAIL'}: ${name}${detail ? ' — ' + detail : ''}`)
  if (!cond) failures++
}

// Metadata / link-local blocked for BOTH policies.
for (const policy of ['public', 'self_hosted'] as const) {
  check(`169.254.169.254 blocked (${policy})`, isBlockedIp('169.254.169.254', policy))
  check(`fe80:: link-local blocked (${policy})`, isBlockedIp('fe80::1', policy))
  check(`::ffff:169.254.169.254 (mapped) blocked (${policy})`, isBlockedIp('::ffff:169.254.169.254', policy))
}

// Private/loopback blocked for PUBLIC, allowed for SELF_HOSTED.
check('10.0.0.5 blocked for public', isBlockedIp('10.0.0.5', 'public'))
check('192.168.1.10 blocked for public', isBlockedIp('192.168.1.10', 'public'))
check('127.0.0.1 blocked for public', isBlockedIp('127.0.0.1', 'public'))
check('172.16.0.1 blocked for public', isBlockedIp('172.16.0.1', 'public'))
check('::1 blocked for public', isBlockedIp('::1', 'public'))
check('fc00:: ULA blocked for public', isBlockedIp('fd12::1', 'public'))
check('10.0.0.5 ALLOWED for self_hosted', !isBlockedIp('10.0.0.5', 'self_hosted'))
check('127.0.0.1 ALLOWED for self_hosted', !isBlockedIp('127.0.0.1', 'self_hosted'))

// Public IPs allowed for both.
check('8.8.8.8 allowed (public)', !isBlockedIp('8.8.8.8', 'public'))
check('172.32.0.1 allowed (public, just outside 172.16/12)', !isBlockedIp('172.32.0.1', 'public'))

// URL-level checks (no resolver → literal checks only).
const b = (u: string, p: 'public' | 'self_hosted') => blockedReason(u, p)
check('http(s) only — ftp blocked', (await b('ftp://example.com/x', 'public')) === 'scheme')
check('metadata host blocked', (await b('http://metadata.google.internal/x', 'public')) === 'metadata host')
check('literal 169.254 via URL blocked', (await b('http://169.254.169.254/latest/meta-data', 'public')) === 'blocked ip')
check('userinfo smuggle: host is the real target', (await b('https://vendor.com@169.254.169.254/x', 'public')) === 'blocked ip')
check('public vendor host allowed', (await b('https://dev-1.okta.com/api/v1/users', 'public')) === null)
check('self-hosted private host allowed', (await b('https://10.1.2.3:9200/_count', 'self_hosted')) === null)
check('self-hosted private host blocked under public policy', (await b('https://10.1.2.3:9200/_count', 'public')) === 'blocked ip')

// Provider → policy classification.
check('okta ⇒ public', policyForProvider('okta') === 'public')
check('securityhub ⇒ public', policyForProvider('securityhub') === 'public')
check('elastic ⇒ self_hosted', policyForProvider('elastic') === 'self_hosted')
check('nessus ⇒ self_hosted', policyForProvider('nessus') === 'self_hosted')

// Resolver-based: a hostname that resolves to a private IP is blocked under public.
const fakeResolve = async (h: string) => (h === 'evil.test' ? ['10.0.0.9'] : ['93.184.216.34'])
check('hostname → private IP blocked (public, with resolver)', (await blockedReason('https://evil.test/x', 'public', fakeResolve)) === 'resolves to blocked ip')
check('hostname → public IP allowed (public, with resolver)', (await blockedReason('https://good.test/x', 'public', fakeResolve)) === null)

console.log(failures === 0 ? '\n✅ SAFEFETCH PROOF: all checks passed' : `\n❌ ${failures} check(s) failed`)
process.exit(failures === 0 ? 0 : 1)
