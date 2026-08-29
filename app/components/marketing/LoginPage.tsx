"use client";

import { Globe } from "lucide-react";
import { useAuth } from "@/app/context/AuthContext";
import { useAuthSession } from "@/app/hooks/useAuthSession";

export default function LoginPage() {
  const { lang, setLang, t, setCurrentView } = useAuth();
  const { loginIdentifier, setLoginIdentifier, loginPassword, setLoginPassword, handleLogin } = useAuthSession();

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

        <button
          onClick={() =>
            window.open(
              "https://wa.me/972504441094?text=היי, שכחתי את הסיסמה לאפליקציה של הקליניקה. אשמח לעזרה בשחזור!",
              "_blank"
            )
          }
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
      </div>
    </div>
  );
}
