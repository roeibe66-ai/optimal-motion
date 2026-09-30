"use client";

import { createContext, useCallback, useContext, useEffect, useState, type ReactNode } from "react";
import {
  LIGHT_SCHEME_QUERY,
  THEME_COLORS,
  THEME_STORAGE_KEY,
  readStoredThemeSetting,
  resolveTheme,
  type ResolvedTheme,
  type ThemeSetting,
} from "@/app/lib/theme";

interface ThemeContextValue {
  setting: ThemeSetting;
  setSetting: (setting: ThemeSetting) => void;
  resolvedTheme: ResolvedTheme;
}

const ThemeContext = createContext<ThemeContextValue | null>(null);

function applyTheme(theme: ResolvedTheme) {
  document.documentElement.setAttribute("data-theme", theme);
  // Next renders one theme-color meta per prefers-color-scheme media query;
  // an explicit Light/Dark override has to win over the OS setting, so both
  // are pinned to the active theme's color.
  document.querySelectorAll('meta[name="theme-color"]').forEach((meta) => {
    meta.setAttribute("content", THEME_COLORS[theme]);
    meta.removeAttribute("media");
  });
}

// The initial data-theme is set by the inline script in app/layout.tsx
// (before first paint); this keeps it in sync afterwards — user changes
// from the Profile tab, and live OS changes while the setting is "System".
export function ThemeProvider({ children }: { children: ReactNode }) {
  // Lazy read is safe here: nothing this provider renders depends on it, so
  // there's no server/client markup to mismatch.
  const [setting, setSettingState] = useState<ThemeSetting>(() => (typeof window === "undefined" ? "system" : readStoredThemeSetting()));
  const [resolvedTheme, setResolvedTheme] = useState<ResolvedTheme>(() => (typeof window === "undefined" ? "dark" : resolveTheme(setting)));

  useEffect(() => {
    const update = () => {
      const next = resolveTheme(setting);
      setResolvedTheme(next);
      applyTheme(next);
    };
    update();
    if (setting !== "system") return;
    const mql = window.matchMedia(LIGHT_SCHEME_QUERY);
    mql.addEventListener("change", update);
    return () => mql.removeEventListener("change", update);
  }, [setting]);

  const setSetting = useCallback((next: ThemeSetting) => {
    setSettingState(next);
    try {
      if (next === "system") localStorage.removeItem(THEME_STORAGE_KEY);
      else localStorage.setItem(THEME_STORAGE_KEY, next);
    } catch {
      // Storage unavailable (private mode etc.) — the choice still applies for this session.
    }
  }, []);

  return <ThemeContext.Provider value={{ setting, setSetting, resolvedTheme }}>{children}</ThemeContext.Provider>;
}

export function useTheme() {
  const ctx = useContext(ThemeContext);
  if (!ctx) throw new Error("useTheme must be used inside ThemeProvider");
  return ctx;
}
