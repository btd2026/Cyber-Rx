import { useState, type FormEvent } from 'react'
import { EVIDENCE } from './evidence'
import { askTwin, suggestedChips, type TwinVerdict } from '../../engine/twin'
import { supabase } from '../../lib/supabase'

type Turn = { q: string; v: TwinVerdict }

// Validate an untrusted server response into a TwinVerdict, or return null.
function parseVerdict(x: unknown): TwinVerdict | null {
  if (!x || typeof x !== 'object') return null
  const o = x as Record<string, unknown>
  if (o.kind === 'refused' && (o.gate === 'scope' || o.gate === 'retrieval') && typeof o.message === 'string') {
    return { kind: 'refused', gate: o.gate, message: o.message }
  }
  if (o.kind === 'grounded' && typeof o.answer === 'string' && Array.isArray(o.citations) && typeof o.confidence === 'string') {
    return { kind: 'grounded', answer: o.answer, citations: o.citations.map(String), confidence: o.confidence, evidenceKey: '' }
  }
  return null
}

// Surface B — "Ask your Executive Twin". Both gates run before any answer; in
// demo the answer is grounded deterministically from the engine's evidence (no
// LLM, cannot hallucinate). With a backend wired (VITE_TWIN_URL), it POSTs to
// the server-side Edge Function which uses Anthropic as a grounded translator.
const TWIN_URL = import.meta.env.VITE_TWIN_URL

export default function AskTwin({ open, onClose }: { open: boolean; onClose: () => void }) {
  const [q, setQ] = useState('')
  const [turns, setTurns] = useState<Turn[]>([])
  const [busy, setBusy] = useState(false)
  const chips = suggestedChips(EVIDENCE)

  async function ask(question: string) {
    const text = question.trim()
    if (!text) return
    setQ('')
    setBusy(true)
    let v: TwinVerdict = askTwin(text, EVIDENCE) // deterministic ground truth / fallback
    if (TWIN_URL) {
      try {
        const { data } = (await supabase?.auth.getSession()) ?? { data: { session: null } }
        const token = data.session?.access_token
        const r = await fetch(TWIN_URL, {
          method: 'POST',
          headers: {
            'content-type': 'application/json',
            ...(token ? { Authorization: `Bearer ${token}` } : {}),
          },
          body: JSON.stringify({ question: text }),
        })
        // Only trust a 2xx whose body validates against the locked shape.
        if (r.ok) {
          const parsed = parseVerdict(await r.json())
          if (parsed) v = parsed
        }
      } catch {
        /* keep the deterministic answer */
      }
    }
    setTurns((t) => [...t, { q: text, v }])
    setBusy(false)
  }

  return (
    <>
      <div className={`ev-back${open ? ' open' : ''}`} onClick={onClose} />
      <aside className={`evdrawer twin${open ? ' open' : ''}`} aria-label="Ask your Executive Twin">
        <div className="ev-h">
          <div className="ev-elabel">✦ Ask your Executive Twin</div>
          <button className="ev-x" onClick={onClose}>←&nbsp; Back</button>
        </div>

        <div className="ev-b">
          <div className="twin-intro">
            Grounded in your evidence only. Two gates run first — off-topic or
            unevidenced questions get an honest refusal, never a guess.
            {!TWIN_URL && <span className="twin-demo"> Demo: answers are grounded deterministically (no model call).</span>}
          </div>

          <div className="twin-chips">
            {chips.map((c) => (
              <button key={c.key} className="twin-chip" onClick={() => ask(c.label)} disabled={busy}>
                {c.label}
              </button>
            ))}
          </div>

          {turns.map((t, i) => (
            <div className="twin-turn" key={i}>
              <div className="twin-q">{t.q}</div>
              {t.v.kind === 'refused' ? (
                <div className={`twin-a refused gate-${t.v.gate}`}>
                  <span className="twin-gate">{t.v.gate === 'scope' ? 'Out of scope' : 'No evidence'}</span>
                  {t.v.message}
                </div>
              ) : (
                <div className="twin-a grounded">
                  <div className="twin-answer">{t.v.answer}</div>
                  <div className="twin-cite">
                    <span className="twin-cite-l">Sources</span>
                    {t.v.citations.map((s) => (
                      <span key={s} className="twin-src">{s}</span>
                    ))}
                  </div>
                  <div className="twin-conf">Confidence — {t.v.confidence}</div>
                </div>
              )}
            </div>
          ))}

          {busy && <div className="twin-busy">Checking the gates…</div>}
        </div>

        <form
          className="twin-input"
          onSubmit={(e: FormEvent) => {
            e.preventDefault()
            ask(q)
          }}
        >
          <input
            className="linput2"
            placeholder="Ask a cyber-risk question about your org…"
            value={q}
            onChange={(e) => setQ(e.target.value)}
          />
          <button className="tbtn primary" type="submit" disabled={busy || !q.trim()}>
            Ask
          </button>
        </form>
      </aside>
    </>
  )
}
