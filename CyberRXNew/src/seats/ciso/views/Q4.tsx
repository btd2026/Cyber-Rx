import { useState } from 'react'

type Leaf = { label: string; leaf?: 'pulled' | 'assumption'; leafNote?: string; amount: string }
type Line = { k: string; v: string; tone?: 'good' | 'warn' | 'bad' }
type Option = {
  rec?: string
  name: string
  lines: Line[]
  cost?: { total: string; breakdown: Leaf[] }
  costPlain?: string
}
type Decision = {
  title: string
  sev: 'crit' | 'high'
  sevLabel: string
  situation: string
  options: Option[]
  recommendation: string
}

const DECISIONS: Decision[] = [
  {
    title: 'Close the open ransomware path to claims',
    sev: 'crit',
    sevLabel: 'Critical',
    situation:
      'A ransomware path to the claims database is open and now active. PAM rollout is 60% complete. This is the single largest exposure in the business.',
    options: [
      {
        rec: 'Recommended',
        name: 'A · Accelerate PAM to 100% now',
        lines: [
          { k: 'Outcome', v: 'Closes the path in ~6 weeks; removes the largest exposure.' },
          { k: 'Risk removed', v: '−$94M exposure · likelihood High→Low', tone: 'good' },
          { k: 'Tradeoff', v: 'Pulls 2 engineers off cloud migration for a quarter.', tone: 'warn' },
        ],
        cost: {
          total: '$1.1M',
          breakdown: [
            { label: '2 engineers × 3 mo', leaf: 'assumption', amount: '$420K' },
            { label: 'PAM license expansion', leaf: 'pulled', leafNote: 'CyberArk quote', amount: '$480K' },
            { label: 'Integration services', leaf: 'assumption', amount: '$200K' },
          ],
        },
      },
      {
        name: 'B · Compensating controls only',
        lines: [
          { k: 'Outcome', v: "Lowers likelihood; doesn't close the path. Buys ~2 quarters." },
          { k: 'Risk removed', v: '−$38M · likelihood High→Medium', tone: 'warn' },
          { k: 'Tradeoff', v: 'Path remains; re-decision needed in Q3.', tone: 'warn' },
        ],
        cost: {
          total: '$180K',
          breakdown: [
            { label: 'Monitoring tooling', amount: '$90K' },
            { label: '0.5 engineer × 3 mo', amount: '$70K' },
            { label: 'Config & tuning', amount: '$20K' },
          ],
        },
      },
      {
        name: 'C · Accept & defer to next cycle',
        lines: [
          { k: 'Outcome', v: 'No spend now; path stays open and active.' },
          { k: 'Risk removed', v: 'None', tone: 'bad' },
          { k: 'Tradeoff', v: 'Documented risk acceptance · raises personal/board exposure.', tone: 'bad' },
        ],
        costPlain: '$0 now · +$47M expected loss carried',
      },
    ],
    recommendation:
      'Recommendation: Option A. The $1.1M cost is ~1% of the $94M exposure it removes and closes an actively-exploited path. Option B is the fallback if engineers can’t be freed this quarter; Option C is not defensible while the path is active.',
  },
  {
    title: 'Govern the AI-assisted claims model (PHI)',
    sev: 'high',
    sevLabel: 'High',
    situation:
      'AI claims review makes ungoverned model decisions on PHI and is growing fast, with no human oversight or monitoring.',
    options: [
      {
        rec: 'Recommended now',
        name: 'A · Interim guardrails',
        lines: [
          { k: 'Outcome', v: 'Human review on high-value claims; cuts worst-case exposure now.' },
          { k: 'Risk removed', v: 'Partial · removes worst-case unreviewed decisions', tone: 'warn' },
          { k: 'Tradeoff', v: 'Manual bottleneck; not a durable fix.', tone: 'warn' },
        ],
        cost: {
          total: '$320K',
          breakdown: [
            { label: 'Security reviewer · 1 × 6 mo @ $35K/mo', leaf: 'assumption', amount: '$210K' },
            { label: 'Review & monitoring tooling', leaf: 'pulled', leafNote: 'Proofpoint quote', amount: '$110K' },
          ],
        },
      },
      {
        name: 'B · Full AI governance program',
        lines: [
          { k: 'Outcome', v: 'Model inventory, human-in-loop, monitoring; closes the gap durably.' },
          { k: 'Risk removed', v: 'Durable · HIPAA defensibility on AI', tone: 'good' },
          { k: 'Tradeoff', v: '12-month program; needs CLO + CRO partnership.', tone: 'warn' },
        ],
        cost: {
          total: '$2.5M',
          breakdown: [
            { label: '3 FTE × 12 mo', leaf: 'assumption', amount: '$1.80M' },
            { label: 'Governance tooling', leaf: 'pulled', leafNote: 'vendor quote', amount: '$450K' },
            { label: 'External assessment', leaf: 'assumption', amount: '$250K' },
          ],
        },
      },
    ],
    recommendation:
      'Recommendation: Option A now, fund Option B next cycle. Guardrails stop the immediate liability at low cost while the full program is scoped with Legal and Risk.',
  },
]

function Cost({ option }: { option: Option }) {
  const [open, setOpen] = useState(false)
  if (option.costPlain) {
    return (
      <span className="v">
        {option.costPlain.split('·')[0]}·{' '}
        <span className="bad" style={{ color: 'var(--critical)' }}>
          {option.costPlain.split('·').slice(1).join('·')}
        </span>
      </span>
    )
  }
  if (!option.cost) return null
  return (
    <span className="v">
      <span className="costlink" onClick={() => setOpen((o) => !o)}>
        {option.cost.total} — how? {open ? '▴' : '▾'}
      </span>
      {open && (
        <span className="costbreak open">
          {option.cost.breakdown.map((b) => (
            <span key={b.label} className="cb">
              <span>
                {b.label}
                {b.leaf === 'assumption' && <span className="prov assum">◐ assumption</span>}
                {b.leaf === 'pulled' && <span className="prov pull">● pulled · {b.leafNote}</span>}
              </span>
              <span>{b.amount}</span>
            </span>
          ))}
          <span className="cb tot">
            <span>Total</span>
            <span>{option.cost.total}</span>
          </span>
          <span className="cb-leg">
            ◐ <b>assumption</b> — editable, seeded from a benchmark · ● <b>pulled</b> — from a
            connected system. (Editing &amp; recompute land in Phase 5.)
          </span>
        </span>
      )}
    </span>
  )
}

export default function Q4() {
  return (
    <section className="view active" id="q4">
      <div className="vhead">
        <div className="q">
          Decisions <span className="ans crit">2 need you today</span>
        </div>
        <div className="qsub">What decisions need me today — and what will they cost?</div>
        <div className="lead">
          Each decision gives you costed options with the math shown, the risk each removes, and a
          recommendation. Every dollar figure can be opened to see how we got it.
        </div>
      </div>

      {DECISIONS.map((d) => (
        <div className="dec2" key={d.title}>
          <div className="d2h">
            <div className="d2t">{d.title}</div>
            <span className={`sev ${d.sev}`}>{d.sevLabel}</span>
          </div>
          <div className="d2sit">{d.situation}</div>
          <div className="opts">
            {d.options.map((o) => (
              <div className={`opt${o.rec ? ' rec' : ''}`} key={o.name}>
                {o.rec && <span className="recbadge">{o.rec}</span>}
                <div className="on2">{o.name}</div>
                {o.lines.slice(0, 1).map((l) => (
                  <div className="ln" key={l.k}>
                    <span className="k">{l.k}</span>
                    <span className="v">{l.v}</span>
                  </div>
                ))}
                <div className="ln">
                  <span className="k">Cost</span>
                  <Cost option={o} />
                </div>
                {o.lines.slice(1).map((l) => (
                  <div className="ln" key={l.k}>
                    <span className="k">{l.k}</span>
                    <span className={`v${l.tone ? ' ' + l.tone : ''}`}>{l.v}</span>
                  </div>
                ))}
                <button className="pick2" disabled title="Choose & record — sub-step 2c">
                  Choose &amp; record
                </button>
              </div>
            ))}
          </div>
          <div className="d2rec">
            <b>{d.recommendation.split('.')[0]}.</b>
            {d.recommendation.slice(d.recommendation.indexOf('.') + 1)}
          </div>
        </div>
      ))}
    </section>
  )
}
