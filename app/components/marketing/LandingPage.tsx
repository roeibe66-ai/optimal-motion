"use client";

import { useAuth } from "@/app/context/AuthContext";

export default function LandingPage() {
  const { lang, setLang, t, setCurrentView } = useAuth();

  return (
    <div className="min-h-screen relative overflow-hidden bg-shell text-on-dark" dir={lang === "he" ? "rtl" : "ltr"}>
      {/* Full-bleed hero photo — real Unsplash hotlink (Alex Avila, Unsplash
          License, unsplash.com/photos/VAPMuCqepWc), not a repo asset, same
          hotlinking approach PlanTab.tsx's hero already uses. Replaces the
          earlier CSS-gradient-sky + SVG-silhouette stand-in now that a real
          photo is available. */}
      <img
        src="https://images.unsplash.com/photo-1764889743602-21cd1d4e4745?w=2000&q=80&fm=jpg&fit=crop&auto=format"
        alt=""
        className="absolute inset-0 w-full h-full object-cover"
      />

      {/* Dark gradient overlay for text/button legibility over the photo */}
      <div className="absolute inset-0 bg-gradient-to-b from-shell/50 to-shell/80"></div>

      <button
        onClick={() => setLang(lang === "he" ? "en" : "he")}
        className="absolute top-6 left-5 md:top-8 md:left-14 z-10 bg-on-dark/10 hover:bg-on-dark/20 border border-on-dark/20 text-on-dark text-[11px] md:text-xs font-extrabold px-[13px] py-1.5 md:px-4 md:py-2 rounded-full transition-colors"
      >
        {lang === "he" ? "EN" : "עב"}
      </button>

      <div className="absolute top-10 md:top-14 inset-x-0 text-center z-10">
        <span className="text-[19px] md:text-2xl font-black tracking-[0.1em] md:tracking-[0.14em] uppercase">
          Optimal<span className="text-accent">Motion</span>
        </span>
      </div>

      <div className="absolute inset-x-6 bottom-10 md:inset-x-0 md:bottom-14 z-10 flex flex-col md:flex-row md:justify-center gap-3 md:gap-3.5">
        <button
          onClick={() => setCurrentView("login")}
          className="w-full md:w-auto bg-accent text-accent-ink font-black text-[15px] md:text-base px-6 py-4 md:px-11 md:py-[17px] rounded-full shadow-[0_14px_32px_-10px_color-mix(in_srgb,var(--accent)_50%,transparent)] md:shadow-[0_16px_40px_-12px_color-mix(in_srgb,var(--accent)_50%,transparent)] hover:bg-accent-hover active:bg-accent-active transition-colors"
        >
          {t.login}
        </button>
        <button
          onClick={() => setCurrentView("register")}
          className="w-full md:w-auto bg-transparent ring-[1.5px] ring-inset ring-accent text-accent hover:bg-accent/12 font-black text-[15px] md:text-base px-6 py-4 md:px-11 md:py-[17px] rounded-full shadow-[0_14px_32px_-10px_color-mix(in_srgb,var(--bg-base)_40%,transparent)] md:shadow-[0_16px_40px_-12px_color-mix(in_srgb,var(--bg-base)_40%,transparent)] transition-colors"
        >
          {t.signup}
        </button>
      </div>
    </div>
  );
}
