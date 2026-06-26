-- CyberRx — Phase 8 (connector ingestion): secret storage for vendor credentials
--
-- Vendor API credentials are NOT stored in connectors.config (which is non-secret
-- by contract). They live here, in a table that NO client role can touch: RLS is
-- forced and there are deliberately ZERO policies, so `authenticated`/`anon` can
-- neither read nor write. Only `service_role` (which bypasses RLS) — i.e. the
-- ingest / set-connector-secret Edge Functions — may access a secret.
--
-- PRODUCTION NOTE: prefer Supabase Vault (pgsodium) for envelope encryption at
-- rest. This table is the minimal portable equivalent; treat `secret` as
-- sensitive and restrict service-role key distribution accordingly.

create table public.connector_secrets (
  connector_id  uuid primary key references public.connectors(id) on delete cascade,
  tenant_id     uuid not null references public.tenants(id) on delete cascade,
  provider      text not null,                 -- okta|servicenow|msgraph|... selects the adapter
  secret        jsonb not null,                -- { token } / { instance, user, pass } / { tenantId, clientId, clientSecret }
  updated_by    uuid references auth.users(id),
  updated_at    timestamptz not null default now()
);
create index on public.connector_secrets (tenant_id);

alter table public.connector_secrets enable row level security;
alter table public.connector_secrets force row level security;
-- (no policies on purpose — service_role only)

-- Convenience: where the chosen vendor/provider for a connector is recorded
-- (non-secret) so the ingest orchestrator knows which adapter to run.
alter table public.connectors add column if not exists provider text;
