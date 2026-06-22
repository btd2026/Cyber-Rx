/**
 * ExecutiveRoleTabs — the executive role views as one accessible tab set.
 *
 * Seven seats (CEO · CISO · CIO · CFO · CRO · CLO · Board), every one rendered
 * through the SAME decision-first, six-layer panel anatomy:
 *   1 VERDICT · 2 DECISIONS THAT NEED YOU · 3 ACTIVE EXPOSURE ·
 *   4 OBLIGATIONS / GOVERNANCE · 5 TREND vs TARGET · 6 EVIDENCE ON DEMAND
 *
 * One running incident threads every seat so they tell a single story, each in
 * the leader's own terms. All color/type/spacing comes from the design tokens
 * (cyberrx-design-tokens.css) via CSS custom properties — no hard-coded hex.
 *
 * Accent: GREEN (var(--pass)) for the active tab + primary actions. Because
 * --pass is also the "verified / control holds" status color, every *status* use
 * is shown with a ✓ glyph + label, never color alone, so the meanings don't blur.
 *
 * Placeholder copy is marked "(placeholder)" where it isn't yet live data.
 */

import { useRef, useState } from 'react';
import TrendVsTarget from './TrendVsTarget';

/* ---- The single running incident (shared spine) ----------------------------- */
const INCIDENT = {
  headline: 'An access control protecting customer card payments failed at 14:02; a compensating control is applied and verified holding; exposure is a single internet-facing path; materiality under review.',
  failedAt: '14:02 UTC',
  control: 'Payment-tokenization access control (PCI scope)',
  compensating: 'WAF rule + network ACL isolating the affected path',
};

/* ---- Severity → token mapping (by meaning only) ----------------------------- */
const STATE = {
  contained: { color: 'var(--pass)', tint: 'var(--pass-tint)', verified: true },
  exposure: { color: 'var(--exposure)', tint: 'var(--exposure-tint)' },
  critical: { color: 'var(--critical)', tint: 'var(--critical-tint)' },
  info: { color: 'var(--text-muted)', tint: 'var(--surface-2)' },
};

/* ===========================================================================
 * Per-seat content — every seat fills all six layers with what it actually needs.
 * ======================================================================== */
const SEATS = [
  {
    key: 'ceo', label: 'CEO', question: 'Is the business safe and are we in control?',
    verdict: { sentence: 'Customer-facing revenue was briefly exposed and is now contained — nothing requires you to act, and you’ll be briefed.', state: 'contained', stateLabel: 'Contained', delta: 'New since last login' },
    decisions: [
      { title: 'External-communications hold', exposed: 'A leak or premature statement could create brand/legal risk before facts are confirmed.', options: ['Hold all external comms', 'Pre-approve a holding statement'], recommendation: 'Hold; pre-stage a holding statement with Comms + Legal.' },
      { title: 'Customer / partner notification', exposed: 'No confirmed data loss yet; notifying early may be premature, notifying late may breach trust.', options: ['Notify now', 'Defer pending materiality', 'Notify affected partners only'], recommendation: 'Defer broad notice; brief key partners under NDA.', clock: { label: 'Materiality review', remaining: 'in progress' } },
      { title: 'Convene crisis posture', exposed: 'Standing up a crisis team signals seriousness and cost; not doing so risks slow response if it escalates.', options: ['Convene now', 'Keep on standby'], recommendation: 'Standby — management has containment verified.' },
    ],
    exposure: {
      blastRadius: [
        { k: 'Revenue at risk', v: '≈ $180K / hr while degraded — currently $0 (path isolated) (placeholder)' },
        { k: 'Customers affected', v: 'None confirmed; single payment path, not the storefront' },
        { k: 'Brand / reputation', v: 'Low — no outward-facing disruption' },
        { k: 'Business unit', v: 'Payments — accountable exec: VP Commerce (placeholder)' },
      ],
      contained: { label: 'Contained — compensating control verified holding' },
      clock: { label: 'Public-disclosure window', remaining: 'not triggered' },
    },
    obligations: {
      items: [
        { k: 'Materiality / public disclosure', v: 'Under review with Legal + Finance; no disclosure obligation to date' },
        { k: 'What the board must hear', v: 'A briefing at the next scheduled session unless materiality changes' },
      ],
      draftLabel: 'Draft board note',
    },
    trend: { label: 'Enterprise cyber-risk posture vs board appetite', unit: '', targetLabel: 'Board appetite', goodWhen: 'high', target: 70,
      quarterly: [{ label: 'Q1', value: 61 }, { label: 'Q2', value: 64 }, { label: 'Q3', value: 66 }, { label: 'Q4', value: 68 }],
      monthly: [{ label: 'Apr', value: 64 }, { label: 'May', value: 65 }, { label: 'Jun', value: 66 }, { label: 'Jul', value: 68 }] },
    evidence: [
      { claim: 'How we know we’re contained', proof: ['compensating_control=WAF+ACL · status=ACTIVE', 'verification=synthetic-probe · result=BLOCKED · 14:09 UTC', 'exposed_paths=1 · internet_facing=true · reachable=false (post-control)'] },
    ],
  },

  {
    key: 'ciso', label: 'CISO', question: 'Am I exposed, and what’s the call?',
    verdict: { sentence: 'One material exposure touching payments is contained; every other control holds.', state: 'contained', stateLabel: 'Contained · 1 material exposure', delta: '↑ control re-verified since last login' },
    decisions: [
      { title: 'Hold compensating control vs force failover', exposed: 'The failed access control is bypassed by a WAF+ACL; failover restores the native control but risks a brief payment interruption.', options: ['Hold compensating control', 'Force failover to standby'], recommendation: 'Hold — probe confirms the path is blocked; schedule failover off-peak.', clock: { label: 'Vendor patch ETA', remaining: '~6 h (placeholder)' } },
      { title: 'Rotate vendor keys', exposed: 'The control vendor’s credential may share blast radius with the failure.', options: ['Rotate now', 'Rotate after RCA'], recommendation: 'Rotate now — low cost, removes a plausible second path.' },
      { title: 'Auto-remediate config drift', exposed: 'Drift in the tokenization config preceded the failure; auto-remediation prevents recurrence but may revert an intended change.', options: ['Enable auto-remediation', 'Manual review first'], recommendation: 'Manual review, then enable once RCA confirms intent.' },
    ],
    exposure: {
      blastRadius: [
        { k: 'Control that failed', v: INCIDENT.control },
        { k: 'Business blast radius', v: 'Single internet-facing payment path; storefront + auth unaffected' },
        { k: 'Compensating control', v: INCIDENT.compensating },
        { k: 'Failed at', v: INCIDENT.failedAt },
      ],
      contained: { label: 'Containment verified at 14:09 UTC (synthetic probe)' },
      clock: { label: 'Disclosure clock', remaining: 'not started — materiality under review' },
    },
    obligations: {
      items: [
        { k: 'Materiality review', v: 'Co-owned with Legal/Finance; determination pending' },
        { k: 'SEC 8-K (Item 1.05)', v: '4 business days from a materiality determination — not yet triggered' },
        { k: 'GDPR Art. 33', v: '72 h from awareness of a personal-data breach — no personal data confirmed' },
        { k: 'State breach laws', v: 'Conditional on confirmed access to regulated data — none confirmed' },
      ],
      draftLabel: 'Draft board summary',
    },
    trend: { label: 'Residual risk vs appetite (by BU)', unit: '', targetLabel: 'Appetite ceiling', goodWhen: 'low', target: 40,
      quarterly: [{ label: 'Q1', value: 52 }, { label: 'Q2', value: 48 }, { label: 'Q3', value: 44 }, { label: 'Q4', value: 46 }],
      monthly: [{ label: 'Apr', value: 47 }, { label: 'May', value: 45 }, { label: 'Jun', value: 44 }, { label: 'Jul', value: 46 }] },
    evidence: [
      { claim: 'The control failed at 14:02', proof: ['control_id=PCI-AC-07 · event=DENY_RULE_EXPIRED', 'source=Splunk · index=pci_access · 14:02:11 UTC', 'drift_detected=true · prev_change=CHG-4821'] },
      { claim: 'Containment is holding', proof: ['compensating=WAF+ACL · synthetic_probe=BLOCKED', 'reverify_interval=5m · last=PASS', 'exposed_internet_paths=1 · reachable=false'] },
    ],
  },

  {
    key: 'cio', label: 'CIO', question: 'Are our systems and services operational?',
    verdict: { sentence: 'The payment service is operational under the compensating control — no customer-facing outage.', state: 'contained', stateLabel: 'Operational · degraded-safe', delta: 'No SLA breach since last login' },
    decisions: [
      { title: 'Failover vs hold (continuity tradeoff)', exposed: 'Failover restores native controls but risks ~2 min payment interruption; holding keeps uptime but runs on a compensating control.', options: ['Hold', 'Failover off-peak', 'Failover now'], recommendation: 'Hold; schedule failover in tonight’s change window.' },
      { title: 'Raise an emergency change record', exposed: 'The WAF+ACL change is in production without a formal ECR — a governance gap.', options: ['Raise ECR now', 'Backfill at RCA'], recommendation: 'Raise ECR now — emergency change must be on the record.', clock: { label: 'ECR backfill SLA', remaining: '24 h' } },
      { title: 'Schedule the drift fix · assign owner', exposed: 'Config drift will recur without a fix and an owner.', options: ['Assign to Platform team', 'Assign to vendor'], recommendation: 'Assign to Platform; vendor to supply patched config.' },
    ],
    exposure: {
      blastRadius: [
        { k: 'Systems / services affected', v: 'Payment tokenization service (1 of 42 services)' },
        { k: 'Dependencies', v: 'Checkout API → tokenization → card processor (placeholder map)' },
        { k: 'SLA / uptime impact', v: '99.98% MTD — within SLA; 0 min downtime' },
        { k: 'Users affected', v: 'None; recovery effort est. 2 h · owner: Platform Eng (placeholder)' },
      ],
      contained: { label: 'Service healthy under compensating control — health checks ✓ green' },
      clock: { label: 'Emergency change window', remaining: 'tonight 02:00–04:00' },
    },
    obligations: {
      items: [
        { k: 'Emergency-change governance', v: 'ECR required for the in-prod WAF+ACL change' },
        { k: 'Vendor / SLA duties', v: 'Notify control vendor; confirm patch SLA' },
        { k: 'Internal IT comms', v: 'Status note to service owners + NOC' },
      ],
      draftLabel: 'Draft IT status note',
    },
    trend: { label: 'Service reliability + control-health vs target (MTTR)', unit: '%', targetLabel: 'Reliability target', goodWhen: 'high', target: 99.9,
      quarterly: [{ label: 'Q1', value: 99.7 }, { label: 'Q2', value: 99.8 }, { label: 'Q3', value: 99.95 }, { label: 'Q4', value: 99.98 }],
      monthly: [{ label: 'Apr', value: 99.9 }, { label: 'May', value: 99.92 }, { label: 'Jun', value: 99.96 }, { label: 'Jul', value: 99.98 }] },
    evidence: [
      { claim: 'No customer-facing outage', proof: ['service=token-svc · health=GREEN · checks=passing', 'uptime_mtd=99.98% · sla=99.9%', 'downtime_min=0 · synthetic_txn=PASS'] },
      { claim: 'Change is unrecorded (ECR gap)', proof: ['change=WAF+ACL · ecr_id=null · applied_by=oncall', 'detected=true · governance_flag=EMERGENCY_CHANGE_NO_ECR'] },
    ],
  },

  {
    key: 'cfo', label: 'CFO', question: 'What’s the financial exposure, and is it material?',
    verdict: { sentence: 'Exposure is bounded to the payments path, below the insurance-notification threshold — no write-down today.', state: 'contained', stateLabel: 'Bounded · immaterial to date', delta: 'No change to reserves since last login' },
    decisions: [
      { title: 'Notify the cyber-insurance carrier', exposed: 'Late notice can void coverage; early notice on a non-event spends goodwill.', options: ['Notify now (precautionary)', 'Hold below threshold'], recommendation: 'Hold — exposure is below the policy’s notification trigger; re-evaluate if materiality changes.', clock: { label: 'Policy notice window', remaining: 'not triggered' } },
      { title: 'Authorize incident spend', exposed: 'RCA, vendor patch, and possible failover carry cost.', options: ['Approve up to $50K', 'Approve up to $150K'], recommendation: 'Approve up to $50K from the incident reserve (placeholder).' },
      { title: 'Reserve / quantify potential loss', exposed: 'If unresolved, exposure compounds at ≈ $180K/hr.', options: ['Book a contingent reserve', 'No reserve — immaterial'], recommendation: 'No reserve today; document the bounded range.' },
    ],
    exposure: {
      blastRadius: [
        { k: 'Revenue at risk / hr', v: '≈ $180K while degraded — currently $0 (contained) (placeholder)' },
        { k: 'Bounded impact if unresolved', v: '$0.2M–$1.4M range (24 h) (placeholder loss model)' },
        { k: 'Insurance-threshold status', v: 'Below notification threshold ✓' },
        { k: 'Penalties / remediation cost', v: 'No penalties triggered; remediation ≈ $50K (placeholder)' },
      ],
      contained: { label: 'Financial exposure bounded — no loss realized, control verified' },
      clock: { label: 'Insurance notification clock', remaining: 'not started' },
    },
    obligations: {
      items: [
        { k: 'Financial-materiality determination', v: 'Co-owned with Legal; pending — currently immaterial' },
        { k: 'Insurance clock', v: 'Begins only on a notifiable event — not reached' },
        { k: 'Investor-disclosure considerations', v: 'None unless materiality determination changes' },
      ],
      draftLabel: 'Draft finance note',
    },
    trend: { label: 'Cyber financial exposure vs $-appetite (annualized loss expectancy)', unit: '$M', targetLabel: 'ALE appetite', goodWhen: 'low', target: 5,
      quarterly: [{ label: 'Q1', value: 6.1 }, { label: 'Q2', value: 5.4 }, { label: 'Q3', value: 4.8 }, { label: 'Q4', value: 4.6 }],
      monthly: [{ label: 'Apr', value: 5.2 }, { label: 'May', value: 4.9 }, { label: 'Jun', value: 4.7 }, { label: 'Jul', value: 4.6 }] },
    evidence: [
      { claim: 'Below the insurance notification threshold', proof: ['policy=CYB-2026 · notify_trigger=$2.0M single-loss', 'modeled_loss_p50=$0.4M · p90=$1.1M', 'realized_loss=$0 · status=BELOW_THRESHOLD'] },
      { claim: 'Bounded impact range', proof: ['model=FAIR · freq=1 event · magnitude=$0.2M–$1.4M (24h)', 'revenue_at_risk_hr=$180K · degraded_hrs=0'] },
    ],
  },

  {
    key: 'cro', label: 'CRO', question: 'Where does this sit against our risk appetite?',
    verdict: { sentence: 'One risk moved above appetite (payments); aggregate posture remains within tolerance.', state: 'exposure', stateLabel: '1 risk above appetite', delta: '↑ 1 appetite breach since last login' },
    decisions: [
      { title: 'Accept / transfer / mitigate', exposed: 'The payments risk is above appetite while on a compensating control.', options: ['Accept (time-boxed)', 'Transfer (insurance)', 'Mitigate (failover + fix)'], recommendation: 'Mitigate; time-boxed acceptance until the native control is restored.' },
      { title: 'Update the risk register', exposed: 'The register must reflect the live position and treatment.', options: ['Update now', 'Update at RCA'], recommendation: 'Update now — keep the register defensible.', clock: { label: 'Register SLA', remaining: '24 h' } },
      { title: 'Escalate to the risk committee', exposed: 'An appetite breach typically triggers committee escalation.', options: ['Escalate now', 'Note in next pack'], recommendation: 'Escalate as an out-of-cycle note; contained but above appetite.' },
    ],
    exposure: {
      blastRadius: [
        { k: 'Enterprise risk mapped', v: 'R-07 Payments availability & data integrity' },
        { k: 'Likelihood × impact', v: 'L: Low (contained) × I: High → above appetite' },
        { k: 'Position vs appetite', v: 'Above appetite (single risk); aggregate within tolerance' },
        { k: 'Concentration / 3rd-party', v: 'Correlated to the control vendor — concentration flag (placeholder)' },
      ],
      contained: { label: 'Likelihood reduced — compensating control verified holding' },
      clock: { label: 'Appetite-breach escalation', remaining: 'out-of-cycle note due' },
    },
    obligations: {
      items: [
        { k: 'Risk-committee / board reporting', v: 'Out-of-cycle note; full item in the quarterly pack' },
        { k: 'Appetite-breach escalation', v: 'Triggered for R-07 — escalation path engaged' },
        { k: 'Regulatory risk-management', v: 'Document treatment decision + rationale' },
      ],
      draftLabel: 'Draft risk-committee note',
    },
    trend: { label: 'Residual risk vs appetite (over quarters)', unit: '', targetLabel: 'Appetite ceiling', goodWhen: 'low', target: 40,
      quarterly: [{ label: 'Q1', value: 38 }, { label: 'Q2', value: 39 }, { label: 'Q3', value: 37 }, { label: 'Q4', value: 43 }],
      monthly: [{ label: 'Apr', value: 37 }, { label: 'May', value: 38 }, { label: 'Jun', value: 37 }, { label: 'Jul', value: 43 }] },
    evidence: [
      { claim: 'R-07 is above appetite', proof: ['risk_id=R-07 · score=43 · appetite_ceiling=40', 'method=L×I · L=2 (contained) · I=4', 'breach=true · aggregate_residual=within_tolerance'] },
    ],
  },

  {
    key: 'clo', label: 'CLO', question: 'Do we have an obligation, and is our position defensible?',
    verdict: { sentence: 'No disclosure is triggered yet; the clock is tracked and evidence is preserved under privilege.', state: 'info', stateLabel: 'No obligation triggered', delta: 'Litigation-hold status unchanged' },
    decisions: [
      { title: 'Make / defer the materiality call', exposed: 'Calling it material starts disclosure clocks; deferring without basis risks defensibility.', options: ['Determine now', 'Defer with documented basis'], recommendation: 'Defer with a documented basis; reassess on new facts.', clock: { label: 'SEC 8-K (if material)', remaining: '4 business days from determination' } },
      { title: 'Engage outside counsel', exposed: 'Privilege and multi-jurisdiction exposure may exceed in-house scope.', options: ['Engage now', 'Hold'], recommendation: 'Engage now to anchor privilege and the obligations matrix.' },
      { title: 'Litigation hold / notices / privilege', exposed: 'Evidence must be preserved and privilege managed before any notice.', options: ['Issue hold now', 'Scope first'], recommendation: 'Issue the hold now; scope regulator/customer notices in parallel.' },
    ],
    exposure: {
      blastRadius: [
        { k: 'Regimes implicated', v: 'SEC · GDPR · US state breach laws · PCI DSS contractual' },
        { k: 'Contractual notice duties', v: 'Card-network + key-customer contracts (review) (placeholder)' },
        { k: 'Liability / litigation exposure', v: 'Low while no data access confirmed' },
        { k: 'Data subjects affected', v: 'None confirmed' },
      ],
      contained: { label: 'Evidence preserved under privilege — litigation hold ✓ active' },
      clock: { label: 'Multi-jurisdiction disclosure clock', remaining: 'not started' },
    },
    obligations: {
      items: [
        { k: 'Disclosure clock + obligations matrix', v: 'SEC / GDPR / state — none triggered; matrix maintained' },
        { k: 'Regulator / customer notices', v: 'Drafts staged; not issued' },
        { k: 'Privilege & preservation', v: 'Hold active; communications marked privileged' },
      ],
      draftLabel: 'Draft regulator / customer notice',
    },
    trend: { label: 'Obligations met on time (disclosure events)', unit: '%', targetLabel: 'On-time target', goodWhen: 'high', target: 100,
      quarterly: [{ label: 'Q1', value: 100 }, { label: 'Q2', value: 100 }, { label: 'Q3', value: 95 }, { label: 'Q4', value: 100 }],
      monthly: [{ label: 'Apr', value: 100 }, { label: 'May', value: 100 }, { label: 'Jun', value: 100 }, { label: 'Jul', value: 100 }] },
    evidence: [
      { claim: 'No disclosure obligation to date', proof: ['determination=pending · basis=no_confirmed_data_access', 'sec_clock=not_started · gdpr_clock=not_started', 'privilege=asserted · hold_id=LH-2026-014'] },
    ],
  },

  {
    key: 'board', label: 'Board', question: 'Is management in control, and is anything material?',
    verdict: { sentence: 'One material-candidate event, contained by management, with no disclosure obligation to date.', state: 'contained', stateLabel: 'Management in control', delta: 'New item for oversight since last meeting' },
    decisions: [
      { title: 'Acknowledge the briefing', exposed: 'The board’s oversight record should show it was briefed.', options: ['Acknowledge', 'Request more detail'], recommendation: 'Acknowledge; minute the briefing.' },
      { title: 'Flag any item needing board action', exposed: 'Disclosure approval or a special committee may be needed if materiality changes.', options: ['No action needed now', 'Pre-authorize disclosure path', 'Form special committee'], recommendation: 'No action now; pre-agree the disclosure path if it turns material.' },
      { title: 'Oversight questions to ask', exposed: 'Effective oversight is evidenced by the questions asked.', options: ['Use suggested questions', 'Defer'], recommendation: 'Ask: containment durability, materiality basis, customer impact.' },
    ],
    exposure: {
      blastRadius: [
        { k: 'What happened', v: 'A payment-path security control failed briefly; management isolated it' },
        { k: 'Business impact', v: 'No customer impact; no confirmed data loss' },
        { k: 'Contained?', v: 'Yes — verified by management' },
        { k: 'Accountable / material?', v: 'CISO + VP Commerce accountable; materiality under review' },
      ],
      contained: { label: 'Contained by management — independently verified ✓' },
      clock: { label: 'Disclosure obligation', remaining: 'none to date' },
    },
    obligations: {
      items: [
        { k: 'Materiality & disclosure status', v: 'Under review; no obligation to date' },
        { k: 'How management handled it', v: 'Detected, contained, verified, and escalated within policy' },
        { k: 'Oversight record', v: 'Briefing minuted; questions and responses recorded' },
      ],
      draftLabel: 'Draft board minute entry',
    },
    trend: { label: 'Enterprise posture vs appetite (quarterly oversight)', unit: '', targetLabel: 'Board appetite', goodWhen: 'high', target: 70,
      quarterly: [{ label: 'Q1', value: 61 }, { label: 'Q2', value: 64 }, { label: 'Q3', value: 66 }, { label: 'Q4', value: 68 }],
      monthly: [{ label: 'Apr', value: 64 }, { label: 'May', value: 65 }, { label: 'Jun', value: 66 }, { label: 'Jul', value: 68 }] },
    evidence: [
      { claim: 'The defensible oversight record', proof: ['board_summary=generated · timeline=preserved', 'attestation=CISO+GC · 14:40 UTC', 'mttr_min=7 · containment_verified=true'] },
    ],
  },
];

/* ===========================================================================
 * Component
 * ======================================================================== */
export default function ExecutiveRoleTabs() {
  const [active, setActive] = useState(0);
  const tabRefs = useRef([]);

  const onKeyDown = (e) => {
    const n = SEATS.length;
    let next = null;
    if (e.key === 'ArrowRight') next = (active + 1) % n;
    else if (e.key === 'ArrowLeft') next = (active - 1 + n) % n;
    else if (e.key === 'Home') next = 0;
    else if (e.key === 'End') next = n - 1;
    if (next != null) {
      e.preventDefault();
      setActive(next);
      const el = tabRefs.current[next];
      if (el) el.focus();
    }
  };

  const seat = SEATS[active];

  return (
    <div style={{ fontFamily: 'var(--font-body)', color: 'var(--text)', maxWidth: 920, margin: '0 auto', padding: 'var(--space-4)' }}>
      <ScopedStyles />

      {/* The single running incident — the spine every seat re-frames. */}
      <div className="exec-incident" role="note" aria-label="Active incident">
        <span className="exec-incident__dot" aria-hidden="true" />
        <div>
          <div className="exec-incident__kicker">Active incident · {INCIDENT.failedAt}</div>
          <div className="exec-incident__text">{INCIDENT.headline}</div>
        </div>
      </div>

      {/* Tablist */}
      <div role="tablist" aria-label="Executive role views" className="exec-tablist" onKeyDown={onKeyDown}>
        {SEATS.map((s, i) => {
          const on = i === active;
          return (
            <button key={s.key} ref={(el) => { tabRefs.current[i] = el; }} role="tab" id={`exectab-${s.key}`}
              aria-selected={on} aria-controls={`execpanel-${s.key}`} tabIndex={on ? 0 : -1}
              className="exec-tab" onClick={() => setActive(i)}>
              {s.label}
            </button>
          );
        })}
      </div>

      {/* Tabpanel */}
      <div role="tabpanel" id={`execpanel-${seat.key}`} aria-labelledby={`exectab-${seat.key}`} tabIndex={0} className="exec-panel">
        <div className="exec-question">{seat.question}</div>

        <Layer n={1} title="Verdict"><Verdict v={seat.verdict} /></Layer>
        <Layer n={2} title="Decisions that need you"><Decisions items={seat.decisions} /></Layer>
        <Layer n={3} title="Active exposure"><Exposure x={seat.exposure} /></Layer>
        <Layer n={4} title="Obligations / governance"><Obligations o={seat.obligations} /></Layer>
        <Layer n={5} title="Trend vs target"><TrendVsTarget {...seat.trend} /></Layer>
        <Layer n={6} title="Evidence on demand"><Evidence items={seat.evidence} /></Layer>
      </div>
    </div>
  );
}

/* ---- Layer frame ----------------------------------------------------------- */
function Layer({ n, title, children }) {
  return (
    <section className="exec-layer">
      <div className="exec-layer__head">
        <span className="exec-layer__n" aria-hidden="true">{String(n).padStart(2, '0')}</span>
        <h3 className="exec-layer__title">{title}</h3>
      </div>
      <div>{children}</div>
    </section>
  );
}

/* ---- 1 · Verdict ----------------------------------------------------------- */
function Verdict({ v }) {
  const st = STATE[v.state] || STATE.info;
  return (
    <div className="exec-verdict" style={{ borderLeft: `4px solid ${st.color}` }}>
      <p className="exec-verdict__sentence">{v.sentence}</p>
      <div className="exec-verdict__meta">
        <StatusChip state={v.state} label={v.stateLabel} />
        <span className="exec-verdict__delta">{v.delta}</span>
      </div>
    </div>
  );
}

/* A status chip. For the "contained/verified" meaning of --pass, always show the
   ✓ glyph + label so the accent and status uses of green can't be confused. */
function StatusChip({ state, label }) {
  const st = STATE[state] || STATE.info;
  return (
    <span className="exec-chip" style={{ color: st.color, background: st.tint }}>
      {st.verified ? '✓ ' : ''}{label}
    </span>
  );
}

/* ---- 2 · Decisions --------------------------------------------------------- */
function Decisions({ items }) {
  return (
    <div className="exec-stack">
      {items.map((d, i) => (
        <article key={i} className="exec-card">
          <div className="exec-card__head">
            <h4 className="exec-decision__title">{d.title}</h4>
            {d.clock && <Clock {...d.clock} />}
          </div>
          <p className="exec-kv"><span className="exec-kv__k">What’s exposed</span> {d.exposed}</p>
          <div className="exec-options">
            {d.options.map((o, j) => <span key={j} className="exec-option">{o}</span>)}
          </div>
          <p className="exec-reco"><span className="exec-reco__k">Recommendation</span> {d.recommendation}</p>
        </article>
      ))}
    </div>
  );
}

/* ---- 3 · Active exposure --------------------------------------------------- */
function Exposure({ x }) {
  return (
    <div className="exec-card">
      <dl className="exec-dl">
        {x.blastRadius.map((r, i) => (
          <div key={i} className="exec-dl__row">
            <dt>{r.k}</dt><dd>{r.v}</dd>
          </div>
        ))}
      </dl>
      <div className="exec-exposure__foot">
        <span className="exec-verified">✓ {x.contained.label}</span>
        {x.clock && <Clock {...x.clock} />}
      </div>
    </div>
  );
}

/* ---- 4 · Obligations / governance ----------------------------------------- */
function Obligations({ o }) {
  return (
    <div className="exec-card">
      <dl className="exec-dl">
        {o.items.map((it, i) => (
          <div key={i} className="exec-dl__row">
            <dt>{it.k}</dt><dd>{it.v}{it.clock && <> · <Clock {...it.clock} /></>}</dd>
          </div>
        ))}
      </dl>
      <button type="button" className="exec-btn exec-btn--primary">⤓ {o.draftLabel}</button>
    </div>
  );
}

/* ---- 6 · Evidence on demand ------------------------------------------------ */
function Evidence({ items }) {
  return (
    <div className="exec-stack">
      {items.map((e, i) => (
        <details key={i} className="exec-evidence">
          <summary>{e.claim}</summary>
          <pre className="exec-evidence__proof">{e.proof.join('\n')}</pre>
        </details>
      ))}
    </div>
  );
}

/* A running clock — uses the exposure (amber) meaning, never the accent. */
function Clock({ label, remaining }) {
  const running = !/not (started|triggered)|none|in progress/i.test(remaining);
  return (
    <span className="exec-clock" style={{ color: running ? 'var(--exposure)' : 'var(--text-subtle)' }}>
      ⏱ {label}: <strong>{remaining}</strong>
    </span>
  );
}

/* ---- Scoped styles (token-driven; pseudo-states need real CSS) ------------- */
function ScopedStyles() {
  return (
    <style>{`
      .exec-incident { display:flex; gap:var(--space-3); align-items:flex-start; background:var(--surface-2);
        border:1px solid var(--border); border-left:4px solid var(--exposure); border-radius:var(--radius-md);
        padding:var(--space-3) var(--space-4); margin-bottom:var(--space-4); }
      .exec-incident__dot { width:9px; height:9px; border-radius:50%; background:var(--exposure); margin-top:5px; flex-shrink:0; }
      @media (prefers-reduced-motion: no-preference){ .exec-incident__dot{ animation:execPulse 2s ease-in-out infinite; } }
      @keyframes execPulse { 0%,100%{ opacity:1 } 50%{ opacity:.35 } }
      .exec-incident__kicker { font-size:10px; font-weight:700; letter-spacing:.09em; text-transform:uppercase; color:var(--exposure); }
      .exec-incident__text { font-size:13px; line-height:1.6; color:var(--text); margin-top:2px; max-width:760px; }

      .exec-tablist { display:flex; gap:0; border-bottom:1px solid var(--border); overflow-x:auto; }
      .exec-tab { background:transparent; border:none; border-bottom:2px solid transparent; padding:10px 18px;
        font-family:var(--font-body); font-size:13px; font-weight:500; color:var(--text-muted); cursor:pointer; white-space:nowrap; }
      .exec-tab:hover { color:var(--text); }
      .exec-tab[aria-selected="true"] { color:var(--pass); font-weight:700; border-bottom-color:var(--pass); }
      .exec-tab:focus-visible { outline:2px solid var(--focus); outline-offset:-2px; border-radius:var(--radius-sm); }

      .exec-panel { padding-top:var(--space-5); }
      .exec-panel:focus-visible { outline:2px solid var(--focus); outline-offset:3px; border-radius:var(--radius-md); }
      .exec-question { font-family:var(--font-display); font-size:14px; font-style:italic; color:var(--text-muted); margin-bottom:var(--space-5); }

      .exec-layer { margin-bottom:var(--space-6); }
      .exec-layer__head { display:flex; align-items:baseline; gap:var(--space-2); margin-bottom:var(--space-3); }
      .exec-layer__n { font-family:var(--font-mono); font-size:11px; font-weight:700; color:var(--pass); }
      .exec-layer__title { margin:0; font-size:10.5px; font-weight:700; letter-spacing:.1em; text-transform:uppercase; color:var(--text-subtle); }

      .exec-verdict { background:var(--surface); border:1px solid var(--border); border-radius:var(--radius-md); padding:var(--space-4) var(--space-5); box-shadow:var(--shadow-card); }
      .exec-verdict__sentence { margin:0; font-family:var(--font-display); font-size:20px; line-height:1.4; font-weight:600; color:var(--text); }
      .exec-verdict__meta { display:flex; align-items:center; gap:var(--space-3); margin-top:var(--space-3); flex-wrap:wrap; }
      .exec-verdict__delta { font-size:11.5px; color:var(--text-subtle); font-family:var(--font-mono); }

      .exec-chip { font-size:11px; font-weight:700; border-radius:999px; padding:3px 10px; white-space:nowrap; }

      .exec-stack { display:grid; gap:var(--space-3); }
      .exec-card { background:var(--surface); border:1px solid var(--border); border-radius:var(--radius-md); padding:var(--space-4); box-shadow:var(--shadow-card); }
      .exec-card__head { display:flex; justify-content:space-between; align-items:baseline; gap:var(--space-3); flex-wrap:wrap; }
      .exec-decision__title { margin:0; font-family:var(--font-display); font-size:15.5px; font-weight:600; color:var(--text); line-height:1.3; }

      .exec-kv { font-size:13px; line-height:1.6; color:var(--text); margin:var(--space-2) 0 0; }
      .exec-kv__k { display:block; font-size:9.5px; font-weight:700; letter-spacing:.08em; text-transform:uppercase; color:var(--text-subtle); margin-bottom:2px; }
      .exec-options { display:flex; flex-wrap:wrap; gap:var(--space-2); margin:var(--space-3) 0; }
      .exec-option { font-size:11.5px; color:var(--text-muted); background:var(--surface-2); border:1px solid var(--border); border-radius:var(--radius-sm); padding:3px 10px; }
      .exec-reco { font-size:13px; line-height:1.55; color:var(--text); margin:0; padding-top:var(--space-2); border-top:1px solid var(--border); }
      .exec-reco__k { font-weight:700; color:var(--pass); }

      .exec-dl { margin:0; display:grid; gap:0; }
      .exec-dl__row { display:grid; grid-template-columns:minmax(140px,200px) 1fr; gap:var(--space-3); padding:var(--space-2) 0; border-bottom:1px solid var(--border); }
      .exec-dl__row:last-child { border-bottom:none; }
      .exec-dl dt { font-size:11px; font-weight:700; color:var(--text-subtle); text-transform:uppercase; letter-spacing:.05em; }
      .exec-dl dd { margin:0; font-size:13px; line-height:1.55; color:var(--text); }
      .exec-exposure__foot { display:flex; justify-content:space-between; align-items:center; gap:var(--space-3); margin-top:var(--space-3); padding-top:var(--space-3); border-top:1px solid var(--border); flex-wrap:wrap; }
      .exec-verified { font-size:12px; font-weight:700; color:var(--pass); }

      .exec-clock { font-size:11.5px; font-family:var(--font-mono); white-space:nowrap; }

      .exec-btn { font-family:var(--font-body); font-size:12px; font-weight:600; border-radius:var(--radius-sm); padding:7px 14px; cursor:pointer; }
      .exec-btn--primary { margin-top:var(--space-3); background:var(--accent); color:var(--accent-on); border:1px solid var(--accent); }
      .exec-btn:focus-visible { outline:2px solid var(--focus); outline-offset:2px; }

      .exec-evidence { background:var(--surface); border:1px solid var(--border); border-radius:var(--radius-sm); padding:var(--space-2) var(--space-3); }
      .exec-evidence summary { cursor:pointer; font-size:12.5px; font-weight:600; color:var(--text); }
      .exec-evidence summary:focus-visible { outline:2px solid var(--focus); outline-offset:2px; border-radius:var(--radius-sm); }
      .exec-evidence__proof { margin:var(--space-2) 0 0; font-family:var(--font-mono); font-size:11px; line-height:1.7; color:var(--text-muted);
        background:var(--bg); border:1px solid var(--border); border-radius:var(--radius-sm); padding:var(--space-2) var(--space-3); white-space:pre-wrap; overflow-x:auto; }
    `}</style>
  );
}
