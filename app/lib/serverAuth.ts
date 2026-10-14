import "server-only";
import { createClient } from "@supabase/supabase-js";

// Server actions are public endpoints: anyone who loads the site can find
// their ids in the client bundle and call them with any arguments. Every
// action that spends API credits (the AI assistants, the research agent)
// takes the caller's Supabase access token and checks it here first.
export interface VerifiedCaller {
  userId: string;
  isAdmin: boolean;
}

export async function verifyCaller(accessToken: string): Promise<VerifiedCaller | null> {
  if (!accessToken) return null;
  const userClient = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!, {
    global: { headers: { Authorization: `Bearer ${accessToken}` } },
    auth: { autoRefreshToken: false, persistSession: false },
  });
  // getUser validates the token with Supabase Auth (signature + expiry +
  // not signed out), unlike decoding the JWT locally.
  const { data: userData, error: userError } = await userClient.auth.getUser(accessToken);
  if (userError || !userData.user) return null;
  // is_admin() checks patients.role for auth.uid().
  const { data: isAdmin, error } = await userClient.rpc("is_admin");
  return { userId: userData.user.id, isAdmin: !error && isAdmin === true };
}
