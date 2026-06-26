import { useState } from 'react'
import { useLivePosture } from '../app/useLivePosture'
import { useFairExposure } from '../app/useFairExposure'
import { useLedger } from '../ledger/LedgerProvider'
import { cmmiTone } from './ciso/csf'

// One evidence-backed posture + exposure banner shown on every seat's home view.
// Every figure traces to pulled connector evidence, an owned assumption, or the
// decision ledger — provenance is one click away. Self-hides when no live data.

const isClosed = (status: string) => /done|closed|resolved|complete/i.test(status)

function fmtMoney(n: number): string {
  const a = Math.abs(n)
  if (a >= 1e9) return `$${(n / 1e9).toFixed(1)}B`
  if (a >= 1e6) return `$${(n / 1e6).toFixed(1)}M`
  if (a >= 1e3) return `$${(n / 1e3).toFixed(0)}K`
  return `$${Math.round(n)}`
}
const fmtLeaf = (unit: string, value: number) =>
  unit === 'CMMI' ? `CMMI ${value}` : unit === 'USD' ? fmtMoney(value) : `${value.toLocaleString()} ${unit}`

export default function LivePostureStrip() {
  const { live, data } = useLivePosture()
  const fair = useFairExposure()
  const { decisions, tickets } = useLedger()
  const [trace, setTrace] = useState(false)
  if (!live || !data) return null

  const openTickets = tickets.filter((t) => !isClosed(t.status)).length
  const fresh = data.freshestHours == null ? '' : `, freshest ${Math.round(data.freshestHours)}h ago`

  return (
    <div className="lps">
      <div className="lps-h">
        <span className="fw-live">● LIVE</span>
        <span className="lps-t">
          From your connected evidence — <b>{data.liveControls}</b> control{data.liveControls === 1 ? '' : 's'} backed by pulled data{fresh}.
        </span>
      </div>

      <div className="lps-grid">
        <div className="lps-stat">
          <div className="lps-k">Overall maturity</div>
          <div className={`lps-v ${cmmiTone(data.overall.cmmi)}`}>CMMI {data.overall.cmmi}</div>
          <div className="lps-sub">conf {Math.round(data.overall.confidence * 100)}%</div>
        </div>
        {data.functions.map((fn) => (
          <div className="lps-stat" key={fn.key}>
            <div className="lps-k">{fn.name}</div>
            <div className={`lps-v ${cmmiTone(fn.cmmi)}`}>CMMI {fn.cmmi}</div>
            {fn.live > 0 && <div className="lps-sub ok">{fn.live} live</div>}
          </div>
        ))}
        <div className="lps-stat">
          <div className="lps-k">Decisions recorded</div>
          <div className="lps-v">{decisions.length}</div>
        </div>
        <div className="lps-stat">
          <div className="lps-k">Open tickets</div>
          <div className="lps-v">{openTickets}</div>
        </div>
        <div className="lps-stat">
          <div className="lps-k">Evidence items</div>
          <div className="lps-v">{data.evidenceCount}</div>
        </div>
      </div>

      {fair && (
        <div className="lps-exp">
          <div className="lps-exp-h">
            <div>
              <div className="lps-k">Modeled annual exposure · residual</div>
              <div className="lps-exp-v">{fmtMoney(fair.aleResidual)}<small>/yr</small></div>
              <div className="lps-sub">gross {fmtMoney(fair.aleGross)}/yr before insurance · {fair.scenarios.length} scenarios · FAIR</div>
            </div>
            <button className="lps-trace-btn" onClick={() => setTrace((t) => !t)}>{trace ? 'Hide' : 'Trace'} provenance {trace ? '▴' : '▾'}</button>
          </div>

          {trace && (
            <div className="lps-trace-b">
              {fair.scenarios.map((sc) => (
                <div className="lps-scn" key={sc.key}>
                  <div className="lps-scn-h"><b>{sc.name}</b><span>{fmtMoney(sc.aleResidual)}/yr residual · LEF {sc.lef.toFixed(2)}/yr</span></div>
                  <div className="lps-leaves">
                    {sc.leaves.map((l, i) => (
                      <div className="lps-leaf" key={i}>
                        <span className={`leaf-src ${l.source}`}>{l.source === 'pulled' ? 'PULLED' : 'ASSUMPTION'}</span>
                        <span className="leaf-l">{l.label}</span>
                        <span className="leaf-v">{fmtLeaf(l.unit, l.value)}</span>
                        <span className="leaf-b">{l.basis}</span>
                      </div>
                    ))}
                  </div>
                </div>
              ))}
              <div className="lps-trace-note">
                Every figure traces to <b>pulled</b> evidence-derived maturity or an <b>owned assumption</b> — none invented.
                Maturity is computed from your connectors; assumptions (insurance, breach cost, downtime) are editable in onboarding.
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  )
}
