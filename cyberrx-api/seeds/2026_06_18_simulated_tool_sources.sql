-- Simulated live-source tool data (demo)
-- ----------------------------------------------------------------------------
-- Populates the per-tool source tables for three organizations with unique,
-- realistic data. The SimulatedToolService aggregates these rows with the SAME
-- logic the live connectors use against the real vendor APIs, so each org gets
-- its own MFA adoption, phishing failure rate, patch compliance, etc.
--
--   Org                                        MFA  EDR  SIEM Phish Patch MTTR MTTD PAM Train
--   blue-cross-blue-shield-of-massachusetts    78%  71%  14d  9.2%  63%   6.8h 47h  43% 71%
--   cigna-healthcare                           92%  88%  90d  3.4%  85%   3.2h 18h  76% 94%
--   meridian-health-plan-demo                  64%  59%  7d   14%   48%  11.5h 76h  31% 55%
--
-- Idempotent (ON CONFLICT DO NOTHING). Row volumes are sized so the
-- aggregations produce the percentages above exactly.

-- Make sure all three orgs exist --------------------------------------------
INSERT INTO orgs (id, name, type) VALUES
  ('cigna-healthcare', 'Cigna Healthcare', 'Commercial'),
  ('meridian-health-plan-demo', 'Meridian Health Plan (Demo)', 'Medicaid MCO')
ON CONFLICT (id) DO NOTHING;

-- ============================================================================
-- OKTA — users + MFA factors  (connector: GET /api/v1/users, /users/{id}/factors)
-- mfa_pct = % of ACTIVE users with >= 1 ACTIVE factor
-- ============================================================================
INSERT INTO sim_okta_users (org_id, user_id, email, status, last_login)
SELECT o.org, 'okta-u-'||g, 'user'||g||'@'||o.dom, 'ACTIVE', NOW() - (g % 72 || ' hours')::interval
FROM generate_series(1, 200) g,
     (VALUES ('blue-cross-blue-shield-of-massachusetts','bcbsma.example'),
             ('cigna-healthcare','cigna.example'),
             ('meridian-health-plan-demo','meridianhp.example')) AS o(org, dom)
ON CONFLICT DO NOTHING;

-- Enrolled users get one ACTIVE factor: BCBS 156/200=78%, Cigna 184/200=92%, Meridian 128/200=64%
INSERT INTO sim_okta_factors (org_id, user_id, factor_id, factor_type, status)
SELECT o.org, 'okta-u-'||g, o.org||'-fct-'||g,
       CASE g % 3 WHEN 0 THEN 'push' WHEN 1 THEN 'token:software:totp' ELSE 'webauthn' END,
       'ACTIVE'
FROM generate_series(1, 200) g,
     (VALUES ('blue-cross-blue-shield-of-massachusetts', 156),
             ('cigna-healthcare', 184),
             ('meridian-health-plan-demo', 128)) AS o(org, enrolled)
WHERE g <= o.enrolled
ON CONFLICT DO NOTHING;

-- ============================================================================
-- CROWDSTRIKE — devices  (connector: /devices/queries/devices/v1 +status filter)
-- edr_pct = % of devices with status 'normal'
-- ============================================================================
INSERT INTO sim_crowdstrike_devices (org_id, device_id, hostname, platform, status, last_seen)
SELECT o.org, o.org||'-dev-'||g, 'host-'||g,
       CASE g % 4 WHEN 0 THEN 'Mac' WHEN 1 THEN 'Linux' ELSE 'Windows' END,
       CASE WHEN g <= o.normal THEN 'normal' WHEN g % 2 = 0 THEN 'offline' ELSE 'no_sensor' END,
       NOW() - (g % 48 || ' hours')::interval
FROM generate_series(1, 100) g,
     (VALUES ('blue-cross-blue-shield-of-massachusetts', 71),
             ('cigna-healthcare', 88),
             ('meridian-health-plan-demo', 59)) AS o(org, normal)
ON CONFLICT DO NOTHING;

-- ============================================================================
-- SPLUNK — indexes  (connector: /services/data/indexes, frozenTimePeriodInSecs)
-- siem_days = MIN retention (days) across key indexes (main/audittrail/wineventlog/syslog)
-- ============================================================================
INSERT INTO sim_splunk_indexes (org_id, index_name, frozen_time_period_in_secs, current_db_size_mb) VALUES
  ('blue-cross-blue-shield-of-massachusetts','main',        14*86400, 51200),
  ('blue-cross-blue-shield-of-massachusetts','wineventlog', 30*86400, 20480),
  ('blue-cross-blue-shield-of-massachusetts','syslog',      21*86400, 8192),
  ('blue-cross-blue-shield-of-massachusetts','_internal',   7*86400,  4096),
  ('cigna-healthcare','main',        90*86400, 102400),
  ('cigna-healthcare','audittrail',  365*86400, 30720),
  ('cigna-healthcare','wineventlog', 90*86400, 40960),
  ('cigna-healthcare','syslog',      180*86400, 16384),
  ('meridian-health-plan-demo','main',        7*86400, 10240),
  ('meridian-health-plan-demo','wineventlog', 14*86400, 6144),
  ('meridian-health-plan-demo','syslog',      7*86400,  2048)
ON CONFLICT DO NOTHING;

-- ============================================================================
-- KNOWBE4 — phishing campaigns  (connector: /v1/phishing/campaigns + results)
-- phishing_pct = clicked / recipients * 100 for the latest closed campaign
-- ============================================================================
INSERT INTO sim_knowbe4_campaigns (org_id, campaign_id, name, status, started_at, recipient_count, clicked_count) VALUES
  ('blue-cross-blue-shield-of-massachusetts', 101, 'Q2 Invoice Lure',     'Closed', NOW() - INTERVAL '12 days', 500, 46),
  ('blue-cross-blue-shield-of-massachusetts', 100, 'Q1 Password Reset',   'Closed', NOW() - INTERVAL '95 days', 500, 61),
  ('cigna-healthcare',                        201, 'Q2 Shipping Notice',  'Closed', NOW() - INTERVAL '9 days',  500, 17),
  ('cigna-healthcare',                        200, 'Q1 HR Benefits',      'Closed', NOW() - INTERVAL '100 days',500, 24),
  ('meridian-health-plan-demo',               301, 'Q2 MFA Fatigue',      'Closed', NOW() - INTERVAL '15 days', 500, 70),
  ('meridian-health-plan-demo',               300, 'Q1 Gift Card',        'Closed', NOW() - INTERVAL '98 days', 500, 85)
ON CONFLICT DO NOTHING;

-- ============================================================================
-- TENABLE — assets + critical vulns  (connector: /workbenches/assets/vulnerabilities/info)
-- patch_pct    = 100 - (critical open past-SLA vulns / asset count * 100)
-- vuln_sla_pct = % of open critical vulns NOT past SLA
-- 100 assets, 100 open critical vulns per org; past-SLA: BCBS 37, Cigna 15, Meridian 52
-- ============================================================================
INSERT INTO sim_tenable_assets (org_id, asset_id, hostname, ipv4)
SELECT o.org, o.org||'-ast-'||g, 'srv-'||g||'.corp', '10.'||(g/250)||'.'||(g%250)||'.'||(g%200+1)
FROM generate_series(1, 100) g,
     (VALUES ('blue-cross-blue-shield-of-massachusetts'),
             ('cigna-healthcare'),
             ('meridian-health-plan-demo')) AS o(org)
ON CONFLICT DO NOTHING;

INSERT INTO sim_tenable_vulns (org_id, vuln_id, asset_id, cve, severity, state, past_sla, first_seen)
SELECT o.org, o.org||'-vln-'||g, o.org||'-ast-'||(g % 100 + 1),
       'CVE-2024-'||(1000+g), 'critical', 'open', g <= o.past_sla,
       NOW() - (g % 60 + 5 || ' days')::interval
FROM generate_series(1, 100) g,
     (VALUES ('blue-cross-blue-shield-of-massachusetts', 37),
             ('cigna-healthcare', 15),
             ('meridian-health-plan-demo', 52)) AS o(org, past_sla)
ON CONFLICT DO NOTHING;

-- ============================================================================
-- SERVICENOW — P1/P2 incidents  (connector: /api/now/table/incident)
-- mttr_hrs = avg(resolved_at - sys_created_on); mttd_hrs = avg(sys_created_on - occurred_at)
-- 20 resolved incidents per org with fixed deltas equal to the target averages
-- ============================================================================
INSERT INTO sim_servicenow_incidents (org_id, number, priority, occurred_at, sys_created_on, resolved_at, short_description)
SELECT o.org, o.org||'-INC'||lpad(g::text, 4, '0'), (g % 2) + 1,
       NOW() - (g||' days')::interval - (o.mttd||' hours')::interval,
       NOW() - (g||' days')::interval,
       NOW() - (g||' days')::interval + (o.mttr||' hours')::interval,
       'P'||((g % 2) + 1)||' security incident #'||g
FROM generate_series(1, 20) g,
     (VALUES ('blue-cross-blue-shield-of-massachusetts', 6.8, 47.0),
             ('cigna-healthcare', 3.2, 18.0),
             ('meridian-health-plan-demo', 11.5, 76.0)) AS o(org, mttr, mttd)
ON CONFLICT DO NOTHING;

-- ============================================================================
-- CYBERARK — privileged accounts  (connector: /PasswordVault/API/Accounts)
-- pam_pct = vaulted privileged accounts / total privileged accounts * 100
-- 120 privileged accounts per org; vaulted: BCBS 52 (43%), Cigna 91 (76%), Meridian 37 (31%)
-- ============================================================================
INSERT INTO sim_cyberark_accounts (org_id, account_id, account_name, platform, privileged, vaulted)
SELECT o.org, o.org||'-pa-'||g, 'svc-admin-'||g,
       CASE g % 4 WHEN 0 THEN 'UnixSSH' WHEN 1 THEN 'Oracle' WHEN 2 THEN 'AzureAD' ELSE 'WinDomain' END,
       true, g <= o.vaulted
FROM generate_series(1, 120) g,
     (VALUES ('blue-cross-blue-shield-of-massachusetts', 52),
             ('cigna-healthcare', 91),
             ('meridian-health-plan-demo', 37)) AS o(org, vaulted)
ON CONFLICT DO NOTHING;

-- ============================================================================
-- WORKDAY / LMS — workers + security training  (connector: workers + enrollments)
-- training_pct = workers with training_completed / total workers * 100
-- 150 workers per org; completed: BCBS 107 (71%), Cigna 141 (94%), Meridian 82 (55%)
-- ============================================================================
INSERT INTO sim_workday_workers (org_id, worker_id, department, training_completed, completed_date)
SELECT o.org, o.org||'-wk-'||g,
       CASE g % 5 WHEN 0 THEN 'Claims' WHEN 1 THEN 'IT' WHEN 2 THEN 'Member Services' WHEN 3 THEN 'Finance' ELSE 'Clinical' END,
       g <= o.done, CASE WHEN g <= o.done THEN CURRENT_DATE - (g % 90) END
FROM generate_series(1, 150) g,
     (VALUES ('blue-cross-blue-shield-of-massachusetts', 107),
             ('cigna-healthcare', 141),
             ('meridian-health-plan-demo', 82)) AS o(org, done)
ON CONFLICT DO NOTHING;
