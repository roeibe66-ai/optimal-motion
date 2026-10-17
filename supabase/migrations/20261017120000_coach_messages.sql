-- AI coach conversation history (Roei, 2026-10-15): kept 6 months so a
-- conversation continues where it stopped and the therapist can read it.
-- The patient sees and can delete their own; admins read all. Rows are
-- written only by the server (service role, app/actions/coach.ts), so a
-- patient can't plant coach replies. Admin test chats are not stored.

create table public.coach_messages (
  id bigint generated always as identity primary key,
  patient_id bigint not null references public.patients (id) on delete cascade,
  role text not null check (role in ('user', 'assistant')),
  content text not null check (length(content) <= 8000),
  red_flag text check (red_flag in ('urgent', 'emergency')),
  created_at timestamptz not null default now()
);

create index coach_messages_patient_idx on public.coach_messages (patient_id, created_at desc);

alter table public.coach_messages enable row level security;

create policy "coach_messages_select_own_or_admin" on public.coach_messages
  for select to authenticated
  using (patient_id in (select id from public.patients where user_id = auth.uid()) or public.is_admin());

-- "מחיקת ההיסטוריה" in the coach sheet.
create policy "coach_messages_delete_own" on public.coach_messages
  for delete to authenticated
  using (patient_id in (select id from public.patients where user_id = auth.uid()));

-- Retention: daily, anything older than 6 months goes.
select cron.unschedule('coach-messages-retention') where exists (select 1 from cron.job where jobname = 'coach-messages-retention');
select cron.schedule(
  'coach-messages-retention',
  '30 3 * * *',
  $$ delete from public.coach_messages where created_at < now() - interval '6 months' $$
);
