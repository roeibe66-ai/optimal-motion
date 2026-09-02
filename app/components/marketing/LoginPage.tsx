"use client";

import { useState } from "react";
import { Globe, Mail } from "lucide-react";
import { useAuth } from "@/app/context/AuthContext";
import { useAuthSession } from "@/app/hooks/useAuthSession";

export default function LoginPage() {
  const { lang, setLang, t, setCurrentView } = useAuth();
  const {
    loginIdentifier,
    setLoginIdentifier,
    loginPassword,
    setLoginPassword,
    handleLogin,
    handleGoogleSignIn,
    forgotEmail,
    setForgotEmail,
    forgotSent,
    handleForgotPassword,
  } = useAuthSession();
  const [showForgotPassword, setShowForgotPassword] = useState(false);

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
        <div className="flex justify-between items-center mb-6">
          <h2 className="text-3xl font-black text-stone-900">{t.login}</h2>
          <button
            onClick={() => setLang(lang === "he" ? "en" : "he")}
            className="bg-stone-100 hover:bg-stone-200 text-stone-700 px-3 py-1 rounded-full font-bold text-xs flex items-center gap-1"
          >
            <Globe size={14} /> {lang === "he" ? "English" : "עברית"}
          </button>
        </div>
        {showForgotPassword ? (
          forgotSent ? (
            <div className="text-center py-4">
              <Mail className="mx-auto text-teal-500 mb-3" size={40} />
              <h3 className="text-lg font-bold text-stone-900 mb-2">בדוק את תיבת הדואר שלך</h3>
              <p className="text-sm text-stone-500 mb-6">אם הכתובת {forgotEmail} רשומה במערכת, שלחנו אליה קישור לאיפוס הסיסמה.</p>
              <button onClick={() => setShowForgotPassword(false)} className="text-sm font-bold text-teal-600 hover:text-teal-700 transition-colors">
                חזור להתחברות
              </button>
            </div>
          ) : (
            <form onSubmit={handleForgotPassword} className="space-y-5">
              <p className="text-sm text-stone-500">הזן את כתובת המייל שלך ונשלח אליה קישור לאיפוס הסיסמה.</p>
              <input
                type="email"
                placeholder="אימייל"
                value={forgotEmail}
                onChange={(e) => setForgotEmail(e.target.value)}
                className="w-full border-b-2 border-stone-200 p-3 bg-transparent focus:border-teal-500 outline-none transition-colors"
                required
              />
              <button type="submit" className="w-full bg-stone-900 text-white py-4 rounded-xl font-bold hover:bg-teal-600 transition-colors mt-2">
                שלח קישור לאיפוס
              </button>
              <button
                type="button"
                onClick={() => setShowForgotPassword(false)}
                className="w-full text-center text-sm font-bold text-stone-600 hover:text-stone-800 transition-colors"
              >
                חזור להתחברות
              </button>
            </form>
          )
        ) : (
          <>
            <form onSubmit={handleLogin} className="space-y-5">
              <input
                type="email"
                placeholder="אימייל"
                value={loginIdentifier}
                onChange={(e) => setLoginIdentifier(e.target.value)}
                className="w-full border-b-2 border-stone-200 p-3 bg-transparent focus:border-teal-500 outline-none transition-colors"
                required
              />
              <input
                type="password"
                placeholder="סיסמה"
                value={loginPassword}
                onChange={(e) => setLoginPassword(e.target.value)}
                className="w-full border-b-2 border-stone-200 p-3 bg-transparent focus:border-teal-500 outline-none transition-colors"
                required
              />

              <button type="submit" className="w-full bg-stone-900 text-white py-4 rounded-xl font-bold hover:bg-teal-600 transition-colors mt-2">
                התחבר
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

            <button
              onClick={() => setShowForgotPassword(true)}
              className="w-full text-center mt-6 text-teal-600 hover:text-teal-700 font-bold transition-colors"
            >
              {t.forgot_pass}
            </button>
            <div className="flex justify-between items-center mt-4 pt-4 border-t border-stone-100">
              <button onClick={() => setCurrentView("landing")} className="text-sm font-bold text-stone-600 hover:text-stone-800 transition-colors">
                חזור
              </button>
              <button onClick={() => setCurrentView("register")} className="text-sm font-black text-teal-600 hover:text-teal-800 transition-colors">
                משתמש חדש? הירשם כאן
              </button>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
