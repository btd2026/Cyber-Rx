export const REACH: Record<string, number> = {idp:108,pam:11,mdm:101,edr:96,siem:79,cld:119,vuln:94,hr:139,itsm:14,bkp:88,net:62,code:48};

export const CORPTOOL: Record<string, string> = {idp:"Microsoft Entra ID",pam:"CyberArk",mdm:"Microsoft Intune / Jamf Pro",
  edr:"CrowdStrike Falcon",siem:"Splunk",cld:"AWS Organizations / Microsoft Azure",
  vuln:"Tenable",hr:"Workday",itsm:"ServiceNow",bkp:"Rubrik",net:"Palo Alto Networks",code:"GitHub"};

/* enrolment routes — 61 + 52 + 22 + 12 = 147 */
export const ROUTES: any[] = [
 ["Inside a corporate tenant",61,"Nothing to do locally. Corporate's grant already returns their population.","var(--ec-t)"],
 ["Self-serve enrolment",52,"Local admin runs the 20-minute wizard for the tools corporate does not reach.","var(--accent)"],
 ["Signed evidence contract",22,"Cannot grant API access. Ships signed JSON on their own schedule.","var(--warn)"],
 ["Connected nothing",12,"Reported as unmeasured, by name, in the corporate roll-up. Not averaged away.","var(--critical)"]];

/* representative entities, each its own subject */
export const ENTS: any[] = [
 {id:"E-001",n:"HPE Corporate & shared services",t:"Corporate",reg:"Americas",w:18400,
  o:{idp:"L",pam:"L",mdm:"L",edr:"L",siem:"L",cld:"L",vuln:"L",hr:"L",itsm:"L",bkp:"L",net:"L",code:"L"},
  note:"This entity is the provider. Everything below is its own — which is why it is the only entity that can compute a group figure."},
 {id:"E-014",n:"GreenLake platform & operations",t:"Business unit",reg:"Americas",w:6100,
  o:{idp:"V",pam:"-",mdm:"V",edr:"V",siem:"L",cld:"V",vuln:"V",hr:"V",itsm:"V",bkp:"V",net:"V",code:"L"},
  note:"Runs its own SIEM and its own pipeline controls because it is customer-facing and separately audited. Everything else is inherited and verified."},
 {id:"E-039",n:"Financial Services",t:"Regulated subsidiary",reg:"EMEA",w:2400,
  o:{idp:"V",pam:"L",mdm:"V",edr:"L",siem:"L",cld:"V",vuln:"L",hr:"V",itsm:"L",bkp:"L",net:"L",code:"-"},
  note:"Regulatory separation requires its own privileged access, detection, vulnerability and recovery stack. Inherits identity and endpoint management only."},
 {id:"E-088",n:"Country office — Vietnam",t:"Country office",reg:"APJ",w:96,
  o:{idp:"V",pam:"-",mdm:"V",edr:"C",siem:"-",cld:"V",vuln:"-",hr:"V",itsm:"-",bkp:"V",net:"-",code:"-"},
  note:"Small office, mostly inherited and verified. The endpoint protection claim is false: 96 of its endpoints appear in no EDR console anywhere."},
 {id:"E-112",n:"Networking acquisition — EMEA ops",t:"Acquired 14 months ago",reg:"EMEA",w:1920,
  o:{idp:"C",pam:"-",mdm:"-",edr:"C",siem:"-",cld:"V",vuln:"-",hr:"V",itsm:"-",bkp:"-",net:"-",code:"-"},
  note:"Inside the corporate trust boundary and outside the corporate control set. Two inheritance claims are false and eight categories have no source at all."},
 {id:"E-131",n:"AIOps platform vendor",t:"Acquired 9 months ago",reg:"Americas",w:510,
  o:{idp:"L",pam:"-",mdm:"-",edr:"-",siem:"-",cld:"-",vuln:"-",hr:"V",itsm:"-",bkp:"-",net:"-",code:"-"},
  note:"Runs its own Okta tenant, federated to corporate 41 days ago. Was not on the register we were given. Ten categories have no source."}];

export const ORIGIN_META: Record<string, [string, string, string]> = {L:["LOCAL","var(--accent)","The entity runs and connected its own tool"],
              V:["INHERITED","var(--ec-t)","Corporate tool — verified: their assets are in its population"],
              C:["CLAIM FALSE","var(--critical)","Corporate tool asserted, but their assets are not in it"],
              "-":["NO SOURCE","var(--ink-2)","Nothing connected — every control resting on this reports unmeasured"]};

/* canonical fact types — what a control is actually written against.
   [ fact, description, categories that can supply it ]                     */
export const FACTS: any[] = [
 ["identity","A principal that exists, with its lifecycle state and source of truth",["idp","pam","hr"]],
 ["worker","A human the organisation employs, independent of whether they have an account",["hr"]],
 ["authentication_event","An attempt to authenticate: when, by what method, with what result",["idp","pam"]],
 ["entitlement","A principal's privilege over a resource, as an interval with a grant and a revoke",["idp","pam","cld"]],
 ["device","A managed endpoint with its compliance, encryption and protection state",["mdm","edr"]],
 ["asset","Any inventoried thing with an owning entity — account, workload, host, repository",["cld","mdm","vuln","code"]],
 ["log_delivery","Whether a source system is shipping to the log platform, and the gaps",["siem"]],
 ["vulnerability_finding","A finding on an asset, from first seen to remediated",["vuln"]],
 ["change_record","An authorised change, its approval and its window",["itsm"]],
 ["backup_event","A backup taken, verified, and whether a restore was exercised",["bkp"]],
 ["network_control","Segmentation and egress policy as applied, not as designed",["net"]],
 ["pipeline_control","Enforcement state on a repository or pipeline",["code"]]];
