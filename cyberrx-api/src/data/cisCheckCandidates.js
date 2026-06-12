'use strict';

/**
 * cisCheckCandidates — STEP B3 follow-through
 * -------------------------------------------
 * Automated checks for the 35 CIS v8.1.2 safeguards that had NO existing
 * telemetry signal (the "new-check candidates" listed in FOLLOW_UPS.md). Each
 * entry defines a parameterized check tied to a representative tool in the
 * catalog, the metric_inputs `signal` it evaluates, a pass threshold, and a
 * mock-fixture default so the validation runner produces an honest
 * pass/partial/fail (per the spec's mock-fixture connector model) instead of a
 * silent 'skipped'. Supplying a live connection for the named tool flips the
 * result source from 'simulated' to 'live' with no code change.
 *
 * `sg`        CIS safeguard id (matches framework_requirements.requirement_id)
 * `tool`      tool_id from data/securityToolCatalog.js (source attribution)
 * `signal`    metric_inputs key the runner evaluates
 * `threshold` pass cutoff; `direction` 'gte' (higher better) | 'lte' (lower better)
 * `fixture`   mock-fixture default seeded into metric_inputs('_defaults')
 * `coverage`  'full' when the telemetry fully evidences the safeguard,
 *             'partial' when a process/attestation completes it
 *
 * Fixtures are deliberately mixed (pass/partial/fail) so the dashboards reflect
 * a realistic posture, not a wall of green.
 */

const CIS_CHECKS = [
  // --- CIS 1 — Enterprise Asset Inventory -----------------------------------
  { sg: '1.2',  tool: 'axonius',           signal: 'cis_unauthorized_asset_pct',     name: 'Unauthorized assets addressed (quarantine/remove) %', threshold: 95, direction: 'gte', fixture: 88, coverage: 'full' },
  { sg: '1.3',  tool: 'axonius',           signal: 'cis_active_discovery_pct',       name: 'Active asset discovery coverage %',                   threshold: 90, direction: 'gte', fixture: 92, coverage: 'full' },
  // --- CIS 2 — Software Inventory & Allowlisting ----------------------------
  { sg: '2.4',  tool: 'axonius',           signal: 'cis_software_inventory_pct',     name: 'Automated software inventory coverage %',             threshold: 90, direction: 'gte', fixture: 85, coverage: 'full' },
  { sg: '2.5',  tool: 'defender_endpoint', signal: 'cis_software_allowlist_pct',     name: 'Authorized-software allowlisting coverage %',         threshold: 90, direction: 'gte', fixture: 70, coverage: 'full' },
  { sg: '2.6',  tool: 'defender_endpoint', signal: 'cis_library_allowlist_pct',      name: 'Authorized-library allowlisting coverage %',          threshold: 90, direction: 'gte', fixture: 60, coverage: 'full' },
  { sg: '2.7',  tool: 'defender_endpoint', signal: 'cis_script_allowlist_pct',       name: 'Authorized-script allowlisting coverage %',           threshold: 90, direction: 'gte', fixture: 65, coverage: 'full' },
  // --- CIS 4 — Secure Configuration -----------------------------------------
  { sg: '4.2',  tool: 'panorama',          signal: 'cis_net_secure_config_pct',      name: 'Network infrastructure secure-config compliance %',   threshold: 95, direction: 'gte', fixture: 90, coverage: 'full' },
  { sg: '4.5',  tool: 'defender_endpoint', signal: 'cis_host_firewall_pct',          name: 'Host firewall enabled on end-user devices %',         threshold: 98, direction: 'gte', fixture: 96, coverage: 'full' },
  { sg: '4.10', tool: 'entra_id',          signal: 'cis_device_lockout_pct',         name: 'Automatic device lockout on portable devices %',      threshold: 95, direction: 'gte', fixture: 97, coverage: 'full' },
  // --- CIS 5 — Account Management --------------------------------------------
  { sg: '5.3',  tool: 'okta',              signal: 'cis_dormant_account_pct',        name: 'Dormant accounts disabled within 45 days %',          threshold: 95, direction: 'gte', fixture: 93, coverage: 'full' },
  { sg: '5.6',  tool: 'okta',              signal: 'cis_central_identity_pct',       name: 'Accounts under centralized identity management %',     threshold: 95, direction: 'gte', fixture: 98, coverage: 'full' },
  // --- CIS 7 — Continuous Vulnerability Management ---------------------------
  { sg: '7.2',  tool: 'tenable',           signal: 'cis_remediation_sla_pct',        name: 'Vulnerability remediations closed within SLA %',      threshold: 90, direction: 'gte', fixture: 82, coverage: 'partial' },
  // --- CIS 9 — Email & Web Browser Protections -------------------------------
  { sg: '9.2',  tool: 'zscaler',           signal: 'cis_dns_filtering_pct',          name: 'Endpoints behind DNS filtering %',                    threshold: 95, direction: 'gte', fixture: 99, coverage: 'full' },
  { sg: '9.4',  tool: 'defender_endpoint', signal: 'cis_browser_ext_control_pct',    name: 'Browser/email client extension control coverage %',   threshold: 90, direction: 'gte', fixture: 78, coverage: 'full' },
  { sg: '9.5',  tool: 'entra_id',          signal: 'cis_dmarc_enforced_pct',         name: 'Sending domains with DMARC p=reject/quarantine %',    threshold: 100, direction: 'gte', fixture: 100, coverage: 'full' },
  { sg: '9.6',  tool: 'zscaler',           signal: 'cis_email_filetype_block_pct',   name: 'Unnecessary file types blocked at the gateway %',     threshold: 95, direction: 'gte', fixture: 94, coverage: 'full' },
  // --- CIS 10 — Malware Defenses ---------------------------------------------
  { sg: '10.3', tool: 'defender_endpoint', signal: 'cis_removable_autorun_disabled_pct', name: 'Autorun/Autoplay disabled on endpoints %',        threshold: 98, direction: 'gte', fixture: 99, coverage: 'full' },
  // --- CIS 12 — Network Infrastructure Management ----------------------------
  { sg: '12.1', tool: 'panorama',          signal: 'cis_net_infra_current_pct',      name: 'Network infrastructure on supported/current firmware %', threshold: 95, direction: 'gte', fixture: 88, coverage: 'full' },
  { sg: '12.2', tool: 'panorama',          signal: 'cis_secure_net_arch_pct',        name: 'Network segments conforming to secure architecture %', threshold: 90, direction: 'gte', fixture: 85, coverage: 'partial' },
  { sg: '12.3', tool: 'panorama',          signal: 'cis_secure_net_mgmt_pct',        name: 'Network devices managed over secure channels %',      threshold: 95, direction: 'gte', fixture: 91, coverage: 'full' },
  { sg: '12.4', tool: 'servicenow_cmdb',   signal: 'cis_arch_diagram_pct',           name: 'Current network architecture diagram maintained %',   threshold: 100, direction: 'gte', fixture: 100, coverage: 'partial' },
  { sg: '12.5', tool: 'panorama',          signal: 'cis_network_aaa_pct',            name: 'Network access through centralized AAA %',            threshold: 95, direction: 'gte', fixture: 97, coverage: 'full' },
  { sg: '12.6', tool: 'panorama',          signal: 'cis_secure_mgmt_proto_pct',      name: 'Secure network management/comms protocols enforced %', threshold: 95, direction: 'gte', fixture: 96, coverage: 'full' },
  { sg: '12.7', tool: 'zscaler',           signal: 'cis_vpn_aaa_pct',                name: 'Remote devices on VPN with enterprise AAA %',         threshold: 95, direction: 'gte', fixture: 99, coverage: 'full' },
  { sg: '12.8', tool: 'cyberark',          signal: 'cis_admin_workstation_pct',      name: 'Administrative work on dedicated/PAW resources %',    threshold: 90, direction: 'gte', fixture: 72, coverage: 'full' },
  // --- CIS 13 — Network Monitoring & Defense ---------------------------------
  { sg: '13.4', tool: 'panorama',          signal: 'cis_segment_filtering_pct',      name: 'Traffic filtering enforced between segments %',       threshold: 90, direction: 'gte', fixture: 80, coverage: 'full' },
  { sg: '13.8', tool: 'panorama',          signal: 'cis_nips_coverage_pct',          name: 'Network IPS coverage at boundaries %',                threshold: 95, direction: 'gte', fixture: 93, coverage: 'full' },
  { sg: '13.9', tool: 'panorama',          signal: 'cis_port_nac_pct',               name: 'Port-level access control (802.1x/NAC) coverage %',   threshold: 90, direction: 'gte', fixture: 68, coverage: 'full' },
  { sg: '13.10',tool: 'panorama',          signal: 'cis_app_layer_filter_pct',       name: 'Application-layer filtering coverage %',              threshold: 90, direction: 'gte', fixture: 87, coverage: 'full' },
  { sg: '13.11',tool: 'splunk',            signal: 'cis_alert_tuning_pct',           name: 'Security alert rules tuned in last 90 days %',        threshold: 85, direction: 'gte', fixture: 90, coverage: 'partial' },
  // --- CIS 14 — Security Awareness -------------------------------------------
  { sg: '14.2', tool: 'knowbe4',           signal: 'cis_social_eng_training_pct',    name: 'Workforce trained on social-engineering recognition %', threshold: 95, direction: 'gte', fixture: 96, coverage: 'partial' },
  // --- CIS 16 — Application Software Security --------------------------------
  { sg: '16.8', tool: 'wiz',               signal: 'cis_env_separation_pct',         name: 'Production/non-production environments separated %',  threshold: 95, direction: 'gte', fixture: 89, coverage: 'full' },
  { sg: '16.12',tool: 'snyk',              signal: 'cis_code_security_pct',          name: 'Repositories with code-level security checks %',      threshold: 90, direction: 'gte', fixture: 84, coverage: 'full' },
  { sg: '16.14',tool: 'snyk',              signal: 'cis_threat_modeling_pct',        name: 'In-scope applications with threat models %',          threshold: 80, direction: 'gte', fixture: 60, coverage: 'partial' },
  // --- CIS 17 — Incident Response --------------------------------------------
  { sg: '17.8', tool: 'pagerduty',         signal: 'cis_post_incident_review_pct',   name: 'Incidents with completed post-incident review %',     threshold: 90, direction: 'gte', fixture: 95, coverage: 'partial' },
];

module.exports = { CIS_CHECKS };
