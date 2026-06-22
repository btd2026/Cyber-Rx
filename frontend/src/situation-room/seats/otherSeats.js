/**
 * The six non-CISO seats — same shape as the CISO reference, each reframing the
 * SAME running incident (a claims-processing control failed at 14:02, contained)
 * in that executive's lens. Tab keys match slug(tabName) used by SituationRoom.
 *
 * Shared incident facts are reused verbatim; figures with no clean source are
 * qualitative or marked (TODO real data) — no confident numbers invented.
 * These render through the generic SeatPanel; bind to per-seat APIs in a later pass.
 */

/* Shared posture series (illustrative) for the trajectory-style tabs. */
const POSTURE = {
  quarterly: [{ label: 'Q1', value: 72 }, { label: 'Q2', value: 75 }, { label: 'Q3', value: 78 }, { label: 'Q4', value: 82 }],
  monthly: [{ label: 'Mar', value: 77 }, { label: 'Apr', value: 79 }, { label: 'May', value: 80 }, { label: 'Jun', value: 82 }],
};
const trendUpDown = (up, down) => ({ kind: 'twocol', a: { title: 'Improving', tone: 'pass', items: up }, b: { title: 'Watch — needs attention', tone: 'exposure', items: down } });

const SEATS_DATA = {
  /* ===================== CEO — business language only ===================== */
  CEO: {
    summary: {
      verdict: 'The business is safe and in control — one contained incident, no customer or revenue impact.',
      pill: 'Contained', pillKind: 'pass', pillVerified: true,
      lede: 'A claims-processing control failed at 14:02 and was contained on a verified backup control. No customer data loss confirmed; revenue protected. Materiality is under review with Legal and Finance.',
      tiles: [
        { label: 'Business status', value: 'Operating', valueKind: 'pass', to: 'operating-status' },
        { label: 'Revenue at risk', value: '$220M/day', to: 'principal-business-risk' },
        { label: 'Customers impacted', value: 'None', valueKind: 'pass', to: 'operating-status' },
        { label: 'Principal risk', value: 'Claims', valueKind: 'critical', to: 'principal-business-risk' },
        { label: 'Board attention', value: '1', to: 'board-executive-attention' },
        { label: 'Posture vs target', value: '82 / 85', to: 'trajectory' },
      ],
      briefing: [
        { q: 'Are operations and revenue protected?', a: 'Yes — every critical service is operating; no revenue or customer impact.', pill: 'Operating', kind: 'pass', verified: true, to: 'operating-status' },
        { q: 'What is the biggest risk to the business?', a: 'Claims processing — $220M/day if disrupted; one contained ransomware path to PHI.', pill: '1 High ↑', kind: 'exposure', to: 'principal-business-risk' },
        { q: 'What needs the board or executives?', a: 'One item: brief the board on the contained incident; pre-agree the disclosure path if materiality changes.', pill: '1 item', kind: 'brand', to: 'board-executive-attention' },
        { q: 'Are we getting better?', a: 'Improving (+4) and approaching the board target of 85.', pill: 'Improving ↑', kind: 'pass', verified: true, to: 'trajectory' },
      ],
    },
    tabs: {
      'operating-status': {
        name: 'Operating Status', q: 'Are operations and revenue protected?',
        answer: 'Yes — operations and revenue are protected.', pill: 'Operating', pillKind: 'pass', pillVerified: true,
        lede: 'Business continuity in plain terms — not systems uptime.',
        sections: [
          { kind: 'rows', title: 'What the business sees', items: [
            { k: 'Critical services operating', v: 'All', verified: true, kind: 'pass' },
            { k: 'Revenue impact', v: '$0 lost' },
            { k: 'Customers impacted', v: 'None confirmed', verified: true, kind: 'pass' },
            { k: 'Workforce disruption', v: 'None' },
          ] },
          { kind: 'note', text: 'The affected claims control is on a verified compensating control. If it had failed open, claims would resume within ~3.5 days (recovery estimate).' },
        ],
      },
      'principal-business-risk': {
        name: 'Principal Business Risk', q: 'What could hurt the business?',
        answer: 'Claims processing is the principal risk — high and rising.', pill: '1 High ↑', pillKind: 'exposure',
        lede: 'The exposures that matter to the business, expressed as processes — not servers.',
        sections: [
          { kind: 'table', title: 'Business risks', note: 'derived from process protection',
            head: ['Process', 'Risk', "What's at stake"],
            rows: [
              { cells: [{ t: 'Claims Processing', name: true }, { t: 'High', pill: true, kind: 'critical' }, { t: '$220M/day if down; open ransomware path to claims DB', exposed: true }] },
              { cells: [{ t: 'AI-Assisted Claims Review', name: true }, { t: 'High', pill: true, kind: 'critical' }, { t: 'Ungoverned model decisions touching PHI', exposed: true }] },
              { cells: [{ t: 'Call Center Operations', name: true }, { t: 'Medium', pill: true, kind: 'exposure' }, { t: 'Vendor-dependent; identity exposure', exposed: true }] },
              { cells: [{ t: 'Member Portal', name: true }, { t: 'Medium', pill: true, kind: 'exposure' }, { t: 'Internet-facing; credential-stuffing pressure', exposed: true }] },
            ] },
          { kind: 'chain', title: 'Most likely path to the crown jewels',
            steps: ['Phishing email', 'Compromised user', 'Active Directory', 'Claims database', 'PHI exposure'],
            stats: [{ k: 'Likelihood', v: 'High' }, { k: 'Blast radius', v: '2.4M records' }, { k: 'Time to contain', v: '~6 hrs' }] },
        ],
      },
      'board-executive-attention': {
        name: 'Board & Executive Attention', q: 'What is rising to the board?',
        answer: 'One item for the board; no action required today.', pill: '1 item', pillKind: 'brand',
        lede: 'What management is escalating, and what (if anything) the board must decide.',
        sections: [
          { kind: 'decisions', title: 'Rising to the board', button: 'Generate board package →', items: [
            { sev: 'BRIEF', kind: 'exposure', title: 'Brief the board on the contained claims incident.', owner: 'Owner: CEO / CISO → next session' },
            { sev: 'PRE-AGREE', kind: 'exposure', title: 'Pre-agree the disclosure path if materiality changes.', owner: 'Owner: CLO → standby' },
          ] },
          { kind: 'rows', title: 'Status', items: [
            { k: 'Materiality', v: 'Under review', kind: 'exposure' },
            { k: 'Disclosure obligation', v: 'None to date', verified: true, kind: 'pass' },
          ] },
        ],
      },
      trajectory: {
        name: 'Trajectory', q: 'Are we getting better?',
        answer: 'Improving — posture is closing on the board target.', pill: 'Improving ↑', pillKind: 'pass', pillVerified: true,
        lede: 'Enterprise posture against the board-set target.',
        sections: [
          { kind: 'chart', posture: POSTURE, target: 85 },
          trendUpDown(['Identity & access (IAM)', 'Cloud security', 'Endpoint protection'], ['Third-party risk', 'Recovery testing', 'AI governance']),
        ],
      },
    },
  },

  /* ===================== CFO — dollars & materiality ===================== */
  CFO: {
    summary: {
      verdict: 'Financial exposure is bounded and below the insurance-notification threshold — no write-down today.',
      pill: 'Bounded · immaterial to date', pillKind: 'pass', pillVerified: true,
      lede: 'The contained claims incident has realized no loss. Modeled exposure is $0–$1.1M, below the cyber policy’s notification trigger. Materiality is under review with Legal.',
      tiles: [
        { label: 'Realized loss', value: '$0', valueKind: 'pass', to: 'financial-exposure' },
        { label: 'Modeled exposure', value: '$0–1.1M', to: 'financial-exposure' },
        { label: 'Revenue at risk / day', value: '$220M', to: 'financial-exposure' },
        { label: 'Insurance threshold', value: 'Below', valueKind: 'pass', to: 'materiality' },
        { label: 'Decisions for you', value: '2', to: 'decisions-required' },
        { label: 'Incident spend', value: '≈$50K', to: 'return-on-investment' },
      ],
      briefing: [
        { q: 'What is the financial exposure?', a: 'Bounded to the payments path; $0 realized, modeled $0–$1.1M over 24h.', pill: 'Bounded', kind: 'pass', verified: true, to: 'financial-exposure' },
        { q: 'Is it material?', a: 'Below the insurance notification threshold; materiality determination pending with Legal.', pill: 'Immaterial to date', kind: 'exposure', to: 'materiality' },
        { q: 'What needs a decision?', a: 'Hold insurance notice (below trigger); approve up to $50K incident spend from reserve.', pill: '2 decisions', kind: 'exposure', to: 'decisions-required' },
        { q: 'What is the return on spend?', a: 'PAM ($4.2M) closes the open path; recovery modernization ($6.0M) lifts readiness 78%→90%+.', pill: 'On track', kind: 'pass', verified: true, to: 'return-on-investment' },
      ],
    },
    tabs: {
      'financial-exposure': {
        name: 'Financial Exposure', q: 'What is the financial exposure?',
        answer: 'Exposure is bounded to the payments path — no loss realized.', pill: 'Bounded', pillKind: 'pass', pillVerified: true,
        lede: 'Dollars, bounded ranges, and what drives them.',
        sections: [
          { kind: 'rows', title: 'Exposure', items: [
            { k: 'Realized loss to date', v: '$0', verified: true, kind: 'pass' },
            { k: 'Modeled loss (FAIR, 24h)', sub: 'p50 / p90', v: '$0.4M / $1.1M' },
            { k: 'Revenue at risk while degraded', v: '≈$220M/day — currently $0 (contained)' },
            { k: 'Remediation cost estimate', v: '≈$50K' },
          ] },
          { kind: 'note', text: 'Modeled exposure is illustrative (FAIR). Bind to /api/cfo/exposure for live loss modeling.' },
        ],
      },
      materiality: {
        name: 'Materiality', q: 'Is it material?',
        answer: 'Below the insurance notification threshold; determination pending.', pill: 'Immaterial to date', pillKind: 'exposure',
        lede: 'The materiality call and the clocks it would start.',
        sections: [
          { kind: 'rows', title: 'Materiality & thresholds', items: [
            { k: 'Insurance notification threshold', v: 'Below ($2.0M single-loss trigger)', verified: true, kind: 'pass' },
            { k: 'Financial-materiality determination', v: 'Under review with Legal', kind: 'exposure' },
            { k: 'Investor-disclosure consideration', v: 'None unless determination changes' },
          ] },
        ],
      },
      'decisions-required': {
        name: 'Decisions Required', q: 'What needs a decision?',
        answer: 'Two finance decisions today; neither is urgent.', pill: '2 decisions', pillKind: 'exposure',
        lede: 'Decisions that are yours to make, with the trade-off stated.',
        sections: [
          { kind: 'decisions', title: 'Your decisions — today', button: 'Generate board package →', items: [
            { sev: 'HOLD', kind: 'exposure', title: 'Hold cyber-insurance notification — exposure is below the policy trigger.', owner: 'Owner: CFO → re-evaluate if materiality changes' },
            { sev: 'APPROVE', kind: 'exposure', title: 'Approve up to $50K incident spend from the reserve.', owner: 'Owner: CFO → RCA + vendor patch' },
          ] },
        ],
      },
      'return-on-investment': {
        name: 'Return on Investment', q: 'What are we getting for the spend?',
        answer: 'The roadmap closes the open gaps; two proposals await funding.', pill: 'On track', pillKind: 'pass', pillVerified: true,
        lede: 'Security investment, what it returns, and what awaits your decision.',
        sections: [
          { kind: 'table', title: 'Investment & return',
            head: ['Project', 'Investment', 'Expected return', 'Decision'],
            rows: [
              { cells: [{ t: 'PAM rollout', name: true }, { t: '$4.2M', mono: true }, { t: 'Closes the open ransomware path', exposed: true }, { t: '—' }] },
              { cells: [{ t: 'Recovery modernization', name: true }, { t: '$6.0M', mono: true }, { t: 'Readiness 78% → 90%+', exposed: true }, { t: '—' }] },
              { cells: [{ t: 'Third-party monitoring', name: true }, { t: '$1.8M', mono: true }, { t: 'Stops vendor risk drift', exposed: true }, { t: 'Needs funding', pill: true, kind: 'exposure' }] },
              { cells: [{ t: 'AI governance program', name: true }, { t: '$2.5M', mono: true }, { t: 'Governs AI claims decisions', exposed: true }, { t: 'Needs funding', pill: true, kind: 'exposure' }] },
            ] },
          { kind: 'rows', title: 'Readiness & investment', items: [
            { k: 'Committed this year', v: '$10.2M · 2 in flight' },
            { k: 'Awaiting your decision', v: '$4.3M · 2 projects', kind: 'exposure' },
            { k: 'Projected posture lift if funded', v: '82 → 89', kind: 'pass' },
          ] },
        ],
      },
    },
  },

  /* ===================== CIO — service & reliability ===================== */
  CIO: {
    summary: {
      verdict: 'Services are operational under a compensating control — no customer-facing outage.',
      pill: 'Operational · degraded-safe', pillKind: 'pass', pillVerified: true,
      lede: 'The payment-tokenization service runs on a WAF+ACL compensating control after the 14:02 failure. Uptime within SLA; an emergency change record is the one governance gap.',
      tiles: [
        { label: 'Service status', value: 'Operational', valueKind: 'pass', to: 'service-status' },
        { label: 'Uptime (MTD)', value: '99.98%', valueKind: 'pass', to: 'service-status' },
        { label: 'SLA breaches', value: '0', valueKind: 'pass', to: 'service-status' },
        { label: 'Operational threats', value: '1', valueKind: 'exposure', to: 'operational-threats' },
        { label: 'Decisions for you', value: '2', to: 'decisions-required' },
        { label: 'Reliability vs target', value: '99.98 / 99.9', to: 'reliability-trend' },
      ],
      briefing: [
        { q: 'Are systems and services operational?', a: 'Yes — payment service healthy on a compensating control; 0 min downtime.', pill: 'Operational', kind: 'pass', verified: true, to: 'service-status' },
        { q: 'What operational threats are live?', a: 'Config drift preceded the failure; the WAF+ACL change is in prod without an ECR.', pill: '1 gap', kind: 'exposure', to: 'operational-threats' },
        { q: 'What needs a decision?', a: 'Hold vs off-peak failover; raise the emergency change record now.', pill: '2 decisions', kind: 'exposure', to: 'decisions-required' },
        { q: 'Are we getting more reliable?', a: 'Reliability above target and improving; MTTR trending down.', pill: 'Improving ↑', kind: 'pass', verified: true, to: 'reliability-trend' },
      ],
    },
    tabs: {
      'service-status': {
        name: 'Service Status', q: 'Are our systems and services operational?',
        answer: 'Operational — no customer-facing outage.', pill: 'Operational', pillKind: 'pass', pillVerified: true,
        lede: 'Service health and continuity — the IT view of the same incident.',
        sections: [
          { kind: 'rows', title: 'Service health', items: [
            { k: 'Payment tokenization service', sub: '1 of 42 services', v: 'Healthy (compensating control)', verified: true, kind: 'pass' },
            { k: 'Uptime, month-to-date', v: '99.98% — within SLA', verified: true, kind: 'pass' },
            { k: 'Downtime', v: '0 min' },
            { k: 'Users affected', v: 'None; recovery est. 2 h · owner Platform Eng' },
          ] },
        ],
      },
      'operational-threats': {
        name: 'Operational Threats', q: 'What could disrupt service?',
        answer: 'Config drift and an unrecorded emergency change are the live gaps.', pill: '1 gap', pillKind: 'exposure',
        lede: 'Operational risks to continuity — not security alerts (those live in CISO).',
        sections: [
          { kind: 'rows', title: 'Live operational gaps', items: [
            { k: 'Config drift in tokenization', sub: 'preceded the 14:02 failure', v: 'Open', kind: 'exposure' },
            { k: 'Emergency change record (ECR)', sub: 'WAF+ACL change in prod', v: 'Missing — backfill SLA 24h', kind: 'exposure' },
            { k: 'Dependency map', v: 'Checkout API → tokenization → processor' },
          ] },
        ],
      },
      'decisions-required': {
        name: 'Decisions Required', q: 'What needs a decision?',
        answer: 'Two decisions; both can wait for the change window.', pill: '2 decisions', pillKind: 'exposure',
        lede: 'Continuity trade-offs that are yours to make.',
        sections: [
          { kind: 'decisions', title: 'Your decisions — today', button: 'Generate board package →', items: [
            { sev: 'HOLD', kind: 'exposure', title: 'Hold on compensating control vs failover (risk ~2 min payment interruption).', owner: 'Owner: CIO → failover in tonight’s window' },
            { sev: 'RAISE', kind: 'exposure', title: 'Raise the emergency change record now (governance gap).', owner: 'Owner: CIO → ECR within 24h' },
          ] },
        ],
      },
      'reliability-trend': {
        name: 'Reliability Trend', q: 'Are we getting more reliable?',
        answer: 'Reliability is above target and improving.', pill: 'Improving ↑', pillKind: 'pass', pillVerified: true,
        lede: 'Service reliability and control-health against target.',
        sections: [
          { kind: 'chart', posture: POSTURE, target: 85 },
          trendUpDown(['Uptime / SLA adherence', 'Patch currency', 'Change success rate'], ['Recovery testing', 'Config drift control', 'Legacy claims platform']),
          { kind: 'note', text: 'Chart shows posture index (illustrative). Bind to /api/cio/resilience for live reliability/MTTR.' },
        ],
      },
    },
  },

  /* ===================== CLO — obligations & defensibility ===================== */
  CLO: {
    summary: {
      verdict: 'No disclosure obligation is triggered; the clock is tracked and evidence is preserved under privilege.',
      pill: 'No obligation triggered', pillKind: 'pass', pillVerified: true,
      lede: 'A litigation hold is active and communications are privileged. SEC, GDPR and state clocks are not started pending the materiality determination.',
      tiles: [
        { label: 'Disclosure obligation', value: 'None', valueKind: 'pass', to: 'regulatory-obligation' },
        { label: 'Regimes implicated', value: 'SEC·GDPR·State·PCI', to: 'regulatory-obligation' },
        { label: 'Clocks running', value: '0', valueKind: 'pass', to: 'disclosure-timelines' },
        { label: 'Data subjects confirmed', value: 'None', valueKind: 'pass', to: 'regulatory-obligation' },
        { label: 'Decisions for you', value: '2', to: 'decisions-required' },
        { label: 'Litigation hold', value: 'Active', valueKind: 'pass', to: 'defensibility' },
      ],
      briefing: [
        { q: 'Do we have an obligation?', a: 'None triggered to date — no confirmed access to regulated data.', pill: 'No obligation', kind: 'pass', verified: true, to: 'regulatory-obligation' },
        { q: 'What are the disclosure timelines?', a: 'SEC 8-K (4 business days) and GDPR Art. 33 (72h) — neither started.', pill: 'Not started', kind: 'pass', verified: true, to: 'disclosure-timelines' },
        { q: 'What needs a decision?', a: 'Defer the materiality call with a documented basis; engage outside counsel.', pill: '2 decisions', kind: 'exposure', to: 'decisions-required' },
        { q: 'Is our position defensible?', a: 'Yes — hold active, evidence preserved, communications privileged.', pill: 'Defensible', kind: 'pass', verified: true, to: 'defensibility' },
      ],
    },
    tabs: {
      'regulatory-obligation': {
        name: 'Regulatory Obligation', q: 'Do we have an obligation?',
        answer: 'No disclosure obligation is triggered to date.', pill: 'No obligation', pillKind: 'pass', pillVerified: true,
        lede: 'The obligations matrix for this incident.',
        sections: [
          { kind: 'rows', title: 'Obligations matrix', items: [
            { k: 'SEC 8-K (Item 1.05)', v: 'Conditional on materiality — not triggered', kind: 'pass', verified: true },
            { k: 'GDPR Art. 33', v: 'No personal-data breach confirmed', kind: 'pass', verified: true },
            { k: 'US state breach laws', v: 'Conditional on confirmed access — none', kind: 'pass', verified: true },
            { k: 'PCI DSS contractual', v: 'Card-network notice under review', kind: 'exposure' },
          ] },
        ],
      },
      'disclosure-timelines': {
        name: 'Disclosure & Timelines', q: 'What clocks are running?',
        answer: 'No disclosure clock has started.', pill: 'Not started', pillKind: 'pass', pillVerified: true,
        lede: 'The clocks that would start on a materiality determination.',
        sections: [
          { kind: 'rows', title: 'Clocks', items: [
            { k: 'SEC 8-K window', v: '4 business days from determination — not started' },
            { k: 'GDPR 72-hour window', v: 'Not started — no personal data confirmed' },
            { k: 'Regulator / customer notices', v: 'Drafts staged; not issued', kind: 'exposure' },
          ] },
        ],
      },
      'decisions-required': {
        name: 'Decisions Required', q: 'What needs a decision?',
        answer: 'Two legal decisions; defer the materiality call with basis.', pill: '2 decisions', pillKind: 'exposure',
        lede: 'Decisions that protect privilege and defensibility.',
        sections: [
          { kind: 'decisions', title: 'Your decisions — today', button: 'Generate board package →', items: [
            { sev: 'DEFER', kind: 'exposure', title: 'Defer the materiality call with a documented basis; reassess on new facts.', owner: 'Owner: CLO + CFO → re-evaluate' },
            { sev: 'ENGAGE', kind: 'exposure', title: 'Engage outside counsel to anchor privilege and the obligations matrix.', owner: 'Owner: CLO → now' },
          ] },
        ],
      },
      defensibility: {
        name: 'Defensibility', q: 'Is our position defensible?',
        answer: 'Yes — evidence preserved under privilege; hold active.', pill: 'Defensible', pillKind: 'pass', pillVerified: true,
        lede: 'The record that makes the position defensible.',
        sections: [
          { kind: 'rows', title: 'Defensibility', items: [
            { k: 'Litigation hold', v: 'Active (LH-2026-014)', verified: true, kind: 'pass' },
            { k: 'Evidence preservation', v: 'Timeline + attestations preserved', verified: true, kind: 'pass' },
            { k: 'Privilege', v: 'Communications marked privileged', verified: true, kind: 'pass' },
          ] },
        ],
      },
    },
  },

  /* ===================== CRO — appetite & concentration ===================== */
  CRO: {
    summary: {
      verdict: 'One risk moved above appetite (payments); aggregate posture remains within tolerance.',
      pill: '1 risk above appetite', pillKind: 'exposure',
      lede: 'R-07 (payments availability & data integrity) breached its appetite ceiling while on a compensating control. Concentration to the control vendor is flagged. An out-of-cycle note is due.',
      tiles: [
        { label: 'Risks above appetite', value: '1', valueKind: 'exposure', to: 'risk-appetite-status' },
        { label: 'Aggregate residual', value: 'Within tolerance', valueKind: 'pass', to: 'risk-appetite-status' },
        { label: 'Top risk', value: 'R-07', valueKind: 'exposure', to: 'tolerance-concentration' },
        { label: 'Concentration flag', value: '1 vendor', valueKind: 'exposure', to: 'tolerance-concentration' },
        { label: 'Decisions for you', value: '2', to: 'decisions-required' },
        { label: 'Residual vs ceiling', value: '43 / 40', to: 'risk-trajectory' },
      ],
      briefing: [
        { q: 'Where do we sit against appetite?', a: 'One risk above appetite (R-07); aggregate within tolerance.', pill: '1 breach', kind: 'exposure', to: 'risk-appetite-status' },
        { q: 'Where is tolerance/concentration strained?', a: 'Correlated to the control vendor — a concentration flag on payments.', pill: 'Concentration', kind: 'exposure', to: 'tolerance-concentration' },
        { q: 'What needs a decision?', a: 'Mitigate with time-boxed acceptance; escalate an out-of-cycle note.', pill: '2 decisions', kind: 'exposure', to: 'decisions-required' },
        { q: 'Which way is risk trending?', a: 'Residual ticked up this quarter on the breach; trajectory otherwise improving.', pill: 'Watch', kind: 'exposure', to: 'risk-trajectory' },
      ],
    },
    tabs: {
      'risk-appetite-status': {
        name: 'Risk Appetite Status', q: 'Where does this sit against appetite?',
        answer: 'One risk above appetite; aggregate within tolerance.', pill: '1 breach', pillKind: 'exposure',
        lede: 'Position against the board-set appetite.',
        sections: [
          { kind: 'rows', title: 'Appetite', items: [
            { k: 'R-07 Payments availability & integrity', sub: 'score 43 · ceiling 40', v: 'Above appetite', kind: 'exposure' },
            { k: 'Likelihood × impact', v: 'L: Low (contained) × I: High' },
            { k: 'Aggregate residual', v: 'Within tolerance', verified: true, kind: 'pass' },
          ] },
        ],
      },
      'tolerance-concentration': {
        name: 'Tolerance & Concentration', q: 'Where is risk concentrated?',
        answer: 'Concentration to the control vendor on payments.', pill: 'Concentration', pillKind: 'exposure',
        lede: 'Tolerance bands and concentration/third-party risk.',
        sections: [
          { kind: 'rows', title: 'Concentration', items: [
            { k: 'Third-party concentration', sub: 'control vendor shares blast radius', v: 'Flagged', kind: 'exposure' },
            { k: 'Vendor reviews', v: '14 overdue', kind: 'exposure' },
            { k: 'Tolerance band (payments)', v: 'Exceeded for R-07' },
          ] },
        ],
      },
      'decisions-required': {
        name: 'Decisions Required', q: 'What needs a decision?',
        answer: 'Two risk decisions; mitigate and escalate.', pill: '2 decisions', pillKind: 'exposure',
        lede: 'Treatment decisions that are yours to make.',
        sections: [
          { kind: 'decisions', title: 'Your decisions — today', button: 'Generate board package →', items: [
            { sev: 'MITIGATE', kind: 'exposure', title: 'Mitigate R-07; time-boxed acceptance until the native control is restored.', owner: 'Owner: CRO → with CISO' },
            { sev: 'ESCALATE', kind: 'exposure', title: 'Escalate an out-of-cycle note to the risk committee.', owner: 'Owner: CRO → this week' },
          ] },
        ],
      },
      'risk-trajectory': {
        name: 'Risk Trajectory', q: 'Which way is risk trending?',
        answer: 'Residual ticked up on the breach; otherwise improving.', pill: 'Watch', pillKind: 'exposure',
        lede: 'Residual risk against the appetite ceiling over time.',
        sections: [
          { kind: 'chart', posture: POSTURE, target: 85 },
          trendUpDown(['Control efficacy', 'Detection coverage'], ['Third-party risk', 'Payments concentration (R-07)', 'Recovery testing']),
          { kind: 'note', text: 'Chart shows posture index (illustrative). Bind to /api/metrics/cro for live residual-vs-appetite.' },
        ],
      },
    },
  },

  /* ===================== Board — oversight & assurance ===================== */
  Board: {
    summary: {
      verdict: 'Management is in control: one material-candidate event, contained, with no disclosure obligation to date.',
      pill: 'Management in control', pillKind: 'pass', pillVerified: true,
      lede: 'A payment-path control failed briefly and was contained and independently verified. No customer impact; no confirmed data loss. Materiality is under review.',
      tiles: [
        { label: 'Management in control', value: 'Yes', valueKind: 'pass', to: 'control-assurance' },
        { label: 'Control assurance', value: '1,238 / 1,240', to: 'control-assurance' },
        { label: 'Material events', value: '1 candidate', valueKind: 'exposure', to: 'materiality' },
        { label: 'Board decisions', value: '1', to: 'board-decisions' },
        { label: 'Disclosure obligation', value: 'None', valueKind: 'pass', to: 'materiality' },
        { label: 'Posture vs appetite', value: '82 / 85', to: 'quarterly-oversight' },
      ],
      briefing: [
        { q: 'Is management in control?', a: 'Yes — detected, contained, verified, and escalated within policy.', pill: 'In control', kind: 'pass', verified: true, to: 'control-assurance' },
        { q: 'Is anything material?', a: 'One material-candidate event under review; no disclosure obligation to date.', pill: 'Under review', kind: 'exposure', to: 'materiality' },
        { q: 'What must the board decide?', a: 'Acknowledge the briefing; pre-agree the disclosure path if materiality changes.', pill: '1 decision', kind: 'brand', to: 'board-decisions' },
        { q: 'How is oversight trending?', a: 'Enterprise posture improving and approaching the board appetite.', pill: 'Improving ↑', kind: 'pass', verified: true, to: 'quarterly-oversight' },
      ],
    },
    tabs: {
      'control-assurance': {
        name: 'Control Assurance', q: 'Is management in control?',
        answer: 'Yes — contained by management and independently verified.', pill: 'In control', pillKind: 'pass', pillVerified: true,
        lede: 'Independent assurance that controls hold.',
        sections: [
          { kind: 'rows', title: 'Assurance', items: [
            { k: 'Critical controls validated holding', v: '1,238 / 1,240', verified: true, kind: 'pass' },
            { k: 'Incident handling', v: 'Detected, contained, verified, escalated within policy', verified: true, kind: 'pass' },
            { k: 'Independent verification', v: 'Containment verified at 14:09 (synthetic probe)', verified: true, kind: 'pass' },
          ] },
        ],
      },
      materiality: {
        name: 'Materiality', q: 'Is anything material?',
        answer: 'One material-candidate event; no obligation to date.', pill: 'Under review', pillKind: 'exposure',
        lede: 'Materiality and disclosure status for oversight.',
        sections: [
          { kind: 'rows', title: 'Materiality & disclosure', items: [
            { k: 'Materiality determination', v: 'Under review with Legal + Finance', kind: 'exposure' },
            { k: 'Disclosure obligation', v: 'None to date', verified: true, kind: 'pass' },
            { k: 'Financial exposure', v: 'Bounded, below insurance threshold', verified: true, kind: 'pass' },
          ] },
        ],
      },
      'board-decisions': {
        name: 'Board Decisions', q: 'What must the board decide?',
        answer: 'One decision; no action beyond acknowledgement today.', pill: '1 decision', pillKind: 'brand',
        lede: 'What the board is asked to decide and minute.',
        sections: [
          { kind: 'decisions', title: 'For the board', button: 'Generate board package →', items: [
            { sev: 'ACKNOWLEDGE', kind: 'exposure', title: 'Acknowledge the briefing; minute the oversight record.', owner: 'Owner: Board → this session' },
            { sev: 'PRE-AGREE', kind: 'exposure', title: 'Pre-agree the disclosure path if the event turns material.', owner: 'Owner: Board + CLO → standby' },
          ] },
          { kind: 'rows', title: 'Oversight questions to ask', items: [
            { k: 'Containment durability', v: 'How long can the compensating control safely hold?' },
            { k: 'Materiality basis', v: 'What would change the determination?' },
            { k: 'Customer impact', v: 'What confirms no data was accessed?' },
          ] },
        ],
      },
      'quarterly-oversight': {
        name: 'Quarterly Oversight', q: 'How is oversight trending?',
        answer: 'Enterprise posture is improving toward the board appetite.', pill: 'Improving ↑', pillKind: 'pass', pillVerified: true,
        lede: 'Posture against the board-set appetite, quarter over quarter.',
        sections: [
          { kind: 'chart', posture: POSTURE, target: 85 },
          trendUpDown(['Identity & access (IAM)', 'Cloud security', 'Endpoint protection'], ['Third-party risk', 'Recovery testing', 'AI governance']),
        ],
      },
    },
  },
};

export default SEATS_DATA;
