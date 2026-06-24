import { useEvidence } from '../EvidenceDrawer'

type Go = (tab: string) => void

// Seed posture trajectory (monthly), drawn as a simple sparkline. The real chart
// comes from the deterministic engine (Phase 4).
const SERIES = [70, 72, 73, 75, 76, 78, 82]
const TARGET = 85

function Spark() {
  const w = 1040, h = 200, pad = 10
  const max = 100, min = 60
  const x = (i: number) => pad + (i * (w - 2 * pad)) / (SERIES.length - 1)
  const y = (v: number) => h - pad - ((v - min) / (max - min)) * (h - 2 * pad)
  const line = SERIES.map((v, i) => `${i ? 'L' : 'M'}${x(i).toFixed(1)},${y(v).toFixed(1)}`).join(' ')
  const ty = y(TARGET)
  return (
    <svg viewBox={`0 0 ${w} ${h}`} style={{ width: '100%' }} aria-label="Posture over time vs target">
      <line x1={pad} y1={ty} x2={w - pad} y2={ty} stroke="var(--border-strong)" strokeDasharray="6 6" />
      <text x={w - pad} y={ty - 6} textAnchor="end" fontSize="12" fill="var(--muted)" fontFamily="var(--mono)">
        target {TARGET}
      </text>
      <path d={line} fill="none" stroke="var(--brand)" strokeWidth="3" />
      {SERIES.map((v, i) => (
        <circle key={i} cx={x(i)} cy={y(v)} r="4" fill="var(--brand)" />
      ))}
    </svg>
  )
}

function It({ ev, children }: { ev: string; children: string }) {
  const { open } = useEvidence()
  return (
    <div className="it" role="button" onClick={() => open(ev)}>
      {children}
    </div>
  )
}

export default function Q5({ go }: { go: Go }) {
  return (
    <section className="view active" id="q5">
      <div className="vhead">
        <div className="q">
          Trajectory <span className="ans ok">Improving</span>
        </div>
        <div className="qsub">Are we getting better or worse?</div>
        <div className="lead">
          Posture against the board target and where attention is needed. The framework evidence that
          proves it lives in <em className="scn-link" onClick={() => go('qF')}>Framework Posture ▸</em>.
        </div>
      </div>

      <div className="sec-h">
        <h3>Posture vs. target</h3>
      </div>
      <div className="panel">
        <Spark />
      </div>

      <div className="cols" style={{ marginTop: 20 }}>
        <div className="panel">
          <h4>Improving</h4>
          <div className="traj">
            <div className="col up">
              <div className="ch">Up this quarter</div>
              <It ev="imp-iam">Identity &amp; access (IAM)</It>
              <It ev="imp-cloud">Cloud security</It>
              <It ev="imp-edr">Endpoint protection</It>
            </div>
          </div>
        </div>
        <div className="panel">
          <h4>
            Deteriorating — needs attention{' '}
            <span className="meta" style={{ fontWeight: 400 }}>click to see the cause</span>
          </h4>
          <div className="traj">
            <div className="col dn">
              <div className="ch">Down this quarter</div>
              <It ev="det-tpr">Third-party risk</It>
              <It ev="det-rec">Recovery testing</It>
              <It ev="det-aigov">AI governance</It>
            </div>
          </div>
        </div>
      </div>

      <div className="panel" style={{ marginTop: 20 }}>
        <h4>Investments in flight</h4>
        <div className="kv"><span className="k">Committed this year</span><span className="v">$10.2M · PAM rollout + recovery modernization</span></div>
        <div className="kv"><span className="k">Awaiting decision</span><span className="v warn">$4.3M · third-party monitoring + AI governance</span></div>
        <div className="kv"><span className="k">Projected posture if all funded</span><span className="v ok">82 → 89 (target 85)</span></div>
      </div>
    </section>
  )
}
