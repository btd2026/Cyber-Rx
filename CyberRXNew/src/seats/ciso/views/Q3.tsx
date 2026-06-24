import { DrillTr } from './drill'

type Go = (tab: string) => void

const PATH = ['Phishing email', 'Compromised user', 'Privilege escalation', 'Active Directory', 'Claims database']

export default function Q3({ go }: { go: Go }) {
  return (
    <section className="view active" id="q3">
      <div className="vhead">
        <div className="q">
          Material Exposure <span className="ans warn">1 High &amp; rising</span>
        </div>
        <div className="qsub">What's our material exposure — and is anything about to hurt us?</div>
        <div className="lead">
          Where we're genuinely exposed, the dollar impact if it's realized, and what's trending worse
          — with the scenarios that show what "realized" actually looks like.
        </div>
      </div>

      <div className="sec-h">
        <h3>Business areas at risk</h3>
        <span className="meta">ranked by impact to revenue, customers, and reputation</span>
      </div>
      <table className="tbl">
        <thead>
          <tr>
            <th style={{ width: '30%' }}>Business area</th>
            <th>Risk</th>
            <th>Trend</th>
            <th>Why it matters</th>
          </tr>
        </thead>
        <tbody>
          <DrillTr ev="exp-claims">
            <td><div className="pn">Claims Processing</div></td>
            <td><span className="rk high">High</span></td>
            <td><span className="trn up">↑</span></td>
            <td>$220M/day revenue · open ransomware path to PHI</td>
          </DrillTr>
          <DrillTr ev="exp-ai">
            <td><div className="pn">AI-Assisted Claims</div></td>
            <td><span className="rk high">High</span></td>
            <td><span className="trn up">↑</span></td>
            <td>Fast-growing · ungoverned model decisions on PHI</td>
          </DrillTr>
          <DrillTr ev="exp-portal">
            <td><div className="pn">Member Portal</div></td>
            <td><span className="rk med">Medium</span></td>
            <td><span className="trn flat">→</span></td>
            <td>Customer-facing · brand exposure</td>
          </DrillTr>
          <DrillTr ev="exp-payments">
            <td><div className="pn">Provider Payments</div></td>
            <td><span className="rk low">Low</span></td>
            <td><span className="trn down">↓</span></td>
            <td>Well-controlled</td>
          </DrillTr>
        </tbody>
      </table>

      <div className="sec-h">
        <h3>Most likely path to the crown jewels</h3>
      </div>
      <div className="panel">
        <div className="path">
          {PATH.map((n) => (
            <span key={n} className="node">
              {n}
              <span className="arr">→</span>
            </span>
          ))}
          <span className="node crown">PHI exposure</span>
        </div>
        <div className="pathmeta">
          <div><div className="k">Likelihood</div><div className="v warn">High</div></div>
          <div><div className="k">Control effectiveness</div><div className="v warn">Medium</div></div>
          <div><div className="k">Blast radius</div><div className="v crit">2.4M records</div></div>
          <div><div className="k">Time to contain</div><div className="v">~6 hrs</div></div>
        </div>
      </div>

      <div className="sec-h">
        <h3>If it's realized — the scenarios</h3>
      </div>
      <div className="scn">
        <span className="sl">If the ransomware path is exploited →</span>Claims processing halts.
        Resumption ~3.5 days, <b>$94M modeled total exposure</b> (direct loss + downtime +
        notification), <b>2.4M PHI records</b> exposed, 11-state breach notification triggered.
        Confidence 62% — recovery testing is the weak input.{' '}
        <em className="scn-link" onClick={() => go('q4')}>See the decision to close it ▸</em>
      </div>
      <div className="scn">
        <span className="sl">If an ungoverned AI claims decision on PHI surfaces →</span>Regulatory
        inquiry (HIPAA) plus potential class action; no documented model oversight becomes{' '}
        <b>personal and corporate liability</b>. Modeled exposure $12–40M.{' '}
        <em className="scn-link" onClick={() => go('q4')}>See the AI-governance decision ▸</em>
      </div>
    </section>
  )
}
