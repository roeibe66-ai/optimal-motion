-- Public browsable workout catalog for the new "Explore" tab: a workout is a
-- single admin-curated session (title + ordered exercise_ids), distinct from
-- the existing packages/package_exercises tables (an unused multi-week
-- admin->patient assignment model) and from patient_saved_programs (private,
-- patient-authored). Read is open to any authenticated patient, same as
-- exercises; writes are admin-only, same pattern as exercises_admin_write.
create table workouts (
  id uuid primary key default gen_random_uuid(),
  title text not null,
  category text,
  cover_image_url text,
  exercise_ids text[] not null default '{}'::text[],
  is_free boolean not null default false,
  sort_order int not null default 0,
  created_at timestamptz not null default now()
);

alter table workouts enable row level security;

create policy workouts_select_authenticated on workouts for select to authenticated using (true);
create policy workouts_admin_write on workouts for insert to authenticated with check (is_admin());
create policy workouts_admin_update on workouts for update to authenticated using (is_admin()) with check (is_admin());
create policy workouts_admin_delete on workouts for delete to authenticated using (is_admin());

-- One row per patient-likes-workout, mirrors patient_saved_programs' RLS
-- pattern (self-scoped via auth.uid(), or admin).
create table workout_likes (
  id uuid primary key default gen_random_uuid(),
  patient_id bigint not null references patients(id) on delete cascade,
  workout_id uuid not null references workouts(id) on delete cascade,
  created_at timestamptz not null default now(),
  unique (patient_id, workout_id)
);

alter table workout_likes enable row level security;

create policy workout_likes_self_or_admin on workout_likes
  for all
  using (is_admin() or patient_id in (select id from patients where user_id = auth.uid()))
  with check (is_admin() or patient_id in (select id from patients where user_id = auth.uid()));

-- Seed content so Explore/onboarding aren't empty out of the box — built
-- from the real (small) exercise catalog that exists today. Placeholder
-- data, meant to be replaced/expanded by the admin once real workouts are
-- authored.
insert into workouts (title, category, is_free, sort_order, exercise_ids) values
  ('משיכות גב - התחלה', 'כוח וסיבולת', true, 1,
    array['cebf0fce-1169-4ab2-b228-5e731df9aa2e','0f5882dc-b284-4636-83ef-aa57fe01e4ea','28e99cd1-e8a2-4464-b41d-afcf1fbec592']),
  ('קליסטניקס - שליטה בגוף', 'קליסטניקס', true, 2,
    array['0f054a1b-2620-48ac-9aeb-0ee206ea84c1','58eb9000-cbb2-4345-861c-39fb78cdde41']),
  ('אימון גב מלא', 'כוח וסיבולת', true, 3,
    array['28e99cd1-e8a2-4464-b41d-afcf1fbec592','cebf0fce-1169-4ab2-b228-5e731df9aa2e','0f5882dc-b284-4636-83ef-aa57fe01e4ea','0f054a1b-2620-48ac-9aeb-0ee206ea84c1']),
  ('באק לבר מתקדם', 'קליסטניקס', false, 4,
    array['58eb9000-cbb2-4345-861c-39fb78cdde41','0f054a1b-2620-48ac-9aeb-0ee206ea84c1']);
