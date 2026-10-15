-- Daily workout reminders from the server (Web Push), so they arrive with
-- the app closed. pg_cron calls the daily-reminders Edge Function
-- (supabase/functions/daily-reminders) every minute; it decides who is due.

create extension if not exists pg_cron with schema pg_catalog;
create extension if not exists pg_net with schema extensions;

-- The patient's own timezone, saved from the device with their reminder
-- schedule (reminder_schedule times are wall-clock times there).
alter table public.patients
  add column if not exists reminder_timezone text not null default 'Asia/Jerusalem';

-- One row per patient per local day a reminder went out (or was skipped
-- because they had already trained): the lock that keeps it to once a day.
-- Server-only: RLS on and no policies, so only the service role reads it.
create table if not exists public.reminder_log (
  patient_id bigint not null references public.patients (id) on delete cascade,
  local_date date not null,
  sent_at timestamptz not null default now(),
  primary key (patient_id, local_date)
);

alter table public.reminder_log enable row level security;

-- The cron job proves itself to the Edge Function with a random secret that
-- is generated here and never leaves the database: cron reads it from Vault,
-- the function checks it through this service-role-only RPC.
select vault.create_secret(encode(extensions.gen_random_bytes(32), 'hex'), 'daily_reminders_cron_secret')
where not exists (select 1 from vault.secrets where name = 'daily_reminders_cron_secret');

create or replace function public.verify_reminders_cron_secret(p_secret text)
returns boolean
language sql
security definer
set search_path = ''
as $$
  select exists (
    select 1 from vault.decrypted_secrets
    where name = 'daily_reminders_cron_secret' and decrypted_secret = p_secret
  );
$$;

revoke all on function public.verify_reminders_cron_secret(text) from public, anon, authenticated;
grant execute on function public.verify_reminders_cron_secret(text) to service_role;

-- Every minute.
select cron.unschedule('daily-reminders') where exists (select 1 from cron.job where jobname = 'daily-reminders');
select cron.schedule(
  'daily-reminders',
  '* * * * *',
  $$
  select net.http_post(
    url := 'https://secdkhnvsmiuiidxnjyy.supabase.co/functions/v1/daily-reminders',
    headers := jsonb_build_object(
      'Content-Type', 'application/json',
      'x-cron-secret', (select decrypted_secret from vault.decrypted_secrets where name = 'daily_reminders_cron_secret')
    ),
    body := '{}'::jsonb
  );
  $$
);
