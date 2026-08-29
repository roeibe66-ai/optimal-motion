-- Pre-existing, broken debris from before this migration: this trigger
-- fired on every auth.users insert and tried to write into a
-- public.physio_profiles table that doesn't exist anywhere in the current
-- schema (this app uses patients). It silently sat unused while custom auth
-- was in place (nothing ever inserted into auth.users), and started
-- blocking 100% of signups the moment real Supabase Auth registration was
-- tried ("Database error saving new user"). Nothing depends on it
-- succeeding. The correct replacement (a security-definer trigger
-- targeting patients) is planned for step 6, alongside removing the
-- client-side insert in handleRegister.
drop trigger if exists on_auth_user_created on auth.users;
drop function if exists public.handle_new_user();
