import Link from "next/link";
import type { ReactNode } from "react";

// Shared layout for the standalone legal routes (/accessibility, /privacy,
// /terms): readable column, back link, title + last-updated line.
export function LegalPage({ title, updated, children }: { title: string; updated: string; children: ReactNode }) {
  return (
    <main className="min-h-dvh bg-page text-fg" dir="rtl">
      <div className="max-w-2xl mx-auto px-5 py-10 md:py-16">
        <Link href="/" className="inline-block text-sm font-bold text-accent-fg hover:underline mb-8">
          → חזרה לאפליקציה
        </Link>
        <h1 className="text-3xl md:text-4xl font-black tracking-tight mb-2">{title}</h1>
        <p className="text-sm text-muted mb-10">עודכנה לאחרונה: {updated}</p>
        <div className="flex flex-col gap-10 text-[0.9375rem] leading-relaxed">{children}</div>
      </div>
    </main>
  );
}

export function LegalSection({ id, title, children }: { id: string; title: string; children: ReactNode }) {
  return (
    <section aria-labelledby={id}>
      <h2 id={id} className="text-xl font-black mb-3">
        {title}
      </h2>
      <div className="flex flex-col gap-3">{children}</div>
    </section>
  );
}

export function LegalList({ items }: { items: ReactNode[] }) {
  return (
    <ul className="list-disc ps-5 flex flex-col gap-2">
      {items.map((item, i) => (
        <li key={i}>{item}</li>
      ))}
    </ul>
  );
}

// A highlighted box (contact details, key warnings).
export function LegalBox({ children }: { children: ReactNode }) {
  return <div className="on-light bg-surface text-fg rounded-2xl p-5 flex flex-col gap-1.5">{children}</div>;
}
