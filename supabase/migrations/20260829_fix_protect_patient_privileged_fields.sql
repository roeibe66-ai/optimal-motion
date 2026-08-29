-- Bug found during end-to-end RLS verification (real signup + login +
-- privilege-escalation attempts via the actual anon-key client, plus a
-- direct-SQL admin role flip): the original protect_patient_privileged_fields
-- trigger checked only is_admin(), which resolves via auth.uid() — that's
-- NULL for both an anon client request AND trusted direct SQL access
-- (dashboard, service role, migrations). The trigger couldn't tell them
-- apart, so it silently reverted legitimate direct-SQL role management too
-- (e.g. the admin bootstrap flip in step 6's own instructions).
--
-- Fix: only enforce the restriction for real PostgREST traffic
-- (auth.role() = 'authenticated', which is unset for direct SQL) — verified
-- both that this unblocks direct SQL and that it still fully blocks the
-- same escalation attempt via a real authenticated client afterward.
create or replace function public.protect_patient_privileged_fields()
returns trigger
language plpgsql
set search_path = public
as $$
begin
  if auth.role() = 'authenticated' and not public.is_admin() then
    new.role := old.role;
    new.premium_tracks := old.premium_tracks;
    new.patient_type := old.patient_type;
  end if;
  return new;
end;
$$;
