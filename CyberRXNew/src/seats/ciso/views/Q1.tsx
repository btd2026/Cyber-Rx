import { StatRow } from './drill'

export default function Q1() {
  return (
    <section className="view active" id="q1">
      <div className="vhead">
        <div className="q">
          Threat &amp; Compromise <span className="ans ok">No active compromise</span>
        </div>
        <div className="qsub">Are we compromised or under attack right now?</div>
        <div className="lead">
          The first question of the day: is there a live intrusion, what's being aimed at our crown
          jewels, and is anything mid-incident that needs me now.
        </div>
      </div>

      <div className="ansgrid">
        <div className="ansc">
          <div className="l">Why we can say this</div>
          <div className="v">
            No confirmed compromise across 1,240 monitored controls. EDR + SIEM show no active
            intrusion; identity shows no anomalous privileged sessions. Detection is live (8-min
            MTTD).
          </div>
        </div>
        <div className="ansc">
          <div className="l">What it means for the business</div>
          <div className="v">
            No reason to invoke incident response or notify anyone. Operations continue normally. The
            watch item is a phishing campaign targeting claims staff, not a breach.
          </div>
        </div>
        <div className="ansc chg">
          <div className="l">What changed since yesterday</div>
          <div className="v">
            Phishing volume up 12% against claims staff (one elevated campaign). Attacks blocked rose
            to 4,102. No change in compromise status.
          </div>
        </div>
        <div className="ansc">
          <div className="l">Needs you right now</div>
          <div className="v" style={{ color: 'var(--pass)' }}>
            Nothing. 0 incidents require a CISO decision this moment.
          </div>
        </div>
      </div>

      <div className="cols">
        <div className="panel">
          <h4>Live threat &amp; defense status</h4>
          <StatRow ev="intrusions" name="Active intrusions / confirmed compromise" stat="None ✓" tone="ok" />
          <StatRow ev="controls" name="Critical controls validated holding" sub="tested against live evidence" stat="1,238 / 1,240" tone="warn" />
          <StatRow ev="blocked" name="Attacks blocked, last 24h" sub="identity + perimeter" stat="4,102 blocked" tone="ok" />
          <StatRow ev="threat" name="Highest live threat" sub="phishing → claims staff" stat="Elevated" tone="warn" />
        </div>
        <div className="panel">
          <h4>Containment &amp; response readiness</h4>
          <StatRow ev="mttd" name="Mean time to detect / contain" stat="8 min / 41 min" tone="ok" />
          <StatRow ev="incidents" name="Incidents requiring your decision now" stat="0" tone="ok" />
          <StatRow ev="hunt" name="Threat hunting" sub="last sweep 6h ago, clean" stat="Current ✓" tone="ok" />
          <StatRow ev="soc" name="SOC staffed & on-call" stat="Full ✓" tone="ok" />
        </div>
      </div>
    </section>
  )
}
