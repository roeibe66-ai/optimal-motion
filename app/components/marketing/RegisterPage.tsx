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
