# Security Tool Integration Research for Nerion

**Comprehensive research on data integration requirements for security tools shown in the Nerion platform**

**Last Updated:** 2026-05-31
**Purpose:** Reference document for understanding what integration methods each security tool supports

---

## Table of Contents

1. [Identity & Access Management (IAM)](#identity--access-management-iam)
2. [Endpoint Protection & EDR](#endpoint-protection--edr)
3. [SIEM & Threat Detection](#siem--threat-detection)
4. [Network Security](#network-security)
5. [GRC & Compliance](#grc--compliance)
6. [ITSM & Ticketing](#itsm--ticketing)
7. [Cloud Security](#cloud-security)
8. [Email & Web Security](#email--web-security)
9. [Summary: Connection Methods by Tool]((#summary-connection-methods-by-tool)
10. [Key Recommendations]((#key-recommendations-for-cyberrx-implementation)

---

## Identity & Access Management (IAM)

### Okta
- **API:** ✅ Full REST API available
- **Authentication:** OAuth 2.0, API tokens
- **Data Export:** Users, applications, access requests, authentication events
- **Documentation:**
  - [Pull All User Data Using API](https://support.okta.com/help/s/article/How-to-pull-all-user-data-using-API)
  - [Export Applications](https://support.okta.com/help/s/article/How-to-export-all-Applications-using-Okta-API)

### SailPoint IdentityNow / IGA
- **API:** ✅ REST API available
- **Authentication:** OAuth 2.0, client credentials
- **Data Export:** Identities, certification reports, compliance data, access reviews
- **Documentation:**
  - [API to Download Reports](https://developer.sailpoint.com/discuss/t/api-to-download-reports/18934)
  - [Export Identities](https://developer.sailpoint.com/discuss/t/how-to-export-all-identity-data/15773)

### CyberArk PAM
- **API:** ✅ REST API available
- **Authentication:** API tokens, OAuth
- **Data Export:** Telemetry tracks component utilization, compliance status, license utilization
- **Documentation:**
  - [Telemetry Data Contents](https://docs.cyberark.com/privilege-cloud-standard/latest/en/content/privilege%20cloud/privcloud-telemetry-dashboard-output-file-contents.htm)

### Microsoft Entra ID (Azure AD)
- **API:** ✅ Microsoft Graph API (Azure AD Graph deprecated)
- **Authentication:** OAuth 2.0, app registrations
- **Data Export:** Users, sign-in logs, authentication methods, provisioning configuration
- **Documentation:**
  - [Microsoft Entra Exporter](https://github.com/microsoft/entraexporter)
  - [Export Users](https://www.alitajran.com/export-microsoft-entra-id-users-to-csv-powershell/)

### Ping Identity
- **API:** ✅ REST API available
- **Authentication:** OAuth 2.0, API tokens
- **Data Export:** User data, authentication events, configuration

### Saviynt
- **API:** ✅ REST API available
- **Authentication:** API tokens, OAuth
- **Data Export:** Identity lifecycle management, access governance, compliance data
- **Documentation:**
  - [API Reference](https://saviynt.com/api-reference)
  - [Integration Guide](https://cloudfoundation.com/blog/tutorial-on-saviynt-api/)

### ForgeRock
- **API:** ✅ REST API available
- **Authentication:** OAuth 2.0
- **Data Export:** Import/export configurations, journeys, managed objects
- **Documentation:**
  - [REST API Reference](https://cdn-docs.pingidentity.com/archive/pdf/idm/7.1/IDM-7.1-Rest-Api-Reference.pdf)
  - [Configuration Export](https://medium.com/@kevsuisse/configuration-management-for-forgerock-identity-cloud-part-1-a703fe6b22c7)

### BeyondTrust
- **API:** ✅ REST API available
- **Authentication:** API tokens
- **Data Export:** Privileged access sessions, credentials, compliance data
- **Documentation:**
  - [PRA API Documentation](https://docs.beyondtrust.com/pra/docs/api)
  - [EPM REST API](https://docs.beyondtrust.com/epm-ul/docs/rest-api-guide)

### HashiCorp Vault
- **API:** ✅ Full HTTP REST API
- **Authentication:** Tokens, certificates
- **Data Export:** Audit logs, secrets, policies
- **Documentation:**
  - [HTTP API Documentation](https://developer.hashicorp.com/vault/api-docs)
  - [Audit Logs](https://developer.hashicorp.com/vault/tutorials/policies/write-a-policy-using-audit-logs)

### Delinea Secret Server
- **API:** ✅ REST API available
- **Authentication:** API tokens
- **Data Export:** Secrets (CSV/XML), automatic scheduled exports, encrypted archives
- **Documentation:**
  - [Exporting Secrets](https://docs.delinea.com/online-help/secret-server/secret-operations/secret-import-and-export/exporting-secrets/index.htm)
  - [Automatic Export API](https://docs.delinea.com/online-help/secret-server/secret-operations/secret-import-and-export/automatic-secret-export-rest-api/index.htm)

---

## Endpoint Protection & EDR

### CrowdStrike Falcon
- **API:** ✅ Full REST API with OAuth 2.0
- **Authentication:** OAuth 2.0 (client ID + secret), API keys
- **Data Export:** Endpoint telemetry, detections, threat intelligence
- **Documentation:**
  - [OAuth Integration](https://docs.devo.com/space/latest/1310949409/CrowdStrike+v2+Falcon+Host+(OAuth+Based)+Automation+Integration)

### SentinelOne
- **API:** ✅ REST API (v2.1)
- **Authentication:** API tokens, service user
- **Data Export:** Deep Visibility events, detections, agent status
- **Documentation:**
  - [Deep Visibility Export Guide](https://johntuckner.me/posts/sentinelone-deep-visibility-export)
  - [Postman Collection](https://www.postman.com/api-evangelist/sentinelone/documentation/btzef0x/sentinelone)

### Microsoft Defender for Endpoint
- **API:** ✅ Microsoft Graph API / Defender API
- **Authentication:** OAuth 2.0, Azure AD app
- **Data Export:** Alerts, machines, vulnerabilities, recommendations, antivirus health
- **Documentation:**
  - [Vulnerability Assessment API](https://learn.microsoft.com/en-us/defender-endpoint/api/get-assessment-methods-properties)
  - [Antivirus Health Export](https://learn.microsoft.com/en-us/defender-endpoint/api/device-health-export-antivirus-health-report-api)

### Carbon Black
- **API:** ✅ REST API available
- **Authentication:** API tokens
- **Data Export:** Audit logs, endpoint events, detections
- **Documentation:**
  - [Audit Logs API](https://developer.carbonblack.com/reference/carbon-black-cloud/platform/latest/audit-logs/)
  - [Data Forwarder API](https://developer.carbonblack.com/reference/carbon-black-cloud/data-forwarder/api/latest/data-forwarder-api/)
  - [Export Audit Logs](https://techdocs.broadcom.com/us/en/carbon-black/cloud/carbon-black-cloud/index/cbc-user-guide-tile/GUID-9620FAB7-FE70-45DE-9CAB-590FA358721F-en/GUID-069EF252-3814-47FF-B9AE-AEDE13083061/GUID-A6703384-22B0-4681-8742-183BCB1B903E-en.html)

### Tanium
- **API:** ✅ REST API, GraphQL, API Gateway
- **Authentication:** API tokens
- **Data Export:** Asset inventory, endpoint data, scheduled exports
- **Documentation:**
  - [Asset REST API Export](https://help.tanium.com/bundle/ug_asset_cloud/page/asset/ref_export_api.html)
  - [API Gateway Guide](https://www.tanium.com/blog/getting-data-out-of-tanium-with-the-api-gateway-and-graphql/)

### Trend Micro Apex Central
- **API:** ✅ Automation API available
- **Authentication:** API registration
- **Data Export:** Security logs, detection data (CSV/XML via console)
- **Documentation:**
  - [Automation API](https://automation.trendmicro.com/apex-central/api)
  - [Querying Logs](https://docs.trendmicro.com/en-us/documentation/article/apex-central-online-help-querying-logs)

### Sophos
- **API:** ✅ Detections REST API, Central API
- **Authentication:** API tokens
- **Data Export:** Detections, telemetry, events
- **Documentation:**
  - [Sophos Community Discussion](https://community.sophos.com/intercept-x-endpoint/f/discussions/146747/formulate-url-web-link-to-detection)

### Trellix
- **API:** ✅ Historical Search API
- **Authentication:** API tokens
- **Data Export:** Endpoint telemetry, detections, historical search
- **Documentation:**
  - [Historical Search POST](https://docs.trellix.com/bundle/endsec-edrf-docs/page/UUID-69afb38a-e5d1-1c98-a7de-9ece27422429.html)
  - [Investigate Telemetry](https://docs.trellix.com/bundle/endsec-edrf-docs/page/UUID-78c98026-d9cd-3c54-6dc1-33f41be361a8.html)

---

## SIEM & Threat Detection

### Splunk SIEM
- **API:** ✅ Comprehensive REST API
- **Authentication:** Basic auth, session tokens, API tokens
- **Data Export:** Search results, logs, alerts, configuration data
- **Documentation:**
  - [Export Data Using REST API](https://help.splunk.com/en/splunk-enterprise/search/search-manual/9.3/export-search-results/export-data-using-the-splunk-rest-api)
  - [REST API Reference](https://help.splunk.com/en/splunk-cloud-platform/rest-api-reference)

### Microsoft Sentinel
- **API:** ✅ Azure Monitor / Sentinel REST APIs
- **Authentication:** OAuth 2.0 via Azure AD
- **Data Export:** Incidents, alerts, analytics rules, hunting queries
- **Documentation:**
  - [Migration: Ingest Data](https://learn.microsoft.com/en-us/azure/sentinel/migration-export-ingest)
  - [Export Incidents via API](https://www.infosupport.com/how-to-get-azure-sentinel-incidents-via-api/)

### IBM QRadar
- **API:** ✅ REST API available
- **Authentication:** API tokens
- **Data Export:** Offenses, logs, assets, rules (XML/CSV via UI, API for programmatic access)
- **Documentation:**
  - [GET /siem/offenses](https://ibmsecuritydocs.github.io/qradar_api_20.0/20.0--siem-offenses-GET.html)
  - [Exporting Offenses](https://www.ibm.com/docs/en/qradar-on-cloud?topic=actions-exporting-offenses)

### LogRhythm
- **API:** ✅ REST API available
- **Authentication:** API tokens
- **Data Export:** Log data (CSV), investigations, log sources
- **Documentation:**
  - [Export Log Data to CSV](https://docs.logrhythm.com/lrsiem/docs/export-log-data-into-a-csv-file)
  - [Export Log Sources](https://docs.logrhythm.com/lrsiem/docs/export-log-sources)
  - [PowerShell Module](https://github.com/LogRhythm-Tools/LogRhythm.Tools)

### Sumo Logic
- **API:** ✅ Cloud SIEM APIs available
- **Authentication:** Access ID, Key
- **Data Export:** Entities, insights, log mappings, data forwarding to S3
- **Documentation:**
  - [Cloud SIEM APIs](https://www.sumologic.com/help/docs/api/cloud-siem-enterprise/)
  - [Logs Data Forwarding API](https://www.sumologic.com/help/docs/api/logs-data-forwarding/)

### Securonix
- **API:** ✅ REST API available
- **Authentication:** API tokens
- **Data Export:** Alerts, incidents, UEBA data
- **Documentation:**
  - [Axonius Integration](https://docs.axonius.com/docs/securonix-snypr)
  - [REST API Categories](https://documentation.securonix.com/bundle/securonix-cloud-user-guide/page/content/rest-api-categories.htm)

### Exabeam
- **API:** ✅ Developer portal with comprehensive API
- **Authentication:** API tokens
- **Data Export:** Cases (CSV), entities, logs to GCS, threat center data
- **Documentation:**
  - [Developer Portal](https://developers.exabeam.com/exabeam)
  - [Export Incidents](https://docs.exabeam.com/en/case-manager/i56/docs/investigate-a-security-incident/export-incidents.html)
  - [Entity Analytics](https://docs.exabeam.com/en/cloud-delivered-advanced-analytics/all/user-guide/153683-entity-analytics.html)

### Chronicle (Google Security Operations)
- **API:** ✅ Ingestion API, Data Export API
- **Authentication:** Google Cloud authentication
- **Data Export:** ⚠️ **Only raw logs** (not detections) can be exported
- **Documentation:**
  - [Ingestion API](https://docs.cloud.google.com/chronicle/docs/reference/ingestion-api)
  - [Data Export API](https://docs.cloud.google.com/chronicle/docs/reference/data-export-api)
  - [BigQuery Analysis](https://medium.com/@thatsiemguy/utilizing-bigquery-to-analyze-exported-chronicle-siem-archives-f17a384b9ba9)

---

## Network Security

### Palo Alto NGFW / Panorama
- **API:** ✅ PAN-OS XML API & REST API
- **Authentication:** API keys
- **Data Export:** Configuration export, logs (threat, traffic, system), policy data
- **Documentation:**
  - [Export Files API](https://docs.paloaltonetworks.com/ngfw/api/pan-os-xml-api-request-types-and-actions/export-files-api)
  - [Retrieve Logs API](https://docs.paloaltonetworks.com/pan-os/10-1/pan-os-panorama-api/pan-os-xml-api-request-types/retrieve-logs-api)
  - [Save/Export Configurations](https://docs.paloaltonetworks.com/panorama/10-1/panorama-admin/administer-panorama/manage-panorama-and-firewall-configuration-backups/save-and-export-panorama-and-firewall-configurations)

### Cisco Firepower
- **API:** ✅ REST API available
- **Authentication:** API tokens
- **Data Export:** Configuration (ZIP), logs, policies (CSV export via API)
- **Documentation:**
  - [Configuration Import/Export](https://www.cisco.com/c/en/us/td/docs/security/firepower/ftd-api/guide/ftd-rest-api/ftd-api-import-export.html)
  - [ExportConfigFile API](https://developer.cisco.com/docs/ftd-api-reference/latest/exportconfigfile/)
  - [CSV Export Script](https://github.com/raghukul-cisco/csvExportFirepower)

### Fortinet FortiGate
- **API:** ✅ REST API available
- **Authentication:** API tokens
- **Data Export:** Logs (CSV via console/UI), cloud logging to FortiCloud
- **Documentation:**
  - [Exporting Logs (FortiEdge Cloud)](https://docs.fortinet.com/document/fortiedge-cloud/26.2.0/user-guide/458582/exporting-logs)
  - [Cloud Logging](https://docs.fortinet.com/document/fortigate/8.0.0/administration-guide/144076/configuring-cloud-logging)
  - [Logging to FortiCloud](https://docs.fortinet.com/document/fortigate/5.4.0/cookbook/189021/logging-traffic-with-fortigate-cloud)

### Check Point
- **API:** ✅ REST API, Log Exporter
- **Authentication:** API credentials
- **Data Export:** Logs (CSV/HTML via SmartConsole), configuration, rulebases
- **Documentation:**
  - [Configuring Log Exporter](https://sc1.checkpoint.com/documents/R81/WebAdminGuides/EN/CP_R81_LoggingAndMonitoring_AdminGuide/Topics-LMG/Log-Exporter-Configuration-in-SmartConsole.htm)
  - [Exporting Views/Reports](https://sc1.checkpoint.com/documents/R81/WebAdminGuides/EN/CP_R81_LoggingAndMonitoring_AdminGuide/Topics-LMG/Exporting-Views-Reports.htm)
  - [Exporting Configuration](https://support.checkpoint.com/results/sk/sk120342)

### Zscaler ZIA
- **API:** ✅ REST API for audit/event logs
- **Authentication:** API tokens, OAuth
- **Data Export:** ⚠️ **No direct API for Web/Firewall logs** - must use NSS (Nanolog Streaming Service) or LSS (Log Streaming Service)
- **Documentation:**
  - [Audit/Event Logs API](https://help.zscaler.com/legacy-apis/downloading-audit-logs-event-logs-using-api)
  - [NSS for Firewall Logs](https://help.zscaler.com/zia/documentation-knowledgebase/analytics/dashboards-reports-and-logs/logs)

### Juniper SRX
- **API:** ✅ REST API, Junos Space API
- **Authentication:** API keys, SSH keys
- **Data Export:** Configuration files, audit logs, policy rules, syslog
- **Documentation:**
  - [Export Configuration Files](https://www.juniper.net/documentation/us/en/software/junos-space21.2/junos-space-workspaces/topics/task/platform-configuration-file-exporting.html)
  - [Export Audit Logs](https://www.juniper.net/documentation/us/en/software/junos-space24.1/junos-space-workspaces/topics/task/audit-logs-exporting.html)
  - [Export Policies Script](https://github.com/freenetwork/export_policies_from_srx)
  - [System Logging](https://www.juniper.net/documentation/us/en/software/junos/network-mgmt/topics/topic-map/system-logging-for-a-security-device.html)

### F5 BIG-IP
- **API:** ✅ iControl REST API
- **Authentication:** Basic auth, tokens
- **Data Export:** ASM event logs (max 500 per export, configurable), configuration files, audit logs
- **Documentation:**
  - [Log All REST API Requests](https://my.f5.com/manage/s/article/K64371928)
  - [Export >500 ASM Event Logs](https://my.f5.com/manage/s/article/K90253824)
  - [Export ASM Event Report](https://my.f5.com/manage/s/article/K50284219)
  - [Download Config Files](https://community.f5.com/discussions/technicalforum/how-to-download-a-saved-config-file-using-restful-api/146942)
  - [iControl REST User Guide](https://cdn.f5.com/websites/devcentral.f5.com/downloads/icontrol-rest-api-user-guide-14-1-0.pdf)

### Imperva WAF
- **API:** ✅ REST API available
- **Authentication:** API client credentials
- **Data Export:** Access logs and security events via API or Amazon S3
- **Documentation:**
  - [Export Security Events Discussion](https://community.imperva.com/discussion/export-security-events)
  - [Google Chronicle - Collect via API or S3](https://docs.cloud.google.com/chronicle/docs/ingestion/default-parsers/imperva-waf)
  - [Rapid7 - API Client Config](https://docs.rapid7.com/insightidr/imperva/)
  - [Elastic Integration](https://www.elastic.co/docs/reference/integrations/imperva_cloud_waf)
  - [SIEM Logs Collection Guide](https://securityboulevard.com/2019/03/imperva-cloud-waf-and-graylog-part-ii-how-to-collect-and-ingest-siem-logs/)

### Zscaler ZPA
- **API:** ✅ REST API for audit/event logs, LSS API
- **Authentication:** API tokens
- **Data Export:** Audit logs (CSV via API), event logs, syslog streaming via LSS
- **Documentation:**
  - [Downloading Audit/Event Logs](https://help.zscaler.com/legacy-apis/downloading-audit-logs-event-logs-using-api)
  - [Managing LSS Configurations](https://help.zscaler.com/legacy-apis/managing-log-streaming-service-configurations-using-api)

---

## GRC & Compliance

### ServiceNow GRC / ITSM
- **API:** ✅ Full REST API (Table API)
- **Authentication:** OAuth 2.0, Basic auth (username:password), API tokens
- **Data Export:** Incidents, configuration data, risks, controls, CMDB data, service catalog, assignment groups
- **Documentation:**
  - [Export Incidents Programmatically](https://www.servicenow.com/community/itsm-articles/how-to-export-incidents-from-servicenow-programmatically/ta-p/3467411)
  - [Bulk Data Export with Pagination](https://support.servicenow.com/kb?id=kb_article_view&sysparm_article=KB0727636)
  - [Retrieve Existing Incidents](https://www.servicenow.com/docs/r/washingtondc/api-reference/rest-api-explorer/t_GetStartedRetrieveExisting.html)
  - [REST API Reference](https://www.servicenow.com/docs/r/yokohama/api-reference/rest-apis/api-rest.html)

### OneTrust
- **API:** ✅ REST API available
- **Authentication:** OAuth 2.0
- **Data Export:** Compliance data, assessments, vendors, risks, bulk export functionality
- **Documentation:**
  - [API Reference](https://developer.onetrust.com/onetrust/reference/onetrust-api-reference)
  - [OAuth Scopes](https://developer.onetrust.com/onetrust/reference/oauth-20-scopes)
  - [Bulk Export OpenAPI](https://developer.onetrust.com/onetrust/openapi)
  - [Exporting Data](https://my.onetrust.com/s/article/UUID-905f3684-6fe9-3534-d0ef-410de26ee801)

### MetricStream
- **API:** ✅ REST API available
- **Authentication:** OAuth 2.0, API tokens
- **Data Export:** Compliance data, GRC metrics, controls, assessments

### AuditBoard
- **API:** ✅ REST API available
- **Authentication:** API tokens, OAuth 2.0
- **Data Export:** Compliance data, evidence, controls, issues, assessments

### RSA Archer
- **API:** ✅ eGRC Web API available
- **Authentication:** API tokens
- **Data Export:** Reports, risk and control assessment data (CSV/XML)
- **Documentation:**
  - [eGRC API Guide (PDF)](https://www.scribd.com/document/887014864/EGRCPlatform-5-3-WebAPI)
  - [Export Report API Discussion](https://www.archerirm.community/s/question/0D5VM00000RE7fL0AT/export-report-api)
  - [Bulk Data Export Discussion](https://www.archerirm.community/s/question/0D5VM00000REh4M0AT/is-there-any-way-to-export-data-in-bulk-from-archer-at-regular-intervals-)

### LogicGate
- **API:** ✅ Risk Cloud REST API
- **Authentication:** OAuth 2.0, API tokens
- **Data Export:** Records (CSV/XLSX), table reports, attachments, roles
- **Documentation:**
  - [Export Record Data](https://www.logicgate.com/developer/risk-cloud-export-record-data/)
  - [Export Table Reports](https://www.logicgate.com/developer/risk-cloud-api-export-table-report/)
  - [Getting Started](https://www.logicgate.com/developer/risk-cloud-api-getting-started/)

### Hyperproof
- **API:** ✅ REST API available
- **Authentication:** API tokens
- **Data Export:** Proof/evidence upload, retrieval, download
- **Documentation:**
  - [Uploading and Retrieving Proof](https://developer.hyperproof.app/hyperproof-api/api-003-uploading-and-retrieving-proof)
  - [Integrations Portal](https://hyperproof.io/integrations/)

### Vanta
- **API:** ✅ Vanta API available
- **Authentication:** OAuth 2.0
- **Data Export:** Automated test evidence, compliance data, security evidence, workpapers
- **Documentation:**
  - [Vanta API Product Page](https://www.vanta.com/products/vanta-api)
  - [Automated Test Evidence Export](https://help.vanta.com/en/articles/11345529-automated-test-evidence)
  - [Auditor Capabilities](https://help.vanta.com/en/articles/11345844-how-will-your-auditor-use-vanta)

---

## ITSM & Ticketing

### Jira Service Management
- **API:** ✅ REST API available
- **Authentication:** Basic auth, API tokens, OAuth
- **Data Export:** Issues/tickets (CSV), incident history, service desk data
- **Documentation:**
  - [Export Issues via API](https://community.atlassian.com/forums/Jira-articles/How-to-export-all-issues-from-Jira-via-API/ba-p/2126063)
  - [Export Incident Details](https://community.atlassian.com/forums/Jira-Service-Management/How-to-export-Incident-ticket-details-from-Jira-Service/qaq-p/1670974)
  - [Export Issue History](https://community.atlassian.com/forums/App-Central-articles/How-to-export-issue-history-from-Jira/ba-p/1886975)
  - [Discover ITSM](https://support.atlassian.com/jira-service-management-cloud/docs/discover-it-service-management-itsm/)

### BMC Remedy / Helix ITSM
- **API:** ✅ Platform REST API, Simplified REST API
- **Authentication:** JWT login, OAuth
- **Data Export:** Incidents, tickets (GET/POST operations), notes
- **Documentation:**
  - [Create Incident via REST API](https://docs.bmc.com/xwiki/bin/view/Service-Management/IT-Service-Management/BMC-Helix-ITSM/itsm261/Developing/Integrating-third-party-applications-with-BMC-Helix-ITSM-by-using-the-platform-REST-API/Example-of-using-the-platform-REST-API-to-create-an-incident-request/)
  - [Create Ticket via Simplified API](https://docs.helixops.ai/bin/Service-Management/IT-Service-Management/BMC-Helix-ITSM/itsm251/Developing/Integrating-third-party-applications-with-BMC-Helix-ITSM-by-using-the-simplified-REST-API/Learning-about-the-simplified-REST-API/Example-of-using-the-simplified-REST-API-to-create-a-ticket/)
  - [Retrieve Incident Entry](https://docs.bmc.com/xwiki/bin/view/Service-Management/IT-Service-Management/BMC-Helix-ITSM/itsm221/Developing/Integrating-third-party-applications-with-BMC-Helix-ITSM-by-using-the-platform-REST-API/Example-of-using-the-platform-REST-API-to-retrieve-an-incident-entry/)
  - [Export Tickets Discussion](https://community.bmc.com/s/question/0D53n00009ei6wvCAA/how-do-i-export-incident-tickets-including-notes)

### Freshservice
- **API:** ✅ Service Desk API
- **Authentication:** API keys
- **Data Export:** Incidents, assets (CSV), service desk data, scheduled exports
- **Documentation:**
  - [Service Desk API](https://api.freshservice.com/)
  - [Scheduled Data Export](https://support.freshservice.com/support/solutions/articles/238958-scheduled-data-export)
  - [Export Service Desk Data](https://support.freshservice.com/support/solutions/articles/50000000125-how-do-i-export-my-service-desk-data/)
  - [Export All Assets](https://support.freshservice.com/support/solutions/articles/50000000532-how-do-i-get-a-copy-of-all-my-assets-)

### Cherwell / Ivanti Neurons for ITSM
- **API:** ✅ Canonical REST API
- **Authentication:** API Client ID + Client Key (OAuth)
- **Data Export:** Incidents, problems, requests, events, service requests (ITIL-verified)
- **Documentation:**
  - [REST API (CSM 2022.3)](https://help.ivanti.com/ch/help/en_US/CSM/2022.3/cherwell_rest_api_csm_2022.3.pdf)
  - [REST API (CSM 10.5.0)](https://help.ivanti.com/ch/help/en_US/CSM/10.5.0/cherwell_rest_api_csm_10.5.0.pdf)
  - [Export to ServiceNow](https://aelumconsulting.com/blogs/export-cherwell-data-to-servicenow/)

---

## Cloud Security

### Tenable.io
- **API:** ✅ REST API with export endpoints
- **Authentication:** API keys (Access Key + Secret Key)
- **Data Export:** Vulnerability data, scan results, asset data
- **Documentation:**
  - [Export Vulnerabilities API](https://developer.tenable.com/reference/exports-vulns-request-export)
  - [Export Scan API](https://developer.tenable.com/reference/scans-export-request)
  - [Retrieve Vulnerability Data](https://developer.tenable.com/docs/retrieve-vulnerability-data-from-tenableio)
  - [VM & WAS Integrations](https://developer.tenable.com/docs/vm-and-was-integrations)
  - [pyTenable Library](https://pytenable.readthedocs.io/en/1.5.2/api/io/exports.html)

### Prisma Cloud
- **API:** ✅ REST API available
- **Authentication:** API keys
- **Data Export:** Compliance reports (CSV), resource archives (up to 50,000 assets per cloud account), API definition scans
- **Documentation:**
  - [Compliance Report Export](https://docs.prismacloud.io/en/enterprise-edition/content-collections/connect/connect-cloud-accounts/onboard-aws/configure-data-security)
  - [API Definition Scan](https://docs.prismacloud.io/en/enterprise-edition/content-collections/connect/connect-cloud-accounts/onboard-aws/configure-data-security)
  - [Bulk Export Resource Archives API](https://pan.dev/prisma-cloud/api/cspm/bulk-export-resource-archives/)

### Wiz
- **API:** ✅ Wiz API available
- **Authentication:** OAuth 2.0 (client ID + secret), API endpoint
- **Data Export:** Vulnerabilities, misconfigurations, findings (via `wizcli` or API)
- **Documentation:**
  - [API Reference — Wiz 3.7.0](https://wiz.readthedocs.io/en/latest/api_reference/index.html)
  - [DefectDojo Integration](https://defectdojo.com/integrations/wiz)
  - [Create Vulnerabilities Report](https://docs.blinkops.com/docs/integrations/wiz/actions/create-vulnerabilities-report)

### Orca Security
- **API:** ✅ REST API (regional endpoints)
- **Authentication:** API tokens
- **Data Export:** Vulnerability data, cloud security posture, compliance data, webhook alerts
- **Documentation:**
  - [Documentation Portal](https://docs.orcasecurity.io/) (requires login/region selection)
  - [API Tracker](https://apitracker.io/a/orca-security)
  - [Webhook Integration](https://docs.port.io/guides/all/ingest-vulnerability-alerts-from-orca-security-using-a-custom-webhook-integration/)
  - [Qualys Connector](https://docs.qualys.com/en/conn/latest/integrations/orca_connector.htm)
  - **API Endpoints:**
    - US: `https://api.orcasecurity.io/api/`
    - Europe: `https://app.eu.orcasecurity.io/api/`
    - Australia: `https://app.au.orcasecurity.io/api/`

### Lacework
- **API:** ✅ Lacework API v2 available
- **Authentication:** API tokens
- **Data Export:** Vulnerabilities, compliance data, misconfigurations, image/registry scans
- **Documentation:**
  - [API v2 Documentation](https://yourlacework.lacework.net/api/v2/docs)
  - [API Documentation](https://api.lacework.net/api/v2/docs)
  - [Export Integration](https://docs.lacework.com/lacework-api/)
  - [Terraform Provider](https://www.lacework.net/platform)

### Aqua Security / Trivy
- **API:** ✅ Trivy scanner (CLI), Aqua Security APIs
- **Authentication:** Environment variables, API keys
- **Data Export:** Vulnerability scans for containers, filesystems, VM images, running hosts (multiple output formats)
- **Documentation:**
  - [Trivy Vulnerability Scanner](https://trivy.dev/docs/v0.54/scanner/vulnerability/)
  - [Scan Images Guide](https://oneuptime.com/blog/post/2026-02-02-trivy-container-scanning/view)
  - [CI/CD Integration](https://mkabumattar.com/devtips/post/container-image-vulnerability-scanning-trivy)
  - [GitHub Discussion](https://github.com/aquasecurity/trivy/discussions/4270)

### Qualys Vulnerability Management
- **API:** ✅ VM, PC, WAS APIs available
- **Authentication:** Username/password, API tokens
- **Data Export:** Scan results (CSV/JSON, brief/extended format), assets, vulnerability details
- **Documentation:**
  - [Download Scan Results](https://success.qualys.com/support/s/article/000003044)
  - [API User Guide (PDF)](https://cdn2.qualys.com/docs/qualys-api-vmpc-user-guide.pdf)
  - [API V2: Download Scan Report in JSON](https://success.qualys.com/discussions/s/question/0D52L00004Tnub2SAB/api-v2-how-to-download-scan-report-in-json)
  - [Export Data to CSV](https://success.qualys.com/discussions/s/question/0D52L00005eQCxZSAW/how-to-export-data-out-of-qualys-into-a-csv)
  - [Get Vulnerability Detail Results](https://success.qualys.com/discussions/s/question/0D52L00004e0g5tSAA/get-vulnerability-detail-results-from-api)

---

## Email & Web Security

### Proofpoint
- **API:** ✅ SIEM API available
- **Authentication:** API credentials, basic auth
- **Data Export:** Email logs, threat intelligence, messages, click/tracking logs (periodic API pulls)
- **Documentation:**
  - [SIEM API Documentation](https://help.proofpoint.com/Threat_Insight_Dashboard/API_Documentation/SIEM_API)

### Abnormal Security
- **API:** ✅ REST API available
- **Authentication:** API tokens
- **Data Export:** Email security logs, threat data, attack analysis

### Mimecast
- **API:** ✅ API 2.0, SIEM API endpoints
- **Authentication:** API tokens, application ID
- **Data Export:** Enhanced Logging, SIEM logs (MTA logs up to 7 days), DLP logs, rejection logs, TTP logs
- **Documentation:**
  - [Understanding SIEM Logs](https://integrations.mimecast.com/documentation/tutorials/understanding-siem-logs/)
  - [Downloading SIEM Logs](https://integrations.mimecast.com/documentation/tutorials/downloading-siem-logs/)
  - [Get SIEM Logs Endpoint](https://integrations.mimecast.com/documentation/endpoint-reference/logs-and-statistics/get-siem-logs/)
  - [SIEM API Endpoints](https://mimecastsupport.zendesk.com/hc/en-us/articles/34000373976083-API-Integrations-SIEM-API-Endpoints-Jul-2023)
  - [Email Security Cloud Threat Events](https://mimecastsupport.zendesk.com/hc/en-us/articles/34000396263955-Email-Security-Cloud-Integrated-Threats-Security-Events-Data-API-Endpoints-Aug-2023)
  - [Rapid7 InsightIDR](https://docs.rapid7.com/insightidr/mimecast-2.0/)
  - [Google Chronicle](https://docs.cloud.google.com/chronicle/docs/ingestion/default-parsers/mimecast-mail)
  - [Elastic Integration](https://www.elastic.co/docs/reference/integrations/mimecast)
  - [LogRhythm](https://docs.logrhythm.com/OCbeats/docs/create-a-mimecast-api-application-and-enable-siem-)

### Cisco Umbrella
- **API:** ✅ Reporting v2 API, Management API
- **Authentication:** API key + secret for token authorization
- **Data Export:** Activity logs, summaries (CSV via UI, API for programmatic access), zipped CSV logs from S3
- **Documentation:**
  - [Reporting v2 API](https://developer.cisco.com/docs/legacy-umbrella-api/reporting-v2-getting-started/)
  - [Activity Search Logs](https://securitydocs.cisco.com/docs/umbrella-dns/gov/olh/154143.dita)
  - [Data Management](https://www.cisco.com/c/en/us/support/docs/security/umbrella/225071-understand-data-management-with-log.html)
  - [Log Formats](https://securitydocs.cisco.com/docs/umbrella-dns/olh/146465.dita)
  - [Manage Logs](https://securitydocs.cisco.com/docs/umbrella-dns/olh/146468.dita)
  - [DNS Log Formats](https://securitydocs.cisco.com/docs/umbrella-dns/olh/147415.dita)

### Menlo Security
- **API:** ✅ Logging API available
- **Authentication:** API token with Log Export API permission
- **Data Export:** Security events, isolation platform logs (REST API to third-party SIEM/BI tools), custom queries, flexible retention (up to 1 year)
- **Documentation:**
  - [Elastic Integration](https://www.elastic.co/docs/reference/integrations/menlo)
  - [Google Chronicle](https://docs.cloud.google.com/chronicle/docs/ingestion/default-parsers/menlo-security)
  - [Cortex XSOAR](https://docs.panther.com/data-onboarding/supported-logs/menlo-security)
  - [Sample API Client](https://gist.github.com/brandond/20013b62498357a7d553230570216341)
  - [Logging API Documentation](https://www.menlosecurity.com/api/)

---

## Summary: Connection Methods by Tool

| Tool Category | Tool | REST API | Agent/Connector | Log Forwarding | File Export | Manual Entry | Notes |
|--------------|------|-----------|-----------------|----------------|-------------|--------------|------|
| **IAM** | Okta | ✅ | Some | Some support | Most support | Possible | Full REST API available |
| **IAM** | SailPoint IGA | ✅ | Some | Some support | CSV export | Possible | Certification reports via API |
| **IAM** | CyberArk PAM | ✅ | Some | Some support | Telemetry export | Possible | Component utilization tracking |
| **IAM** | Microsoft Entra ID | ✅ | Some | Some support | CSV export | Possible | Microsoft Graph API (Azure AD deprecated) |
| **IAM** | Ping Identity | ✅ | Some | Some support | CSV export | Possible | Full REST API available |
| **IAM** | Saviynt | ✅ | Some | Some support | CSV export | Possible | REST API available |
| **IAM** | ForgeRock | ✅ | Some | Some support | Config export | Possible | Import/export configurations via API |
| **IAM** | BeyondTrust | ✅ | Some | Some support | CSV export | Possible | PAM/Privileged Access APIs available |
| **IAM** | HashiCorp Vault | ✅ | Some | Some support | Audit logs | Possible | Full HTTP REST API |
| **IAM** | Delinea | ✅ | Some | Some support | Secrets CSV/XML | Possible | Automatic scheduled exports |
| **EDR** | CrowdStrike Falcon | ✅ | Agents standard | Syslog common | CSV export | Rare | OAuth 2.0 available |
| **EDR** | SentinelOne | ✅ | Agents standard | Syslog common | CSV export | Rare | Deep Visibility API available |
| **EDR** | Microsoft Defender | ✅ | Agents standard | Syslog common | CSV export | Rare | Microsoft Graph API |
| **EDR** | Carbon Black | ✅ | Agents standard | Syslog common | CSV export | Rare | Audit logs via API |
| **EDR** | Tanium | ✅ | Agents standard | Syslog common | CSV export | Rare | GraphQL, API Gateway available |
| **EDR** | Trend Micro | ✅ | Agents standard | Syslog common | CSV/XML export | Rare | Automation API available |
| **EDR** | Sophos | ✅ | Agents standard | Syslog common | CSV export | Rare | Detections REST API |
| **EDR** | Trellix | ✅ | Agents standard | Syslog common | CSV export | Rare | Historical Search API |
| **SIEM** | Splunk | ✅ | Common | ✅ Native support | Export | Rare | Comprehensive REST API |
| **SIEM** | Microsoft Sentinel | ✅ | Common | ✅ Native support | Export | Rare | Azure Monitor/Sentinel APIs |
| **SIEM** | IBM QRadar | ✅ | Common | ✅ Native support | CSV/XML export | Rare | REST API for offenses |
| **SIEM** | LogRhythm | ✅ | Common | ✅ Native support | CSV export | Rare | PowerShell module available |
| **SIEM** | Sumo Logic | ✅ | Common | ✅ Native support | S3 export | Rare | Cloud SIEM APIs |
| **SIEM** | Securonix | ✅ | Common | ✅ Native support | CSV export | Rare | Alerts/Incidents/UEBA via API |
| **SIEM** | Exabeam | ✅ | Common | ✅ Native support | CSV/GCS export | Rare | Developer portal with MCP server |
| **SIEM** | Chronicle | ✅ | Common | ✅ Native support | ⚠️ Raw logs only | Rare | Data Export API limitation |
| **Network** | Palo Alto NGFW | ✅ | Some | Syslog/CEF | Config export | Rare | PAN-OS XML & REST APIs |
| **Network** | Cisco Firepower | ✅ | Some | Syslog/CEF | CSV export | Rare | REST API + export scripts |
| **Network** | Fortinet FortiGate | ✅ | Some | Syslog/CEF | CSV export | Rare | FortiCloud logging, console export |
| **Network** | Check Point | ✅ | Some | Syslog/CEF | CSV/HTML export | Rare | Log Exporter via SmartConsole |
| **Network** | Zscaler ZIA | ✅ | Some | NSS/LSS | Audit/event CSV | Rare | ⚠️ No API for Web/Firewall logs |
| **Network** | Juniper SRX | ✅ | Some | Syslog/CEF | Config export | Rare | Junos Space API, syslog export |
| **Network** | F5 BIG-IP | ✅ | Some | Syslog/CEF | Config export | Rare | iControl REST API |
| **Network** | Imperva WAF | ✅ | Some | Syslog/CEF | API/S3 export | Rare | API or Amazon S3 for logs |
| **Network** | Zscaler ZPA | ✅ | Some | Syslog/LSS | CSV export | Rare | LSS for continuous streaming |
| **GRC** | ServiceNow | ✅ | Some | Limited | CSV export | Some | Full Table API |
| **GRC** | OneTrust | ✅ | Some | Limited | Bulk export | Some | OAuth 2.0, bulk export API |
| **GRC** | MetricStream | ✅ | Some | Limited | CSV export | Some | REST API |
| **GRC** | AuditBoard | ✅ | Some | Limited | CSV export | Some | REST API |
| **GRC** | RSA Archer | ✅ | Some | Limited | CSV/XML export | Some | eGRC Web API |
| **GRC** | LogicGate | ✅ | Some | Limited | CSV/XLSX export | Some | Risk Cloud REST API |
| **GRC** | Hyperproof | ✅ | Some | Limited | Evidence download | Some | Proof upload/retrieval API |
| **GRC** | Vanta | ✅ | Some | Limited | Workpaper export | Some | Vanta API, automated evidence |
| **ITSM** | ServiceNow | ✅ | Some | Limited | CSV export | Some | Covered in GRC section |
| **ITSM** | Jira SM | ✅ | Some | Limited | CSV export | Some | REST API for issues/tickets |
| **ITSM** | BMC Remedy | ✅ | Some | Limited | JSON export | Some | Platform & Simplified REST APIs |
| **ITSM** | Freshservice | ✅ | Some | Limited | CSV export | Some | Service Desk API |
| **ITSM** | Cherwell | ✅ | Some | Limited | CSV export | Some | Canonical REST API |
| **Cloud** | Tenable.io | ✅ | Some | Syslog common | CSV/JSON export | Rare | Export APIs for vulnerabilities/scans |
| **Cloud** | Prisma Cloud | ✅ | Some | Some | CSV export | Rare | Bulk export resource archives API |
| **Cloud** | Wiz | ✅ | Some | Some | wizcli/API | Rare | API via OAuth |
| **Cloud** | Orca | ✅ | Some | Some | API export | Rare | Regional REST API endpoints |
| **Cloud** | Lacework | ✅ | Some | Some | Export integration | Rare | API v2 available |
| **Cloud** | Aqua/Trivy | ✅ | Some | Some | Multiple formats | Rare | CLI/API for vulnerability scans |
| **Cloud** | Qualys | ✅ | Some | Some | CSV/JSON export | Rare | VM/PC/WAS APIs |
| **Email** | Proofpoint | ✅ | Some | ✅ SIEM API | CSV export | Rare | Periodic API pulls |
| **Email** | Abnormal Security | ✅ | Some | Some | API export | Rare | REST API |
| **Email** | Mimecast | ✅ | Some | ✅ SIEM API | CSV export | Rare | Enhanced Logging API 2.0 |
| **Email** | Cisco Umbrella | ✅ | Some | Some | CSV export | Rare | Reporting v2 API, S3 logs |
| **Email** | Zscaler ZPA | ✅ | Some | Syslog/LSS | CSV export | Rare | LSS for streaming |
| **Email** | Menlo Security | ✅ | Some | Some | API export | Rare | Logging API with flexible retention |

---

## Key Recommendations for Nerion Implementation

### Connection Method Priority

1. **✅ REST API (Primary)** - All major tools support REST APIs
2. **🔌 Agent/Connector** - For tools with installed agents (EDR, Cloud Security)
3. **📡 Log Forwarding** - Native streaming to SIEM (Syslog, CEF, REST)
4. **📁 File Export** - Manual or scheduled (CSV/XML)
5. **✏️ Manual Entry** - Fallback for tools without APIs or small data volumes

### Authentication Patterns to Support

- **OAuth 2.0:** Modern standard (most preferred)
- **API Tokens/Keys:** Most common legacy approach
- **Basic Auth:** Legacy but still used
- **JWT:** Token-based authentication
- **Client Credentials:** Service-to-service authentication

### Implementation Considerations

1. **Handle Pagination** - Most APIs require pagination for large datasets
2. **Implement Rate Limiting** - APIs have strict rate limits
3. **Support Async Exports** - Some tools use job-based export workflows
4. **Error Handling** - Retry logic for failed requests
5. **Credential Vault** - Secure storage for API keys/tokens
6. **Webhook Support** - For real-time alerts (some SIEMs, email security)
7. **Batch Processing** - For tools with export limits

### Special Limitations to Note

- **Zscaler ZIA:** No direct API for Web/Firewall logs - must use NSS/LSS
- **Chronicle:** Data Export API only supports raw logs, not detections
- **F5 ASM:** Default max 500 event logs per export (configurable)
- **Mimecast SIEM logs:** Available only for last 7 days via API
- **Trend Micro:** Some log export only via console, not all via API

---

**Document Version:** 1.0
**Last Updated:** 2026-05-31
**Maintained By:** Nerion Development Team
**Purpose:** Internal reference for security tool integration capabilities
