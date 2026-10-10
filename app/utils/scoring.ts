import type { WorkoutLog } from "@/app/types";

export interface RankInfo {
  name: string;
  current: number;
  max: number;
  percent: number;
  color: string;
  bg: string;
  next?: string;
}

// `color` is rendered as text on a light --surface card (ProfileTab), so it
// only uses the *-on-light tokens; `bg` is a progress-bar fill. The theme
// has no per-tier metal colors, so tiers share the accent/warm tokens —
// the tier name itself carries the distinction.
export const getUserRank = (totalWorkouts: number): RankInfo => {
  if (totalWorkouts >= 100) return { name: "יהלום", current: totalWorkouts, max: 100, percent: 100, color: "text-accent-fg", bg: "bg-accent" };
  if (totalWorkouts >= 50) return { name: "פלטינה", current: totalWorkouts, max: 100, percent: (totalWorkouts / 100) * 100, color: "text-accent-fg", bg: "bg-accent-active", next: "יהלום" };
  if (totalWorkouts >= 25) return { name: "זהב", current: totalWorkouts, max: 50, percent: (totalWorkouts / 50) * 100, color: "text-warm-fg", bg: "bg-warm", next: "פלטינה" };
  if (totalWorkouts >= 10) return { name: "כסף", current: totalWorkouts, max: 25, percent: (totalWorkouts / 25) * 100, color: "text-muted", bg: "bg-muted", next: "זהב" };
  return { name: "ארד", current: totalWorkouts, max: 10, percent: (totalWorkouts / 10) * 100, color: "text-warm-fg", bg: "bg-warm-strong", next: "כסף" };
};

// High effort/pain uses the warm (warning) family, not --danger: danger is
// reserved for errors and destructive actions only.
export const getRPEColor = (num: number) =>
  num <= 3 ? "bg-btn-primary hover:bg-btn-primary-hover text-btn-primary-fg" : num <= 7 ? "bg-warm hover:brightness-110 text-on-accent" : "bg-warm-strong hover:brightness-110 text-surface";

export const getPainColor = (num: number) =>
  num === 0 ? "bg-btn-primary hover:bg-btn-primary-hover text-btn-primary-fg"
  : num <= 3 ? "bg-accent-active hover:bg-accent text-on-accent"
  : num <= 6 ? "bg-warm hover:brightness-110 text-on-accent"
  : num <= 8 ? "bg-warm-strong hover:brightness-110 text-surface"
  : "bg-warm-strong hover:brightness-110 text-surface ring-2 ring-inset ring-warm";

export interface AIInsight {
  status: "neutral" | "ready" | "overload" | "optimal";
  text: string;
  color: string;
}

export const getAIInsight = (workoutLogs: WorkoutLog[], patientId: string): AIInsight => {
  const pLogs = workoutLogs.filter(l => l.patient_id === patientId);
  if (pLogs.length < 2) return { status: "neutral", text: "ממתין לנתונים נוספים", color: "on-light bg-surface-alt text-muted border-line" };
  const recentLogs = pLogs.slice(0, 3);
  const avgRpe = recentLogs.reduce((acc, l) => acc + l.rpe, 0) / recentLogs.length;
  if (avgRpe <= 4.5) return { status: "ready", text: "עומס נמוך. מוכן להתקדמות.", color: "bg-accent/15 text-accent-fg border-accent-fg/30" };
  if (avgRpe >= 8) return { status: "overload", text: "מאמץ חריג. שקול דילואוד (Deload).", color: "bg-warm/15 text-warm-fg border-warm/40" };
  return { status: "optimal", text: "מגיב מעולה לעומס הנוכחי.", color: "bg-success/10 text-accent-fg border-success/50" };
};
