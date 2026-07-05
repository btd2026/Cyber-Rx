-- Nerion — Phase 1 acceptance test: TENANT ISOLATION, proven at the DB level.
--
-- Sets up two tenants (A and B) with structurally OVERLAPPING data, then logs in
-- as a user of tenant A (via JWT claims, as Supabase does) and proves that NONE
-- of tenant B's rows are visible, that A cannot write into B, and that the
-- decision ledger is append-only & signed. Any failure RAISES and aborts with a
-- non-zero exit code. All PASS lines are printed as NOTICEs.
--
-- Fixed UUIDs so we can reference rows as literals:
--   tenant A = 11111111-...   tenant B = 22222222-...
--   user A   = aaaaaaaa-...   user B   = bbbbbbbb-...

\set ON_ERROR_STOP on

-- ── Setup (as superuser / privileged loader) ──────────────────────────────
reset role;

insert into auth.users (id, email) values
  ('aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa','exec-a@tenant-a.example'),
  ('bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb','exec-b@tenant-b.example');

insert into public.tenants (id, name, primary_currency) values
  ('11111111-1111-1111-1111-111111111111','Tenant A Health','USD'),
  ('22222222-2222-2222-2222-222222222222','Tenant B Health','USD');

insert into public.memberships (tenant_id, user_id, role) values
  ('11111111-1111-1111-1111-111111111111','aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa','CISO'),
  ('22222222-2222-2222-2222-222222222222','bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb','CISO');

-- Overlapping data: same shapes/values in both tenants — only tenant_id differs.
insert into public.connectors (tenant_id, kind, display_name, status) values
  ('11111111-1111-1111-1111-111111111111','edr','CrowdStrike','healthy'),
  ('22222222-2222-2222-2222-222222222222','edr','CrowdStrike','healthy');

insert into public.evidence (tenant_id, source_system, kind, value, collected_at, content_hash) values
  ('11111111-1111-1111-1111-111111111111','edr','endpoint_coverage','{"pct":0.97}', now(), 'hashA'),
  ('22222222-2222-2222-2222-222222222222','edr','endpoint_coverage','{"pct":0.97}', now(), 'hashB');

insert into public.assumptions (tenant_id, key, value, currency) values
  ('11111111-1111-1111-1111-111111111111','breach_cost_per_record', 165, 'USD'),
  ('22222222-2222-2222-2222-222222222222','breach_cost_per_record', 165, 'USD');

insert into public.decisions (id, tenant_id, seat, title, owner_user_id, evidence_snapshot) values
  ('dddddddd-dddd-dddd-dddd-00000000000a','11111111-1111-1111-1111-111111111111','CISO','Adopt MFA everywhere','aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa','{"coverage":0.97}'),
  ('dddddddd-dddd-dddd-dddd-00000000000b','22222222-2222-2222-2222-222222222222','CISO','Adopt MFA everywhere','bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb','{"coverage":0.97}');

-- A second decision in tenant A to prove the hash chain links.
insert into public.decisions (id, tenant_id, seat, title, owner_user_id, evidence_snapshot) values
  ('dddddddd-dddd-dddd-dddd-00000000000c','11111111-1111-1111-1111-111111111111','CISO','Fund EDR expansion','aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa','{"budget":500000}');

-- ── Sanity: privileged loader sees BOTH tenants (data really exists) ───────
do $$
declare n int;
begin
  select count(*) into n from public.evidence;
  if n <> 2 then raise exception 'SETUP FAIL: expected 2 evidence rows, got %', n; end if;
  raise notice 'SETUP OK: 2 tenants seeded with overlapping data';
end $$;

-- ── Become user A (Supabase-style JWT claim) ──────────────────────────────
set role authenticated;
select set_config('request.jwt.claims', '{"sub":"aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa"}', false);

do $$
declare b_rows int; a_rows int; tbl text;
begin
  -- For every tenant-scoped table, tenant B must be completely invisible to A.
  foreach tbl in array array[
    'tenants','connectors','evidence','assumptions','decisions','memberships'
  ] loop
    if tbl = 'tenants' then
      execute 'select count(*) from public.tenants where id = $1::uuid'
        using '22222222-2222-2222-2222-222222222222' into b_rows;
    else
      execute format('select count(*) from public.%I where tenant_id = $1::uuid', tbl)
        using '22222222-2222-2222-2222-222222222222' into b_rows;
    end if;
    if b_rows <> 0 then
      raise exception 'FAIL: user A can see % row(s) of tenant B in %', b_rows, tbl;
    end if;
    raise notice 'PASS: tenant B invisible to A in public.%', tbl;
  end loop;

  -- And A can see its OWN data (isolation is not just "see nothing").
  select count(*) into a_rows from public.evidence;
  if a_rows <> 1 then raise exception 'FAIL: user A should see exactly 1 evidence row, saw %', a_rows; end if;
  raise notice 'PASS: user A sees its own evidence (rows: %)', a_rows;
end $$;

-- ── A cannot WRITE into tenant B (RLS WITH CHECK) ─────────────────────────
do $$
declare blocked boolean := false;
begin
  begin
    insert into public.assumptions (tenant_id, key, value)
      values ('22222222-2222-2222-2222-222222222222','smuggled', 1);
  exception when others then blocked := true;
  end;
  if not blocked then raise exception 'FAIL: user A inserted a row into tenant B'; end if;
  raise notice 'PASS: cross-tenant INSERT by A into tenant B blocked';
end $$;

-- ── A cannot read tenant B even by guessing a known id (no IDOR) ───────────
do $$
declare n int;
begin
  select count(*) into n from public.decisions
   where id = 'dddddddd-dddd-dddd-dddd-00000000000b';   -- B's decision id
  if n <> 0 then raise exception 'FAIL: user A read tenant B decision by id'; end if;
  raise notice 'PASS: direct-id read of tenant B decision returns nothing';
end $$;

-- ── Symmetry: user B sees only B ──────────────────────────────────────────
select set_config('request.jwt.claims', '{"sub":"bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb"}', false);
do $$
declare a_rows int; own int;
begin
  select count(*) into a_rows from public.evidence where tenant_id = '11111111-1111-1111-1111-111111111111';
  if a_rows <> 0 then raise exception 'FAIL: user B can see tenant A evidence'; end if;
  select count(*) into own from public.evidence;
  if own <> 1 then raise exception 'FAIL: user B should see 1 evidence row, saw %', own; end if;
  raise notice 'PASS: user B sees only tenant B (rows: %)', own;
end $$;

-- ── Anonymous (no JWT) sees nothing ───────────────────────────────────────
set role anon;
select set_config('request.jwt.claims', '', false);
do $$
declare n int;
begin
  begin
    select count(*) into n from public.evidence;
  exception when insufficient_privilege then n := 0;  -- anon not granted: also fine
  end;
  if n <> 0 then raise exception 'FAIL: anonymous caller saw % evidence rows', n; end if;
  raise notice 'PASS: anonymous caller sees no tenant data';
end $$;

-- ── Ledger is append-only & signed (tested against the privileged role) ────
set role service_role;   -- bypasses RLS, but triggers still fire
do $$
declare blocked boolean := false; h1 text; h2_prev text;
begin
  -- UPDATE blocked
  begin
    update public.decisions set title = 'tampered'
      where id = 'dddddddd-dddd-dddd-dddd-00000000000a';
  exception when others then blocked := true;
  end;
  if not blocked then raise exception 'FAIL: decision ledger allowed an UPDATE'; end if;
  raise notice 'PASS: decision UPDATE blocked (append-only) even for service_role';

  -- DELETE blocked
  blocked := false;
  begin
    delete from public.decisions where id = 'dddddddd-dddd-dddd-dddd-00000000000a';
  exception when others then blocked := true;
  end;
  if not blocked then raise exception 'FAIL: decision ledger allowed a DELETE'; end if;
  raise notice 'PASS: decision DELETE blocked (append-only)';

  -- Hash chain links the two tenant-A decisions
  select row_hash into h1 from public.decisions where id = 'dddddddd-dddd-dddd-dddd-00000000000a';
  select prev_hash into h2_prev from public.decisions where id = 'dddddddd-dddd-dddd-dddd-00000000000c';
  if h1 is null then raise exception 'FAIL: decision was not signed (row_hash null)'; end if;
  if h2_prev is distinct from h1 then raise exception 'FAIL: hash chain broken (% <> %)', h2_prev, h1; end if;
  raise notice 'PASS: ledger is signed and hash-chained (prev_hash links to prior row_hash)';
end $$;

reset role;
select set_config('request.jwt.claims', '', false);

\echo ''
\echo '================================================================'
\echo '  PHASE 1 ISOLATION TEST: ALL CHECKS PASSED'
\echo '================================================================'
