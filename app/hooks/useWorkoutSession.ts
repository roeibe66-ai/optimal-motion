"use client";

import { useEffect, useState, type TouchEvent } from "react";
import { supabase } from "@/app/lib/supabase";
import { useAuth } from "@/app/context/AuthContext";
import type { HapticType } from "@/app/hooks/useHaptics";
import type { Exercise, PatientExercise, SessionPerformanceEntry, WorkoutLog } from "@/app/types";

// A PatientExercise as it's actually consumed here: already joined with its
// Exercise (that join happens in usePatientData, which filters out any
// assignment whose exercise failed to resolve before this hook ever sees it).
export type HydratedPatientExercise = PatientExercise & { exercise: Exercise };

// One entry in the active session's block grid. Plan-based sets are
// HydratedPatientExercise as-is; a DIY session synthesizes objects with this
// same shape (see buildDiyBlocks below) so both can share one code path.
export interface SessionExercise {
  id: string;
  exercise: Exercise;
  sets: number;
  reps: number;
  rir: number | null;
  is_time: boolean;
  block: string;
}

// The pre-workout pain check-in (clinical patients only) and the
// post-workout feedback both drive off this single field, one screen at a
// time, exactly like the original — never simultaneously, so reusing one
// piece of state doesn't create ambiguity in practice.
export type FeedbackPhase = "pain_heatmap" | "pain_scale" | "rpe" | "pain_after" | "done";

export interface ExerciseHistoryPoint {
  date: string;
  reps: number;
}

interface UseWorkoutSessionParams {
  patientExercises: HydratedPatientExercise[];
  exerciseCatalog: Exercise[]; // full library, used to find swap alternatives
  workoutLogs: WorkoutLog[];
  activePatientWeek: number;
  selectedCategory: string | null;
  selectedDayFilter: string;
  isDiyMode: boolean;
  diySelectedExercises: Exercise[];
  diyScheduleDay: string;
  onExitDiyMode: () => void; // owned by the future useDiyBuilder hook
  triggerHaptic: (type: HapticType) => void;
  onWorkoutLogged: () => void; // refetch patient data/logs after a successful log write
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
  diyScheduleDay,
  onExitDiyMode,
  triggerHaptic,
  onWorkoutLogged,
}: UseWorkoutSessionParams) {
  const { loggedInPatient } = useAuth();

  const [isWorkoutMode, setIsWorkoutMode] = useState(false);
  const [showPreWorkout, setShowPreWorkout] = useState(false);
  const [workoutFinished, setWorkoutFinished] = useState(false);
  const [feedbackPhase, setFeedbackPhase] = useState<FeedbackPhase>("rpe");

  const [swappedExercises, setSwappedExercises] = useState<Record<string, Exercise>>({});
  const [viewingExInfo, setViewingExInfo] = useState<Exercise | null>(null);

  const [activeBlockIdx, setActiveBlockIdx] = useState(0);
  const [activeExInBlockIdx, setActiveExInBlockIdx] = useState(0);
  const [currentBlockSet, setCurrentBlockSet] = useState(1);
  const [isResting, setIsResting] = useState(false);
  const [restTimer, setRestTimer] = useState(60);
  // Tracks the starting duration alongside restTimer, purely so the rest
  // screen's progress ring can show real elapsed-vs-total rather than a
  // static decoration. Doesn't affect the countdown logic itself.
  const [restTimerTotal, setRestTimerTotal] = useState(60);
  const [exTimer, setExTimer] = useState<number | null>(null);
  const [isExTimerRunning, setIsExTimerRunning] = useState(false);

  const [touchStart, setTouchStart] = useState<number | null>(null);
  const [touchEnd, setTouchEnd] = useState<number | null>(null);

  const [actualRepsLogged, setActualRepsLogged] = useState("");
  const [sessionPerformance, setSessionPerformance] = useState<SessionPerformanceEntry[]>([]);
  const [painBefore, setPainBefore] = useState<number | null>(null);
  const [rpeScore, setRpeScore] = useState<number | null>(null);
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

  // --- Derived session data (recomputed each render, same as the original) ---

  const weekFilteredPatientExercises = patientExercises.filter((pe) => (pe.week || 1) === activePatientWeek);

  // The category picker on the Plan tab's overview screen — every distinct
  // category assigned in the currently-selected week (regardless of the
  // day/category filters below, which only narrow the active workout).
  const patientCategories = Array.from(new Set(weekFilteredPatientExercises.map((pe) => pe.exercise.category)));

  const displayedExercises = weekFilteredPatientExercises.filter((pe) => {
    if (pe.exercise.category !== selectedCategory && !isDiyMode) return false;
    if (selectedDayFilter === "all") return true;
    if (!pe.scheduled_days || pe.scheduled_days.trim() === "") return true;
    return pe.scheduled_days.split(",").includes(selectedDayFilter);
  });

  const blocksMap: Record<string, SessionExercise[]> = {};

  if (isDiyMode) {
    diySelectedExercises.forEach((ex, idx) => {
      const blockLetter = String.fromCharCode(65 + idx);
      blocksMap[blockLetter] = [
        { id: `diy_${idx}`, exercise: ex, sets: 3, reps: 10, rir: null, is_time: false, block: blockLetter },
      ];
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
  const nextExercise: SessionExercise | undefined =
    activeExInBlockIdx < activeBlockExercises.length - 1
      ? activeBlockExercises[activeExInBlockIdx + 1]
      : currentBlockSet < maxSetsInBlock
        ? activeBlockExercises[0]
        : activeBlockIdx < blocksKeys.length - 1
          ? blocksMap[blocksKeys[activeBlockIdx + 1]][0]
          : undefined;

  let exHistoryData: ExerciseHistoryPoint[] = [];
  if (viewingExInfo && loggedInPatient?.patient_type === "fitness") {
    const relevantLogs = workoutLogs.filter((log) => log.patient_id === loggedInPatient.id && log.performance_data);
    exHistoryData = relevantLogs
      .map((log) => {
        try {
          const parsed: SessionPerformanceEntry[] = JSON.parse(log.performance_data as string);
          const sets = parsed.filter((p) => p.exercise_id === viewingExInfo.id);
          if (sets.length > 0) {
            const maxReps = Math.max(...sets.map((s) => s.reps || 0));
            return {
              date: new Date(log.created_at).toLocaleDateString("he-IL", { day: "2-digit", month: "2-digit" }),
              reps: maxReps,
            };
          }
        } catch {
          // malformed performance_data for this log — skip it
        }
        return null;
      })
      .filter((point): point is ExerciseHistoryPoint => point !== null)
      .reverse();
  }

  // --- Actions used by effects below, declared first so nothing forward-references them ---

  const handleFinishAction = () => {
    triggerHaptic("light");

    if (activeAssign) {
      setSessionPerformance((prev) => [
        ...prev,
        {
          exercise_id: activeAssign.exercise.id,
          set_number: currentBlockSet,
          reps: actualRepsLogged ? parseInt(actualRepsLogged) : Number(effectiveTargetReps ?? activeAssign.reps) || 0,
          rir: pendingSetRir ?? undefined,
        },
      ]);
    }

    // actualRepsLogged/pendingSetRir are deliberately NOT cleared here — the
    // rest screen (or, for the workout's final set, nothing) shows/edits
    // these values for the set just finished. The reset effect below is what
    // reseeds them, and only fires once the active slot actually advances.

    if (activeExInBlockIdx < activeBlockExercises.length - 1) {
      setActiveExInBlockIdx((prev) => prev + 1);
    } else if (currentBlockSet < maxSetsInBlock) {
      setIsResting(true);
      setRestTimer(60);
      setRestTimerTotal(60);
    } else if (activeBlockIdx < blocksKeys.length - 1) {
      setIsResting(true);
      setRestTimer(90);
      setRestTimerTotal(90);
    } else {
      triggerHaptic("success");
      setWorkoutFinished(true);
    }
  };

  const handleEndRest = () => {
    triggerHaptic("light");
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

  // --- Effects ---

  // Reset the per-set inputs whenever the active slot changes: prefill
  // "actual reps" and the pending RIR with the (possibly adjusted) target,
  // and clear the exercise timer so each new timed set starts fresh (seeded
  // on play, see toggleExerciseTimer) instead of inheriting the previous
  // set's finished countdown.
  useEffect(() => {
    if (isWorkoutMode && activeAssign) {
      // eslint-disable-next-line react-hooks/set-state-in-effect -- resetting editable/per-set fields' defaults when their subject (the active set) changes, not deriving external state
      setActualRepsLogged((effectiveTargetReps ?? activeAssign.reps).toString());
      setPendingSetRir(effectiveTargetRir);
      setExTimer(null);
      setIsExTimerRunning(false);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isWorkoutMode, activeAssign, activeExInBlockIdx, activeBlockIdx, currentBlockSet]);

  // Lock-screen media controls during a workout.
  useEffect(() => {
    if (isWorkoutMode && "mediaSession" in navigator && displayedExercise) {
      navigator.mediaSession.metadata = new MediaMetadata({
        title: displayedExercise.title,
        artist: `סט ${currentBlockSet} מתוך ${maxSetsInBlock}`,
        album: "OptimalMotion",
        artwork: [{ src: "/icon.png", sizes: "512x512", type: "image/png" }],
      });

      navigator.mediaSession.setActionHandler("nexttrack", () => {
        if (!isResting) handleFinishAction();
        else handleEndRest();
      });
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isWorkoutMode, displayedExercise, currentBlockSet, maxSetsInBlock, isResting]);

  // Rest-between-sets countdown.
  useEffect(() => {
    let interval: ReturnType<typeof setInterval> | undefined;
    if (isResting && restTimer > 0) interval = setInterval(() => setRestTimer((prev) => prev - 1), 1000);
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
      interval = setInterval(() => setExTimer((prev) => (prev !== null ? prev - 1 : 0)), 1000);
    } else if (exTimer === 0) {
      triggerHaptic("success");
      // eslint-disable-next-line react-hooks/set-state-in-effect -- reacting to the countdown's own terminal value, not syncing external state
      setIsExTimerRunning(false);
    }
    return () => clearInterval(interval);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isExTimerRunning, exTimer]);

  // --- Swipe gestures ---

  const onTouchStart = (e: TouchEvent) => {
    setTouchEnd(null);
    setTouchStart(e.targetTouches[0].clientX);
  };
  const onTouchMove = (e: TouchEvent) => {
    setTouchEnd(e.targetTouches[0].clientX);
  };
  const onTouchEnd = () => {
    if (!touchStart || !touchEnd) return;
    const distance = touchStart - touchEnd;
    if (distance < -50 && !isResting) handleFinishAction();
  };

  // --- Remaining actions ---

  const handleStartClick = () => {
    triggerHaptic("heavy");
    if (loggedInPatient?.patient_type === "fitness") {
      setIsWorkoutMode(true);
      setActiveBlockIdx(0);
      setActiveExInBlockIdx(0);
      setCurrentBlockSet(1);
      setIsResting(false);
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
    setIsWorkoutMode(true);
    setActiveBlockIdx(0);
    setActiveExInBlockIdx(0);
    setCurrentBlockSet(1);
    setIsResting(false);
    setWorkoutFinished(false);
  };

  const confirmPreWorkout = (pain: number) => {
    setPainBefore(pain);
    setShowPreWorkout(false);
    setIsWorkoutMode(true);
    setActiveBlockIdx(0);
    setActiveExInBlockIdx(0);
    setCurrentBlockSet(1);
    setIsResting(false);
    setWorkoutFinished(false);
    setFeedbackPhase("rpe");
    setActualRepsLogged("");
    setSessionPerformance([]);
  };

  const addRestTime = () => {
    triggerHaptic("light");
    setRestTimer((prev) => prev + 15);
    setRestTimerTotal((prev) => prev + 15);
  };

  const toggleExerciseTimer = () => {
    triggerHaptic("light");
    // Seed the countdown from the exercise's duration (stored in `reps` for
    // timed exercises) the first time it's started for this set; a pause/
    // resume leaves the in-progress value alone.
    if (!isExTimerRunning && exTimer === null && activeAssign) {
      setExTimer(activeAssign.reps);
    }
    setIsExTimerRunning((prev) => !prev);
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

  const selectRestRir = (value: number) => {
    triggerHaptic("light");
    setPendingSetRir(value);
    updateLastPerformanceEntry({ rir: value });
  };

  const submitFinalFeedback = async (postPain: number | null = null) => {
    if (!loggedInPatient) return;

    if (isDiyMode) {
      if (confirm("האם לשמור את האימון שבנית כחלק קבוע מהתוכנית השבועית שלך?")) {
        const inserts = diySelectedExercises.map((ex, idx) => ({
          patient_id: loggedInPatient.id,
          exercise_id: ex.id,
          block: String.fromCharCode(65 + idx),
          sets: 3,
          reps: 10,
          is_time: false,
          week: activePatientWeek,
          scheduled_days: diyScheduleDay,
        }));
        await supabase.from("patient_exercises").insert(inserts);
      }
    }

    const { error } = await supabase.from("workout_logs").insert([
      {
        patient_id: loggedInPatient.id,
        category: isDiyMode ? "אימון עצמאי" : selectedCategory,
        rpe: rpeScore,
        pain_before: loggedInPatient.patient_type === "fitness" ? null : painBefore,
        pain_after: loggedInPatient.patient_type === "fitness" ? null : postPain,
        pain_areas: selectedPainAreas.length > 0 ? selectedPainAreas.join(",") : null,
        performance_data: sessionPerformance.length > 0 ? JSON.stringify(sessionPerformance) : null,
      },
    ]);

    if (error) {
      console.error(error);
      alert(`שגיאה: ${error.message}`);
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

  const handleSwapExercise = () => {
    triggerHaptic("light");
    if (!activeAssign) return;
    const currentEx = swappedExercises[activeAssign.id] || activeAssign.exercise;
    if (!currentEx.target_muscle) {
      alert("לתרגיל זה לא מוגדר שריר מטרה מרכזי, ולכן המערכת לא יודעת מה להציע במקומו.");
      return;
    }
    const alternatives = exerciseCatalog.filter((e) => e.target_muscle === currentEx.target_muscle && e.id !== currentEx.id);
    if (alternatives.length > 0) {
      const pick = alternatives[Math.floor(Math.random() * alternatives.length)];
      setSwappedExercises((prev) => ({ ...prev, [activeAssign.id]: pick }));
    } else {
      alert("לא נמצאו במאגר תרגילים חלופיים לאותו שריר מרכזי.");
    }
  };

  const closeWorkout = () => {
    setIsWorkoutMode(false);
    setWorkoutFinished(false);
    setPainBefore(null);
    setRpeScore(null);
    setSwappedExercises({});
    setRepAdjustments({});
    setPendingSetRir(null);
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
    nextExercise,
    isResting,
    restTimer,
    restTimerTotal,
    addRestTime,
    exTimer,
    isExTimerRunning,
    toggleExerciseTimer,
    actualRepsLogged,
    setActualRepsLogged,
    pendingSetRir,
    adjustRestReps,
    selectRestRir,
    handleFinishAction,
    handleEndRest,
    handleSwapExercise,
    makeHarder,
    makeEasier,
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
  };
}
