// Incident-command data (Phase 6b/6c), ported from the approved mock. In
// production these stream from the connected stack (EDR/SOAR/SIEM/identity/
// backup/threat-intel); here they seed the War Room + Incident Commander.

export type Sys = { nm: string; sub: string; st: 'ok' | 'warn' | 'crit'; m: string; ev: string[] }
export type Cell = { t: string; d: string; st: 'safe' | 'contained' | 'atrisk'; lbl: string }
export type FeedLine = [string, string, string, string] // time, source, text, tone

export const SYS_CALM: Sys[] = [
  { nm: 'SIEM', sub: 'Splunk', st: 'ok', m: '1.2B events/day', ev: ['0 active correlations', 'ingest 100% · 0 gaps'] },
  { nm: 'Threat Intel', sub: 'feeds + H-ISAC', st: 'ok', m: '0 IOC matches', ev: ['no actor activity', 'feeds current'] },
  { nm: 'EDR', sub: 'CrowdStrike', st: 'ok', m: '24,318 hosts clean', ev: ['0 detections', '99.2% coverage'] },
  { nm: 'Identity', sub: 'Okta', st: 'ok', m: 'MFA 98.1%', ev: ['0 risky sign-ins', 'no privilege anomalies'] },
  { nm: 'Network', sub: 'Palo Alto + WAF', st: 'ok', m: '4,102 blocked / 24h', ev: ['no C2 traffic', 'segmentation intact'] },
  { nm: 'Email', sub: 'Proofpoint', st: 'warn', m: 'phishing elevated', ev: ['12 campaigns blocked', 'claims staff targeted'] },
]

export const SYS_LIVE: Sys[] = [
  { nm: 'SIEM', sub: 'Splunk', st: 'crit', m: 'alerts/min', ev: ['ransomware playbook firing', 'mass file-encryption on claims VLAN'] },
  { nm: 'Threat Intel', sub: 'feeds + H-ISAC', st: 'crit', m: 'BlackCat / ALPHV', ev: ['TTPs match known affiliate', 'ransom-note signature matched'] },
  { nm: 'EDR', sub: 'CrowdStrike', st: 'crit', m: '14 hosts encrypting', ev: ['auto-isolation in progress', 'patient-zero: CLAIMS-APP-07'] },
  { nm: 'Identity', sub: 'Okta', st: 'warn', m: '1 priv acct abused', ev: ['service account from new ASN', 'token revoked'] },
  { nm: 'Network', sub: 'Palo Alto + WAF', st: 'warn', m: 'C2 egress blocked', ev: ['egress to 91.211.x.x dropped', 'claims VLAN contained'] },
  { nm: 'Email', sub: 'Proofpoint', st: 'crit', m: 'initial access: phish', ev: ['malicious attachment opened', '14:01 · claims staff inbox'] },
]

export const CHAIN = [
  { nm: 'Reconnaissance', st: 'done', n: 'targeted claims staff identified' },
  { nm: 'Initial Access', st: 'done', n: 'phishing → credential + payload' },
  { nm: 'Execution', st: 'done', n: 'ransomware ran on endpoint' },
  { nm: 'Lateral Movement', st: 'active', n: 'attempting domain spread — being contained' },
  { nm: 'Exfiltration / Impact', st: 'blocked', n: 'encryption held to 14 isolated hosts' },
]

export const BLAST: Cell[] = [
  { t: 'Claims Processing', d: '$220M/day · 14 hosts affected', st: 'atrisk', lbl: 'AT RISK' },
  { t: 'Claims database (PHI)', d: 'isolated · not yet encrypted', st: 'contained', lbl: 'CONTAINED' },
  { t: 'Provider Payments', d: 'segmented · unaffected', st: 'safe', lbl: 'SAFE' },
  { t: 'Member Portal', d: 'unaffected', st: 'safe', lbl: 'SAFE' },
]

export const CONTAIN: Cell[] = [
  { t: '14 endpoints network-isolated', d: 'CrowdStrike EDR · auto-contained', st: 'contained', lbl: 'DONE' },
  { t: 'Privileged tokens revoked', d: 'Okta · 1,180 sessions forced re-auth', st: 'contained', lbl: 'DONE' },
  { t: 'C2 egress blocked', d: 'Palo Alto · 91.211.x.x + 2 domains sinkholed', st: 'contained', lbl: 'DONE' },
  { t: 'Claims VLAN segmented', d: 'spread to payments & portal blocked', st: 'safe', lbl: 'HOLDING' },
  { t: 'Immutable backup pinned', d: 'Rubrik · clean copy locked & verified', st: 'safe', lbl: 'DONE' },
]

export const RECOVERY: Cell[] = [
  { t: 'Last clean backup', d: 'Rubrik · 13:30 — 32 min pre-detonation', st: 'safe', lbl: 'GOOD' },
  { t: 'Immutable / air-gapped copy', d: 'verified uncorrupted', st: 'safe', lbl: 'VERIFIED' },
  { t: 'RPO · data at risk', d: '≤ 30 min of claims transactions', st: 'contained', lbl: '~30 MIN' },
  { t: 'RTO · restore claims core', d: 'recovery environment warming', st: 'atrisk', lbl: '~3.5 DAYS' },
  { t: 'Last restore test', d: 'Nov 2025 — overdue · readiness 78%', st: 'atrisk', lbl: 'OVERDUE' },
]

export const REGCLK: Cell[] = [
  { t: 'SEC Item 1.05 — material?', d: '4 business days from determination', st: 'atrisk', lbl: 'CLOCK EVALUATING' },
  { t: 'HIPAA breach (HHS + individuals)', d: '≤ 60 days if PHI exposure confirmed', st: 'contained', lbl: 'NOT TRIGGERED · 0 RECORDS' },
  { t: 'State AG notification', d: '11 states in scope · fastest ~30 days', st: 'atrisk', lbl: 'ASSESSMENT OPEN' },
  { t: 'Cyber-insurance notice', d: 'carrier · "as soon as practicable"', st: 'atrisk', lbl: 'DRAFT — AWAITING CFO' },
]

export const DECS = [
  { r: 'CEO', d: 'Declare crisis · approve external-comms hold' },
  { r: 'CIO', d: 'Authorize DR activation for claims processing' },
  { r: 'CLO', d: 'Start the regulatory clock · 11-state assessment' },
  { r: 'CFO', d: 'Notify the cyber-insurance carrier now' },
]

export const BRIDGE = [
  { r: 'Incident Commander', d: 'Sarah Chen (CISO) · since 14:03' },
  { r: 'IR retainer', d: 'Mandiant — engaged 14:11, remote triage live' },
  { r: 'Forensics / evidence', d: 'imaging in progress · legal hold + chain-of-custody active' },
  { r: 'Outside counsel', d: 'engaged under privilege' },
  { r: 'Law enforcement', d: 'FBI / CISA notification prepared' },
]

export const READY: Cell[] = [
  { t: 'IR retainer on call', d: 'Mandiant · 1-hour response SLA', st: 'safe', lbl: 'ARMED' },
  { t: 'Immutable backups', d: 'verified daily · last good 13:30', st: 'safe', lbl: 'VERIFIED' },
  { t: 'Auto-containment playbooks', d: 'SOAR · isolation · token-revoke · C2-block', st: 'safe', lbl: 'ARMED' },
  { t: 'Regulatory clock automation', d: 'SEC · HIPAA · state · GDPR mapped', st: 'safe', lbl: 'READY' },
  { t: 'Last tabletop exercise', d: 'May 2026 · ransomware scenario', st: 'contained', lbl: '63 DAYS AGO' },
]

export const ATTCK = ['T1078 Valid Accounts', 'T1486 Data Encrypted for Impact', 'T1490 Inhibit System Recovery', 'T1021 Remote Services', 'T1567 Exfiltration over Web']

export const FEED_SEED: FeedLine[] = [
  ['14:02:11', 'EDR', 'ransomware behavior flagged on CLAIMS-APP-07', 'crit'],
  ['14:02:13', 'SOAR', 'auto-isolation triggered · 14 hosts', 'act'],
  ['14:02:19', 'SIEM', 'correlation: mass file-encryption across claims VLAN', 'crit'],
  ['14:02:24', 'TI', 'signature match → BlackCat/ALPHV affiliate', 'crit'],
  ['14:02:31', 'IAM', 'privileged service-account token revoked', 'act'],
  ['14:02:40', 'NET', 'egress to C2 91.211.x.x blocked at perimeter', 'act'],
]

export const FEED_POOL: [string, string, string][] = [
  ['EDR', 'host CLAIMS-APP-09 quarantined', 'act'],
  ['SOAR', 'backup integrity check started on claims DB', 'act'],
  ['SIEM', 'encryption rate plateauing — containment holding', 'act'],
  ['NET', 'additional C2 domain sinkholed', 'act'],
  ['IAM', 'forced re-auth on 1,180 privileged sessions', 'act'],
  ['TI', 'affiliate infrastructure mapped · shared to H-ISAC', 'act'],
  ['EDR', 'no spread to payments or portal VLANs', 'act'],
  ['DR', 'recovery environment warming for claims', 'act'],
  ['SIEM', 'new encryption attempt blocked on CLAIMS-APP-11', 'crit'],
  ['LEGAL', '11-state breach assessment opened', 'act'],
]

// Incident Commander
export const IC_CHECK = [
  'Declare incident & assume command',
  'Assemble the response team (call tree)',
  'Contain & isolate affected systems',
  'Preserve evidence — forensic images & logs',
  'Assess scope, data impact & materiality',
  'Notify per plan — exec, legal, insurer, regulators',
  'Open the incident decision log',
  'Set comms cadence — internal & external',
]

export type Contact = { role: string; who: string; ph: string; g: 'Internal' | 'External' }
export const IC_CONTACTS: Contact[] = [
  { role: 'Deputy Incident Commander', who: 'Marcus Webb', ph: '+1 555-0142', g: 'Internal' },
  { role: 'Comms / PR lead', who: 'Elena Ruiz', ph: '+1 555-0188', g: 'Internal' },
  { role: 'Legal / Privacy', who: 'Patricia Lang · CLO', ph: '+1 555-0110', g: 'Internal' },
  { role: 'IT / DR lead', who: 'Raj Patel · CIO', ph: '+1 555-0133', g: 'Internal' },
  { role: 'IR retainer / forensics · 24/7', who: 'Mandiant — hotline', ph: '+1 866-555-0199', g: 'External' },
  { role: 'Breach counsel', who: 'Hogan & Pierce LLP', ph: '+1 202-555-0170', g: 'External' },
  { role: 'Cyber-insurer claims hotline', who: 'Chubb — cyber claims', ph: '+1 800-555-0123', g: 'External' },
  { role: 'Law enforcement · FBI Cyber', who: 'Field office', ph: '+1 555-0100', g: 'External' },
]

export const IC_PLAYBOOK = {
  nm: 'Ransomware response',
  steps: [
    'Isolate affected hosts; cut lateral paths',
    'Revoke privileged tokens & rotate keys',
    'Verify backup integrity BEFORE any restore',
    'Engage IR retainer + breach counsel',
    'Do NOT pay without counsel + an exec decision',
    'Preserve ransom note & IOCs for attribution',
  ],
}
