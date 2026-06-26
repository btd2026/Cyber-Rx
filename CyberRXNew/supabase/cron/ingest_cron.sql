-- CyberRx — scheduled connector sync (Phase 8). HOSTED SUPABASE ONLY.
--
-- Runs the `ingest` Edge Function on a schedule for every tenant that has
-- connectors, so all sources refresh automatically (no manual "Sync now").
--
-- This is NOT in supabase/migrations/ on purpose: it needs pg_cron + pg_net,
-- which exist on Supabase but NOT in the local proof Postgres — keeping it here
-- means `scripts/local/run_isolation_test.sh` stays green. Apply it by hand on
-- your Supabase project (SQL editor) after deploying the `ingest` function.
--
-- Secrets are NOT hardcoded here: the function URL + cron secret are read from an
-- operator-populated `app.settings` table (app schema is not exposed via the
-- client API, so these never reach the browser).

create extension if not exists pg_cron;
create extension if not exists pg_net;

-- ── operator settings (service-role / SQL only; no client access) ─────────────
create table if not exists app.settings (
  key   text primary key,
  value text not null
);

-- Populate ONCE with your values (replace the placeholders), then re-run:
--   insert into app.settings (key, value) values
--     ('ingest_url', 'https://YOUR-REF.supabase.co/functions/v1/ingest'),
--     ('cron_secret', 'YOUR-CRON-SECRET')   -- same value as the function's CRON_SECRET
--   on conflict (key) do update set value = excluded.value;

-- ── fan out a read-only ingest to every tenant with connectors ────────────────
create or replace function app.trigger_scheduled_ingest()
returns void language plpgsql security definer set search_path = app, public as $$
declare
  v_url    text;
  v_secret text;
  t        uuid;
begin
  select value into v_url    from app.settings where key = 'ingest_url';
  select value into v_secret from app.settings where key = 'cron_secret';
  if v_url is null or v_secret is null then
    raise notice 'scheduled ingest skipped: app.settings ingest_url/cron_secret not set';
    return;
  end if;

  for t in select distinct tenant_id from public.connectors loop
    perform net.http_post(
      url     := v_url,
      headers := jsonb_build_object('content-type', 'application/json', 'X-Cron-Key', v_secret),
      body    := jsonb_build_object('tenantId', t)
    );
  end loop;
end;
$$;

-- ── schedule: every 6 hours (idempotent by jobname) ───────────────────────────
select cron.schedule('cyberrx-ingest', '0 */6 * * *', $$select app.trigger_scheduled_ingest();$$);

-- To change cadence:   select cron.alter_job((select jobid from cron.job where jobname='cyberrx-ingest'), schedule := '*/30 * * * *');
-- To stop:             select cron.unschedule('cyberrx-ingest');
-- To run once now:     select app.trigger_scheduled_ingest();
--
-- No-pg_cron fallback (external scheduler — GitHub Actions, cron, etc.):
--   curl -X POST "$INGEST_URL" -H "X-Cron-Key: $CRON_SECRET" \
--        -H 'content-type: application/json' -d '{"tenantId":"<uuid>"}'
