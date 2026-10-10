-- Store the patient's first name on its own (requested 2026-10-10).
--
-- The home greeting ("היי <first name>,") took full_name.split(" ")[0], so a
-- two-word first name typed into the signup form's first-name field
-- ("בת שבע", "בן ציון") was greeted by its first word only ("היי בת,").
-- full_name stays "first last" for everything else; first_name is what the
-- patient actually typed as their first name.
--
-- Nullable with no backfill: existing patients' first names can't be
-- recovered reliably from full_name (that's the bug), so the app falls back to
-- the old first-word behavior when first_name is null.

alter table public.patients add column if not exists first_name text;

-- Signup passes first_name in the auth user metadata alongside full_name
-- (useAuthSession.ts). Same function body as before plus that one column.
create or replace function public.handle_new_patient()
returns trigger
language plpgsql
security definer
set search_path to 'public'
as $function$
begin
  insert into public.patients (user_id, full_name, first_name, email, patient_type, premium_tracks)
  values (
    new.id,
    coalesce(new.raw_user_meta_data->>'full_name', 'מטופל חדש'),
    nullif(trim(new.raw_user_meta_data->>'first_name'), ''),
    new.email,
    coalesce(new.raw_user_meta_data->>'patient_type', 'fitness'),
    ''
  );
  return new;
end;
$function$;
