type Go = (tab: string) => void

export default function MyLiability({ go }: { go: Go }) {
  return (
    <section className="view active" id="qL">
      <div className="vhead">
        <div className="q">
          My Liability <span className="ans ok">Low · documented</span>
        </div>
        <div className="qsub">Am I personally exposed?</div>
        <div className="lead">
          Not the company's liability — <b>yours</b>. Regulators now name individuals (the SolarWinds
          and Uber CISO cases). This is the record that protects you personally, what you've attested
          to, and the risks you personally own.
        </div>
      </div>

      <div className="ansgrid">
        <div className="ansc">
          <div className="l">Why your exposure is low today</div>
          <div className="v">
            Your decisions are documented with the evidence known at the time, the board was informed,
            reporting obligations were met, and the evidence chain is preserved — the elements a
            regulator or court weighs.
          </div>
        </div>
        <div className="ansc">
          <div className="l">What protects you</div>
          <div className="v" style={{ color: 'var(--pass)' }}>
            47 decisions on record with rationale · board informed · disclosure obligations met ·
            evidence chain integrity-verified.
          </div>
        </div>
        <div className="ansc chg">
          <div className="l">What could expose you</div>
          <div className="v">
            One known gap you now own: recovery testing is overdue. An accepted-but-unaddressed known
            risk is the classic personal-liability trap.
          </div>
        </div>
        <div className="ansc">
          <div className="l">What changed</div>
          <div className="v">
            You co-signed the quarterly SEC cyber-disclosure controls statement 6 days ago — a
            personal attestation. The ransomware-path risk is now active under a decision you own.
          </div>
        </div>
      </div>

      <div className="cols">
        <div className="panel">
          <h4>Your defensibility checklist</h4>
          <div className="srow"><div className="nm">Risk acceptances documented with rationale</div><span className="stat ok">Yes ✓</span></div>
          <div className="srow"><div className="nm">Leadership &amp; board properly informed</div><span className="stat ok">Yes ✓</span></div>
          <div className="srow"><div className="nm">Acted with reasonable care &amp; judgment <small>decisions evidence-based</small></div><span className="stat ok">Demonstrable ✓</span></div>
          <div className="srow"><div className="nm">Reporting / disclosure obligations met on time</div><span className="stat ok">Yes ✓</span></div>
          <div className="srow"><div className="nm">Crisis management exercised <small>last tabletop 5 months ago</small></div><span className="stat warn">Overdue</span></div>
          <div className="srow"><div className="nm">No known risk left unaddressed without sign-off</div><span className="stat warn">1 open · recovery</span></div>
        </div>
        <div className="panel">
          <h4>Personal attestations &amp; coverage</h4>
          <div className="srow"><div className="nm">SEC cyber-disclosure controls <small>co-signed 6 days ago</small></div><span className="stat ok">On record</span></div>
          <div className="srow"><div className="nm">Quarterly board risk attestation</div><span className="stat ok">Signed</span></div>
          <div className="srow"><div className="nm">D&amp;O insurance <small>covers individual officers</small></div><span className="stat ok">Active · $50M</span></div>
          <div className="srow"><div className="nm">Corporate indemnification <small>bylaws + agreement</small></div><span className="stat ok">In place</span></div>
          <div className="srow"><div className="nm">Personal legal counsel access</div><span className="stat ok">Available</span></div>
        </div>
      </div>

      <div className="sec-h">
        <h3>Risks you personally own right now</h3>
        <span className="meta">an accepted, undocumented, or unactioned known risk is what creates personal exposure</span>
      </div>
      <table className="tbl">
        <thead>
          <tr>
            <th style={{ width: '30%' }}>Risk you own</th>
            <th>Status</th>
            <th>Documented?</th>
            <th>Personal exposure</th>
          </tr>
        </thead>
        <tbody>
          <tr>
            <td><div className="pn">Open ransomware path (PAM deferral)</div></td>
            <td><span className="rk high">Active</span></td>
            <td>Yes · decision on record</td>
            <td>Managed — decision documented</td>
          </tr>
          <tr>
            <td><div className="pn">Recovery testing overdue</div></td>
            <td><span className="rk med">Known gap</span></td>
            <td><span style={{ color: 'var(--exposure)' }}>Not yet remediated</span></td>
            <td>Elevated — fix or formally accept</td>
          </tr>
          <tr>
            <td><div className="pn">Ungoverned AI on PHI</div></td>
            <td><span className="rk med">Rising</span></td>
            <td>Flagged · with CRO</td>
            <td>Shared — needs documented owner</td>
          </tr>
        </tbody>
      </table>

      <div className="bigstat" style={{ marginTop: 18 }}>
        Personal liability turns on three questions a regulator or court asks:{' '}
        <b>did you know, did you act reasonably, and can you prove it?</b> Every risk decision here is
        recorded with who decided, why, and what was known at the time — your defense if it's ever
        questioned. <em className="scn-link" onClick={() => go('q4')}>Review the decisions you own ▸</em>
      </div>

      <div className="legal-note">
        ⚖ This liability content is illustrative and <b>must be reviewed by legal counsel</b> before
        it is customer-facing (brief §10).
      </div>
    </section>
  )
}
