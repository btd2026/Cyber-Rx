// CyberRx — client-side connector catalog (the config-form schema).
//
// This mirrors the server adapters' secretFields/configFields so the "Configure
// data source" UI can render a credential form per provider. It is deliberately
// separate from supabase/functions/_shared/adapters/* (Deno) — the client never
// imports server code. Keep the implemented providers' fields in sync with their
// adapter. `implemented` providers can be saved + synced; others are previews.

export type Field = { key: string; label: string; placeholder?: string; secret?: boolean }

export type ProviderDef = {
  provider: string
  label: string
  free: 'free' | 'trial' | 'enterprise'
  implemented: boolean
  signupUrl?: string
  /** One-line description of what this source contributes. */
  signal: string
  secretFields: Field[]
  configFields: Field[]
}

export type CategoryDef = { kind: string; label: string; providers: ProviderDef[] }

export const CONNECTOR_CATALOG: CategoryDef[] = [
  { kind: 'idp', label: 'Identity Provider', providers: [
    {
      provider: 'okta', label: 'Okta (Integrator Free)', free: 'free', implemented: true,
      signupUrl: 'https://developer.okta.com/signup/', signal: 'MFA enrollment coverage',
      secretFields: [{ key: 'token', label: 'API token (SSWS)', placeholder: '00ab…', secret: true }],
      configFields: [{ key: 'orgUrl', label: 'Org URL', placeholder: 'https://dev-12345.okta.com' }],
    },
    {
      provider: 'msgraph', label: 'Microsoft Entra (Graph)', free: 'free', implemented: true,
      signupUrl: 'https://learn.microsoft.com/entra/', signal: 'MFA coverage + privileged admin count',
      secretFields: [
        { key: 'tenantId', label: 'Directory (tenant) ID' },
        { key: 'clientId', label: 'Application (client) ID' },
        { key: 'clientSecret', label: 'Client secret', secret: true },
      ],
      configFields: [],
    },
  ] },
  { kind: 'grc', label: 'ITSM / GRC', providers: [
    {
      provider: 'servicenow', label: 'ServiceNow (Developer Instance)', free: 'free', implemented: true,
      signupUrl: 'https://developer.servicenow.com/', signal: 'Open security incidents',
      secretFields: [
        { key: 'username', label: 'Username', placeholder: 'admin' },
        { key: 'password', label: 'Password', secret: true },
      ],
      configFields: [{ key: 'instance', label: 'Instance', placeholder: 'dev123456' }],
    },
    {
      provider: 'jira', label: 'Jira Cloud (Free)', free: 'free', implemented: true,
      signupUrl: 'https://id.atlassian.com/manage-profile/security/api-tokens', signal: 'Open security/remediation tickets',
      secretFields: [
        { key: 'email', label: 'Atlassian account email', placeholder: 'you@org.com' },
        { key: 'apiToken', label: 'API token', placeholder: 'from id.atlassian.com', secret: true },
      ],
      configFields: [
        { key: 'baseUrl', label: 'Site URL', placeholder: 'https://your-site.atlassian.net' },
        { key: 'jql', label: 'JQL filter', placeholder: 'project = SEC AND statusCategory != Done' },
      ],
    },
  ] },
  { kind: 'siem', label: 'SIEM / Log analytics', providers: [
    {
      provider: 'elastic', label: 'Elasticsearch (Basic)', free: 'free', implemented: true,
      signupUrl: 'https://www.elastic.co/downloads/elasticsearch', signal: 'Log-ingestion presence + events by severity',
      secretFields: [{ key: 'apiKey', label: 'API key', placeholder: 'base64 ApiKey', secret: true }],
      configFields: [
        { key: 'baseUrl', label: 'Base URL', placeholder: 'http://localhost:9200' },
        { key: 'index', label: 'Index pattern', placeholder: 'logs-*' },
      ],
    },
    {
      provider: 'splunk', label: 'Splunk Free (self-hosted)', free: 'free', implemented: true,
      signupUrl: 'https://www.splunk.com/en_us/download/splunk-enterprise.html', signal: 'Log ingestion volume',
      secretFields: [{ key: 'token', label: 'Authentication token', placeholder: 'Bearer token', secret: true }],
      configFields: [{ key: 'baseUrl', label: 'Management URL', placeholder: 'https://localhost:8089' }],
    },
  ] },
  { kind: 'vuln', label: 'Vulnerability management', providers: [
    {
      provider: 'nessus', label: 'Nessus Essentials', free: 'free', implemented: true,
      signupUrl: 'https://www.tenable.com/products/nessus/nessus-essentials', signal: 'Critical/high vulnerability counts',
      secretFields: [
        { key: 'accessKey', label: 'Access key', secret: true },
        { key: 'secretKey', label: 'Secret key', secret: true },
      ],
      configFields: [{ key: 'baseUrl', label: 'Base URL', placeholder: 'https://localhost:8834' }],
    },
  ] },
  { kind: 'cloud', label: 'Cloud security posture (CSPM)', providers: [
    {
      provider: 'securityhub', label: 'AWS Security Hub', free: 'free', implemented: true,
      signupUrl: 'https://docs.aws.amazon.com/securityhub/latest/userguide/securityhub-settingup.html',
      signal: 'Findings by severity + compliance pass rate',
      secretFields: [
        { key: 'accessKeyId', label: 'Access key ID', secret: true },
        { key: 'secretAccessKey', label: 'Secret access key', secret: true },
        { key: 'sessionToken', label: 'Session token (optional)', secret: true },
      ],
      configFields: [{ key: 'region', label: 'AWS region', placeholder: 'us-east-1' }],
    },
  ] },
  { kind: 'backup', label: 'Backup / DR', providers: [
    {
      provider: 'veeam', label: 'Veeam Community Edition', free: 'free', implemented: true,
      signupUrl: 'https://www.veeam.com/products/downloads.html', signal: 'Backup success rate + last successful backup',
      secretFields: [
        { key: 'username', label: 'Username', placeholder: 'Administrator' },
        { key: 'password', label: 'Password', secret: true },
      ],
      configFields: [
        { key: 'baseUrl', label: 'Base URL', placeholder: 'https://veeam-host:9419' },
        { key: 'apiVersion', label: 'API version', placeholder: '1.1-rev1' },
      ],
    },
  ] },
  { kind: 'edr', label: 'Endpoint Detection & Response', providers: [
    {
      provider: 'msgraph_secure_score', label: 'Defender Secure Score (Graph)', free: 'free', implemented: true,
      signupUrl: 'https://developer.microsoft.com/microsoft-365/dev-program', signal: 'Defender Secure Score (posture %)',
      secretFields: [
        { key: 'tenantId', label: 'Directory (tenant) ID' },
        { key: 'clientId', label: 'Application (client) ID' },
        { key: 'clientSecret', label: 'Client secret', secret: true },
      ],
      configFields: [],
    },
    { provider: 'crowdstrike', label: 'CrowdStrike Falcon', free: 'enterprise', implemented: false, signal: 'Sensor coverage', secretFields: [], configFields: [] },
  ] },
  { kind: 'mdm', label: 'Device management (MDM)', providers: [
    {
      provider: 'msgraph_intune', label: 'Intune (Graph)', free: 'free', implemented: true,
      signupUrl: 'https://developer.microsoft.com/microsoft-365/dev-program', signal: 'Device compliance %',
      secretFields: [
        { key: 'tenantId', label: 'Directory (tenant) ID' },
        { key: 'clientId', label: 'Application (client) ID' },
        { key: 'clientSecret', label: 'Client secret', secret: true },
      ],
      configFields: [],
    },
  ] },
  { kind: 'email', label: 'Email security', providers: [
    { provider: 'proofpoint', label: 'Proofpoint', free: 'enterprise', implemented: false, signal: 'Blocked email threats', secretFields: [], configFields: [] },
  ] },
  { kind: 'fw', label: 'Firewall / Network', providers: [
    {
      provider: 'meraki', label: 'Cisco Meraki (DevNet/API)', free: 'trial', implemented: true,
      signupUrl: 'https://developer.cisco.com/meraki/', signal: 'Firewall rule hygiene (any/any, logging)',
      secretFields: [{ key: 'apiKey', label: 'Meraki API key', secret: true }],
      configFields: [
        { key: 'baseUrl', label: 'API base', placeholder: 'https://api.meraki.com/api/v1' },
        { key: 'networkId', label: 'Network ID', placeholder: 'L_123456789' },
      ],
    },
  ] },
]

export const categoryFor = (kind: string): CategoryDef | undefined => CONNECTOR_CATALOG.find((c) => c.kind === kind)
export const providerFor = (kind: string, provider: string): ProviderDef | undefined =>
  categoryFor(kind)?.providers.find((p) => p.provider === provider)
