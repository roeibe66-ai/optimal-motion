// Eccentric brand mark and lockup — the one place the logo is drawn, so a
// change to the mark lands everywhere (landing page, admin sidebar, PDF
// export). The favicon (app/icon.svg) mirrors EccentricMark's geometry.
//
// The mark: four nested circles of decreasing size that all touch at one
// point instead of sharing a center — "eccentric" in the literal, geometric
// sense. The rings take the current text color; the innermost circle is the
// accent.

const RINGS = [
  { r: 44, w: 5 },
  { r: 31, w: 5 },
  { r: 19, w: 5 },
];
const CORE_R = 8;
const TANGENT_Y = 94; // where every circle touches (bottom of the viewBox)

export function EccentricMark({ size = 40, className, title }: { size?: number; className?: string; title?: string }) {
  return (
    <svg
      viewBox="0 0 100 100"
      width={size}
      height={size}
      className={className}
      role={title ? "img" : undefined}
      aria-label={title}
      aria-hidden={title ? undefined : true}
    >
      {RINGS.map(({ r, w }) => (
        <circle key={r} cx={50} cy={TANGENT_Y - r} r={r - w / 2} fill="none" strokeWidth={w} style={{ stroke: "currentColor" }} />
      ))}
      <circle cx={50} cy={TANGENT_Y - CORE_R} r={CORE_R} style={{ fill: "var(--accent)" }} />
    </svg>
  );
}

// Mark + "eccentric" + "OPTIMAL MOTION". `size` scales the whole lockup.
export function BrandLockup({ size = "md", align = "center", className }: { size?: "sm" | "md" | "lg"; align?: "center" | "start"; className?: string }) {
  const s = {
    sm: { mark: 30, word: "text-xl", sub: "text-[8px]", gap: "gap-2" },
    md: { mark: 40, word: "text-[28px]", sub: "text-[9px]", gap: "gap-2.5" },
    lg: { mark: 52, word: "text-[38px]", sub: "text-[11px]", gap: "gap-3" },
  }[size];

  return (
    <div className={`inline-flex items-center ${s.gap} ${align === "center" ? "justify-center" : ""} ${className ?? ""}`} dir="ltr">
      <EccentricMark size={s.mark} />
      <div className="flex flex-col items-start leading-none">
        <span className={`${s.word} font-black tracking-[-0.02em] lowercase`}>eccentric</span>
        <span className={`${s.sub} font-bold tracking-[0.34em] uppercase text-accent-fg mt-1`}>Optimal Motion</span>
      </div>
    </div>
  );
}
