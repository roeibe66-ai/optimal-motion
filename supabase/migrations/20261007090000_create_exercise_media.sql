-- Exercise demo media (Ecco mannequin clips/stills) produced by the local
-- pipeline in scripts/media/ and uploaded to the public `exercise-media`
-- bucket. Purely additive: exercises.gif_url / secondary_gif_url stay as the
-- fallback for exercises that have no rows here yet.

-- 1) Public, immutable, content-hashed files:
--    v<version>/<slug>/<slug>_<view>_<hash8>.(mp4|webp)
--    Written only by the upload script with the service-role key (which
--    bypasses storage RLS), so no storage.objects policies are needed.
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('exercise-media', 'exercise-media', true, 5242880, array['video/mp4', 'image/webp'])
on conflict (id) do nothing;

-- 2) One row per (exercise, view, kind).
create table if not exists public.exercise_media (
  id uuid primary key default gen_random_uuid(),
  exercise_id uuid not null references public.exercises(id) on delete cascade,
  exercise_slug text not null,
  view text not null check (view in ('diag', 'front', 'rear', 'front34')),
  kind text not null check (kind in ('video', 'image')),
  -- 0 = primary media shown first; higher = extra angles behind the toggle.
  position int not null default 0,
  path text not null,         -- object path inside the exercise-media bucket
  poster_path text,           -- WebP first frame, videos only
  aspect text not null check (aspect in ('4:5', '16:9')),
  width int,
  height int,
  duration_s numeric(5, 2),
  bytes int,
  loop_mode text not null default 'none' check (loop_mode in ('none', 'pingpong')),
  version int not null default 1,
  approved boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (exercise_slug, view, kind)
);

create index if not exists exercise_media_exercise_id_idx on public.exercise_media (exercise_id, position);

-- 3) Signed-in users read approved rows; admins see everything. No write
--    policies: rows are upserted by the upload script with the service role.
alter table public.exercise_media enable row level security;

create policy exercise_media_select_approved_or_admin on public.exercise_media
  for select
  to authenticated
  using (approved or public.is_admin());
