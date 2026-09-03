-- Push dispatch worker: pg_cron → Edge Function `push-dispatch` every minute.
-- Replaces Render cron that hit /api/push/dispatch on the Next.js service.
--
-- After deploy, ensure Edge Function secrets include SHIMAI_APP_URL (production URL).
-- The cron uses the service_role JWT from Supabase Vault (hosted projects).

create extension if not exists pg_cron with schema extensions;
create extension if not exists pg_net with schema extensions;

do $$
declare
  existing_job_id bigint;
begin
  select jobid into existing_job_id
  from cron.job
  where jobname = 'shimai-push-dispatch';

  if existing_job_id is not null then
    perform cron.unschedule(existing_job_id);
  end if;
end $$;

select cron.schedule(
  'shimai-push-dispatch',
  '* * * * *',
  $$
  select net.http_post(
    url := 'https://ikxbuqebgbeciznedgkj.supabase.co/functions/v1/push-dispatch',
    headers := jsonb_build_object(
      'Content-Type', 'application/json',
      'Authorization', 'Bearer ' || (
        select decrypted_secret
        from vault.decrypted_secrets
        where name = 'service_role_key'
        limit 1
      )
    ),
    body := '{}'::jsonb
  ) as request_id;
  $$
);
