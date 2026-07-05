/* ============================================================================
   CyberX-Ray — Business Command Center: the operating-model knowledge graph.

   This is the backbone the platform is repositioning around: it turns cyber
   posture into BUSINESS outcomes. The hierarchy is:

     Industry → Corporate Strategy → Strategic Objective → Executive Owner
     → Business Capability → Business Process → Business Service
     → Application/System → Technology Asset → Cyber Control
     → Telemetry Source → Evidence → Business Health Score → Executive Decision

   Nothing here is a raw security metric. Technical telemetry (EDR %, MFA %,
   backups, incidents…) is the EVIDENCE underneath; every number an executive
   sees is a business-language score that traces, on drill-down, to the exact
   control and telemetry source that produced it.
   ============================================================================ */

/* ---- Executive roles (the navigation) — business owners, not tech domains --- */
var ROLES = [
  { key:'board', label:'Board of Directors', short:'Board', focus:'Enterprise cyber-business health, material risk, resilience posture and the decisions that need board awareness.' },
  { key:'ceo',   label:'CEO',   short:'CEO',   focus:'Whether cyber risk is enabling or preventing the strategy — enterprise health, brand & customer trust, the decisions only you can make.' },
  { key:'cfo',   label:'CFO',   short:'CFO',   focus:'Financial exposure, business-interruption cost, cyber-investment ROI and the risk-acceptance decisions that carry a dollar figure.' },
  { key:'coo',   label:'COO',   short:'COO',   focus:'Operational resilience — can the business keep delivering through a cyber disruption, and where are the continuity gaps.' },
  { key:'cio',   label:'CIO',   short:'CIO',   focus:'Technology enablement of the objectives — digital-service reliability, modernization risk and workforce productivity.' },
  { key:'ciso',  label:'CISO',  short:'CISO',  focus:'Cross-enterprise cyber-business health, control effectiveness, threat-to-business mapping and the evidence behind every executive score.' },
  { key:'cpo',   label:'Chief Product Officer', short:'CPO', focus:'Product-launch readiness, innovation velocity and secure-by-design adoption across the product portfolio.' },
  { key:'ccro',  label:'Chief Revenue Officer', short:'CRO·Rev', focus:'Revenue protection, customer trust, deal & renewal risk and customer-impacting service availability.' },
  { key:'crisk', label:'Chief Risk Officer', short:'CRO·Risk', focus:'Enterprise risk appetite, cross-functional risk ownership, residual risk and control assurance.' },
  { key:'clo',   label:'Chief Legal Officer', short:'CLO', focus:'Regulatory exposure, breach-notification readiness, contractual & privacy risk and evidence readiness.' },
  { key:'chro',  label:'Chief HR Officer', short:'CHRO', focus:'Workforce access confidence, insider risk, people-driven exposure and awareness maturity.' },
  { key:'cpso',  label:'Chief Procurement Officer', short:'CPO·Proc', focus:'Third-party & supplier dependency risk, vendor concentration and supply-chain continuity.' },
  { key:'audit', label:'Internal Audit', short:'Audit', focus:'Audit universe, evidence readiness, control-testing status, management actions and repeat findings.' }
];
function roleByKey(k){for(var i=0;i<ROLES.length;i++)if(ROLES[i].key===k)return ROLES[i];return ROLES[1];}

/* ---- Business-first translation of technical telemetry -----------------------
   Left = the raw source (what the CISO/tools produce). Right = what the
   business sees. dir:'high' means higher is better; 'low' means lower is
   better (inverted for scoring). base = illustrative baseline until live. */
var SIGNAL_BIZ = {
  edr_pct:            { biz:'Endpoint Resilience',              src:'EDR (CrowdStrike / Defender)', dir:'high', base:97, unit:'%' },
  mfa_pct:            { biz:'Workforce Access Confidence',      src:'Identity (Okta / Entra)',       dir:'high', base:95, unit:'%' },
  pam_pct:            { biz:'Privileged Access Assurance',      src:'PAM (CyberArk)',                dir:'high', base:62, unit:'%' },
  patch_pct:          { biz:'Operational Readiness',            src:'Vulnerability mgmt (Qualys / Tenable)', dir:'high', base:80, unit:'%' },
  cspm_pct:           { biz:'Digital Service Reliability',      src:'Cloud posture (Wiz / Prisma)',  dir:'high', base:84, unit:'%' },
  phishing_pct:       { biz:'Workforce Threat Awareness',       src:'Awareness (KnowBe4)',           dir:'low',  base:4,  unit:'%', invBase:96 },
  backup_immutable_pct:{ biz:'Recovery Assurance',              src:'Backup / DR (Rubrik / Veeam)',  dir:'high', base:100,unit:'%' },
  open_incidents:     { biz:'Business Disruption Signals',      src:'SIEM (Splunk / Sentinel)',      dir:'low',  base:0,  unit:'', invBase:100 },
  sod_conflicts:      { biz:'Financial Control Integrity',      src:'ERP / SOX (SAP GRC)',           dir:'low',  base:3,  unit:'', invBase:92 },
  bec_blocked:        { biz:'Payment-Fraud Defense',            src:'Email security (Proofpoint)',   dir:'high', base:90, unit:'/90d' },
  dsar_overdue:       { biz:'Privacy-Request Timeliness',       src:'Privacy ops (OneTrust)',        dir:'low',  base:0,  unit:'', invBase:100 }
};

/* Turn a raw telemetry reading into a 0–100 business score (higher = healthier). */
function sigToScore(key, val){
  var d = SIGNAL_BIZ[key]; if(!d) return null;
  if(val==null) val = d.base;
  if(d.dir==='high') return Math.max(0, Math.min(100, Math.round(val)));
  // low-is-good → invert onto a 0–100 confidence scale
  if(key==='open_incidents') return val>0 ? Math.max(0, 100 - val*25) : 100;
  if(key==='sod_conflicts')  return val>0 ? Math.max(0, 100 - val*8)  : 100;
  if(key==='phishing_pct')   return Math.max(0, Math.min(100, 100 - val*3));
  if(key==='dsar_overdue')   return val>0 ? Math.max(0, 100 - val*20) : 100;
  return Math.max(0, Math.min(100, 100 - val));
}

/* ---- Industry packs — each instantiates the hierarchy with real content ------
   A pack defines the strategy, the strategic objectives (each owned by a role),
   the business capabilities (each depending on a set of control-telemetry
   signals — that is the Evidence link), the regulations in play, the
   business-first risk scenarios, the KPIs, and the common executive decisions. */
function cap(id,name,owner,processes,service,controls){return {id:id,name:name,owner:owner,processes:processes,service:service,controls:controls};}
function obj(id,name,owner,caps,kpi){return {id:id,name:name,owner:owner,caps:caps,kpi:kpi};}

var INDUSTRY_PACKS = {
  health: {
    label:'Healthcare', strategy:'Improve patient & member outcomes while protecting trust and continuity of care.',
    objectives:[
      obj('o1','Protect continuity of care & claims','coo',['c1','c2'],'Claims paid on time (%)'),
      obj('o2','Safeguard patient & member trust','ceo',['c3','c4'],'Member trust / NPS'),
      obj('o3','Meet HIPAA & CMS obligations','clo',['c4'],'Reportable events (count)')
    ],
    capabilities:[
      cap('c1','Clinical operations','coo',['Patient intake','Care management'],'Care delivery platform',['edr_pct','open_incidents','backup_immutable_pct']),
      cap('c2','Claims & payments','cfo',['Claims processing','Prior authorization'],'Claims platform',['mfa_pct','pam_pct','sod_conflicts','backup_immutable_pct']),
      cap('c3','Member services','ccro',['Member portal','Enrollment'],'Member portal',['cspm_pct','mfa_pct','phishing_pct']),
      cap('c4','Provider network & privacy','clo',['Provider credentialing','PHI handling'],'Provider portal',['dsar_overdue','patch_pct','mfa_pct'])
    ],
    regulations:['HIPAA','HITRUST','CMS','State privacy laws'],
    risks:[
      { name:'Ransomware halting claims processing', obj:'o1', cap:'c2', impact:'Claims stop; members & providers unpaid', tech:'Ransomware TTPs vs backup immutability + EDR coverage' },
      { name:'Sensitive patient-data exposure', obj:'o2', cap:'c4', impact:'PHI breach → notification + trust loss', tech:'Cloud misconfiguration + access controls on PHI stores' },
      { name:'Member portal outage', obj:'o2', cap:'c3', impact:'Members cannot access care/benefits', tech:'Availability + DDoS + cloud posture on the portal' }
    ],
    kpis:['Claims paid on time %','Care-platform uptime','PHI records under active protection','Reportable events'],
    decisions:[
      { name:'Fund immutable-backup expansion for claims', owner:'cfo', benefit:'Removes the top continuity risk to claims', kind:'Budget approval' },
      { name:'Accept residual risk on legacy provider portal', owner:'crisk', benefit:'Documents a known exposure pending modernization', kind:'Risk acceptance' }
    ]
  },
  fin: {
    label:'Financial Services', strategy:'Preserve customer trust and transaction integrity while growing digital revenue.',
    objectives:[
      obj('o1','Protect payment & transaction integrity','coo',['c1','c2'],'Payment success rate'),
      obj('o2','Preserve customer trust & data','ceo',['c3','c4'],'Customer trust index'),
      obj('o3','Meet regulatory & fraud obligations','clo',['c2','c4'],'Regulatory findings')
    ],
    capabilities:[
      cap('c1','Payments & settlement','coo',['Payment processing','Settlement'],'Payments gateway',['edr_pct','backup_immutable_pct','open_incidents']),
      cap('c2','Fraud & financial controls','cfo',['Fraud monitoring','Reconciliation'],'Fraud platform',['bec_blocked','sod_conflicts','pam_pct']),
      cap('c3','Customer onboarding & banking','ccro',['Onboarding','Account servicing'],'Digital banking',['mfa_pct','cspm_pct','phishing_pct']),
      cap('c4','Data protection & compliance','clo',['Data handling','Reporting'],'Core banking',['patch_pct','dsar_overdue','mfa_pct'])
    ],
    regulations:['PCI DSS','SOX','GLBA','GDPR','DORA'],
    risks:[
      { name:'Payment disruption', obj:'o1', cap:'c1', impact:'Transactions fail; direct revenue + SLA breach', tech:'Availability + ransomware recoverability of the payments path' },
      { name:'Payment / wire fraud (BEC)', obj:'o1', cap:'c2', impact:'Direct financial loss + fraud exposure', tech:'BEC block rate + segregation of duties on payments' },
      { name:'Customer-data breach', obj:'o2', cap:'c3', impact:'Breach notification + trust + enforcement', tech:'Identity controls + cloud posture on banking data' }
    ],
    kpis:['Payment success rate','Fraud loss ($)','Customer trust index','Regulatory findings'],
    decisions:[
      { name:'Raise cyber-insurance limit vs fund payments DR', owner:'cfo', benefit:'Chooses transfer vs reduction on the payments tail', kind:'Business tradeoff' },
      { name:'Approve stronger onboarding identity controls', owner:'ccro', benefit:'Cuts account-takeover fraud without adding friction', kind:'Policy approval' }
    ]
  },
  mfg: {
    label:'Manufacturing', strategy:'Increase production reliability and protect design IP across a connected supply chain.',
    objectives:[
      obj('o1','Increase production reliability','coo',['c1','c2'],'Plant uptime (%)'),
      obj('o2','Protect design IP & quality','cpo',['c3'],'IP-loss events'),
      obj('o3','Secure the supply chain','cpso',['c4'],'Supplier disruption incidents')
    ],
    capabilities:[
      cap('c1','Manufacturing / OT operations','coo',['Production','MES'],'Plant control (OT)',['edr_pct','open_incidents','backup_immutable_pct']),
      cap('c2','Quality & logistics','coo',['Quality','Shipping'],'ERP',['patch_pct','mfa_pct']),
      cap('c3','Product engineering & IP','cpo',['Design','PLM'],'PLM / design system',['pam_pct','cspm_pct','mfa_pct']),
      cap('c4','Supply chain & procurement','cpso',['Procurement','Supplier portal'],'Supplier portal',['patch_pct','phishing_pct'])
    ],
    regulations:['NIST 800-171 / CMMC','ISO 27001','Export controls'],
    risks:[
      { name:'Plant outage from OT compromise', obj:'o1', cap:'c1', impact:'Production halts at $/hr; missed orders', tech:'OT segmentation + ransomware recoverability of MES/plant control' },
      { name:'Design-IP theft', obj:'o2', cap:'c3', impact:'Competitor advantage lost; margin erosion', tech:'Privileged access + DLP on PLM/design systems' },
      { name:'Supplier disruption', obj:'o3', cap:'c4', impact:'Line stops for want of a component', tech:'Third-party monitoring + supplier-portal exposure' }
    ],
    kpis:['Plant uptime %','OEE','IP-loss events','On-time supplier delivery'],
    decisions:[
      { name:'Fund OT network segmentation', owner:'coo', benefit:'Removes the top plant-outage driver', kind:'Budget approval' },
      { name:'Tier-1 supplier security requirements', owner:'cpso', benefit:'Reduces supply-chain concentration risk', kind:'Policy approval' }
    ]
  },
  retail: {
    label:'Retail / e-commerce', strategy:'Grow digital sales while protecting cardholder data and storefront availability.',
    objectives:[
      obj('o1','Keep the storefront selling','ccro',['c1','c3'],'Checkout conversion'),
      obj('o2','Protect cardholder data','clo',['c2'],'PCI findings'),
      obj('o3','Protect the brand & loyalty','ceo',['c4'],'Customer trust')
    ],
    capabilities:[
      cap('c1','Checkout & payments','ccro',['Checkout','Payments'],'Payment platform',['edr_pct','open_incidents','backup_immutable_pct']),
      cap('c2','Cardholder-data protection','clo',['Data handling','Tokenization'],'Card data store',['pam_pct','patch_pct','sod_conflicts']),
      cap('c3','E-commerce storefront','ccro',['Storefront','Fulfillment'],'E-commerce platform',['cspm_pct','mfa_pct']),
      cap('c4','Loyalty & CRM','ccro',['Loyalty','CRM'],'Customer database',['mfa_pct','phishing_pct','dsar_overdue'])
    ],
    regulations:['PCI DSS','GDPR','CCPA'],
    risks:[
      { name:'Card-data breach', obj:'o2', cap:'c2', impact:'PCI fines + notification + brand hit', tech:'Access controls + patching on the card-data store' },
      { name:'Storefront outage in peak season', obj:'o1', cap:'c3', impact:'Direct sales loss per hour', tech:'Cloud posture + availability of the storefront' },
      { name:'Loyalty-account takeover', obj:'o3', cap:'c4', impact:'Fraud + customer trust erosion', tech:'Identity controls + awareness on customer accounts' }
    ],
    kpis:['Checkout conversion','Storefront uptime','PCI findings','Loyalty fraud rate'],
    decisions:[
      { name:'Fund peak-season resilience', owner:'coo', benefit:'Protects revenue in the highest-value weeks', kind:'Budget approval' }
    ]
  },
  gov: {
    label:'Government / Public sector', strategy:'Deliver trusted citizen services while safeguarding sensitive records.',
    objectives:[
      obj('o1','Keep citizen services available','coo',['c1'],'Service availability'),
      obj('o2','Protect citizen records','clo',['c2'],'Records-exposure events'),
      obj('o3','Meet public-sector mandates','clo',['c2','c3'],'Compliance findings')
    ],
    capabilities:[
      cap('c1','Citizen services','coo',['Citizen portal','Case management'],'Citizen portal',['cspm_pct','open_incidents','backup_immutable_pct']),
      cap('c2','Records & privacy','clo',['Records management','PII handling'],'Records database',['pam_pct','dsar_overdue','patch_pct']),
      cap('c3','Benefits processing','coo',['Benefits','Eligibility'],'Benefits system',['mfa_pct','edr_pct'])
    ],
    regulations:['FISMA','FedRAMP','State privacy laws','CJIS'],
    risks:[
      { name:'Citizen-records breach', obj:'o2', cap:'c2', impact:'Mass PII exposure + statutory notification', tech:'Privileged access + patching on records systems' },
      { name:'Service outage', obj:'o1', cap:'c1', impact:'Citizens cannot access essential services', tech:'Cloud posture + recoverability of the portal' }
    ],
    kpis:['Service availability','Records under protection','Compliance findings'],
    decisions:[
      { name:'Fund FedRAMP-aligned modernization', owner:'cio', benefit:'Closes the top records-exposure driver', kind:'Budget approval' }
    ]
  },
  tech: {
    label:'Technology / SaaS', strategy:'Ship trusted products fast while protecting customer data and platform uptime.',
    objectives:[
      obj('o1','Keep the platform reliable','cio',['c1'],'Platform uptime / SLA'),
      obj('o2','Ship secure products fast','cpo',['c2'],'Secure-launch rate'),
      obj('o3','Protect customer data & trust','ceo',['c3'],'Customer trust')
    ],
    capabilities:[
      cap('c1','Platform operations','cio',['Production platform','API'],'Production platform',['cspm_pct','open_incidents','backup_immutable_pct']),
      cap('c2','Product engineering','cpo',['Development','Release'],'CI/CD + product',['patch_pct','pam_pct','mfa_pct']),
      cap('c3','Customer data & identity','ccro',['Authentication','Data platform'],'Customer data platform',['mfa_pct','phishing_pct','dsar_overdue'])
    ],
    regulations:['SOC 2','ISO 27001','GDPR','CCPA'],
    risks:[
      { name:'Customer-data breach', obj:'o3', cap:'c3', impact:'Breach notice + churn + trust', tech:'Identity + cloud posture on the customer data platform' },
      { name:'Platform outage', obj:'o1', cap:'c1', impact:'SLA credits + churn + reputation', tech:'Cloud posture + recoverability of production' },
      { name:'Insecure release', obj:'o2', cap:'c2', impact:'Vulnerable feature ships to customers', tech:'Secure-SDLC + privileged access in CI/CD' }
    ],
    kpis:['Platform uptime','Secure-launch rate','Customer trust','Time-to-remediate'],
    decisions:[
      { name:'Adopt secure-by-design release gates', owner:'cpo', benefit:'Cuts insecure-release risk without slowing shipping', kind:'Policy approval' }
    ]
  },
  energy: {
    label:'Energy / Utilities', strategy:'Keep essential services running reliably and securely across IT and OT.',
    objectives:[
      obj('o1','Maintain grid / service reliability','coo',['c1'],'Service continuity'),
      obj('o2','Protect operational technology','coo',['c1','c2'],'OT incidents'),
      obj('o3','Meet regulatory obligations','clo',['c3'],'Regulatory findings')
    ],
    capabilities:[
      cap('c1','Grid / OT operations','coo',['Grid operations','SCADA'],'SCADA / control',['edr_pct','open_incidents','backup_immutable_pct']),
      cap('c2','Field operations','coo',['Field ops','Metering'],'Field-ops system',['patch_pct','mfa_pct']),
      cap('c3','Billing & compliance','cfo',['Billing','Reporting'],'Billing platform',['pam_pct','dsar_overdue'])
    ],
    regulations:['NERC CIP','TSA directives','ISO 27001'],
    risks:[
      { name:'OT attack disrupting operations', obj:'o2', cap:'c1', impact:'Service disruption + safety + regulatory', tech:'OT segmentation + recoverability of SCADA/control' },
      { name:'Billing-system compromise', obj:'o3', cap:'c3', impact:'Revenue + customer + regulatory exposure', tech:'Privileged access + patching on billing' }
    ],
    kpis:['Service continuity','OT incidents','Regulatory findings'],
    decisions:[
      { name:'Fund OT resilience & recovery', owner:'coo', benefit:'Removes the top operational-disruption driver', kind:'Budget approval' }
    ]
  },
  insurance: {
    label:'Insurance', strategy:'Protect policyholder trust and claims integrity while growing digital distribution.',
    objectives:[
      obj('o1','Protect claims & policy operations','coo',['c1'],'Claims paid on time'),
      obj('o2','Preserve policyholder trust','ceo',['c2'],'Policyholder trust'),
      obj('o3','Meet regulatory obligations','clo',['c3'],'Regulatory findings')
    ],
    capabilities:[
      cap('c1','Claims & policy admin','coo',['Claims processing','Policy admin'],'Claims platform',['edr_pct','backup_immutable_pct','sod_conflicts']),
      cap('c2','Distribution & member services','ccro',['Member portal','Underwriting'],'Member portal',['mfa_pct','cspm_pct','phishing_pct']),
      cap('c3','Data protection & compliance','clo',['PII handling','Reporting'],'Policy database',['pam_pct','dsar_overdue','patch_pct'])
    ],
    regulations:['NAIC','State insurance regs','GDPR','HIPAA (health lines)'],
    risks:[
      { name:'Claims disruption', obj:'o1', cap:'c1', impact:'Policyholders unpaid; SLA + trust hit', tech:'Recoverability + segregation of duties on claims' },
      { name:'Policyholder-data breach', obj:'o2', cap:'c2', impact:'Notification + churn + enforcement', tech:'Identity + cloud posture on member data' }
    ],
    kpis:['Claims paid on time','Policyholder trust','Regulatory findings'],
    decisions:[
      { name:'Fund claims-platform resilience', owner:'cfo', benefit:'Protects the core policyholder promise', kind:'Budget approval' }
    ]
  }
};

/* Map the onboarding industry string to a pack key (defaults to technology). */
function packKeyFor(ind){
  var i=String(ind||'').toLowerCase();
  if(/health/.test(i))return 'health';
  if(/financ|bank/.test(i))return 'fin';
  if(/insur/.test(i))return 'insurance';
  if(/manufact/.test(i))return 'mfg';
  if(/retail|commerce/.test(i))return 'retail';
  if(/gov|public/.test(i))return 'gov';
  if(/energy|utilit/.test(i))return 'energy';
  return 'tech';
}

if (typeof module !== 'undefined' && module.exports) {
  module.exports = { ROLES, SIGNAL_BIZ, INDUSTRY_PACKS, packKeyFor, sigToScore, roleByKey };
}
