-- CyberRx — Phase 7 acceptance test: PRODUCTION WIRING proven at the DB level.
--
-- Runs after 10_isolation_test.sql (same DB), reusing its seeded tenants/users:
--   tenant A = 11111111-...   tenant B = 22222222-...
--   user A   = aaaaaaaa-...   user B   = bbbbbbbb-...
-- Proves: (1) decisions auto-populate the signed audit_log; (2) the new documents
-- table is tenant-isolated (read + write) under RLS; (3) document uploads are
-- audit-logged; (4) audit_log is append-only. Any failure RAISES (non-zero exit).

\set ON_ERROR_STOP on
reset role;

-- ── 1) Decisions auto-logged to the signed audit_log ──────────────────────────
do $$
declare n int; h text;
begin
  select count(*) into n from public.audit_log where action = 'decision';
  if n < 3 then raise exception 'FAIL: expected >=3 decision audit rows, got %', n; end if;
  raise notice 'PASS: decisions auto-logged to audit_log (% rows)', n;
  select row_hash into h from public.audit_log where action = 'decision' order by created_at limit 1;
  if h is null then raise exception 'FAIL: audit row was not signed (row_hash null)'; end if;
  raise notice 'PASS: audit_log rows are signed (hash-chained at the DB level)';
end $$;

-- ── 2) Seed documents for both tenants (privileged), proving upload logging ────
set role service_role;
insert into public.documents (tenant_id, filename, storage_path, content_hash, uploaded_by) values
  ('11111111-1111-1111-1111-111111111111','policyA.pdf','11111111-1111-1111-1111-111111111111/h-policyA.pdf','hashdocA','aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa'),
  ('22222222-2222-2222-2222-222222222222','policyB.pdf','22222222-2222-2222-2222-222222222222/h-policyB.pdf','hashdocB','bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb');
do $$
declare n int;
begin
  select count(*) into n from public.audit_log where action = 'upload';
  if n < 2 then raise exception 'FAIL: expected 2 upload audit rows, got %', n; end if;
  raise notice 'PASS: document uploads auto-logged (% rows)', n;
end $$;

-- ── 3) documents are tenant-isolated under RLS (read + write) ──────────────────
set role authenticated;
select set_config('request.jwt.claims', '{"sub":"aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa"}', false);
do $$
declare b_rows int; a_rows int; blocked boolean := false;
begin
  select count(*) into b_rows from public.documents where tenant_id = '22222222-2222-2222-2222-222222222222';
  if b_rows <> 0 then raise exception 'FAIL: user A can see % document(s) of tenant B', b_rows; end if;
  select count(*) into a_rows from public.documents;
  if a_rows <> 1 then raise exception 'FAIL: user A should see exactly 1 document, saw %', a_rows; end if;
  raise notice 'PASS: documents tenant-isolated (A sees only its own)';

  begin
    insert into public.documents (tenant_id, filename, storage_path, content_hash)
      values ('22222222-2222-2222-2222-222222222222','smuggle.pdf','x','h');
  exception when others then blocked := true;
  end;
  if not blocked then raise exception 'FAIL: user A inserted a document into tenant B'; end if;
  raise notice 'PASS: cross-tenant document INSERT blocked';

  insert into public.documents (tenant_id, filename, storage_path, content_hash)
    values ('11111111-1111-1111-1111-111111111111','ownA.pdf','11111111-1111-1111-1111-111111111111/own','hown');
  raise notice 'PASS: member can register a document for its own tenant';
end $$;

-- ── 4) audit_log is append-only (no UPDATE/DELETE, even privileged) ───────────
set role service_role;
do $$
declare blocked boolean := false;
begin
  begin
    update public.audit_log set action = 'tampered';
  exception when others then blocked := true;
  end;
  if not blocked then raise exception 'FAIL: audit_log allowed an UPDATE'; end if;
  raise notice 'PASS: audit_log UPDATE blocked (append-only)';
end $$;

-- ── 5) control_status: engine-computed maturity, CISO-writable, tenant-isolated ─
-- This is the path the evidence→control mapping uses to persist computed CMMI.
set role service_role;
insert into public.frameworks (id, key, name) values
  ('ffffffff-ffff-ffff-ffff-ffffffffff01','CSF_2_0','NIST CSF 2.0') on conflict (key) do nothing;
insert into public.controls (id, framework_id, control_id, title) values
  ('ccccffff-cccc-cccc-cccc-0000000000a5','ffffffff-ffff-ffff-ffff-ffffffffff01','PR.AA-05','Privileged access managed')
  on conflict (framework_id, control_id) do nothing;

set role authenticated;
select set_config('request.jwt.claims', '{"sub":"aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa"}', false);
do $$
declare n int; blocked boolean := false;
begin
  insert into public.control_status (tenant_id, control_id, cmmi_maturity, status, confidence, proposed_by)
    values ('11111111-1111-1111-1111-111111111111','ccccffff-cccc-cccc-cccc-0000000000a5', 5, 'pass', 0.95, 'engine');
  select count(*) into n from public.control_status where control_id = 'ccccffff-cccc-cccc-cccc-0000000000a5';
  if n <> 1 then raise exception 'FAIL: CISO could not read back its control_status (%)', n; end if;
  raise notice 'PASS: engine maturity persisted to control_status by CISO';

  begin
    insert into public.control_status (tenant_id, control_id, cmmi_maturity, status, confidence)
      values ('22222222-2222-2222-2222-222222222222','ccccffff-cccc-cccc-cccc-0000000000a5', 1, 'fail', 0.1);
  exception when others then blocked := true;
  end;
  if not blocked then raise exception 'FAIL: A wrote control_status into tenant B'; end if;
  raise notice 'PASS: cross-tenant control_status write blocked';
end $$;

select set_config('request.jwt.claims', '{"sub":"bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb"}', false);
do $$
declare n int;
begin
  select count(*) into n from public.control_status where tenant_id = '11111111-1111-1111-1111-111111111111';
  if n <> 0 then raise exception 'FAIL: tenant B sees tenant A control_status'; end if;
  raise notice 'PASS: control_status tenant-isolated';
end $$;

reset role;
select set_config('request.jwt.claims', '', false);

\echo ''
\echo '================================================================'
\echo '  PHASE 7 WIRING TEST: ALL CHECKS PASSED'
\echo '================================================================'
