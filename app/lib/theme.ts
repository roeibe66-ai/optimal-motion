export type ThemeSetting = "system" | "light" | "dark";
export type ResolvedTheme = "light" | "dark";

export const THEME_STORAGE_KEY = "theme";

// These two must be literal colors: they feed <meta name="theme-color">,
// which can't resolve CSS variables. They mirror --bg-page in
// app/globals.css — change both together.
export const THEME_COLORS: Record<ResolvedTheme, string> = {
  dark: "#0F1620",
  light: "#F4F6F5",
};

export const LIGHT_SCHEME_QUERY = "(prefers-color-scheme: light)";

export function readStoredThemeSetting(): ThemeSetting {
  try {
    const stored = localStorage.getItem(THEME_STORAGE_KEY);
    return stored === "light" || stored === "dark" ? stored : "system";
  } catch {
    return "system";
  }
}

export function resolveTheme(setting: ThemeSetting): ResolvedTheme {
  if (setting !== "system") return setting;
  return window.matchMedia(LIGHT_SCHEME_QUERY).matches ? "light" : "dark";
}

// Runs synchronously in <head>, before first paint, so the page never
// flashes the wrong theme. Mirrors readStoredThemeSetting + resolveTheme;
// kept dependency-free since it's inlined as a string.
export const themeInitScript = `(function(){try{var s=localStorage.getItem(${JSON.stringify(THEME_STORAGE_KEY)});var t=s==="light"||s==="dark"?s:(window.matchMedia(${JSON.stringify(LIGHT_SCHEME_QUERY)}).matches?"light":"dark");document.documentElement.setAttribute("data-theme",t);}catch(e){}})();`;
