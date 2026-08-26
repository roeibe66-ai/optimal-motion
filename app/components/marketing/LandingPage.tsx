"use client";

import { Globe } from "lucide-react";
import { useAuth } from "@/app/context/AuthContext";

export default function LandingPage() {
  const { lang, setLang, t, setCurrentView } = useAuth();

  return (
    <div className="min-h-screen flex flex-col font-sans relative" dir={lang === "he" ? "rtl" : "ltr"}>
      <div className="absolute inset-0 z-0 bg-[url('https://images.unsplash.com/photo-1544367567-0f2fcb009e0b?ixlib=rb-4.0.3&auto=format&fit=crop&w=2000&q=80')] bg-cover bg-center">
        <div className="absolute inset-0 bg-stone-900/60 backdrop-blur-sm"></div>
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
