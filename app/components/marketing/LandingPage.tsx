"use client";

import { Globe } from "lucide-react";
import { useAuth } from "@/app/context/AuthContext";

export default function LandingPage() {
  const { lang, setLang, t, setCurrentView } = useAuth();

  return (
    <div className="min-h-screen flex flex-col font-sans relative" dir={lang === "he" ? "rtl" : "ltr"}>
      {/* Warm hand-drawn gradient, replacing the generic stock photo that used to repeat across landing/login/register */}
      <div
        className="absolute inset-0 z-0"
        style={{ background: "radial-gradient(120% 70% at 50% 0%, #3d2a14 0%, #0c0a09 62%), linear-gradient(180deg, #2a1c0e, #0c0a09 55%)" }}
      >
        <div
          className="absolute inset-0"
          style={{
            background:
              "radial-gradient(circle at 20% 20%, rgba(245,158,11,0.28), transparent 45%), radial-gradient(circle at 85% 10%, rgba(20,184,166,0.10), transparent 40%)",
          }}
        ></div>
      </div>
      <header className="relative z-10 bg-transparent px-4 md:px-12 py-6 flex justify-between items-center">
        <span className="text-xl md:text-2xl font-black text-white tracking-widest uppercase">OptimalMotion</span>
        <div className="flex items-center gap-3">
          <button
            onClick={() => setLang(lang === "he" ? "en" : "he")}
            className="bg-white/10 hover:bg-white/20 text-white border border-white/30 px-3 py-1.5 rounded-full font-bold text-xs flex items-center gap-1.5 transition"
          >
            <Globe size={14} /> {lang === "he" ? "EN" : "עב"}
          </button>
          <button
            onClick={() => setCurrentView("login")}
            className="bg-white/10 hover:bg-white/20 text-white border border-white/30 px-6 py-2.5 rounded-full font-medium transition"
          >
            {t.login}
          </button>
        </div>
      </header>
      <main className="relative z-10 flex-1 flex flex-col items-center justify-center p-4 text-center">
        <h1 className="text-5xl md:text-8xl font-black text-white leading-tight mb-6 tracking-tight">{t.welcome}</h1>
        <div className="flex flex-col md:flex-row gap-4 mt-8">
          <button
            onClick={() => setCurrentView("login")}
            className="bg-teal-500 text-white px-10 py-4 rounded-full text-lg font-bold hover:bg-teal-600 transition"
          >
            {t.personal_area}
          </button>
          <button
            onClick={() => setCurrentView("register")}
            className="bg-white text-stone-900 px-10 py-4 rounded-full text-lg font-bold hover:bg-stone-100 transition shadow-lg"
          >
            {t.signup}
          </button>
        </div>
      </main>
    </div>
  );
}
