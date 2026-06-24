import { useState, type FormEvent } from 'react'
import { supabase, supabaseConfigured } from '../lib/supabase'

type Step = 'credentials' | 'mfa'

export default function Login() {
  const [step, setStep] = useState<Step>('credentials')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [code, setCode] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [busy, setBusy] = useState(false)
  const [factorId, setFactorId] = useState<string | null>(null)
  const [challengeId, setChallengeId] = useState<string | null>(null)

  async function submitCredentials(e: FormEvent) {
    e.preventDefault()
    if (!supabase) return
    setError(null)
    setBusy(true)
    try {
      const { error: signInError } = await supabase.auth.signInWithPassword({ email, password })
      if (signInError) throw signInError

      // Does this account require a second factor (TOTP) to reach full assurance?
      const { data: aal } = await supabase.auth.mfa.getAuthenticatorAssuranceLevel()
      if (aal && aal.nextLevel === 'aal2' && aal.nextLevel !== aal.currentLevel) {
        const { data: factors } = await supabase.auth.mfa.listFactors()
        const totp = factors?.totp?.[0]
        if (totp) {
          const { data: challenge, error: chErr } = await supabase.auth.mfa.challenge({
            factorId: totp.id,
          })
          if (chErr) throw chErr
          setFactorId(totp.id)
          setChallengeId(challenge.id)
          setStep('mfa')
          return
        }
      }
      // Otherwise the session is already complete; AuthProvider routes us in.
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Sign-in failed')
    } finally {
      setBusy(false)
    }
  }

  async function submitMfa(e: FormEvent) {
    e.preventDefault()
    if (!supabase || !factorId || !challengeId) return
    setError(null)
    setBusy(true)
    try {
      const { error: verifyErr } = await supabase.auth.mfa.verify({
        factorId,
        challengeId,
        code,
      })
      if (verifyErr) throw verifyErr
      // Verified — session is now aal2; AuthProvider routes us in.
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Verification failed')
    } finally {
      setBusy(false)
    }
  }

  return (
    <div className="login">
      <div className="lcard">
        <div className="lbrand">
          <span className="mk">C</span>
          <span className="nm">
            Cyber<b>Rx</b>
          </span>
        </div>

        {!supabaseConfigured && (
          <div className="lnotice">
            Backend not connected yet. Set <code>VITE_SUPABASE_URL</code> and{' '}
            <code>VITE_SUPABASE_ANON_KEY</code> to enable sign-in.
          </div>
        )}

        {step === 'credentials' && (
          <form onSubmit={submitCredentials}>
            <div className="lsub">Executive cyber-risk operating system. Sign in to your cockpit.</div>
            <div className="llabel">Work email</div>
            <input
              className="linput"
              type="email"
              autoComplete="username"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
            />
            <div className="llabel">Password</div>
            <input
              className="linput"
              type="password"
              autoComplete="current-password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
            />
            {error && <div className="lerror">{error}</div>}
            <button className="lbtn" type="submit" disabled={busy || !supabaseConfigured}>
              {busy ? 'Signing in…' : 'Sign in'}
            </button>
          </form>
        )}

        {step === 'mfa' && (
          <form onSubmit={submitMfa}>
            <div className="lsub">Enter the 6-digit code from your authenticator app.</div>
            <div className="llabel">Verification code</div>
            <input
              className="linput lcode"
              inputMode="numeric"
              autoComplete="one-time-code"
              maxLength={6}
              value={code}
              onChange={(e) => setCode(e.target.value.replace(/\D/g, ''))}
              required
            />
            {error && <div className="lerror">{error}</div>}
            <button className="lbtn" type="submit" disabled={busy}>
              {busy ? 'Verifying…' : 'Verify'}
            </button>
            <button type="button" className="lback" onClick={() => setStep('credentials')}>
              ← Back
            </button>
          </form>
        )}

        <div className="lsec">🔒 Encrypted · MFA · Tenant-isolated</div>
      </div>
    </div>
  )
}
