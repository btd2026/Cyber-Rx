import { createContext, useContext, useState, type ReactNode } from 'react'
import { getEvidence } from './evidence'

type EvidenceCtx = {
  /** Open the drill-to-evidence drawer for a claim key, or null to close. */
  open: (key: string | null) => void
}

const Ctx = createContext<EvidenceCtx>({ open: () => {} })

// eslint-disable-next-line react-refresh/only-export-components
export const useEvidence = () => useContext(Ctx)

/** Render a trusted mock HTML string (entities + inline <b>/<span>). */
function H({ html, className }: { html: string; className?: string }) {
  return <div className={className} dangerouslySetInnerHTML={{ __html: html }} />
}

export function EvidenceProvider({ children }: { children: ReactNode }) {
  const [key, setKey] = useState<string | null>(null)
  const e = key ? getEvidence(key) : undefined

  return (
    <Ctx.Provider value={{ open: setKey }}>
      {children}

      <div className={`ev-back${e ? ' open' : ''}`} onClick={() => setKey(null)} />
      <aside className={`evdrawer${e ? ' open' : ''}`} aria-label="Evidence detail">
        <div className="ev-h">
          <div className="ev-elabel">Evidence detail</div>
          <button className="ev-x" onClick={() => setKey(null)}>
            ←&nbsp; Back
          </button>
        </div>
        <div className="ev-b">
          {e && (
            <>
              <div className="ev-claim">{e.claim}</div>
              <div className={`ev-val ${e.valCls}`}>{e.val}</div>
              <H className="ev-what" html={e.what} />

              {e.questions && e.questions.length > 0 && (
                <>
                  <div className="ev-sec">Is it evidenced — or assumed?</div>
                  {e.questions.map((qa, i) => (
                    <div className="ev-q" key={i}>
                      <div className="ev-q-q">{qa.q}</div>
                      <H className="ev-q-a" html={qa.a} />
                    </div>
                  ))}
                </>
              )}

              {e.scope && e.scope.length > 0 && (
                <>
                  <div className="ev-sec">What we measure</div>
                  <ul className="ev-scope">
                    {e.scope.map((s, i) => (
                      <li key={i}>{s}</li>
                    ))}
                  </ul>
                </>
              )}

              {e.why && (
                <>
                  <div className="ev-sec">Why this value</div>
                  <H className="ev-what" html={e.why} />
                </>
              )}

              <div className="ev-sec">Source systems</div>
              <div className="ev-srcs">
                {e.sources.map((s) => (
                  <span key={s} className="ev-src">
                    <span className="dot" />
                    {s}
                  </span>
                ))}
              </div>

              {e.signals && (
                <>
                  <div className="ev-sec">Signals</div>
                  <H className="ev-what" html={e.signals} />
                </>
              )}

              {e.detail && e.detail.length > 0 && (
                <>
                  <div className="ev-sec">{e.detailLabel || 'Breakdown'}</div>
                  {e.detail.map((row, i) => (
                    <div className="ev-line" key={i}>
                      <span className="k" dangerouslySetInnerHTML={{ __html: row[0] }} />
                      <span className={`v ${row[2] || ''}`} dangerouslySetInnerHTML={{ __html: row[1] }} />
                    </div>
                  ))}
                </>
              )}

              {e.scenarios && e.scenarios.length > 0 && (
                <>
                  <div className="ev-sec">If it's realized — scenarios</div>
                  {e.scenarios.map((sc, i) => (
                    <div className={`ev-scn ${sc.cls}`} key={i}>
                      <div className="ev-scn-h">
                        <span className="ev-scn-rk">{sc.rk}</span>
                        {sc.t}
                      </div>
                      <div className="ev-scn-impact">{sc.impact}</div>
                      <H className="ev-scn-body" html={sc.body} />
                    </div>
                  ))}
                </>
              )}

              {(e.tells || e.aggregate) && (
                <>
                  <div className="ev-sec">What this tells you</div>
                  {e.tells && <H className="ev-tells" html={e.tells} />}
                  {e.aggregate && <H className="ev-tells" html={e.aggregate} />}
                </>
              )}

              <div className="ev-sec">Freshness &amp; confidence</div>
              <div className="ev-meta">
                <span>Freshness — <b>{e.freshness}</b></span>
                <span>Confidence — <b>{e.confidence}</b></span>
              </div>

              {e.links && e.links.length > 0 && (
                <div className="ev-links">
                  {e.links.map(([label, target]) => (
                    <button key={target} className="ev-link" onClick={() => setKey(target)}>
                      {label}
                    </button>
                  ))}
                </div>
              )}
            </>
          )}
        </div>
        <div className="ev-f">
          Every value is computed from signed telemetry &amp; documents — never generated.{' '}
          <span className="ev-seal">✓ chain-verified</span>
        </div>
      </aside>
    </Ctx.Provider>
  )
}
