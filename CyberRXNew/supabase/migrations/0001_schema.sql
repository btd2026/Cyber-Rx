-- Nerion — Phase 1 Foundation: core schema
-- Every tenant-scoped table carries `tenant_id`. Authoritative framework
-- catalogs (frameworks, controls) are deliberately global reference data with
-- NO tenant_id — they contain no customer information and are shared verbatim
-- across tenants; only per-tenant *status* (control_status) is isolated.
--
-- This migration is Supabase-compatible: it references auth.users and auth.uid()
-- which exist on Supabase. For local testing, scripts/local/00_supabase_shim.sql
-- provides the same auth surface.

create extension if not exists pgcrypto;     -- gen_random_uuid(), digest()

create schema if not exists app;             -- helper functions live here

-- ── Enums ────────────────────────────────────────────────────────────────
create type app.role as enum
  ('CEO','CISO','CFO','CIO','CLO','CRO','Board','Admin');

create type app.evidence_leaf as enum ('pulled','assumption');
create type app.decision_status as enum ('open','recorded','superseded');
create type app.connector_status as enum
  ('not_configured','healthy','degraded','error');

-- ── tenants ──────────────────────────────────────────────────────────────
-- The tenant row's id IS the tenant_id used everywhere else.
create table public.tenants (
  id                     uuid primary key default gen_random_uuid(),
  name                   text not null,
  industry               text,
  ownership              text,
  regions                text[] not null default '{}',
  regulated_data_types   text[] not null default '{}',
  primary_currency       char(3) not null default 'USD',   -- ISO 4217
  materiality_threshold  numeric,
  created_at             timestamptz not null default now()
);

-- ── memberships (user ↔ tenant ↔ role) ───────────────────────────────────
-- The "users" of the brief are Supabase auth.users; membership grants a role
-- within a tenant and drives all RBAC.
create table public.memberships (
  id          uuid primary key default gen_random_uuid(),
  tenant_id   uuid not null references public.tenants(id) on delete cascade,
  user_id     uuid not null references auth.users(id) on delete cascade,
  role        app.role not null,
  created_at  timestamptz not null default now(),
  unique (tenant_id, user_id, role)
);
create index on public.memberships (user_id);
create index on public.memberships (tenant_id);

-- ── connectors (read-only integration config; secrets NOT stored here) ────
create table public.connectors (
  id            uuid primary key default gen_random_uuid(),
  tenant_id     uuid not null references public.tenants(id) on delete cascade,
  kind          text not null,        -- edr|siem|idp|cspm|vuln|email|backup|mdm|itsm|cloud_bill|hris|contracts
  display_name  text not null,
  status        app.connector_status not null default 'not_configured',
  config        jsonb not null default '{}',   -- non-secret config only
  last_sync_at  timestamptz,
  health        jsonb not null default '{}',
  created_at    timestamptz not null default now()
);
create index on public.connectors (tenant_id);

-- ── evidence (the spine) ─────────────────────────────────────────────────
create table public.evidence (
  id                uuid primary key default gen_random_uuid(),
  tenant_id         uuid not null references public.tenants(id) on delete cascade,
  connector_id      uuid references public.connectors(id) on delete set null,
  source_system     text not null,
  kind              text not null,
  value             jsonb not null,
  collected_at      timestamptz not null,
  freshness_seconds integer,
  content_hash      text not null,      -- sha256 of normalized value — citable & tamper-evident
  leaf_type         app.evidence_leaf,  -- for financial leaves: pulled vs assumption
  created_at        timestamptz not null default now()
);
create index on public.evidence (tenant_id);
create index on public.evidence (tenant_id, kind);

-- ── framework catalogs (GLOBAL reference data — no tenant_id) ─────────────
create table public.frameworks (
  id          uuid primary key default gen_random_uuid(),
  key         text not null unique,   -- CSF_2_0|NIST_800_53|CIS_V8|ISO_27001_2022|SOC_2
  name        text not null,
  version     text,
  source_url  text
);

create table public.controls (
  id                 uuid primary key default gen_random_uuid(),
  framework_id       uuid not null references public.frameworks(id) on delete cascade,
  control_id         text not null,     -- verbatim catalog id, e.g. 'PR.AC-1'
  title              text not null,     -- verbatim catalog title
  parent_control_id  text,
  unique (framework_id, control_id)
);

-- ── control_status (per-tenant maturity — isolated) ───────────────────────
create table public.control_status (
  id                   uuid primary key default gen_random_uuid(),
  tenant_id            uuid not null references public.tenants(id) on delete cascade,
  control_id           uuid not null references public.controls(id) on delete cascade,
  cmmi_maturity        smallint check (cmmi_maturity between 0 and 5),
  status               text,            -- pass|fail|partial|no_data
  confidence           numeric,         -- 0..1, mechanical from coverage+freshness
  analyst_review_state text not null default 'unreviewed',
  proposed_by          text,            -- engine|llm|analyst
  citation             jsonb,           -- evidence references backing a proposal
  updated_at           timestamptz not null default now(),
  unique (tenant_id, control_id)
);
create index on public.control_status (tenant_id);

-- ── decisions (the ledger — append-only, signed; see 0002 triggers) ───────
create table public.decisions (
  id                    uuid primary key default gen_random_uuid(),
  tenant_id             uuid not null references public.tenants(id) on delete cascade,
  seat                  app.role not null,
  title                 text not null,
  decision_type         text,
  owner_user_id         uuid not null references auth.users(id),
  rationale             text,
  options               jsonb not null default '[]',
  chosen_option         jsonb,
  evidence_snapshot     jsonb not null,    -- evidence known at the time
  residual_risk_amount  numeric,
  residual_risk_currency char(3),
  status                app.decision_status not null default 'recorded',
  re_review_trigger     jsonb,
  prev_hash             text,              -- hash chain (set by trigger)
  row_hash              text,              -- signature over the row (set by trigger)
  recorded_at           timestamptz not null default now()
);
create index on public.decisions (tenant_id);

-- ── tickets ──────────────────────────────────────────────────────────────
create table public.tickets (
  id               uuid primary key default gen_random_uuid(),
  tenant_id        uuid not null references public.tenants(id) on delete cascade,
  decision_id      uuid references public.decisions(id) on delete set null,
  external_system  text not null,     -- jira|servicenow
  external_id      text,
  title            text not null,
  status           text,
  due_date         date,
  created_at       timestamptz not null default now()
);
create index on public.tickets (tenant_id);

-- ── assumptions (owned values w/ version history) ─────────────────────────
create table public.assumptions (
  id             uuid primary key default gen_random_uuid(),
  tenant_id      uuid not null references public.tenants(id) on delete cascade,
  key            text not null,       -- loaded_labor_rate|downtime_per_hour|breach_cost_per_record|...
  value          numeric not null,
  currency       char(3),
  unit           text,
  owner_user_id  uuid references auth.users(id),
  basis          text,                -- benchmark / source label
  version        integer not null default 1,
  superseded_by  uuid references public.assumptions(id),
  created_at     timestamptz not null default now()
);
create index on public.assumptions (tenant_id);

-- ── incident plan + 24/7 call tree ───────────────────────────────────────
create table public.incident_plan (
  id                uuid primary key default gen_random_uuid(),
  tenant_id         uuid not null references public.tenants(id) on delete cascade,
  document_path     text,            -- storage path to IR plan / playbooks
  playbooks         jsonb not null default '[]',
  last_verified_at  timestamptz,
  created_at        timestamptz not null default now()
);
create index on public.incident_plan (tenant_id);

create table public.contacts (
  id                uuid primary key default gen_random_uuid(),
  tenant_id         uuid not null references public.tenants(id) on delete cascade,
  incident_plan_id  uuid references public.incident_plan(id) on delete cascade,
  role              text not null,
  name              text not null,
  phone             text not null,
  is_external       boolean not null default false,
  created_at        timestamptz not null default now()
);
create index on public.contacts (tenant_id);

-- ── benchmark contributions (opt-in, high-level maturity only) ────────────
create table public.benchmark_contributions (
  id              uuid primary key default gen_random_uuid(),
  tenant_id       uuid not null references public.tenants(id) on delete cascade,
  framework_id    uuid references public.frameworks(id),
  cmmi_maturity   numeric not null,   -- high-level maturity only — never findings/identifiers
  consented       boolean not null default false,
  contributed_at  timestamptz not null default now()
);
create index on public.benchmark_contributions (tenant_id);

-- ── audit_log (append-only, signed; see 0002 triggers) ────────────────────
create table public.audit_log (
  id             uuid primary key default gen_random_uuid(),
  tenant_id      uuid not null references public.tenants(id) on delete cascade,
  actor_user_id  uuid,
  action         text not null,       -- view|compute|model_call|export|decision
  object_type    text,
  object_id      uuid,
  detail         jsonb not null default '{}',
  prev_hash      text,
  row_hash       text,
  created_at     timestamptz not null default now()
);
create index on public.audit_log (tenant_id);
