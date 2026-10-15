"use client";

import { useEffect, useState, type UIEvent } from "react";
import {
  ArrowDown,
  Check,
  CheckCircle2,
  ChevronDown,
  ChevronLeft,
  ChevronRight,
  ClipboardCheck,
  Dumbbell,
  Play,
  Pencil,
  Plus,
  Sparkles,
  Timer,
  User,
} from "lucide-react";
import { Area, AreaChart, CartesianGrid, ResponsiveContainer, Tooltip as RechartsTooltip, XAxis, YAxis } from "recharts";
import { useAuth } from "@/app/context/AuthContext";
import { countLabel, formatRepTarget, formatTime, formatWeightKg, getExerciseName, getWorkoutMuscleAggregation, type WorkoutMuscleAggregation } from "@/app/utils/format";
import { AVAILABLE_MUSCLES, DEFAULT_TRACK_GLOW, EQUIPMENT_LIST, TRACK_GLOW_TINTS } from "@/app/constants/catalog";
import { EquipmentIcon } from "@/app/components/ui/EquipmentIcon";
import MuscleThumb, { exerciseMuscles } from "@/app/components/MuscleThumb";
import { ECCO_EMPTY } from "@/app/constants/ecco";
import ExerciseNotes from "@/app/components/ExerciseNotes";
import type { AIAssistantContext, CuratedFact, Exercise, ExploreProgram, QueueLogRef, WorkoutLog } from "@/app/types";
import { blocksOf, DAY_NAMES, dayNameOfKey, plannedLabel, queueRefFor, type PlannedWorkout, type ProgramQueueEntry } from "@/app/utils/programQueue";
import { dailyWorkoutImage, dominantWorkoutCategory, programWorkoutImage } from "@/app/utils/workoutImages";
import { toDateKey, type HydratedPatientExercise, type SessionExercise } from "@/app/hooks/useWorkoutSession";
import PatientCoachSheet from "@/app/components/patient/PatientCoachSheet";
import { FEATURES } from "@/app/constants/features";
import AnatomyHeatmap from "@/app/components/AnatomyHeatmap";
import { ExerciseMediaPlayer } from "@/app/components/ExerciseMedia";
import QuickLogSheet from "@/app/components/patient/workout/QuickLogSheet";
import { getLastUsedWeights } from "@/app/utils/history";
import { rankFactsForPatient } from "@/app/utils/factRanking";
import { useBackDismiss } from "@/app/hooks/useBackDismiss";
import { useAddress } from "@/app/hooks/useAddress";

interface PlanTabProps {
  isLoading?: boolean; // first fetch still in flight — skeletons, not empty states
  workoutLogs: WorkoutLog[];
  selectedCategory: string | null;
  setSelectedCategory: (category: string | null) => void;
  selectedDayFilter: string;
  activePatientWeek: number;
  isDiyMode: boolean;
  diyProgramName: string;
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
  // This week's plan per program (app/utils/programQueue.ts): planned
  // workouts on their days with done/open status. Opening one selects its
  // program (selectedCategory), week and day (selectedDayFilter = slot).
  queue: ProgramQueueEntry[];
  onOpenProgram: (entry: ProgramQueueEntry, item: PlannedWorkout) => void;
  onEditProgram: (entry: ProgramQueueEntry) => void;
  queueLogRef: QueueLogRef | null;
  // Set while a fitness patient deferred the onboarding questionnaire: shows
  // a card that opens it (useOnboarding).
  onCompleteOnboarding?: () => void;
}


const DAY_SHORT = ["א׳", "ב׳", "ג׳", "ד׳", "ה׳", "ו׳", "ש׳"];

// The week at a glance on the hero's glass bar: each day with what's
// planned on it — done (check), still open from an earlier day (hollow
// warm ring), or upcoming (dot). Tapping a day opens its workout.
function WeekStrip({ queue, onPick }: { queue: ProgramQueueEntry[]; onPick: (entry: ProgramQueueEntry, item: PlannedWorkout) => void }) {
  const today = new Date();
  const todayKey = toDateKey(today);
  const sunday = new Date(today.getFullYear(), today.getMonth(), today.getDate() - today.getDay());
  return (
    <div className="flex justify-between items-center">
      {DAY_SHORT.map((label, i) => {
        const key = toDateKey(new Date(sunday.getFullYear(), sunday.getMonth(), sunday.getDate() + i));
        const items = queue.flatMap((entry) => entry.planned.filter((p) => p.date === key).map((item) => ({ entry, item })));
        const open = items.filter(({ item }) => !item.doneLog);
        const allDone = items.length > 0 && open.length === 0;
        const isToday = key === todayKey;
        const pick = open[0] ?? items[0];
        return (
          <button
            key={key}
            type="button"
            disabled={!pick}
            onClick={() => pick && onPick(pick.entry, pick.item)}
            aria-label={`יום ${DAY_NAMES[i]}${items.length === 0 ? " — אין אימון" : allDone ? " — בוצע" : key < todayKey ? " — לא בוצע" : ""}`}
            className={`flex-1 h-12 flex flex-col items-center justify-center gap-1 rounded-full text-[0.6875rem] font-bold transition-ui duration-200 ease-out active:scale-90 ${
              isToday ? "on-light bg-surface text-fg shadow-sm" : "text-fg/75"
            }`}
          >
            {label}
            <span className="h-2 flex items-center" aria-hidden="true">
              {allDone ? (
                <Check size={10} strokeWidth={4} className={isToday ? "text-accent-fg" : "text-fg"} />
              ) : open.length > 0 && key < todayKey ? (
                <span className="w-2 h-2 rounded-full border-2 border-warm" />
              ) : items.length > 0 ? (
                <span className={`w-1.5 h-1.5 rounded-full ${isToday ? "bg-accent-fg" : "bg-fg/70"}`} />
              ) : null}
            </span>
          </button>
        );
      })}
    </div>
  );
}

// One "Did you know?" card — full width, matching the hero card exactly
// (same rounded-[2rem] corner radius and shadow token), collapsed to just
// the badge + hero line by default. "קרא עוד" reveals the summary and
// citation via a CSS grid-template-rows transition (0fr -> 1fr), which
// animates to the content's natural height without measuring it in JS.
const SEEN_FACTS_KEY = "optimalMotionSeenFacts";

function CuratedFactCard({ fact }: { fact: CuratedFact }) {
  const [isExpanded, setIsExpanded] = useState(false);

  return (
    <div className="on-light w-full shrink-0 snap-center relative overflow-hidden bg-surface rounded-[2rem] shadow-card p-7 md:p-9 flex flex-col gap-4">
      <div className="absolute -top-12 -left-12 w-40 h-40 rounded-full bg-accent/15" aria-hidden="true"></div>

      <span className="relative self-start inline-flex items-center gap-1.5 bg-accent text-on-accent text-[0.6875rem] font-extrabold px-3 py-1.5 rounded-full">
        <Sparkles size={12} /> הידעת?
      </span>

      {/* Clamped to 4 lines until "קרא עוד": facts are LLM-drafted and some
          run 250+ characters (9 lines at this size). */}
      <p className={`relative text-fg text-[1.375rem] md:text-[1.625rem] font-black leading-snug ${isExpanded ? "" : "line-clamp-4"}`}>{fact.did_you_know_he}</p>
      {/* The practical line ("מה זה אומר בשבילך") — always visible, it's the
          part a patient can act on. */}
      {fact.takeaway_he && <p className="relative -mt-1 text-fg text-[0.9375rem] font-semibold leading-snug">← {fact.takeaway_he}</p>}

      <div className={`relative grid transition-[grid-template-rows] duration-300 ease-out ${isExpanded ? "grid-rows-[1fr]" : "grid-rows-[0fr]"}`}>
        {/* inert while collapsed: hidden text and its link stay out of the
            keyboard order and the screen reader until "קרא עוד". */}
        <div className="overflow-hidden" inert={!isExpanded}>
          <p className="text-muted text-sm leading-relaxed pt-1">{fact.summary_he}</p>
          <a
            href={fact.paper_url || undefined}
            target="_blank"
            rel="noopener noreferrer"
            className="mt-4 pt-4 border-t border-line block text-[0.6875rem] font-semibold text-muted hover:text-accent-fg hover:underline transition-colors truncate"
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
        className="relative self-start flex items-center gap-1 text-accent-fg text-xs font-bold hover:brightness-75 active:scale-95 transition-ui duration-150 ease-out"
      >
        {isExpanded ? "הצג פחות" : "קרא עוד"}
        <ChevronDown size={14} className={`transition-transform duration-300 ease-out ${isExpanded ? "rotate-180" : ""}`} />
      </button>
    </div>
  );
}

export default function PlanTab({
  isLoading = false,
  workoutLogs,
  selectedCategory,
  setSelectedCategory,
  selectedDayFilter,
  activePatientWeek,
  isDiyMode,
  diyProgramName,
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
  queue,
  onOpenProgram,
  onEditProgram,
  queueLogRef,
  onCompleteOnboarding,
}: PlanTabProps) {
  const { loggedInPatient, lang } = useAuth();
  const t = useAddress();
  const [isQuickLogOpen, setIsQuickLogOpen] = useState(false);
  // Direction of the last overview <-> program-detail move, for the push
  // animation. null when the detail was opened from outside (e.g. Calendar):
  // that arrives via a tab switch, which stays instant.
  const [navDir, setNavDir] = useState<"forward" | "back" | null>(null);
  const openProgram = (entry: ProgramQueueEntry, item: PlannedWorkout | null = entry.focus ?? entry.planned[0] ?? null) => {
    if (!item) return;
    setNavDir("forward");
    onOpenProgram(entry, item);
  };
  // "Mark as done" from the home screen: the quick log for one planned
  // workout, logged under its own day even when done on another.
  const [quickLogFor, setQuickLogFor] = useState<{ entry: ProgramQueueEntry; item: PlannedWorkout } | null>(null);
  const closeProgram = () => {
    setNavDir("back");
    setSelectedCategory(null);
  };
  // System Back from a program screen returns to the overview, not out of the app.
  useBackDismiss(!!selectedCategory, closeProgram);
  const pushIn = navDir === "forward" ? "animate-step-in" : "";
  // Which "Did you know?" card is snapped into view — the carousel has no
  // scrollbar, so a "2/5" counter is the only cue that more facts exist.
  const [factIndex, setFactIndex] = useState(0);
  // Facts already shown to this viewer (a per-device convenience, so
  // localStorage). A snapshot read once after mount — not in a useState
  // initializer (hydration mismatch, see MISTAKES.md) — so the order doesn't
  // shift under the patient's finger as cards get marked seen below.
  const [seenFactIds, setSeenFactIds] = useState<Set<string>>(() => new Set());
  useEffect(() => {
    try {
      const stored = JSON.parse(localStorage.getItem(SEEN_FACTS_KEY) ?? "[]");
      // eslint-disable-next-line react-hooks/set-state-in-effect -- reading browser storage, an external system, once after mount
      if (Array.isArray(stored)) setSeenFactIds(new Set(stored.map(String)));
    } catch {
      // Storage blocked or corrupt: every fact counts as unseen.
    }
  }, []);
  const orderedFacts = rankFactsForPatient(curatedFacts, {
    painAreas: workoutLogs.slice(0, 10).flatMap((log) => (log.pain_areas ? log.pain_areas.split(",") : [])),
    programMuscles: weekFilteredExercises.flatMap((pe) => pe.exercise.prime_movers ?? []),
    patientType: loggedInPatient?.patient_type,
    seenIds: seenFactIds,
  });
  const visibleFactId = orderedFacts[Math.min(factIndex, orderedFacts.length - 1)]?.id;
  useEffect(() => {
    if (!visibleFactId) return;
    try {
      const stored = JSON.parse(localStorage.getItem(SEEN_FACTS_KEY) ?? "[]");
      const ids: string[] = Array.isArray(stored) ? stored.map(String) : [];
      if (!ids.includes(visibleFactId)) localStorage.setItem(SEEN_FACTS_KEY, JSON.stringify([...ids, visibleFactId].slice(-200)));
    } catch {
      // Not remembering is fine.
    }
  }, [visibleFactId]);
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
    // The hero: the first program with something to do — today's workout,
    // else one still open from earlier this week, else a flexible one, else
    // the next upcoming day. With nothing open, the week is complete.
    const todayKey = toDateKey(new Date());
    const heroEntry = queue.find((e) => e.focus) ?? null;
    const heroItem = heroEntry?.focus ?? null;
    const weekComplete = queue.length > 0 && !heroEntry;
    const heroRows = heroItem?.session.rows ?? [];
    const heroExerciseCount = heroRows.length;
    const heroBlockCount = new Set(heroRows.map((pe) => pe.block || "A")).size;
    // Number(...): pe.sets has been a text column in the past; summing raw
    // strings with + string-concatenates instead of adding.
    const heroEstimatedMinutes = Math.max(10, Math.round(heroRows.reduce((acc, pe) => acc + (Number(pe.sets) || 0), 0) * 1.5));
    // Combined prime_movers/synergists across the workout, for the hero's heatmap.
    const heroMuscleAggregation: WorkoutMuscleAggregation = heroItem ? getWorkoutMuscleAggregation(blocksOf(heroRows).blocksMap) : { primeMovers: [], synergists: [] };
    const heroImage = dailyWorkoutImage(heroItem ? dominantWorkoutCategory(heroRows.map((pe) => pe.exercise?.categories ?? [])) : null);
    const heroBadge = !heroEntry || !heroItem
      ? ""
      : heroItem.date === null
        ? `השבוע ${heroEntry.doneThisWeek}/${heroEntry.weeklyTarget} · בימים שנוחים לך`
        : heroItem.date === todayKey
          ? "האימון של היום"
          : heroItem.date < todayKey
            ? `של יום ${dayNameOfKey(heroItem.date)} — עוד לא בוצע`
            : `הבא: יום ${dayNameOfKey(heroItem.date)}`;
    // Everything else still open this week that's due already: earlier
    // days not done yet, and flexible workouts — each can be done (or
    // marked done) today.
    const openItems = queue.flatMap((entry) =>
      entry.planned.filter((p) => !p.doneLog && p !== heroItem && (p.date === null || p.date <= todayKey)).map((item) => ({ entry, item }))
    );

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
      <div key="overview" className={`print:hidden ${navDir === "back" ? "animate-step-back" : ""}`}>
        {FEATURES.patientAiCoach && <PatientCoachSheet contextData={patientCoachContext} />}

        {/* Premium hero greeting — dominates the top of the dashboard on its
            own, deliberately not folded into the compact sticky header
            above (PatientShell), which stays a slim nav bar. Massive/
            name line against a light-weight muted CTA line (no italic:
            Rubik ships none, so Hebrew got a faux slant) for
            the typographic contrast the redesign called for. */}
        <div className="pt-2 pb-10 md:pb-14">
          <p className="text-5xl md:text-6xl font-black tracking-tight text-fg leading-[0.95] text-balance">{firstName ?`היי ${firstName},` :"היי,"}</p>
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
        {isLoading && queue.length === 0 ? (
          // Same footprint as the hero card, so nothing jumps when it lands.
          <div aria-hidden="true" className="h-[480px] -mx-4 md:-mx-8 rounded-[2rem] mb-10 bg-surface-alt animate-pulse motion-reduce:animate-none" />
        ) : heroEntry && heroItem ? (
          // -mx-4 md:-mx-8 cancels out `main`'s own side padding
          // (PatientShell) so this hero bleeds to the actual viewport edges.
          <div className="scheme-dark relative h-[480px] -mx-4 md:-mx-8 rounded-[2rem] overflow-hidden shadow-card mb-6">
            {/* Ecco artwork for the workout's dominant category
                (app/utils/workoutImages.ts), portrait, shown whole (contain)
                over a blurred cover-cropped copy of itself. The dark scrim
                stays in light mode too — it's legibility for the white text. */}
            <img src={heroImage} alt="" aria-hidden="true" className="absolute inset-0 w-full h-full object-cover scale-110 blur-2xl" />
            <img src={heroImage} alt="" className="absolute inset-0 w-full h-full object-contain" />
            <div className="absolute inset-0" style={{ background: "linear-gradient(160deg, color-mix(in srgb, var(--bg-elevated) 55%, transparent), color-mix(in srgb, var(--scrim) 55%, transparent) 60%)" }}></div>
            <div className="absolute inset-0" style={{ background: "radial-gradient(circle at 75% 20%, color-mix(in srgb, var(--accent) 28%, transparent), transparent 55%)" }}></div>
            <div className="absolute inset-0 bg-gradient-to-t from-scrim via-scrim/50 to-transparent"></div>

            <div className="absolute top-4 inset-x-4 z-10 bg-fg/10 backdrop-blur-md border border-fg/15 p-1.5 rounded-full">
              <WeekStrip queue={queue} onPick={(entry, item) => openProgram(entry, item)} />
            </div>

            <div className="absolute top-[5.5rem] right-4 z-10 bg-fg/15 backdrop-blur-md border border-fg/20 text-fg text-[0.6875rem] font-bold px-3 py-1.5 rounded-full">
              {heroBadge}
            </div>

            {(heroMuscleAggregation.primeMovers.length > 0 || heroMuscleAggregation.synergists.length > 0) && (
              <div className="absolute bottom-[5.5rem] left-4 z-10 w-28" style={{ filter: "drop-shadow(0 6px 16px color-mix(in srgb, var(--shadow-ink) 45%, transparent))" }}>
                <AnatomyHeatmap primeMovers={heroMuscleAggregation.primeMovers} synergists={heroMuscleAggregation.synergists} />
              </div>
            )}

            <div className="absolute bottom-5 right-5 left-24 z-10 flex flex-col gap-2">
              <h3 className="text-[1.625rem] font-black tracking-tight leading-tight text-fg line-clamp-2 [overflow-wrap:anywhere]">{heroEntry.name}</h3>
              <div className="flex flex-wrap items-center gap-x-3.5 gap-y-1 text-fg text-[0.8125rem] font-semibold">
                <span className="flex items-center gap-1.5">
                  <Timer size={14} /> כ-{heroEstimatedMinutes} דק&apos;
                </span>
                <span className="flex items-center gap-1.5">
                  <Dumbbell size={14} />
                  {countLabel(heroExerciseCount, "תרגיל אחד", "תרגילים")} · {countLabel(heroBlockCount, "בלוק אחד", "בלוקים")}
                </span>
              </div>
            </div>

            <button
              onClick={() => openProgram(heroEntry, heroItem)}
              aria-label={`פתח את ${heroEntry.name}`}
              className="absolute bottom-5 left-5 z-10 w-14 h-14 rounded-full bg-fg/15 border border-fg/25 backdrop-blur-md flex items-center justify-center hover:bg-fg/25 hover:scale-[1.04] active:scale-95 transition-ui duration-200 ease-out shadow-[0_8px_24px_-4px_color-mix(in_srgb,var(--shadow-ink)_50%,transparent)]"
            >
              <Play size={20} className="fill-fg text-fg" />
            </button>
          </div>
        ) : weekComplete ? (
          <div className="on-light rounded-[2rem] p-6 pb-9 text-center flex flex-col items-center justify-center mb-6 bg-surface shadow-card">
            <img src={ECCO_EMPTY.weekComplete} alt="" className="w-full max-w-sm aspect-[3/2] object-cover rounded-[1.5rem] mb-5" />
            <h3 className="text-xl font-black text-fg mb-2">כל האימונים של השבוע בוצעו</h3>
            <p className="text-muted text-sm">כל הכבוד! התוכנית של השבוע הבא תופיע כאן ביום ראשון.</p>
          </div>
        ) : !isDiyMode && !hasAnyAssignedExercises && starterPrograms.length > 0 ? (
          // No program at all yet (never just "nothing scheduled today" —
          // that case still falls through to the plain rest-day card below)
          // — offer free published programs from Explore to add in one tap,
          // instead of a dead end.
          <div className="on-light rounded-[2rem] p-7 md:p-9 bg-surface shadow-card mb-10">
            <div className="flex items-center gap-2 mb-1.5">
              <Sparkles size={18} className="text-accent-fg" />
              <h3 className="text-lg font-black text-fg">{t("התחל עם תוכנית פתיחה")}</h3>
            </div>
            <p className="text-muted text-sm mb-6">{t("עדיין אין לך תוכנית. בחר תוכנית חינמית להתחלה — היא תתווסף לתוכניות שלך ותופיע כאן.")}</p>
            <div className="flex flex-col gap-3">
              {starterPrograms.map((w, idx) => (
                <button
                  key={w.id}
                  onClick={() => onAddStarterProgram(String(w.id))}
                  className="on-light flex items-center gap-4 bg-surface-alt hover:bg-line rounded-2xl p-4 text-start transition-ui duration-150 ease-out active:scale-[0.97]"
                >
                  <div className="w-11 h-11 rounded-full bg-accent text-on-accent flex items-center justify-center font-black text-sm shrink-0">{idx + 1}</div>
                  <div className="flex-1 overflow-hidden">
                    <div className="text-[0.6875rem] font-extrabold text-accent-fg mb-0.5">תוכנית חינמית</div>
                    <div className="font-bold text-fg line-clamp-2 [overflow-wrap:anywhere]">{w.title}</div>
                  </div>
                  <Plus size={16} className="text-muted shrink-0" />
                </button>
              ))}
            </div>
          </div>
        ) : (
          <div className="on-light rounded-[2rem] p-6 pb-9 text-center flex flex-col items-center justify-center relative overflow-hidden mb-10 bg-surface shadow-card">
            <img src={ECCO_EMPTY.noPlan} alt="" className="w-full max-w-sm aspect-[3/2] object-cover rounded-[1.5rem] mb-5" />
            <h3 className="text-xl font-black text-fg mb-2">אין תוכנית פעילה</h3>
            <p className="text-muted text-sm">{t("כשתשויך לך תוכנית אימון, האימון הבא שלך יופיע כאן.")}</p>
          </div>
        )}

        {/* Still open this week — earlier days not done yet and flexible
            workouts. Each can be done now, or marked done if it was done
            already (the log completes its own planned day). */}
        {openItems.length > 0 && (
          <div className="mb-10">
            <div className="text-[0.6875rem] font-extrabold text-muted mb-3.5">עוד להשלים השבוע</div>
            <div className="on-light bg-surface rounded-[1.75rem] shadow-card divide-y divide-line">
              {openItems.map(({ entry, item }) => (
                <div key={item.id} className="flex items-center gap-3 p-4">
                  <button onClick={() => openProgram(entry, item)} className="flex-1 min-w-0 text-start active:scale-[0.98] transition-ui duration-150 ease-out">
                    <div className="font-black text-fg text-sm leading-snug line-clamp-1 [overflow-wrap:anywhere]">{entry.name}</div>
                    <div className={`text-[0.6875rem] font-bold mt-0.5 ${item.date ? "text-warm-fg" : "text-muted"}`}>
                      {item.date ? `${plannedLabel(item, entry)} — עוד לא בוצע` : `${plannedLabel(item, entry)} · השבוע ${entry.doneThisWeek}/${entry.weeklyTarget}`}
                    </div>
                  </button>
                  <button
                    onClick={() => setQuickLogFor({ entry, item })}
                    className="shrink-0 flex items-center gap-1.5 text-xs font-bold text-accent-fg bg-accent/10 hover:bg-accent/15 px-3 py-2 rounded-full active:scale-95 transition-ui duration-150 ease-out"
                  >
                    <ClipboardCheck size={14} /> {t("סמן כבוצע")}
                  </button>
                </div>
              ))}
            </div>
          </div>
        )}

        {quickLogFor && (
          <QuickLogSheet
            title={quickLogFor.entry.name}
            {...blocksOf(quickLogFor.item.session.rows)}
            isAmrap={quickLogFor.entry.isAmrap}
            previousWeights={getLastUsedWeights(workoutLogs)}
            onClose={() => setQuickLogFor(null)}
            onLogged={onWorkoutLogged}
            queueLogRef={queueRefFor(quickLogFor.entry, quickLogFor.item)}
          />
        )}

        {/* Deferred onboarding questionnaire: one tap reopens it. */}
        {onCompleteOnboarding && (
          <button
            type="button"
            onClick={onCompleteOnboarding}
            className="on-light w-full mb-10 flex items-center gap-4 bg-surface rounded-[2rem] shadow-card p-4 text-start active:scale-[0.98] transition-transform duration-150 ease-out"
          >
            <img src="/ecco/feedback-thumbs.webp" alt="" className="w-16 h-16 rounded-2xl object-cover shrink-0" />
            <span className="flex-1 min-w-0">
              <span className="block font-black text-fg">בואו נכיר עוד קצת</span>
              <span className="block text-xs text-muted mt-0.5">6 שאלות קצרות, כדי שהתוכנית וההצעות יתאימו לכם</span>
            </span>
            <ChevronLeft size={18} className="text-muted shrink-0" />
          </button>
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
              <div className="text-[0.6875rem] font-extrabold text-muted">הידעת?</div>
              {curatedFacts.length > 1 && (
                <div className="text-[0.6875rem] font-bold text-muted tabular-nums" dir="ltr">
                  {Math.min(factIndex + 1, curatedFacts.length)}/{curatedFacts.length}
                </div>
              )}
            </div>
            <div onScroll={onFactsScroll} className="flex items-start gap-4 overflow-x-auto no-scrollbar snap-x snap-mandatory -mx-1 px-1">
              {orderedFacts.map((fact) => (
                <CuratedFactCard key={fact.id} fact={fact} />
              ))}
            </div>
          </div>
        )}

        {/* Every program with this week's progress — tapping one opens the
            workout due next in it. Hidden with no programs (a new patient
            already gets the starter-program offer above). */}
        {queue.length > 0 && (
          <div className="mb-10">
            <div className="text-[0.6875rem] font-extrabold text-muted mb-3.5">המסלולים שלך</div>
            <div className="flex gap-3 overflow-x-auto no-scrollbar pb-1">
              {queue.map((entry) => {
                const glowTint = TRACK_GLOW_TINTS[entry.name] ?? DEFAULT_TRACK_GLOW;
                const done = !entry.isOneTime && entry.doneThisWeek >= entry.weeklyTarget;
                return (
                  <button
                    key={entry.key}
                    onClick={() => openProgram(entry)}
                    className="on-light w-[158px] rounded-3xl overflow-hidden bg-surface text-right shrink-0 shadow-card transition-ui duration-300 ease-out hover:-translate-y-1 hover:shadow-[0_16px_32px_-8px_color-mix(in_srgb,var(--shadow-ink)_10%,transparent)] active:scale-[0.97] active:translate-y-0"
                  >
                    {/* The program's own artwork (its dominant exercise category,
                        same set as the hero), over an accent glow as a fallback. */}
                    <div className="on-light h-[120px] relative bg-surface-alt overflow-hidden">
                      <div className="absolute inset-0" style={{ background: `radial-gradient(circle at 70% 25%, ${glowTint}, transparent 55%)` }}></div>
                      <img
                        src={programWorkoutImage(dominantWorkoutCategory(entry.sessions.flatMap((se) => se.rows).map((pe) => pe.exercise?.categories ?? [])), entry.name)}
                        alt=""
                        loading="lazy"
                        className="absolute inset-0 w-full h-full object-cover object-top"
                      />
                    </div>
                    <div className="p-3 flex flex-col gap-2">
                      <div className="font-bold text-[0.8125rem] leading-snug text-fg line-clamp-2 [overflow-wrap:anywhere]">{entry.name}</div>
                      <div className={`text-[0.6875rem] font-bold px-2.5 py-1 rounded-full w-fit tabular-nums ${done ? "bg-success/15 text-fg" : "bg-accent/15 text-accent-fg"}`}>
                        {entry.isOneTime ? (
                          "חד-פעמי"
                        ) : done ? (
                          "✓ יעד השבוע הושלם"
                        ) : (
                          <span className="inline-flex items-center gap-1.5">
                            {/* A small ring of the week's progress next to the count. */}
                            <svg viewBox="0 0 16 16" className="w-3.5 h-3.5 -rotate-90 shrink-0" aria-hidden="true">
                              <circle cx="8" cy="8" r="6" fill="none" strokeWidth="2.5" style={{ stroke: "color-mix(in srgb, var(--accent) 25%, transparent)" }} />
                              <circle
                                cx="8"
                                cy="8"
                                r="6"
                                fill="none"
                                strokeWidth="2.5"
                                strokeLinecap="round"
                                style={{ stroke: "var(--accent-fg)" }}
                                strokeDasharray={2 * Math.PI * 6}
                                strokeDashoffset={2 * Math.PI * 6 * (1 - Math.min(1, entry.doneThisWeek / Math.max(1, entry.weeklyTarget)))}
                              />
                            </svg>
                            השבוע {entry.doneThisWeek}/{entry.weeklyTarget}
                          </span>
                        )}
                      </div>
                    </div>
                  </button>
                );
              })}
            </div>
          </div>
        )}

        {/* Recent trend */}
        <div>
          <div className="text-[0.6875rem] font-extrabold text-muted mb-3.5">מגמה אחרונה</div>
          {recentLogs.length === 0 && isLoading ? (
            <div aria-hidden="true" className="h-[15.5rem] rounded-[1.75rem] bg-surface-alt animate-pulse motion-reduce:animate-none" />
          ) : recentLogs.length === 0 ? (
            <div className="on-light bg-surface p-6 pb-8 rounded-[2rem] shadow-card text-center flex flex-col items-center">
              <img src={ECCO_EMPTY.noData} alt="" className="w-full max-w-xs aspect-[3/2] object-cover rounded-[1.5rem] mb-4" />
              <p className="text-muted text-sm">הנתונים יופיעו כאן ברגע שתסיים את האימון הראשון.</p>
            </div>
          ) : (
            <div className="on-light bg-surface shadow-card rounded-[1.75rem] p-5">
              <div className="flex justify-between items-start mb-3.5">
                <span className="text-[0.8125rem] font-bold text-muted">מאמץ (RPE) · {countLabel(recentLogs.length, "האימון האחרון", "אימונים אחרונים")}</span>
                <div className="text-left" dir="ltr">
                  <div className="text-xl font-black text-warm-fg">{avgRpe.toFixed(1)}</div>
                  <div className="text-[0.6875rem] text-muted font-semibold">ממוצע</div>
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
  // The open program's queue entry: its workouts for the week (switchable
  // below — the patient may do any of them, not only the suggested one).
  const detailEntry = isDiyMode ? null : (queue.find((e) => e.name === selectedCategory) ?? null);
  const detailItem = detailEntry?.planned.find((p) => p.slotKey === selectedDayFilter) ?? null;
  const detailTodayKey = toDateKey(new Date());

  return (
    <div key="detail" className="print:hidden max-w-lg mx-auto">
      {FEATURES.patientAiCoach && <PatientCoachSheet contextData={patientCoachContext} />}

      {/* The detail's content pushes in; its fixed CTA bar below is not inside
          an animated element, so it never anchors to a moving transform. */}
      <div className={`mb-6 flex items-center justify-between ${pushIn}`}>
        <button
          onClick={closeProgram}
          aria-label={t("חזור")}
          className="p-2 bg-elevated shadow-card rounded-full hover:bg-line active:scale-90 transition-ui duration-150 ease-out text-fg"
        >
          {/* Back points right in RTL — same as My workouts' back button. */}
          <ChevronRight size={24} />
        </button>
        <span className="text-xs font-bold text-muted">פרטים</span>
        {detailEntry?.canEdit ? (
          // The patient can make an assigned program their own; the
          // therapist sees that it was edited and can restore it.
          <button
            onClick={() => onEditProgram(detailEntry)}
            className="flex items-center gap-1.5 px-3.5 h-10 bg-elevated shadow-card rounded-full hover:bg-line active:scale-95 transition-ui duration-150 ease-out text-fg text-xs font-bold"
          >
            <Pencil size={14} /> ערוך
          </button>
        ) : (
          <span className="w-10" aria-hidden="true" />
        )}
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
          // A kettlebell-only workout gets the kettlebell glyph instead of the dumbbell.
          const equipIds = new Set(displayedExercises.flatMap((a) => a.exercise?.equipment ?? []).filter((id) => id !== "bodyweight"));
          const equipIconId = equipIds.size === 1 && equipIds.has("kettlebell") ? "kettlebell" : "dumbbells";

          return (
            <>
              <div className={`mb-8 ${pushIn}`}>
                <span className="bg-fg/10 text-muted font-bold px-2.5 py-1 rounded-md text-[0.6875rem] mb-3 inline-block">
                  {displayedExercises[0]?.program_format === "amrap"
                    ? `AMRAP · ${Math.round((displayedExercises[0].program_time_cap_seconds ?? 0) / 60)} דק׳`
                    : "קלאסי"}
                </span>
                <h1 className="text-4xl font-black text-fg tracking-tight leading-tight mb-2">{isDiyMode ? diyProgramName : selectedCategory}</h1>
                {detailEntry && (
                  <p className="text-muted text-sm font-medium">
                    {[
                      detailEntry.weeks.length > 1 ? `שבוע ${activePatientWeek}` : null,
                      detailItem ? plannedLabel(detailItem, detailEntry) : null,
                      detailEntry.isOneTime ? null : `השבוע ${detailEntry.doneThisWeek}/${detailEntry.weeklyTarget}`,
                    ]
                      .filter(Boolean)
                      .join(" · ")}
                  </p>
                )}
                {/* Done / done on another day / still open from an earlier day. */}
                {detailItem?.doneLog ? (
                  <p className="flex items-center gap-1.5 text-xs font-bold text-accent-fg mt-2">
                    <CheckCircle2 size={14} />
                    {detailItem.date && detailItem.doneOn !== detailItem.date ? `בוצע ביום ${dayNameOfKey(detailItem.doneOn!)}` : "בוצע"}
                  </p>
                ) : detailItem?.date && detailItem.date < detailTodayKey ? (
                  <p className="text-xs font-bold text-warm-fg mt-2">עוד לא בוצע — אפשר להשלים היום, או לסמן שביצעת ביום אחר</p>
                ) : null}
                {detailEntry?.editedByPatientAt && <p className="text-[0.6875rem] font-bold text-accent-fg mt-1.5">ערכת את התוכנית הזו בעצמך</p>}

                {/* The week's planned days for this program; any of them can
                    be opened, done or marked done. */}
                {detailEntry && detailEntry.planned.length > 1 && (
                  <div className="flex gap-2 mt-5 overflow-x-auto no-scrollbar -mx-4 px-4">
                    {detailEntry.planned.map((item) => {
                      const isActive = item.slotKey === detailItem?.slotKey && item.id === detailItem?.id;
                      return (
                        <button
                          key={item.id}
                          onClick={() => openProgram(detailEntry, item)}
                          aria-pressed={isActive}
                          className={`shrink-0 flex items-center gap-1.5 px-4 py-2.5 rounded-full text-xs font-extrabold border transition-ui duration-150 ease-out active:scale-[0.97] ${
                            isActive ? "bg-accent text-on-accent border-accent" : "bg-elevated text-muted border-line hover:border-accent/40"
                          }`}
                        >
                          {plannedLabel(item, detailEntry)}
                          {item.doneLog && <Check size={12} strokeWidth={3} />}
                        </button>
                      );
                    })}
                  </div>
                )}
              </div>

              {/* Metadata rows — no dividers, tight rhythm; primary icon at
                  the trailing (right) edge in RTL, info glyph at the far
                  leading (left) edge, matching the reference's list-row
                  pattern instead of the old bordered rows. */}
              <div className={`space-y-3.5 mb-10 text-muted text-sm ${pushIn}`}>
                <div className="flex items-center gap-4">
                  <EquipmentIcon id={equipIconId} size={20} className="text-accent-fg shrink-0" />
                  <div className="flex-1 flex justify-between items-center">
                    <span>{equipmentLabels}</span>
                  </div>
                </div>
                <div className="flex items-center gap-4">
                  <Timer size={20} className="text-accent-fg shrink-0" />
                  <div className="flex-1 flex justify-between items-center">
                    <span>~{estimatedTime} דק׳</span>
                  </div>
                </div>
                <div className="flex items-center gap-4">
                  <User size={20} className="text-accent-fg shrink-0" />
                  <div className="flex-1 flex justify-between items-center">
                    <span className="leading-relaxed pr-4">{muscleLabels || "גוף מלא"}</span>
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
              <div className={`space-y-4 pb-44 ${pushIn}`}>
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
                              {/* Disclosure chevron points to the inline end — left in RTL (it was rotated to point right, the "back" direction). */}
                              <ChevronLeft size={16} className="text-muted group-hover:text-fg transition-colors mt-1 shrink-0" />
                            </div>
                            <div className="flex gap-1.5 mt-2">
                              {stats.map((st) => (
                                <div key={st.label} className="on-light flex-1 bg-surface-alt rounded-lg py-1.5 text-center">
                                  <div className="text-fg font-black text-base leading-none tabular-nums">{st.value}</div>
                                  <div className="text-muted text-[0.6875rem] font-bold mt-1">{st.label}</div>
                                </div>
                              ))}
                              {/* Which muscles it works, at a glance (the full map is in the info sheet). */}
                              <MuscleThumb
                                exercise={assignment.exercise}
                                label={`שרירים: ${exerciseMuscles(assignment.exercise).prime.map((m) => AVAILABLE_MUSCLES.find((am) => am.id === m)?.label ?? m).join(", ")}`}
                                className="on-light w-12 shrink-0 self-center rounded-lg bg-surface-alt"
                              />
                            </div>
                            {(assignment.rir != null || weight) && (
                              <div className="flex gap-1.5 mt-2 text-[0.6875rem] font-bold">
                                {assignment.rir != null && <span className="on-light bg-surface-alt text-muted px-1.5 py-0.5 rounded">RIR {assignment.rir}</span>}
                                {weight && <span className="bg-accent/15 text-accent-fg px-1.5 py-0.5 rounded">{weight}</span>}
                              </div>
                            )}
                            <ExerciseNotes therapistNote={assignment.notes} patientNote={assignment.patient_notes} className="mt-2" />
                          </div>
                        </div>
                        {isSuperset && !isAmrap && idx < block.length - 1 && (
                          <div className="flex items-center justify-center gap-1.5 text-[0.6875rem] font-bold text-muted pt-2">
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
                    {t("התחל אימון")}
                  </button>
                  {/* For a patient who trained without running the player —
                      log reps (and optional weights) straight to tracking. */}
                  <button
                    onClick={() => setIsQuickLogOpen(true)}
                    className="w-full flex items-center justify-center gap-2 text-fg font-bold text-sm py-2 rounded-full hover:bg-line active:scale-[0.98] transition-ui duration-150 ease-out"
                  >
                    <ClipboardCheck size={16} /> {detailItem?.doneLog ? t("תעד שוב") : t("כבר ביצעתי — סמן כבוצע")}
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
                  queueLogRef={queueLogRef}
                />
              )}
            </>
          );
        })()}
    </div>
  );
}
