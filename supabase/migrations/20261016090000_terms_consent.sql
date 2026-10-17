-- Consent to the terms of use + privacy policy (/terms, /privacy), required
-- by the notice/consent duty in חוק הגנת הפרטיות (the app holds health data).
-- terms_version is the LEGAL_VERSION (app/constants/legal.ts) that was
-- accepted; a patient whose version differs is asked again (ConsentGate).
--
-- Email signups consent on the register form and pass the version in the
-- signUp metadata; the trigger stamps it with the server's clock. Google
-- signups and existing patients have none and consent in the app instead,
-- updating their own row (existing self-update RLS on patients).

alter table public.patients
  add column if not exists terms_version text,
  add column if not exists terms_accepted_at timestamptz;

create or replace function public.handle_new_patient()
returns trigger
language plpgsql
security definer
set search_path to 'public'
as $function$
declare
  accepted_version text := nullif(trim(new.raw_user_meta_data->>'terms_version'), '');
begin
  insert into public.patients (user_id, full_name, first_name, email, patient_type, premium_tracks, terms_version, terms_accepted_at)
  values (
    new.id,
    coalesce(new.raw_user_meta_data->>'full_name', 'מטופל חדש'),
    nullif(trim(new.raw_user_meta_data->>'first_name'), ''),
    new.email,
    coalesce(new.raw_user_meta_data->>'patient_type', 'fitness'),
    '',
    accepted_version,
    case when accepted_version is not null then now() end
  );
  return new;
end;
$function$;
