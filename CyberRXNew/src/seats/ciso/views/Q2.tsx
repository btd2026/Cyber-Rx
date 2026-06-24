import { DrillTr } from './drill'

export default function Q2() {
  return (
    <section className="view active" id="q2">
      <div className="vhead">
        <div className="q">
          Operational Safety <span className="ans warn">Operating · 1 contained</span>
        </div>
        <div className="qsub">Can the business operate safely today?</div>
        <div className="lead">
          Whether the revenue-bearing processes can run without unacceptable cyber risk — and whether
          anything could force a shutdown today. Business terms, not server health.
        </div>
      </div>

      <div className="ansgrid">
        <div className="ansc">
          <div className="l">Why we can say this</div>
          <div className="v">
            Every critical process is up. The one control failure (claims, 14:02) is on a compensating
            control verified holding. No exposure is one step from forcing a takedown.
          </div>
        </div>
        <div className="ansc">
          <div className="l">What it means for the business</div>
          <div className="v">
            Claims keeps processing $220M/day. No customer impact. The contained failure can recur
            until PAM closes the underlying path — managed, not urgent.
          </div>
        </div>
        <div className="ansc chg">
          <div className="l">What changed</div>
          <div className="v">
            Claims control failed at 14:02 and was auto-contained in 2s. Recovery readiness unchanged
            at 78% — still the weakest link if a real outage hit.
          </div>
        </div>
        <div className="ansc">
          <div className="l">Could anything force us down today?</div>
          <div className="v" style={{ color: 'var(--pass)' }}>
            No — all open exposure is contained &amp; monitored.
          </div>
        </div>
      </div>

      <div className="sec-h">
        <h3>Can each revenue process run safely?</h3>
      </div>
      <table className="tbl">
        <thead>
          <tr>
            <th style={{ width: '34%' }}>Process</th>
            <th>Operate today?</th>
            <th>Recovery if hit</th>
            <th>Watch item</th>
          </tr>
        </thead>
        <tbody>
          <DrillTr ev="proc-claims">
            <td><div className="pn">Claims Processing</div><div className="ex">$220M/day</div></td>
            <td><span className="rk med">Yes · compensating control</span></td>
            <td>~3.5 days (78% ready)</td>
            <td>Open ransomware path</td>
          </DrillTr>
          <DrillTr ev="proc-payments">
            <td><div className="pn">Provider Payments</div></td>
            <td><span className="rk low">Yes · clean</span></td>
            <td>&lt; 1 day</td>
            <td>None</td>
          </DrillTr>
          <DrillTr ev="proc-portal">
            <td><div className="pn">Member Portal</div></td>
            <td><span className="rk low">Yes</span></td>
            <td>&lt; 1 day</td>
            <td>Credential-stuffing pressure</td>
          </DrillTr>
          <DrillTr ev="proc-ai">
            <td><div className="pn">AI-Assisted Claims</div></td>
            <td><span className="rk med">Yes · ungoverned</span></td>
            <td>n/a</td>
            <td>No model oversight</td>
          </DrillTr>
        </tbody>
      </table>
      <div className="scn">
        <span className="sl">If the compensating control also failed →</span>Claims processing would
        halt. Resumption ~3.5 days at current recovery readiness, <b>$0–1.1M direct loss</b>, below
        the materiality threshold. Closing the path (a Decision) removes this scenario.
      </div>
    </section>
  )
}
