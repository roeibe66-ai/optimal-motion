"use client";

import { useState, type UIEvent } from "react";
import {
  ArrowDown,
  ChevronDown,
  ChevronLeft,
  ClipboardCheck,
  Dumbbell,
  Info,
  MoreHorizontal,
  Play,
  Plus,
  Sparkles,
  Timer,
  User,
  Wind,
} from "lucide-react";
import { Area, AreaChart, CartesianGrid, ResponsiveContainer, Tooltip as RechartsTooltip, XAxis, YAxis } from "recharts";
import { useAuth } from "@/app/context/AuthContext";
import { countLabel, formatRepTarget, formatTime, formatWeightKg, getExerciseName, getWorkoutMuscleAggregation, type WorkoutMuscleAggregation } from "@/app/utils/format";
import { AVAILABLE_MUSCLES, DAYS_OF_WEEK, DEFAULT_TRACK_GLOW, EQUIPMENT_LIST, TRACK_GLOW_TINTS } from "@/app/constants/catalog";
import type { AIAssistantContext, CuratedFact, Exercise, ExploreProgram, WorkoutLog } from "@/app/types";
import { dailyWorkoutImage, dominantWorkoutCategory } from "@/app/utils/workoutImages";
import { programNameOf, type HydratedPatientExercise, type SessionExercise } from "@/app/hooks/useWorkoutSession";
import PatientCoachSheet from "@/app/components/patient/PatientCoachSheet";
import { FEATURES } from "@/app/constants/features";
import AnatomyHeatmap from "@/app/components/AnatomyHeatmap";
import { ExerciseMediaPlayer } from "@/app/components/ExerciseMedia";
import QuickLogSheet from "@/app/components/patient/workout/QuickLogSheet";
import { getLastUsedWeights } from "@/app/utils/history";

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
  onWorkoutLogged: () => void; // refetch after a quick log
  curatedFacts: CuratedFact[];
  hasAnyAssignedExercises: boolean;
  starterPrograms: ExploreProgram[];
  onAddStarterProgram: (programId: string) => Promise<boolean>;
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

      <span className="relative self-start inline-flex items-center gap-1.5 bg-accent text-on-accent text-[10px] font-extrabold px-3 py-1.5 rounded-full">
        <Sparkles size={12} /> הידעת?
      </span>

      {/* Clamped to 4 lines until "קרא עוד": facts are LLM-drafted and some
          run 250+ characters (9 lines at this size). */}
      <p className={`relative text-fg text-[22px] md:text-[26px] font-black leading-snug ${isExpanded ? "" : "line-clamp-4"}`}>{fact.did_you_know_he}</p>

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
        className="relative self-start flex items-center gap-1 text-accent-fg text-[12px] font-bold hover:brightness-75 active:scale-95 transition-ui duration-150 ease-out"
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
  onWorkoutLogged,
  curatedFacts,
  hasAnyAssignedExercises,
  starterPrograms,
  onAddStarterProgram,
}: PlanTabProps) {
  const { loggedInPatient, lang } = useAuth();
  const [isQuickLogOpen, setIsQuickLogOpen] = useState(false);
  // Which "Did you know?" card is snapped into view — the carousel has no
  // scrollbar, so a "2/5" counter is the only cue that more facts exist.
  const [factIndex, setFactIndex] = useState(0);
  const onFactsScroll = (e: UIEvent<HTMLDivElement>) => {
    const el = e.currentTarget;
    setFactIndex(Math.round(Math.abs(el.scrollLeft) / el.clientWidth));
  };

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
    // The program shown in the hero: the first one with exercises on the
    // selected day. It used to be patientCategories[0] regardless of day, so
    // a rest day showed "0 תרגילים" with a play button into an empty list
    // (and a second program training that day was never offered).
    const isOnSelectedDay = (pe: HydratedPatientExercise) =>
      selectedDayFilter === "all" || !pe.scheduled_days || pe.scheduled_days.trim() === "" || pe.scheduled_days.split(",").includes(selectedDayFilter);
    const todayCat = patientCategories.find((cat) => weekFilteredExercises.some((pe) => programNameOf(pe) === cat && isOnSelectedDay(pe))) ?? null;
    const isTodaySelected = selectedDayFilter === String(new Date().getDay());
    const selectedDayLabel = DAYS_OF_WEEK.find((d) => d.id === selectedDayFilter)?.label;

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
    let todayHeroImage = dailyWorkoutImage(null);
    if (todayCat) {
      const todayCategoryExercises = weekFilteredExercises.filter((pe) => programNameOf(pe) === todayCat && isOnSelectedDay(pe));
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
      todayHeroImage = dailyWorkoutImage(dominantWorkoutCategory(todayCategoryExercises.map((pe) => pe.exercise?.categories ?? [])));
    }

    // RPE trend: the last 20 logged workouts that have an RPE (rpe is
    // nullable), oldest first, plus their average.
    const recentLogs = workoutLogs
      .filter((l) => l.rpe != null)
      .slice(0, 20)
      .reverse();
    const avgRpe = recentLogs.length > 0 ? recentLogs.reduce((acc, l) => acc + Number(l.rpe), 0) / recentLogs.length : 0;
    const rpeChartData = recentLogs.map((log) => ({
      date: new Date(log.created_at).toLocaleDateString("he-IL", { day: "2-digit", month: "2-digit" }),
      rpe: Number(log.rpe),
      workout: log.category,
    }));

    // The first name as typed at signup; older/Google accounts have none
    // stored, so fall back to full_name's first word for them.
    const firstName = loggedInPatient?.first_name?.trim() || loggedInPatient?.full_name?.split(" ")[0] || "";

    return (
      <div className="print:hidden">
        {FEATURES.patientAiCoach && <PatientCoachSheet contextData={patientCoachContext} />}

        {/* Premium hero greeting — dominates the top of the dashboard on its
            own, deliberately not folded into the compact sticky header
            above (PatientShell), which stays a slim nav bar. Massive/
            name line against a light-weight muted CTA line (no italic:
            Rubik ships none, so Hebrew got a faux slant) for
            the typographic contrast the redesign called for. */}
        <div className="pt-2 pb-10 md:pb-14">
          <p className="text-5xl md:text-6xl font-black tracking-tight text-fg leading-[0.95]">{firstName ?`היי ${firstName},` :"היי,"}</p>
          <p className="text-4xl md:text-5xl font-light text-muted mt-1">שנתחיל?</p>
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
        {patientCategories.length > 0 || isDiyMode ? (
          // -mx-4 md:-mx-8 cancels out `main`'s own side padding
          // (PatientShell) so this hero bleeds to the actual viewport edges
          // instead of sitting inside the page's normal content gutter —
          // "wide, full-width hero card" only reads as such edge-to-edge.
          <div className="scheme-dark relative h-[480px] -mx-4 md:-mx-8 rounded-[2rem] overflow-hidden shadow-card mb-10">
            {/* Ecco artwork for the workout's dominant category, a different
                one each day (app/utils/workoutImages.ts). The dark gradient
                scrim over it stays even in light mode — that's legibility
                for the white text, not a dark-theme leftover. */}
            {/* The artwork is portrait (~4:5): shown whole (contain) over a
                blurred, cover-cropped copy of itself, so the wide desktop
                card doesn't slice a band out of the character's middle. On
                phones the card is ~4:5 too and the two layers coincide. */}
            <img
              src={todayHeroImage}
              alt=""
              aria-hidden="true"
              className="absolute inset-0 w-full h-full object-cover scale-110 blur-2xl"
            />
            <img
              src={todayHeroImage}
              alt=""
              className="absolute inset-0 w-full h-full object-contain"
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
                    className={`flex-1 h-10 flex items-center justify-center rounded-full text-[11px] font-bold transition-ui duration-200 ease-out active:scale-90 ${
                      isActive ? "on-light bg-surface text-fg shadow-sm" : "text-fg/70 hover:text-fg"
                    }`}
                  >
                    {day.short}
                  </button>
                );
              })}
            </div>

            {/* Floating status badge — names the selected day when it isn't today. */}
            <div className="absolute top-[5.25rem] right-4 z-10 bg-fg/15 backdrop-blur-md border border-fg/20 text-fg text-[10px] font-bold px-3 py-1.5 rounded-full">
              {isTodaySelected ? "האימון של היום" : `יום ${selectedDayLabel}`}
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
            {todayCat && (todayMuscleAggregation.primeMovers.length > 0 || todayMuscleAggregation.synergists.length > 0) && (
              <div className="absolute top-1/2 left-4 -translate-y-1/2 z-10 w-28" style={{ filter: "drop-shadow(0 6px 16px color-mix(in srgb, var(--shadow-ink) 45%, transparent))" }}>
                <AnatomyHeatmap primeMovers={todayMuscleAggregation.primeMovers} synergists={todayMuscleAggregation.synergists} />
              </div>
            )}

            {/* Title + meta, bottom-right (RTL). Nothing on the selected day
                -> the rest state, in the same card so the day selector
                above stays reachable. */}
            {!todayCat && !isDiyMode ? (
              <div className="absolute bottom-5 inset-x-5 z-10 flex flex-col gap-1.5">
                <h3 className="text-[26px] font-black tracking-tight leading-tight text-fg flex items-center gap-2">
                  <Wind size={24} /> מנוחה פעילה
                </h3>
                <p className="text-fg/80 text-[13px] font-semibold">אין אימון מתוכנן ביום הזה. מומלץ לבצע רוטינת תנועתיות בסיסית.</p>
              </div>
            ) : (
            <div className="absolute bottom-5 right-5 left-24 z-10 flex flex-col gap-2">
              <h3 className="text-[26px] font-black tracking-tight leading-tight text-fg line-clamp-2 [overflow-wrap:anywhere]">{isDiyMode ? diyProgramName : todayCat}</h3>
              <div className="flex flex-wrap items-center gap-x-3.5 gap-y-1 text-fg text-[13px] font-semibold">
                <span className="flex items-center gap-1.5">
                  <Timer size={14} /> כ-{todayEstimatedMinutes} דק&apos;
                </span>
                <span className="flex items-center gap-1.5">
                  <Dumbbell size={14} />
                  {countLabel(todayExerciseCount, "תרגיל אחד", "תרגילים")} · {countLabel(todayBlockCount, "בלוק אחד", "בלוקים")}
                </span>
              </div>
            </div>
            )}

            {/* Primary action, bottom-left — mirrors the reference's
                bottom-right button for RTL. */}
            {(todayCat || isDiyMode) && (
            <button
              onClick={() => setSelectedCategory(String(todayCat))}
              className="absolute bottom-5 left-5 z-10 w-14 h-14 rounded-full bg-fg/15 border border-fg/25 backdrop-blur-md flex items-center justify-center hover:bg-fg/25 hover:scale-110 active:scale-95 transition-ui duration-200 ease-out shadow-[0_8px_24px_-4px_color-mix(in_srgb,var(--shadow-ink)_50%,transparent)]"
            >
              <Play size={20} className="fill-fg text-fg" />
            </button>
            )}
          </div>
        ) : !isDiyMode && !hasAnyAssignedExercises && starterPrograms.length > 0 ? (
          // No program at all yet (never just "nothing scheduled today" —
          // that case still falls through to the plain rest-day card below)
          // — offer free published programs from Explore to add in one tap,
          // instead of a dead end.
          <div className="on-light rounded-[2rem] p-7 md:p-9 bg-surface shadow-card mb-10">
            <div className="flex items-center gap-2 mb-1.5">
              <Sparkles size={18} className="text-accent-fg" />
              <h3 className="text-lg font-black text-fg">התחל עם תוכנית פתיחה</h3>
            </div>
            <p className="text-muted text-sm mb-6">עדיין אין לך תוכנית. בחר תוכנית חינמית להתחלה — היא תתווסף לתוכניות שלך ותופיע כאן.</p>
            <div className="flex flex-col gap-3">
              {starterPrograms.map((w, idx) => (
                <button
                  key={w.id}
                  onClick={() => onAddStarterProgram(String(w.id))}
                  className="on-light flex items-center gap-4 bg-surface-alt hover:bg-line rounded-2xl p-4 text-start transition-colors"
                >
                  <div className="w-11 h-11 rounded-full bg-accent text-on-accent flex items-center justify-center font-black text-sm shrink-0">{idx + 1}</div>
                  <div className="flex-1 overflow-hidden">
                    <div className="text-[10px] font-extrabold text-accent-fg mb-0.5">תוכנית חינמית</div>
                    <div className="font-bold text-fg line-clamp-2 [overflow-wrap:anywhere]">{w.title}</div>
                  </div>
                  <Plus size={16} className="text-muted shrink-0" />
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
            <div className="flex items-center justify-between mb-3.5">
              <div className="text-[11px] font-extrabold text-muted">הידעת?</div>
              {curatedFacts.length > 1 && (
                <div className="text-[11px] font-bold text-muted tabular-nums" dir="ltr">
                  {Math.min(factIndex + 1, curatedFacts.length)}/{curatedFacts.length}
                </div>
              )}
            </div>
            <div onScroll={onFactsScroll} className="flex items-start gap-4 overflow-x-auto no-scrollbar snap-x snap-mandatory -mx-1 px-1">
              {curatedFacts.map((fact) => (
                <CuratedFactCard key={fact.id} fact={fact} />
              ))}
            </div>
          </div>
        )}

        {/* Tracks — hidden with no programs (a new patient already gets the
            starter-program offer above; an empty box here only confused). */}
        {patientCategories.length > 0 && (
        <div className="mb-10">
          <div className="text-[11px] font-extrabold text-muted mb-3.5">המסלולים שלך</div>
          {(
            <div className="flex gap-3 overflow-x-auto no-scrollbar pb-1">
              {patientCategories.map((cat, idx) => {
                const glowTint = TRACK_GLOW_TINTS[cat] ?? DEFAULT_TRACK_GLOW;

                return (
                  <button
                    key={idx}
                    onClick={() => setSelectedCategory(String(cat))}
                    className="on-light w-[158px] rounded-3xl overflow-hidden bg-surface text-right shrink-0 shadow-card transition-ui duration-300 ease-out hover:-translate-y-1 hover:shadow-[0_16px_32px_-8px_color-mix(in_srgb,var(--shadow-ink)_10%,transparent)] active:scale-[0.97] active:translate-y-0"
                  >
                    <div className="on-light h-[120px] relative bg-surface-alt">
                      <div
                        className="absolute inset-0"
                        style={{ background: `radial-gradient(circle at 70% 25%, ${glowTint}, transparent 55%)` }}
                      ></div>
                    </div>
                    <div className="p-3 flex flex-col gap-2">
                      <div className="font-bold text-[13px] leading-snug text-fg line-clamp-2 [overflow-wrap:anywhere]">{cat}</div>
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
        )}

        {/* Recent trend */}
        <div>
          <div className="text-[11px] font-extrabold text-muted mb-3.5">מגמה אחרונה</div>
          {recentLogs.length === 0 ? (
            <div className="on-light bg-surface p-10 rounded-[2rem] shadow-card text-center">
              <p className="text-muted text-sm">הנתונים יופיעו כאן ברגע שתסיים את האימון הראשון.</p>
            </div>
          ) : (
            <div className="on-light bg-surface shadow-card rounded-[1.75rem] p-5">
              <div className="flex justify-between items-start mb-3.5">
                <span className="text-[13px] font-bold text-muted">מאמץ (RPE) · {countLabel(recentLogs.length, "האימון האחרון", "אימונים אחרונים")}</span>
                <div className="text-left" dir="ltr">
                  <div className="text-xl font-black text-warm-fg">{avgRpe.toFixed(1)}</div>
                  <div className="text-[10px] text-muted font-semibold">ממוצע</div>
                </div>
              </div>
              <div className="h-44 w-full" dir="ltr">
                <ResponsiveContainer width="100%" height="100%">
                  <AreaChart data={rpeChartData} margin={{ top: 6, right: 6, left: -18, bottom: 0 }}>
                    <defs>
                      <linearGradient id="rpeGradient" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="0%" stopColor="var(--warm)" stopOpacity={0.35} />
                        <stop offset="100%" stopColor="var(--warm)" stopOpacity={0} />
                      </linearGradient>
                    </defs>
                    <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="var(--border)" />
                    <XAxis dataKey="date" tick={{ fontSize: 10, fill: "var(--text-muted)" }} />
                    <YAxis domain={[0, 10]} ticks={[0, 2, 4, 6, 8, 10]} tick={{ fontSize: 10, fill: "var(--text-muted)" }} />
                    <RechartsTooltip
                      contentStyle={{ backgroundColor: "var(--surface)", borderColor: "var(--border)", color: "var(--text-fg)", direction: "rtl" }}
                      labelFormatter={(label, payload) => `${label}${payload?.[0]?.payload?.workout ? ` · ${payload[0].payload.workout}` : ""}`}
                    />
                    {/* No draw-in animation: this is data to read, and it sits on the home screen. */}
                    <Area type="monotone" dataKey="rpe" name="RPE" stroke="var(--warm-fg)" strokeWidth={2.5} fill="url(#rpeGradient)" dot={{ r: 3 }} isAnimationActive={false} />
                  </AreaChart>
                </ResponsiveContainer>
              </div>
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
    <div className="print:hidden max-w-lg mx-auto">
      {FEATURES.patientAiCoach && <PatientCoachSheet contextData={patientCoachContext} />}

      <div className="mb-6 flex items-center justify-between">
        <button
          onClick={() => setSelectedCategory(null)}
          aria-label="חזור"
          className="p-2 bg-elevated shadow-card rounded-full hover:bg-line active:scale-90 transition-ui duration-150 ease-out text-fg"
        >
          <ChevronLeft size={24} />
        </button>
        <span className="text-xs font-bold text-muted">פרטים</span>
        <button aria-label="עוד אפשרויות" className="p-2 text-muted hover:text-fg active:scale-90 transition-ui duration-150 ease-out">
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
                <span className="bg-fg/10 text-muted font-bold px-2.5 py-1 rounded-md text-[10px] mb-3 inline-block">
                  {displayedExercises[0]?.program_format === "amrap"
                    ? `AMRAP · ${Math.round((displayedExercises[0].program_time_cap_seconds ?? 0) / 60)} דק׳`
                    : "קלאסי"}
                </span>
                <h1 className="text-4xl font-black text-fg tracking-tight leading-tight mb-2">{isDiyMode ? diyProgramName : selectedCategory}</h1>
                <p className="text-muted text-sm font-medium">
                  {/* Was "אימון {day id}" ("אימון 6" on Saturday) plus today's
                      date even when another day was selected. */}
                  שבוע {activePatientWeek}
                  {DAYS_OF_WEEK.find((d) => d.id === selectedDayFilter) ? ` · יום ${DAYS_OF_WEEK.find((d) => d.id === selectedDayFilter)!.label}` : ""}
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

              {/* Follow-along list: for patients who'd rather read the plan
                  than run the player. Each card loops its demo clip (only
                  while on screen — InViewVideo) and spells out sets, reps
                  and rest. Rest mirrors useWorkoutSession: a single
                  exercise rests between its own sets; a superset runs its
                  exercises back to back and rests once per round, for the
                  last exercise's rest_time_seconds. */}
              <div className="space-y-4 pb-44">
                {blocksKeys.map((blockKey) => {
                  const block = blocksMap[blockKey];
                  const isSuperset = block.length > 1;
                  const isAmrap = block[0] && "program_format" in block[0] && block[0].program_format === "amrap";
                  const blockRounds = Math.max(...block.map((a) => Number(a.sets) || 0));
                  const blockRest = Number(block[block.length - 1]?.rest_time_seconds) || 0;
                  return (
                  <div key={blockKey} className="space-y-3">
                    {isSuperset && <div className="text-xs font-bold text-accent-fg mt-6 mb-1">בלוק {blockKey} (סופר-סט)</div>}

                    {block.map((assignment, idx) => {
                      const name = getExerciseName(assignment.exercise, lang);
                      const weight = formatWeightKg(assignment.weight_kg);
                      const rest = Number(assignment.rest_time_seconds) || 0;
                      const stats: { label: string; value: string }[] = isAmrap
                        ? [{ label: "בכל סבב", value: assignment.is_time ? `${assignment.reps}"` : formatRepTarget(assignment.reps, assignment.reps_max) }]
                        : [
                            { label: "סטים", value: String(assignment.sets) },
                            // Timed holds of a minute or more read as mm:ss, like the rest next to them.
                            assignment.is_time
                              ? Number(assignment.reps) >= 60
                                ? { label: "זמן", value: formatTime(Number(assignment.reps)) }
                                : { label: "שניות", value: String(assignment.reps) }
                              : { label: "חזרות", value: formatRepTarget(assignment.reps, assignment.reps_max) },
                            ...(!isSuperset && rest > 0 ? [{ label: "מנוחה", value: formatTime(rest) }] : []),
                          ];
                      return (
                      <div key={assignment.id}>
                        <div
                          className="on-light flex items-stretch gap-4 group cursor-pointer bg-surface hover:bg-surface-alt active:scale-[0.98] p-3 rounded-2xl shadow-sm border border-line transition-ui duration-150 ease-out"
                          onClick={() => onViewExerciseInfo(assignment.exercise)}
                        >
                          <div className="on-light w-28 h-32 rounded-xl overflow-hidden bg-surface-alt shrink-0">
                            <ExerciseMediaPlayer
                              exercise={assignment.exercise}
                              label={name}
                              mode="fill"
                              fillFit="contain"
                              placeholder={<div className="on-light w-full h-full bg-surface-alt flex items-center justify-center"><Dumbbell size={22} className="text-muted" /></div>}
                            />
                          </div>
                          <div className="flex-1 min-w-0 flex flex-col justify-between py-1">
                            <div className="flex items-start gap-2">
                              {/* No dir="auto": it flipped Hebrew names that open in English ("Nordic Hamstring Curl (אקסצנטרי…") to LTR and the clamp scrambled them. */}
                              <h4 className="flex-1 text-fg font-bold leading-snug line-clamp-2 text-start [overflow-wrap:anywhere]">{name}</h4>
                              <ChevronLeft size={16} className="text-muted group-hover:text-fg transition-colors rotate-180 mt-1 shrink-0" />
                            </div>
                            <div className="flex gap-1.5 mt-2">
                              {stats.map((st) => (
                                <div key={st.label} className="on-light flex-1 bg-surface-alt rounded-lg py-1.5 text-center">
                                  <div className="text-fg font-black text-base leading-none tabular-nums">{st.value}</div>
                                  <div className="text-muted text-[10px] font-bold mt-1">{st.label}</div>
                                </div>
                              ))}
                            </div>
                            {(assignment.rir != null || weight) && (
                              <div className="flex gap-1.5 mt-2 text-[10px] font-bold">
                                {assignment.rir != null && <span className="on-light bg-surface-alt text-muted px-1.5 py-0.5 rounded">RIR {assignment.rir}</span>}
                                {weight && <span className="bg-accent/15 text-accent-fg px-1.5 py-0.5 rounded">{weight}</span>}
                              </div>
                            )}
                          </div>
                        </div>
                        {isSuperset && !isAmrap && idx < block.length - 1 && (
                          <div className="flex items-center justify-center gap-1.5 text-[11px] font-bold text-muted pt-2">
                            <ArrowDown size={12} /> ישר לתרגיל הבא, בלי מנוחה
                          </div>
                        )}
                      </div>
                      );
                    })}

                    {isSuperset && !isAmrap && (
                      <div className="flex items-center justify-center gap-2 text-xs font-bold text-accent-fg bg-accent/10 rounded-full py-2">
                        <Timer size={14} />
                        {countLabel(blockRounds, "סבב אחד", "סבבים")}{blockRest > 0 ? ` · מנוחה ${formatTime(blockRest)} אחרי כל סבב` : ""}
                      </div>
                    )}
                  </div>
                  );
                })}
              </div>

              {displayedExercises.length > 0 && (
                // Dark glass bar (bg-elevated/90 backdrop-blur-md) the page
                // bleeds through, holding a solid accent CTA pill — the
                // primary accent now carries the button itself, not just
                // its text. Sits just above the app's own fixed bottom nav
                // (its h-16 + the same max(0.5rem, safe-area) bottom padding
                // the nav uses — a fixed 4.5rem slid under the nav on phones
                // with a home indicator).
                <div className="fixed bottom-[calc(4rem+max(0.5rem,env(safe-area-inset-bottom)))] left-0 right-0 z-40 bg-elevated/90 backdrop-blur-md border-t border-line px-5 py-4">
                  <div className="w-full max-w-lg mx-auto flex flex-col gap-2">
                  <button
                    onClick={onStartWorkout}
                    className="w-full flex items-center justify-center bg-btn-primary hover:bg-btn-primary-hover active:bg-btn-primary-active text-btn-primary-fg active:scale-[0.98] transition-ui duration-150 ease-out font-black text-lg py-4 rounded-full shadow-[0_8px_24px_-4px_color-mix(in_srgb,var(--accent)_45%,transparent)]"
                  >
                    התחל אימון
                  </button>
                  {/* For a patient who trained without running the player —
                      log reps (and optional weights) straight to tracking. */}
                  <button
                    onClick={() => setIsQuickLogOpen(true)}
                    className="w-full flex items-center justify-center gap-2 text-fg font-bold text-sm py-2 rounded-full hover:bg-line active:scale-[0.98] transition-ui duration-150 ease-out"
                  >
                    <ClipboardCheck size={16} /> כבר התאמנתי — תיעוד מהיר
                  </button>
                  </div>
                </div>
              )}

              {isQuickLogOpen && (
                <QuickLogSheet
                  title={isDiyMode ? diyProgramName : (selectedCategory ?? "")}
                  blocksMap={blocksMap}
                  blocksKeys={blocksKeys}
                  isAmrap={displayedExercises[0]?.program_format === "amrap"}
                  previousWeights={getLastUsedWeights(workoutLogs)}
                  onClose={() => setIsQuickLogOpen(false)}
                  onLogged={onWorkoutLogged}
                />
              )}
            </>
          );
        })()}
    </div>
  );
}
