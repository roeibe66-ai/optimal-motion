"use client";

import { useState } from "react";
import { AlertCircle, CalendarDays, Crown, Dumbbell, Home as HomeIcon } from "lucide-react";
import { useAuth } from "@/app/context/AuthContext";
import { useHaptics } from "@/app/hooks/useHaptics";
import { useReminders } from "@/app/hooks/useReminders";
import { usePatientData } from "@/app/hooks/usePatientData";
import { useCuratedFacts } from "@/app/hooks/useCuratedFacts";
import { usePlanSelection } from "@/app/hooks/usePlanSelection";
import { useWorkoutSession } from "@/app/hooks/useWorkoutSession";
import { useSavedPrograms } from "@/app/hooks/useSavedPrograms";
import WorkoutPlayer from "@/app/components/patient/workout/WorkoutPlayer";
import ExerciseInfoModal from "@/app/components/patient/workout/ExerciseInfoModal";
import PlanTab from "@/app/components/patient/tabs/PlanTab";
import CalendarTab from "@/app/components/patient/tabs/CalendarTab";
import DiyBuilderTab from "@/app/components/patient/tabs/DiyBuilderTab";
import MyWorkoutsScreen from "@/app/components/patient/tabs/MyWorkoutsScreen";
import PremiumStoreTab from "@/app/components/patient/tabs/PremiumStoreTab";
import ProfileTab from "@/app/components/patient/tabs/ProfileTab";
import type { Exercise, SavedProgram } from "@/app/types";

type PatientTab = "plan" | "calendar" | "diy" | "premium" | "profile";

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
  const [showMyWorkouts, setShowMyWorkouts] = useState(false);
  const [editingSavedProgramId, setEditingSavedProgramId] = useState<string | null>(null);

  const { hapticsEnabled, setHapticsEnabled, triggerHaptic } = useHaptics();
  const reminders = useReminders(triggerHaptic);
  const patientData = usePatientData();
  const planSelection = usePlanSelection(patientData.patientExercises);
  const savedProgramsData = useSavedPrograms();
  const { curatedFacts } = useCuratedFacts();

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
    onExitDiyMode: planSelection.exitDiyMode,
    triggerHaptic,
    onWorkoutLogged: patientData.refetch,
  });

  if (!loggedInPatient) return null;

  // Bottom-nav tab switches always exit DIY mode; the header avatar button
  // and the Premium tab's "go to plan" button don't — preserved exactly as
  // in the original, not unified.
  //
  // Tapping the tab that's already active doesn't switch anything, so it
  // instead pops that tab's own view stack back to its root screen (the
  // Home tab's workout detail view, the DIY tab's saved-workouts screen or
  // expanded accordion) rather than being a no-op.
  const switchTab = (tab: PatientTab) => {
    if (tab === patientTab) {
      if (tab === "plan") planSelection.setSelectedCategory(null);
      if (tab === "diy") {
        setShowMyWorkouts(false);
        setEditingSavedProgramId(null);
        planSelection.setDiyCategoryFilter(null);
        planSelection.setDiyBodyPartFilter(null);
      }
      return;
    }
    setPatientTab(tab);
    planSelection.setIsDiyMode(false);
    setShowMyWorkouts(false);
    setEditingSavedProgramId(null);
  };

  // Calendar tab hands off to the existing Plan tab day view rather than
  // rendering its own exercise list - jump to the matching week/day there.
  const handleSelectCalendarDate = (week: number, dayId: string) => {
    planSelection.setPatientSelectedWeek(week);
    planSelection.setSelectedDayFilter(dayId);
    switchTab("plan");
  };

  // Hydrates a saved program day's ordered exercise_ids against the live
  // catalog, silently dropping any id that no longer exists (e.g. an
  // exercise deleted from the catalog since the program was saved).
  const hydrateExerciseIds = (exerciseIds: string[]): Exercise[] =>
    exerciseIds.map((id) => patientData.exerciseCatalog.find((ex) => ex.id === id)).filter((ex): ex is Exercise => !!ex);

  // Loading a saved program's specific day to run it right now replaces the
  // active builder draft with just that one day, same overwrite semantics
  // the old single-workout version already had.
  const handleStartSavedProgram = (program: SavedProgram, dayNumber: number) => {
    const day = program.days.find((d) => d.day_number === dayNumber) ?? program.days[0];
    if (!day) return;
    planSelection.setDiyExercisesByDay({ [day.day_number]: hydrateExerciseIds(day.exercise_ids) });
    planSelection.setDiyActiveDay(day.day_number);
    planSelection.setDiyProgramName(program.name);
    setShowMyWorkouts(false);
    planSelection.setIsDiyMode(true);
    session.startDiyWorkoutNow();
  };

  // Loading a program to edit it replaces the whole draft with every one of
  // its days, so the builder opens exactly where the program left off.
  const handleEditSavedProgram = (program: SavedProgram) => {
    const hydratedDays = Object.fromEntries(program.days.map((d) => [d.day_number, hydrateExerciseIds(d.exercise_ids)]));
    planSelection.setDiyExercisesByDay(Object.keys(hydratedDays).length > 0 ? hydratedDays : { 1: [] });
    planSelection.setDiyActiveDay(program.days[0]?.day_number ?? 1);
    planSelection.setDiyProgramName(program.name);
    setEditingSavedProgramId(program.id);
    setShowMyWorkouts(false);
  };

  const handleSaveDiyProgram = async () => {
    const days = Object.entries(planSelection.diyExercisesByDay)
      .map(([dayNumber, exercises]) => ({ day_number: Number(dayNumber), exercise_ids: exercises.map((ex) => ex.id) }))
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

  return (
    <>
      <WorkoutPlayer session={session} triggerHaptic={triggerHaptic} />

      {/* Locked to the viewport (fixed inset-0, same full-screen-overlay
          pattern WorkoutPlayer already uses) so the outer page can never
          scroll on its own — only `main` below does, via overflow-y-auto.
          Letting the whole shell scroll as one is what caused the
          background to drag and the fixed bottom nav to detach/overlap
          during fast scrolling. */}
      <div className="fixed inset-0 overflow-hidden bg-[#FDFBF7] text-stone-900 flex flex-col">
        {session.viewingExInfo && (
          <ExerciseInfoModal exercise={session.viewingExInfo} historyData={session.exHistoryData} onClose={() => session.setViewingExInfo(null)} />
        )}

        {/* BOTTOM NAVIGATION BAR. pb-safe (used to pad for the home
            indicator) is a dead no-op class in this project (see
            MISTAKES.md) — using the same working
            max(<min>, env(safe-area-inset-bottom)) pattern as
            PatientCoachSheet instead. */}
        <nav className="fixed bottom-0 left-0 right-0 bg-white/80 backdrop-blur-md border-t border-stone-100 z-50 print:hidden pb-[max(0.5rem,env(safe-area-inset-bottom))]">
          <div className="flex justify-around items-center h-16 max-w-5xl mx-auto px-2">
            <button onClick={() => switchTab("plan")} className={`flex flex-col items-center justify-center w-16 h-full gap-1 transition-colors ${patientTab === "plan" ? "text-emerald-800" : "text-stone-400 hover:text-stone-600"}`}>
              <HomeIcon size={22} className={patientTab === "plan" ? "fill-emerald-800/15" : ""} />
              <span className="text-[10px] font-bold">ראשי</span>
            </button>

            <button onClick={() => switchTab("calendar")} className={`flex flex-col items-center justify-center w-16 h-full gap-1 transition-colors ${patientTab === "calendar" ? "text-emerald-800" : "text-stone-400 hover:text-stone-600"}`}>
              <CalendarDays size={22} className={patientTab === "calendar" ? "fill-emerald-800/15" : ""} />
              <span className="text-[10px] font-bold">לוח שנה</span>
            </button>

            {loggedInPatient.patient_type === "fitness" && (
              <button onClick={() => switchTab("diy")} className={`flex flex-col items-center justify-center w-16 h-full gap-1 transition-colors ${patientTab === "diy" ? "text-emerald-800" : "text-stone-400 hover:text-stone-600"}`}>
                <Dumbbell size={22} />
                <span className="text-[10px] font-bold">בנה אימון</span>
              </button>
            )}

            {loggedInPatient.patient_type === "fitness" && (
              <button onClick={() => switchTab("premium")} className={`flex flex-col items-center justify-center w-16 h-full gap-1 transition-colors ${patientTab === "premium" ? "text-emerald-800" : "text-stone-400 hover:text-stone-600"}`}>
                <Crown size={22} className={patientTab === "premium" ? "fill-emerald-800/15" : ""} />
                <span className="text-[10px] font-bold">תוכניות</span>
              </button>
            )}

            {/* Carries the identity marker the old top header's avatar used
                to show (first-letter circle) — moved here rather than kept
                as a separate button, since this tab already does the same
                job (open the account/profile screen). */}
            <button onClick={() => switchTab("profile")} className={`flex flex-col items-center justify-center w-16 h-full gap-1 transition-colors ${patientTab === "profile" ? "text-emerald-800" : "text-stone-400 hover:text-stone-600"}`}>
              <span
                className={`w-6 h-6 rounded-full flex items-center justify-center text-[11px] font-bold transition-colors ${
                  patientTab === "profile" ? "bg-emerald-800 text-white" : "bg-amber-500 text-stone-950"
                }`}
              >
                {loggedInPatient.full_name.charAt(0)}
              </span>
              <span className="text-[10px] font-bold">פרופיל</span>
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
              <div className="bg-amber-50 border border-amber-100 p-4 rounded-2xl flex items-start gap-4 shadow-[0_8px_30px_rgb(0,0,0,0.04)] animate-in fade-in slide-in-from-top-4">
                <div className="w-10 h-10 bg-amber-100 text-amber-700 rounded-full flex items-center justify-center shrink-0 mt-1">
                  <AlertCircle size={20} />
                </div>
                <div>
                  <h4 className="font-bold text-amber-800 text-sm">אנא אמת את כתובת המייל שלך</h4>
                  <p className="text-amber-700/80 text-xs font-medium mt-1">
                    נשלח קישור לאימות לכתובת {loggedInPatient.email}. יש לך 7 ימים לאמת את החשבון כדי שתוכל להמשיך להשתמש בפלטפורמה ולרכוש מסלולים חדשים.
                  </p>
                </div>
              </div>
            </div>
          )}

          {patientTab === "diy" && showMyWorkouts && (
            <MyWorkoutsScreen
              savedPrograms={savedProgramsData.savedPrograms}
              exerciseCatalog={patientData.exerciseCatalog}
              onBack={() => setShowMyWorkouts(false)}
              onStartProgramDay={handleStartSavedProgram}
              onEditProgram={handleEditSavedProgram}
              onDeleteProgram={savedProgramsData.deleteProgram}
            />
          )}

          {patientTab === "diy" && !showMyWorkouts && (
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
              onOpenMyWorkouts={() => setShowMyWorkouts(true)}
              onSaveDiyProgram={handleSaveDiyProgram}
              isEditingSavedProgram={editingSavedProgramId !== null}
              onCancelEditSavedProgram={() => setEditingSavedProgramId(null)}
            />
          )}

          {patientTab === "profile" && (
            <ProfileTab
              workoutLogs={patientData.workoutLogs}
              reminderTime={reminders.reminderTime}
              setReminderTime={reminders.setReminderTime}
              reminderDays={reminders.reminderDays}
              setReminderDays={reminders.setReminderDays}
              onSaveSettings={reminders.handleSaveSettings}
              hapticsEnabled={hapticsEnabled}
              setHapticsEnabled={setHapticsEnabled}
              triggerHaptic={triggerHaptic}
            />
          )}

          {patientTab === "premium" && <PremiumStoreTab onGoToPlan={() => setPatientTab("plan")} />}

          {patientTab === "plan" && (
            <PlanTab
              workoutLogs={patientData.workoutLogs}
              selectedCategory={planSelection.selectedCategory}
              setSelectedCategory={planSelection.setSelectedCategory}
              selectedDayFilter={planSelection.selectedDayFilter}
              setSelectedDayFilter={planSelection.setSelectedDayFilter}
              activePatientWeek={planSelection.activePatientWeek}
              availablePatientWeeks={planSelection.availablePatientWeeks}
              setPatientSelectedWeek={planSelection.setPatientSelectedWeek}
              isDiyMode={planSelection.isDiyMode}
              diyProgramName={planSelection.diyProgramName}
              patientCategories={session.patientCategories}
              weekFilteredExercises={session.weekFilteredPatientExercises}
              displayedExercises={session.displayedExercises}
              blocksMap={session.blocksMap}
              blocksKeys={session.blocksKeys}
              onViewExerciseInfo={(exercise) => session.setViewingExInfo(exercise)}
              onStartWorkout={session.handleStartClick}
              curatedFacts={curatedFacts}
            />
          )}

          {patientTab === "calendar" && (
            <CalendarTab
              patientExercises={patientData.patientExercises}
              workoutLogs={patientData.workoutLogs}
              patientId={loggedInPatient.id}
              programStartDate={loggedInPatient.created_at || new Date().toISOString()}
              onSelectDate={handleSelectCalendarDate}
            />
          )}
        </main>
      </div>
    </>
  );
}
