"use client";

import { useEffect, useRef } from "react";
import { useAuth } from "@/app/context/AuthContext";
import { BrandLockup } from "@/app/components/brand/Brand";
import LegalLinks from "@/app/components/ui/LegalLinks";

export default function LandingPage() {
  const { lang, setLang, t, setCurrentView } = useAuth();

  // A full-screen looping video is exactly the "large moving background"
  // reduced motion asks to avoid: hold it on its poster frame instead.
  const videoRef = useRef<HTMLVideoElement>(null);
  useEffect(() => {
    const query = window.matchMedia("(prefers-reduced-motion: reduce)");
    const apply = () => {
      const video = videoRef.current;
      if (!video) return;
      // Hidden rather than only paused: the portrait clip opens on a fade
      // from navy, so its paused first frame is blank — the <picture>
      // poster underneath shows instead.
      video.hidden = query.matches;
      if (query.matches) video.pause();
      else void video.play().catch(() => {});
    };
    apply();
    query.addEventListener("change", apply);
    return () => query.removeEventListener("change", apply);
  }, []);

  return (
    // min-h-dvh, not min-h-screen (100vh): on iOS Safari 100vh is taller than
    // the visible area, so the bottom-pinned buttons could sit under the toolbar.
    <div className="scheme-dark min-h-dvh relative overflow-hidden bg-page text-fg" dir={lang === "he" ? "rtl" : "ltr"}>
      {/* Full-bleed hero (public/landing/), muted + playsInline so iOS
          autoplays it. Portrait screens get the vertical 9:16 "journey" clip
          (hero-mobile.*, 20 s, fades from/to navy so the loop is seamless);
          everything else keeps the 16:9 intro clip. The browser picks the
          <source> by its media query, so no JS decides. The poster is a
          <picture> under the video (a video's own poster can't vary by
          screen): it covers the moment before the first frame decodes, and
          stays visible for reduced motion, which hides the video. */}
      <picture>
        <source media="(max-aspect-ratio: 1/1)" srcSet="/landing/hero-mobile-poster.webp" />
        <img src="/landing/hero-poster.webp" alt="" className="absolute inset-0 w-full h-full object-cover" />
      </picture>
      <video
        ref={videoRef}
        autoPlay
        muted
        loop
        playsInline
        preload="auto"
        aria-hidden="true"
        className="absolute inset-0 w-full h-full object-cover"
      >
        <source media="(max-aspect-ratio: 1/1)" src="/landing/hero-mobile.webm" type="video/webm" />
        <source media="(max-aspect-ratio: 1/1)" src="/landing/hero-mobile.mp4" type="video/mp4" />
        <source src="/landing/hero.webm" type="video/webm" />
        <source src="/landing/hero.mp4" type="video/mp4" />
      </video>

      {/* Scrim only at the top (logo) and bottom (buttons) — the sunset in
          the middle stays clear. */}
      <div className="absolute inset-0 bg-gradient-to-b from-scrim/55 via-transparent to-scrim/80"></div>

      <button
        onClick={() => setLang(lang === "he" ? "en" : "he")}
        aria-label={lang === "he" ? "Switch to English" : "מעבר לעברית"}
        className="absolute top-[max(1.5rem,env(safe-area-inset-top))] left-5 md:top-8 md:left-14 z-10 bg-fg/10 hover:bg-fg/20 border border-fg/20 text-fg text-[0.6875rem] md:text-xs font-extrabold px-[13px] py-1.5 md:px-4 md:py-2 rounded-full transition-ui duration-150 ease-out active:scale-95"
      >
        {lang === "he" ? "EN" : "עב"}
      </button>

      <div className="absolute top-16 md:top-14 inset-x-0 flex flex-col items-center gap-3 z-10 animate-landing-drop">
        <BrandLockup size="lg" />
        {/* One line saying what this is — the page was logo + two buttons,
            nothing for a first-time visitor to go on. Same wording as the
            site's meta description. */}
        <p className="text-fg/85 text-sm md:text-base font-medium text-balance text-center px-6 [text-shadow:0_1px_12px_color-mix(in_srgb,var(--scrim)_60%,transparent)]">
          {lang === "he" ? "קליניקה לשיקום וכושר" : "Rehab & fitness clinic"}
        </p>
      </div>

      <div className="absolute inset-x-6 bottom-[max(2.5rem,calc(env(safe-area-inset-bottom)+1rem))] md:inset-x-0 md:bottom-14 z-10 flex flex-col md:flex-row md:flex-wrap md:justify-center gap-3 md:gap-3.5 animate-landing-rise">
        <button
          onClick={() => setCurrentView("login")}
          className="w-full md:w-auto bg-btn-primary text-btn-primary-fg font-black text-[0.9375rem] md:text-base px-6 py-4 md:px-11 md:py-[17px] rounded-full shadow-[0_14px_32px_-10px_color-mix(in_srgb,var(--accent)_50%,transparent)] md:shadow-[0_16px_40px_-12px_color-mix(in_srgb,var(--accent)_50%,transparent)] hover:bg-btn-primary-hover active:bg-btn-primary-active active:scale-[0.97] transition-ui duration-150 ease-out"
        >
          {t.login}
        </button>
        <button
          onClick={() => setCurrentView("register")}
          className="w-full md:w-auto bg-transparent ring-[1.5px] ring-inset ring-btn-secondary text-accent-fg hover:bg-btn-secondary-hover font-black text-[0.9375rem] md:text-base px-6 py-4 md:px-11 md:py-[17px] rounded-full shadow-[0_14px_32px_-10px_color-mix(in_srgb,var(--shadow-ink)_40%,transparent)] md:shadow-[0_16px_40px_-12px_color-mix(in_srgb,var(--shadow-ink)_40%,transparent)] active:scale-[0.97] transition-ui duration-150 ease-out"
        >
          {t.signup}
        </button>
        <LegalLinks className="md:w-full mt-1 [&_a]:text-fg [text-shadow:0_1px_8px_var(--scrim)]" />
      </div>
    </div>
  );
}
