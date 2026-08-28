# Auth Migration Spec — Real Supabase Auth

This replaces the custom plaintext-password auth system with real Supabase Auth, for both patients and the admin/practitioner role, and uses it to unlock real RLS on every patient-data table. This is the Tier 0 foundation item from `roadmap.md` — do this before building more features on top of the current schema.

## Ground rules

1. **Test data can be wiped.** Confirmed with Roei: everything currently in the `patients` table (and anything referencing it) is test/demo data, not real patients. No backfill/migration script needed for existing rows — truncate and let people re-register through the new flow.
2. Same discipline as the UI phase: propose the exact plan (this doc is that proposal), implement, run locally, verify, before moving to the next piece. Don't do this all in one giant commit — auth touches login, register, session restore, and every RLS policy, so breaking it into reviewable steps matters more here than it did for CSS.
3. This is backend/logic work, not visual — no design canvas needed. The existing Login/Register page layouts stay; only the logic underneath changes (plus the two small additions noted below).

## Confirmed current state (verified against the real repo, 2026-08-28)

- `useAuthSession.ts`: login does `supabase.from('patients').select('*').eq(field, identifier).eq('password', password).single()` — plaintext comparison, no hashing.
- The **entire patient row, including the plaintext password field**, gets JSON-serialized into `localStorage`/`sessionStorage` as the session token (`AuthContext.tsx`). This means the raw password isn't only exposed via the database — it's sitting in the browser for the life of the session too.
- Admin login is a literal string check: `if (loginIdentifier === "admin" && loginPassword === "admin")`. No real session, no role system.
- "Forgot password" is not a real flow — it's a button that opens WhatsApp with a pre-filled message asking Roei personally to reset someone's password.
- Password strength validation (`isStrongPassword`: 8+ chars, at least one letter and one digit) already exists and is wired into registration — but only as a blocking `alert()` on submit, no inline feedback, no live strength indicator, and no confirm-password field.
- All 4 registration fields already carry the HTML `required` attribute (browser-native enforcement only).
- `email_verified` column exists on `patients` but is never set to `true` anywhere — this is what permanently blocks premium purchases today (already tracked in the original audit).
- The exercise-timer bug flagged in earlier audits was **re-tested live and is NOT actually broken** — it ticks down correctly. Remove it from the "known bugs" list; there's a stale code comment in `useWorkoutSession.ts` claiming otherwise that's worth deleting as a small aside whenever that file is next touched, but it's not a real blocker.

## Target design

1. **Enable Supabase Auth (email + password provider)** for the project, with email confirmation required — this replaces the custom `email_verified` column entirely with Supabase's own `email_confirmed_at` field on `auth.users`.
2. **Schema change**: drop the `password` column from `patients`. Add `user_id uuid references auth.users(id)` (one-to-one link) and a `role` column (`'patient' | 'admin'`, default `'patient'`) so admin becomes a real authenticated user with a role flag instead of a hardcoded string check.
3. **Registration** (`RegisterPage.tsx` / a rewritten `useAuthSession.ts`): call `supabase.auth.signUp({ email, password })`, then on success insert a `patients` row with `user_id: data.user.id` and the profile fields (no password stored anywhere in `patients`). While rewriting this form's submit logic anyway: add a password-confirmation field, and swap the blocking `alert()` for inline field-level validation with a live strength indicator — small addition, not a separate project, since the file is already being rewritten.
4. **Login**: call `supabase.auth.signInWithPassword({ email, password })`, then fetch the matching `patients` row by `user_id`/`auth.uid()`. Route to admin view or patient view based on the `role` column — this replaces both the hardcoded admin string check and the plaintext DB comparison in one move.
5. **Session persistence**: remove the manual `localStorage`/`sessionStorage` read/write in `AuthContext.tsx`. Supabase Auth persists its own session and exposes `supabase.auth.onAuthStateChange()` — subscribe to that instead of the current manual restore-on-mount effect.
6. **Forgot password**: replace the WhatsApp-link button with `supabase.auth.resetPasswordForEmail()` — a real, automated flow. Needs a small "check your email" confirmation state after the button is pressed.
7. **RLS**: once `auth.uid()` is real, add RLS policies to every patient-data table — `patients`, `patient_exercises`, `workout_logs`, `patient_saved_workouts` (confirm there are no others) — scoped to `user_id = auth.uid()` for patients. For the admin role, either a broader policy gated on the `role` column (via a security-definer function, since RLS can't directly subquery the same table it's protecting without one) or continue using the service-role key server-side for admin operations — decide based on whether any admin actions need to run from the browser with the anon key.
8. **Face ID button** on the login page: it's currently fully decorative (`onClick` just shows an alert saying "enable this in account settings after logging in" — that setting doesn't exist). Recommend removing it rather than leaving dead UI, consistent with how the heart/favorites icon was handled during the UI phase. Flag to Roei if he'd rather keep it as a real future WebAuthn feature instead.

## What's explicitly NOT in scope here

- Social login (Apple/Google) — separate roadmap item (Tier 2), can be added on top of Supabase Auth later without conflicting with this work.
- Any UI restyling — the Login/Register page mockup work is done; only the logic underneath changes.

## Recommended order

1. Enable Supabase Auth + email confirmation in the Supabase project settings.
2. Schema migration: drop `password`, add `user_id` + `role` to `patients`. Show the SQL before running it, same as always.
3. Rewrite `useAuthSession.ts` (register + login) and `AuthContext.tsx` (session restore) to use Supabase Auth instead of manual storage/plaintext comparison.
4. Add the confirm-password field + inline validation to `RegisterPage.tsx` while that logic is already being touched.
5. Wire up real forgot-password via `resetPasswordForEmail`.
6. Add RLS policies across all patient-data tables.
7. Remove the Face ID button (or confirm with Roei to keep it as a flagged future item).
8. `npm run lint` + `npm run build`, then Roei tests the full flow manually: register a new account, confirm email, log in, log out, forgot-password, and log in as admin.
