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
  if (totalWorkouts >= 100) return { name: "Diamond", current: totalWorkouts, max: 100, percent: 100, color: "text-accent-on-light", bg: "bg-accent" };
  if (totalWorkouts >= 50) return { name: "Platinum", current: totalWorkouts, max: 100, percent: (totalWorkouts / 100) * 100, color: "text-accent-on-light", bg: "bg-accent-active", next: "Diamond" };
  if (totalWorkouts >= 25) return { name: "Gold", current: totalWorkouts, max: 50, percent: (totalWorkouts / 50) * 100, color: "text-warm-on-light", bg: "bg-warm", next: "Platinum" };
  if (totalWorkouts >= 10) return { name: "Silver", current: totalWorkouts, max: 25, percent: (totalWorkouts / 25) * 100, color: "text-on-light-muted", bg: "bg-on-light-muted", next: "Gold" };
  return { name: "Bronze", current: totalWorkouts, max: 10, percent: (totalWorkouts / 10) * 100, color: "text-warm-on-light", bg: "bg-warm-on-light", next: "Silver" };
};

// High effort/pain uses the warm (warning) family, not --danger: danger is
// reserved for errors and destructive actions only.
export const getRPEColor = (num: number) =>
  num <= 3 ? "bg-accent hover:bg-accent-hover text-accent-ink" : num <= 7 ? "bg-warm hover:brightness-110 text-accent-ink" : "bg-warm-on-light hover:brightness-110 text-on-dark";

export const getPainColor = (num: number) =>
  num === 0 ? "bg-accent hover:bg-accent-hover text-accent-ink"
  : num <= 3 ? "bg-accent-active hover:bg-accent text-accent-ink"
  : num <= 6 ? "bg-warm hover:brightness-110 text-accent-ink"
  : num <= 8 ? "bg-warm-on-light hover:brightness-110 text-on-dark"
  : "bg-warm-on-light hover:brightness-110 text-on-dark ring-2 ring-inset ring-warm";

export interface AIInsight {
  status: "neutral" | "ready" | "overload" | "optimal";
  text: string;
  color: string;
}

export const getAIInsight = (workoutLogs: WorkoutLog[], patientId: string): AIInsight => {
  const pLogs = workoutLogs.filter(l => l.patient_id === patientId);
  if (pLogs.length < 2) return { status: "neutral", text: "ממתין לנתונים נוספים", color: "bg-surface-alt text-on-light-muted border-line-light" };
  const recentLogs = pLogs.slice(0, 3);
  const avgRpe = recentLogs.reduce((acc, l) => acc + l.rpe, 0) / recentLogs.length;
  if (avgRpe <= 4.5) return { status: "ready", text: "עומס נמוך. מוכן להתקדמות.", color: "bg-accent/15 text-accent-on-light border-accent-on-light/30" };
  if (avgRpe >= 8) return { status: "overload", text: "מאמץ חריג. שקול דילואוד (Deload).", color: "bg-warm/15 text-warm-on-light border-warm/40" };
  return { status: "optimal", text: "מגיב מעולה לעומס הנוכחי.", color: "bg-success/10 text-accent-on-light border-success/50" };
};
