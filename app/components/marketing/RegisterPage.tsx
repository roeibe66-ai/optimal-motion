"use client";

import { Dumbbell, HeartPulse, UserPlus } from "lucide-react";
import { useAuth } from "@/app/context/AuthContext";
import { useAuthSession } from "@/app/hooks/useAuthSession";
import { isPasswordConfirmed, isStrongPassword } from "@/app/utils/validation";
import PasswordFieldsWithStrength from "@/app/components/marketing/PasswordFieldsWithStrength";

export default function RegisterPage() {
  const { lang, t, setCurrentView } = useAuth();
  const {
    regFirstName,
    setRegFirstName,
    regLastName,
    setRegLastName,
    regEmail,
    setRegEmail,
    regPass,
    setRegPass,
    regConfirmPass,
    setRegConfirmPass,
    regPatientType,
    setRegPatientType,
    handleRegister,
    handleGoogleSignIn,
  } = useAuthSession();

  const canSubmit = isStrongPassword(regPass) && isPasswordConfirmed(regPass, regConfirmPass);

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
      <div className="bg-white/95 backdrop-blur-xl p-8 md:p-12 rounded-[2rem] shadow-2xl w-full max-w-md relative z-10 border border-white/20 animate-in zoom-in duration-300">
        <div className="flex justify-between items-center mb-6">
          <h2 className="text-3xl font-black text-stone-900 flex items-center gap-2">
            <UserPlus size={28} className="text-teal-500" /> {t.signup}
          </h2>
        </div>
        <p className="text-sm text-stone-500 mb-6 font-medium">הצטרף למערכת כדי לקבל גישה לתוכניות המקצועיות שלנו.</p>

        <form onSubmit={handleRegister} className="space-y-4">
          <div className="flex gap-4">
            <input
              type="text"
              placeholder="שם פרטי"
              value={regFirstName}
              onChange={(e) => setRegFirstName(e.target.value)}
              className="w-1/2 border-b-2 border-stone-200 p-3 bg-transparent focus:border-teal-500 outline-none transition-colors"
              required
            />
            <input
              type="text"
              placeholder="שם משפחה"
              value={regLastName}
              onChange={(e) => setRegLastName(e.target.value)}
              className="w-1/2 border-b-2 border-stone-200 p-3 bg-transparent focus:border-teal-500 outline-none transition-colors"
              required
            />
          </div>
          <input
            type="email"
            placeholder="אימייל"
            value={regEmail}
            onChange={(e) => setRegEmail(e.target.value)}
            className="w-full border-b-2 border-stone-200 p-3 bg-transparent focus:border-teal-500 outline-none transition-colors"
            required
          />
          <PasswordFieldsWithStrength password={regPass} setPassword={setRegPass} confirmPassword={regConfirmPass} setConfirmPassword={setRegConfirmPass} />

          <div>
            <label className="block text-xs font-bold text-stone-500 mb-2 uppercase">מסלול</label>
            <div className="flex gap-3">
              <button
                type="button"
                onClick={() => setRegPatientType("clinical")}
                className={`flex-1 py-3 rounded-xl text-sm font-bold flex flex-col items-center gap-2 border-2 transition-all ${
                  regPatientType === "clinical" ? "border-blue-500 bg-blue-50 text-blue-700" : "border-stone-100 bg-white text-stone-400 hover:border-stone-200"
                }`}
              >
                <HeartPulse size={20} /> שיקום
              </button>
              <button
                type="button"
                onClick={() => setRegPatientType("fitness")}
                className={`flex-1 py-3 rounded-xl text-sm font-bold flex flex-col items-center gap-2 border-2 transition-all ${
                  regPatientType === "fitness" ? "border-amber-500 bg-amber-50 text-amber-700" : "border-stone-100 bg-white text-stone-400 hover:border-stone-200"
                }`}
              >
                <Dumbbell size={20} /> כושר
              </button>
            </div>
          </div>

          <button
            type="submit"
            disabled={!canSubmit}
            className="w-full bg-teal-500 text-white py-4 rounded-xl font-bold hover:bg-teal-600 transition-colors mt-6 shadow-md text-lg disabled:opacity-40 disabled:cursor-not-allowed disabled:hover:bg-teal-500"
          >
            צור משתמש
          </button>
        </form>

        <div className="flex items-center gap-3 my-5">
          <div className="flex-1 h-px bg-stone-200"></div>
          <span className="text-xs font-bold text-stone-400">או</span>
          <div className="flex-1 h-px bg-stone-200"></div>
        </div>

        <button
          type="button"
          onClick={handleGoogleSignIn}
          className="w-full flex items-center justify-center gap-3 border-2 border-stone-200 text-stone-700 py-3.5 rounded-xl font-bold hover:bg-stone-50 transition-colors"
        >
          <svg width="18" height="18" viewBox="0 0 18 18" aria-hidden="true">
            <path fill="#4285F4" d="M17.64 9.2c0-.64-.06-1.25-.16-1.84H9v3.48h4.84a4.14 4.14 0 0 1-1.8 2.72v2.26h2.9c1.7-1.56 2.7-3.86 2.7-6.62Z" />
            <path fill="#34A853" d="M9 18c2.43 0 4.47-.8 5.96-2.18l-2.9-2.26c-.8.54-1.84.86-3.06.86-2.35 0-4.34-1.59-5.05-3.72H.96v2.33A9 9 0 0 0 9 18Z" />
            <path fill="#FBBC05" d="M3.95 10.7A5.4 5.4 0 0 1 3.68 9c0-.59.1-1.16.27-1.7V4.97H.96A9 9 0 0 0 0 9c0 1.45.35 2.83.96 4.03l2.99-2.33Z" />
            <path fill="#EA4335" d="M9 3.58c1.32 0 2.51.46 3.44 1.35l2.58-2.58C13.46.89 11.43 0 9 0A9 9 0 0 0 .96 4.97l2.99 2.33C4.66 5.17 6.65 3.58 9 3.58Z" />
          </svg>
          המשך עם Google
        </button>

        <div className="mt-6 text-center">
          <button
            onClick={() => setCurrentView("login")}
            className="text-sm font-bold text-stone-600 hover:text-stone-800 transition-colors"
          >
            כבר יש לך משתמש? לחץ להתחברות
          </button>
        </div>
      </div>
    </div>
  );
}
