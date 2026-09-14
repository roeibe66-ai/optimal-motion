-- Admin-curated "Did you know?" facts shown on the patient home screen.
-- Populated exclusively via the admin research tab (LegacyAdminApp.tsx),
-- which calls app/actions/researchAgent.ts and lets the admin pick which
-- LLM-generated results to publish — patients never trigger generation or
-- see anything that wasn't explicitly approved here.
create table public.curated_facts (
  id uuid primary key default gen_random_uuid(),
  paper_title text not null,
  paper_url text,
  year integer,
  summary_he text not null,
  did_you_know_he text not null,
  created_at timestamptz not null default now()
);

alter table public.curated_facts enable row level security;

-- Same read/write split as exercises: every authenticated user (patient or
-- admin) can read the published facts, only the admin can publish/retract.
create policy "curated_facts_select_authenticated" on public.curated_facts
  for select
  to authenticated
  using (true);

create policy "curated_facts_admin_insert" on public.curated_facts
  for insert
  to authenticated
  with check (public.is_admin());

create policy "curated_facts_admin_delete" on public.curated_facts
  for delete
  to authenticated
  using (public.is_admin());
