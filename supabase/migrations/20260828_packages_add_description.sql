-- Pre-existing schema gap surfaced while testing ProtocolBuilder's "save
-- template" flow: the code (LegacyAdminApp.tsx's saveBuilderPlan, unrelated
-- to the current UI reskin) and the Package TS type have always expected a
-- description column on packages, but it was never actually added to the
-- live DB, causing "Could not find the 'description' column of 'packages'".
alter table public.packages add column if not exists description text;
