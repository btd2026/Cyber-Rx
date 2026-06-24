import { createContext, useContext, useState, type ReactNode } from 'react'
import { getEvidence } from './evidence'

type EvidenceCtx = {
  /** Open the drill-to-evidence drawer for a claim key, or null to close. */
  open: (key: string | null) => void
}

const Ctx = createContext<EvidenceCtx>({ open: () => {} })

export const useEvidence = () => useContext(Ctx)

export function EvidenceProvider({ children }: { children: ReactNode }) {
  const [key, setKey] = useState<string | null>(null)
  const open = (k: string | null) => setKey(k)
  const entry = key ? getEvidence(key) : undefined

  return (
    <Ctx.Provider value={{ open }}>
      {children}

      <div className={`ev-back${entry ? ' open' : ''}`} onClick={() => setKey(null)} />
      <aside className={`evdrawer${entry ? ' open' : ''}`} aria-label="Evidence detail">
        <div className="ev-h">
          <div className="ev-elabel">Evidence detail</div>
          <button className="ev-x" onClick={() => setKey(null)}>
            ←&nbsp; Back
          </button>
        </div>
        <div className="ev-b">
          {entry && (
            <>
              <div className="ev-claim">{entry.claim}</div>
              <div className={`ev-val ${entry.valCls}`}>{entry.val}</div>
              <div className="ev-what">{entry.what}</div>

              <div className="ev-sec">Source systems</div>
              <div className="ev-srcs">
                {entry.sources.map((s) => (
                  <span key={s} className="ev-src">
                    <span className="dot" />
                    {s}
                  </span>
                ))}
              </div>

              <div className="ev-sec">Signals</div>
              <div className="ev-what">{entry.signals}</div>

              {entry.detail.length > 0 && (
                <>
                  <div className="ev-sec">Breakdown</div>
                  {entry.detail.map(([label, value, tone]) => (
                    <div key={label} className="ev-line">
                      <span className="k">{label}</span>
                      <span className={`v ${tone}`}>{value}</span>
                    </div>
                  ))}
                </>
              )}

              <div className="ev-sec">Freshness &amp; confidence</div>
              <div className="ev-meta">
                <span>Freshness — <b>{entry.freshness}</b></span>
                <span>Confidence — <b>{entry.confidence}</b></span>
              </div>

              {entry.links.length > 0 && (
                <div className="ev-links">
                  {entry.links.map(([label, target]) => (
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
