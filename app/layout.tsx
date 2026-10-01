import type { Metadata, Viewport } from "next";
import { Rubik } from "next/font/google";
import "./globals.css";
import { ThemeProvider } from "@/app/components/ThemeProvider";
import { LIGHT_SCHEME_QUERY, THEME_COLORS, themeInitScript } from "@/app/lib/theme";

const rubik = Rubik({ subsets: ["hebrew", "latin"] });

export const metadata: Metadata = {
  title: "Eccentric — Optimal Motion",
  description: "Eccentric · Optimal Motion — קליניקה לשיקום וכושר",
  manifest: "/manifest.json",
  appleWebApp: {
    capable: true,
    statusBarStyle: "default",
    title: "Eccentric",
  },
};

export const viewport: Viewport = {
  // Defaults per OS scheme; ThemeProvider pins both to the active theme
  // once an explicit Light/Dark choice is made in the Profile tab.
  themeColor: [
    { media: LIGHT_SCHEME_QUERY, color: THEME_COLORS.light },
    { media: "(prefers-color-scheme: dark)", color: THEME_COLORS.dark },
  ],
  width: "device-width",
  initialScale: 1,
  maximumScale: 1,
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    // data-theme is set by the inline script before first paint (it isn't
    // known on the server), so React must not treat it as a mismatch.
    <html lang="he" dir="rtl" data-theme="dark" suppressHydrationWarning>
      <head>
        {/* type swaps to text/plain on the client so React doesn't warn about
            rendering a <script>; it has already run by then (see the
            "Preventing Flash" guide in node_modules/next/dist/docs). */}
        <script
          type={typeof window === "undefined" ? "text/javascript" : "text/plain"}
          suppressHydrationWarning
          dangerouslySetInnerHTML={{ __html: themeInitScript }}
        />
      </head>
      <body className={rubik.className}>
        <ThemeProvider>{children}</ThemeProvider>
      </body>
    </html>
  );
}
