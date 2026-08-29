-- package_exercises: pre-existing RLS-enabled-with-zero-policies state
-- (the project's ensure_rls event trigger auto-enabled it on creation) was
-- silently blocking ProtocolBuilder's template load/save entirely. Admin-only
-- content — confirmed via call sites (LegacyAdminApp.tsx only), no
-- patient-facing access anywhere.
create policy "package_exercises_admin_only" on public.package_exercises
  for all
  using (public.is_admin())
  with check (public.is_admin());

-- packages: had RLS disabled entirely (fully open to the anon key). Same
-- admin-only content, same call sites (LegacyAdminApp.tsx only) — no
-- patient-facing SELECT anywhere in the app.
alter table public.packages enable row level security;
create policy "packages_admin_only" on public.packages
  for all
  using (public.is_admin())
  with check (public.is_admin());
