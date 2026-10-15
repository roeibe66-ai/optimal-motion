-- Web Push: a notification when rest ends while the PWA is in the
-- background (iPhone home-screen apps, iOS 16.4+). See app/actions/push.ts
-- and public/sw.js.

-- 1) One row per device that allowed notifications. The browser's
-- PushSubscription (endpoint + keys) is what the server needs to send to it.
create table public.push_subscriptions (
  id uuid primary key default gen_random_uuid(),
  patient_id bigint not null references public.patients (id) on delete cascade,
  endpoint text not null unique,
  p256dh text not null,
  auth text not null,
  user_agent text,
  created_at timestamptz not null default now()
);

create index push_subscriptions_patient_idx on public.push_subscriptions (patient_id);

alter table public.push_subscriptions enable row level security;

-- Self-row pattern (same as the other patient tables): a patient manages
-- their own devices; the admin can read all.
create policy "push_subscriptions_select_own_or_admin" on public.push_subscriptions
  for select to authenticated
  using (patient_id in (select id from public.patients where user_id = auth.uid()) or public.is_admin());

create policy "push_subscriptions_insert_own" on public.push_subscriptions
  for insert to authenticated
  with check (patient_id in (select id from public.patients where user_id = auth.uid()));

create policy "push_subscriptions_update_own" on public.push_subscriptions
  for update to authenticated
  using (patient_id in (select id from public.patients where user_id = auth.uid()))
  with check (patient_id in (select id from public.patients where user_id = auth.uid()));

create policy "push_subscriptions_delete_own" on public.push_subscriptions
  for delete to authenticated
  using (patient_id in (select id from public.patients where user_id = auth.uid()));

-- 2) One row per rest period that should end with a notification. The
-- server waits until ends_at and sends it unless the app cancelled it
-- (rest ended in the foreground, skipped, workout closed). Extending the
-- rest (+15 s) moves ends_at, which the waiting sender re-reads.
create table public.rest_alarms (
  id uuid primary key default gen_random_uuid(),
  patient_id bigint not null references public.patients (id) on delete cascade,
  ends_at timestamptz not null,
  title text not null check (length(title) <= 120),
  body text not null check (length(body) <= 240),
  status text not null default 'pending' check (status in ('pending', 'cancelled', 'sent', 'failed')),
  created_at timestamptz not null default now()
);

create index rest_alarms_patient_idx on public.rest_alarms (patient_id, created_at desc);

alter table public.rest_alarms enable row level security;

create policy "rest_alarms_select_own_or_admin" on public.rest_alarms
  for select to authenticated
  using (patient_id in (select id from public.patients where user_id = auth.uid()) or public.is_admin());

create policy "rest_alarms_insert_own" on public.rest_alarms
  for insert to authenticated
  with check (patient_id in (select id from public.patients where user_id = auth.uid()));

create policy "rest_alarms_update_own" on public.rest_alarms
  for update to authenticated
  using (patient_id in (select id from public.patients where user_id = auth.uid()))
  with check (patient_id in (select id from public.patients where user_id = auth.uid()));
