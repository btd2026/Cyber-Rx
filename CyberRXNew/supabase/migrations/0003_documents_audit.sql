-- CyberRx — Phase 7 (production wiring): documents store + audit-log triggers
--
-- Adds the `documents` table (uploaded evidence files in Storage) and makes the
-- signed, append-only audit_log actually populate: AFTER-INSERT triggers on the
-- decisions and documents tables write an audit row server-side. The triggers
-- are SECURITY DEFINER so they bypass audit_log's (intentional) lack of a client
-- INSERT policy; the BEFORE-INSERT sign_audit trigger still hash-chains the row.

-- ── documents (uploaded files; bytes live in Storage, metadata here) ──────────
create table public.documents (
  id               uuid primary key default gen_random_uuid(),
  tenant_id        uuid not null references public.tenants(id) on delete cascade,
  filename         text not null,
  storage_path     text not null,          -- {tenant_id}/{uuid}-{filename} in the bucket
  bucket           text not null default 'documents',
  content_hash     text not null,          -- sha256 of the file bytes — citable & tamper-evident
  file_size_bytes  bigint,
  mime_type        text,
  kind             text,                   -- ir_plan|policy|report|inventory|other
  uploaded_by      uuid references auth.users(id),
  uploaded_at      timestamptz not null default now()
);
create index on public.documents (tenant_id);

alter table public.documents enable row level security;
alter table public.documents force row level security;

-- members read; any member may register an uploaded file for their tenant.
create policy documents_read on public.documents
  for select to authenticated using (app.is_member(tenant_id));
create policy documents_insert on public.documents
  for insert to authenticated with check (app.is_member(tenant_id));

-- ── org inventory (business processes, applications, crown jewels) ───────────
-- Captured at onboarding; the engine maps apps→processes and infers crown jewels
-- (Phase 4). Crown-jewel status is a boolean flag on the named asset.
create table public.org_processes (
  id              uuid primary key default gen_random_uuid(),
  tenant_id       uuid not null references public.tenants(id) on delete cascade,
  name            text not null,
  business_value  text,                   -- as entered, e.g. "$220M/day"
  is_crown_jewel  boolean not null default false,
  created_at      timestamptz not null default now()
);
create index on public.org_processes (tenant_id);

create table public.org_applications (
  id              uuid primary key default gen_random_uuid(),
  tenant_id       uuid not null references public.tenants(id) on delete cascade,
  name            text not null,
  is_crown_jewel  boolean not null default false,
  created_at      timestamptz not null default now()
);
create index on public.org_applications (tenant_id);

do $$
declare t text;
begin
  foreach t in array array['org_processes','org_applications'] loop
    execute format('alter table public.%I enable row level security;', t);
    execute format('alter table public.%I force row level security;', t);
    execute format('create policy %I on public.%I for select to authenticated using (app.is_member(tenant_id));', t || '_read', t);
    execute format($p$create policy %I on public.%I for all to authenticated using (app.has_role(tenant_id, array['CISO','Admin']::app.role[])) with check (app.has_role(tenant_id, array['CISO','Admin']::app.role[]));$p$, t || '_write', t);
  end loop;
end $$;

-- ── audit-log population (server-side, signed) ───────────────────────────────
-- A decision is the single most defensibility-critical event — log every insert.
create or replace function app.log_decision()
returns trigger language plpgsql security definer set search_path = public, app as $$
begin
  insert into public.audit_log (tenant_id, actor_user_id, action, object_type, object_id, detail)
  values (
    new.tenant_id, new.owner_user_id, 'decision', 'decision', new.id,
    jsonb_build_object('title', new.title, 'seat', new.seat, 'decision_type', new.decision_type)
  );
  return new;
end;
$$;

create trigger log_decision_ins after insert on public.decisions
  for each row execute function app.log_decision();

-- An uploaded document is evidence entering the system — log it too.
create or replace function app.log_document()
returns trigger language plpgsql security definer set search_path = public, app as $$
begin
  insert into public.audit_log (tenant_id, actor_user_id, action, object_type, object_id, detail)
  values (
    new.tenant_id, new.uploaded_by, 'upload', 'document', new.id,
    jsonb_build_object('filename', new.filename, 'content_hash', new.content_hash, 'kind', new.kind)
  );
  return new;
end;
$$;

create trigger log_document_ins after insert on public.documents
  for each row execute function app.log_document();
