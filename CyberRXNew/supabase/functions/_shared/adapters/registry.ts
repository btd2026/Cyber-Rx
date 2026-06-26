// CyberRx — connector adapter registry (Phase 8).
//
// Maps a connector's `provider` to its adapter. Implemented providers below pull
// real read-only signals from genuinely-free / self-serve developer tiers. The
// remaining categories are declared (so the UI can show them) but unimplemented —
// their vendors are enterprise-gated (no free API) or self-hosted appliances; see
// docs/CONNECTORS.md for the per-source free-tier research.

import type { ConnectorAdapter } from './types.ts'
import { oktaAdapter } from './okta.ts'
import { msGraphAdapter } from './msgraph.ts'
import { serviceNowAdapter } from './servicenow.ts'
import { elasticAdapter } from './elastic.ts'

export const ADAPTERS: ConnectorAdapter[] = [
  oktaAdapter,      // idp  — Okta Integrator Free Plan (free, instant)
  msGraphAdapter,   // idp  — Microsoft Entra / M365 Dev E5 (free, Graph)
  serviceNowAdapter,// grc  — ServiceNow PDI (free sandbox)
  elasticAdapter,   // siem — Elasticsearch Basic (free, self-hosted)
]

export const adapterFor = (provider: string): ConnectorAdapter | undefined =>
  ADAPTERS.find((a) => a.provider === provider)

// Catalog of connector categories ↔ which free provider (if any) is wired. Drives
// the "Configure data source" UI and documents honest coverage.
export type CategoryStatus = {
  kind: string
  label: string
  providers: { provider: string; label: string; free: 'free' | 'trial' | 'enterprise'; implemented: boolean }[]
}

export const CATEGORY_STATUS: CategoryStatus[] = [
  { kind: 'idp', label: 'Identity Provider', providers: [
    { provider: 'okta', label: 'Okta (Integrator Free)', free: 'free', implemented: true },
    { provider: 'msgraph', label: 'Microsoft Entra (Graph)', free: 'free', implemented: true },
  ] },
  { kind: 'grc', label: 'ITSM / GRC', providers: [
    { provider: 'servicenow', label: 'ServiceNow (PDI)', free: 'free', implemented: true },
    { provider: 'jira', label: 'Jira Cloud (Free)', free: 'free', implemented: false },
  ] },
  { kind: 'siem', label: 'SIEM / Log analytics', providers: [
    { provider: 'elastic', label: 'Elasticsearch (Basic)', free: 'free', implemented: true },
    { provider: 'splunk', label: 'Splunk Free (self-hosted)', free: 'free', implemented: false },
  ] },
  { kind: 'vuln', label: 'Vulnerability management', providers: [
    { provider: 'nessus', label: 'Nessus Essentials', free: 'free', implemented: false },
  ] },
  { kind: 'cloud', label: 'Cloud security posture (CSPM)', providers: [
    { provider: 'securityhub', label: 'AWS Security Hub', free: 'free', implemented: false },
  ] },
  { kind: 'backup', label: 'Backup / DR', providers: [
    { provider: 'veeam', label: 'Veeam Community Edition', free: 'free', implemented: false },
  ] },
  { kind: 'edr', label: 'Endpoint Detection & Response', providers: [
    { provider: 'msgraph_secure_score', label: 'Defender Secure Score (Graph)', free: 'free', implemented: false },
    { provider: 'crowdstrike', label: 'CrowdStrike Falcon', free: 'enterprise', implemented: false },
  ] },
  { kind: 'mdm', label: 'Device management (MDM)', providers: [
    { provider: 'msgraph_intune', label: 'Intune (Graph)', free: 'free', implemented: false },
  ] },
  { kind: 'email', label: 'Email security', providers: [
    { provider: 'proofpoint', label: 'Proofpoint', free: 'enterprise', implemented: false },
  ] },
  { kind: 'fw', label: 'Firewall / Network', providers: [
    { provider: 'cisco_devnet', label: 'Cisco DevNet (sandbox)', free: 'trial', implemented: false },
  ] },
]
