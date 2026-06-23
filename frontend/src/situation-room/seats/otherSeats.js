/**
 * The six non-CISO seats — matching the mock, each reframing the SAME 14:02 claims
 * incident in that executive's lens. Rendered by the generic SeatPanel/SeatSection.
 * Tab keys = slug(tabName).
 *
 * Every panel figure (kv / srow row) carries `ev` — source · method · last collected
 * · result — so any number digs to its proof. Illustrative sample data; bind to the
 * per-seat APIs to go live.
 */

const SEATS_DATA = {
  /* ============================== CEO ============================== */
  CEO: {
    summary: {
      verdict: 'Cyber risk is understood, managed, and within tolerance today.',
      pill: '1 issue contained', pillKind: 'exposure',
      lede: 'One contained issue on claims processing. Nothing requires the business to stop. Posture is improving; third-party risk is the one watch item.',
      tiles: [
        { label: 'Business risk', value: 'In tolerance', to: 'principal-business-risk' },
        { label: 'Revenue at risk today', value: 'Contained', to: 'operating-status' },
        { label: 'Customer / brand impact', value: 'None', to: 'operating-status' },
        { label: 'Material events', value: '0', to: 'board-executive-attention' },
        { label: 'Board attention', value: '1', valueKind: 'critical', to: 'board-executive-attention' },
        { label: 'Posture trend', value: '82', delta: '↑+4', deltaKind: 'pass', to: 'trajectory' },
      ],
      briefing: [
        { q: 'Are we safe to operate?', a: 'Yes — operations and revenue are protected; one contained security issue on claims.', pill: 'Safe', kind: 'pass', to: 'operating-status' },
        { q: 'What is our biggest business risk?', a: 'Claims processing — revenue-critical and elevated, with a contained exposure.', pill: '1 elevated', kind: 'exposure', to: 'principal-business-risk' },
        { q: 'What needs my attention?', a: '1 board item and 1 funding decision affecting customer-facing risk.', pill: '1 board', kind: 'exposure', to: 'board-executive-attention' },
        { q: 'Are we improving?', a: 'Yes — posture +4 this quarter; the funded roadmap is on track.', pill: 'Improving ↑', kind: 'pass', to: 'trajectory' },
      ],
    },
    tabs: {
      'operating-status': {
        name: 'Operating Status', q: 'Are operations and revenue protected?', pill: 'Yes', pillKind: 'pass',
        lede: 'Revenue and operations are protected. One security issue is contained and not customer-visible.',
        sections: [
          { kind: 'cols', panels: [
            { title: 'The business is running', rowsKind: 'srow', rows: [
              { nm: 'Customer-facing services', stat: 'Running', statKind: 'pass', ev: { source: 'Service catalog + synthetic monitors', method: 'Automated — uptime checks', last: 'Real-time · last 14:08', result: 'All customer-facing services responding · 0 outages' } },
              { nm: 'Revenue systems', sub: 'claims on a compensating control', stat: 'Protected · watch', statKind: 'exposure', ev: { source: 'Payments platform + SOAR', method: 'Automated — transaction monitor', last: 'Real-time · last 14:02', result: 'Claims on compensating control · 0 failed transactions' } },
              { nm: 'Customer data', stat: 'No exposure', statKind: 'pass', ev: { source: 'DLP + breach detection', method: 'Automated — exfil monitoring', last: 'Continuous · last 14:06', result: 'No exfiltration signals · 0 records exposed' } },
              { nm: 'Public / disclosure status', stat: 'Nothing to report', statKind: 'pass', ev: { source: 'Legal / GRC tracker', method: 'Manual attestation', last: 'last 13:30', result: 'No disclosure obligation triggered to date' } },
            ] },
            { title: 'If the worst happened', rowsKind: 'kv', rows: [
              { l: 'Worst-case revenue at risk', v: '~$2.3M/hr · contained', vKind: 'exposure', ev: { source: 'FAIR loss model', method: 'Modeled — revenue × downtime', last: 'last 14:05', result: '~$2.3M/hr modeled · $0 realized (contained)' } },
              { l: 'Time to resume claims if down', v: '~3.5 days', ev: { source: 'DR runbooks + backup platform', method: 'Auditor sample + recovery test', last: 'last test 5 months ago', result: '~3.5 days RTO for claims processing' } },
              { l: 'Crisis posture required', v: 'No', vKind: 'pass', ev: { source: 'Incident command', method: 'Manual — IC assessment', last: '14:09', result: 'Contained at tier-2 · no crisis standup required' } },
            ] },
          ] },
        ],
      },
      'principal-business-risk': {
        name: 'Principal Business Risk', q: 'What is our biggest business risk?', pill: 'Claims processing', pillKind: 'exposure',
        lede: 'Ranked by impact to revenue, customers, and reputation — in business terms, not servers.',
        sections: [
          { kind: 'table', head: ['Business area', 'Risk', 'Trend', 'Why it matters'], rows: [
            { cells: [{ t: 'Claims Processing', name: true }, { t: 'High', pill: true, kind: 'critical' }, { t: '↑', fg: 'critical' }, { t: '$220M/day revenue · contained security exposure', exposed: true }] },
            { cells: [{ t: 'AI-Assisted Claims', name: true }, { t: 'High', pill: true, kind: 'critical' }, { t: '↑', fg: 'critical' }, { t: 'Fast-growing · ungoverned model decisions on PHI', exposed: true }] },
            { cells: [{ t: 'Member Portal', name: true }, { t: 'Medium', pill: true, kind: 'exposure' }, { t: '→', fg: 'exposure' }, { t: 'Customer-facing · brand exposure', exposed: true }] },
            { cells: [{ t: 'Provider Payments', name: true }, { t: 'Low', pill: true, kind: 'pass' }, { t: '↓', fg: 'pass' }, { t: 'Well-controlled', exposed: true }] },
          ] },
        ],
      },
      'board-executive-attention': {
        name: 'Board & Executive Attention', q: 'What needs my attention?', pill: '1 board item', pillKind: 'exposure',
        lede: 'What rises to the CEO and board — not the security team’s queue.',
        sections: [
          { kind: 'decisions', title: 'Needs you or the board', button: 'Generate board package →', items: [
            { sev: 'Board', kind: 'critical', title: 'Claims platform modernization — $220M/day exposure tied to a legacy system.', owner: 'With CIO & CFO · Board funding decision' },
            { sev: 'Decide', kind: 'exposure', title: 'Accept or mitigate vendor (PHI) risk — a critical vendor is below tolerance.', owner: 'With CRO · Risk decision' },
          ] },
          { kind: 'bigstat', text: 'One event is under materiality review; no public disclosure is required to date. A board-ready summary can be generated on demand.' },
        ],
      },
      trajectory: {
        name: 'Trajectory', q: 'Are we getting better?', pill: 'Improving', pillKind: 'pass',
        lede: 'The trajectory you can take to the board.',
        sections: [
          { kind: 'cols', panels: [
            { title: 'Improving', rowsKind: 'srow', rows: [
              { nm: 'Overall posture', stat: '82 · ↑+4', statKind: 'pass', ev: { source: 'Posture scoring engine', method: 'Automated — control rollup', last: 'Daily · last 06:00', result: '82 of 100 · +4 quarter-over-quarter' } },
              { nm: 'Identity & access', stat: 'Up', statKind: 'pass', ev: { source: 'Okta + IGA', method: 'Automated — API pull', last: 'Continuous', result: 'MFA 98.1% · least-privilege improving' } },
              { nm: 'Detection speed', stat: '15% faster', statKind: 'pass', ev: { source: 'SIEM + SOAR metrics', method: 'Automated — metric rollup', last: 'Rolling 30d', result: 'MTTD down 15% quarter-over-quarter' } },
            ] },
            { title: 'Watch', rowsKind: 'srow', rows: [
              { nm: 'Third-party risk', stat: 'Slipping', statKind: 'exposure', ev: { source: 'GRC vendor reviews', method: 'Manual attestation', last: 'last 23 days', result: '14 vendor reviews overdue' } },
              { nm: 'Recovery testing', stat: 'Slipping', statKind: 'exposure', ev: { source: 'DR test records', method: 'Auditor sample', last: 'last test 5 months ago', result: '83% of critical apps tested · target 100%' } },
              { nm: 'AI governance', stat: 'Lagging', statKind: 'exposure', ev: { source: 'AI governance program', method: 'Manual attestation', last: 'last 30 days', result: 'Model inventory partial · controls forming' } },
            ] },
          ] },
          { kind: 'bigstat', text: 'If the funded roadmap completes, enterprise posture is projected to reach 89 and bring third-party risk back within appetite.' },
        ],
      },
    },
  },

  /* ============================== CFO ============================== */
  CFO: {
    summary: {
      verdict: 'Financial exposure is bounded and below our insurance threshold today.',
      pill: 'Within tolerance', pillKind: 'pass',
      lede: 'The claims event is scoped to a $0–1.1M range, below the materiality and insurance thresholds. No write-down conversation today.',
      tiles: [
        { label: 'Exposure today', value: '$0–1.1M', to: 'financial-exposure' },
        { label: 'Insurance threshold', value: 'Below', to: 'materiality' },
        { label: 'Financial materiality', value: 'Under review', to: 'materiality' },
        { label: 'Loss exposure vs appetite', value: 'Within', to: 'return-on-investment' },
        { label: 'Cyber spend YTD', value: '$10.2M', to: 'return-on-investment' },
        { label: 'Decisions today', value: '3', valueKind: 'critical', to: 'decisions-required' },
      ],
      briefing: [
        { q: 'Are we financially exposed today?', a: 'Yes, but bounded to $0–1.1M on the payments/claims path — not the whole estate.', pill: 'Bounded', kind: 'exposure', to: 'financial-exposure' },
        { q: 'Is anything material?', a: 'Under review with Legal; current estimate is below materiality and the insurance threshold.', pill: 'Under review', kind: 'exposure', to: 'materiality' },
        { q: 'What needs my decision?', a: 'File a precautionary insurance notice, approve $180K response spend, hold the loss reserve.', pill: '3 today', kind: 'critical', to: 'decisions-required' },
        { q: 'Are we spending well?', a: 'Loss exposure within appetite; funded roadmap returns measurable posture lift.', pill: 'On track', kind: 'pass', to: 'return-on-investment' },
      ],
    },
    tabs: {
      'financial-exposure': {
        name: 'Financial Exposure', q: 'Are we financially exposed today?', pill: 'Bounded', pillKind: 'exposure',
        lede: 'Exposure in dollars, scoped to the affected path — not a whole-company number.',
        sections: [
          { kind: 'panel', title: 'Exposure — in dollars', rowsKind: 'kv', rows: [
            { l: 'Revenue at risk', v: '~$2.3M / hr', vKind: 'exposure', ev: { source: 'FAIR loss model', method: 'Modeled — revenue × downtime', last: 'last 14:05', result: '~$2.3M/hr while degraded · $0 realized' } },
            { l: 'Bounded impact if unresolved 24h', v: '$0–1.1M', ev: { source: 'FAIR loss model', method: 'Modeled — p50 / p90', last: 'last 14:05', result: 'p50 $0.4M · p90 $1.1M over 24h' } },
            { l: 'Insurance notification threshold', v: 'Below · monitor', vKind: 'pass', ev: { source: 'Cyber policy CYB-2026', method: 'Manual — policy review', last: 'last 13:50', result: 'Single-loss trigger $2.0M · currently below' } },
            { l: 'PCI / penalty exposure', v: 'Only if data confirmed', vKind: 'exposure', ev: { source: 'Legal / PCI assessment', method: 'Manual attestation', last: 'last 13:40', result: 'No confirmed cardholder-data access' } },
            { l: 'Estimated remediation cost', v: '~$180K', ev: { source: 'Incident cost tracker', method: 'Modeled — vendor + labor', last: 'last 14:00', result: 'Forensics + emergency vendor ≈ $180K' } },
            { l: 'Containment', v: '✓ verified holding', vKind: 'pass', ev: { source: 'SOAR + synthetic probe', method: 'Automated', last: 'last 14:02', result: 'Compensating control verified holding' } },
          ] },
        ],
      },
      materiality: {
        name: 'Materiality', q: 'Is anything material?', pill: 'Under review', pillKind: 'exposure',
        lede: 'Materiality and disclosure status, co-owned with Legal.',
        sections: [
          { kind: 'panel', title: 'Materiality & obligations', rowsKind: 'kv', rows: [
            { l: 'Financial materiality', v: 'Under review · est. below threshold', vKind: 'exposure', ev: { source: 'Finance + Legal review', method: 'Manual attestation', last: 'last 13:30', result: 'Determination pending · estimate below threshold' } },
            { l: 'Investor disclosure (8-K)', v: 'Not triggered', vKind: 'pass', ev: { source: 'Legal / SEC tracker', method: 'Manual attestation', last: 'last 13:30', result: 'Item 1.05 not triggered' } },
            { l: 'Cyber-insurance notice', v: '46h window · precautionary advised', vKind: 'exposure', ev: { source: 'Cyber policy CYB-2026', method: 'Manual — policy clock', last: 'last 14:00', result: 'Precautionary notice window 46h' } },
            { l: 'Contingency budget', v: 'Response cost within it', vKind: 'pass', ev: { source: 'Finance budget', method: 'Manual review', last: 'last 14:00', result: 'Response cost within contingency reserve' } },
          ] },
        ],
      },
      'decisions-required': {
        name: 'Decisions Required', q: 'What needs my decision?', pill: '3 today', pillKind: 'critical',
        lede: 'The financial calls — ranked by time sensitivity.',
        sections: [
          { kind: 'decisions', button: 'Generate audit-committee note →', items: [
            { sev: 'Time', kind: 'critical', title: 'File a precautionary insurance notice — preserves coverage, no admission; 46h window.', owner: 'Carrier CYB-2026 · File now' },
            { sev: 'Approve', kind: 'exposure', title: 'Authorize $180K incident-response spend — forensics + emergency vendor support.', owner: 'Within contingency · Approve' },
            { sev: 'Hold', kind: 'brand', title: 'Contingent loss reserve — exposure below materiality.', owner: 'Revisit in 2h 40m · Hold & revisit' },
          ] },
        ],
      },
      'return-on-investment': {
        name: 'Return on Investment', q: 'Are we spending well?', pill: 'On track', pillKind: 'pass',
        lede: 'Cyber investment against loss exposure and the returns it buys.',
        sections: [
          { kind: 'table', head: ['Investment', 'Status', 'Cost', 'Return'], rows: [
            { cells: [{ t: 'PAM rollout', name: true }, { t: '60% · on track', pill: true, kind: 'pass' }, { t: '$4.2M', mono: true }, { t: 'Closes the ransomware loss path', exposed: true }] },
            { cells: [{ t: 'Recovery modernization', name: true }, { t: 'Funded', pill: true, kind: 'pass' }, { t: '$6.0M', mono: true }, { t: 'Cuts downtime loss exposure', exposed: true }] },
            { cells: [{ t: 'Third-party monitoring', name: true }, { t: 'Proposed', pill: true, kind: 'exposure' }, { t: '$1.8M', mono: true }, { t: 'Stops vendor-driven loss drift', exposed: true }] },
          ] },
          { kind: 'panel', title: 'Return on cyber investment', rowsKind: 'kv', rows: [
            { l: 'Annualized loss exposure vs appetite', v: 'Within', vKind: 'pass', ev: { source: 'Risk quantification (FAIR)', method: 'Modeled — ALE', last: 'Quarterly', result: 'ALE within board appetite' } },
            { l: 'Awaiting your funding decision', v: '$4.3M · 2 projects', vKind: 'exposure', ev: { source: 'Security portfolio', method: 'Manual — portfolio review', last: 'last 7 days', result: 'Third-party monitoring $1.8M + AI governance $2.5M' } },
            { l: 'Projected posture lift if funded', v: '82 → 89', vKind: 'pass', ev: { source: 'Posture model', method: 'Modeled — projected', last: 'last 7 days', result: '+7 posture if both proposals funded' } },
          ] },
        ],
      },
    },
  },

  /* ============================== CIO ============================== */
  CIO: {
    summary: {
      verdict: 'Critical services are operational and recoverable today.',
      pill: 'All running', pillKind: 'pass',
      lede: 'Every critical service is up; one runs on a compensating control with no customer-facing outage. Recovery testing is the one slipping metric.',
      tiles: [
        { label: 'Critical services', value: 'Up', to: 'service-status' },
        { label: 'Uptime (30d)', value: '99.98%', to: 'service-status' },
        { label: 'Recovery readiness', value: '78%', delta: '→', deltaKind: 'exposure', to: 'service-status' },
        { label: 'Open Sev-1s', value: '0', to: 'operational-threats' },
        { label: 'Change risk', value: 'Low', to: 'decisions-required' },
        { label: 'Reliability trend', value: '↑', to: 'reliability-trend' },
      ],
      briefing: [
        { q: 'Are critical services up?', a: 'Yes — all running; claims on a compensating control with no outage.', pill: 'Operating', kind: 'pass', to: 'service-status' },
        { q: 'What could disrupt operations?', a: 'Legacy claims platform fragility and vendor dependency in the call center.', pill: '2 watch', kind: 'exposure', to: 'operational-threats' },
        { q: 'What needs my decision?', a: 'Hold vs failover on the claims gateway; one emergency change to file.', pill: '1 decision', kind: 'exposure', to: 'decisions-required' },
        { q: 'Are we more reliable over time?', a: 'Yes — uptime steady, MTTR improving; recovery testing needs investment.', pill: 'Improving ↑', kind: 'pass', to: 'reliability-trend' },
      ],
    },
    tabs: {
      'service-status': {
        name: 'Service Status', q: 'Are critical services up today?', pill: 'Yes', pillKind: 'pass',
        lede: 'Operational status and recoverability of the services the business runs on.',
        sections: [
          { kind: 'cols', panels: [
            { title: 'Critical business services', rowsKind: 'srow', rows: [
              { nm: 'Claims Processing', sub: 'compensating control active', stat: 'Up · degraded', statKind: 'exposure', ev: { source: 'APM + synthetic monitor', method: 'Automated — health checks', last: 'Real-time · last 14:08', result: 'Healthy on compensating control · 0 downtime' } },
              { nm: 'Member Portal', stat: 'Up', statKind: 'pass', ev: { source: 'APM', method: 'Automated — health checks', last: 'Real-time', result: '99.99% · multi-region' } },
              { nm: 'Provider Payments', stat: 'Up', statKind: 'pass', ev: { source: 'APM', method: 'Automated — health checks', last: 'Real-time', result: 'Operating normally' } },
              { nm: 'Call Center Operations', stat: 'Up', statKind: 'pass', ev: { source: 'Telephony + APM', method: 'Automated', last: 'Real-time', result: 'Operating · vendor-dependent' } },
              { nm: 'AI-Assisted Claims Review', stat: 'Up · watch', statKind: 'exposure', ev: { source: 'Model serving + APM', method: 'Automated', last: 'Real-time', result: 'Operating · limited recovery coverage' } },
            ] },
            { title: 'Resilience & recovery', rowsKind: 'kv', rows: [
              { l: 'Critical apps recoverable', v: '91%', vKind: 'pass', ev: { source: 'Backup platform', method: 'Automated — backup status', last: 'Daily', result: '91% of critical apps with verified backups' } },
              { l: 'Tested in last 12 months', v: '83%', vKind: 'exposure', ev: { source: 'DR test records', method: 'Auditor sample', last: 'last test 5 months ago', result: '83% of critical apps recovery-tested' } },
              { l: 'Recovery readiness', v: '78%', vKind: 'exposure', ev: { source: 'DR program', method: 'Modeled — readiness score', last: 'last 30d', result: '78% · target 90%' } },
              { l: 'AI systems recoverable', v: '52%', vKind: 'critical', ev: { source: 'AI platform + backup', method: 'Automated', last: 'last 30d', result: '52% of AI systems with recovery plans' } },
              { l: 'Backup success rate', v: '99.7%', vKind: 'pass', ev: { source: 'Backup platform', method: 'Automated — job logs', last: 'Daily', result: '99.7% backup-job success' } },
            ] },
          ] },
          { kind: 'bigstat', text: 'If ransomware hit today, claims processing resumes in ~3.5 days — within tolerance, but recovery testing is slipping and needs funding.' },
        ],
      },
      'operational-threats': {
        name: 'Operational Threats', q: 'What could disrupt operations?', pill: '2 watch items', pillKind: 'exposure',
        lede: 'Operational fragility and dependencies that could take a service down.',
        sections: [
          { kind: 'table', head: ['Service', 'Risk', 'Trend', 'Operational driver'], rows: [
            { cells: [{ t: 'Claims Processing', name: true }, { t: 'High', pill: true, kind: 'critical' }, { t: '↑', fg: 'critical' }, { t: 'Legacy platform; single-path dependency', exposed: true }] },
            { cells: [{ t: 'Call Center Ops', name: true }, { t: 'Medium', pill: true, kind: 'exposure' }, { t: '↑', fg: 'critical' }, { t: 'Vendor-dependent; identity exposure', exposed: true }] },
            { cells: [{ t: 'AI-Assisted Claims', name: true }, { t: 'Medium', pill: true, kind: 'exposure' }, { t: '→', fg: 'exposure' }, { t: 'New service; limited recovery coverage', exposed: true }] },
            { cells: [{ t: 'Member Portal', name: true }, { t: 'Low', pill: true, kind: 'pass' }, { t: '↓', fg: 'pass' }, { t: 'Resilient; multi-region', exposed: true }] },
          ] },
        ],
      },
      'decisions-required': {
        name: 'Decisions Required', q: 'What needs my decision?', pill: '1 decision', pillKind: 'exposure',
        lede: 'Continuity calls that are the CIO’s to make.',
        sections: [
          { kind: 'decisions', items: [
            { sev: 'Decide', kind: 'exposure', title: 'Hold compensating control vs force failover — failover risks a 9-min payment outage for a control that is holding.', owner: 'Claims gateway · Recommend: hold' },
            { sev: 'File', kind: 'brand', title: 'Emergency change record — for the applied compensating control.', owner: 'Change board · File now' },
          ] },
        ],
      },
      'reliability-trend': {
        name: 'Reliability Trend', q: 'Are we more reliable over time?', pill: 'Improving', pillKind: 'pass',
        lede: 'Reliability and recovery trend against operational targets.',
        sections: [
          { kind: 'panel', title: 'Reliability trend', rowsKind: 'kv', rows: [
            { l: 'Uptime (rolling 90d)', v: '99.98% · steady', vKind: 'pass', ev: { source: 'APM', method: 'Automated — uptime', last: 'Rolling 90d', result: '99.98% across critical services' } },
            { l: 'Mean time to recover (MTTR)', v: 'Improving', vKind: 'pass', ev: { source: 'ITSM + SOAR', method: 'Automated — metric rollup', last: 'Rolling 90d', result: 'MTTR trending down quarter-over-quarter' } },
            { l: 'Recovery readiness', v: '78% → target 90%', vKind: 'exposure', ev: { source: 'DR program', method: 'Modeled', last: 'last 30d', result: '78% · funding lifts to 90%+' } },
            { l: 'Change-related incidents', v: 'Down', vKind: 'pass', ev: { source: 'ITSM change records', method: 'Automated', last: 'Rolling 90d', result: 'Change-failure rate down quarter-over-quarter' } },
          ] },
        ],
      },
    },
  },

  /* ============================== CLO ============================== */
  CLO: {
    summary: {
      verdict: 'No disclosure obligation is triggered today; clocks are tracked and evidence preserved.',
      pill: 'No trigger yet', pillKind: 'pass',
      lede: 'The claims event is under materiality review. Nothing requires regulatory or customer notification to date; evidence is preserved under privilege.',
      tiles: [
        { label: 'Disclosure triggered', value: '0', to: 'regulatory-obligation' },
        { label: 'Reg clocks running', value: '1', valueKind: 'critical', to: 'disclosure-timelines' },
        { label: 'Privilege / preservation', value: 'In place', to: 'regulatory-obligation' },
        { label: 'Open legal risks', value: '2', to: 'regulatory-obligation' },
        { label: 'Regulatory readiness', value: '91%', to: 'defensibility' },
        { label: 'Decisions today', value: '2', valueKind: 'critical', to: 'decisions-required' },
      ],
      briefing: [
        { q: 'Do we have an obligation today?', a: 'No disclosure triggered; two open legal risks tracked, evidence preserved under privilege.', pill: 'No trigger', kind: 'pass', to: 'regulatory-obligation' },
        { q: 'What must we disclose, and when?', a: 'One clock running — SEC 4-day starts only on a materiality determination.', pill: '1 clock', kind: 'exposure', to: 'disclosure-timelines' },
        { q: 'What needs my decision?', a: 'Make/defer the materiality call; decide on a precautionary litigation hold.', pill: '2 today', kind: 'exposure', to: 'decisions-required' },
        { q: 'Is our position defensible?', a: 'Yes — regulatory readiness 91%; full evidence chain preserved.', pill: 'Defensible', kind: 'pass', to: 'defensibility' },
      ],
    },
    tabs: {
      'regulatory-obligation': {
        name: 'Regulatory Obligation', q: 'Do we have an obligation today?', pill: 'No trigger yet', pillKind: 'pass',
        lede: 'Regimes implicated by the event and our preservation posture.',
        sections: [
          { kind: 'panel', title: 'Legal exposure & posture', rowsKind: 'kv', rows: [
            { l: 'Disclosure obligation triggered', v: 'None to date', vKind: 'pass', ev: { source: 'Legal obligations matrix', method: 'Manual attestation', last: 'last 13:30', result: 'No regime triggered to date' } },
            { l: 'Regimes potentially implicated', v: 'SEC, GDPR, state breach laws', vKind: 'exposure', ev: { source: 'Legal obligations matrix', method: 'Manual — scoping', last: 'last 13:30', result: 'Scoped pending data-impact confirmation' } },
            { l: 'Data subjects confirmed exposed', v: '0 (under review)', vKind: 'exposure', ev: { source: 'DLP + forensics', method: 'Automated + manual review', last: 'last 14:00', result: '0 confirmed · review ongoing' } },
            { l: 'Litigation hold', v: 'Standing by', ev: { source: 'Legal ops', method: 'Manual', last: 'last 13:30', result: 'Hold prepared · not yet issued' } },
            { l: 'Evidence preservation', v: 'In place · under privilege', vKind: 'pass', ev: { source: 'Forensics + Legal', method: 'Manual — chain of custody', last: 'last 14:00', result: 'Timeline + artifacts preserved under privilege' } },
          ] },
        ],
      },
      'disclosure-timelines': {
        name: 'Disclosure & Timelines', q: 'What must we disclose, and by when?', pill: '1 clock running', pillKind: 'exposure',
        lede: 'Multi-jurisdiction obligations and the clocks attached to each.',
        sections: [
          { kind: 'table', head: ['Regime', 'Status', 'Clock', 'Note'], rows: [
            { cells: [{ t: 'SEC 8-K · Item 1.05 (US)', name: true }, { t: 'Not started', pill: true, kind: 'exposure' }, { t: '4 business days' }, { t: 'Starts only on materiality determination', exposed: true }] },
            { cells: [{ t: 'GDPR 72-hr (EU)', name: true }, { t: 'N/A', pill: true, kind: 'pass' }, { t: '—' }, { t: 'No personal data confirmed exposed', exposed: true }] },
            { cells: [{ t: 'State breach laws (US)', name: true }, { t: 'Monitoring', pill: true, kind: 'exposure' }, { t: 'Varies' }, { t: 'Below threshold pending data-scope', exposed: true }] },
            { cells: [{ t: 'Contractual notice', name: true }, { t: '46h', pill: true, kind: 'exposure' }, { t: 'Vendor SLA' }, { t: 'Precautionary notice prepared', exposed: true }] },
          ] },
        ],
      },
      'decisions-required': {
        name: 'Decisions Required', q: 'What needs my decision?', pill: '2 today', pillKind: 'exposure',
        lede: 'The legal calls — privilege, preservation, and the materiality determination.',
        sections: [
          { kind: 'decisions', button: 'Generate counsel memo →', items: [
            { sev: 'Decide', kind: 'exposure', title: 'Make or defer the materiality determination — co-owned with the CFO; due in 2h 40m.', owner: 'With CFO · Convene call' },
            { sev: 'Decide', kind: 'brand', title: 'Issue a precautionary litigation hold — preserves evidence should status change.', owner: 'Legal ops · Recommend: issue' },
          ] },
        ],
      },
      defensibility: {
        name: 'Defensibility', q: 'Is our position defensible?', pill: 'Defensible', pillKind: 'pass',
        lede: 'The record that protects the company with regulators, auditors, and in litigation.',
        sections: [
          { kind: 'panel', title: 'Defensibility', rowsKind: 'kv', rows: [
            { l: 'Regulatory readiness', v: '91%', vKind: 'pass', ev: { source: 'GRC readiness assessment', method: 'Auditor sample + automated', last: 'Quarterly', result: '91% obligations-control coverage' } },
            { l: 'Evidence chain', v: 'Preserved · integrity verified', vKind: 'pass', ev: { source: 'Evidence ledger', method: 'Automated — hash chain', last: 'Continuous', result: 'Integrity verified · no gaps' } },
            { l: 'Obligations met on time (12mo)', v: '100%', vKind: 'pass', ev: { source: 'Legal obligations matrix', method: 'Manual attestation', last: 'Trailing 12mo', result: '100% on-time' } },
            { l: 'Open legal risks', v: '2 · tracked', vKind: 'exposure', ev: { source: 'Legal risk register', method: 'Manual', last: 'last 7 days', result: '2 open · both tracked with owners' } },
          ] },
        ],
      },
    },
  },

  /* ============================== CRO ============================== */
  CRO: {
    summary: {
      verdict: 'Aggregate cyber risk is within appetite; one risk has moved above the line.',
      pill: '1 over appetite', pillKind: 'exposure',
      lede: 'Claims/payments risk moved above appetite today; the enterprise aggregate remains within tolerance. Third-party risk is the structural concern.',
      tiles: [
        { label: 'Risks over appetite', value: '1', valueKind: 'critical', to: 'tolerance-concentration' },
        { label: 'Aggregate risk', value: 'Within', to: 'risk-appetite-status' },
        { label: 'Concentration', value: 'Payments', to: 'tolerance-concentration' },
        { label: 'Third-party risk', value: 'Drifting', to: 'tolerance-concentration' },
        { label: 'Risk transfer', value: 'Active', to: 'decisions-required' },
        { label: 'Risk trend', value: '↑', to: 'risk-trajectory' },
      ],
      briefing: [
        { q: 'Are we within risk appetite today?', a: 'Aggregate yes; one risk (claims/payments) is currently above the appetite line.', pill: '1 breach', kind: 'exposure', to: 'risk-appetite-status' },
        { q: 'What is out of tolerance or concentrated?', a: 'Claims/payments over appetite; third-party risk drifting; concentration in payments.', pill: 'Concentrated', kind: 'exposure', to: 'tolerance-concentration' },
        { q: 'What needs my decision?', a: 'Accept, transfer, or mitigate the vendor risk; escalate the breach to committee.', pill: '2 today', kind: 'exposure', to: 'decisions-required' },
        { q: 'Is aggregate risk trending down?', a: 'Yes — residual risk improving over the last six quarters, within appetite.', pill: 'Improving ↑', kind: 'pass', to: 'risk-trajectory' },
      ],
    },
    tabs: {
      'risk-appetite-status': {
        name: 'Risk Appetite Status', q: 'Are we within risk appetite today?', pill: 'Aggregate: yes', pillKind: 'pass',
        lede: 'Each risk category against the board-set appetite line.',
        sections: [
          { kind: 'table', head: ['Risk category', 'Position', 'vs Appetite', 'Note'], rows: [
            { cells: [{ t: 'Claims / payments', name: true }, { t: 'Elevated', pill: true, kind: 'critical' }, { t: 'Over', fg: 'critical' }, { t: 'Contained exposure pushed it above line', exposed: true }] },
            { cells: [{ t: 'Third-party', name: true }, { t: 'Medium', pill: true, kind: 'exposure' }, { t: 'At line', fg: 'exposure' }, { t: 'Two critical vendors drifting', exposed: true }] },
            { cells: [{ t: 'Identity / access', name: true }, { t: 'Low', pill: true, kind: 'pass' }, { t: 'Within', fg: 'pass' }, { t: 'Improving', exposed: true }] },
            { cells: [{ t: 'Aggregate enterprise', name: true }, { t: 'Medium', pill: true, kind: 'exposure' }, { t: 'Within', fg: 'pass' }, { t: 'Within tolerance overall', exposed: true }] },
          ] },
        ],
      },
      'tolerance-concentration': {
        name: 'Tolerance & Concentration', q: 'What is out of tolerance or concentrated?', pill: 'Concentrated in payments', pillKind: 'exposure',
        lede: 'The risk-register entries breaching appetite, and where risk concentrates.',
        sections: [
          { kind: 'panel', title: 'Out of tolerance & concentration', rowsKind: 'kv', rows: [
            { l: 'Risks above appetite', v: '1 · claims/payments', vKind: 'exposure', ev: { source: 'Risk register', method: 'Manual — appetite scoring', last: 'last 14:00', result: 'R-07 claims/payments above ceiling' } },
            { l: 'Concentration risk', v: 'Payments path', vKind: 'exposure', ev: { source: 'Risk register + dependency map', method: 'Manual + automated', last: 'last 7 days', result: 'Concentration in payments/claims path' } },
            { l: 'Third-party risk', v: 'Drifting · 2 critical vendors', vKind: 'exposure', ev: { source: 'GRC vendor monitoring', method: 'Automated + attestation', last: 'last 23 days', result: '2 critical vendors drifting · 14 reviews overdue' } },
            { l: 'Correlated / supply-chain risk', v: 'Monitored', ev: { source: 'Supply-chain monitoring', method: 'Automated', last: 'Continuous', result: 'No new correlated exposure' } },
          ] },
        ],
      },
      'decisions-required': {
        name: 'Decisions Required', q: 'What needs my decision?', pill: '2 today', pillKind: 'exposure',
        lede: 'Accept, transfer, or mitigate — and what to escalate to the risk committee.',
        sections: [
          { kind: 'decisions', items: [
            { sev: 'Decide', kind: 'exposure', title: 'Accept, transfer, or mitigate vendor (PHI) risk — critical vendor below tolerance.', owner: 'Risk register · Recommend: mitigate' },
            { sev: 'Escalate', kind: 'brand', title: 'Appetite-breach escalation — claims/payments above the line.', owner: 'Risk committee · Escalate' },
          ] },
        ],
      },
      'risk-trajectory': {
        name: 'Risk Trajectory', q: 'Is aggregate risk trending down?', pill: 'Improving', pillKind: 'pass',
        lede: 'Residual risk against appetite over time.',
        sections: [
          { kind: 'panel', title: 'Risk trajectory', rowsKind: 'kv', rows: [
            { l: 'Residual risk (6-quarter trend)', v: 'Down · within appetite', vKind: 'pass', ev: { source: 'Risk quantification', method: 'Modeled — residual', last: 'Quarterly', result: 'Residual declining 6 quarters' } },
            { l: 'Appetite breaches this year', v: '3 · all resolved', vKind: 'pass', ev: { source: 'Risk register', method: 'Manual', last: 'YTD', result: '3 breaches · all resolved' } },
            { l: 'Risk register items closed (Q)', v: '12', vKind: 'pass', ev: { source: 'Risk register', method: 'Manual', last: 'This quarter', result: '12 items closed' } },
            { l: 'Projected if roadmap funded', v: 'Further reduction', vKind: 'pass', ev: { source: 'Risk model', method: 'Modeled — projected', last: 'last 7 days', result: 'Further reduction with funded roadmap' } },
          ] },
        ],
      },
    },
  },

  /* ============================== Board ============================== */
  Board: {
    summary: {
      verdict: 'Management is in control. One event is under materiality review; no disclosure is required to date.',
      pill: 'In control', pillKind: 'pass',
      lede: 'A single contained event, handled by management within minutes. The record shows the board has exercised oversight. One funding decision is before you.',
      tiles: [
        { label: 'Management in control', value: 'Yes', to: 'control-assurance' },
        { label: 'Material events', value: '0', to: 'materiality' },
        { label: 'Board decisions needed', value: '1', valueKind: 'critical', to: 'board-decisions' },
        { label: 'Posture vs appetite', value: 'Within', to: 'quarterly-oversight' },
        { label: 'Quarter trend', value: '↑+4', to: 'quarterly-oversight' },
        { label: 'Peer benchmark', value: 'Top quartile', to: 'quarterly-oversight' },
      ],
      briefing: [
        { q: 'Is management in control?', a: 'Yes — the event was contained in minutes; defenses across the enterprise hold.', pill: 'In control', kind: 'pass', to: 'control-assurance' },
        { q: 'Is anything material?', a: 'One event under materiality review; no disclosure obligation triggered to date.', pill: 'Under review', kind: 'exposure', to: 'materiality' },
        { q: 'What decisions does the board need?', a: 'One: approve claims-platform modernization funding ($220M/day exposure).', pill: '1 decision', kind: 'exposure', to: 'board-decisions' },
        { q: 'Are we improving?', a: 'Yes — posture +4 this quarter, within appetite, top-quartile vs peers.', pill: 'Improving ↑', kind: 'pass', to: 'quarterly-oversight' },
      ],
    },
    tabs: {
      'control-assurance': {
        name: 'Control Assurance', q: 'Is management in control?', pill: 'Yes', pillKind: 'pass',
        lede: 'Board-level assurance — no technical detail, just whether the company is being run safely.',
        sections: [
          { kind: 'panel', title: 'Assurance', rowsKind: 'kv', rows: [
            { l: 'Active compromise', v: 'None', vKind: 'pass', ev: { source: 'SIEM + EDR', method: 'Automated — correlation', last: 'Real-time · 14:08', result: 'No confirmed intrusion' } },
            { l: 'Today’s event', v: 'Contained by management in minutes', vKind: 'pass', ev: { source: 'SOAR incident record', method: 'Automated — workflow logs', last: '14:02', result: 'Contained in 2s · verified holding' } },
            { l: 'Business operating normally', v: 'Yes', vKind: 'pass', ev: { source: 'Service catalog', method: 'Automated — health checks', last: 'Real-time', result: 'All critical services operating' } },
            { l: 'Accountability', v: 'Named owners on every open item', vKind: 'pass', ev: { source: 'Action register', method: 'Manual', last: 'last 14:00', result: 'Every open item owner-assigned' } },
          ] },
        ],
      },
      materiality: {
        name: 'Materiality', q: 'Is anything material?', pill: 'Under review', pillKind: 'exposure',
        lede: 'What the board must know about materiality and disclosure.',
        sections: [
          { kind: 'panel', title: 'Materiality & disclosure', rowsKind: 'kv', rows: [
            { l: 'Material events confirmed', v: '0', vKind: 'pass', ev: { source: 'Legal + Finance review', method: 'Manual attestation', last: 'last 13:30', result: '0 confirmed material' } },
            { l: 'Under materiality review', v: '1 · determination due', vKind: 'exposure', ev: { source: 'Legal + Finance review', method: 'Manual', last: 'last 13:30', result: '1 candidate · determination pending' } },
            { l: 'Disclosure obligation triggered', v: 'None to date', vKind: 'pass', ev: { source: 'Legal obligations matrix', method: 'Manual', last: 'last 13:30', result: 'None triggered' } },
            { l: 'How management handled it', v: 'Contained, documented, evidence preserved', vKind: 'pass', ev: { source: 'Incident record + evidence ledger', method: 'Automated + manual', last: '14:09', result: 'Detected, contained, verified, escalated within policy' } },
          ] },
        ],
      },
      'board-decisions': {
        name: 'Board Decisions', q: 'What decisions does the board need?', pill: '1 decision', pillKind: 'exposure',
        lede: 'Items requiring board action or formal acknowledgement.',
        sections: [
          { kind: 'decisions', title: 'For the board', button: 'Open board package →', items: [
            { sev: 'Approve', kind: 'critical', title: 'Claims-platform modernization funding — addresses $220M/day exposure on a legacy system.', owner: 'Recommended by CISO, CIO, CFO · Approve funding' },
            { sev: 'Note', kind: 'brand', title: 'Acknowledge the contained event — for the oversight record.', owner: 'Management briefing · Acknowledge' },
          ] },
        ],
      },
      'quarterly-oversight': {
        name: 'Quarterly Oversight', q: 'Are we improving? (quarterly oversight)', pill: 'Improving', pillKind: 'pass',
        lede: 'The quarterly view: posture, resilience, and how we compare to peers.',
        sections: [
          { kind: 'panel', title: 'Quarterly oversight', rowsKind: 'kv', rows: [
            { l: 'Posture vs board appetite', v: 'Within · 82 / target 85', vKind: 'pass', ev: { source: 'Posture scoring engine', method: 'Automated — control rollup', last: 'Daily', result: '82 vs target 85' } },
            { l: 'Quarter-over-quarter', v: '↑ +4', vKind: 'pass', ev: { source: 'Posture scoring engine', method: 'Automated', last: 'Quarterly', result: '+4 quarter-over-quarter' } },
            { l: 'Mean time to contain', v: '41 min · improving', vKind: 'pass', ev: { source: 'SOAR metrics', method: 'Automated — metric rollup', last: 'Rolling 30d', result: 'MTTC 41 min · improving' } },
            { l: 'Peer benchmark', v: 'Top quartile', vKind: 'pass', ev: { source: 'Industry benchmark feed', method: 'Automated — benchmark', last: 'Quarterly', result: 'Top quartile vs healthcare peers' } },
            { l: 'Defensible record', v: 'Board summary + evidence on file', vKind: 'pass', ev: { source: 'Evidence ledger + board pack', method: 'Automated + manual', last: 'last 14:00', result: 'Board summary generated · evidence preserved' } },
          ] },
        ],
      },
    },
  },
};

/* ⚖ Liability — a defensibility view per seat, composed from the same decision/
   evidence records as the other tabs (best-judgment; tagged sample where not yet
   live). Attached as the `liability` tab on each seat. */
const LIABILITY = {
  CEO: {
    name: '⚖ Liability', q: 'Where could the business be held liable?', pill: 'Contained', pillKind: 'pass',
    lede: 'Liability in business terms — disclosure, duty of care, and what is on the record.',
    sections: [
      { kind: 'panel', title: 'Business liability posture', rowsKind: 'kv', rows: [
        { l: 'Disclosure obligation triggered', v: 'None to date', vKind: 'pass' },
        { l: 'Duty-of-care decisions on record', v: 'Current', vKind: 'pass' },
        { l: 'Material event under review', v: '1 · determination pending', vKind: 'exposure' },
        { l: 'Customer / contractual exposure', v: 'None confirmed', vKind: 'pass' },
      ] },
      { kind: 'note', text: 'Composed from decision and disclosure records; values not yet sourced from live data are shown as sample.' },
    ],
  },
  CFO: {
    name: '⚖ Liability', q: 'What is our financial liability exposure?', pill: 'Bounded', pillKind: 'pass',
    lede: 'Financial liability: insurance posture, penalty exposure, and reserves.',
    sections: [
      { kind: 'panel', title: 'Financial liability', rowsKind: 'kv', rows: [
        { l: 'Insurance coverage status', v: 'In force · below notice threshold', vKind: 'pass' },
        { l: 'Penalty / fine exposure', v: 'Only if data access confirmed', vKind: 'exposure' },
        { l: 'Contingent reserve required', v: 'None today', vKind: 'pass' },
        { l: 'Bounded loss range', v: '$0–1.1M' },
      ] },
      { kind: 'note', text: 'Composed from financial-exposure and insurance records; sample where not yet live.' },
    ],
  },
  CIO: {
    name: '⚖ Liability', q: 'Where are we operationally liable?', pill: 'Low', pillKind: 'pass',
    lede: 'Operational liability: SLA commitments, change governance, and recovery duties.',
    sections: [
      { kind: 'panel', title: 'Operational liability', rowsKind: 'kv', rows: [
        { l: 'SLA breaches (customer-facing)', v: '0', vKind: 'pass' },
        { l: 'Emergency change governance', v: 'ECR on file', vKind: 'pass' },
        { l: 'Recovery commitment (claims)', v: '~3.5 days · within tolerance', vKind: 'exposure' },
        { l: 'Unrecorded production changes', v: 'None open', vKind: 'pass' },
      ] },
      { kind: 'note', text: 'Composed from service and change records; sample where not yet live.' },
    ],
  },
  CLO: {
    name: '⚖ Liability', q: 'Is our legal position defensible?', pill: 'Defensible', pillKind: 'pass',
    lede: 'Legal liability and defensibility: privilege, preservation, and the obligations matrix.',
    sections: [
      { kind: 'panel', title: 'Legal liability & defensibility', rowsKind: 'kv', rows: [
        { l: 'Litigation hold', v: 'Prepared · standing by', vKind: 'exposure' },
        { l: 'Evidence preserved under privilege', v: 'Yes', vKind: 'pass' },
        { l: 'Obligations met on time (12mo)', v: '100%', vKind: 'pass' },
        { l: 'Open legal risks', v: '2 · tracked', vKind: 'exposure' },
      ] },
      { kind: 'note', text: 'Composed from the obligations matrix and evidence ledger; sample where not yet live.' },
    ],
  },
  CRO: {
    name: '⚖ Liability', q: 'Who is accountable for breaches of appetite?', pill: '1 breach owned', pillKind: 'exposure',
    lede: 'Risk accountability: appetite breaches, named owners, and escalation on record.',
    sections: [
      { kind: 'panel', title: 'Risk accountability', rowsKind: 'kv', rows: [
        { l: 'Appetite breaches', v: '1 · claims/payments', vKind: 'exposure' },
        { l: 'Every breach has a named owner', v: 'Yes', vKind: 'pass' },
        { l: 'Escalation to committee', v: 'On record', vKind: 'pass' },
        { l: 'Risk register defensibility', v: 'Current', vKind: 'pass' },
      ] },
      { kind: 'note', text: 'Composed from the risk register and decision records; sample where not yet live.' },
    ],
  },
  Board: {
    name: '⚖ Liability', q: 'Is the board’s oversight defensible?', pill: 'Defensible', pillKind: 'pass',
    lede: 'Oversight defensibility: the record that the board exercised its duty of care.',
    sections: [
      { kind: 'panel', title: 'Oversight defensibility', rowsKind: 'kv', rows: [
        { l: 'Briefings minuted', v: 'Current', vKind: 'pass' },
        { l: 'Material items acknowledged', v: 'Yes', vKind: 'pass' },
        { l: 'Decisions with named owners', v: 'All', vKind: 'pass' },
        { l: 'Evidence on file for the record', v: 'Yes', vKind: 'pass' },
      ] },
      { kind: 'note', text: 'Composed from oversight minutes and the evidence ledger; sample where not yet live.' },
    ],
  },
};
Object.keys(LIABILITY).forEach((s) => { if (SEATS_DATA[s]) SEATS_DATA[s].tabs.liability = LIABILITY[s]; });

export default SEATS_DATA;
