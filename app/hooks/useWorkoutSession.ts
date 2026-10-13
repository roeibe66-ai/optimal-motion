"use client";

import { useEffect, useRef, useState, type TouchEvent } from "react";
import { supabase } from "@/app/lib/supabase";
import { useAuth } from "@/app/context/AuthContext";
import type { HapticType } from "@/app/hooks/useHaptics";
import { getExerciseName, parseWeightInput } from "@/app/utils/format";
import { getLastUsedWeights, parsePerformance } from "@/app/utils/history";
import type { DiyExercise, Exercise, PatientExercise, QueueLogRef, SessionPerformanceEntry, WorkoutFormat, WorkoutLog } from "@/app/types";
import { confirmAction, notify } from "@/app/components/ui/feedback";
import { getDiyPrescription } from "@/app/utils/diy";
import { inferSwapSetting, type SwapSetting } from "@/app/utils/exerciseSwap";

// A PatientExercise as it's actually consumed here: already joined with its
// Exercise (that join happens in usePatientData, which filters out any
// assignment whose exercise failed to resolve before this hook ever sees it).
// program_name is joined client-side from patient_programs (see
// usePatientData). Optional because the offline plan cache can predate it.
export type HydratedPatientExercise = PatientExercise & {
  exercise: Exercise;
  program_name?: string;
  program_format?: WorkoutFormat; // "amrap" = run in the AMRAP player
  program_time_cap_seconds?: number | null;
};

// Title for rows the patient saved themselves from the DIY builder — those
// have no admin program (program_id is null).
export const SELF_BUILT_PROGRAM_NAME = "האימונים שלי";

// The patient's plan is grouped by the named program the admin assigned
// (not by exercise category): the program name is the workout's title.
export const programNameOf = (pe: HydratedPatientExercise) => pe.program_name ?? SELF_BUILT_PROGRAM_NAME;

// patient_exercises.week null = "every week" (a workout the patient pinned
// to a weekday from Explore recurs in each week of their plan).
export const isInWeek = (pe: { week: number | null }, week: number) => pe.week == null || pe.week === week;

// Local YYYY-MM-DD for a Date (matches patient_exercises.scheduled_date).
export const toDateKey = (d: Date) =>
  `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;

// Whether a row belongs to the plan week being viewed. Rows with a one-time
// scheduled_date count only for the calendar week (Sun–Sat) that contains
// `referenceDate` (today, or the date picked in the calendar); their
// scheduled_days is that date's weekday, so the day filter does the rest.
export const isInPlanWeek = (pe: { week: number | null; scheduled_date?: string | null }, week: number, referenceDate: Date) => {
  if (!pe.scheduled_date) return isInWeek(pe, week);
  const sunday = new Date(referenceDate.getFullYear(), referenceDate.getMonth(), referenceDate.getDate() - referenceDate.getDay());
  const saturday = new Date(sunday.getFullYear(), sunday.getMonth(), sunday.getDate() + 6);
  return pe.scheduled_date >= toDateKey(sunday) && pe.scheduled_date <= toDateKey(saturday);
};

// The plan's real weeks (ignoring every-week rows); at least [1].
export const planWeeksOf = (rows: { week: number | null }[]) => {
  const weeks = Array.from(new Set(rows.map((r) => r.week).filter((w): w is number => w != null))).sort((a, b) => a - b);
  return weeks.length > 0 ? weeks : [1];
};

// One entry in the active session's block grid. Plan-based sets are
// HydratedPatientExercise as-is; a DIY session synthesizes objects with this
// same shape (see buildDiyBlocks below) so both can share one code path.
export interface SessionExercise {
  id: string;
  exercise: Exercise;
  sets: number;
  reps: number;
  reps_max?: number | null; // upper bound of a rep range (reps is the lower bound)
  rir: number | null;
  is_time: boolean;
  block: string;
  rest_time_seconds: number;
  weight_kg?: number | null; // optional prescribed weight, shown only when set
  notes?: string | null; // the therapist's note (plan rows only)
  patient_notes?: string | null; // the patient's own note
}

// The pre-workout pain check-in (clinical patients only) and the
// post-workout feedback both drive off this single field, one screen at a
// time, exactly like the original — never simultaneously, so reusing one
// piece of state doesn't create ambiguity in practice.
export type FeedbackPhase = "pain_heatmap" | "pain_scale" | "rpe" | "pain_after" | "done";

export interface ExerciseHistoryPoint {
  date: string;
  reps: number;
  rir: number | null; // null if this log predates RIR capture (Tier 0.5) — chart leaves a gap rather than plotting 0
  weight: number | null; // heaviest weight reported that session; null = none logged (gap, not 0)
}

interface UseWorkoutSessionParams {
  patientExercises: HydratedPatientExercise[];
  exerciseCatalog: Exercise[]; // full library, used to find swap alternatives
  workoutLogs: WorkoutLog[];
  activePatientWeek: number;
  selectedCategory: string | null;
  selectedDayFilter: string;
  isDiyMode: boolean;
  diySelectedExercises: DiyExercise[];
  // A ready-made workout from Explore, run through the DIY path but with the
  // admin's own blocks/sets/reps instead of the DIY builder's 3x10 default.
  // Never offered for promotion into the weekly plan, and logged under its title.
  adHocSession?: { title: string; exercises: SessionExercise[] } | null;
  // Which calendar week one-time (scheduled_date) rows are matched against —
  // today by default, or the date picked in the Calendar tab.
  referenceDate?: Date;
  diyScheduleDay: string;
  onExitDiyMode: () => void; // owned by the future useDiyBuilder hook
  triggerHaptic: (type: HapticType) => void;
  onWorkoutLogged: () => void; // refetch patient data/logs after a successful log write
  // Admin Program Library's Run/Test simulator: drives the exact same
  // session/UI a real patient gets, but the synthetic patient (id -1) has no
  // real row to attach writes to. When true, submitFinalFeedback skips both
  // Supabase inserts and fakes success, so testing a program never creates
  // real workout_logs/patient_exercises rows.
  isSimulation?: boolean;
}

export function useWorkoutSession({
  patientExercises,
  exerciseCatalog,
  workoutLogs,
  activePatientWeek,
  selectedCategory,
  selectedDayFilter,
  isDiyMode,
  diySelectedExercises,
  adHocSession = null,
  referenceDate,
  diyScheduleDay,
  onExitDiyMode,
  triggerHaptic,
  onWorkoutLogged,
  isSimulation = false,
}: UseWorkoutSessionParams) {
  const { loggedInPatient, lang } = useAuth();

  const [isWorkoutMode, setIsWorkoutMode] = useState(false);
  const [showPreWorkout, setShowPreWorkout] = useState(false);
  const [workoutFinished, setWorkoutFinished] = useState(false);
  const [feedbackPhase, setFeedbackPhase] = useState<FeedbackPhase>("rpe");

  const [swappedExercises, setSwappedExercises] = useState<Record<string, Exercise>>({});
  // The patient's own gym/home/gear choice in the swap sheet, kept until the
  // workout ends; null = inferred from the workout's exercises (swapSetting below).
  const [swapSettingOverride, setSwapSettingOverride] = useState<SwapSetting | null>(null);
  const [viewingExInfo, setViewingExInfo] = useState<Exercise | null>(null);

  const [activeBlockIdx, setActiveBlockIdx] = useState(0);
  const [activeExInBlockIdx, setActiveExInBlockIdx] = useState(0);
  const [currentBlockSet, setCurrentBlockSet] = useState(1);
  const [isResting, setIsResting] = useState(false);
  // A lightweight variant of isResting for mid-superset exercise transitions:
  // no rest timer (there isn't one yet), just the actual-value + RIR capture
  // for the exercise just finished before advancing to the next one in the
  // same block round. See handleFinishAction/handleContinueSuperset.
  const [isSupersetCheck, setIsSupersetCheck] = useState(false);
  const [restTimer, setRestTimer] = useState(60);
  // Tracks the starting duration alongside restTimer, purely so the rest
  // screen's progress ring can show real elapsed-vs-total rather than a
  // static decoration. Doesn't affect the countdown logic itself.
  const [restTimerTotal, setRestTimerTotal] = useState(60);
  const [exTimer, setExTimer] = useState<number | null>(null);
  const [isExTimerRunning, setIsExTimerRunning] = useState(false);
  // Wall-clock deadlines (Date.now() ms) behind restTimer/exTimer. The
  // countdowns used to subtract 1 per setInterval tick, and iOS suspends
  // timers while the PWA is in the background — so switching apps mid-rest
  // froze the clock. Now each tick (and returning to the app) recomputes the
  // remaining seconds from the deadline, so time keeps passing while away.
  const restEndsAt = useRef<number | null>(null);
  const exEndsAt = useRef<number | null>(null);

  // Swipe-to-finish tracking lives in refs, not state: a touchmove fires
  // ~60x/s and setState there re-rendered the whole player on every frame.
  const swipeStart = useRef<{ x: number; y: number; t: number } | null>(null);
  const swipeLast = useRef<{ x: number; y: number } | null>(null);

  const [actualRepsLogged, setActualRepsLogged] = useState("");
  const [sessionPerformance, setSessionPerformance] = useState<SessionPerformanceEntry[]>([]);
  const [painBefore, setPainBefore] = useState<number | null>(null);
  const [rpeScore, setRpeScore] = useState<number | null>(null);
  // "Back" during a workout: a snapshot of the active slot taken every time
  // a set is marked done, so an accidental "next" can be undone — goBack()
  // returns to that set's own screen and drops what it logged.
  const [setHistory, setSetHistory] = useState<
    { blockIdx: number; exInBlockIdx: number; blockSet: number; performanceLength: number }[]
  >([]);
  const [selectedPainAreas, setSelectedPainAreas] = useState<string[]>([]);

  // Reps/RIR are now reported on the rest screen, after the set, rather than
  // typed live during the set. pendingSetRir is the RIR selection for the set
  // just finished. repAdjustments is a session-local, per-assignment override
  // for "make easier/harder" — there's no difficulty/progression data on
  // exercises in the schema (checked the live table directly), so this
  // adjusts the current set's own target numbers rather than swapping to a
  // different exercise; it never touches the underlying patient_exercises row.
  const [pendingSetRir, setPendingSetRir] = useState<number | null>(null);
  const [repAdjustments, setRepAdjustments] = useState<Record<string, { reps: number; rir: number | null }>>({});
  // Optional weight used, as typed on the rest screen ("" = not reported).
  // Seeded per slot from the last weight reported for that same assignment,
  // else the prescribed weight_kg, else empty — so a patient who never types
  // a weight logs none, and one who does doesn't retype it every set.
  const [pendingSetWeight, setPendingSetWeight] = useState("");
  const [lastWeightByAssign, setLastWeightByAssign] = useState<Record<string, string>>({});

  // Admin Run/Test feedback: a brief confirmation whenever a write would
  // normally happen but got skipped because isSimulation is true — so the
  // admin sees the same "it worked" feedback a real patient would, without a
  // real workout_logs/patient_exercises row ever being created. See
  // handleFinishAction and submitFinalFeedback's isSimulation branch below.
  const [simulationToast, setSimulationToast] = useState<string | null>(null);

  // --- Derived session data (recomputed each render, same as the original) ---

  const weekFilteredPatientExercises = patientExercises.filter((pe) => isInPlanWeek(pe, activePatientWeek, referenceDate ?? new Date()));

  // The program picker on the Plan tab's overview screen — every distinct
  // assigned program in the currently-selected week (regardless of the
  // day/program filters below, which only narrow the active workout).
  // Named `patientCategories`/`selectedCategory` for history: these hold
  // program names now, not exercise categories.
  const patientCategories = Array.from(new Set(weekFilteredPatientExercises.map(programNameOf)));

  const displayedExercises = weekFilteredPatientExercises.filter((pe) => {
    if (!isDiyMode && (!selectedCategory || programNameOf(pe) !== selectedCategory)) return false;
    if (selectedDayFilter === "all") return true;
    if (!pe.scheduled_days || pe.scheduled_days.trim() === "") return true;
    return pe.scheduled_days.split(",").includes(selectedDayFilter);
  });

  // The planned workout on screen (selectedDayFilter = its planned day),
  // recorded with its log so doing it on another day still completes that
  // day (app/utils/programQueue.ts).
  const queueLogRef: QueueLogRef | null =
    !isDiyMode && displayedExercises[0]?.program_id
      ? {
          program_id: displayedExercises[0].program_id,
          program_week: displayedExercises.some((pe) => pe.week != null) ? activePatientWeek : null,
          session_key: selectedDayFilter,
        }
      : null;

  const blocksMap: Record<string, SessionExercise[]> = {};

  if (isDiyMode && adHocSession) {
    adHocSession.exercises.forEach((se) => {
      const b = se.block || "A";
      if (!blocksMap[b]) blocksMap[b] = [];
      blocksMap[b].push(se);
    });
  } else if (isDiyMode) {
    diySelectedExercises.forEach((ex, idx) => {
      const blockLetter = String.fromCharCode(65 + idx);
      const { sets, reps, is_time, rest_time_seconds, notes } = getDiyPrescription(ex);
      blocksMap[blockLetter] = [{ id: `diy_${idx}`, exercise: ex, sets, reps, rir: null, is_time, block: blockLetter, rest_time_seconds, patient_notes: notes }];
    });
  } else {
    displayedExercises.forEach((pe) => {
      const b = pe.block || "A";
      if (!blocksMap[b]) blocksMap[b] = [];
      blocksMap[b].push(pe);
    });
  }

  const blocksKeys = Object.keys(blocksMap).sort();
  const activeBlockKey = blocksKeys[activeBlockIdx];
  const activeBlockExercises = activeBlockKey ? blocksMap[activeBlockKey] : [];
  const activeAssign = activeBlockExercises[activeExInBlockIdx] as SessionExercise | undefined;
  const maxSetsInBlock = activeBlockExercises.length > 0 ? Math.max(...activeBlockExercises.map((e) => e.sets)) : 1;

  const swapSetting = swapSettingOverride ?? inferSwapSetting(blocksKeys.flatMap((k) => blocksMap[k].map((se) => se.exercise)));

  // The exercise actually shown/played — a swap replaces it for this slot only.
  const displayedExercise = activeAssign ? swappedExercises[activeAssign.id] || activeAssign.exercise : undefined;

  // The "make easier/harder" target for this slot — falls back to the
  // assignment's own prescribed reps/RIR until adjusted.
  const activeAdjustment = activeAssign ? repAdjustments[activeAssign.id] : undefined;
  const effectiveTargetReps = activeAdjustment?.reps ?? activeAssign?.reps;
  const effectiveTargetRir = activeAdjustment ? activeAdjustment.rir : (activeAssign?.rir ?? null);

  // Single "what's coming up" look-ahead, used for both the background video
  // and the "Up Next" card so they can never disagree. When the next step is
  // just another set of the *same* exercise, callers should show a plain
  // dark background alongside the "prepare for set N" card, rather than
  // re-showing the current exercise's own video.
  const nextSlot: SessionExercise | undefined =
    activeExInBlockIdx < activeBlockExercises.length - 1
      ? activeBlockExercises[activeExInBlockIdx + 1]
      : currentBlockSet < maxSetsInBlock
        ? activeBlockExercises[0]
        : activeBlockIdx < blocksKeys.length - 1
          ? blocksMap[blocksKeys[activeBlockIdx + 1]][0]
          : undefined;
  // A slot the patient swapped shows its replacement here too.
  const nextExercise: SessionExercise | undefined = nextSlot && swappedExercises[nextSlot.id] ? { ...nextSlot, exercise: swappedExercises[nextSlot.id] } : nextSlot;

  // Per-exercise progress for the info sheet's Charts tab: one point per
  // session that logged this exercise — best set's reps (and the RIR reported
  // on that same set), plus the heaviest weight used, if any. Every patient
  // type, oldest first.
  let exHistoryData: ExerciseHistoryPoint[] = [];
  if (viewingExInfo && loggedInPatient) {
    exHistoryData = workoutLogs
      .filter((log) => log.patient_id === loggedInPatient.id)
      .map((log) => {
        const sets = parsePerformance(log).filter((p) => p.exercise_id === viewingExInfo.id);
        if (sets.length === 0) return null;
        const bestSet = sets.reduce((best, s) => ((s.reps || 0) > (best.reps || 0) ? s : best));
        const maxWeight = Math.max(0, ...sets.map((s) => Number(s.weight_kg) || 0));
        return {
          createdAt: log.created_at,
          point: {
            date: new Date(log.created_at).toLocaleDateString("he-IL", { day: "2-digit", month: "2-digit" }),
            reps: bestSet.reps || 0,
            rir: bestSet.rir ?? null,
            weight: maxWeight > 0 ? maxWeight : null,
          },
        };
      })
      .filter((x): x is { createdAt: string; point: ExerciseHistoryPoint } => x !== null)
      .sort((a, b) => a.createdAt.localeCompare(b.createdAt))
      .map((x) => x.point);
  }

  // What the patient lifted for each exercise last time (from past logs),
  // shown during the set and used to prefill the rest screen's weight field.
  const lastUsedWeights = getLastUsedWeights(workoutLogs);
  const previousWeight = displayedExercise ? (lastUsedWeights[displayedExercise.id] ?? null) : null;

  // --- Actions used by effects below, declared first so nothing forward-references them ---

  const handleFinishAction = () => {
    triggerHaptic("light");
    setSetHistory((prev) => [
      ...prev,
      { blockIdx: activeBlockIdx, exInBlockIdx: activeExInBlockIdx, blockSet: currentBlockSet, performanceLength: sessionPerformance.length },
    ]);

    if (activeAssign) {
      setSessionPerformance((prev) => [
        ...prev,
        {
          // The exercise actually performed — the swap, if the patient made one.
          exercise_id: (displayedExercise ?? activeAssign.exercise).id,
          set_number: currentBlockSet,
          reps: actualRepsLogged ? parseInt(actualRepsLogged) : Number(effectiveTargetReps ?? activeAssign.reps) || 0,
          rir: activeAssign.is_time ? undefined : (pendingSetRir ?? undefined),
          weight_kg: parseWeightInput(pendingSetWeight) ?? undefined,
        },
      ]);
      if (isSimulation) setSimulationToast("סימולציה: הסט נרשם בהצלחה");
    }

    // actualRepsLogged/pendingSetRir are deliberately NOT cleared here — the
    // rest/superset-check screen (or, for the workout's final set, nothing)
    // shows/edits these values for the set just finished. The reset effect
    // below is what reseeds them, and only fires once the active slot
    // actually advances (handleEndRest / handleContinueSuperset).

    if (activeExInBlockIdx < activeBlockExercises.length - 1) {
      // Don't advance yet — show the actual-value + RIR capture for the
      // exercise just finished first (activeAssign still refers to it until
      // handleContinueSuperset runs), same as the real rest screen does at
      // the end of a full round.
      setIsSupersetCheck(true);
    } else if (currentBlockSet < maxSetsInBlock || activeBlockIdx < blocksKeys.length - 1) {
      // The rest duration is the finishing exercise's own configured
      // restTimeSeconds (builder-adjustable, defaults to 60) — used both
      // between sets of the same exercise and between blocks, rather than
      // the previous hardcoded 60/90 split.
      const rest = activeAssign?.rest_time_seconds ?? 60;
      setIsResting(true); // the countdown effect sets restEndsAt from this
      setRestTimer(rest);
      setRestTimerTotal(rest);
    } else {
      triggerHaptic("success");
      setWorkoutFinished(true);
    }
  };

  const handleEndRest = () => {
    triggerHaptic("light");
    restEndsAt.current = null;
    setIsResting(false);
    if (currentBlockSet < maxSetsInBlock) {
      setCurrentBlockSet((prev) => prev + 1);
      setActiveExInBlockIdx(0);
    } else if (activeBlockIdx < blocksKeys.length - 1) {
      setActiveBlockIdx((prev) => prev + 1);
      setCurrentBlockSet(1);
      setActiveExInBlockIdx(0);
    }
  };

  // Ends the lightweight mid-superset check and moves to the next exercise
  // in the same block/round (unlike handleEndRest, never touches
  // currentBlockSet/activeBlockIdx — there's no round boundary here).
  const handleContinueSuperset = () => {
    triggerHaptic("light");
    setIsSupersetCheck(false);
    setActiveExInBlockIdx((prev) => prev + 1);
  };

  // Undo the most recent "set done": back to that set's active screen (from
  // the rest/superset-check screen, or from the next set it advanced to),
  // with the performance entry it logged removed.
  const goBack = () => {
    const last = setHistory[setHistory.length - 1];
    if (!last) return;
    triggerHaptic("light");
    setSetHistory((prev) => prev.slice(0, -1));
    setActiveBlockIdx(last.blockIdx);
    setActiveExInBlockIdx(last.exInBlockIdx);
    setCurrentBlockSet(last.blockSet);
    restEndsAt.current = null;
    exEndsAt.current = null;
    setIsResting(false);
    setIsSupersetCheck(false);
    setWorkoutFinished(false);
    setSessionPerformance((prev) => prev.slice(0, last.performanceLength));
  };

  // --- Effects ---

  // Reset the per-set inputs whenever the active slot changes: prefill
  // "actual reps" and the pending RIR with the (possibly adjusted) target,
  // and clear the exercise timer so each new timed set starts fresh (seeded
  // on play, see toggleExerciseTimer) instead of inheriting the previous
  // set's finished countdown.
  //
  // Depends on activeAssign?.id, not activeAssign itself: usePatientData
  // used to refetch patientExercises (creating new object references)
  // whenever loggedInPatient's object identity changed, which happened on
  // every token refresh — including the one supabase-js fires automatically
  // when a background tab regains focus. That made activeAssign a "new"
  // value on every tab switch even though the active exercise/set hadn't
  // actually changed, spuriously firing this effect and wiping the
  // in-progress exercise timer. Fixed at the source in usePatientData, but
  // keying on the id here too is cheap insurance against the same object-
  // identity-churn class of bug recurring some other way.
  useEffect(() => {
    if (isWorkoutMode && activeAssign) {
      // eslint-disable-next-line react-hooks/set-state-in-effect -- resetting editable/per-set fields' defaults when their subject (the active set) changes, not deriving external state
      setActualRepsLogged((effectiveTargetReps ?? activeAssign.reps).toString());
      setPendingSetRir(effectiveTargetRir);
      const prescribedWeight = Number(activeAssign.weight_kg);
      setPendingSetWeight(
        lastWeightByAssign[activeAssign.id] ?? (previousWeight !== null ? String(previousWeight) : prescribedWeight > 0 ? String(prescribedWeight) : "")
      );
      exEndsAt.current = null;
      setExTimer(null);
      setIsExTimerRunning(false);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isWorkoutMode, activeAssign?.id, activeExInBlockIdx, activeBlockIdx, currentBlockSet]);

  // Lock-screen media controls during a workout.
  useEffect(() => {
    if (isWorkoutMode && "mediaSession" in navigator && displayedExercise) {
      // Object.assign rather than `navigator.mediaSession.metadata = ...`: the
      // React Compiler lint rejects assigning to a global's property directly.
      Object.assign(navigator.mediaSession, { metadata: new MediaMetadata({
        title: getExerciseName(displayedExercise, lang),
        artist: `סט ${currentBlockSet} מתוך ${maxSetsInBlock}`,
        album: "Eccentric",
        artwork: [{ src: "/icon.png", sizes: "512x512", type: "image/png" }],
      }) });

      navigator.mediaSession.setActionHandler("nexttrack", () => {
        if (!isResting) handleFinishAction();
        else handleEndRest();
      });
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isWorkoutMode, displayedExercise, currentBlockSet, maxSetsInBlock, isResting]);

  // Seconds left until a deadline, rounded up (so "0" shows only once it's over).
  const secondsUntil = (endsAt: number) => Math.max(0, Math.ceil((endsAt - Date.now()) / 1000));

  // Coming back to the app: snap both countdowns to the real remaining time
  // right away instead of waiting for the next tick.
  useEffect(() => {
    if (!isWorkoutMode) return;
    const resync = () => {
      if (document.visibilityState !== "visible") return;
      if (restEndsAt.current !== null) setRestTimer(secondsUntil(restEndsAt.current));
      if (exEndsAt.current !== null) setExTimer(secondsUntil(exEndsAt.current));
    };
    document.addEventListener("visibilitychange", resync);
    window.addEventListener("pageshow", resync);
    return () => {
      document.removeEventListener("visibilitychange", resync);
      window.removeEventListener("pageshow", resync);
    };
  }, [isWorkoutMode]);

  // Rest-between-sets countdown.
  useEffect(() => {
    let interval: ReturnType<typeof setInterval> | undefined;
    if (isResting && restTimer > 0) {
      // A new rest (every exit clears the deadline) starts its clock here.
      if (restEndsAt.current === null) restEndsAt.current = Date.now() + restTimer * 1000;
      interval = setInterval(() => restEndsAt.current !== null && setRestTimer(secondsUntil(restEndsAt.current)), 1000);
    }
    // eslint-disable-next-line react-hooks/set-state-in-effect -- reacting to the countdown's own terminal value, not syncing external state
    else if (isResting && restTimer <= 0) handleEndRest();
    return () => clearInterval(interval);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isResting, restTimer]);

  // Timed-exercise countdown.
  //
  // NOTE (preserved from the original, not a change introduced here): `exTimer`
  // is never seeded with a starting value anywhere — it's only ever
  // decremented here, guarded by `exTimer !== null`. Since it starts `null`
  // and nothing sets it to a number, this effect never actually counts down
  // for `is_time` exercises. Flagged to the team; left exactly as-is pending
  // a decision on whether/how to fix it.
  useEffect(() => {
    let interval: ReturnType<typeof setInterval> | undefined;
    if (isExTimerRunning && exTimer !== null && exTimer > 0) {
      if (exEndsAt.current === null) exEndsAt.current = Date.now() + exTimer * 1000;
      interval = setInterval(() => exEndsAt.current !== null && setExTimer(secondsUntil(exEndsAt.current)), 1000);
    } else if (exTimer === 0) {
      exEndsAt.current = null;
      triggerHaptic("success");
      // eslint-disable-next-line react-hooks/set-state-in-effect -- reacting to the countdown's own terminal value, not syncing external state
      setIsExTimerRunning(false);
    }
    return () => clearInterval(interval);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isExTimerRunning, exTimer]);

  // --- Swipe gestures ---

  // Swipe navigation — "forward" is rightward in Hebrew (RTL), leftward in
  // English:
  //   active set      → finish the set (to the rest / mid-superset screen)
  //   rest            → end the rest
  //   superset check  → on to the next exercise in the round
  // "Back" (the other way) undoes the last set, when there is one.
  // It used to fire on any 50px horizontal drift (wiping sweat, adjusting the
  // phone, a diagonal scroll) and log a set the patient hadn't done, so it
  // needs a clearly horizontal gesture that's either a deliberate drag or a
  // quick flick. A second finger cancels it.
  //
  // While dragging, the stage (the player's main content, attached through
  // attachSwipeStage) follows the finger. The transform is set directly on
  // the element, not through state, so a drag doesn't re-render the player
  // on every touchmove. A direction with nowhere to go only gives a little
  // (rubber band). A setter function rather than the ref object itself is
  // returned: a ref inside the returned object makes the React compiler
  // treat all of `session` as a ref.
  const swipeStage = useRef<HTMLDivElement | null>(null);
  const attachSwipeStage = (el: HTMLDivElement | null) => {
    swipeStage.current = el;
  };
  const setStageOffset = (px: number, animate: boolean) => {
    const el = swipeStage.current;
    if (!el) return;
    el.style.transition = animate ? "transform 220ms cubic-bezier(0.32, 0.72, 0, 1)" : "none";
    el.style.transform = px === 0 ? "" : `translateX(${px}px)`;
  };
  const forwardSign = lang === "he" ? 1 : -1;

  const onTouchStart = (e: TouchEvent) => {
    swipeLast.current = null;
    // Sheets over the player (exercise info, swap) render through a portal
    // but their touch events still bubble here through the React tree —
    // a swipe inside them must not finish a set.
    if (e.touches.length > 1 || !(e.currentTarget as Node).contains(e.target as Node)) {
      swipeStart.current = null;
      return;
    }
    swipeStart.current = { x: e.touches[0].clientX, y: e.touches[0].clientY, t: e.timeStamp };
  };
  const onTouchMove = (e: TouchEvent) => {
    if (!swipeStart.current) return;
    if (e.touches.length > 1) {
      swipeStart.current = null;
      setStageOffset(0, true);
      return;
    }
    swipeLast.current = { x: e.touches[0].clientX, y: e.touches[0].clientY };
    const dx = swipeLast.current.x - swipeStart.current.x;
    const dy = swipeLast.current.y - swipeStart.current.y;
    if (Math.abs(dx) < Math.abs(dy) * 2) return setStageOffset(0, false);
    const canGo = dx * forwardSign > 0 || setHistory.length > 0;
    setStageOffset(canGo ? dx * 0.6 : dx * 0.15, false);
  };
  const onTouchEnd = (e: TouchEvent) => {
    const start = swipeStart.current;
    const last = swipeLast.current;
    swipeStart.current = null;
    swipeLast.current = null;
    setStageOffset(0, true);
    if (!start || !last) return;

    const dx = last.x - start.x;
    const dy = last.y - start.y;
    const distance = Math.abs(dx);
    if (distance < Math.abs(dy) * 2) return; // not clearly horizontal

    const velocity = distance / Math.max(1, e.timeStamp - start.t); // px/ms
    const isDeliberateDrag = distance >= 80;
    const isFlick = distance >= 40 && velocity > 0.5;
    if (!isDeliberateDrag && !isFlick) return;

    if (dx * forwardSign > 0) {
      if (isSupersetCheck) handleContinueSuperset();
      else if (isResting) handleEndRest();
      else handleFinishAction();
    } else if (setHistory.length > 0) {
      goBack();
    }
  };

  // --- Remaining actions ---

  const handleStartClick = () => {
    triggerHaptic("heavy");
    setSetHistory([]);
    if (loggedInPatient?.patient_type === "fitness") {
      setIsWorkoutMode(true);
      setActiveBlockIdx(0);
      setActiveExInBlockIdx(0);
      setCurrentBlockSet(1);
      setIsResting(false);
      setIsSupersetCheck(false);
      setWorkoutFinished(false);
      setFeedbackPhase("rpe");
      setActualRepsLogged("");
      setSessionPerformance([]);
    } else {
      setShowPreWorkout(true);
      setFeedbackPhase("pain_heatmap");
    }
  };

  const confirmPainAreas = () => setFeedbackPhase("pain_scale");

  // The DIY builder's "start now" button, kept distinct from handleStartClick:
  // the original reset only these five fields for a DIY start (no haptic, and
  // notably no feedbackPhase/actualRepsLogged/sessionPerformance reset) —
  // preserved exactly rather than unified, since DIY building is fitness-only
  // and never goes through the pre-workout pain-check branch anyway.
  const startDiyWorkoutNow = () => {
    setSetHistory([]);
    setIsWorkoutMode(true);
    setActiveBlockIdx(0);
    setActiveExInBlockIdx(0);
    setCurrentBlockSet(1);
    setIsResting(false);
    setIsSupersetCheck(false);
    setWorkoutFinished(false);
  };

  const confirmPreWorkout = (pain: number) => {
    setSetHistory([]);
    setPainBefore(pain);
    setShowPreWorkout(false);
    setIsWorkoutMode(true);
    setActiveBlockIdx(0);
    setActiveExInBlockIdx(0);
    setCurrentBlockSet(1);
    setIsResting(false);
    setIsSupersetCheck(false);
    setWorkoutFinished(false);
    setFeedbackPhase("rpe");
    setActualRepsLogged("");
    setSessionPerformance([]);
  };

  const addRestTime = () => {
    triggerHaptic("light");
    if (restEndsAt.current !== null) restEndsAt.current += 15_000;
    setRestTimer((prev) => prev + 15);
    setRestTimerTotal((prev) => prev + 15);
  };

  const toggleExerciseTimer = () => {
    triggerHaptic("light");
    // Seed the countdown from the effective (possibly make-harder/easier
    // adjusted) duration the first time it's started for this set — not the
    // raw prescribed activeAssign.reps, which would silently ignore an
    // adjustment made before the timer was ever started and disagree with
    // the live HUD pill, which already shows effectiveTargetReps. A pause/
    // resume leaves the in-progress value alone.
    if (!isExTimerRunning && exTimer === null && activeAssign) {
      setExTimer(Number(effectiveTargetReps ?? activeAssign.reps));
    }
    // Pausing freezes the remaining seconds (exTimer) and drops the deadline;
    // resuming sets a new one from there (in the countdown effect).
    if (isExTimerRunning && exEndsAt.current !== null) {
      setExTimer(secondsUntil(exEndsAt.current));
      exEndsAt.current = null;
    }
    setIsExTimerRunning((prev) => !prev);
  };

  // Ends the timed hold early (or before it was ever started), logging the
  // actual elapsed seconds — not the prescribed duration — as the
  // "actual value" the post-set screen reports, same source effectiveTarget
  // used to seed the countdown in toggleExerciseTimer above.
  const skipExerciseTimer = () => {
    triggerHaptic("light");
    if (activeAssign) {
      const prescribed = Number(effectiveTargetReps ?? activeAssign.reps);
      const elapsed = exTimer !== null ? Math.max(0, prescribed - exTimer) : 0;
      setActualRepsLogged(String(elapsed));
    }
    exEndsAt.current = null;
    setIsExTimerRunning(false);
    handleFinishAction();
  };

  // "Make easier/harder" — adjusts this set's own target reps/RIR rather than
  // swapping to a different exercise (see repAdjustments above for why).
  // Persists per assignment id, so it carries over to the remaining sets of
  // the same exercise, but never touches the underlying patient_exercises row.
  const makeHarder = () => {
    triggerHaptic("light");
    if (!activeAssign) return;
    // Number(...): activeAssign.reps comes from patient_exercises.reps,
    // which is a text column — the first "make it harder" tap on a given
    // exercise (before any adjustment exists) would otherwise string-
    // concatenate here (e.g. "10" + 2 === "102") instead of adding.
    const baseReps = Number(effectiveTargetReps ?? activeAssign.reps);
    const baseRir = effectiveTargetRir;
    setRepAdjustments((prev) => ({
      ...prev,
      [activeAssign.id]: { reps: baseReps + 2, rir: baseRir !== null ? Math.max(0, baseRir - 1) : null },
    }));
  };

  const makeEasier = () => {
    triggerHaptic("light");
    if (!activeAssign) return;
    // Number(...) here too, for consistency with makeHarder above — "-"
    // already numeric-coerces on its own, so this wasn't actually broken,
    // but normalizing both keeps them from silently diverging later.
    const baseReps = Number(effectiveTargetReps ?? activeAssign.reps);
    const baseRir = effectiveTargetRir;
    setRepAdjustments((prev) => ({
      ...prev,
      [activeAssign.id]: { reps: Math.max(1, baseReps - 2), rir: baseRir !== null ? baseRir + 1 : null },
    }));
  };

  // Rest-screen editing of the set just finished: both update the displayed
  // value and patch the sessionPerformance entry handleFinishAction already
  // pushed for it (there's no rest screen after the workout's very last set,
  // so that one entry keeps its provisional/target value — flagged, not
  // silently patched around).
  const updateLastPerformanceEntry = (patch: Partial<SessionPerformanceEntry>) => {
    setSessionPerformance((prev) => {
      if (prev.length === 0) return prev;
      const updated = [...prev];
      updated[updated.length - 1] = { ...updated[updated.length - 1], ...patch };
      return updated;
    });
  };

  const adjustRestReps = (delta: number) => {
    triggerHaptic("light");
    const current = parseInt(actualRepsLogged) || 0;
    const next = Math.max(0, current + delta);
    setActualRepsLogged(String(next));
    updateLastPerformanceEntry({ reps: next });
  };

  // Typed straight into the rest screen's reps/seconds field.
  const setRestReps = (value: number) => {
    const next = Math.max(0, Math.min(999, Math.round(value) || 0));
    setActualRepsLogged(String(next));
    updateLastPerformanceEntry({ reps: next });
  };

  const selectRestRir = (value: number) => {
    triggerHaptic("light");
    setPendingSetRir(value);
    updateLastPerformanceEntry({ rir: value });
  };

  const setRestWeight = (value: string) => {
    setPendingSetWeight(value);
    if (activeAssign) setLastWeightByAssign((prev) => ({ ...prev, [activeAssign.id]: value }));
    updateLastPerformanceEntry({ weight_kg: parseWeightInput(value) ?? undefined });
  };

  const submitFinalFeedback = async (postPain: number | null = null) => {
    if (!loggedInPatient) return;

    if (isSimulation) {
      // Admin Run/Test: skip both writes below entirely — the synthetic
      // patient (id -1) has no real row, and a real patient's data must
      // never be touched by an admin testing a program's flow/UI.
      triggerHaptic("success");
      setFeedbackPhase("done");
      setSelectedPainAreas([]);
      setSimulationToast("סימולציה: האימון הושלם (לא נשמר)");
      return;
    }

    if (isDiyMode && !adHocSession) {
      const keep = await confirmAction({
        title: "לשמור את האימון?",
        message: "האימון שבנית יישמר כחלק קבוע מהתוכנית השבועית שלך.",
        confirmLabel: "שמור בתוכנית",
        cancelLabel: "לא עכשיו",
      });
      if (keep) {
        const inserts = diySelectedExercises.map((ex, idx) => {
          // The patient's note goes to patient_notes — `notes` is the therapist's.
          const { notes, ...prescription } = getDiyPrescription(ex);
          return {
            patient_id: loggedInPatient.id,
            exercise_id: ex.id,
            block: String.fromCharCode(65 + idx),
            ...prescription,
            patient_notes: notes?.trim() || null,
            week: activePatientWeek,
            scheduled_days: diyScheduleDay,
          };
        });
        await supabase.from("patient_exercises").insert(inserts);
      }
    }

    const { error } = await supabase.from("workout_logs").insert([
      {
        patient_id: loggedInPatient.id,
        category: isDiyMode ? (adHocSession?.title ?? "אימון עצמאי") : selectedCategory,
        rpe: rpeScore,
        pain_before: loggedInPatient.patient_type === "fitness" ? null : painBefore,
        pain_after: loggedInPatient.patient_type === "fitness" ? null : postPain,
        pain_areas: selectedPainAreas.length > 0 ? selectedPainAreas.join(",") : null,
        performance_data: sessionPerformance.length > 0 ? JSON.stringify(sessionPerformance) : null,
        ...(queueLogRef ?? {}),
      },
    ]);

    if (error) {
      console.error(error);
      notify(`שגיאה: ${error.message}`, "error");
      return;
    }

    triggerHaptic("success");
    setFeedbackPhase("done");
    onWorkoutLogged();
    setSelectedPainAreas([]);
  };

  // The RPE screen both records the score and decides the next screen
  // (fitness patients skip the post-workout pain scale entirely).
  const handleRpeSelect = (num: number) => {
    setRpeScore(num);
    if (loggedInPatient?.patient_type === "fitness") submitFinalFeedback(null);
    else setFeedbackPhase("pain_after");
  };

  // Mid-workout swap (SwapExerciseSheet picks the replacement): replaces the
  // exercise for this slot's remaining sets only — never the patient_exercises
  // row. Passing the slot's own exercise undoes the swap. The weight field is
  // reseeded for the new exercise, since the old one's weight means nothing for it.
  const swapExercise = (pick: Exercise) => {
    if (!activeAssign) return;
    triggerHaptic("light");
    setSwappedExercises((prev) => {
      const next = { ...prev };
      if (pick.id === activeAssign.exercise.id) delete next[activeAssign.id];
      else next[activeAssign.id] = pick;
      return next;
    });
    setLastWeightByAssign((prev) => {
      const next = { ...prev };
      delete next[activeAssign.id];
      return next;
    });
    const last = lastUsedWeights[pick.id];
    setPendingSetWeight(last != null ? String(last) : "");
    exEndsAt.current = null;
    setExTimer(null);
    setIsExTimerRunning(false);
  };

  const closeWorkout = () => {
    restEndsAt.current = null;
    exEndsAt.current = null;
    setSetHistory([]);
    setIsWorkoutMode(false);
    setWorkoutFinished(false);
    setPainBefore(null);
    setRpeScore(null);
    setSwappedExercises({});
    setSwapSettingOverride(null);
    setRepAdjustments({});
    setPendingSetRir(null);
    setPendingSetWeight("");
    setLastWeightByAssign({});
    setViewingExInfo(null);
    setIsExTimerRunning(false);
    setSelectedPainAreas([]);
    setShowPreWorkout(false);
    onExitDiyMode();
  };

  return {
    // pre-workout
    showPreWorkout,
    feedbackPhase,
    selectedPainAreas,
    setSelectedPainAreas,
    confirmPainAreas,
    confirmPreWorkout,

    queueLogRef,

    // session entry/exit
    isWorkoutMode,
    handleStartClick,
    startDiyWorkoutNow,
    closeWorkout,

    // plan preview (used by PlanTab before a workout starts, and by the
    // active session once it does — both read the same grouping)
    patientCategories,
    weekFilteredPatientExercises,
    displayedExercises,
    blocksMap,
    blocksKeys,

    // active screen
    displayedExercise,
    activeBlockKey,
    currentBlockSet,
    maxSetsInBlock,
    activeAssign,
    effectiveTargetReps,
    effectiveTargetRir,
    previousWeight,
    nextExercise,
    isResting,
    isSupersetCheck,
    restTimer,
    restTimerTotal,
    addRestTime,
    exTimer,
    isExTimerRunning,
    toggleExerciseTimer,
    skipExerciseTimer,
    actualRepsLogged,
    setActualRepsLogged,
    pendingSetRir,
    pendingSetWeight,
    setRestWeight,
    adjustRestReps,
    setRestReps,
    selectRestRir,
    handleFinishAction,
    handleEndRest,
    handleContinueSuperset,
    goBack,
    canGoBack: setHistory.length > 0,
    swapExercise,
    exerciseCatalog,
    swapSetting,
    isSwapSettingInferred: swapSettingOverride === null,
    setSwapSetting: setSwapSettingOverride,
    // Every exercise id in this session (slots + swaps), so the swap sheet
    // doesn't suggest something the patient is already doing today.
    sessionExerciseIds: new Set([...blocksKeys.flatMap((k) => blocksMap[k].map((se) => se.exercise.id)), ...Object.values(swappedExercises).map((e) => e.id)]),
    makeHarder,
    makeEasier,
    attachSwipeStage,
    onTouchStart,
    onTouchMove,
    onTouchEnd,

    // finish flow
    workoutFinished,
    handleRpeSelect,
    submitFinalFeedback,

    // exercise info modal (shared with the Plan tab)
    viewingExInfo,
    setViewingExInfo,
    exHistoryData,

    // admin Run/Test simulation
    isSimulation,
    simulationToast,
    dismissSimulationToast: () => setSimulationToast(null),
  };
}
