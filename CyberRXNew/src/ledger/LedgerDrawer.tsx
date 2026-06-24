import { useLedger } from './LedgerProvider'

function fmt(iso: string) {
  const d = new Date(iso)
  return d.toLocaleString([], { dateStyle: 'medium', timeStyle: 'short' })
}

export default function LedgerDrawer() {
  const { ledgerOpen, closeLedger, decisions, ticketsFor, openTicketModal } = useLedger()

  return (
    <>
      <div className={`ev-back${ledgerOpen ? ' open' : ''}`} onClick={closeLedger} />
      <aside className={`evdrawer${ledgerOpen ? ' open' : ''}`} aria-label="Decision ledger">
        <div className="ev-h">
          <div className="ev-elabel">Decision ledger · append-only</div>
          <button className="ev-x" onClick={closeLedger}>
            ←&nbsp; Back
          </button>
        </div>
        <div className="ev-b">
          {decisions.length === 0 ? (
            <div className="led-empty">
              No decisions recorded yet. Open a costed decision in <b>Decisions</b> and choose an
              option — it's stamped with who, when, and the evidence known at the time.
            </div>
          ) : (
            decisions.map((d, i) => {
              const tks = ticketsFor(d.id)
              return (
                <div className="led" key={d.id}>
                  <div className="led-h">
                    <span className="led-seq">#{i + 1}</span>
                    <span className="led-title">{d.title}</span>
                  </div>
                  <div className="led-choice">{d.optionName}</div>
                  <div className="led-meta">
                    <span>Owner <b>{d.owner}</b></span>
                    <span>Recorded <b>{fmt(d.recordedAt)}</b></span>
                  </div>
                  <div className="led-line"><span className="k">Cost</span><span className="v">{d.cost}</span></div>
                  <div className="led-line"><span className="k">Risk removed</span><span className="v">{d.riskRemoved}</span></div>
                  {d.rationale && (
                    <div className="led-line"><span className="k">Rationale</span><span className="v">{d.rationale}</span></div>
                  )}
                  <div className="led-ev">
                    <div className="led-ev-l">Evidence known at the time</div>
                    {d.evidenceSnapshot.situation}
                  </div>
                  <div className="led-sig">
                    <span className="led-seal">🔒 signed</span>
                    <span className="led-hash" title={`prev: ${d.prevHash || '∅ (genesis)'}`}>
                      {d.rowHash.slice(0, 16)}…
                    </span>
                  </div>
                  <div className="led-tk">
                    {tks.map((t) => (
                      <span key={t.id} className="led-tkchip">
                        🎫 {t.system} {t.externalId} · {t.status}
                      </span>
                    ))}
                    <button
                      className="led-tkbtn"
                      onClick={() => openTicketModal({ decisionId: d.id, title: `${d.title} — ${d.optionName}` })}
                    >
                      + Open ticket
                    </button>
                  </div>
                </div>
              )
            })
          )}
        </div>
        <div className="ev-f">
          Append-only &amp; hash-chained — every entry signs over the previous.{' '}
          <span className="ev-seal">✓ chain intact</span>
        </div>
      </aside>
    </>
  )
}
