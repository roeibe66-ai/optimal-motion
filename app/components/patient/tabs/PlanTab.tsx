"use client";

import {
  ChevronLeft,
  Dumbbell,
  Info,
  Lock,
  MoreHorizontal,
  Play,
  Timer,
  User,
  Wind,
} from "lucide-react";
import { useAuth } from "@/app/context/AuthContext";
import { getTrackAccess } from "@/app/utils/premium";
import { AVAILABLE_MUSCLES } from "@/app/constants/catalog";
import type { Exercise, WorkoutLog } from "@/app/types";
import type { HydratedPatientExercise, SessionExercise } from "@/app/hooks/useWorkoutSession";

interface PlanTabProps {
  workoutLogs: WorkoutLog[];
  selectedCategory: string | null;
  setSelectedCategory: (category: string | null) => void;
  selectedDayFilter: string;
  setSelectedDayFilter: (day: string) => void;
  activePatientWeek: number;
  availablePatientWeeks: number[];
  setPatientSelectedWeek: (week: number) => void;
  isDiyMode: boolean;
  diyWorkoutName: string;
  patientCategories: string[];
  weekFilteredExercises: HydratedPatientExercise[];
  displayedExercises: HydratedPatientExercise[];
  blocksMap: Record<string, SessionExercise[]>;
  blocksKeys: string[];
  onViewExerciseInfo: (exercise: Exercise) => void;
  onStartWorkout: () => void;
}

// Warm-tinted glow per category track, matching the approved mockup's
// per-card gradients — generalized (dark card base + a category-tinted
// radial glow) rather than hand-authored per category, since the real
// patient category list isn't fixed to the 3 categories shown in the mockup.
const TRACK_GLOW_TINTS: Record<string, string> = {
  "יוגה": "rgba(248,113,86,0.32)",
  "קטלבל": "rgba(245,158,11,0.3)",
  "מוביליטי": "rgba(234,179,8,0.3)",
  "קליסטניקס": "rgba(20,184,166,0.3)",
  "מכון כושר": "rgba(234,88,12,0.3)",
  "שיקום": "rgba(16,185,129,0.25)",
};
const DEFAULT_TRACK_GLOW = "rgba(245,158,11,0.22)";

const DAYS_OF_WEEK_SHORT = [
  { id: "0", short: "א׳" },
  { id: "1", short: "ב׳" },
  { id: "2", short: "ג׳" },
  { id: "3", short: "ד׳" },
  { id: "4", short: "ה׳" },
  { id: "5", short: "ו׳" },
  { id: "6", short: "ש׳" },
];

export default function PlanTab({
  workoutLogs,
  selectedCategory,
  setSelectedCategory,
  selectedDayFilter,
  setSelectedDayFilter,
  activePatientWeek,
  availablePatientWeeks,
  setPatientSelectedWeek,
  isDiyMode,
  diyWorkoutName,
  patientCategories,
  weekFilteredExercises,
  displayedExercises,
  blocksMap,
  blocksKeys,
  onViewExerciseInfo,
  onStartWorkout,
}: PlanTabProps) {
  const { loggedInPatient } = useAuth();

  // Week Switcher: steps through availablePatientWeeks (the only weeks that
  // actually have content) rather than raw +1/-1, so it can't get stuck on a
  // gap between sparsely-assigned week numbers.
  const weeks = availablePatientWeeks.length > 0 ? availablePatientWeeks : [1];
  const weekIndex = weeks.indexOf(activePatientWeek);
  const goPrevWeek = () => {
    if (weekIndex > 0) setPatientSelectedWeek(weeks[weekIndex - 1]);
  };
  const goNextWeek = () => {
    if (weekIndex < weeks.length - 1) setPatientSelectedWeek(weeks[weekIndex + 1]);
  };

  // ----- Overview screen -----
  if (!selectedCategory) {
    const todayCat = patientCategories[0] ?? null;

    // Real stats for today's hero card (replacing the original's hardcoded
    // "45 Minutes" / "For All Levels") — mirrors the same category+day
    // filter useWorkoutSession applies for displayedExercises, and the same
    // sets->minutes estimate the Detail screen already uses, just computed
    // here for todayCat specifically since that data isn't scoped to a
    // selected category yet on this screen.
    let todayExerciseCount = 0;
    let todayBlockCount = 0;
    let todayEstimatedMinutes = 0;
    if (todayCat) {
      const todayCategoryExercises = weekFilteredExercises.filter((pe) => {
        if (pe.exercise.category !== todayCat) return false;
        if (selectedDayFilter === "all") return true;
        if (!pe.scheduled_days || pe.scheduled_days.trim() === "") return true;
        return pe.scheduled_days.split(",").includes(selectedDayFilter);
      });
      todayExerciseCount = todayCategoryExercises.length;
      todayBlockCount = new Set(todayCategoryExercises.map((pe) => pe.block || "A")).size;
      const todayTotalSets = todayCategoryExercises.reduce((acc, pe) => acc + (pe.sets || 0), 0);
      todayEstimatedMinutes = Math.max(10, Math.round(todayTotalSets * 1.5));
    }

    // Recent-trend sparkline: last 6 logs' RPE, plus their average.
    const recentLogs = [...workoutLogs].slice(0, 6).reverse();
    const avgRpe = recentLogs.length > 0 ? recentLogs.reduce((acc, l) => acc + l.rpe, 0) / recentLogs.length : 0;
    const sparklinePoints = recentLogs.map((log, i) => {
      const x = recentLogs.length > 1 ? (i / (recentLogs.length - 1)) * 320 : 160;
      const y = 58 - (Math.max(0, Math.min(10, log.rpe)) / 10) * 52;
      return `${x},${y}`;
    });
    const sparklinePath = sparklinePoints.join(" ");
    const sparklineAreaPath = sparklinePoints.length > 0 ? `0,64 ${sparklinePath} 320,64` : "";

    return (
      <div className="animate-in fade-in duration-700 print:hidden">
        {/* Week Switcher */}
        <div className="flex items-center justify-center gap-3 mb-8">
          <button
            onClick={goPrevWeek}
            disabled={weekIndex <= 0}
            aria-label="Previous week"
            className="w-8 h-8 rounded-full bg-[#1c1c1e] border border-stone-800 flex items-center justify-center text-stone-300 hover:bg-stone-800 transition-colors disabled:opacity-30 disabled:cursor-not-allowed disabled:hover:bg-[#1c1c1e]"
          >
            <ChevronLeft size={14} />
          </button>
          <span className="text-[13px] font-black text-white tracking-wide px-5 py-1.5 bg-[#1c1c1e] border border-stone-800 rounded-full min-w-[100px] text-center">
            שבוע {activePatientWeek}
          </span>
          <button
            onClick={goNextWeek}
            disabled={weekIndex >= weeks.length - 1}
            aria-label="Next week"
            className="w-8 h-8 rounded-full bg-[#1c1c1e] border border-stone-800 flex items-center justify-center text-stone-300 hover:bg-stone-800 transition-colors disabled:opacity-30 disabled:cursor-not-allowed disabled:hover:bg-[#1c1c1e]"
          >
            <ChevronLeft size={14} className="rotate-180" />
          </button>
        </div>

        {/* Day selector */}
        <div className="flex justify-between items-center bg-[#1c1c1e] p-1.5 rounded-full border border-stone-800 mb-8">
          {DAYS_OF_WEEK_SHORT.map((day) => {
            const isActive = selectedDayFilter === day.id;
            return (
              <button
                key={day.id}
                onClick={() => setSelectedDayFilter(day.id)}
                className={`flex-1 h-9 flex items-center justify-center rounded-full text-xs font-bold transition-all ${isActive ? "bg-white text-[#1b1b1b]" : "text-stone-400 hover:text-stone-200"}`}
              >
                {day.short}
              </button>
            );
          })}
        </div>

        {/* Today hero card */}
        {todayCat ? (
          <div
            className="relative h-[280px] rounded-[2rem] overflow-hidden border border-stone-800 mb-10"
            style={{
              background:
                "radial-gradient(120% 100% at 20% 0%, #3d2a14 0%, #0c0a09 60%), linear-gradient(160deg, #35230f, #0c0a09 70%)",
            }}
          >
            <div
              className="absolute inset-0"
              style={{ background: "radial-gradient(circle at 75% 30%, rgba(245,158,11,0.38), transparent 55%)" }}
            ></div>
            <div className="absolute inset-0 bg-gradient-to-t from-stone-950 via-stone-950/15 to-transparent"></div>

            <button
              onClick={() => setSelectedCategory(String(todayCat))}
              className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-14 h-14 rounded-full bg-white/15 border border-white/25 backdrop-blur-md flex items-center justify-center hover:bg-white/25 transition-colors"
            >
              <Play size={20} className="fill-white text-white" />
            </button>

            <div className="absolute top-4 right-4 bg-white/15 backdrop-blur-md border border-white/20 text-white text-[10px] font-bold tracking-wide px-3 py-1.5 rounded-full">
              האימון של היום
            </div>

            <div className="absolute bottom-5 right-5 left-5 flex flex-col gap-2.5">
              <h3 className="text-[28px] font-black tracking-tight leading-tight text-white">{isDiyMode ? diyWorkoutName : todayCat}</h3>
              <div className="flex items-center gap-3.5 text-stone-300 text-[13px] font-semibold">
                <span className="flex items-center gap-1.5">
                  <Timer size={14} /> כ-{todayEstimatedMinutes} דק&apos;
                </span>
                <span className="flex items-center gap-1.5">
                  <Dumbbell size={14} />
                  {todayExerciseCount} תרגילים · {todayBlockCount} בלוקים
                </span>
              </div>
            </div>
          </div>
        ) : (
          <div className="rounded-[2rem] p-10 text-center border border-stone-800 h-[280px] flex flex-col items-center justify-center relative overflow-hidden mb-10 bg-[#1c1c1e]">
            <Wind size={44} className="text-teal-400 mb-4" />
            <h3 className="text-xl font-black text-white mb-2">מנוחה פעילה</h3>
            <p className="text-stone-400 text-sm">אין אימוני כוח מתוכננים להיום. מומלץ לבצע רוטינת תנועתיות בסיסית.</p>
          </div>
        )}

        {/* Tracks */}
        <div className="mb-10">
          <div className="text-[11px] font-extrabold tracking-widest text-stone-400 uppercase mb-3.5">המסלולים שלך</div>
          {patientCategories.length === 0 ? (
            <div className="bg-[#1c1c1e] p-10 rounded-[2rem] border border-stone-800 text-center flex flex-col items-center">
              <p className="text-stone-500 text-sm">אתה יכול גם להסתכל על שאר התוכניות שלך (אם קיימות).</p>
            </div>
          ) : (
            <div className="flex gap-3 overflow-x-auto no-scrollbar pb-1">
              {patientCategories.map((cat, idx) => {
                const { owned: userOwnsTrack } = getTrackAccess(loggedInPatient, cat);
                const isLocked = loggedInPatient?.patient_type === "fitness" && activePatientWeek >= 3 && !userOwnsTrack;
                const glowTint = TRACK_GLOW_TINTS[cat] ?? DEFAULT_TRACK_GLOW;

                return (
                  <button
                    key={idx}
                    onClick={() => setSelectedCategory(String(cat))}
                    className="min-w-[158px] rounded-3xl overflow-hidden border border-stone-800 bg-[#1c1c1e] text-right shrink-0"
                  >
                    <div className="h-[120px] relative bg-[#1c1c1e]">
                      <div
                        className="absolute inset-0"
                        style={{ background: `radial-gradient(circle at 70% 25%, ${glowTint}, transparent 55%)` }}
                      ></div>
                    </div>
                    <div className="p-3 flex flex-col gap-2">
                      <div className="font-bold text-[13px] text-white">{cat}</div>
                      {isLocked ? (
                        <div className="text-[11px] font-bold px-2.5 py-1 rounded-full w-fit" style={{ color: "#fdba74", backgroundColor: "rgba(251,146,60,0.16)" }}>
                          נפתח בשבוע 3
                        </div>
                      ) : (
                        <div className="text-[11px] font-bold px-2.5 py-1 rounded-full w-fit" style={{ color: "#facc15", backgroundColor: "rgba(234,179,8,0.14)" }}>
                          פעיל
                        </div>
                      )}
                    </div>
                  </button>
                );
              })}
            </div>
          )}
        </div>

        {/* Recent trend */}
        <div>
          <div className="text-[11px] font-extrabold tracking-widest text-stone-400 uppercase mb-3.5">מגמה אחרונה</div>
          {workoutLogs.length === 0 ? (
            <div className="bg-[#1c1c1e] p-10 rounded-[2rem] border border-stone-800 text-center">
              <p className="text-stone-500 text-sm">הנתונים יופיעו כאן ברגע שתסיים את האימון הראשון.</p>
            </div>
          ) : (
            <div className="bg-[#1c1c1e] border border-stone-800 rounded-[1.75rem] p-5">
              <div className="flex justify-between items-start mb-3.5">
                <span className="text-[13px] font-bold text-stone-300">מאמץ (RPE) · {recentLogs.length} אימונים אחרונים</span>
                <div className="text-left" dir="ltr">
                  <div className="text-xl font-black text-amber-400">{avgRpe.toFixed(1)}</div>
                  <div className="text-[10px] text-stone-500 font-semibold">ממוצע</div>
                </div>
              </div>
              <svg width="100%" height="64" viewBox="0 0 320 64" preserveAspectRatio="none">
                {sparklinePoints.length > 1 && (
                  <>
                    <polyline points={sparklineAreaPath} fill="url(#rpeGradient)" stroke="none" opacity="0.5" />
                    <polyline points={sparklinePath} fill="none" stroke="#f59e0b" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" />
                  </>
                )}
                <defs>
                  <linearGradient id="rpeGradient" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor="#f59e0b" stopOpacity="0.35" />
                    <stop offset="100%" stopColor="#f59e0b" stopOpacity="0" />
                  </linearGradient>
                </defs>
              </svg>
            </div>
          )}
        </div>
      </div>
    );
  }

  // ----- Detail / summary screen -----
  // No mockup covers this state yet — recolored to the same base palette for
  // consistency with the overview above, structure otherwise unchanged.
  const { owned: userOwnsTrack } = getTrackAccess(loggedInPatient, selectedCategory);

  return (
    <div className="animate-in slide-in-from-left duration-500 print:hidden max-w-lg mx-auto">
      <div className="mb-6 flex items-center justify-between">
        <button onClick={() => setSelectedCategory(null)} className="p-2 bg-[#1c1c1e] rounded-full hover:bg-stone-800 transition-colors text-white">
          <ChevronLeft size={24} />
        </button>
        <span className="text-xs font-bold uppercase tracking-widest text-stone-500">Details</span>
        <button className="p-2 text-stone-500 hover:text-white">
          <MoreHorizontal size={24} />
        </button>
      </div>

      {loggedInPatient?.patient_type === "fitness" && activePatientWeek >= 3 && !userOwnsTrack && !isDiyMode ? (
        <div className="bg-gradient-to-b from-[#1c1c1e] to-stone-950 rounded-[2.5rem] p-10 text-center text-white relative overflow-hidden shadow-2xl border border-stone-800">
          <Lock size={60} className="text-amber-500 mx-auto mb-6 relative z-10" />
          <h2 className="text-3xl md:text-5xl font-black mb-4 relative z-10 tracking-tight">המשך המסלול נעול</h2>
          <p className="text-lg text-stone-400 mb-8 max-w-md mx-auto relative z-10 font-medium">
            סיימת את השבועיים הראשונים במסלול {selectedCategory}! כדי להמשיך להתקדם ולהיפתח לכל התרגילים, פתח את מסלול הפרימיום.
          </p>
          <button
            onClick={() => {
              if (!loggedInPatient?.email_verified) {
                return alert("עליך לאמת את כתובת המייל שלך לפני שתוכל לרכוש תוכניות. בדוק את תיבת הדואר הנכנס שלך.");
              }
              window.open(
                `https://wa.me/972504441094?text=${encodeURIComponent(`היי רועי, סיימתי את השבועיים החינמיים של ${selectedCategory} ואשמח לפתוח את המסלול!`)}`,
                "_blank"
              );
            }}
            className="bg-amber-500 hover:bg-amber-400 text-stone-900 px-10 py-4 rounded-xl font-black text-lg transition-colors relative z-10 shadow-xl"
          >
            שדרג עכשיו לפרימיום
          </button>
        </div>
      ) : (
        (() => {
          const totalSets = displayedExercises.reduce((acc, curr) => acc + (curr.sets || 0), 0);
          const estimatedTime = Math.max(10, Math.round(totalSets * 1.5));
          const uniqueMuscles = Array.from(new Set(displayedExercises.map((a) => a.exercise?.target_muscle).filter(Boolean)));
          const muscleLabels = uniqueMuscles.map((m) => AVAILABLE_MUSCLES.find((am) => am.id === m)?.label).filter(Boolean).join(", ");

          const equipSet = new Set<string>();
          displayedExercises.forEach((a) => {
            const str = (a.exercise?.title + " " + a.exercise?.description).toLowerCase();
            if (str.includes("מתח") || str.includes("pull up") || str.includes("pull-up")) equipSet.add("Pull up bar");
            if (str.includes("מקבילים") || str.includes("dip")) equipSet.add("Dip bar");
            if (str.includes("טבעות") || str.includes("ring")) equipSet.add("Rings");
            if (str.includes("פרללס") || str.includes("parallettes")) equipSet.add("Parallettes");
            if (str.includes("משקולות") || str.includes("dumbbell")) equipSet.add("Dumbbells");
          });
          const equipmentLabels = equipSet.size > 0 ? Array.from(equipSet).join(", ") : "Bodyweight (No equipment)";

          return (
            <>
              <div className="mb-8">
                <span className="bg-stone-800 text-stone-300 font-bold px-3 py-1 rounded-md text-[10px] uppercase tracking-widest mb-3 inline-block border border-stone-700">Classic</span>
                <h1 className="text-4xl font-black text-white tracking-tight leading-tight mb-2">{isDiyMode ? diyWorkoutName : selectedCategory}</h1>
                <p className="text-stone-500 text-sm font-medium">
                  Week {activePatientWeek} - Session {selectedDayFilter === "all" ? "1" : selectedDayFilter} - {new Date().toLocaleDateString("en-US", { weekday: "short", month: "short", day: "numeric" })}
                </p>
              </div>

              <div className="space-y-4 mb-10 text-stone-300 text-sm">
                <div className="flex items-start gap-4">
                  <Dumbbell size={20} className="text-orange-500 shrink-0 mt-0.5" />
                  <div className="flex-1 flex justify-between items-center border-b border-stone-800 pb-4">
                    <span>{equipmentLabels}</span>
                    <Info size={14} className="text-stone-600" />
                  </div>
                </div>
                <div className="flex items-start gap-4">
                  <Timer size={20} className="text-orange-500 shrink-0 mt-0.5" />
                  <div className="flex-1 flex justify-between items-center border-b border-stone-800 pb-4">
                    <span>~{estimatedTime} mins</span>
                    <Info size={14} className="text-stone-600" />
                  </div>
                </div>
                <div className="flex items-start gap-4">
                  <User size={20} className="text-orange-500 shrink-0 mt-0.5" />
                  <div className="flex-1 flex justify-between items-center pb-4">
                    <span className="leading-relaxed pr-4">{muscleLabels || "Full body"}</span>
                    <Info size={14} className="text-stone-600" />
                  </div>
                </div>
              </div>

              <div className="space-y-4 pb-32">
                {blocksKeys.map((blockKey) => (
                  <div key={blockKey} className="space-y-4">
                    {blocksMap[blockKey].length > 1 && <div className="text-xs font-bold text-teal-400 uppercase tracking-widest mt-6 mb-2">Block {blockKey} (Super-Set)</div>}

                    {blocksMap[blockKey].map((assignment) => (
                      <div key={assignment.id} className="flex items-center gap-4 group cursor-pointer hover:bg-stone-900 p-2 -mx-2 rounded-2xl transition-colors" onClick={() => onViewExerciseInfo(assignment.exercise)}>
                        <div className="w-16 h-16 rounded-2xl overflow-hidden bg-stone-900 shrink-0 border border-stone-800">
                          {assignment.exercise.gif_url ? (
                            assignment.exercise.gif_url.toLowerCase().includes(".mp4") || assignment.exercise.gif_url.toLowerCase().includes(".webm") ? (
                              <video src={assignment.exercise.gif_url} className="w-full h-full object-cover" />
                            ) : (
                              <img src={assignment.exercise.gif_url} alt={assignment.exercise.title} className="w-full h-full object-cover" />
                            )
                          ) : (
                            <div className="w-full h-full bg-stone-800"></div>
                          )}
                        </div>
                        <div className="flex-1 overflow-hidden py-1">
                          <div className="text-stone-500 text-xs font-bold mb-1 flex items-center gap-1">
                            {assignment.sets} sets x {assignment.is_time ? `${assignment.reps}"` : `${assignment.reps} reps`}
                            {assignment.rir && <span className="bg-stone-800 text-stone-400 px-1.5 py-0.5 rounded text-[8px] ml-1">RIR {assignment.rir}</span>}
                          </div>
                          <h4 className="text-white font-bold truncate">{assignment.exercise.title}</h4>
                        </div>
                        <ChevronLeft size={16} className="text-stone-600 group-hover:text-white transition-colors rotate-180" />
                      </div>
                    ))}
                  </div>
                ))}
              </div>

              {displayedExercises.length > 0 && (
                <div className="fixed bottom-[4.5rem] left-0 right-0 p-6 bg-gradient-to-t from-stone-950 via-stone-950/90 to-transparent z-40 flex justify-center pointer-events-none">
                  <button onClick={onStartWorkout} className="w-full max-w-sm bg-orange-600/90 backdrop-blur-md text-white py-4 rounded-full font-black text-lg hover:bg-orange-500 transition-colors shadow-[0_10px_40px_-5px_rgba(234,88,12,0.3)] pointer-events-auto tracking-widest">
                    START SESSION
                  </button>
                </div>
              )}
            </>
          );
        })()
      )}
    </div>
  );
}
