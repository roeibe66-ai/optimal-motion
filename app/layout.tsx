import type { Metadata, Viewport } from "next";
import { Rubik } from "next/font/google";
import "./globals.css";

const rubik = Rubik({ subsets: ["hebrew", "latin"] });

export const metadata: Metadata = {
  title: "OptimalMotion",
  description: "קליניקה לשיקום וכושר",
  manifest: "/manifest.json",
  appleWebApp: {
    capable: true,
    statusBarStyle: "default",
    title: "OptimalMotion",
  },
};

export const viewport: Viewport = {
  // Must be a literal color (it becomes a <meta name="theme-color">, which
  // can't resolve CSS variables) — mirrors --bg-base in app/globals.css.
  themeColor: "#0F1620",
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
    <html lang="he" dir="rtl">
      <body className={rubik.className}>{children}</body>
    </html>
  );
}
