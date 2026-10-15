"use client";

import { useEffect, useMemo, useState, type SetStateAction } from "react";
import { AlertCircle, CalendarDays, Compass, Crown, Dumbbell, Home as HomeIcon } from "lucide-react";
import { useAuth } from "@/app/context/AuthContext";
import { useHaptics } from "@/app/hooks/useHaptics";
import { useReminders } from "@/app/hooks/useReminders";
import { usePatientData } from "@/app/hooks/usePatientData";
import { useCuratedFacts } from "@/app/hooks/useCuratedFacts";
import { registerServiceWorker } from "@/app/utils/pushClient";
import { usePlanSelection } from "@/app/hooks/usePlanSelection";
import { useWorkoutSession } from "@/app/hooks/useWorkoutSession";
import { useSavedPrograms } from "@/app/hooks/useSavedPrograms";
import { useExplorePrograms } from "@/app/hooks/useExplorePrograms";
import WorkoutPlayer from "@/app/components/patient/workout/WorkoutPlayer";
import ExerciseInfoModal from "@/app/components/patient/workout/ExerciseInfoModal";
import PasskeyPrompt from "@/app/components/patient/PasskeyPrompt";
import PlanTab from "@/app/components/patient/tabs/PlanTab";
import CalendarTab from "@/app/components/patient/tabs/CalendarTab";
import DiyBuilderTab from "@/app/components/patient/tabs/DiyBuilderTab";
import DiyHubScreen from "@/app/components/patient/tabs/DiyHubScreen";
import MyWorkoutsScreen from "@/app/components/patient/tabs/MyWorkoutsScreen";
import ExploreTab from "@/app/components/patient/tabs/ExploreTab";
import PremiumStoreTab from "@/app/components/patient/tabs/PremiumStoreTab";
import { FEATURES } from "@/app/constants/features";
import ProfileTab from "@/app/components/patient/tabs/ProfileTab";
import type { DiyExercise, SavedProgram, SavedProgramDay, Workout } from "@/app/types";
import { getDiyPrescription } from "@/app/utils/diy";
import type { SessionExercise } from "@/app/hooks/useWorkoutSession";
import AmrapPlayer, { type AmrapSessionConfig, type AmrapStation } from "@/app/components/patient/workout/AmrapPlayer";
import { notify } from "@/app/components/ui/feedback";
import { supabase } from "@/app/lib/supabase";
import { buildWeekPlan, DAY_NAMES, type PlannedWorkout, type ProgramQueueEntry } from "@/app/utils/programQueue";
import { assignedEntryToDraft, draftToSessionsPayload, type AssignedProgramDraft } from "@/app/utils/assignedProgramEdit";

type PatientTab = "plan" | "calendar" | "diy" | "explore" | "premium" | "profile";

// Orchestrates the whole patient experience: instantiates every patient-side
// hook exactly once (so WorkoutPlayer and the tabs that need the same data —
// e.g. viewingExInfo, the workout session's blocksMap — stay in sync instead
// of each holding a disconnected copy), and mounts WorkoutPlayer
// alongside the tab content rather than early-returning: it's a full-screen
// fixed overlay, so it visually covers the shell without needing to
// unmount it (which would otherwise reset tab/filter state under them).
export default function PatientShell() {
  const { loggedInPatient } = useAuth();

  const [patientTab, setPatientTab] = useState<PatientTab>("plan");
  // The DIY builder is a full-screen workspace over the shell (opened from
  // the "בנה אימון" tab's hub), not inline tab content.
  const [builderOpen, setBuilderOpen] = useState(false);
  // "התוכניות שלי" is a pushed screen inside the DIY tab (folder button on
  // the hub), with diyNav as the direction of the last push for the slide.
  const [showMyWorkouts, setShowMyWorkouts] = useState(false);
  const [diyNav, setDiyNav] = useState<"forward" | "back" | null>(null);
  // An assigned program open in the builder for the patient to edit — kept
  // apart from the DIY draft so editing one never overwrites the other.
  const [assignedDraft, setAssignedDraft] = useState<AssignedProgramDraft | null>(null);
  const [editingSavedProgramId, setEditingSavedProgramId] = useState<string | null>(null);
  // A regular Explore workout running through the player with its own
  // blocks/sets/reps (see useWorkoutSession's adHocSession).
  const [adHocSession, setAdHocSession] = useState<{ title: string; exercises: SessionExercise[] } | null>(null);
  // An AMRAP running in AmrapPlayer (from Explore, or an AMRAP program in the plan).
  const [amrapConfig, setAmrapConfig] = useState<AmrapSessionConfig | null>(null);

  const { hapticsEnabled, setHapticsEnabled, triggerHaptic } = useHaptics();
  const reminders = useReminders(triggerHaptic);
  const patientData = usePatientData();
  const planSelection = usePlanSelection(patientData.patientExercises);
  const savedProgramsData = useSavedPrograms();
  const explore = useExplorePrograms();
  const { curatedFacts } = useCuratedFacts();

  // The service worker only shows Web Push notifications (public/sw.js);
  // registered here so a device that turned rest alerts on keeps receiving them.
  useEffect(() => {
    registerServiceWorker();
  }, []);

  // A live session is always one sitting, so it only ever runs the DIY
  // builder's currently-active day — the rest of the multi-day draft just
  // sits untouched in planSelection.diyExercisesByDay.
  const diyActiveDayExercises = planSelection.diyExercisesByDay[planSelection.diyActiveDay] ?? [];

  const session = useWorkoutSession({
    patientExercises: patientData.patientExercises,
    exerciseCatalog: patientData.exerciseCatalog,
    workoutLogs: patientData.workoutLogs,
    activePatientWeek: planSelection.activePatientWeek,
    selectedCategory: planSelection.selectedCategory,
    selectedDayFilter: planSelection.selectedDayFilter,
    isDiyMode: planSelection.isDiyMode,
    diySelectedExercises: diyActiveDayExercises,
    diyScheduleDay: planSelection.diyScheduleDay,
    adHocSession,
    referenceDate: planSelection.referenceDate,
    onExitDiyMode: () => {
      planSelection.exitDiyMode();
      setAdHocSession(null);
    },
    triggerHaptic,
    onWorkoutLogged: patientData.refetch,
  });

  // This week's plan: every program's planned workouts with done/open status.
  const queue = useMemo(
    () => buildWeekPlan(patientData.patientExercises, patientData.programs, patientData.workoutLogs),
    [patientData.patientExercises, patientData.programs, patientData.workoutLogs]
  );

  if (!loggedInPatient) return null;

  // Bottom-nav tab switches always exit DIY mode; the header avatar button
  // and the Premium tab's "go to plan" button don't — preserved exactly as
  // in the original, not unified.
  //
  // Tapping the tab that's already active doesn't switch anything, so it
  // instead pops that tab's own view stack back to its root screen (the
  // Home tab's workout detail view, the DIY builder's
  // expanded accordion) rather than being a no-op.
  const switchTab = (tab: PatientTab) => {
    if (tab === patientTab) {
      if (tab === "plan") planSelection.setSelectedCategory(null);
      if (tab === "diy") {
        setBuilderOpen(false);
        setShowMyWorkouts(false);
        setDiyNav(null);
        planSelection.setDiyCategoryFilter(null);
        planSelection.setDiyBodyPartFilter(null);
      }
      return;
    }
    setPatientTab(tab);
    planSelection.setReferenceDate(new Date());
    planSelection.setIsDiyMode(false);
    setBuilderOpen(false);
    setShowMyWorkouts(false);
    setDiyNav(null);
    setAssignedDraft(null);
  };

  // Calendar -> Plan tab, opened on that planned workout. (Called from a
  // tap, after handleOpenProgram below is defined.)
  const handleOpenPlannedFromCalendar = (entry: ProgramQueueEntry, item: PlannedWorkout) => {
    switchTab("plan");
    handleOpenProgram(entry, item);
  };

  // Hydrates a saved program day's ordered exercise_ids (and their
  // index-aligned sets/reps/rest, when saved) against the live catalog,
  // silently dropping any id that no longer exists (e.g. an exercise
  // deleted from the catalog since the program was saved).
  const hydrateDay = (day: SavedProgramDay): DiyExercise[] =>
    day.exercise_ids.flatMap((id, idx): DiyExercise[] => {
      const exercise = patientData.exerciseCatalog.find((ex) => ex.id === id);
      if (!exercise) return [];
      const prescription = day.prescriptions?.[idx];
      return [prescription ? { ...exercise, prescription } : exercise];
    });

  // Loading a saved program's specific day to run it right now replaces the
  // active builder draft with just that one day, same overwrite semantics
  // the old single-workout version already had.
  const handleStartSavedProgram = (program: SavedProgram, dayNumber: number) => {
    const day = program.days.find((d) => d.day_number === dayNumber) ?? program.days[0];
    if (!day) return;
    const dayExercises = hydrateDay(day);
    if (dayExercises.length === 0) return notify("אין תרגילים זמינים ביום הזה — ייתכן שהם הוסרו מהמאגר.", "info");
    planSelection.setDiyExercisesByDay({ [day.day_number]: dayExercises });
    planSelection.setDiyActiveDay(day.day_number);
    planSelection.setDiyProgramName(program.name);
    setBuilderOpen(false);
    planSelection.setIsDiyMode(true);
    session.startDiyWorkoutNow();
  };

  // Loading a program to edit it replaces the whole draft with every one of
  // its days, so the builder opens exactly where the program left off.
  const handleEditSavedProgram = (program: SavedProgram) => {
    const hydratedDays = Object.fromEntries(program.days.map((d) => [d.day_number, hydrateDay(d)]));
    planSelection.setDiyExercisesByDay(Object.keys(hydratedDays).length > 0 ? hydratedDays : { 1: [] });
    planSelection.setDiyActiveDay(program.days[0]?.day_number ?? 1);
    planSelection.setDiyProgramName(program.name);
    setEditingSavedProgramId(program.id);
    setBuilderOpen(true);
    setShowMyWorkouts(false);
    setDiyNav(null);
  };

  // "New workout" from the hub starts from an empty one-day draft. The
  // unsaved draft it replaces comes back with the toast's undo.
  const handleStartNewDiyProgram = () => {
    const snapshot = {
      days: planSelection.diyExercisesByDay,
      activeDay: planSelection.diyActiveDay,
      name: planSelection.diyProgramName,
      editingId: editingSavedProgramId,
    };
    const hadDraft = Object.values(snapshot.days).some((exs) => exs.length > 0);
    planSelection.setDiyExercisesByDay({ 1: [] });
    planSelection.setDiyActiveDay(1);
    planSelection.setDiyProgramName("תוכנית מותאמת אישית");
    setEditingSavedProgramId(null);
    setBuilderOpen(true);
    setShowMyWorkouts(false);
    setDiyNav(null);
    if (hadDraft) {
      notify("הטיוטה הקודמת נוקתה", "info", {
        action: {
          label: "ביטול",
          onClick: () => {
            planSelection.setDiyExercisesByDay(snapshot.days);
            planSelection.setDiyActiveDay(snapshot.activeDay);
            planSelection.setDiyProgramName(snapshot.name);
            setEditingSavedProgramId(snapshot.editingId);
          },
        },
      });
    }
  };

  const handleSaveDiyProgram = async () => {
    const days = Object.entries(planSelection.diyExercisesByDay)
      .map(([dayNumber, exercises]) => ({
        day_number: Number(dayNumber),
        exercise_ids: exercises.map((ex) => ex.id),
        prescriptions: exercises.map(getDiyPrescription),
      }))
      .filter((d) => d.exercise_ids.length > 0)
      .sort((a, b) => a.day_number - b.day_number);
    if (days.length === 0) return;
    await savedProgramsData.saveProgram({
      editingId: editingSavedProgramId,
      name: planSelection.diyProgramName,
      days,
    });
    setEditingSavedProgramId(null);
  };

  // Adding a published template (Explore, or the no-program-yet onboarding
  // block) copies it into the patient's programs server-side; the plan is
  // then refetched so it shows on Home right away.
  const handleAddExploreProgram = async (programId: string) => {
    const ok = await explore.addToMyPrograms(programId);
    if (ok) await patientData.refetch();
    return ok;
  };

  const exerciseById = (id: string) => patientData.exerciseCatalog.find((ex) => ex.id === id);

  // "Start now" on an Explore workout: AMRAP opens the AMRAP player; a
  // regular workout runs through the normal player with the admin's own
  // blocks/sets/reps, logged under the workout's title.
  const handleStartExploreWorkout = (workout: Workout) => {
    if (workout.format === "amrap") {
      const stations: AmrapStation[] = workout.items
        .map((item): AmrapStation | null => {
          const exercise = exerciseById(item.exercise_id);
          return exercise ? { exercise, reps: item.reps, reps_max: item.reps_max, is_time: item.is_time } : null;
        })
        .filter((st): st is AmrapStation => st !== null);
      if (stations.length === 0 || !workout.time_cap_seconds) return notify("אין תרגילים זמינים באימון הזה כרגע.", "info");
      setAmrapConfig({ title: workout.title, timeCapSeconds: workout.time_cap_seconds, stations });
      return;
    }
    const exercises: SessionExercise[] = workout.items
      .map((item, idx): SessionExercise | null => {
        const exercise = exerciseById(item.exercise_id);
        if (!exercise) return null;
        return {
          id: `workout_${workout.id}_${idx}`,
          exercise,
          sets: item.sets ?? 3,
          reps: item.reps,
          reps_max: item.reps_max ?? null,
          rir: item.rir ?? null,
          is_time: item.is_time,
          block: item.block || String.fromCharCode(65 + idx),
          rest_time_seconds: item.rest_time_seconds ?? 60,
          weight_kg: item.weight_kg ?? null,
        };
      })
      .filter((se): se is SessionExercise => se !== null);
    // Used to return silently: "start" did nothing at all.
    if (exercises.length === 0) return notify("אין תרגילים זמינים באימון הזה כרגע.", "info");
    setAdHocSession({ title: workout.title, exercises });
    planSelection.setIsDiyMode(true);
    session.startDiyWorkoutNow();
  };

  // "Start workout" on the Plan tab: an AMRAP program (a workout the patient
  // pinned to a day) runs in the AMRAP player; everything else as before.
  const handleStartPlanWorkout = () => {
    const rows = session.displayedExercises;
    const amrapRow = rows.find((pe) => pe.program_format === "amrap");
    if (amrapRow && amrapRow.program_time_cap_seconds) {
      setAmrapConfig({
        title: amrapRow.program_name ?? "AMRAP",
        timeCapSeconds: amrapRow.program_time_cap_seconds,
        stations: rows.map((pe) => ({ exercise: pe.exercise, reps: Number(pe.reps) || 0, reps_max: pe.reps_max ?? null, is_time: pe.is_time })),
        queueLogRef: session.queueLogRef,
      });
      return;
    }
    session.handleStartClick();
  };

  // Opening a planned workout on the Plan tab: its program, program week
  // and day (selectedDayFilter = its slot, which its log is recorded under —
  // so doing Sunday's workout on Monday still completes Sunday).
  const handleOpenProgram = (entry: ProgramQueueEntry, item: PlannedWorkout) => {
    planSelection.setSelectedCategory(entry.name);
    planSelection.setSelectedDayFilter(item.slotKey);
    if (entry.currentWeek != null) planSelection.setPatientSelectedWeek(entry.currentWeek);
    // A dated workout is matched against the week its date falls in.
    planSelection.setReferenceDate(entry.scheduledDate ? new Date(`${entry.scheduledDate}T00:00:00`) : new Date());
  };

  const handleEditAssignedProgram = (entry: ProgramQueueEntry) => {
    const draft = assignedEntryToDraft(entry);
    if (draft) setAssignedDraft(draft);
  };

  const setAssignedByDay = (action: SetStateAction<Record<number, DiyExercise[]>>) =>
    setAssignedDraft((prev) => (prev ? { ...prev, byDay: typeof action === "function" ? action(prev.byDay) : action } : prev));

  const addAssignedDay = () =>
    setAssignedDraft((prev) => {
      if (!prev) return prev;
      const next = Math.max(0, ...Object.keys(prev.byDay).map(Number)) + 1;
      return { ...prev, byDay: { ...prev.byDay, [next]: [] }, activeDay: next };
    });

  const removeAssignedDay = (day: number) =>
    setAssignedDraft((prev) => {
      if (!prev) return prev;
      const remaining = Object.keys(prev.byDay).map(Number).filter((d) => d !== day);
      if (remaining.length === 0) return prev;
      const byDay = { ...prev.byDay };
      delete byDay[day];
      return { ...prev, byDay, activeDay: prev.activeDay === day ? Math.min(...remaining) : prev.activeDay };
    });

  // Saving replaces the program's current week (patient_save_program_week);
  // the therapist then sees it as edited by the patient.
  const handleSaveAssignedProgram = async () => {
    if (!assignedDraft) return;
    const sessions = draftToSessionsPayload(assignedDraft);
    if (sessions.length === 0) {
      notify("צריך לפחות אימון אחד עם תרגילים.", "info");
      throw new Error("empty");
    }
    const { error } = await supabase.rpc("patient_save_program_week", {
      p_program_id: assignedDraft.programId,
      p_week: assignedDraft.week,
      p_name: assignedDraft.name,
      p_sessions: sessions,
    });
    if (error) {
      notify(`שגיאה בשמירה: ${error.message}`, "error");
      throw error;
    }
    await patientData.refetch();
    planSelection.setSelectedCategory(assignedDraft.name.trim() || planSelection.selectedCategory);
    planSelection.setSelectedDayFilter(sessions[0].days?.split(",")[0] ?? "all");
    setAssignedDraft(null);
    notify("השינויים נשמרו — התוכנית עכשיו שלך");
  };

  const handleRemoveExploreProgram = async (programId: string) => {
    const ok = await explore.removeFromMyPrograms(programId);
    if (ok) await patientData.refetch();
    return ok;
  };

  return (
    <>
      <WorkoutPlayer session={session} triggerHaptic={triggerHaptic} />
      {amrapConfig && (
        <AmrapPlayer config={amrapConfig} triggerHaptic={triggerHaptic} onClose={() => setAmrapConfig(null)} onLogged={patientData.refetch} />
      )}
      <PasskeyPrompt />
      {assignedDraft && (
        <DiyBuilderTab
          variant="assigned"
          maxDays={7}
          labelForDay={(day) => {
            const slots = assignedDraft.slotKeysByDay[day] ?? [];
            if (slots.length === 0) return Object.keys(assignedDraft.byDay).length > 1 ? `אימון ${day}` : "האימון";
            return slots.length === 7 ? "כל יום" : slots.map((d) => DAY_NAMES[Number(d)]).join(" + ");
          }}
          assignedNote={[
            assignedDraft.week != null ? `השינויים חלים על שבוע ${assignedDraft.week} בתוכנית.` : null,
            "המטפל שלך יראה שערכת את התוכנית.",
          ]
            .filter(Boolean)
            .join(" ")}
          exerciseCatalog={patientData.exerciseCatalog}
          onViewExerciseInfo={(exercise) => session.setViewingExInfo(exercise)}
          diyEquipFilter={planSelection.diyEquipFilter}
          setDiyEquipFilter={planSelection.setDiyEquipFilter}
          diyCategoryFilter={planSelection.diyCategoryFilter}
          setDiyCategoryFilter={planSelection.setDiyCategoryFilter}
          diyBodyPartFilter={planSelection.diyBodyPartFilter}
          setDiyBodyPartFilter={planSelection.setDiyBodyPartFilter}
          diyExercisesByDay={assignedDraft.byDay}
          setDiyExercisesByDay={setAssignedByDay}
          diyActiveDay={assignedDraft.activeDay}
          setDiyActiveDay={(day) => setAssignedDraft((prev) => (prev ? { ...prev, activeDay: day } : prev))}
          onAddDiyDay={addAssignedDay}
          onRemoveDiyDay={removeAssignedDay}
          diyProgramName={assignedDraft.name}
          setDiyProgramName={(name) => setAssignedDraft((prev) => (prev ? { ...prev, name } : prev))}
          onStartDiyWorkoutNow={() => {}}
          onSaveDiyProgram={handleSaveAssignedProgram}
          isEditingSavedProgram={false}
          onCancelEditSavedProgram={() => {}}
          onClose={() => setAssignedDraft(null)}
        />
      )}
      {patientTab === "diy" && builderOpen && (
        <DiyBuilderTab
          exerciseCatalog={patientData.exerciseCatalog}
          onViewExerciseInfo={(exercise) => session.setViewingExInfo(exercise)}
          diyEquipFilter={planSelection.diyEquipFilter}
          setDiyEquipFilter={planSelection.setDiyEquipFilter}
          diyCategoryFilter={planSelection.diyCategoryFilter}
          setDiyCategoryFilter={planSelection.setDiyCategoryFilter}
          diyBodyPartFilter={planSelection.diyBodyPartFilter}
          setDiyBodyPartFilter={planSelection.setDiyBodyPartFilter}
          diyExercisesByDay={planSelection.diyExercisesByDay}
          setDiyExercisesByDay={planSelection.setDiyExercisesByDay}
          diyActiveDay={planSelection.diyActiveDay}
          setDiyActiveDay={planSelection.setDiyActiveDay}
          onAddDiyDay={planSelection.addDiyDay}
          onRemoveDiyDay={planSelection.removeDiyDay}
          diyProgramName={planSelection.diyProgramName}
          setDiyProgramName={planSelection.setDiyProgramName}
          onStartDiyWorkoutNow={() => {
            planSelection.setIsDiyMode(true);
            session.startDiyWorkoutNow();
          }}
          onSaveDiyProgram={handleSaveDiyProgram}
          isEditingSavedProgram={editingSavedProgramId !== null}
          onCancelEditSavedProgram={() => setEditingSavedProgramId(null)}
          onClose={() => setBuilderOpen(false)}
        />
      )}

      {/* Locked to the viewport (fixed inset-0, same full-screen-overlay
          pattern WorkoutPlayer already uses) so the outer page can never
          scroll on its own — only `main` below does, via overflow-y-auto.
          Letting the whole shell scroll as one is what caused the
          background to drag and the fixed bottom nav to detach/overlap
          during fast scrolling. */}
      <div className="fixed inset-0 overflow-hidden bg-page text-fg flex flex-col">
        {session.viewingExInfo && (
          <ExerciseInfoModal exercise={session.viewingExInfo} historyData={session.exHistoryData} onClose={() => session.setViewingExInfo(null)} />
        )}

        {/* BOTTOM NAVIGATION BAR. pb-safe (used to pad for the home
            indicator) is a dead no-op class in this project (see
            MISTAKES.md) — using the same working
            max(<min>, env(safe-area-inset-bottom)) pattern as
            PatientCoachSheet instead. */}
        <nav className="fixed bottom-0 left-0 right-0 bg-elevated/90 backdrop-blur-md z-50 print:hidden pb-[max(0.5rem,env(safe-area-inset-bottom))] shadow-[inset_0_0.5px_0_color-mix(in_srgb,white_25%,transparent),0_-10px_24px_-16px_color-mix(in_srgb,var(--shadow-ink)_35%,transparent)]">
          <div className="flex justify-around items-center h-16 max-w-5xl mx-auto px-2">
            <button onClick={() => switchTab("plan")} className={`flex flex-col items-center justify-center w-16 h-full gap-1 transition-colors ${patientTab === "plan" ? "text-accent-fg" : "text-muted hover:text-fg"}`}>
              <HomeIcon size={22} className={patientTab === "plan" ? "fill-accent/15" : ""} />
              <span className="text-[0.6875rem] font-bold">היום</span>
            </button>

            <button onClick={() => switchTab("calendar")} className={`flex flex-col items-center justify-center w-16 h-full gap-1 transition-colors ${patientTab === "calendar" ? "text-accent-fg" : "text-muted hover:text-fg"}`}>
              <CalendarDays size={22} className={patientTab === "calendar" ? "fill-accent/15" : ""} />
              <span className="text-[0.6875rem] font-bold">לוח שנה</span>
            </button>

            {loggedInPatient.patient_type === "fitness" && (
              <button onClick={() => switchTab("diy")} className={`flex flex-col items-center justify-center w-16 h-full gap-1 transition-colors ${patientTab === "diy" ? "text-accent-fg" : "text-muted hover:text-fg"}`}>
                <Dumbbell size={22} />
                <span className="text-[0.6875rem] font-bold">בנה אימון</span>
              </button>
            )}

            {loggedInPatient.patient_type === "fitness" && (
              <button onClick={() => switchTab("explore")} className={`flex flex-col items-center justify-center w-16 h-full gap-1 transition-colors ${patientTab === "explore" ? "text-accent-fg" : "text-muted hover:text-fg"}`}>
                <Compass size={22} className={patientTab === "explore" ? "fill-accent/15" : ""} />
                <span className="text-[0.6875rem] font-bold">גלה</span>
              </button>
            )}

            {FEATURES.premiumTab && loggedInPatient.patient_type === "fitness" && (
              <button onClick={() => switchTab("premium")} className={`flex flex-col items-center justify-center w-16 h-full gap-1 transition-colors ${patientTab === "premium" ? "text-accent-fg" : "text-muted hover:text-fg"}`}>
                <Crown size={22} className={patientTab === "premium" ? "fill-accent/15" : ""} />
                <span className="text-[0.6875rem] font-bold">תוכניות</span>
              </button>
            )}

            {/* Carries the identity marker the old top header's avatar used
                to show (first-letter circle) — moved here rather than kept
                as a separate button, since this tab already does the same
                job (open the account/profile screen). */}
            <button onClick={() => switchTab("profile")} className={`flex flex-col items-center justify-center w-16 h-full gap-1 transition-colors ${patientTab === "profile" ? "text-accent-fg" : "text-muted hover:text-fg"}`}>
              <span
                className={`w-6 h-6 rounded-full flex items-center justify-center text-[0.6875rem] font-bold transition-colors ${
                  patientTab === "profile" ? "bg-accent text-on-accent" : "bg-warm text-on-accent"
                }`}
              >
                {loggedInPatient.full_name.charAt(0)}
              </span>
              <span className="text-[0.6875rem] font-bold">פרופיל</span>
            </button>
          </div>
        </nav>

        {/* No more sticky header above this — the dashboard's own giant
            "היי [שם]" hero (PlanTab) is meant to be the first thing on the
            page, so this only pads for the device's own notch/status bar
            (env(safe-area-inset-top)), not for chrome that no longer
            exists. max(1rem, ...) keeps a sane minimum on non-notched
            screens instead of sitting flush against the viewport edge.
            This is the one scrollable region in the shell (flex-1 +
            overflow-y-auto) — pb-24 plus the fixed nav's own safe-area
            inset keeps the final content clear of the fixed bottom nav
            instead of being hidden behind it. */}
        <main className="flex-1 overflow-y-auto max-w-5xl w-full mx-auto px-4 md:px-8 pb-[calc(6rem+env(safe-area-inset-bottom))] md:pb-24 pt-[max(1rem,env(safe-area-inset-top))] relative z-0">
          {loggedInPatient.patient_type === "fitness" && loggedInPatient.email_verified === false && (
            <div className="print:hidden mb-6">
              <div className="bg-warm/15 border border-warm/40 p-4 rounded-2xl flex items-start gap-4 shadow-card">
                <div className="w-10 h-10 bg-warm/15 text-warm-fg rounded-full flex items-center justify-center shrink-0 mt-1">
                  <AlertCircle size={20} />
                </div>
                <div>
                  <h4 className="font-bold text-warm-fg text-sm">אנא אמת את כתובת המייל שלך</h4>
                  <p className="text-warm-fg/80 text-xs font-medium mt-1">
                    נשלח קישור לאימות לכתובת {loggedInPatient.email}. יש לך 7 ימים לאמת את החשבון כדי שתוכל להמשיך להשתמש בפלטפורמה ולרכוש מסלולים חדשים.
                  </p>
                </div>
              </div>
            </div>
          )}

          {patientTab === "diy" && showMyWorkouts && (
            <div key="my-workouts" className={diyNav === "forward" ? "animate-step-in" : ""}>
              <MyWorkoutsScreen
                savedPrograms={savedProgramsData.savedPrograms}
                exerciseCatalog={patientData.exerciseCatalog}
                onBack={() => {
                  setDiyNav("back");
                  setShowMyWorkouts(false);
                }}
                onBuildNew={handleStartNewDiyProgram}
                onStartProgramDay={handleStartSavedProgram}
                onEditProgram={handleEditSavedProgram}
                onDeleteProgram={savedProgramsData.deleteProgram}
              />
            </div>
          )}

          {patientTab === "diy" && !showMyWorkouts && (
            <div key="hub" className={diyNav === "back" ? "animate-step-back" : ""}>
              <DiyHubScreen
                draftName={planSelection.diyProgramName}
                draftDayCount={Object.keys(planSelection.diyExercisesByDay).length}
                draftExerciseCount={Object.values(planSelection.diyExercisesByDay).reduce((acc, exs) => acc + exs.length, 0)}
                isEditingSavedProgram={editingSavedProgramId !== null}
                onContinueDraft={() => setBuilderOpen(true)}
                onStartNew={handleStartNewDiyProgram}
                savedProgramCount={savedProgramsData.savedPrograms.length}
                onOpenMyWorkouts={() => {
                  setDiyNav("forward");
                  setShowMyWorkouts(true);
                }}
                exerciseCatalog={patientData.exerciseCatalog}
                onViewExerciseInfo={(exercise) => session.setViewingExInfo(exercise)}
              />
            </div>
          )}

          {patientTab === "explore" && (
            <ExploreTab
              freePrograms={explore.freePrograms}
              premiumPrograms={explore.premiumPrograms}
              likedPrograms={explore.likedPrograms}
              likedProgramIds={explore.likedProgramIds}
              addedPrograms={explore.addedPrograms}
              onToggleLike={explore.toggleLike}
              onAddProgram={handleAddExploreProgram}
              onRemoveProgram={handleRemoveExploreProgram}
              exerciseCatalog={patientData.exerciseCatalog}
              workouts={explore.workouts}
              likedWorkouts={explore.likedWorkouts}
              likedWorkoutIds={explore.likedWorkoutIds}
              onToggleWorkoutLike={explore.toggleWorkoutLike}
              onStartWorkout={handleStartExploreWorkout}
              onAddWorkoutToDay={async (workoutId, dayId, date) => {
                const ok = await explore.addWorkoutToDay(workoutId, dayId, date);
                if (ok) await patientData.refetch();
                return ok;
              }}
            />
          )}

          {patientTab === "profile" && (
            <ProfileTab
              workoutLogs={patientData.workoutLogs}
              reminderSchedule={reminders.reminderSchedule}
              setReminderDayTime={reminders.setReminderDayTime}
              onSaveSettings={reminders.handleSaveSettings}
              hapticsEnabled={hapticsEnabled}
              setHapticsEnabled={setHapticsEnabled}
              triggerHaptic={triggerHaptic}
            />
          )}

          {FEATURES.premiumTab && patientTab === "premium" && <PremiumStoreTab onGoToPlan={() => setPatientTab("plan")} />}

          {patientTab === "plan" && (
            <PlanTab
              isLoading={!patientData.hasLoaded}
              workoutLogs={patientData.workoutLogs}
              selectedCategory={planSelection.selectedCategory}
              setSelectedCategory={planSelection.setSelectedCategory}
              selectedDayFilter={planSelection.selectedDayFilter}
              activePatientWeek={planSelection.activePatientWeek}
              isDiyMode={planSelection.isDiyMode}
              diyProgramName={planSelection.diyProgramName}
              weekFilteredExercises={session.weekFilteredPatientExercises}
              displayedExercises={session.displayedExercises}
              blocksMap={session.blocksMap}
              blocksKeys={session.blocksKeys}
              onViewExerciseInfo={(exercise) => session.setViewingExInfo(exercise)}
              onStartWorkout={handleStartPlanWorkout}
              onWorkoutLogged={patientData.refetch}
              curatedFacts={curatedFacts}
              hasAnyAssignedExercises={patientData.patientExercises.length > 0}
              starterPrograms={explore.freePrograms.slice(0, 3)}
              onAddStarterProgram={handleAddExploreProgram}
              queue={queue}
              onOpenProgram={handleOpenProgram}
              onEditProgram={handleEditAssignedProgram}
              queueLogRef={session.queueLogRef}
            />
          )}

          {patientTab === "calendar" && (
            <CalendarTab
              patientExercises={patientData.patientExercises}
              programs={patientData.programs}
              workoutLogs={patientData.workoutLogs}
              patientId={loggedInPatient.id}
              onOpenPlanned={handleOpenPlannedFromCalendar}
              onLogged={patientData.refetch}
              onBrowsePrograms={loggedInPatient.patient_type === "fitness" ? () => switchTab("explore") : undefined}
            />
          )}
        </main>
      </div>
    </>
  );
}
