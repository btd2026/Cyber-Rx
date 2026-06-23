/**
 * CISO seat content — verbatim from the spec. The fully-built reference seat.
 * Qualitative "what's exposed" descriptors for Call Center / Member Portal /
 * Provider Payments and the illustrative owners/dates/posture series are marked
 * TODO where the spec did not provide exact values; no confident numbers invented.
 */

export const CISO_SEAT = {
  tabs: [
    { key: 'summary', name: 'Exec Summary' },

    {
      key: 'operational', name: 'Operational Status', q: 'Can we operate today?',
      answer: 'Yes — no active compromise.', pill: 'Yes — no active compromise', pillKind: 'pass',
      lede: 'A security answer, not IT uptime — are we under attack, are our defenses holding right now, and is anything one step from forcing a critical service down?',
      panels: [
        { title: 'Live threat & defense status', rows: [
          { k: 'Active compromise', v: 'None', verified: true, kind: 'pass', ev: { source: 'SIEM (Splunk) + EDR (CrowdStrike)', method: 'Agent telemetry + correlation rules', last: 'Real-time · last 14:08', result: 'No confirmed intrusion · 0 active C2 beacons · 0 lateral-movement alerts' } },
          { k: 'Critical controls validated holding', sub: 'tested against live evidence', v: '1,238 / 1,240', ev: { source: 'Control validation engine', method: 'Automated control tests vs live evidence', last: 'Continuous · last 14:07', result: '1,238 of 1,240 passing · 2 partial (PAM, recovery testing)' } },
          { k: 'Attacks blocked, last 24h', sub: 'identity + perimeter', v: '4,102', ev: { source: 'WAF + Okta + perimeter firewall', method: 'Automated — log ingestion', last: 'Rolling 24h · last 14:08', result: '4,102 blocked — 3,910 credential-stuffing, 142 web, 50 other' } },
          { k: 'Highest live threat', sub: 'phishing → claims staff', v: 'Elevated', kind: 'exposure', ev: { source: 'Email security + phishing-sim platform', method: 'Agent telemetry', last: 'Continuous · last 13:40', result: 'Targeted phishing on claims staff · 4.2% click rate · 0 credential capture' } },
        ] },
        { title: 'Open exposure that could force us down', rows: [
          { k: 'Claims processing control failed; compensating control verified holding', v: 'Contained', kind: 'pass', verified: true, ev: { source: 'SOAR + control monitor', method: 'Automated — workflow logs + synthetic probe', last: 'Per incident · last 14:02', result: 'Compensating control applied in 2s · synthetic probe confirms holding' } },
          { k: 'Ransomware path to claims DB', sub: 'open, contained, not yet closed', v: 'Open · watched', kind: 'exposure', ev: { source: 'Attack-path analytics', method: 'Automated — graph analysis', last: 'Continuous · last 14:06', result: '1 path open via legacy claims platform · PAM rollout closes it' } },
          { k: 'Internet-facing critical vulnerabilities', v: '0 unpatched', verified: true, kind: 'pass', ev: { source: 'Vulnerability scanner + cloud posture', method: 'Automated — scheduled scan', last: 'Daily · last 06:00', result: '0 unpatched internet-facing criticals · 97% critical patch SLA' } },
          { k: 'Privileged access gaps', sub: 'PAM 60% deployed', v: 'Gap remains', kind: 'exposure', ev: { source: 'CyberArk PAM', method: 'Automated — API pull', last: 'Continuous · last 14:03', result: '60% of privileged accounts onboarded · legacy claims accounts pending' } },
        ] },
        { title: 'Containment & response readiness', rows: [
          { k: 'Mean time to detect / contain', v: '8 min / 41 min', ev: { source: 'SIEM + SOAR metrics', method: 'Automated — metric rollup', last: 'Rolling 30d', result: 'MTTD 8 min · MTTC 41 min · both improving quarter-over-quarter' } },
          { k: 'Incidents requiring your decision right now', v: '0' },
          { k: 'Could anything force a takedown of a critical service today?', v: 'No — all contained & monitored', kind: 'pass' },
        ] },
      ],
    },

    {
      key: 'material-exposure', name: 'Material Exposure', q: 'What could hurt the business?',
      answer: 'One business-critical process is exposed and rising — claims processing.', pill: '1 High & rising', pillKind: 'exposure',
      lede: 'Exposure expressed as business processes, not servers — and the single most likely path to our crown jewels.',
      processes: [
        { name: 'Claims Processing', risk: 'High', riskKind: 'critical', trend: '↑', trendKind: 'critical', exposed: '$220M/day if down; open ransomware path to claims DB' },
        { name: 'AI-Assisted Claims Review', risk: 'High', riskKind: 'critical', trend: '↑', trendKind: 'critical', exposed: 'Ungoverned model decisions touching PHI' },
        // TODO: real data — exposed descriptors below not given in spec (illustrative)
        { name: 'Call Center Operations', risk: 'Medium', riskKind: 'exposure', trend: '↑', trendKind: 'exposure', exposed: 'Vendor-dependent; identity exposure' },
        { name: 'Member Portal', risk: 'Medium', riskKind: 'exposure', trend: '→', trendKind: 'muted', exposed: 'Internet-facing; credential-stuffing pressure' },
        { name: 'Provider Payments', risk: 'Low', riskKind: 'pass', trend: '↓', trendKind: 'pass', exposed: 'Well-controlled; monitored' },
      ],
      path: ['Phishing email', 'Compromised user', 'Privilege escalation', 'Active Directory', 'Claims database', 'PHI exposure'],
      pathStats: [
        { k: 'Likelihood', v: 'High' },
        { k: 'Control effectiveness', v: 'Medium' },
        { k: 'Blast radius', v: '2.4M records' },
        { k: 'Time to contain', v: '~6 hrs' },
      ],
    },

    {
      key: 'action-center', name: 'Action Center', q: 'What needs action?',
      answer: 'Three decisions need you today — two are critical.', pill: '2 critical', pillKind: 'critical',
      lede: 'Sorted by who owns it, so nothing waits on the wrong person. Nothing here is overdue — yet.',
      decisions: [
        { sev: 'CRITICAL', kind: 'critical', title: 'Legacy claims platform — $220M/day revenue exposure.', owner: 'Owner: CIO → Fund modernization' },
        { sev: 'CRITICAL', kind: 'critical', title: 'Open ransomware path to the claims database.', owner: 'Owner: CISO → Accelerate PAM rollout' },
        { sev: 'HIGH', kind: 'exposure', title: 'Vendor access risk — PHI exposure via NASCO.', owner: 'Owner: CRO → Accept or mitigate' },
      ],
      // TODO: real data — owners/dates illustrative (spec said "named owners + due dates")
      others: [
        { task: 'Third-party risk report review', owner: 'Risk team', due: 'Due Thu' },
        { task: 'IAM onboarding budget approval', owner: 'Finance', due: 'Due Fri' },
        { task: 'Validate tabletop results', owner: 'SecOps', due: 'Due Fri' },
      ],
      info: [
        { k: 'MFA coverage', v: '↑ +8%' },
        { k: 'Mean time to detect', v: '↑ 15% faster' },
      ],
    },

    {
      key: 'trajectory', name: 'Trajectory', q: 'Are we getting better?',
      answer: 'Yes — posture is improving and closing on the board target.', pill: 'Improving', pillKind: 'pass',
      lede: 'Posture trend against the board-set target, and exactly where attention is needed.',
      // TODO: real data — posture series illustrative; ends at the stated 82, target 85
      posture: {
        quarterly: [{ label: 'Q1', value: 72 }, { label: 'Q2', value: 75 }, { label: 'Q3', value: 78 }, { label: 'Q4', value: 82 }],
        monthly: [{ label: 'Mar', value: 77 }, { label: 'Apr', value: 79 }, { label: 'May', value: 80 }, { label: 'Jun', value: 82 }],
      },
      target: 85,
      improving: ['Identity & access (IAM)', 'Cloud security', 'Endpoint protection'],
      deteriorating: ['Third-party risk', 'Recovery testing', 'AI governance'],
    },

    {
      key: 'response-investment', name: 'Response & Investment', q: 'What are we doing about it?',
      answer: 'The roadmap closes the open gaps; two proposals await your funding.', pill: 'On track', pillKind: 'brand',
      lede: 'What it costs, what it returns, and what’s waiting on your decision.',
      projects: [
        { name: 'PAM rollout', status: '60% · on track', invest: '$4.2M', ret: 'Closes the open ransomware path', decision: '—' },
        { name: 'Recovery modernization', status: 'Funded · starting', invest: '$6.0M', ret: 'Recovery readiness 78% → 90%+', decision: '—' },
        { name: 'Third-party monitoring', status: 'Proposed', invest: '$1.8M', ret: 'Stops vendor risk drift', decision: 'Needs funding', needs: true },
        { name: 'AI governance program', status: 'Proposed', invest: '$2.5M', ret: 'Governs AI claims decisions', decision: 'Needs funding', needs: true },
      ],
      // committed = funded projects ($4.2M + $6.0M); awaiting = proposals ($1.8M + $2.5M)
      readiness: [
        { k: 'Committed this year', v: '$10.2M · 2 projects in flight' },
        { k: 'Awaiting your decision', v: '$4.3M · 2 projects', kind: 'exposure' },
        { k: 'Projected posture lift if all funded', v: '82 → 89', kind: 'pass' },
      ],
    },
  ],

  summary: {
    verdict: 'Cyber risk is understood, managed, and within tolerance today.',
    pill: '1 exposure contained', pillKind: 'exposure',
    lede: 'One control failure on claims processing is contained and nothing requires the business to stop. Posture is up 4% this month; third-party risk is the one area drifting out of tolerance.',
    tiles: [
      { label: 'Overall posture', value: '82', delta: '↑+4', deltaKind: 'pass', to: 'trajectory' },
      { label: 'Risk exposure', value: 'Medium', to: 'material-exposure' },
      { label: 'Regulatory readiness', value: '91%', to: 'trajectory' },
      { label: 'Operational resilience', value: '78%', delta: '→', deltaKind: 'muted', to: 'operational' },
      { label: 'Critical actions', value: '3', valueKind: 'critical', to: 'action-center' },
      { label: 'Board attention', value: '1', to: 'action-center' },
    ],
    briefing: [
      { q: 'Can we operate today?', a: 'Yes — no active compromise; claims is on a verified compensating control.', pill: 'Operating', kind: 'pass', verified: true, to: 'operational' },
      { q: 'What could hurt the business?', a: '5 processes at risk; claims processing High and rising; one open ransomware path to PHI.', pill: '1 High ↑', kind: 'exposure', to: 'material-exposure' },
      { q: 'What needs action?', a: '9 items: 3 decisions for you (2 critical), 6 owned by others. Nothing overdue.', pill: '2 Critical', kind: 'critical', to: 'action-center' },
      { q: 'Are we getting better?', a: 'Improving overall (+4). IAM, cloud, endpoint up; third-party, recovery, AI governance down.', pill: 'Improving ↑', kind: 'pass', verified: true, to: 'trajectory' },
      { q: 'What are we doing about it?', a: 'PAM 60%; recovery modernization funded; 2 projects await your funding decision.', pill: 'On track', kind: 'pass', verified: true, to: 'response-investment' },
    ],
  },
};
