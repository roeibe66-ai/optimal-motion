-- Safety and limits for the patient AI coach (app/actions/coach.ts), before
-- it opens to patients.

-- 1) Red flags: every reply the coach marks urgent/emergency is recorded
-- here (and pushed to the admins). Written by the server with the service
-- role; only admins read and acknowledge them.
create table public.coach_flags (
  id uuid primary key default gen_random_uuid(),
  patient_id bigint not null references public.patients (id) on delete cascade,
  level text not null check (level in ('urgent', 'emergency')),
  patient_message text not null check (length(patient_message) <= 2000),
  coach_reply text not null check (length(coach_reply) <= 4000),
  is_test boolean not null default false, -- raised from the admin's "בדיקת המאמן" tab
  created_at timestamptz not null default now(),
  seen_at timestamptz
);

create index coach_flags_unseen_idx on public.coach_flags (created_at desc) where seen_at is null;

alter table public.coach_flags enable row level security;

create policy "coach_flags_admin_select" on public.coach_flags
  for select to authenticated using (public.is_admin());

create policy "coach_flags_admin_update" on public.coach_flags
  for update to authenticated using (public.is_admin()) with check (public.is_admin());

-- 2) Daily message limit. The counter table has no policies at all: the only
-- way in is coach_take_message(), which counts for the caller's own patient
-- row and holds the limit itself, so a patient can neither reset their count
-- nor pass a bigger limit.
create table public.coach_usage (
  patient_id bigint not null references public.patients (id) on delete cascade,
  day date not null,
  messages integer not null default 0,
  primary key (patient_id, day)
);

alter table public.coach_usage enable row level security;

-- Returns the caller's message count for today (Israel time) after taking
-- one, or -1 when today's limit is already used up.
create or replace function public.coach_take_message()
returns integer
language plpgsql
security definer
set search_path = ''
as $$
declare
  daily_limit constant integer := 30;
  pid bigint;
  today date := (now() at time zone 'Asia/Jerusalem')::date;
  taken integer;
begin
  select id into pid from public.patients where user_id = auth.uid();
  if pid is null then
    return -1;
  end if;

  insert into public.coach_usage as u (patient_id, day, messages)
  values (pid, today, 1)
  on conflict (patient_id, day) do update
    set messages = u.messages + 1
    where u.messages < daily_limit
  returning u.messages into taken;

  return coalesce(taken, -1);
end;
$$;

revoke all on function public.coach_take_message() from public, anon;
grant execute on function public.coach_take_message() to authenticated;
