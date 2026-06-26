// Proof for the AWS SigV4 signer (Phase 8). Validates against AWS's official
// Signature Version 4 test-suite "get-vanilla" vector + the documented signing-key
// derivation example, so the Security Hub adapter's auth is provably correct
// without live AWS credentials. Run:
//   node --experimental-strip-types supabase/scripts/aws_sigv4_proof.ts
import { signedHeaders, signingKey } from '../functions/_shared/aws/sigv4.ts'

let failures = 0
const check = (name: string, cond: boolean, detail = '') => {
  console.log(`${cond ? 'PASS' : 'FAIL'}: ${name}${detail ? ' — ' + detail : ''}`)
  if (!cond) failures++
}
const toHex = (b: Uint8Array) => [...b].map((x) => x.toString(16).padStart(2, '0')).join('')

// AWS docs "Examples of how to derive a signing key" — known kSigning bytes.
const key = await signingKey('wJalrXUtnFEMI/K7MDENG+bPxRfiCYEXAMPLEKEY', '20120215', 'us-east-1', 'iam')
check('signing-key derivation matches AWS doc vector',
  toHex(key) === 'f4780e2d9f65fa895f9c67b32ce1baf0b0d8a43505a000a1a9e090d414db404d', toHex(key))

// AWS SigV4 test suite "get-vanilla": GET / on example.amazonaws.com, empty body,
// signed headers host;x-amz-date, fixed date — deterministic full signature.
const h = await signedHeaders({
  method: 'GET', service: 'service', region: 'us-east-1', host: 'example.amazonaws.com',
  path: '/', body: '', amzDate: '20150830T123600Z',
  creds: { accessKeyId: 'AKIDEXAMPLE', secretAccessKey: 'wJalrXUtnFEMI/K7MDENG+bPxRfiCYEXAMPLEKEY' },
})
const EXPECTED = 'AWS4-HMAC-SHA256 Credential=AKIDEXAMPLE/20150830/us-east-1/service/aws4_request, ' +
  'SignedHeaders=host;x-amz-date, Signature=5fa00fa31553b73ebf1942676e86291e8372ff2a2260956d9b8aae1d763fbf31'
check('get-vanilla full Authorization matches AWS test suite', h.authorization === EXPECTED, h.authorization)
check('signs x-amz-date header', h['x-amz-date'] === '20150830T123600Z')

console.log(failures === 0 ? '\n✅ SIGV4 PROOF: all checks passed' : `\n❌ ${failures} check(s) failed`)
process.exit(failures === 0 ? 0 : 1)
