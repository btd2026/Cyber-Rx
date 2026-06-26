// NIST CSF 2.0 seed catalog (all 22 categories). CMMI is computed by the
// deterministic engine from each control's coverage + freshness; controls with
// pulled connector evidence override the seed (see engine/controlMap.ts). Shared
// by the CISO Framework Posture view and the cross-seat live-posture strip so
// every seat reads ONE source of truth.

export type CtrlSeed = { id: string; title: string; cov: number; age: number }
export type Category = { id: string; title: string; controls: CtrlSeed[] }
export type Func = { key: string; name: string; categories: Category[] }

export const CSF: Func[] = [
  { key: 'GV', name: 'Govern', categories: [
    { id: 'GV.OC', title: 'Organizational Context', controls: [{ id: 'GV.OC-01', title: 'Mission & stakeholder expectations understood', cov: 1, age: 120 }] },
    { id: 'GV.RM', title: 'Risk Management Strategy', controls: [{ id: 'GV.RM-01', title: 'Risk objectives established & agreed', cov: 0.8, age: 200 }] },
    { id: 'GV.RR', title: 'Roles, Responsibilities & Authorities', controls: [{ id: 'GV.RR-01', title: 'Leadership accountability established', cov: 0.8, age: 150 }] },
    { id: 'GV.PO', title: 'Policy', controls: [{ id: 'GV.PO-01', title: 'Cybersecurity policy established', cov: 1, age: 300 }] },
    { id: 'GV.OV', title: 'Oversight', controls: [{ id: 'GV.OV-01', title: 'Strategy outcomes reviewed', cov: 0.6, age: 400 }] },
    { id: 'GV.SC', title: 'Cybersecurity Supply Chain Risk Management', controls: [{ id: 'GV.SC-01', title: 'Supply chain risk program established', cov: 0.4, age: 600 }] },
  ] },
  { key: 'ID', name: 'Identify', categories: [
    { id: 'ID.AM', title: 'Asset Management', controls: [{ id: 'ID.AM-01', title: 'Hardware inventory maintained', cov: 1, age: 24 }] },
    { id: 'ID.RA', title: 'Risk Assessment', controls: [{ id: 'ID.RA-01', title: 'Vulnerabilities identified & recorded', cov: 0.9, age: 12 }] },
    { id: 'ID.IM', title: 'Improvement', controls: [{ id: 'ID.IM-01', title: 'Improvements identified from evaluations', cov: 0.7, age: 220 }] },
  ] },
  { key: 'PR', name: 'Protect', categories: [
    { id: 'PR.AA', title: 'Identity Management, Authentication & Access Control', controls: [{ id: 'PR.AA-05', title: 'Privileged access managed (PAM)', cov: 0.6, age: 48 }] },
    { id: 'PR.AT', title: 'Awareness & Training', controls: [{ id: 'PR.AT-01', title: 'Personnel security awareness training', cov: 0.9, age: 90 }] },
    { id: 'PR.DS', title: 'Data Security', controls: [{ id: 'PR.DS-01', title: 'Data-at-rest protected', cov: 1, age: 36 }] },
    { id: 'PR.PS', title: 'Platform Security', controls: [{ id: 'PR.PS-01', title: 'Configuration management practices', cov: 0.8, age: 60 }] },
    { id: 'PR.IR', title: 'Technology Infrastructure Resilience', controls: [{ id: 'PR.IR-01', title: 'Networks protected from unauthorized access', cov: 0.9, age: 30 }] },
  ] },
  { key: 'DE', name: 'Detect', categories: [
    { id: 'DE.CM', title: 'Continuous Monitoring', controls: [{ id: 'DE.CM-01', title: 'Networks & services monitored', cov: 1, age: 1 }] },
    { id: 'DE.AE', title: 'Adverse Event Analysis', controls: [{ id: 'DE.AE-02', title: 'Detected events analyzed', cov: 0.9, age: 4 }] },
  ] },
  { key: 'RS', name: 'Respond', categories: [
    { id: 'RS.MA', title: 'Incident Management', controls: [{ id: 'RS.MA-01', title: 'Incident response plan executed', cov: 0.8, age: 72 }] },
    { id: 'RS.AN', title: 'Incident Analysis', controls: [{ id: 'RS.AN-03', title: 'Forensics performed', cov: 0.6, age: 300 }] },
    { id: 'RS.CO', title: 'Incident Response Reporting & Communication', controls: [{ id: 'RS.CO-02', title: 'Stakeholders notified per plan', cov: 0.7, age: 120 }] },
    { id: 'RS.MI', title: 'Incident Mitigation', controls: [{ id: 'RS.MI-01', title: 'Incidents contained', cov: 0.9, age: 20 }] },
  ] },
  { key: 'RC', name: 'Recover', categories: [
    { id: 'RC.RP', title: 'Incident Recovery Plan Execution', controls: [{ id: 'RC.RP-01', title: 'Recovery plan executed & tested', cov: 0.3, age: 5000 }] },
    { id: 'RC.CO', title: 'Incident Recovery Communication', controls: [{ id: 'RC.CO-03', title: 'Recovery activities communicated', cov: 0.6, age: 400 }] },
  ] },
]

export const cmmiTone = (cmmi: number) => (cmmi >= 3 ? 'ok' : cmmi >= 2 ? 'warn' : 'crit')
