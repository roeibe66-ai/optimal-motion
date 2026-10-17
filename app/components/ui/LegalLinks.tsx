import Link from "next/link";

// Links to the legal pages (/terms, /privacy, /accessibility), shown on the landing, login,
// register and profile screens so they're reachable from anywhere in the app
// — the accessibility statement in particular must be (IS 5568 / תקנה 35).
export default function LegalLinks({ className = "" }: { className?: string }) {
  return (
    <nav aria-label="מידע משפטי" className={`flex justify-center gap-4 text-xs font-bold ${className}`}>
      <Link href="/terms" className="text-muted hover:text-fg underline underline-offset-2">
        תנאי שימוש
      </Link>
      <Link href="/privacy" className="text-muted hover:text-fg underline underline-offset-2">
        מדיניות פרטיות
      </Link>
      <Link href="/accessibility" className="text-muted hover:text-fg underline underline-offset-2">
        הצהרת נגישות
      </Link>
    </nav>
  );
}
