"use client";

import { Dumbbell, Globe, HeartPulse, UserPlus } from "lucide-react";
import { useAuth } from "@/app/context/AuthContext";
import { useAuthSession } from "@/app/hooks/useAuthSession";
import { isPasswordConfirmed, isStrongPassword } from "@/app/utils/validation";
import PasswordFieldsWithStrength from "@/app/components/marketing/PasswordFieldsWithStrength";

export default function RegisterPage() {
  const { lang, setLang, t, setCurrentView } = useAuth();
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
      <div className="on-light bg-surface backdrop-blur-xl p-8 md:p-12 rounded-[2rem] shadow-elevated w-full max-w-md relative z-10 border border-line animate-in zoom-in duration-300">
        <div className="flex justify-between items-center mb-6">
          <h2 className="text-3xl font-black text-fg flex items-center gap-2">
            <UserPlus size={28} className="text-accent-fg" /> {t.signup}
          </h2>
          <button
            onClick={() => setLang(lang === "he" ? "en" : "he")}
            className="on-light bg-surface-alt hover:bg-line text-fg px-3 py-1 rounded-full font-bold text-xs flex items-center gap-1"
          >
            <Globe size={14} /> {lang === "he" ? "English" : "עברית"}
          </button>
        </div>
        <p className="text-sm text-muted mb-6 font-medium">הצטרף למערכת כדי לקבל גישה לתוכניות המקצועיות שלנו.</p>

        <form onSubmit={handleRegister} className="space-y-4">
          <div className="flex gap-4">
            <div className="w-1/2">
              <label htmlFor="reg-first-name" className="block text-xs font-bold text-muted mb-1.5">
                שם פרטי
              </label>
              <input
                id="reg-first-name"
                type="text"
                placeholder="שם פרטי"
                value={regFirstName}
                onChange={(e) => setRegFirstName(e.target.value)}
                className="w-full border-b-2 border-line-input p-3 bg-transparent focus:border-focus focus:ring-2 focus:ring-focus outline-none transition-colors"
                required
              />
            </div>
            <div className="w-1/2">
              <label htmlFor="reg-last-name" className="block text-xs font-bold text-muted mb-1.5">
                שם משפחה
              </label>
              <input
                id="reg-last-name"
                type="text"
                placeholder="שם משפחה"
                value={regLastName}
                onChange={(e) => setRegLastName(e.target.value)}
                className="w-full border-b-2 border-line-input p-3 bg-transparent focus:border-focus focus:ring-2 focus:ring-focus outline-none transition-colors"
                required
              />
            </div>
          </div>
          <div>
            <label htmlFor="reg-email" className="block text-xs font-bold text-muted mb-1.5">
              אימייל
            </label>
            <input
              id="reg-email"
              type="email"
              placeholder="אימייל"
              value={regEmail}
              onChange={(e) => setRegEmail(e.target.value)}
              className="w-full border-b-2 border-line-input p-3 bg-transparent focus:border-focus focus:ring-2 focus:ring-focus outline-none transition-colors"
              required
            />
          </div>
          <PasswordFieldsWithStrength password={regPass} setPassword={setRegPass} confirmPassword={regConfirmPass} setConfirmPassword={setRegConfirmPass} />

          <div>
            <label className="block text-xs font-bold text-muted mb-2 uppercase">מסלול</label>
            <div className="flex gap-3">
              <button
                type="button"
                onClick={() => setRegPatientType("clinical")}
                className={`flex-1 py-3 rounded-xl text-sm font-bold flex flex-col items-center gap-2 border-2 transition-all ${
                  regPatientType === "clinical" ? "border-accent bg-accent/15 text-accent-fg" : "border-line bg-surface text-muted hover:border-line-input"
                }`}
              >
                <HeartPulse size={20} /> שיקום
              </button>
              <button
                type="button"
                onClick={() => setRegPatientType("fitness")}
                className={`flex-1 py-3 rounded-xl text-sm font-bold flex flex-col items-center gap-2 border-2 transition-all ${
                  regPatientType === "fitness" ? "border-accent bg-accent/15 text-accent-fg" : "border-line bg-surface text-muted hover:border-line-input"
                }`}
              >
                <Dumbbell size={20} /> כושר
              </button>
            </div>
          </div>

          <button
            type="submit"
            disabled={!canSubmit}
            className="w-full bg-btn-primary text-btn-primary-fg py-4 rounded-xl font-bold hover:bg-btn-primary-hover active:bg-btn-primary-active transition-colors mt-6 shadow-md text-lg disabled:bg-disabled disabled:text-disabled-fg disabled:cursor-not-allowed disabled:hover:bg-disabled"
          >
            צור משתמש
          </button>
        </form>

        <div className="flex items-center gap-3 my-5">
          <div className="flex-1 h-px bg-line"></div>
          <span className="text-xs font-bold text-muted">או</span>
          <div className="flex-1 h-px bg-line"></div>
        </div>

        <button
          type="button"
          onClick={handleGoogleSignIn}
          className="w-full flex items-center justify-center gap-3 border-2 border-btn-secondary text-accent-fg py-3.5 rounded-xl font-bold hover:bg-btn-secondary-hover transition-colors"
        >
          <svg width="18" height="18" viewBox="0 0 18 18" aria-hidden="true">
            <path style={{ fill: "var(--brand-google-blue)" }} d="M17.64 9.2c0-.64-.06-1.25-.16-1.84H9v3.48h4.84a4.14 4.14 0 0 1-1.8 2.72v2.26h2.9c1.7-1.56 2.7-3.86 2.7-6.62Z" />
            <path style={{ fill: "var(--brand-google-green)" }} d="M9 18c2.43 0 4.47-.8 5.96-2.18l-2.9-2.26c-.8.54-1.84.86-3.06.86-2.35 0-4.34-1.59-5.05-3.72H.96v2.33A9 9 0 0 0 9 18Z" />
            <path style={{ fill: "var(--brand-google-yellow)" }} d="M3.95 10.7A5.4 5.4 0 0 1 3.68 9c0-.59.1-1.16.27-1.7V4.97H.96A9 9 0 0 0 0 9c0 1.45.35 2.83.96 4.03l2.99-2.33Z" />
            <path style={{ fill: "var(--brand-google-red)" }} d="M9 3.58c1.32 0 2.51.46 3.44 1.35l2.58-2.58C13.46.89 11.43 0 9 0A9 9 0 0 0 .96 4.97l2.99 2.33C4.66 5.17 6.65 3.58 9 3.58Z" />
          </svg>
          המשך עם Google
        </button>

        <div className="mt-6 text-center">
          <button
            onClick={() => setCurrentView("login")}
            className="text-sm font-bold text-muted hover:text-fg transition-colors"
          >
            כבר יש לך משתמש? לחץ להתחברות
          </button>
        </div>
      </div>
    </div>
  );
}
