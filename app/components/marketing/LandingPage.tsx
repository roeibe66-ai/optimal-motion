"use client";

import { useAuth } from "@/app/context/AuthContext";

export default function LandingPage() {
  const { lang, setLang, t, setCurrentView } = useAuth();

  return (
    <div className="min-h-screen relative overflow-hidden bg-[#0c0a09] text-white" dir={lang === "he" ? "rtl" : "ltr"}>
      {/* Illustrated sunset sky — CSS/SVG stand-in per the brief; swap this layer for a real photo later, nothing else needs to change */}
      <div
        className="absolute inset-0"
        style={{
          background:
            "linear-gradient(180deg, #170d07 0%, #3c1f0f 22%, #9a3e10 46%, #f2984c 58%, #d9631f 66%, #4a230f 80%, #120905 100%)",
        }}
      ></div>
      <div
        className="absolute inset-0"
        style={{ background: "radial-gradient(45% 28% at 50% 58%, rgba(255,205,140,0.9), rgba(255,150,70,0.35) 45%, transparent 72%)" }}
      ></div>

      {/* handstand silhouette */}
      <svg
        viewBox="0 0 200 420"
        className="absolute left-1/2 top-[120px] md:top-[130px] -translate-x-1/2 w-[185px] h-[388px] md:w-[300px] md:h-[630px] opacity-95"
      >
        <ellipse cx="77" cy="415" rx="17" ry="5" fill="rgba(0,0,0,0.35)" />
        <ellipse cx="123" cy="415" rx="17" ry="5" fill="rgba(0,0,0,0.35)" />
        <rect x="68" y="300" width="18" height="120" rx="9" transform="rotate(-6 77 300)" fill="rgba(8,5,3,0.94)" />
        <rect x="114" y="300" width="18" height="120" rx="9" transform="rotate(6 123 300)" fill="rgba(8,5,3,0.94)" />
        <circle cx="101" cy="333" r="27" fill="rgba(8,5,3,0.94)" />
        <rect x="78" y="200" width="46" height="112" rx="18" fill="rgba(8,5,3,0.94)" />
        <rect x="76" y="184" width="50" height="22" rx="11" fill="rgba(8,5,3,0.94)" />
        <rect x="78" y="17" width="20" height="173" rx="10" fill="rgba(8,5,3,0.94)" />
        <rect x="104" y="24" width="20" height="166" rx="10" fill="rgba(8,5,3,0.94)" />
      </svg>

      {/* darken overlay for text/button legibility */}
      <div
        className="absolute inset-0"
        style={{
          background:
            "linear-gradient(180deg, rgba(6,4,2,0.62) 0%, rgba(6,4,2,0.08) 20%, rgba(6,4,2,0.05) 55%, rgba(6,4,2,0.75) 100%)",
        }}
      ></div>

      <button
        onClick={() => setLang(lang === "he" ? "en" : "he")}
        className="absolute top-6 left-5 md:top-8 md:left-14 z-10 bg-white/10 hover:bg-white/20 border border-white/20 text-white text-[11px] md:text-xs font-extrabold px-[13px] py-1.5 md:px-4 md:py-2 rounded-full transition-colors"
      >
        {lang === "he" ? "EN" : "עב"}
      </button>

      <div className="absolute top-10 md:top-14 inset-x-0 text-center z-10">
        <span className="text-[19px] md:text-2xl font-black tracking-[0.1em] md:tracking-[0.14em] uppercase">
          Optimal<span className="text-amber-400">Motion</span>
        </span>
      </div>

      <div className="absolute inset-x-6 bottom-10 md:inset-x-0 md:bottom-14 z-10 flex flex-col md:flex-row md:justify-center gap-3 md:gap-3.5">
        <button
          onClick={() => setCurrentView("login")}
          className="w-full md:w-auto bg-teal-500 text-stone-950 font-black text-[15px] md:text-base px-6 py-4 md:px-11 md:py-[17px] rounded-full shadow-[0_14px_32px_-10px_rgba(20,184,166,0.5)] md:shadow-[0_16px_40px_-12px_rgba(20,184,166,0.5)] hover:bg-teal-400 transition-colors"
        >
          {t.login}
        </button>
        <button
          onClick={() => setCurrentView("register")}
          className="w-full md:w-auto bg-white/95 text-stone-900 font-black text-[15px] md:text-base px-6 py-4 md:px-11 md:py-[17px] rounded-full shadow-[0_14px_32px_-10px_rgba(0,0,0,0.4)] md:shadow-[0_16px_40px_-12px_rgba(0,0,0,0.4)] hover:bg-stone-200 transition-colors"
        >
          {t.signup}
        </button>
      </div>
    </div>
  );
}
