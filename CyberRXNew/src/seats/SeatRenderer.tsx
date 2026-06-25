import { useState } from 'react'
import { useEvidence } from './ciso/EvidenceDrawer'
import { useLedger } from '../ledger/LedgerProvider'
import type { SeatBlock } from './seatData'

/* eslint-disable @typescript-eslint/no-explicit-any */

// Generic, data-driven seat renderer. The same component renders every non-CISO
// seat from the mock's block data — the "reuse the CISO patterns, don't fork"
// rule. Mock strings carry trusted inline HTML/entities, rendered with dangerously
// set HTML (seed data we author, not user input).

const html = (s: string) => ({ __html: s })
const strip = (s: string) =>
  s.replace(/<[^>]*>/g, '').replace(/&amp;/g, '&').replace(/&lt;/g, '<').replace(/&gt;/g, '>').trim()

function Panel({ p }: { p: any }) {
  return (
    <div className="panel" style={p.mt ? { marginTop: 20 } : undefined}>
      {p.title && <h4 dangerouslySetInnerHTML={html(p.title)} />}
      {p.kind === 'srow' &&
        p.rows.map((r: any, i: number) => (
          <div className="srow" key={i}>
            <div className="nm">
              {r.nm}
              {r.sub && <small>{r.sub}</small>}
            </div>
            <span className={`stat ${r.statCls || ''}`} dangerouslySetInnerHTML={html(r.stat)} />
          </div>
        ))}
      {p.kind === 'kv' &&
        p.rows.map((r: any, i: number) => (
          <div className="kv" key={i}>
            <span className="k">{r.l}</span>
            <span className={`v ${r.cls || ''}`} dangerouslySetInnerHTML={html(r.v)} />
          </div>
        ))}
    </div>
  )
}

function DecisionOption({ o, decTitle }: { o: any; decTitle: string }) {
  const { openRecord } = useLedger()
  const [open, setOpen] = useState(false)
  return (
    <div className={`opt${o.rec ? ' rec' : ''}`}>
      {o.rec && <span className="recbadge">{o.recLabel || 'Recommended'}</span>}
      <div className="on2">{o.name}</div>
      <div className="ln">
        <span className="k">Outcome</span>
        <span className="v" dangerouslySetInnerHTML={html(o.outcome)} />
      </div>
      <div className="ln">
        <span className="k">Cost</span>
        <span className="v">
          {o.costBreak ? (
            <>
              <span className="costlink" onClick={() => setOpen((x) => !x)}>
                <span dangerouslySetInnerHTML={html(o.cost)} /> — how? {open ? '▴' : '▾'}
              </span>
              {open && (
                <span className="costbreak open">
                  {o.costBreak.map((cb: string[], k: number) => (
                    <span className="cb" key={k}>
                      <span dangerouslySetInnerHTML={html(cb[0])} />
                      <span>{cb[1]}</span>
                    </span>
                  ))}
                  <span className="cb tot">
                    <span>Total</span>
                    <span>{o.costTotal || strip(o.cost)}</span>
                  </span>
                </span>
              )}
            </>
          ) : (
            <span dangerouslySetInnerHTML={html(o.cost)} />
          )}
        </span>
      </div>
      <div className="ln">
        <span className="k">Risk removed</span>
        <span className={`v ${o.riskCls || ''}`} dangerouslySetInnerHTML={html(o.risk)} />
      </div>
      {o.tradeoff && (
        <div className="ln">
          <span className="k">Tradeoff</span>
          <span className={`v ${o.tradeoffCls || ''}`} dangerouslySetInnerHTML={html(o.tradeoff)} />
        </div>
      )}
      <button
        className="pick2"
        onClick={() =>
          openRecord({
            title: strip(decTitle),
            optionName: strip(o.name),
            cost: o.costTotal || strip(o.cost),
            riskRemoved: strip(o.risk),
            evidenceSnapshot: {
              situation: strip(decTitle),
              option: strip(o.name),
              cost: o.costTotal || strip(o.cost),
              riskRemoved: strip(o.risk),
            },
          })
        }
      >
        Choose &amp; record
      </button>
    </div>
  )
}

function Block({ b, go }: { b: any; go: (t: string) => void }) {
  const { open } = useEvidence()
  switch (b.t) {
    case 'head':
      return (
        <div className="vhead">
          <div className="q">
            <span dangerouslySetInnerHTML={html(b.q)} />{' '}
            {b.ans && <span className={`ans ${b.ansCls || ''}`} dangerouslySetInnerHTML={html(b.ans)} />}
          </div>
          {b.lead && <div className="lead" dangerouslySetInnerHTML={html(b.lead)} />}
        </div>
      )
    case 'band':
      return (
        <div className="band">
          {b.items.map((it: any, i: number) => (
            <button className="pm" key={i} onClick={it.ev ? () => open(it.ev) : undefined}>
              <div className="k">{it.k}</div>
              <div className={`v ${it.cls || ''}`} style={it.small ? { fontSize: 18 } : undefined}>
                <span dangerouslySetInnerHTML={html(it.v)} />
                {it.tr && <span className={`tr ${it.trCls}`}> {it.tr}</span>}
              </div>
              {it.ev && <span className="pmgo">▸</span>}
            </button>
          ))}
        </div>
      )
    case 'brief':
      return (
        <div className="brief">
          {b.items.map((it: any, i: number) => (
            <button className="qrow" key={i} onClick={() => go(it.view)}>
              <span className="qi">{it.i}</span>
              <div className="qm">
                <div className="qq" dangerouslySetInnerHTML={html(it.q)} />
                <div className="qa" dangerouslySetInnerHTML={html(it.a)} />
              </div>
              <span className={`qs ${it.sCls}`}>{it.s}</span>
              <span className="go">▸</span>
            </button>
          ))}
        </div>
      )
    case 'ansgrid':
      return (
        <div className="ansgrid">
          {b.cells.map((c: any, i: number) => (
            <div className={`ansc${c.chg ? ' chg' : ''}`} key={i}>
              <div className="l">{c.l}</div>
              <div className="v" style={c.good ? { color: 'var(--pass)' } : undefined} dangerouslySetInnerHTML={html(c.v)} />
            </div>
          ))}
        </div>
      )
    case 'cols':
      return (
        <div className="cols">
          {b.panels.map((p: any, i: number) => (
            <Panel p={p} key={i} />
          ))}
        </div>
      )
    case 'panel':
      return <Panel p={b} />
    case 'sec':
      return (
        <div className="sec-h">
          <h3 dangerouslySetInnerHTML={html(b.title)} />
          {b.meta && <span className="meta">{b.meta}</span>}
        </div>
      )
    case 'table':
      return (
        <table className="tbl">
          <thead>
            <tr>
              {b.head.map((h: string, i: number) => (
                <th key={i} dangerouslySetInnerHTML={html(h)} />
              ))}
            </tr>
          </thead>
          <tbody>
            {b.rows.map((r: any, i: number) => {
              const cells: string[] = Array.isArray(r) ? r : r.c
              const ev: string | undefined = Array.isArray(r) ? undefined : r.ev
              return (
                <tr key={i} className={ev ? 'drill' : undefined} onClick={ev ? () => open(ev) : undefined}>
                  {cells.map((c, j) => (
                    <td key={j} dangerouslySetInnerHTML={html(c)} />
                  ))}
                </tr>
              )
            })}
          </tbody>
        </table>
      )
    case 'scn':
      return (
        <div className="scn">
          <span className="sl">{b.label}</span>
          <span dangerouslySetInnerHTML={html(b.html)} />
        </div>
      )
    case 'dec2':
      return (
        <>
          {b.items.map((it: any, i: number) => (
            <div className="dec2" key={i}>
              <div className="d2h">
                <div className="d2t" dangerouslySetInnerHTML={html(it.title)} />
                <span className={`sev ${it.sevCls}`}>{it.sev}</span>
              </div>
              <div className="d2sit" dangerouslySetInnerHTML={html(it.sit)} />
              <div className="opts">
                {it.options.map((o: any, j: number) => (
                  <DecisionOption o={o} decTitle={it.title} key={j} />
                ))}
              </div>
              {it.rec && <div className="d2rec" dangerouslySetInnerHTML={html(it.rec)} />}
            </div>
          ))}
        </>
      )
    case 'decisions':
      return (
        <>
          <div className="sec-h">
            <h3 dangerouslySetInnerHTML={html(b.title)} />
          </div>
          <div className="declist">
            {b.items.map((it: any, i: number) => (
              <div className="decrow" key={i}>
                <span className={`sev ${it.sevCls}`}>{it.sev}</span>
                <div className="decmain">
                  <div className="dectitle">
                    <b dangerouslySetInnerHTML={html(it.title)} /> <span dangerouslySetInnerHTML={html(it.desc)} />
                  </div>
                  {it.owner && <div className="decmeta">{it.owner}</div>}
                </div>
                {it.action && <span className="decaction">{it.action}</span>}
              </div>
            ))}
          </div>
          {b.btn && (
            <button className="tbtn" disabled title="Generation lands with the engine (Phase 4)">
              {b.btn}
            </button>
          )}
        </>
      )
    case 'bigstat':
      return <div className="bigstat" dangerouslySetInnerHTML={html(b.html)} />
    case 'raw':
      return <div dangerouslySetInnerHTML={html(b.html)} />
    default:
      return null
  }
}

export default function SeatRenderer({ blocks, go }: { blocks: SeatBlock[]; go: (t: string) => void }) {
  return (
    <div className="seat">
      {blocks.map((b, i) => (
        <Block b={b} go={go} key={i} />
      ))}
    </div>
  )
}
