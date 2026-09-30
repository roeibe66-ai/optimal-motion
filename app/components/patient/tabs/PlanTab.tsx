"use client";

import { useState } from "react";
import {
  ChevronDown,
  ChevronLeft,
  Dumbbell,
  Info,
  MoreHorizontal,
  Play,
  Sparkles,
  Timer,
  User,
  Wind,
} from "lucide-react";
import { useAuth } from "@/app/context/AuthContext";
import { getExerciseName, getWorkoutMuscleAggregation, type WorkoutMuscleAggregation } from "@/app/utils/format";
import { AVAILABLE_MUSCLES, DEFAULT_TRACK_GLOW, EQUIPMENT_LIST, TRACK_GLOW_TINTS } from "@/app/constants/catalog";
import type { AIAssistantContext, CuratedFact, Exercise, Workout, WorkoutLog } from "@/app/types";
import { programNameOf, type HydratedPatientExercise, type SessionExercise } from "@/app/hooks/useWorkoutSession";
import PatientCoachSheet from "@/app/components/patient/PatientCoachSheet";
import AnatomyHeatmap from "@/app/components/AnatomyHeatmap";

interface PlanTabProps {
  workoutLogs: WorkoutLog[];
  selectedCategory: string | null;
  setSelectedCategory: (category: string | null) => void;
  selectedDayFilter: string;
  setSelectedDayFilter: (day: string) => void;
  activePatientWeek: number;
  isDiyMode: boolean;
  diyProgramName: string;
  patientCategories: string[];
  weekFilteredExercises: HydratedPatientExercise[];
  displayedExercises: HydratedPatientExercise[];
  blocksMap: Record<string, SessionExercise[]>;
  blocksKeys: string[];
  onViewExerciseInfo: (exercise: Exercise) => void;
  onStartWorkout: () => void;
  curatedFacts: CuratedFact[];
  hasAnyAssignedExercises: boolean;
  starterWorkouts: Workout[];
  onStartCatalogWorkout: (workout: Workout) => void;
}


const DAYS_OF_WEEK_SHORT = [
  { id: "0", short: "א׳" },
  { id: "1", short: "ב׳" },
  { id: "2", short: "ג׳" },
  { id: "3", short: "ד׳" },
  { id: "4", short: "ה׳" },
  { id: "5", short: "ו׳" },
  { id: "6", short: "ש׳" },
];

// One "Did you know?" card — full width, matching the hero card exactly
// (same rounded-[2rem] corner radius and shadow token), collapsed to just
// the badge + hero line by default. "קרא עוד" reveals the summary and
// citation via a CSS grid-template-rows transition (0fr -> 1fr), which
// animates to the content's natural height without measuring it in JS.
function CuratedFactCard({ fact }: { fact: CuratedFact }) {
  const [isExpanded, setIsExpanded] = useState(false);

  return (
    <div className="on-light w-full shrink-0 snap-center relative overflow-hidden bg-surface rounded-[2rem] shadow-card p-7 md:p-9 flex flex-col gap-4">
      <div className="absolute -top-12 -left-12 w-40 h-40 rounded-full bg-accent/15" aria-hidden="true"></div>

      <span className="relative self-start inline-flex items-center gap-1.5 bg-accent text-on-accent text-[10px] font-extrabold tracking-wide px-3 py-1.5 rounded-full">
        <Sparkles size={12} /> הידעת?
      </span>

      <p className="relative text-fg text-[22px] md:text-[26px] font-black leading-snug">{fact.did_you_know_he}</p>

      <div className={`relative grid transition-[grid-template-rows] duration-300 ease-out ${isExpanded ? "grid-rows-[1fr]" : "grid-rows-[0fr]"}`}>
        <div className="overflow-hidden">
          <p className="text-muted text-[14px] leading-relaxed pt-1">{fact.summary_he}</p>
          <a
            href={fact.paper_url || undefined}
            target="_blank"
            rel="noopener noreferrer"
            className="mt-4 pt-4 border-t border-line block text-[11px] font-semibold text-muted hover:text-accent-fg hover:underline transition-colors truncate"
          >
            {fact.paper_title}
            {fact.year ? ` · ${fact.year}` : ""}
          </a>
        </div>
      </div>

      <button
        type="button"
        onClick={() => setIsExpanded((v) => !v)}
        aria-expanded={isExpanded}
        className="relative self-start flex items-center gap-1 text-accent-fg text-[12px] font-bold hover:brightness-75 active:scale-95 transition-all duration-150 ease-out"
      >
        {isExpanded ? "הצג פחות" : "קרא עוד"}
        <ChevronDown size={14} className={`transition-transform duration-300 ease-out ${isExpanded ? "rotate-180" : ""}`} />
      </button>
    </div>
  );
}

export default function PlanTab({
  workoutLogs,
  selectedCategory,
  setSelectedCategory,
  selectedDayFilter,
  setSelectedDayFilter,
  activePatientWeek,
  isDiyMode,
  diyProgramName,
  patientCategories,
  weekFilteredExercises,
  displayedExercises,
  blocksMap,
  blocksKeys,
  onViewExerciseInfo,
  onStartWorkout,
  curatedFacts,
  hasAnyAssignedExercises,
  starterWorkouts,
  onStartCatalogWorkout,
}: PlanTabProps) {
  const { loggedInPatient, lang } = useAuth();

  // Grounds the patient coach chat in this patient's real plan and recent
  // sessions — the same week's assigned exercises shown below, plus their
  // last few workout logs (RPE/pain), so "should I go easier today" has
  // something real to work from instead of a cold start every time.
  const patientCoachContext: AIAssistantContext = {
    patientName: loggedInPatient?.full_name,
    patientType: loggedInPatient?.patient_type,
    currentExercises: weekFilteredExercises.map((pe) => ({
      title: getExerciseName(pe.exercise, lang),
      block: pe.block || "A",
      sets: Number(pe.sets) || 0,
      reps: Number(pe.reps) || 0,
    })),
    recentWorkoutLogs: workoutLogs.slice(0, 5).map((log) => ({
      category: log.category,
      rpe: log.rpe,
      painBefore: log.pain_before,
      painAfter: log.pain_after,
      createdAt: log.created_at,
    })),
    painAreas: Array.from(new Set(workoutLogs.slice(0, 5).flatMap((log) => (log.pain_areas ? log.pain_areas.split(",") : [])))),
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
    // Combined prime_movers/synergists across every exercise in today's
    // workout, fed to the hero's heatmap overlay below — not decorative,
    // drawn from the same filtered list as the counts above.
    let todayMuscleAggregation: WorkoutMuscleAggregation = { primeMovers: [], synergists: [] };
    if (todayCat) {
      const todayCategoryExercises = weekFilteredExercises.filter((pe) => {
        if (programNameOf(pe) !== todayCat) return false;
        if (selectedDayFilter === "all") return true;
        if (!pe.scheduled_days || pe.scheduled_days.trim() === "") return true;
        return pe.scheduled_days.split(",").includes(selectedDayFilter);
      });
      todayExerciseCount = todayCategoryExercises.length;
      todayBlockCount = new Set(todayCategoryExercises.map((pe) => pe.block || "A")).size;
      // Number(...): pe.sets is patient_exercises.sets, a text column (the
      // TS type says number, but the live DB column is text) — summing the
      // raw strings with + string-concatenates instead of adding (e.g.
      // "3" + "4" === "34"), producing wildly wrong duration estimates.
      const todayTotalSets = todayCategoryExercises.reduce((acc, pe) => acc + (Number(pe.sets) || 0), 0);
      todayEstimatedMinutes = Math.max(10, Math.round(todayTotalSets * 1.5));

      const todayBlocksMap: Record<string, typeof todayCategoryExercises> = {};
      todayCategoryExercises.forEach((pe) => {
        const b = pe.block || "A";
        if (!todayBlocksMap[b]) todayBlocksMap[b] = [];
        todayBlocksMap[b].push(pe);
      });
      todayMuscleAggregation = getWorkoutMuscleAggregation(todayBlocksMap);
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

    const firstName = loggedInPatient?.full_name?.split(" ")[0] ?? "";

    return (
      <div className="animate-in fade-in duration-700 print:hidden">
        <PatientCoachSheet contextData={patientCoachContext} />

        {/* Premium hero greeting — dominates the top of the dashboard on its
            own, deliberately not folded into the compact sticky header
            above (PatientShell), which stays a slim nav bar. Massive/
            uppercase name line against a light-weight italic CTA line for
            the typographic contrast the redesign called for. */}
        <div className="pt-2 pb-10 md:pb-14">
          <p className="text-5xl md:text-6xl font-black uppercase tracking-tight text-fg leading-[0.95]">{firstName ? `היי ${firstName},` : "היי,"}</p>
          <p className="text-4xl md:text-5xl font-light italic text-muted mt-1">מוכן להתחיל?</p>
        </div>

        {/* Today hero card — full-bleed photo (placeholder, see note below)
            with a floating glassmorphic day-selector overlaid at the top
            (replaces the old standalone dark pill bar), a real target-muscle
            diagram on the left, and title/meta/play mirrored for RTL: text
            bottom-right, action button bottom-left. Taller than before
            (480px, was 400px) — the week switcher that used to sit above it
            is gone (week navigation now lives only in the Calendar tab), so
            the hero expands upward into that freed space instead of just
            leaving a gap. */}
        {todayCat ? (
          // -mx-4 md:-mx-8 cancels out `main`'s own side padding
          // (PatientShell) so this hero bleeds to the actual viewport edges
          // instead of sitting inside the page's normal content gutter —
          // "wide, full-width hero card" only reads as such edge-to-edge.
          <div className="scheme-dark relative h-[480px] -mx-4 md:-mx-8 rounded-[2rem] overflow-hidden shadow-card mb-10">
            {/* Placeholder hero photo — a live Unsplash hotlink (Edoardo
                Cuoghi, Unsplash License, unsplash.com/photos/5uzsDVRov2w),
                not a repo asset. Swap for a real owned asset before this
                ships; kept as a remote <img> rather than downloaded since it
                was requested explicitly as a placeholder. The dark gradient
                scrim over the photo stays even in light mode — that's photo
                legibility (white text needs a dark ground under it), not a
                dark-theme leftover; nothing outside the photo itself is dark. */}
            <img
              src="https://images.unsplash.com/photo-1634225251578-d5f6ffced78a?w=1200&q=80&fm=jpg&fit=crop&auto=format"
              alt=""
              className="absolute inset-0 w-full h-full object-cover"
            />
            {/* Warm color-grade tying the photo to this hero's established
                amber palette, plus the bottom scrim for text legibility. */}
            <div className="absolute inset-0" style={{ background: "linear-gradient(160deg, color-mix(in srgb, var(--bg-elevated) 55%, transparent), color-mix(in srgb, var(--scrim) 55%, transparent) 60%)" }}></div>
            <div className="absolute inset-0" style={{ background: "radial-gradient(circle at 75% 20%, color-mix(in srgb, var(--accent) 28%, transparent), transparent 55%)" }}></div>
            <div className="absolute inset-0 bg-gradient-to-t from-scrim via-scrim/50 to-transparent"></div>

            {/* Floating glassmorphic day-selector */}
            <div className="absolute top-4 inset-x-4 z-10 flex justify-between items-center bg-fg/10 backdrop-blur-md border border-fg/15 p-1.5 rounded-full">
              {DAYS_OF_WEEK_SHORT.map((day) => {
                const isActive = selectedDayFilter === day.id;
                return (
                  <button
                    key={day.id}
                    onClick={() => setSelectedDayFilter(day.id)}
                    className={`flex-1 h-8 flex items-center justify-center rounded-full text-[11px] font-bold transition-all duration-200 ease-out active:scale-90 ${
                      isActive ? "on-light bg-surface text-fg shadow-sm" : "text-fg/70 hover:text-fg"
                    }`}
                  >
                    {day.short}
                  </button>
                );
              })}
            </div>

            {/* Floating status badge */}
            <div className="absolute top-[4.75rem] right-4 z-10 bg-fg/15 backdrop-blur-md border border-fg/20 text-fg text-[10px] font-bold tracking-wide px-3 py-1.5 rounded-full">
              האימון של היום
            </div>

            {/* Muscle-engagement overlay, left side (RTL: text lives on the
                right) — same AnatomyHeatmap as the exercise-info sheet, fed
                the whole day's combined prime_movers/synergists
                (getWorkoutMuscleAggregation) rather than one exercise's, so
                it lights up total engagement for the session. No card/
                border behind it any more — a plain drop-shadow filter
                (not a background) keeps the outline legible against
                whatever's directly behind it in the photo without boxing
                it in. Fixed width (AnatomyHeatmap sizes itself via
                aspect-ratio off that width) is what keeps this a clean
                thumbnail instead of stretching to fill the overlay. */}
            {(todayMuscleAggregation.primeMovers.length > 0 || todayMuscleAggregation.synergists.length > 0) && (
              <div className="absolute top-1/2 left-4 -translate-y-1/2 z-10 w-28" style={{ filter: "drop-shadow(0 6px 16px color-mix(in srgb, var(--shadow-ink) 45%, transparent))" }}>
                <AnatomyHeatmap primeMovers={todayMuscleAggregation.primeMovers} synergists={todayMuscleAggregation.synergists} />
              </div>
            )}

            {/* Title + meta, bottom-right (RTL) */}
            <div className="absolute bottom-5 right-5 left-24 z-10 flex flex-col gap-2">
              <h3 className="text-[26px] font-black tracking-tight leading-tight text-fg truncate">{isDiyMode ? diyProgramName : todayCat}</h3>
              <div className="flex items-center gap-3.5 text-fg text-[13px] font-semibold">
                <span className="flex items-center gap-1.5">
                  <Timer size={14} /> כ-{todayEstimatedMinutes} דק&apos;
                </span>
                <span className="flex items-center gap-1.5">
                  <Dumbbell size={14} />
                  {todayExerciseCount} תרגילים · {todayBlockCount} בלוקים
                </span>
              </div>
            </div>

            {/* Primary action, bottom-left — mirrors the reference's
                bottom-right button for RTL. */}
            <button
              onClick={() => setSelectedCategory(String(todayCat))}
              className="absolute bottom-5 left-5 z-10 w-14 h-14 rounded-full bg-fg/15 border border-fg/25 backdrop-blur-md flex items-center justify-center hover:bg-fg/25 hover:scale-110 active:scale-95 transition-all duration-200 ease-out shadow-[0_8px_24px_-4px_color-mix(in_srgb,var(--shadow-ink)_50%,transparent)]"
            >
              <Play size={20} className="fill-fg text-fg" />
            </button>
          </div>
        ) : !isDiyMode && !hasAnyAssignedExercises && starterWorkouts.length > 0 ? (
          // No assigned program at all yet (never just "nothing scheduled
          // today" — that case still falls through to the plain rest-day
          // card below) — offer a ready-to-start 3-day split pulled from the
          // free workout catalog instead of a dead end.
          <div className="on-light rounded-[2rem] p-7 md:p-9 bg-surface shadow-card mb-10">
            <div className="flex items-center gap-2 mb-1.5">
              <Sparkles size={18} className="text-accent-fg" />
              <h3 className="text-lg font-black text-fg">התחל עם תוכנית פתיחה</h3>
            </div>
            <p className="text-muted text-sm mb-6">עדיין אין לך תוכנית מוקצית. הכנו לך {starterWorkouts.length} ימי אימון להתחלה — אפשר להתחיל מיד.</p>
            <div className="flex flex-col gap-3">
              {starterWorkouts.map((w, idx) => (
                <button
                  key={w.id}
                  onClick={() => onStartCatalogWorkout(w)}
                  className="on-light flex items-center gap-4 bg-surface-alt hover:bg-line rounded-2xl p-4 text-start transition-colors"
                >
                  <div className="w-11 h-11 rounded-full bg-accent text-on-accent flex items-center justify-center font-black text-sm shrink-0">{idx + 1}</div>
                  <div className="flex-1 overflow-hidden">
                    <div className="text-[10px] font-extrabold text-accent-fg uppercase tracking-wide mb-0.5">יום {idx + 1}</div>
                    <div className="font-bold text-fg truncate">{w.title}</div>
                  </div>
                  <Play size={16} className="text-muted shrink-0" />
                </button>
              ))}
            </div>
          </div>
        ) : (
          <div className="on-light rounded-[2rem] p-10 text-center h-[280px] flex flex-col items-center justify-center relative overflow-hidden mb-10 bg-surface shadow-card">
            <Wind size={44} className="text-accent-fg mb-4" />
            <h3 className="text-xl font-black text-fg mb-2">מנוחה פעילה</h3>
            <p className="text-muted text-sm">אין אימוני כוח מתוכננים להיום. מומלץ לבצע רוטינת תנועתיות בסיסית.</p>
          </div>
        )}

        {/* "Did you know?" — admin-curated research facts (curated_facts,
            published from the admin research tab; see
            app/actions/researchAgent.ts and useCuratedFacts.ts). Each card is
            full width — same as the hero above it, not a peeking-carousel —
            so with more than one fact, the row still scroll-snaps but pages
            one full card at a time rather than showing slivers of neighbors.
            Renders nothing until the admin has published at least one fact. */}
        {curatedFacts.length > 0 && (
          <div className="mb-10">
            <div className="text-[11px] font-extrabold tracking-widest text-muted uppercase mb-3.5">הידעת?</div>
            <div className="flex gap-4 overflow-x-auto no-scrollbar snap-x snap-mandatory -mx-1 px-1">
              {curatedFacts.map((fact) => (
                <CuratedFactCard key={fact.id} fact={fact} />
              ))}
            </div>
          </div>
        )}

        {/* Tracks */}
        <div className="mb-10">
          <div className="text-[11px] font-extrabold tracking-widest text-muted uppercase mb-3.5">המסלולים שלך</div>
          {patientCategories.length === 0 ? (
            <div className="on-light bg-surface p-10 rounded-[2rem] shadow-card text-center flex flex-col items-center">
              <p className="text-muted text-sm">אתה יכול גם להסתכל על שאר התוכניות שלך (אם קיימות).</p>
            </div>
          ) : (
            <div className="flex gap-3 overflow-x-auto no-scrollbar pb-1">
              {patientCategories.map((cat, idx) => {
                const glowTint = TRACK_GLOW_TINTS[cat] ?? DEFAULT_TRACK_GLOW;

                return (
                  <button
                    key={idx}
                    onClick={() => setSelectedCategory(String(cat))}
                    className="on-light min-w-[158px] rounded-3xl overflow-hidden bg-surface text-right shrink-0 shadow-card transition-all duration-300 ease-out hover:-translate-y-1 hover:shadow-[0_16px_32px_-8px_color-mix(in_srgb,var(--shadow-ink)_10%,transparent)] active:scale-[0.97] active:translate-y-0"
                  >
                    <div className="on-light h-[120px] relative bg-surface-alt">
                      <div
                        className="absolute inset-0"
                        style={{ background: `radial-gradient(circle at 70% 25%, ${glowTint}, transparent 55%)` }}
                      ></div>
                    </div>
                    <div className="p-3 flex flex-col gap-2">
                      <div className="font-bold text-[13px] text-fg">{cat}</div>
                      <div className="text-[11px] font-bold px-2.5 py-1 rounded-full w-fit bg-accent/15 text-accent-fg">
                        פעיל
                      </div>
                    </div>
                  </button>
                );
              })}
            </div>
          )}
        </div>

        {/* Recent trend */}
        <div>
          <div className="text-[11px] font-extrabold tracking-widest text-muted uppercase mb-3.5">מגמה אחרונה</div>
          {workoutLogs.length === 0 ? (
            <div className="on-light bg-surface p-10 rounded-[2rem] shadow-card text-center">
              <p className="text-muted text-sm">הנתונים יופיעו כאן ברגע שתסיים את האימון הראשון.</p>
            </div>
          ) : (
            <div className="on-light bg-surface shadow-card rounded-[1.75rem] p-5">
              <div className="flex justify-between items-start mb-3.5">
                <span className="text-[13px] font-bold text-muted">מאמץ (RPE) · {recentLogs.length} אימונים אחרונים</span>
                <div className="text-left" dir="ltr">
                  <div className="text-xl font-black text-warm-fg">{avgRpe.toFixed(1)}</div>
                  <div className="text-[10px] text-muted font-semibold">ממוצע</div>
                </div>
              </div>
              <svg width="100%" height="64" viewBox="0 0 320 64" preserveAspectRatio="none">
                {sparklinePoints.length > 1 && (
                  <>
                    <polyline points={sparklineAreaPath} fill="url(#rpeGradient)" stroke="none" opacity="0.5" />
                    <polyline points={sparklinePath} fill="none" stroke="var(--warm-fg)" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" />
                  </>
                )}
                <defs>
                  <linearGradient id="rpeGradient" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor="var(--warm)" stopOpacity="0.35" />
                    <stop offset="100%" stopColor="var(--warm)" stopOpacity="0" />
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
  return (
    <div className="animate-in slide-in-from-left duration-500 print:hidden max-w-lg mx-auto">
      <PatientCoachSheet contextData={patientCoachContext} />

      <div className="mb-6 flex items-center justify-between">
        <button
          onClick={() => setSelectedCategory(null)}
          aria-label="חזור"
          className="p-2 bg-elevated shadow-card rounded-full hover:bg-line active:scale-90 transition-all duration-150 ease-out text-fg"
        >
          <ChevronLeft size={24} />
        </button>
        <span className="text-xs font-bold uppercase tracking-widest text-muted">פרטים</span>
        <button aria-label="עוד אפשרויות" className="p-2 text-muted hover:text-fg active:scale-90 transition-all duration-150 ease-out">
          <MoreHorizontal size={24} />
        </button>
      </div>

      {(() => {
          // Number(...): same text-column issue as todayTotalSets above.
          const totalSets = displayedExercises.reduce((acc, curr) => acc + (Number(curr.sets) || 0), 0);
          const estimatedTime = Math.max(10, Math.round(totalSets * 1.5));
          const uniqueMuscles = Array.from(new Set(displayedExercises.map((a) => a.exercise?.target_muscle).filter(Boolean)));
          const muscleLabels = uniqueMuscles.map((m) => AVAILABLE_MUSCLES.find((am) => am.id === m)?.label).filter(Boolean).join(", ");

          const equipSet = new Set<string>();
          displayedExercises.forEach((a) => {
            (a.exercise?.equipment ?? []).forEach((eqId) => {
              const label = EQUIPMENT_LIST.find((e) => e.id === eqId)?.label;
              if (label) equipSet.add(label);
            });
          });
          const equipmentLabels = equipSet.size > 0 ? Array.from(equipSet).join(", ") : "משקל גוף (ללא ציוד)";

          return (
            <>
              <div className="mb-8">
                <span className="bg-fg/10 text-muted font-bold px-2.5 py-1 rounded-md text-[10px] uppercase tracking-widest mb-3 inline-block">קלאסי</span>
                <h1 className="text-4xl font-black text-fg tracking-tight leading-tight mb-2">{isDiyMode ? diyProgramName : selectedCategory}</h1>
                <p className="text-muted text-sm font-medium">
                  שבוע {activePatientWeek} - אימון {selectedDayFilter === "all" ? "1" : selectedDayFilter} - {new Date().toLocaleDateString("he-IL", { weekday: "short", month: "short", day: "numeric" })}
                </p>
              </div>

              {/* Metadata rows — no dividers, tight rhythm; primary icon at
                  the trailing (right) edge in RTL, info glyph at the far
                  leading (left) edge, matching the reference's list-row
                  pattern instead of the old bordered rows. */}
              <div className="space-y-3.5 mb-10 text-muted text-sm">
                <div className="flex items-center gap-4">
                  <Dumbbell size={20} className="text-accent-fg shrink-0" />
                  <div className="flex-1 flex justify-between items-center">
                    <span>{equipmentLabels}</span>
                    <Info size={14} className="text-muted" />
                  </div>
                </div>
                <div className="flex items-center gap-4">
                  <Timer size={20} className="text-accent-fg shrink-0" />
                  <div className="flex-1 flex justify-between items-center">
                    <span>~{estimatedTime} דק׳</span>
                    <Info size={14} className="text-muted" />
                  </div>
                </div>
                <div className="flex items-center gap-4">
                  <User size={20} className="text-accent-fg shrink-0" />
                  <div className="flex-1 flex justify-between items-center">
                    <span className="leading-relaxed pr-4">{muscleLabels || "גוף מלא"}</span>
                    <Info size={14} className="text-muted" />
                  </div>
                </div>
              </div>

              <div className="space-y-4 pb-32">
                {blocksKeys.map((blockKey) => (
                  <div key={blockKey} className="space-y-4">
                    {blocksMap[blockKey].length > 1 && <div className="text-xs font-bold text-accent-fg uppercase tracking-widest mt-6 mb-2">בלוק {blockKey} (סופר-סט)</div>}

                    {blocksMap[blockKey].map((assignment) => (
                      <div
                        key={assignment.id}
                        className="on-light flex items-center gap-4 group cursor-pointer bg-surface hover:bg-surface-alt active:scale-[0.98] p-4 rounded-2xl shadow-sm border border-line transition-all duration-150 ease-out"
                        onClick={() => onViewExerciseInfo(assignment.exercise)}
                      >
                        <div className="on-light w-16 h-16 rounded-2xl overflow-hidden bg-surface-alt shrink-0">
                          {assignment.exercise.gif_url ? (
                            assignment.exercise.gif_url.toLowerCase().includes(".mp4") || assignment.exercise.gif_url.toLowerCase().includes(".webm") ? (
                              <video src={assignment.exercise.gif_url} className="w-full h-full object-cover" />
                            ) : (
                              <img src={assignment.exercise.gif_url} alt={getExerciseName(assignment.exercise, lang)} className="w-full h-full object-cover" />
                            )
                          ) : (
                            <div className="on-light w-full h-full bg-surface-alt"></div>
                          )}
                        </div>
                        <div className="flex-1 overflow-hidden py-1">
                          <div className="text-muted text-xs font-bold mb-1 flex items-center gap-1">
                            {assignment.sets} סטים x {assignment.is_time ? `${assignment.reps}"` : `${assignment.reps} חזרות`}
                            {assignment.rir && <span className="on-light bg-surface-alt text-muted px-1.5 py-0.5 rounded text-[8px] ml-1">RIR {assignment.rir}</span>}
                          </div>
                          <h4 className="text-fg font-bold truncate">{getExerciseName(assignment.exercise, lang)}</h4>
                        </div>
                        <ChevronLeft size={16} className="text-muted group-hover:text-fg transition-colors rotate-180" />
                      </div>
                    ))}
                  </div>
                ))}
              </div>

              {displayedExercises.length > 0 && (
                // Dark glass bar (bg-elevated/90 backdrop-blur-md) the page
                // bleeds through, holding a solid accent CTA pill — the
                // primary accent now carries the button itself, not just
                // its text. Sits just above the app's own fixed bottom nav
                // (bottom-[4.5rem] matches its h-16 + gap).
                <div className="fixed bottom-[4.5rem] left-0 right-0 z-40 bg-elevated/90 backdrop-blur-md border-t border-line px-5 py-4">
                  <button
                    onClick={onStartWorkout}
                    className="w-full max-w-lg mx-auto flex items-center justify-center bg-btn-primary hover:bg-btn-primary-hover active:bg-btn-primary-active text-btn-primary-fg active:scale-[0.98] transition-all duration-150 ease-out font-black text-lg py-4 rounded-full tracking-widest shadow-[0_8px_24px_-4px_color-mix(in_srgb,var(--accent)_45%,transparent)]"
                  >
                    התחל אימון
                  </button>
                </div>
              )}
            </>
          );
        })()}
    </div>
  );
}
