import { useLivePosture } from '../app/useLivePosture'
import { useLedger } from '../ledger/LedgerProvider'
import { cmmiTone } from './ciso/csf'

// One evidence-backed posture banner shown on every seat's home view. Every
// figure here traces to pulled connector evidence or the decision ledger — the
// role-specific narrative below it stays seed (clearly flagged) until a financial
// engine can compute those figures from evidence. Self-hides when no live data.

const isClosed = (status: string) => /done|closed|resolved|complete/i.test(status)

export default function LivePostureStrip() {
  const { live, data } = useLivePosture()
  const { decisions, tickets } = useLedger()
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
    </div>
  )
}
