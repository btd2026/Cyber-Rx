// Reference data for onboarding, distilled from the approved intake mock.

export type Connector = { id: string; cat: string; ic: string; sig: number; vendors: string[] }

// 10 connector categories; `sig` weights the credibility meter (signal volume).
export const CONNECTORS: Connector[] = [
  { id: 'edr', cat: 'Endpoint Detection & Response', ic: '🛡', sig: 420, vendors: ['CrowdStrike Falcon', 'Microsoft Defender', 'SentinelOne'] },
  { id: 'siem', cat: 'SIEM / Log analytics', ic: '📊', sig: 510, vendors: ['Splunk', 'Microsoft Sentinel', 'Elastic Security'] },
  { id: 'fw', cat: 'Firewall / Network', ic: '🧱', sig: 180, vendors: ['Palo Alto Networks', 'Fortinet', 'Cisco Secure Firewall'] },
  { id: 'idp', cat: 'Identity provider (IdP / SSO)', ic: '🔑', sig: 240, vendors: ['Okta', 'Microsoft Entra ID', 'Ping Identity'] },
  { id: 'cloud', cat: 'Cloud security posture (CSPM)', ic: '☁', sig: 160, vendors: ['AWS Security Hub', 'Wiz', 'Prisma Cloud'] },
  { id: 'vuln', cat: 'Vulnerability management', ic: '🔍', sig: 90, vendors: ['Tenable', 'Qualys', 'Rapid7'] },
  { id: 'email', cat: 'Email security', ic: '✉', sig: 70, vendors: ['Proofpoint', 'Mimecast', 'Abnormal'] },
  { id: 'backup', cat: 'Backup / DR', ic: '💾', sig: 40, vendors: ['Rubrik', 'Veeam', 'Cohesity'] },
  { id: 'mdm', cat: 'Device management (MDM)', ic: '💻', sig: 30, vendors: ['Microsoft Intune', 'Jamf', 'Workspace ONE'] },
  { id: 'grc', cat: 'ITSM / GRC / Ticketing', ic: '🗂', sig: 25, vendors: ['ServiceNow', 'Jira', 'Vanta'] },
]

export const TOTAL_SIG = CONNECTORS.reduce((s, c) => s + c.sig, 0)

// ISO 4217 — primary currency, stored as a code; honored across the platform.
export const CURRENCIES = [
  { code: 'USD', symbol: '$', label: 'US Dollar' },
  { code: 'EUR', symbol: '€', label: 'Euro' },
  { code: 'GBP', symbol: '£', label: 'British Pound' },
  { code: 'CAD', symbol: 'C$', label: 'Canadian Dollar' },
  { code: 'AUD', symbol: 'A$', label: 'Australian Dollar' },
  { code: 'JPY', symbol: '¥', label: 'Japanese Yen' },
  { code: 'CHF', symbol: 'CHF', label: 'Swiss Franc' },
  { code: 'SGD', symbol: 'S$', label: 'Singapore Dollar' },
  { code: 'INR', symbol: '₹', label: 'Indian Rupee' },
]

export const symbolFor = (code: string) => CURRENCIES.find((c) => c.code === code)?.symbol ?? code + ' '

export const INDUSTRIES = [
  'Healthcare Payer',
  'Healthcare Provider',
  'Financial Services',
  'Insurance',
  'Technology',
  'Retail',
  'Manufacturing',
  'Energy & Utilities',
  'Government',
  'Other',
]

export const OWNERSHIP = ['Public', 'Private', 'PE-backed', 'Non-profit', 'Government']

export const REGIONS = ['North America', 'European Union', 'United Kingdom', 'APAC', 'Latin America', 'Middle East & Africa']

export const DATA_TYPES = ['PHI (health)', 'PII', 'PCI (payment cards)', 'Financial records', 'Government / CUI', 'Trade secrets / IP']

// The 24/7 incident call tree — roles no system can report; declared at onboarding.
export const CALL_TREE_ROLES = [
  'Incident Commander',
  'Deputy IC',
  'Comms / PR lead',
  'Breach counsel (external)',
  'IR retainer / forensics (24/7)',
  'Cyber-insurer claims hotline',
  'Law enforcement (FBI field office)',
]
