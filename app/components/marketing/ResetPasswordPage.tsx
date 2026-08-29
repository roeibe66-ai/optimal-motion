"use client";

import { KeyRound } from "lucide-react";
import { useAuth } from "@/app/context/AuthContext";
import { useAuthSession } from "@/app/hooks/useAuthSession";
import { isPasswordConfirmed, isStrongPassword } from "@/app/utils/validation";
import PasswordFieldsWithStrength from "@/app/components/marketing/PasswordFieldsWithStrength";

// Reached only via a password-recovery link — AuthContext's
// onAuthStateChange listener routes the PASSWORD_RECOVERY event here
// instead of straight into patient/admin view.
export default function ResetPasswordPage() {
  const { lang } = useAuth();
  const { newPassword, setNewPassword, newPasswordConfirm, setNewPasswordConfirm, handleSetNewPassword } = useAuthSession();

  const canSubmit = isStrongPassword(newPassword) && isPasswordConfirmed(newPassword, newPasswordConfirm);

  return (
    <div
      className="relative min-h-screen flex items-center justify-center p-4"
      style={{ background: "radial-gradient(120% 70% at 50% 0%, #3d2a14 0%, #0c0a09 62%), linear-gradient(180deg, #2a1c0e, #0c0a09 55%)" }}
      dir={lang === "he" ? "rtl" : "ltr"}
    >
      <div
        className="absolute inset-0"
        style={{
          background:
            "radial-gradient(circle at 20% 20%, rgba(245,158,11,0.28), transparent 45%), radial-gradient(circle at 85% 10%, rgba(20,184,166,0.10), transparent 40%)",
        }}
      ></div>
      <div className="bg-white/95 backdrop-blur-xl p-8 md:p-12 rounded-[2rem] shadow-2xl w-full max-w-md relative z-10 border border-white/20">
        <h2 className="text-3xl font-black text-stone-900 flex items-center gap-2 mb-2">
          <KeyRound size={28} className="text-teal-500" /> קביעת סיסמה חדשה
        </h2>
        <p className="text-sm text-stone-500 mb-6 font-medium">בחר סיסמה חדשה לחשבונך.</p>

        <form onSubmit={handleSetNewPassword} className="space-y-4">
          <PasswordFieldsWithStrength
            password={newPassword}
            setPassword={setNewPassword}
            confirmPassword={newPasswordConfirm}
            setConfirmPassword={setNewPasswordConfirm}
            passwordPlaceholder="סיסמה חדשה"
            confirmPlaceholder="אימות סיסמה חדשה"
          />

          <button
            type="submit"
            disabled={!canSubmit}
            className="w-full bg-teal-500 text-white py-4 rounded-xl font-bold hover:bg-teal-600 transition-colors mt-6 shadow-md text-lg disabled:opacity-40 disabled:cursor-not-allowed disabled:hover:bg-teal-500"
          >
            עדכן סיסמה
          </button>
        </form>
      </div>
    </div>
  );
}
