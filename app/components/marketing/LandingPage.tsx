"use client";

import { useAuth } from "@/app/context/AuthContext";
import { BrandLockup } from "@/app/components/brand/Brand";

export default function LandingPage() {
  const { lang, setLang, t, setCurrentView } = useAuth();

  return (
    <div className="scheme-dark min-h-screen relative overflow-hidden bg-page text-fg" dir={lang === "he" ? "rtl" : "ltr"}>
      {/* Full-bleed hero: the Ecco intro clip (public/landing/), muted +
          playsInline so iOS autoplays it. The poster covers the moment
          before the first frame decodes; object-cover center-crops the 16:9
          clip on portrait phones, where the character stays in frame. */}
      <video
        autoPlay
        muted
        loop
        playsInline
        preload="auto"
        poster="/landing/hero-poster.webp"
        aria-hidden="true"
        className="absolute inset-0 w-full h-full object-cover"
      >
        <source src="/landing/hero.webm" type="video/webm" />
        <source src="/landing/hero.mp4" type="video/mp4" />
      </video>

      {/* Scrim only at the top (logo) and bottom (buttons) — the sunset in
          the middle stays clear. */}
      <div className="absolute inset-0 bg-gradient-to-b from-scrim/55 via-transparent to-scrim/80"></div>

      <button
        onClick={() => setLang(lang === "he" ? "en" : "he")}
        className="absolute top-6 left-5 md:top-8 md:left-14 z-10 bg-fg/10 hover:bg-fg/20 border border-fg/20 text-fg text-[11px] md:text-xs font-extrabold px-[13px] py-1.5 md:px-4 md:py-2 rounded-full transition-colors"
      >
        {lang === "he" ? "EN" : "עב"}
      </button>

      <div className="absolute top-16 md:top-14 inset-x-0 flex justify-center z-10 animate-landing-drop">
        <BrandLockup size="lg" />
      </div>

      <div className="absolute inset-x-6 bottom-10 md:inset-x-0 md:bottom-14 z-10 flex flex-col md:flex-row md:justify-center gap-3 md:gap-3.5 animate-landing-rise">
        <button
          onClick={() => setCurrentView("login")}
          className="w-full md:w-auto bg-btn-primary text-btn-primary-fg font-black text-[15px] md:text-base px-6 py-4 md:px-11 md:py-[17px] rounded-full shadow-[0_14px_32px_-10px_color-mix(in_srgb,var(--accent)_50%,transparent)] md:shadow-[0_16px_40px_-12px_color-mix(in_srgb,var(--accent)_50%,transparent)] hover:bg-btn-primary-hover active:bg-btn-primary-active transition-colors"
        >
          {t.login}
        </button>
        <button
          onClick={() => setCurrentView("register")}
          className="w-full md:w-auto bg-transparent ring-[1.5px] ring-inset ring-btn-secondary text-accent-fg hover:bg-btn-secondary-hover font-black text-[15px] md:text-base px-6 py-4 md:px-11 md:py-[17px] rounded-full shadow-[0_14px_32px_-10px_color-mix(in_srgb,var(--shadow-ink)_40%,transparent)] md:shadow-[0_16px_40px_-12px_color-mix(in_srgb,var(--shadow-ink)_40%,transparent)] transition-colors"
        >
          {t.signup}
        </button>
      </div>
    </div>
  );
}
