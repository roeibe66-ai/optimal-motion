-- A patient asks the therapist to change or upgrade their workout
-- (app/actions/changeRequests.ts). Limits (Roei, 2026-10-17): a fitness
-- patient may have one open request at a time and send up to 2 a calendar
-- month (Israel time); clinical patients have no limit.

create table public.change_requests (
  id uuid primary key default gen_random_uuid(),
  patient_id bigint not null references public.patients (id) on delete cascade,
  program_id uuid references public.patient_programs (id) on delete set null,
  message text not null check (length(message) between 1 and 500),
  status text not null default 'open' check (status in ('open', 'done')),
  admin_note text check (length(admin_note) <= 1000),
  created_at timestamptz not null default now(),
  handled_at timestamptz
);

create index change_requests_open_idx on public.change_requests (created_at desc) where status = 'open';
create index change_requests_patient_idx on public.change_requests (patient_id, created_at desc);

alter table public.change_requests enable row level security;

-- The patient sees their own (to show "waiting" / the reply); admins see and
-- update all. No insert policy: the only way in is submit_change_request(),
-- which holds the limits.
create policy "change_requests_select_own_or_admin" on public.change_requests
  for select to authenticated
  using (patient_id in (select id from public.patients where user_id = auth.uid()) or public.is_admin());

create policy "change_requests_admin_update" on public.change_requests
  for update to authenticated using (public.is_admin()) with check (public.is_admin());

-- Returns the new request id, or raises with a Hebrew message the app shows.
create or replace function public.submit_change_request(p_program_id uuid, p_message text)
returns uuid
language plpgsql
security definer
set search_path = ''
as $$
declare
  monthly_limit constant integer := 2;
  me record;
  month_start timestamptz := date_trunc('month', now() at time zone 'Asia/Jerusalem') at time zone 'Asia/Jerusalem';
  new_id uuid;
begin
  select id, patient_type into me from public.patients where user_id = auth.uid();
  if me.id is null then
    raise exception 'אין הרשאה';
  end if;
  if length(trim(coalesce(p_message, ''))) = 0 then
    raise exception 'צריך לכתוב מה לשנות';
  end if;
  if p_program_id is not null and not exists (select 1 from public.patient_programs where id = p_program_id and patient_id = me.id) then
    raise exception 'התוכנית לא נמצאה';
  end if;

  if me.patient_type = 'fitness' then
    if exists (select 1 from public.change_requests where patient_id = me.id and status = 'open') then
      raise exception 'כבר יש בקשה פתוחה. אפשר לשלוח חדשה אחרי שהיא תטופל.';
    end if;
    if (select count(*) from public.change_requests where patient_id = me.id and created_at >= month_start) >= monthly_limit then
      raise exception 'שלחת כבר 2 בקשות החודש. אפשר לשלוח שוב בחודש הבא.';
    end if;
  end if;

  insert into public.change_requests (patient_id, program_id, message)
  values (me.id, p_program_id, left(trim(p_message), 500))
  returning id into new_id;
  return new_id;
end;
$$;

revoke all on function public.submit_change_request(uuid, text) from public, anon;
grant execute on function public.submit_change_request(uuid, text) to authenticated;
