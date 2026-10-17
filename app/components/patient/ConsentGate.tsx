"use client";

import { useRef, useState } from "react";
import Link from "next/link";
import { Loader2, ShieldCheck } from "lucide-react";
import { supabase } from "@/app/lib/supabase";
import { useAuth } from "@/app/context/AuthContext";
import { useDialog } from "@/app/hooks/useDialog";
import { notify } from "@/app/components/ui/feedback";
import { LEGAL_VERSION } from "@/app/constants/legal";

// Blocks the patient app until the current terms + privacy policy
// (LEGAL_VERSION) are accepted. Catches everyone the register-form checkbox
// doesn't: Google signups, patients from before consent existed, and every
// patient again after LEGAL_VERSION is bumped. The only other way out is
// signing out — no consent, no processing of their data.
export function needsConsent(patient: { role?: string; terms_version?: string | null } | null) {
  return !!patient && patient.role !== "admin" && patient.terms_version !== LEGAL_VERSION;
}

export default function ConsentGate() {
  const { loggedInPatient, setLoggedInPatient, handleLogout } = useAuth();
  const [accepted, setAccepted] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const dialogRef = useRef<HTMLDivElement>(null);
  useDialog(dialogRef, true);

  const isUpdate = !!loggedInPatient?.terms_version;

  const accept = async () => {
    if (!loggedInPatient || !accepted) return;
    setIsSaving(true);
    const { data, error } = await supabase
      .from("patients")
      .update({ terms_version: LEGAL_VERSION, terms_accepted_at: new Date().toISOString() })
      .eq("id", loggedInPatient.id)
      .select()
      .single();
    setIsSaving(false);
    if (error || !data) {
      notify("השמירה נכשלה: " + (error?.message ?? "נסו שוב"), "error");
      return;
    }
    setLoggedInPatient(data);
  };

  return (
    <div
      ref={dialogRef}
      role="dialog"
      aria-modal="true"
      aria-labelledby="consent-title"
      className="fixed inset-0 z-[300] bg-page text-fg flex flex-col items-center justify-center p-6 overflow-y-auto"
      dir="rtl"
    >
      <div className="w-full max-w-md flex flex-col gap-5">
        <ShieldCheck size={44} className="text-accent-fg" />
        <h2 id="consent-title" className="text-2xl font-black tracking-tight">
          {isUpdate ? "עדכנו את תנאי השימוש" : "לפני שמתחילים"}
        </h2>
        <p className="text-sm text-muted leading-relaxed">
          {isUpdate
            ? "עדכנו את תנאי השימוש ואת מדיניות הפרטיות. כדי להמשיך להשתמש באפליקציה, נבקש שתעברו עליהם ותאשרו."
            : "כדי להתאים לך אימונים אנחנו שומרים מידע על האימונים שלך, ואם תבחר/י למסור — גם מידע בריאותי כמו כאבים ופציעות. כאן מוסבר מה נשמר, למה, ומה הזכויות שלך."}
        </p>

        <div className="flex gap-3 text-sm font-bold">
          <Link href="/terms" target="_blank" className="text-accent-fg underline">
            תנאי השימוש
          </Link>
          <Link href="/privacy" target="_blank" className="text-accent-fg underline">
            מדיניות הפרטיות
          </Link>
        </div>

        <label className="flex items-start gap-2.5 text-sm leading-relaxed cursor-pointer">
          <input
            type="checkbox"
            checked={accepted}
            onChange={(e) => setAccepted(e.target.checked)}
            className="mt-1 w-4 h-4 shrink-0 accent-[var(--accent-fg)]"
          />
          <span>
            קראתי ואני מסכים/ה לתנאי השימוש ולמדיניות הפרטיות, כולל ההבהרה הרפואית (התייעצות עם רופא לפני תחילת אימונים
            במקרה של מצב רפואי) ושמירת המידע הבריאותי שאמסור לצורך התאמת האימונים.
          </span>
        </label>

        <button
          onClick={accept}
          disabled={!accepted || isSaving}
          className="w-full flex items-center justify-center bg-btn-primary text-btn-primary-fg py-4 rounded-full font-black hover:bg-btn-primary-hover active:bg-btn-primary-active transition-ui duration-150 ease-out active:scale-[0.97] disabled:bg-disabled disabled:text-disabled-fg disabled:cursor-not-allowed"
        >
          {isSaving ? <Loader2 size={20} className="animate-spin" /> : "אישור והמשך"}
        </button>
        <button onClick={handleLogout} className="text-sm font-bold text-muted hover:text-fg transition-colors">
          לא עכשיו — התנתקות
        </button>
      </div>
    </div>
  );
}
