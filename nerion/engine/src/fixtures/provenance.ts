export const OPTEST: Record<string, string[]> = {
"PR.AA-03":["Every successful interactive sign-in in the window satisfied a phishing-resistant factor",
  "For each entity-day: every session with interactionRequired=true resolved to fido2, windowsHelloForBusiness or x509. One non-conforming sign-in fails the day for that entity.",
  "6,214,880 sign-in events across 108 entities","Sign-in telemetry, not enrolment records — a user can be enrolled and still authenticate with SMS"],
"ID.AM-01":["Every managed device reported inventory within the last 7 days",
  "For each entity-day: count of devices whose last_sync is inside a rolling 7-day window, divided by devices known to that entity. Below 95% fails the day.",
  "138,400 device records across 101 entities","Device management telemetry — an asset absent from the console is absent from the count, not assumed present"],
"DE.CM-01":["Every in-scope log source delivered at least one event that day",
  "For each entity-day: every declared source in the inventory produced ≥1 event. A source that goes silent fails the day from the first missing day, not from the day someone noticed.",
  "612 sourcetypes across 79 entities","Delivery continuity from the SIEM's own index metadata"],
"PR.PS-05":["Application control was in enforce mode on every managed endpoint",
  "For each entity-day: every host's prevention policy evaluated to enforce, not monitor and not disabled. A host in monitor mode fails the day for that entity.",
  "128,940 hosts across 96 entities","Policy state read from the EDR platform per host, per day"],
"PR.DS-01":["Every volume holding classified data was encrypted at rest, all day",
  "For each entity-day: every in-scope volume reported encryption enabled for the full 24 hours. A volume created unencrypted and remediated at 16:00 fails that day.",
  "41,208 volumes across 119 entities","Cloud configuration state polled daily and diffed"],
"ID.RA-01":["Every in-scope asset was scanned inside its required interval",
  "For each entity-day: assets whose last authenticated scan is inside the interval its criticality requires (7 days critical, 30 days standard).",
  "1.4M findings across 94 entities","Scan coverage from the vulnerability platform, by asset, not by scan job"],
"PR.AA-05":["Standing privileged access stayed inside the approved set",
  "For each entity-day: no permanent Directory-scoped role assignment outside the approved list. Any standing grant fails the day.",
  "polled daily across 11 entities","Entitlement snapshots — below the reporting threshold at 11 of 147 entities"]};

export const OPDEFAULT: string[] = ["The control's operating condition held on every applicable entity-day",
  "For each entity-day in the window, the control's predicate evaluated true across the full applicable population. A single failing entity fails that entity-day, not the group.",
  "the interval series for the entities in scope","Interval evidence from the connected source"];

export const SRCMAP = {t:{
  "PR.AA-03":["Microsoft Entra ID","entra-audit","AuditLog.Read.All",
    "SELECT entity_id, day, bool_or(mfa_satisfied AND method IN ('fido2','windowsHelloForBusiness','x509'))\n  FROM signin_event\n WHERE day BETWEEN '2026-05-25' AND '2026-08-24'\n GROUP BY entity_id, day",
    "sha256:9c41…7ab2","6,214,880 sign-in events","2026-08-23T23:59Z"],
  "ID.AM-01":["Microsoft Intune / Jamf Pro","intune-graph","DeviceManagementManagedDevices.Read.All",
    "SELECT entity_id, day, count(*) FILTER (WHERE last_sync > day - 7)\n  FROM device_snapshot GROUP BY entity_id, day",
    "sha256:4f10…c3d8","138,400 device records","2026-08-23T22:14Z"],
  "DE.CM-01":["Splunk","splunk-rest","search · rest_properties_get",
    "| tstats count WHERE index=* BY index, sourcetype, _time span=1d\n| eval shipping=if(count>0,1,0)",
    "sha256:1b77…0e91","612 sourcetypes across 79 entities","2026-08-23T23:41Z"],
  "PR.PS-05":["CrowdStrike Falcon","cs-api","Prevention policies (Read) · Hosts (Read)",
    "SELECT entity_id, day, bool_and(prevention_enabled)\n  FROM host_policy_state GROUP BY entity_id, day",
    "sha256:8a02…d55c","128,940 hosts · 96 entities present","2026-08-23T21:02Z"]},
 c:{"PR.AA-05":["Microsoft Entra ID","entra-graph","RoleManagement.Read.Directory",
    "SELECT entity_id, day, count(*) FILTER (WHERE role_scope='Directory' AND permanent)\n  FROM entitlement_snapshot GROUP BY entity_id, day",
    "sha256:2d93…41fa","polled daily · 11 entities in scope","2026-08-22T04:00Z"]}};

export const DOCMAP: Record<string, string[]> = {
  "GV.PO-01":["Information Security Policy v11","2026-02-14","Board-approved",
    "The organisation shall maintain and annually review a documented information security policy approved at board level.",
    "SELECT max(approved_at) FROM policy_approval WHERE doc='ISP' AND approved_by_role='Board'",
    "Approved 2026-02-14 · within 12 months · TRUE"],
  "PR.AA-06":["Physical Access Standard v6","2025-11-03","Owner: Head of Physical Security",
    "Badge access to data-halls shall be reviewed quarterly and revoked within 24 hours of termination.",
    "SELECT count(*) FROM badge_grant g JOIN worker w USING(person) WHERE w.terminated_at < g.revoked_at - interval '24 hours'",
    "41 grants revoked late in the window · assertion CONTRADICTED"]};

export const ATTMAP: Record<string, string[]> = {
  "GV.SC-06":["Head of Supply Chain Risk","2026-08-04","Q3 2026 control attestation, question 14",
    "Is due diligence performed and recorded before entering a relationship with a supplier who will process our data or connect to our network?",
    "Yes — for all suppliers onboarded through Procurement.",
    "ServiceNow shows 61 supplier records created in the window with no linked due-diligence task. The signature stands; the contradiction is carried as a finding against the signatory, not as a score adjustment."],
  "PR.AA-02":["Chief Information Security Officer","2026-07-28","Q3 2026 control attestation, question 6",
    "Are identities proofed against a government or employer-of-record document before a credential is issued?",
    "Yes — for all workers onboarded via Workday.",
    "4,812 identities exist with no Workday record, so they cannot have been proofed by the process described. Carried as a finding."]};

export const ITVMAP: Record<string, string[]> = {
  "GV.OC-01":["Chief Information Security Officer","2026-08-06","30 min",
    "How does the organisation's mission shape which risks you accept and which you refuse?",
    "Recorded answer, 4 min 12 s. Summary held with the transcript.",
    "No system holds this. Nerion records who said it and when, marks the subcategory interview-carried on the face of the filing, and does not convert it into a score."]};
