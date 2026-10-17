"use server";

import { verifyCaller } from "@/app/lib/serverAuth";
import { supabaseAdmin } from "@/app/lib/supabaseAdmin";

export type DeleteAccountResult = { ok: true } | { ok: false; error: string };

// "מחיקת חשבון" from the profile — the right promised in /privacy, and what
// Apple (5.1.1(v)) and Google Play require in-app. Deletes the caller's own
// auth user; patients cascades from auth.users, and most patient tables from
// patients. workout_logs and patient_exercises have no ON DELETE CASCADE, so
// they go first, explicitly. Service role: patients can't delete their own
// rows under RLS (patients_delete_admin_only) — the caller's identity comes
// from the verified token, never from an argument.
export async function deleteMyAccount(accessToken: string): Promise<DeleteAccountResult> {
  const caller = await verifyCaller(accessToken);
  if (!caller) return { ok: false, error: "אין הרשאה" };
  // The practitioner's account owns the whole console; deleting it from a
  // profile button would be an accident, not a request.
  if (caller.isAdmin) return { ok: false, error: "חשבון מנהל לא נמחק מכאן" };

  const { data: patient } = await supabaseAdmin.from("patients").select("id").eq("user_id", caller.userId).maybeSingle();
  if (patient) {
    for (const table of ["workout_logs", "patient_exercises"] as const) {
      const { error } = await supabaseAdmin.from(table).delete().eq("patient_id", patient.id);
      if (error) return { ok: false, error: "המחיקה נכשלה. נסו שוב או פנו אלינו." };
    }
  }

  const { error } = await supabaseAdmin.auth.admin.deleteUser(caller.userId);
  if (error) return { ok: false, error: "המחיקה נכשלה. נסו שוב או פנו אלינו." };
  return { ok: true };
}
