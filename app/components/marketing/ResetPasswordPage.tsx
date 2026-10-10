"use client";

import { Globe, KeyRound } from "lucide-react";
import { useAuth } from "@/app/context/AuthContext";
import { useAuthSession } from "@/app/hooks/useAuthSession";
import { isPasswordConfirmed, isStrongPassword } from "@/app/utils/validation";
import PasswordFieldsWithStrength from "@/app/components/marketing/PasswordFieldsWithStrength";

// Reached only via a password-recovery link — AuthContext's
// onAuthStateChange listener routes the PASSWORD_RECOVERY event here
// instead of straight into patient/admin view.
export default function ResetPasswordPage() {
  const { lang, setLang } = useAuth();
  const { newPassword, setNewPassword, newPasswordConfirm, setNewPasswordConfirm, handleSetNewPassword } = useAuthSession();

  const canSubmit = isStrongPassword(newPassword) && isPasswordConfirmed(newPassword, newPasswordConfirm);

  return (
    <div
      className="relative min-h-screen flex items-center justify-center p-4"
      style={{ background: "radial-gradient(120% 70% at 50% 0%, var(--bg-elevated) 0%, var(--bg-page) 62%), linear-gradient(180deg, var(--bg-elevated), var(--bg-page) 55%)" }}
      dir={lang === "he" ? "rtl" : "ltr"}
    >
      <div
        className="absolute inset-0"
        style={{
          background:
            "radial-gradient(circle at 20% 20%, color-mix(in srgb, var(--accent) 18%, transparent), transparent 45%), radial-gradient(circle at 85% 10%, color-mix(in srgb, var(--accent) 10%, transparent), transparent 40%)",
        }}
      ></div>
      <div className="on-light bg-surface backdrop-blur-xl p-8 md:p-12 rounded-[2rem] shadow-elevated w-full max-w-md relative z-10 border border-line animate-card-in">
        <div className="flex justify-between items-center mb-2">
          <h2 className="text-3xl font-black text-fg flex items-center gap-2">
            <KeyRound size={28} className="text-accent-fg" /> קביעת סיסמה חדשה
          </h2>
          <button
            onClick={() => setLang(lang === "he" ? "en" : "he")}
            className="on-light bg-surface-alt hover:bg-line text-fg px-3 py-1 rounded-full font-bold text-xs flex items-center gap-1"
          >
            <Globe size={14} /> {lang === "he" ? "English" : "עברית"}
          </button>
        </div>
        <p className="text-sm text-muted mb-6 font-medium">בחר סיסמה חדשה לחשבונך.</p>

        <form onSubmit={handleSetNewPassword} className="space-y-4">
          <PasswordFieldsWithStrength
            password={newPassword}
            setPassword={setNewPassword}
            confirmPassword={newPasswordConfirm}
            setConfirmPassword={setNewPasswordConfirm}
            passwordPlaceholder="סיסמה חדשה"
            confirmPlaceholder="אימות סיסמה חדשה"
            passwordLabel="סיסמה חדשה"
            confirmLabel="אימות סיסמה חדשה"
          />

          <button
            type="submit"
            disabled={!canSubmit}
            className="w-full bg-btn-primary text-btn-primary-fg py-4 rounded-xl font-bold hover:bg-btn-primary-hover active:bg-btn-primary-active transition-colors mt-6 shadow-md text-lg disabled:bg-disabled disabled:text-disabled-fg disabled:cursor-not-allowed disabled:hover:bg-disabled"
          >
            עדכן סיסמה
          </button>
        </form>
      </div>
    </div>
  );
}
