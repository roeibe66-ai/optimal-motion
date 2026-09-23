-- Real WebAuthn passkey credentials, registered from the post-login "enable
-- Face ID / Touch ID" prompt. Storage/lookup only ever happens from an
-- already-authenticated browser session (registration ceremony runs after a
-- normal password login) — RLS is scoped to auth.uid() like every other
-- patient-owned table, same pattern as patient_saved_programs.
create table patient_passkeys (
  id uuid primary key default gen_random_uuid(),
  patient_id bigint not null references patients(id) on delete cascade,
  credential_id text not null unique, -- base64url WebAuthn credential id
  public_key text not null, -- base64url-encoded COSE public key
  counter bigint not null default 0, -- signature counter, replay-attack guard
  device_label text, -- best-effort UA-derived label, e.g. "iPhone"
  created_at timestamptz not null default now()
);

alter table patient_passkeys enable row level security;

create policy patient_passkeys_self_or_admin on patient_passkeys
  for all
  using (is_admin() or patient_id in (select id from patients where user_id = auth.uid()))
  with check (is_admin() or patient_id in (select id from patients where user_id = auth.uid()));
