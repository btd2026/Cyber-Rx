type Go = (tab: string) => void

type Tile = {
  k: string; v: string; view: string
  tr?: string; trCls?: string; unit?: string; small?: boolean; warnum?: boolean; conf?: boolean
}

const BAND: Tile[] = [
  { k: 'Overall posture', v: '82', tr: '↑+4', trCls: 'up', view: 'q5' },
  { k: 'Risk exposure', v: 'Medium', small: true, view: 'q3' },
  { k: 'Regulatory readiness', v: '91', unit: '%', view: 'q5' },
  { k: 'Operational resilience', v: '78', unit: '%', tr: '→', trCls: 'flat', view: 'q2' },
  { k: 'Decisions for you', v: '2', warnum: true, view: 'q4' },
  { k: 'Board attention', v: '1', view: 'q4' },
  { k: 'Exec confidence', v: '81', unit: '%', conf: true, view: 'q5' },
]

const QUESTIONS = [
  { n: '1', view: 'q1', q: 'Are we compromised or under attack right now?', a: 'No active compromise. 4,102 attacks blocked in 24h; one elevated phishing campaign aimed at claims staff. Nothing needs you this second.', s: 'No compromise', sCls: 'ok' },
  { n: '2', view: 'q2', q: 'Can the business operate safely today?', a: 'Yes — every revenue process is running. Claims is on a verified compensating control; nothing can force a takedown today.', s: 'Operating', sCls: 'warn' },
  { n: '3', view: 'q3', q: "What's our material exposure — and is anything about to hurt us?", a: 'One open ransomware path to PHI (now active) and ungoverned AI on claims. $94M modeled exposure if realized.', s: '1 High ↑', sCls: 'warn' },
  { n: '4', view: 'q4', q: 'What decisions need me today — and what will they cost?', a: '2 decisions, each with costed options & a recommendation. Closing the ransomware path: $1.1M, −$94M exposure.', s: '2 decisions', sCls: 'crit' },
  { n: '5', view: 'q5', q: 'Are we getting better or worse — and can I prove it?', a: 'Improving overall (+4 to 82, target 85). Third-party, recovery testing, AI governance slipping. Every claim backed by evidence.', s: 'Improving ↑', sCls: 'ok' },
] as const

export default function ExecSummary({ go }: { go: Go }) {
  return (
    <section className="view active" id="exec">
      <div className="vhead">
        <span className="eyebrow">Executive summary · synced 14:09</span>
        <div className="q" style={{ marginTop: 12 }}>
          Cyber risk is understood, managed, and within tolerance today.{' '}
          <span className="ans warn">1 exposure contained</span>
        </div>
        <div className="lead">
          One control failure on claims processing is contained and nothing requires the business to
          stop. Posture is up 4% this month; third-party risk is the one area drifting out of
          tolerance.
        </div>
      </div>

      <div className="band">
        {BAND.map((b) => (
          <button key={b.k} className={`pm${b.conf ? ' conf' : ''}`} onClick={() => go(b.view)}>
            <div className="k">{b.k}</div>
            <div className={`v${b.warnum ? ' warnum' : ''}`} style={b.small ? { fontSize: 18 } : undefined}>
              {b.v}
              {b.unit && <span style={{ fontSize: 13 }}>{b.unit}</span>}
              {b.tr && <span className={`tr ${b.trCls}`}> {b.tr}</span>}
            </div>
            <span className="pmgo">▸</span>
          </button>
        ))}
      </div>

      <div className="prov">
        <span className="pv">Evidence <b>1,240 signals</b></span><span className="sep" />
        <span className="pv">Sources <b>9 connected</b></span><span className="sep" />
        <span className="pv ok">Coverage <b>99.4%</b></span><span className="sep" />
        <span className="pv">Last full sync <b>14:09:22</b></span>
        <span className="seal">✓ cryptographically signed · chain intact</span>
      </div>

      <div className="sec-h">
        <h3>The five questions, answered</h3>
        <span className="meta">click any to open its detail</span>
      </div>
      <div className="brief">
        {QUESTIONS.map((q) => (
          <button key={q.n} className="qrow" onClick={() => go(q.view)}>
            <span className="qi">{q.n}</span>
            <div className="qm">
              <div className="qq">{q.q}</div>
              <div className="qa">{q.a}</div>
            </div>
            <span className={`qs ${q.sCls}`}>{q.s}</span>
            <span className="go">▸</span>
          </button>
        ))}
      </div>
    </section>
  )
}
