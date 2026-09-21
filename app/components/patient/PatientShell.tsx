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
import { useSavedWorkouts } from "@/app/hooks/useSavedWorkouts";
import WorkoutPlayer from "@/app/components/patient/workout/WorkoutPlayer";
import ExerciseInfoModal from "@/app/components/patient/workout/ExerciseInfoModal";
import PlanTab from "@/app/components/patient/tabs/PlanTab";
import CalendarTab from "@/app/components/patient/tabs/CalendarTab";
import DiyBuilderTab from "@/app/components/patient/tabs/DiyBuilderTab";
import MyWorkoutsScreen from "@/app/components/patient/tabs/MyWorkoutsScreen";
import PremiumStoreTab from "@/app/components/patient/tabs/PremiumStoreTab";
import ProfileTab from "@/app/components/patient/tabs/ProfileTab";
import type { SavedWorkout } from "@/app/types";

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
  const [editingSavedWorkoutId, setEditingSavedWorkoutId] = useState<string | null>(null);

  const { hapticsEnabled, setHapticsEnabled, triggerHaptic } = useHaptics();
  const reminders = useReminders(triggerHaptic);
  const patientData = usePatientData();
  const planSelection = usePlanSelection(patientData.patientExercises);
  const savedWorkoutsData = useSavedWorkouts();
  const { curatedFacts } = useCuratedFacts();

  const session = useWorkoutSession({
    patientExercises: patientData.patientExercises,
    exerciseCatalog: patientData.exerciseCatalog,
    workoutLogs: patientData.workoutLogs,
    activePatientWeek: planSelection.activePatientWeek,
    selectedCategory: planSelection.selectedCategory,
    selectedDayFilter: planSelection.selectedDayFilter,
    isDiyMode: planSelection.isDiyMode,
    diySelectedExercises: planSelection.diySelectedExercises,
    diyScheduleDay: planSelection.diyScheduleDay,
    onExitDiyMode: planSelection.exitDiyMode,
    triggerHaptic,
    onWorkoutLogged: patientData.refetch,
  });

  if (!loggedInPatient) return null;

  // Bottom-nav tab switches always exit DIY mode; the header avatar button
  // and the Premium tab's "go to plan" button don't — preserved exactly as
  // in the original, not unified.
  const switchTab = (tab: PatientTab) => {
    setPatientTab(tab);
    planSelection.setIsDiyMode(false);
    setShowMyWorkouts(false);
    setEditingSavedWorkoutId(null);
  };

  // Calendar tab hands off to the existing Plan tab day view rather than
  // rendering its own exercise list - jump to the matching week/day there.
  const handleSelectCalendarDate = (week: number, dayId: string) => {
    planSelection.setPatientSelectedWeek(week);
    planSelection.setSelectedDayFilter(dayId);
    switchTab("plan");
  };

  // Hydrates a saved workout's ordered exercise_ids against the live catalog,
  // silently dropping any id that no longer exists (e.g. an exercise deleted
  // from the catalog since the workout was saved).
  const hydrateSavedWorkout = (workout: SavedWorkout) =>
    workout.exercise_ids
      .map((id) => patientData.exerciseCatalog.find((ex) => ex.id === id))
      .filter((ex): ex is (typeof patientData.exerciseCatalog)[number] => !!ex);

  const handleStartSavedWorkout = (workout: SavedWorkout) => {
    planSelection.setDiySelectedExercises(hydrateSavedWorkout(workout));
    planSelection.setDiyScheduleDay(workout.scheduled_day || planSelection.diyScheduleDay);
    planSelection.setDiyWorkoutName(workout.name);
    setShowMyWorkouts(false);
    planSelection.setIsDiyMode(true);
    session.startDiyWorkoutNow();
  };

  const handleEditSavedWorkout = (workout: SavedWorkout) => {
    planSelection.setDiySelectedExercises(hydrateSavedWorkout(workout));
    planSelection.setDiyScheduleDay(workout.scheduled_day || planSelection.diyScheduleDay);
    planSelection.setDiyWorkoutName(workout.name);
    setEditingSavedWorkoutId(workout.id);
    setShowMyWorkouts(false);
  };

  const handleSaveDiyWorkout = async () => {
    if (planSelection.diySelectedExercises.length === 0) return;
    await savedWorkoutsData.saveWorkout({
      editingId: editingSavedWorkoutId,
      name: planSelection.diyWorkoutName,
      scheduledDay: planSelection.diyScheduleDay,
      exerciseIds: planSelection.diySelectedExercises.map((ex) => ex.id),
    });
    setEditingSavedWorkoutId(null);
  };

  return (
    <>
      <WorkoutPlayer session={session} triggerHaptic={triggerHaptic} />

      <div className="min-h-screen bg-[#FDFBF7] text-stone-900 pb-24">
        {session.viewingExInfo && (
          <ExerciseInfoModal exercise={session.viewingExInfo} historyData={session.exHistoryData} onClose={() => session.setViewingExInfo(null)} />
        )}

        {/* BOTTOM NAVIGATION BAR */}
        <nav className="fixed bottom-0 left-0 right-0 bg-white/80 backdrop-blur-md border-t border-stone-100 z-50 print:hidden pb-safe">
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
            screens instead of sitting flush against the viewport edge. */}
        <main className="max-w-5xl mx-auto px-4 md:px-8 pb-4 md:pb-8 pt-[max(1rem,env(safe-area-inset-top))] relative z-0">
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
              savedWorkouts={savedWorkoutsData.savedWorkouts}
              exerciseCatalog={patientData.exerciseCatalog}
              onBack={() => setShowMyWorkouts(false)}
              onStartWorkout={handleStartSavedWorkout}
              onEditWorkout={handleEditSavedWorkout}
              onDeleteWorkout={savedWorkoutsData.deleteWorkout}
            />
          )}

          {patientTab === "diy" && !showMyWorkouts && (
            <DiyBuilderTab
              exerciseCatalog={patientData.exerciseCatalog}
              diyEquipFilter={planSelection.diyEquipFilter}
              setDiyEquipFilter={planSelection.setDiyEquipFilter}
              diyCategoryFilter={planSelection.diyCategoryFilter}
              setDiyCategoryFilter={planSelection.setDiyCategoryFilter}
              diyBodyPartFilter={planSelection.diyBodyPartFilter}
              setDiyBodyPartFilter={planSelection.setDiyBodyPartFilter}
              diySelectedExercises={planSelection.diySelectedExercises}
              setDiySelectedExercises={planSelection.setDiySelectedExercises}
              diyScheduleDay={planSelection.diyScheduleDay}
              setDiyScheduleDay={planSelection.setDiyScheduleDay}
              diyWorkoutName={planSelection.diyWorkoutName}
              setDiyWorkoutName={planSelection.setDiyWorkoutName}
              onStartDiyWorkoutNow={() => {
                planSelection.setIsDiyMode(true);
                session.startDiyWorkoutNow();
              }}
              onOpenMyWorkouts={() => setShowMyWorkouts(true)}
              onSaveDiyWorkout={handleSaveDiyWorkout}
              isEditingSavedWorkout={editingSavedWorkoutId !== null}
              onCancelEditSavedWorkout={() => setEditingSavedWorkoutId(null)}
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
              diyWorkoutName={planSelection.diyWorkoutName}
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
