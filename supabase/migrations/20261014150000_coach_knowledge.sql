-- Stage 5a: the shared knowledge base behind the "Did you know?" cards and
-- the patient AI coach.

-- 1) The coach's principles: one long text the admin edits (Roei's training
-- and pain-management rules, red flags, tone). Every save inserts a new row,
-- so the latest row is the live version and older rows are the history.
create table public.coach_principles (
  id bigint generated always as identity primary key,
  body text not null check (length(body) between 1 and 40000),
  created_at timestamptz not null default now(),
  created_by uuid default auth.uid() references auth.users (id) on delete set null
);

alter table public.coach_principles enable row level security;

-- Readable by any signed-in user: the coach server action loads it with the
-- patient's own token. Nothing in it is private.
create policy "coach_principles_select_authenticated" on public.coach_principles
  for select
  to authenticated
  using (true);

-- Insert-only for the admin: no update/delete policy, so the history can't be
-- rewritten.
create policy "coach_principles_admin_insert" on public.coach_principles
  for insert
  to authenticated
  with check (public.is_admin());

-- 2) curated_facts doubles as the coach's knowledge cards. New fields:
--   takeaway_he     what it means for the trainee, in one line
--   tags            ids from app/constants/knowledgeTags.ts (body area + theme)
--   evidence_grade  A = meta-analysis/systematic review, B = RCT, C = other
alter table public.curated_facts
  add column takeaway_he text,
  add column tags text[] not null default '{}',
  add column evidence_grade text check (evidence_grade in ('A', 'B', 'C')),
  add column updated_at timestamptz;

create index curated_facts_tags_idx on public.curated_facts using gin (tags);
