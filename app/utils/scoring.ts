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

export const getUserRank = (totalWorkouts: number): RankInfo => {
  if (totalWorkouts >= 100) return { name: "Diamond", current: totalWorkouts, max: 100, percent: 100, color: "text-purple-500", bg: "bg-purple-500" };
  if (totalWorkouts >= 50) return { name: "Platinum", current: totalWorkouts, max: 100, percent: (totalWorkouts / 100) * 100, color: "text-cyan-400", bg: "bg-cyan-400", next: "Diamond" };
  if (totalWorkouts >= 25) return { name: "Gold", current: totalWorkouts, max: 50, percent: (totalWorkouts / 50) * 100, color: "text-yellow-400", bg: "bg-yellow-400", next: "Platinum" };
  if (totalWorkouts >= 10) return { name: "Silver", current: totalWorkouts, max: 25, percent: (totalWorkouts / 25) * 100, color: "text-stone-300", bg: "bg-stone-300", next: "Gold" };
  return { name: "Bronze", current: totalWorkouts, max: 10, percent: (totalWorkouts / 10) * 100, color: "text-amber-600", bg: "bg-amber-600", next: "Silver" };
};

export const getRPEColor = (num: number) =>
  num <= 3 ? "bg-teal-500 hover:bg-teal-400" : num <= 7 ? "bg-amber-500 hover:bg-amber-400" : "bg-red-500 hover:bg-red-400";

export const getPainColor = (num: number) =>
  num === 0 ? "bg-teal-500 hover:bg-teal-400"
  : num <= 3 ? "bg-lime-500 hover:bg-lime-400"
  : num <= 6 ? "bg-amber-500 hover:bg-amber-400"
  : num <= 8 ? "bg-orange-500 hover:bg-orange-400"
  : "bg-red-600 hover:bg-red-500";

export interface AIInsight {
  status: "neutral" | "ready" | "overload" | "optimal";
  text: string;
  color: string;
}

export const getAIInsight = (workoutLogs: WorkoutLog[], patientId: string): AIInsight => {
  const pLogs = workoutLogs.filter(l => l.patient_id === patientId);
  if (pLogs.length < 2) return { status: "neutral", text: "ממתין לנתונים נוספים", color: "bg-stone-800 text-stone-400" };
  const recentLogs = pLogs.slice(0, 3);
  const avgRpe = recentLogs.reduce((acc, l) => acc + l.rpe, 0) / recentLogs.length;
  if (avgRpe <= 4.5) return { status: "ready", text: "עומס נמוך. מוכן להתקדמות.", color: "bg-teal-900/40 text-teal-400 border-teal-800" };
  if (avgRpe >= 8) return { status: "overload", text: "מאמץ חריג. שקול דילואוד (Deload).", color: "bg-red-900/40 text-red-400 border-red-800" };
  return { status: "optimal", text: "מגיב מעולה לעומס הנוכחי.", color: "bg-blue-900/40 text-blue-400 border-blue-800" };
};
