-- CyberRx — Phase 1 Foundation: RLS, role model, append-only + signed ledger
--
-- Model: a caller (auth.uid()) sees ONLY rows whose tenant_id is one of their
-- memberships. Writes additionally require an allowed role. The decision ledger
-- and audit log are append-only and hash-chained — immutability is enforced by
-- the database (triggers), not by the UI.

-- ── Helper functions (SECURITY DEFINER so they bypass RLS on memberships,
--    which avoids policy recursion; each only ever checks the caller's own rows)
create or replace function app.is_member(t uuid)
returns boolean language sql stable security definer set search_path = public, app as $$
  select exists (
    select 1 from public.memberships m
    where m.user_id = auth.uid() and m.tenant_id = t
  );
$$;

create or replace function app.has_role(t uuid, roles app.role[])
returns boolean language sql stable security definer set search_path = public, app as $$
  select exists (
    select 1 from public.memberships m
    where m.user_id = auth.uid() and m.tenant_id = t and m.role = any(roles)
  );
$$;

-- Append-only guard: block any UPDATE/DELETE, for every role including
-- service_role (triggers fire regardless of RLS bypass).
create or replace function app.deny_mutation()
returns trigger language plpgsql as $$
begin
  raise exception 'append-only: % is not permitted on %', tg_op, tg_table_name
    using errcode = 'check_violation';
end;
$$;

-- Hash-chain + sign a decision on insert (tamper-evident ledger).
create or replace function app.sign_decision()
returns trigger language plpgsql as $$
declare prev text;
begin
  select row_hash into prev from public.decisions
   where tenant_id = new.tenant_id order by recorded_at desc, id desc limit 1;
  new.prev_hash := prev;
  new.row_hash := encode(digest(
    coalesce(prev,'') || new.tenant_id::text || new.seat::text || new.title ||
    coalesce(new.rationale,'') || coalesce(new.chosen_option::text,'') ||
    new.evidence_snapshot::text || new.recorded_at::text, 'sha256'), 'hex');
  return new;
end;
$$;

-- Hash-chain + sign an audit_log entry on insert.
create or replace function app.sign_audit()
returns trigger language plpgsql as $$
declare prev text;
begin
  select row_hash into prev from public.audit_log
   where tenant_id = new.tenant_id order by created_at desc, id desc limit 1;
  new.prev_hash := prev;
  new.row_hash := encode(digest(
    coalesce(prev,'') || new.tenant_id::text || new.action ||
    coalesce(new.object_type,'') || coalesce(new.object_id::text,'') ||
    new.detail::text || new.created_at::text, 'sha256'), 'hex');
  return new;
end;
$$;

create trigger sign_decision_ins before insert on public.decisions
  for each row execute function app.sign_decision();
create trigger no_mutate_decisions before update or delete on public.decisions
  for each row execute function app.deny_mutation();

create trigger sign_audit_ins before insert on public.audit_log
  for each row execute function app.sign_audit();
create trigger no_mutate_audit before update or delete on public.audit_log
  for each row execute function app.deny_mutation();

-- ── Enable + FORCE RLS on every tenant-scoped table ───────────────────────
do $$
declare t text;
begin
  foreach t in array array[
    'tenants','memberships','connectors','evidence','control_status',
    'decisions','tickets','assumptions','incident_plan','contacts',
    'benchmark_contributions','audit_log'
  ] loop
    execute format('alter table public.%I enable row level security;', t);
    execute format('alter table public.%I force row level security;', t);
  end loop;
end $$;

-- Global catalogs: readable by any authenticated user, writable only by
-- service_role (catalog loaders run server-side). RLS on, no broad write policy.
alter table public.frameworks enable row level security;
alter table public.controls   enable row level security;
create policy frameworks_read on public.frameworks for select to authenticated using (true);
create policy controls_read   on public.controls   for select to authenticated using (true);

-- ── tenants: members read; Admin updates ─────────────────────────────────
create policy tenants_read on public.tenants
  for select to authenticated using (app.is_member(id));
create policy tenants_update on public.tenants
  for update to authenticated
  using (app.has_role(id, array['Admin']::app.role[]))
  with check (app.has_role(id, array['Admin']::app.role[]));

-- ── memberships: a user sees their own; Admin manages tenant memberships ──
create policy memberships_read on public.memberships
  for select to authenticated
  using (user_id = auth.uid() or app.has_role(tenant_id, array['Admin']::app.role[]));
create policy memberships_write on public.memberships
  for all to authenticated
  using (app.has_role(tenant_id, array['Admin']::app.role[]))
  with check (app.has_role(tenant_id, array['Admin']::app.role[]));

-- ── Generic tenant tables: members read; role-scoped writes ───────────────
-- connectors / incident_plan / contacts: Admin (CISO also for incident plan) writes.
create policy connectors_read on public.connectors
  for select to authenticated using (app.is_member(tenant_id));
create policy connectors_write on public.connectors
  for all to authenticated
  using (app.has_role(tenant_id, array['Admin']::app.role[]))
  with check (app.has_role(tenant_id, array['Admin']::app.role[]));

create policy evidence_read on public.evidence
  for select to authenticated using (app.is_member(tenant_id));
-- evidence is written by the ingestion pipeline (service_role); no client writes.

create policy control_status_read on public.control_status
  for select to authenticated using (app.is_member(tenant_id));
create policy control_status_write on public.control_status
  for all to authenticated
  using (app.has_role(tenant_id, array['CISO','Admin']::app.role[]))
  with check (app.has_role(tenant_id, array['CISO','Admin']::app.role[]));

-- decisions: members read; any member may record (insert) a decision for their
-- tenant; updates/deletes are blocked outright by the append-only trigger.
create policy decisions_read on public.decisions
  for select to authenticated using (app.is_member(tenant_id));
create policy decisions_insert on public.decisions
  for insert to authenticated with check (app.is_member(tenant_id));

create policy tickets_read on public.tickets
  for select to authenticated using (app.is_member(tenant_id));
create policy tickets_write on public.tickets
  for all to authenticated
  using (app.is_member(tenant_id)) with check (app.is_member(tenant_id));

create policy assumptions_read on public.assumptions
  for select to authenticated using (app.is_member(tenant_id));
create policy assumptions_write on public.assumptions
  for all to authenticated
  using (app.is_member(tenant_id)) with check (app.is_member(tenant_id));

create policy incident_plan_read on public.incident_plan
  for select to authenticated using (app.is_member(tenant_id));
create policy incident_plan_write on public.incident_plan
  for all to authenticated
  using (app.has_role(tenant_id, array['CISO','Admin']::app.role[]))
  with check (app.has_role(tenant_id, array['CISO','Admin']::app.role[]));

create policy contacts_read on public.contacts
  for select to authenticated using (app.is_member(tenant_id));
create policy contacts_write on public.contacts
  for all to authenticated
  using (app.has_role(tenant_id, array['CISO','Admin']::app.role[]))
  with check (app.has_role(tenant_id, array['CISO','Admin']::app.role[]));

create policy benchmark_read on public.benchmark_contributions
  for select to authenticated using (app.is_member(tenant_id));
create policy benchmark_write on public.benchmark_contributions
  for all to authenticated
  using (app.is_member(tenant_id)) with check (app.is_member(tenant_id));

-- audit_log: members read; inserts via service_role only (no client insert
-- policy). Updates/deletes blocked by trigger.
create policy audit_read on public.audit_log
  for select to authenticated using (app.is_member(tenant_id));
