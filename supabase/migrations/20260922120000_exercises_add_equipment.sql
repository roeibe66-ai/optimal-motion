-- Real equipment tagging for exercises. Replaces the DiyBuilderTab/PlanTab
-- text-sniffing hacks that guessed equipment by searching name/description
-- for Hebrew/English keywords (see MISTAKES.md).
alter table exercises
  add column equipment text[] not null default '{}'::text[];
