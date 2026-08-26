"use client";

import { Fingerprint, Globe, ScanFace } from "lucide-react";
import { useAuth } from "@/app/context/AuthContext";
import { useAuthSession } from "@/app/hooks/useAuthSession";

export default function LoginPage() {
  const { lang, setLang, t, setCurrentView } = useAuth();
  const {
    loginIdentifier,
    setLoginIdentifier,
    loginPassword,
    setLoginPassword,
    rememberMe,
    setRememberMe,
    handleLogin,
  } = useAuthSession();

  return (
    <div
      className="relative min-h-screen flex items-center justify-center p-4 bg-[url('https://images.unsplash.com/photo-1544367567-0f2fcb009e0b?ixlib=rb-4.0.3&auto=format&fit=crop&w=2000&q=80')] bg-cover bg-center"
      dir={lang === "he" ? "rtl" : "ltr"}
    >
      <div className="absolute inset-0 bg-stone-900/60 backdrop-blur-md"></div>
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
            type="text"
            placeholder="אימייל (למתאמנים) או טלפון (למטופלים)"
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

          <label className="flex items-center gap-2 cursor-pointer mt-2 text-stone-600 text-sm font-medium">
            <input
              type="checkbox"
              checked={rememberMe}
              onChange={(e) => setRememberMe(e.target.checked)}
              className="w-4 h-4 accent-teal-500"
            />
            זכור אותי במכשיר זה
          </label>

          <button type="submit" className="w-full bg-stone-900 text-white py-4 rounded-xl font-bold hover:bg-teal-600 transition-colors mt-2">
            התחבר
          </button>
        </form>

        <div className="mt-6 flex flex-col gap-3">
          <div className="flex items-center gap-3">
            <div className="h-px bg-stone-200 flex-1"></div>
            <span className="text-xs text-stone-400 font-bold uppercase">או כניסה מהירה</span>
            <div className="h-px bg-stone-200 flex-1"></div>
          </div>
          <button
            onClick={() => alert("להפעלת התחברות ביומטרית, יש לאשר בהגדרות החשבון לאחר הכניסה הראשונית.")}
            className="w-full bg-stone-50 border border-stone-200 text-stone-700 py-3.5 rounded-xl font-bold hover:bg-stone-100 transition-colors flex items-center justify-center gap-2"
          >
            <ScanFace size={20} className="text-teal-500" />
            <Fingerprint size={20} className="text-teal-500" />
            התחבר עם Face ID
          </button>
        </div>

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
          <button onClick={() => setCurrentView("landing")} className="text-sm font-bold text-stone-400 hover:text-stone-800 transition-colors">
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
