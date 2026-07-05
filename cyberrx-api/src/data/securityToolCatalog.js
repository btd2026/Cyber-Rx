'use strict';

/**
 * Security Tool API Catalog
 * -------------------------
 * For every security tool that can evidence a NIST CSF control, the specific
 * JSON API call(s) used to collect that evidence: method, endpoint, auth, a
 * representative JSON response shape, and how the response is reduced to a
 * control-effectiveness signal.
 *
 * Each tool:
 *   id        : stable key referenced from the control library's `tools` arrays
 *   name      : display name
 *   vendor    : vendor / publisher
 *   category  : control domain the tool serves
 *   auth      : how the API authenticates
 *   baseUrl   : API base (templated where org-specific)
 *   docs      : vendor API docs URL
 *   apis      : one or more concrete calls —
 *       purpose : what evidence this call produces
 *       method  : HTTP method
 *       path    : endpoint (querystring included where relevant)
 *       headers : required headers (secrets shown as ${PLACEHOLDER})
 *       sample  : trimmed JSON response shape
 *       extract : how the JSON is reduced to a metric/effectiveness signal
 *       signal  : metric_inputs key produced (when applicable)
 *       controls: CSF subcategory IDs this call evidences
 *
 * Tools marked `live: true` already have a working sync connector in
 * routes/tools.js; the rest are catalog entries (spec only) ready to wire.
 */

const TOOLS = [
  // ----------------------------------------------------------- IDENTITY / ACCESS
  {
    id: 'okta', name: 'Okta', vendor: 'Okta, Inc.', category: 'Identity & Access',
    auth: 'API token header `Authorization: SSWS ${OKTA_TOKEN}` (or OAuth2 client-credentials)',
    baseUrl: 'https://${yourOrg}.okta.com', docs: 'https://developer.okta.com/docs/reference/core-okta-api/',
    live: true,
    apis: [
      {
        purpose: 'MFA enrollment coverage across active users',
        method: 'GET', path: '/api/v1/users?filter=status eq "ACTIVE"&limit=200',
        headers: { Authorization: 'SSWS ${OKTA_TOKEN}', Accept: 'application/json' },
        sample: '[{"id":"00u1a2b3","status":"ACTIVE","profile":{"login":"jane@org.com"}}]',
        extract: 'For each active user GET /api/v1/users/{id}/factors; mfa_pct = (users with ≥1 factor where status=="ACTIVE") / total active users × 100.',
        signal: 'mfa_pct', controls: ['PR.AA-01', 'PR.AA-03'],
      },
      {
        purpose: 'Per-user enrolled authentication factors',
        method: 'GET', path: '/api/v1/users/${userId}/factors',
        headers: { Authorization: 'SSWS ${OKTA_TOKEN}', Accept: 'application/json' },
        sample: '[{"factorType":"webauthn","provider":"FIDO","status":"ACTIVE"},{"factorType":"sms","status":"ACTIVE"}]',
        extract: 'Phishing-resistant coverage = users with a webauthn/FIDO ACTIVE factor / total. Feeds authentication strength.',
        signal: 'mfa_pct', controls: ['PR.AA-03'],
      },
      {
        purpose: 'Identity proofing / sign-on policy posture',
        method: 'GET', path: '/api/v1/policies?type=OKTA_SIGN_ON',
        headers: { Authorization: 'SSWS ${OKTA_TOKEN}', Accept: 'application/json' },
        sample: '[{"id":"00p...","name":"Default","status":"ACTIVE","conditions":{"network":{"connection":"ANYWHERE"}}}]',
        extract: 'Presence of MFA-required, context/risk-based sign-on rules evidences proofing/assertion controls.',
        signal: null, controls: ['PR.AA-02', 'PR.AA-04'],
      },
    ],
  },
  {
    id: 'entra_id', name: 'Microsoft Entra ID', vendor: 'Microsoft', category: 'Identity & Access',
    auth: 'OAuth2 client-credentials (Microsoft Graph); `Authorization: Bearer ${GRAPH_TOKEN}`',
    baseUrl: 'https://graph.microsoft.com/v1.0', docs: 'https://learn.microsoft.com/graph/api/overview',
    apis: [
      {
        purpose: 'MFA registration coverage',
        method: 'GET', path: '/reports/authenticationMethods/userRegistrationDetails',
        headers: { Authorization: 'Bearer ${GRAPH_TOKEN}' },
        sample: '{"value":[{"userPrincipalName":"jane@org.com","isMfaRegistered":true,"isPasswordlessCapable":false}]}',
        extract: 'mfa_pct = count(isMfaRegistered==true) / total × 100.',
        signal: 'mfa_pct', controls: ['PR.AA-01', 'PR.AA-03'],
      },
      {
        purpose: 'Conditional Access (authentication enforcement)',
        method: 'GET', path: '/identity/conditionalAccess/policies',
        headers: { Authorization: 'Bearer ${GRAPH_TOKEN}' },
        sample: '{"value":[{"displayName":"Require MFA","state":"enabled","grantControls":{"builtInControls":["mfa"]}}]}',
        extract: 'Enabled CA policies requiring MFA evidence authentication & assertion protection.',
        signal: null, controls: ['PR.AA-03', 'PR.AA-04'],
      },
      {
        purpose: 'Privileged role assignments (least privilege / PIM)',
        method: 'GET', path: '/roleManagement/directory/roleAssignments?$expand=principal',
        headers: { Authorization: 'Bearer ${GRAPH_TOKEN}' },
        sample: '{"value":[{"roleDefinitionId":"62e90394-...","principal":{"userPrincipalName":"admin@org.com"}}]}',
        extract: 'Standing vs eligible (PIM) privileged assignments → least-privilege coverage.',
        signal: 'pam_pct', controls: ['PR.AA-05'],
      },
    ],
  },
  {
    id: 'cyberark', name: 'CyberArk', vendor: 'CyberArk', category: 'Privileged Access (PAM)',
    auth: 'CyberArk auth token via `POST /PasswordVault/API/auth/Cyberark/Logon`; pass token in `Authorization` header',
    baseUrl: 'https://${pvwa}/PasswordVault', docs: 'https://docs.cyberark.com/pam-self-hosted/latest/en/content/webservices/implementing-privileged-account-security-web-services-.htm',
    live: true,
    apis: [
      {
        purpose: 'Vaulted privileged account coverage (PAM)',
        method: 'GET', path: '/API/Accounts?limit=1000',
        headers: { Authorization: '${CYBERARK_TOKEN}' },
        sample: '{"value":[{"id":"24_1","userName":"svc_sql","safeName":"DBA","secretManagement":{"automaticManagementEnabled":true}}],"count":842}',
        extract: 'pam_pct = vaulted privileged accounts (count) / total known privileged accounts × 100.',
        signal: 'pam_pct', controls: ['PR.AA-05'],
      },
    ],
  },
  {
    id: 'sailpoint', name: 'SailPoint Identity Security Cloud', vendor: 'SailPoint', category: 'Identity Governance (IGA)',
    auth: 'OAuth2 client-credentials; `Authorization: Bearer ${SAILPOINT_TOKEN}`',
    baseUrl: 'https://${tenant}.api.identitynow.com', docs: 'https://developer.sailpoint.com/docs/api/',
    apis: [
      {
        purpose: 'Access certification / review campaign completion',
        method: 'GET', path: '/v3/certification-campaigns?filters=status eq "ACTIVE"',
        headers: { Authorization: 'Bearer ${SAILPOINT_TOKEN}' },
        sample: '[{"id":"2c91...","name":"Q2 Access Review","completedCertifications":120,"totalCertifications":150}]',
        extract: 'Access-review completion = completed/total certifications → entitlement review effectiveness.',
        signal: null, controls: ['PR.AA-05'],
      },
    ],
  },

  // ------------------------------------------------------------- ENDPOINT / EDR
  {
    id: 'crowdstrike', name: 'CrowdStrike Falcon', vendor: 'CrowdStrike', category: 'Endpoint Detection & Response',
    auth: 'OAuth2: `POST /oauth2/token` (client id+secret) → `Authorization: Bearer ${CS_TOKEN}`',
    baseUrl: 'https://api.crowdstrike.com', docs: 'https://falcon.crowdstrike.com/documentation',
    live: true,
    apis: [
      {
        purpose: 'EDR sensor coverage',
        method: 'GET', path: '/devices/queries/devices/v1?filter=status:"normal"&limit=5000',
        headers: { Authorization: 'Bearer ${CS_TOKEN}' },
        sample: '{"resources":["dev1","dev2"],"meta":{"pagination":{"total":4821}}}',
        extract: 'edr_pct = managed (online) devices / total known endpoints × 100.',
        signal: 'edr_pct', controls: ['DE.CM-03', 'DE.CM-09', 'PR.PS-05'],
      },
      {
        purpose: 'Containment actions (incident mitigation)',
        method: 'POST', path: '/devices/entities/devices-actions/v2?action_name=contain',
        headers: { Authorization: 'Bearer ${CS_TOKEN}', 'Content-Type': 'application/json' },
        sample: '{"ids":["dev1"]}  → {"resources":[{"id":"dev1","path":"/contain"}]}',
        extract: 'Network-contain capability and recent containment events evidence incident containment.',
        signal: null, controls: ['RS.MI-01', 'RS.MI-02'],
      },
      {
        purpose: 'Detections feed (monitoring & analysis)',
        method: 'GET', path: '/detects/queries/detects/v1?filter=status:"new"',
        headers: { Authorization: 'Bearer ${CS_TOKEN}' },
        sample: '{"resources":["ldt:abc"],"meta":{"pagination":{"total":17}}}',
        extract: 'Active detections and their handling time feed monitoring + investigation evidence.',
        signal: null, controls: ['DE.CM-09', 'RS.AN-03', 'RS.AN-07'],
      },
    ],
  },
  {
    id: 'defender_endpoint', name: 'Microsoft Defender for Endpoint', vendor: 'Microsoft', category: 'Endpoint Detection & Response',
    auth: 'OAuth2 client-credentials (api.securitycenter.microsoft.com); `Authorization: Bearer ${MDE_TOKEN}`',
    baseUrl: 'https://api.securitycenter.microsoft.com/api', docs: 'https://learn.microsoft.com/defender-endpoint/api/apis-intro',
    apis: [
      {
        purpose: 'Onboarded device coverage & health',
        method: 'GET', path: '/machines?$filter=healthStatus eq \'Active\'',
        headers: { Authorization: 'Bearer ${MDE_TOKEN}' },
        sample: '{"value":[{"id":"m1","healthStatus":"Active","onboardingStatus":"Onboarded","riskScore":"Medium"}]}',
        extract: 'edr_pct = Onboarded+Active machines / total × 100; riskScore distribution feeds monitoring.',
        signal: 'edr_pct', controls: ['DE.CM-03', 'DE.CM-09', 'PR.PS-05'],
      },
      {
        purpose: 'Isolate machine (containment)',
        method: 'POST', path: '/machines/${machineId}/isolate',
        headers: { Authorization: 'Bearer ${MDE_TOKEN}', 'Content-Type': 'application/json' },
        sample: '{"Comment":"IR","IsolationType":"Full"} → {"id":"action-id","type":"Isolate","status":"Pending"}',
        extract: 'Isolation capability and recent isolate actions evidence containment/eradication.',
        signal: null, controls: ['RS.MI-01', 'RS.MI-02'],
      },
    ],
  },

  // -------------------------------------------------- VULNERABILITY MANAGEMENT
  {
    id: 'tenable', name: 'Tenable.io / Nessus', vendor: 'Tenable', category: 'Vulnerability Management',
    auth: 'Header `X-ApiKeys: accessKey=${TENABLE_ACCESS};secretKey=${TENABLE_SECRET}`',
    baseUrl: 'https://cloud.tenable.com', docs: 'https://developer.tenable.com/reference',
    live: true,
    apis: [
      {
        purpose: 'Open vulnerabilities by severity (SLA & patch posture)',
        method: 'GET', path: '/workbenches/vulnerabilities?date_range=30',
        headers: { 'X-ApiKeys': 'accessKey=${TENABLE_ACCESS};secretKey=${TENABLE_SECRET}' },
        sample: '{"vulnerabilities":[{"plugin_id":19506,"severity":4,"count":12,"vuln_publication_date":"2025-01-10"}]}',
        extract: 'vuln_sla_pct = vulns remediated within SLA / total; patch_pct derived from assets without criticals.',
        signal: 'vuln_sla_pct', controls: ['ID.RA-01', 'ID.RA-05', 'PR.PS-02'],
      },
      {
        purpose: 'Asset inventory (scanned assets)',
        method: 'GET', path: '/workbenches/assets',
        headers: { 'X-ApiKeys': 'accessKey=${TENABLE_ACCESS};secretKey=${TENABLE_SECRET}' },
        sample: '{"assets":[{"id":"a1","fqdn":["host.org.com"],"operating_system":["Windows"],"last_seen":"2026-06-10"}],"total":3120}',
        extract: 'Scanned-asset list feeds hardware/software inventory completeness.',
        signal: null, controls: ['ID.AM-01', 'ID.AM-02', 'ID.AM-08'],
      },
    ],
  },
  {
    id: 'qualys', name: 'Qualys VMDR', vendor: 'Qualys', category: 'Vulnerability Management',
    auth: 'HTTP Basic `Authorization: Basic base64(${USER}:${PASS})` + header `X-Requested-With`',
    baseUrl: 'https://qualysapi.${pod}.apps.qualys.com', docs: 'https://docs.qualys.com/en/vm/api/',
    apis: [
      {
        purpose: 'Host vulnerability detections (patch/SLA)',
        method: 'GET', path: '/api/2.0/fo/asset/host/vm/detection/?action=list&severities=4-5',
        headers: { Authorization: 'Basic ${QUALYS_B64}', 'X-Requested-With': 'Nerion' },
        sample: '<HOST_LIST><HOST><DETECTION><QID>105...</QID><SEVERITY>5</SEVERITY><STATUS>Active</STATUS></DETECTION></HOST></HOST_LIST>',
        extract: 'Active high/critical detections vs fixed → patch_pct / vuln_sla_pct (XML response).',
        signal: 'vuln_sla_pct', controls: ['ID.RA-01', 'PR.PS-02', 'PR.PS-01'],
      },
    ],
  },
  {
    id: 'rapid7', name: 'Rapid7 InsightVM', vendor: 'Rapid7', category: 'Vulnerability Management',
    auth: 'API key header `X-Api-Key: ${R7_KEY}` (InsightVM Cloud) or HTTP Basic (console)',
    baseUrl: 'https://${region}.api.insight.rapid7.com/vm/v4/integration', docs: 'https://docs.rapid7.com/insightvm/api/',
    apis: [
      {
        purpose: 'Assets with remediation SLA status',
        method: 'POST', path: '/assets/search',
        headers: { 'X-Api-Key': '${R7_KEY}', 'Content-Type': 'application/json' },
        sample: '{"data":[{"id":1,"vulnerabilities":{"critical":3,"severe":10},"riskScore":18842}],"metadata":{"totalResources":2900}}',
        extract: 'Aggregate critical/severe per asset → patch_pct, vuln_sla_pct, risk prioritization.',
        signal: 'vuln_sla_pct', controls: ['ID.RA-01', 'ID.RA-05', 'PR.PS-02'],
      },
    ],
  },

  // ------------------------------------------------------------ SIEM / DETECTION
  {
    id: 'splunk', name: 'Splunk Enterprise Security', vendor: 'Splunk (Cisco)', category: 'SIEM / Log Monitoring',
    auth: 'Bearer token `Authorization: Bearer ${SPLUNK_TOKEN}` (or session key)',
    baseUrl: 'https://${splunk}:8089', docs: 'https://docs.splunk.com/Documentation/Splunk/latest/RESTREF/RESTprolog',
    live: true,
    apis: [
      {
        purpose: 'Index retention (log availability days)',
        method: 'GET', path: '/services/data/indexes?output_mode=json',
        headers: { Authorization: 'Bearer ${SPLUNK_TOKEN}' },
        sample: '{"entry":[{"name":"main","content":{"frozenTimePeriodInSecs":7776000,"currentDBSizeMB":120000}}]}',
        extract: 'siem_days = max(frozenTimePeriodInSecs)/86400 across security indexes.',
        signal: 'siem_days', controls: ['PR.PS-04', 'DE.CM-01'],
      },
      {
        purpose: 'Notable-event volume & dwell (analysis)',
        method: 'POST', path: '/services/search/jobs?output_mode=json',
        headers: { Authorization: 'Bearer ${SPLUNK_TOKEN}', 'Content-Type': 'application/x-www-form-urlencoded' },
        sample: 'search=`notable` | stats count avg(dwell_time) → {"results":[{"count":"42","avg(dwell_time)":"3.1"}]}',
        extract: 'Notable counts + mean dwell time → mttd_hrs, correlation/monitoring evidence.',
        signal: 'mttd_hrs', controls: ['DE.AE-02', 'DE.AE-03', 'DE.AE-06'],
      },
    ],
  },
  {
    id: 'sentinel', name: 'Microsoft Sentinel', vendor: 'Microsoft', category: 'SIEM / SOAR',
    auth: 'OAuth2 (management.azure.com); `Authorization: Bearer ${AZ_TOKEN}`',
    baseUrl: 'https://management.azure.com', docs: 'https://learn.microsoft.com/rest/api/securityinsights/',
    apis: [
      {
        purpose: 'Incidents (triage, categorization, MTTR)',
        method: 'GET', path: '/subscriptions/${sub}/resourceGroups/${rg}/providers/Microsoft.OperationalInsights/workspaces/${ws}/providers/Microsoft.SecurityInsights/incidents?api-version=2023-11-01',
        headers: { Authorization: 'Bearer ${AZ_TOKEN}' },
        sample: '{"value":[{"properties":{"severity":"High","status":"Active","createdTimeUtc":"2026-06-10T...","classification":null}}]}',
        extract: 'Incident lifecycle timestamps → mttr_hrs; severity/status → triage & categorization evidence.',
        signal: 'mttr_hrs', controls: ['RS.MA-02', 'RS.MA-03', 'DE.AE-02', 'DE.AE-08'],
      },
    ],
  },

  // ----------------------------------------------------- CLOUD SECURITY POSTURE
  {
    id: 'prisma_cloud', name: 'Palo Alto Prisma Cloud', vendor: 'Palo Alto Networks', category: 'Cloud Security Posture (CNAPP)',
    auth: 'POST `/login` with `{"username":${ACCESS_KEY},"password":${SECRET_KEY}}` → JWT in `x-redlock-auth` header',
    baseUrl: 'https://api.prismacloud.io', docs: 'https://pan.dev/prisma-cloud/api/cspm/',
    apis: [
      {
        purpose: 'Authenticate (obtain session JWT)',
        method: 'POST', path: '/login',
        headers: { 'Content-Type': 'application/json' },
        sample: '{"username":"${ACCESS_KEY}","password":"${SECRET_KEY}"} → {"token":"eyJ...","message":"login_successful"}',
        extract: 'JWT returned in `token`; pass as `x-redlock-auth` on subsequent calls.',
        signal: null, controls: [],
      },
      {
        purpose: 'Config compliance posture (misconfigurations)',
        method: 'GET', path: '/v2/policy?policy.type=config&policy.enabled=true',
        headers: { 'x-redlock-auth': '${PRISMA_JWT}', Accept: 'application/json' },
        sample: '[{"policyId":"abc","name":"S3 bucket public","severity":"high","complianceMetadata":[{"standardName":"NIST CSF"}]}]',
        extract: 'Enabled config policies + open alerts → configuration-management / data-at-rest posture.',
        signal: null, controls: ['PR.PS-01', 'PR.DS-01', 'PR.IR-04'],
      },
      {
        purpose: 'Open alerts by policy (misconfig rate)',
        method: 'POST', path: '/alert/v1/aggregate',
        headers: { 'x-redlock-auth': '${PRISMA_JWT}', 'Content-Type': 'application/json' },
        sample: '{"groupBy":["policy.severity"],"timeRange":{"type":"to_now","value":"epoch"}} → {"aggregates":[{"groupName":"high","count":37}]}',
        extract: 'Open high/critical alerts / total resources → cloud misconfiguration rate, resilience signals.',
        signal: null, controls: ['PR.PS-01', 'PR.IR-03', 'PR.IR-04', 'DE.CM-09'],
      },
      {
        purpose: 'Network exposure / data-flow (authorized comms)',
        method: 'GET', path: '/v1/resource/network',
        headers: { 'x-redlock-auth': '${PRISMA_JWT}', Accept: 'application/json' },
        sample: '{"resources":[{"rrn":"...","exposure":"internet","service":"443"}]}',
        extract: 'Internet-exposed resources & flows → network protection / authorized-comms representation.',
        signal: null, controls: ['ID.AM-03', 'PR.IR-01', 'PR.DS-02'],
      },
    ],
  },
  {
    id: 'wiz', name: 'Wiz', vendor: 'Wiz', category: 'Cloud Security Posture (CNAPP)',
    auth: 'OAuth2 client-credentials (auth.app.wiz.io) → `Authorization: Bearer ${WIZ_TOKEN}`; GraphQL',
    baseUrl: 'https://api.${region}.app.wiz.io/graphql', docs: 'https://win.wiz.io/reference',
    apis: [
      {
        purpose: 'Cloud configuration findings (GraphQL)',
        method: 'POST', path: '/graphql',
        headers: { Authorization: 'Bearer ${WIZ_TOKEN}', 'Content-Type': 'application/json' },
        sample: 'query { configurationFindings(filterBy:{severity:[CRITICAL,HIGH]}) { nodes { id severity rule { name } } } }',
        extract: 'Critical/high config findings + toxic combinations → misconfig posture, asset inventory, monitoring.',
        signal: null, controls: ['ID.AM-02', 'PR.PS-01', 'DE.CM-09', 'ID.RA-01'],
      },
    ],
  },
  {
    id: 'defender_cloud', name: 'Microsoft Defender for Cloud', vendor: 'Microsoft', category: 'Cloud Security Posture',
    auth: 'OAuth2 (management.azure.com); `Authorization: Bearer ${AZ_TOKEN}`',
    baseUrl: 'https://management.azure.com', docs: 'https://learn.microsoft.com/rest/api/defenderforcloud/',
    apis: [
      {
        purpose: 'Secure Score (config posture)',
        method: 'GET', path: '/subscriptions/${sub}/providers/Microsoft.Security/secureScores?api-version=2020-01-01',
        headers: { Authorization: 'Bearer ${AZ_TOKEN}' },
        sample: '{"value":[{"properties":{"score":{"current":34,"max":58,"percentage":0.586}}}]}',
        extract: 'Secure Score percentage → configuration-management posture (0–100).',
        signal: null, controls: ['PR.PS-01', 'PR.DS-01'],
      },
    ],
  },
  {
    id: 'aws_securityhub', name: 'AWS Security Hub', vendor: 'Amazon Web Services', category: 'Cloud Security Posture',
    auth: 'AWS SigV4 (IAM access key/secret or role); SDK or signed REST',
    baseUrl: 'https://securityhub.${region}.amazonaws.com', docs: 'https://docs.aws.amazon.com/securityhub/1.0/APIReference/',
    apis: [
      {
        purpose: 'Findings by compliance status',
        method: 'POST', path: '/findings',
        headers: { 'X-Amz-Target': 'securityhub.GetFindings', Authorization: 'AWS4-HMAC-SHA256 ...' },
        sample: '{"Findings":[{"Severity":{"Label":"HIGH"},"Compliance":{"Status":"FAILED"},"GeneratorId":"aws-foundational"}]}',
        extract: 'FAILED vs PASSED control checks → config posture, data protection, logging coverage.',
        signal: null, controls: ['PR.PS-01', 'PR.DS-01', 'PR.PS-04'],
      },
    ],
  },

  // ---------------------------------------------------------- DATA PROTECTION
  {
    id: 'purview', name: 'Microsoft Purview', vendor: 'Microsoft', category: 'Data Protection / DLP',
    auth: 'OAuth2 (Microsoft Graph security/compliance); `Authorization: Bearer ${GRAPH_TOKEN}`',
    baseUrl: 'https://graph.microsoft.com/v1.0', docs: 'https://learn.microsoft.com/graph/api/resources/security-api-overview',
    apis: [
      {
        purpose: 'DLP / information-protection labeling coverage',
        method: 'GET', path: '/security/informationProtection/sensitivityLabels',
        headers: { Authorization: 'Bearer ${GRAPH_TOKEN}' },
        sample: '{"value":[{"id":"lbl1","name":"PHI-Confidential","isActive":true}]}',
        extract: 'Active labels + DLP policy matches → data classification & at-rest protection evidence.',
        signal: null, controls: ['ID.AM-07', 'PR.DS-01'],
      },
    ],
  },
  {
    id: 'bigid', name: 'BigID', vendor: 'BigID', category: 'Data Discovery & Inventory',
    auth: 'Token header `Authorization: ${BIGID_TOKEN}` (from /api/v1/sessions)',
    baseUrl: 'https://${tenant}.bigid.cloud/api/v1', docs: 'https://developer.bigid.com/',
    apis: [
      {
        purpose: 'Sensitive-data inventory by type',
        method: 'GET', path: '/data-catalog/objects?filter=containsPI=true',
        headers: { Authorization: '${BIGID_TOKEN}' },
        sample: '{"results":[{"fullyQualifiedName":"db.patients","attribute":["SSN","MRN"],"total":48211}]}',
        extract: 'Catalog of PHI/PII objects → data inventory & metadata completeness.',
        signal: 'phi_records', controls: ['ID.AM-07'],
      },
    ],
  },

  // -------------------------------------------------------- NETWORK / FIREWALL
  {
    id: 'panorama', name: 'Palo Alto NGFW / Panorama', vendor: 'Palo Alto Networks', category: 'Network Security',
    auth: 'API key `?key=${PAN_KEY}` (from /api/?type=keygen) on the XML API',
    baseUrl: 'https://${panorama}/api', docs: 'https://docs.paloaltonetworks.com/pan-os/latest/pan-os-panorama-api',
    apis: [
      {
        purpose: 'Security policy & threat-prevention posture',
        method: 'GET', path: "/?type=op&cmd=<show><system><info></info></system></show>&key=${PAN_KEY}",
        headers: {},
        sample: '<response status="success"><result><system><threat-version>...</threat-version></system></result></response>',
        extract: 'Threat-prevention/IPS enabled + policy hit-counts → network protection & monitoring (XML).',
        signal: null, controls: ['PR.IR-01', 'PR.DS-02', 'DE.CM-01'],
      },
    ],
  },
  {
    id: 'zscaler', name: 'Zscaler Internet Access', vendor: 'Zscaler', category: 'Secure Web Gateway / ZTNA',
    auth: 'API key + obfuscated timestamp → session cookie (ZIA API)',
    baseUrl: 'https://zsapi.${cloud}.net/api/v1', docs: 'https://help.zscaler.com/zia/api',
    apis: [
      {
        purpose: 'Web/SSL inspection & DLP policy posture',
        method: 'GET', path: '/webDlpRules',
        headers: { 'Content-Type': 'application/json', cookie: 'JSESSIONID=${ZIA_SESSION}' },
        sample: '[{"id":1,"name":"Block PHI Upload","action":"BLOCK","state":"ENABLED"}]',
        extract: 'Enabled DLP/SSL-inspection rules → data-in-transit protection & egress monitoring.',
        signal: null, controls: ['PR.DS-02', 'PR.IR-01', 'DE.CM-06'],
      },
    ],
  },

  // -------------------------------------------------- AWARENESS / HR / TRAINING
  {
    id: 'knowbe4', name: 'KnowBe4', vendor: 'KnowBe4', category: 'Security Awareness',
    auth: 'Bearer token `Authorization: Bearer ${KB4_TOKEN}`',
    baseUrl: 'https://us.api.knowbe4.com/v1', docs: 'https://developer.knowbe4.com/',
    live: true,
    apis: [
      {
        purpose: 'Training completion & phishing click rate',
        method: 'GET', path: '/training/enrollments?status=completed',
        headers: { Authorization: 'Bearer ${KB4_TOKEN}' },
        sample: '[{"user":{"email":"jane@org.com"},"status":"Passed","completion_date":"2026-05-01"}]',
        extract: 'training_pct = passed enrollments / assigned × 100; phishing campaigns give phishing_pct (clicks/recipients).',
        signal: 'training_pct', controls: ['PR.AT-01', 'PR.AT-02'],
      },
    ],
  },
  {
    id: 'workday', name: 'Workday', vendor: 'Workday', category: 'HR / Workforce',
    auth: 'OAuth2 (Workday REST/RaaS); `Authorization: Bearer ${WD_TOKEN}`',
    baseUrl: 'https://${tenant}.workday.com/ccx/api/v1', docs: 'https://community.workday.com/sites/default/files/file-hosting/restapi/',
    live: true,
    apis: [
      {
        purpose: 'Training completion & HR security practices',
        method: 'GET', path: '/${tenant}/learningEnrollments?completionStatus=Completed',
        headers: { Authorization: 'Bearer ${WD_TOKEN}' },
        sample: '{"data":[{"worker":"21001","course":"Security Awareness","status":"Completed"}],"total":1180}',
        extract: 'Completion → training_pct; background-check / onboarding fields → HR security practices.',
        signal: 'training_pct', controls: ['PR.AT-01', 'PR.AT-02', 'GV.RR-04'],
      },
    ],
  },

  // ----------------------------------------------------- ITSM / INCIDENT / SOAR
  {
    id: 'servicenow', name: 'ServiceNow (SecOps/ITSM)', vendor: 'ServiceNow', category: 'ITSM / Incident Management',
    auth: 'HTTP Basic or OAuth2; `Authorization: Basic base64(${USER}:${PASS})`',
    baseUrl: 'https://${instance}.service-now.com/api/now', docs: 'https://developer.servicenow.com/dev.do#!/reference/api/',
    live: true,
    apis: [
      {
        purpose: 'Security incidents (MTTR, triage, categorization)',
        method: 'GET', path: '/table/sn_si_incident?sysparm_query=opened_atONLast30days&sysparm_fields=number,priority,opened_at,resolved_at,category',
        headers: { Authorization: 'Basic ${SNOW_B64}', Accept: 'application/json' },
        sample: '{"result":[{"number":"SIR0010","priority":"1","opened_at":"2026-06-01 09:00","resolved_at":"2026-06-01 13:00","category":"malware"}]}',
        extract: 'mttr_hrs = mean(resolved_at − opened_at); priority/category → triage & categorization evidence.',
        signal: 'mttr_hrs', controls: ['RS.MA-02', 'RS.MA-03', 'DE.AE-06', 'RS.AN-06'],
      },
      {
        purpose: 'Change & exception records (risk tracking)',
        method: 'GET', path: '/table/change_request?sysparm_query=active=true',
        headers: { Authorization: 'Basic ${SNOW_B64}', Accept: 'application/json' },
        sample: '{"result":[{"number":"CHG0030","risk":"moderate","approval":"approved"}]}',
        extract: 'Change/exception flow with risk + approval → change-management control evidence.',
        signal: null, controls: ['ID.RA-06', 'ID.RA-07'],
      },
    ],
  },
  {
    id: 'pagerduty', name: 'PagerDuty', vendor: 'PagerDuty', category: 'Incident Escalation / On-call',
    auth: 'Token header `Authorization: Token token=${PD_TOKEN}`',
    baseUrl: 'https://api.pagerduty.com', docs: 'https://developer.pagerduty.com/api-reference/',
    apis: [
      {
        purpose: 'Incident escalation & acknowledgement timing',
        method: 'GET', path: '/incidents?statuses[]=triggered&statuses[]=acknowledged&since=2026-05-01',
        headers: { Authorization: 'Token token=${PD_TOKEN}', Accept: 'application/vnd.pagerduty+json;version=2' },
        sample: '{"incidents":[{"id":"PT4KHLK","urgency":"high","created_at":"...","last_status_change_at":"..."}]}',
        extract: 'Acknowledge/escalation timestamps → escalation effectiveness, notification timeliness.',
        signal: null, controls: ['RS.MA-04', 'RS.CO-02'],
      },
    ],
  },

  // --------------------------------------------------------- BACKUP / RECOVERY
  {
    id: 'rubrik', name: 'Rubrik Security Cloud', vendor: 'Rubrik', category: 'Backup & Recovery',
    auth: 'API token `Authorization: Bearer ${RBK_TOKEN}`; GraphQL',
    baseUrl: 'https://${account}.my.rubrik.com/api/graphql', docs: 'https://www.rubrik.com/developers',
    apis: [
      {
        purpose: 'Backup compliance & restore-test status',
        method: 'POST', path: '/api/graphql',
        headers: { Authorization: 'Bearer ${RBK_TOKEN}', 'Content-Type': 'application/json' },
        sample: 'query { slaComplianceSummary { inComplianceCount outOfComplianceCount } }',
        extract: 'In-compliance objects / total → backup coverage; recovery validations → restore-integrity evidence.',
        signal: null, controls: ['PR.DS-11', 'RC.RP-03', 'RC.RP-05'],
      },
    ],
  },
  {
    id: 'cohesity', name: 'Cohesity DataProtect', vendor: 'Cohesity', category: 'Backup & Recovery',
    auth: 'API key `Authorization: ${COH_TOKEN}` (from /irisservices/api/v1/public/accessTokens)',
    baseUrl: 'https://${cluster}/irisservices/api/v1', docs: 'https://developer.cohesity.com/',
    apis: [
      {
        purpose: 'Protection-job success & SLA',
        method: 'GET', path: '/public/protectionRuns?numRuns=100',
        headers: { Authorization: 'Bearer ${COH_TOKEN}' },
        sample: '[{"jobName":"PHI-DB","backupRun":{"status":"kSuccess","slaViolated":false}}]',
        extract: 'Successful, in-SLA protection runs / total → backup health & restore readiness.',
        signal: null, controls: ['PR.DS-11', 'RC.RP-03'],
      },
    ],
  },
  {
    id: 'veeam', name: 'Veeam Backup & Replication', vendor: 'Veeam', category: 'Backup & Recovery',
    auth: 'OAuth2 password grant → `Authorization: Bearer ${VEEAM_TOKEN}` (REST v1)',
    baseUrl: 'https://${server}:9419/api/v1', docs: 'https://helpcenter.veeam.com/docs/backup/rest/',
    apis: [
      {
        purpose: 'Backup-session results & restore points',
        method: 'GET', path: '/sessions?typeFilter=BackupJob&limit=200',
        headers: { Authorization: 'Bearer ${VEEAM_TOKEN}', 'x-api-version': '1.1-rev0' },
        sample: '{"data":[{"name":"PHI Backup","result":"Success","endTime":"2026-06-11T02:00:00Z"}]}',
        extract: 'Success rate + restore-point recency → backup coverage and restore verification.',
        signal: null, controls: ['PR.DS-11', 'RC.RP-03', 'RC.RP-05'],
      },
    ],
  },
  {
    id: 'aws_backup', name: 'AWS Backup', vendor: 'Amazon Web Services', category: 'Backup & Recovery',
    auth: 'AWS SigV4 (IAM)',
    baseUrl: 'https://backup.${region}.amazonaws.com', docs: 'https://docs.aws.amazon.com/aws-backup/latest/devguide/api-reference.html',
    apis: [
      {
        purpose: 'Backup-job status & compliance',
        method: 'GET', path: '/backup-jobs?State=COMPLETED',
        headers: { Authorization: 'AWS4-HMAC-SHA256 ...' },
        sample: '{"BackupJobs":[{"State":"COMPLETED","ResourceType":"RDS","BackupSizeInBytes":1048576}]}',
        extract: 'Completed vs failed jobs + restore-testing → backup coverage and resilience.',
        signal: null, controls: ['PR.DS-11', 'RC.RP-03', 'PR.IR-03'],
      },
    ],
  },

  // ---------------------------------------------------- VENDOR / THIRD-PARTY RISK
  {
    id: 'bitsight', name: 'BitSight', vendor: 'BitSight', category: 'Third-Party Risk Ratings',
    auth: 'HTTP Basic with API token as username `Authorization: Basic base64(${BITSIGHT_TOKEN}:)`',
    baseUrl: 'https://api.bitsighttech.com', docs: 'https://help.bitsighttech.com/hc/en-us/categories/360002423754',
    live: true,
    apis: [
      {
        purpose: 'Continuous supplier security ratings',
        method: 'GET', path: '/ratings/v2/companies?fields=name,rating,rating_date',
        headers: { Authorization: 'Basic ${BITSIGHT_B64}' },
        sample: '{"results":[{"name":"Vendor A","rating":740,"rating_date":"2026-06-01"}]}',
        extract: 'Per-supplier rating (250–900) + trend → C-SCRM monitoring & criticality prioritization.',
        signal: 'vendor', controls: ['GV.SC-04', 'GV.SC-06', 'GV.SC-07', 'GV.SC-09', 'ID.RA-10', 'DE.CM-06'],
      },
    ],
  },
  {
    id: 'securityscorecard', name: 'SecurityScorecard', vendor: 'SecurityScorecard', category: 'Third-Party Risk Ratings',
    auth: 'Token header `Authorization: Token ${SSC_TOKEN}`',
    baseUrl: 'https://api.securityscorecard.io', docs: 'https://securityscorecard.readme.io/reference',
    live: true,
    apis: [
      {
        purpose: 'Supplier scorecards (A–F + factors)',
        method: 'GET', path: '/companies/${domain}/factors',
        headers: { Authorization: 'Token ${SSC_TOKEN}' },
        sample: '{"entries":[{"name":"network_security","grade":"B","score":82}]}',
        extract: 'Letter grade + factor scores → supplier risk assessment & ongoing monitoring.',
        signal: 'vendor', controls: ['GV.SC-04', 'GV.SC-07', 'GV.SC-09', 'ID.RA-10'],
      },
    ],
  },
  {
    id: 'recorded_future', name: 'Recorded Future', vendor: 'Recorded Future', category: 'Threat Intelligence',
    auth: 'API token header `X-RFToken: ${RF_TOKEN}`',
    baseUrl: 'https://api.recordedfuture.com/v2', docs: 'https://api.recordedfuture.com/v2/',
    apis: [
      {
        purpose: 'Threat-intel risk lists & alerts',
        method: 'GET', path: '/alert/search?triggered=-7d',
        headers: { 'X-RFToken': '${RF_TOKEN}' },
        sample: '{"data":{"results":[{"id":"abc","title":"Mentions of org","triggered":"2026-06-09"}]}}',
        extract: 'Received intel/alerts → threat-intel ingestion & enrichment evidence.',
        signal: null, controls: ['ID.RA-02', 'ID.RA-03', 'DE.AE-07'],
      },
    ],
  },

  // ------------------------------------------------- ASSET / CMDB / DISCOVERY
  {
    id: 'axonius', name: 'Axonius', vendor: 'Axonius', category: 'Asset Inventory (CAASM)',
    auth: 'API key/secret headers `api-key: ${AX_KEY}` `api-secret: ${AX_SECRET}`',
    baseUrl: 'https://${tenant}.axonius.com/api/V4.0', docs: 'https://docs.axonius.com/docs/axonius-rest-api',
    apis: [
      {
        purpose: 'Unified device & software inventory',
        method: 'POST', path: '/assets/devices',
        headers: { 'api-key': '${AX_KEY}', 'api-secret': '${AX_SECRET}', 'Content-Type': 'application/json' },
        sample: '{"data":[{"id":"d1","attributes":{"hostname":"host1","os":"Windows","agents":["crowdstrike"]}}],"meta":{"page":{"totalResources":5400}}}',
        extract: 'Correlated device/software list + coverage gaps (e.g. missing EDR) → inventory completeness.',
        signal: 'endpoints', controls: ['ID.AM-01', 'ID.AM-02', 'ID.AM-05', 'PR.PS-03'],
      },
    ],
  },
  {
    id: 'servicenow_cmdb', name: 'ServiceNow CMDB', vendor: 'ServiceNow', category: 'Asset Inventory (CMDB)',
    auth: 'HTTP Basic or OAuth2; `Authorization: Basic base64(${USER}:${PASS})`',
    baseUrl: 'https://${instance}.service-now.com/api/now', docs: 'https://developer.servicenow.com/dev.do#!/reference/api/',
    apis: [
      {
        purpose: 'Configuration items (asset inventory & lifecycle)',
        method: 'GET', path: '/table/cmdb_ci?sysparm_fields=name,sys_class_name,install_status,u_owner',
        headers: { Authorization: 'Basic ${SNOW_B64}', Accept: 'application/json' },
        sample: '{"result":[{"name":"host1","sys_class_name":"cmdb_ci_server","install_status":"1"}]}',
        extract: 'CI inventory + install_status → hardware/software inventory and lifecycle management.',
        signal: null, controls: ['ID.AM-01', 'ID.AM-02', 'ID.AM-04', 'ID.AM-08'],
      },
    ],
  },

  // ---------------------------------------------------- SECURE SDLC / APPSEC
  {
    id: 'snyk', name: 'Snyk', vendor: 'Snyk', category: 'Application Security (SCA/SAST)',
    auth: 'Token header `Authorization: token ${SNYK_TOKEN}`',
    baseUrl: 'https://api.snyk.io/rest', docs: 'https://docs.snyk.io/snyk-api',
    apis: [
      {
        purpose: 'Open code/dependency issues per project',
        method: 'GET', path: '/orgs/${orgId}/issues?version=2024-10-15&status=open',
        headers: { Authorization: 'token ${SNYK_TOKEN}', Accept: 'application/vnd.api+json' },
        sample: '{"data":[{"attributes":{"effective_severity_level":"high","type":"package_vulnerability"}}]}',
        extract: 'Open high/critical issues + fix rate → secure-SDLC effectiveness (SAST/SCA gates).',
        signal: null, controls: ['PR.PS-06'],
      },
    ],
  },
  {
    id: 'gitguardian', name: 'GitGuardian', vendor: 'GitGuardian', category: 'Secrets Detection',
    auth: 'Token header `Authorization: Token ${GG_TOKEN}`',
    baseUrl: 'https://api.gitguardian.com/v1', docs: 'https://api.gitguardian.com/docs',
    apis: [
      {
        purpose: 'Exposed-secret incidents',
        method: 'GET', path: '/incidents/secrets?status=triggered',
        headers: { Authorization: 'Token ${GG_TOKEN}' },
        sample: '[{"id":1,"detector":{"name":"AWS Key"},"status":"IGNORED","severity":"high"}]',
        extract: 'Open vs resolved secret incidents → secret-leak prevention in the SDLC.',
        signal: null, controls: ['PR.PS-06'],
      },
    ],
  },

  // ------------------------------------------------ GRC / COMPLIANCE AUTOMATION
  {
    id: 'vanta', name: 'Vanta', vendor: 'Vanta', category: 'GRC / Compliance Automation',
    auth: 'OAuth2 client-credentials; `Authorization: Bearer ${VANTA_TOKEN}`',
    baseUrl: 'https://api.vanta.com/v1', docs: 'https://developer.vanta.com/',
    apis: [
      {
        purpose: 'Control test status & policy acknowledgement',
        method: 'GET', path: '/tests?pageSize=100',
        headers: { Authorization: 'Bearer ${VANTA_TOKEN}' },
        sample: '{"results":{"data":[{"name":"MFA enforced","outcome":"PASS","latestFlipTime":"2026-06-01"}]}}',
        extract: 'Automated control tests PASS/FAIL + policy acceptance → policy, oversight, obligations evidence.',
        signal: null, controls: ['GV.PO-01', 'GV.PO-02', 'GV.OV-03', 'GV.OC-03', 'GV.RM-06', 'ID.IM-01'],
      },
    ],
  },
  {
    id: 'drata', name: 'Drata', vendor: 'Drata', category: 'GRC / Compliance Automation',
    auth: 'API key header `Authorization: Bearer ${DRATA_TOKEN}`',
    baseUrl: 'https://public-api.drata.com/public', docs: 'https://developers.drata.com/',
    apis: [
      {
        purpose: 'Control monitoring & evidence freshness',
        method: 'GET', path: '/controls?limit=100',
        headers: { Authorization: 'Bearer ${DRATA_TOKEN}' },
        sample: '{"data":[{"name":"Access Reviews","isMonitored":true,"hasEvidence":true,"isReady":true}]}',
        extract: 'Monitored/ready controls with fresh evidence → policy, oversight, obligations, improvement.',
        signal: null, controls: ['GV.PO-01', 'GV.PO-02', 'GV.OV-03', 'GV.OC-03', 'GV.SC-03', 'ID.IM-01'],
      },
    ],
  },
];

module.exports = { TOOLS };
