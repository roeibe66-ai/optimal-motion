import "server-only";
import { createClient } from "@supabase/supabase-js";

// Service-role client — bypasses RLS entirely. Only ever import this from
// server-only code (Server Actions, "use server" files): it must never reach
// a client bundle. The `server-only` import above makes that a build error,
// not just a convention, if anything client-side ever imports this file.
//
// Used specifically for the passwordless passkey login flow, where the two
// lookups it needs (patient_passkeys by credential_id, patients by id) have
// to happen *before* any session exists — the normal anon-key `supabase`
// client (app/lib/supabase.ts), scoped to auth.uid() via RLS, can't do that
// by definition. See app/actions/passkeyAuth.ts.
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;

export const supabaseAdmin = createClient(supabaseUrl, serviceRoleKey, {
  auth: { autoRefreshToken: false, persistSession: false },
});
