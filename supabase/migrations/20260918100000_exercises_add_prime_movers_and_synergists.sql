-- Anatomy heatmap: each exercise now tags which AVAILABLE_MUSCLES ids
-- (app/constants/catalog.ts) it targets, split into prime movers (rendered
-- at full emerald opacity) and synergists (rendered faint) by AnatomyHeatmap.
-- Arrays of muscle ids, not SVG path ids — app/constants/muscleMapping.ts is
-- what resolves a muscle id to the actual <path> ids to highlight.
alter table public.exercises
  add column prime_movers text[] not null default '{}'::text[],
  add column synergists text[] not null default '{}'::text[];
