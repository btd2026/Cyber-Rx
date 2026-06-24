-- LOCAL TESTING ONLY — mirrors the auth surface Supabase provides in production,
-- so the same migrations and RLS policies run unchanged here.
-- On real Supabase, none of this is needed (auth schema, auth.uid(), and the
-- anon/authenticated/service_role roles already exist).

create schema if not exists auth;
create schema if not exists app;

-- auth.users (subset) — Supabase's real table has many more columns.
create table if not exists auth.users (
  id    uuid primary key,
  email text
);

-- auth.uid(): read the 'sub' claim from the request JWT, exactly like Supabase.
create or replace function auth.uid() returns uuid
language sql stable as $$
  select nullif(
    current_setting('request.jwt.claims', true)::json ->> 'sub', ''
  )::uuid;
$$;

-- Supabase's runtime roles.
do $$ begin
  if not exists (select from pg_roles where rolname = 'anon')
    then create role anon nologin noinherit; end if;
  if not exists (select from pg_roles where rolname = 'authenticated')
    then create role authenticated nologin noinherit; end if;
  if not exists (select from pg_roles where rolname = 'service_role')
    then create role service_role nologin noinherit bypassrls; end if;
end $$;

grant usage on schema public, app, auth to anon, authenticated, service_role;
grant select on auth.users to authenticated, service_role;

-- Future tables/functions created by the migration (run as superuser) get the
-- same grants Supabase applies, so authenticated can reach them (RLS still
-- governs which rows).
alter default privileges in schema public
  grant select, insert, update, delete on tables to authenticated, service_role;
alter default privileges in schema public
  grant execute on functions to authenticated, service_role;
alter default privileges in schema app
  grant execute on functions to authenticated, service_role;
