-- Simulated live-source tool databases (demo)
-- ----------------------------------------------------------------------------
-- One table per security tool, mirroring the records the real connector reads
-- from each vendor API (see src/routes/tools.js for the live retrieval logic):
--
--   Tool         Real API read by connector                         Metric
--   -----------  -------------------------------------------------  -----------
--   Okta         GET /api/v1/users?filter=status eq "ACTIVE"        mfa_pct
--                GET /api/v1/users/{id}/factors
--   CrowdStrike  GET /devices/queries/devices/v1 (+status filter)   edr_pct
--   Splunk       GET /services/data/indexes (frozenTimePeriodInSecs) siem_days
--   KnowBe4      GET /v1/phishing/campaigns + results               phishing_pct
--   Tenable      GET /workbenches/assets/vulnerabilities/info       patch_pct,
--                                                                   vuln_sla_pct
--   ServiceNow   GET /api/now/table/incident (P1/P2 resolved)       mttr_hrs,
--                                                                   mttd_hrs
--   CyberArk     GET /PasswordVault/API/Accounts                    pam_pct
--   Workday/LMS  GET /workers + learning enrollments                training_pct
--
-- Every table is org-scoped (org_id). Orgs may only read their own rows;
-- admins can read all (see src/routes/sources.js).

CREATE TABLE IF NOT EXISTS sim_okta_users (
  org_id     TEXT NOT NULL,
  user_id    TEXT NOT NULL,
  email      TEXT,
  status     TEXT DEFAULT 'ACTIVE',
  last_login TIMESTAMPTZ,
  PRIMARY KEY (org_id, user_id)
);

CREATE TABLE IF NOT EXISTS sim_okta_factors (
  org_id      TEXT NOT NULL,
  user_id     TEXT NOT NULL,
  factor_id   TEXT NOT NULL,
  factor_type TEXT,             -- push | token:software:totp | sms | webauthn
  status      TEXT DEFAULT 'ACTIVE',
  PRIMARY KEY (org_id, factor_id)
);

CREATE TABLE IF NOT EXISTS sim_crowdstrike_devices (
  org_id    TEXT NOT NULL,
  device_id TEXT NOT NULL,
  hostname  TEXT,
  platform  TEXT,               -- Windows | Mac | Linux
  status    TEXT,               -- normal | offline | no_sensor
  last_seen TIMESTAMPTZ,
  PRIMARY KEY (org_id, device_id)
);

CREATE TABLE IF NOT EXISTS sim_splunk_indexes (
  org_id                      TEXT NOT NULL,
  index_name                  TEXT NOT NULL,
  frozen_time_period_in_secs  BIGINT,        -- retention in seconds
  current_db_size_mb          INTEGER,
  PRIMARY KEY (org_id, index_name)
);

CREATE TABLE IF NOT EXISTS sim_knowbe4_campaigns (
  org_id          TEXT NOT NULL,
  campaign_id     INTEGER NOT NULL,
  name            TEXT,
  status          TEXT DEFAULT 'Closed',
  started_at      TIMESTAMPTZ,
  recipient_count INTEGER,
  clicked_count   INTEGER,
  PRIMARY KEY (org_id, campaign_id)
);

CREATE TABLE IF NOT EXISTS sim_tenable_assets (
  org_id    TEXT NOT NULL,
  asset_id  TEXT NOT NULL,
  hostname  TEXT,
  ipv4      TEXT,
  PRIMARY KEY (org_id, asset_id)
);

CREATE TABLE IF NOT EXISTS sim_tenable_vulns (
  org_id    TEXT NOT NULL,
  vuln_id   TEXT NOT NULL,
  asset_id  TEXT,
  cve       TEXT,
  severity  TEXT,               -- critical | high | medium | low
  state     TEXT,               -- open | fixed
  past_sla  BOOLEAN DEFAULT false,
  first_seen TIMESTAMPTZ,
  PRIMARY KEY (org_id, vuln_id)
);

CREATE TABLE IF NOT EXISTS sim_servicenow_incidents (
  org_id        TEXT NOT NULL,
  number        TEXT NOT NULL,
  priority      INTEGER,        -- 1..4
  occurred_at   TIMESTAMPTZ,    -- when the issue actually began (for MTTD)
  sys_created_on TIMESTAMPTZ,   -- when detected/logged
  resolved_at   TIMESTAMPTZ,
  short_description TEXT,
  PRIMARY KEY (org_id, number)
);

CREATE TABLE IF NOT EXISTS sim_cyberark_accounts (
  org_id       TEXT NOT NULL,
  account_id   TEXT NOT NULL,
  account_name TEXT,
  platform     TEXT,            -- WinDomain | UnixSSH | Oracle | AzureAD
  privileged   BOOLEAN DEFAULT true,
  vaulted      BOOLEAN DEFAULT false,
  PRIMARY KEY (org_id, account_id)
);

CREATE TABLE IF NOT EXISTS sim_workday_workers (
  org_id            TEXT NOT NULL,
  worker_id         TEXT NOT NULL,
  department        TEXT,
  training_completed BOOLEAN DEFAULT false,
  completed_date    DATE,
  PRIMARY KEY (org_id, worker_id)
);

CREATE INDEX IF NOT EXISTS sim_okta_users_org ON sim_okta_users(org_id);
CREATE INDEX IF NOT EXISTS sim_okta_factors_org_user ON sim_okta_factors(org_id, user_id);
CREATE INDEX IF NOT EXISTS sim_cs_devices_org ON sim_crowdstrike_devices(org_id);
CREATE INDEX IF NOT EXISTS sim_splunk_idx_org ON sim_splunk_indexes(org_id);
CREATE INDEX IF NOT EXISTS sim_kb4_org ON sim_knowbe4_campaigns(org_id);
CREATE INDEX IF NOT EXISTS sim_tenable_assets_org ON sim_tenable_assets(org_id);
CREATE INDEX IF NOT EXISTS sim_tenable_vulns_org ON sim_tenable_vulns(org_id);
CREATE INDEX IF NOT EXISTS sim_snow_org ON sim_servicenow_incidents(org_id);
CREATE INDEX IF NOT EXISTS sim_cyberark_org ON sim_cyberark_accounts(org_id);
CREATE INDEX IF NOT EXISTS sim_workday_org ON sim_workday_workers(org_id);
