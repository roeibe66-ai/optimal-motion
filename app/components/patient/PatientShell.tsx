"use client";

import { useEffect, useState } from "react";
import { AlertCircle, Crown, Dumbbell, Home as HomeIcon, User } from "lucide-react";
import { useAuth } from "@/app/context/AuthContext";
import { useHaptics } from "@/app/hooks/useHaptics";
import { useReminders } from "@/app/hooks/useReminders";
import { usePatientData } from "@/app/hooks/usePatientData";
import { usePlanSelection } from "@/app/hooks/usePlanSelection";
import { useWorkoutSession } from "@/app/hooks/useWorkoutSession";
import { useSavedWorkouts } from "@/app/hooks/useSavedWorkouts";
import OnboardingFlow from "@/app/components/patient/OnboardingFlow";
import WorkoutPlayer from "@/app/components/patient/workout/WorkoutPlayer";
import ExerciseInfoModal from "@/app/components/patient/workout/ExerciseInfoModal";
import PlanTab from "@/app/components/patient/tabs/PlanTab";
import DiyBuilderTab from "@/app/components/patient/tabs/DiyBuilderTab";
import MyWorkoutsScreen from "@/app/components/patient/tabs/MyWorkoutsScreen";
import PremiumStoreTab from "@/app/components/patient/tabs/PremiumStoreTab";
import ProfileTab from "@/app/components/patient/tabs/ProfileTab";
import type { SavedWorkout } from "@/app/types";

type PatientTab = "plan" | "diy" | "premium" | "profile";

// Orchestrates the whole patient experience: instantiates every patient-side
// hook exactly once (so WorkoutPlayer and the tabs that need the same data —
// e.g. viewingExInfo, the workout session's blocksMap — stay in sync instead
// of each holding a disconnected copy), and mounts WorkoutPlayer/Onboarding
// alongside the tab content rather than early-returning: both are full-screen
// fixed overlays, so they visually cover the shell without needing to
// unmount it (which would otherwise reset tab/filter state under them).
export default function PatientShell() {
  const { loggedInPatient, justRegistered, setJustRegistered } = useAuth();

  const [patientTab, setPatientTab] = useState<PatientTab>("plan");
  const [showOnboarding, setShowOnboarding] = useState(false);
  const [showMyWorkouts, setShowMyWorkouts] = useState(false);
  const [editingSavedWorkoutId, setEditingSavedWorkoutId] = useState<string | null>(null);

  useEffect(() => {
    if (justRegistered) {
      // eslint-disable-next-line react-hooks/set-state-in-effect -- consuming a one-shot cross-context signal from AuthContext, not deriving from a prop
      setShowOnboarding(true);
      setJustRegistered(false);
    }
  }, [justRegistered, setJustRegistered]);

  const { hapticsEnabled, setHapticsEnabled, triggerHaptic } = useHaptics();
  const reminders = useReminders(triggerHaptic);
  const patientData = usePatientData();
  const planSelection = usePlanSelection(patientData.patientExercises);
  const savedWorkoutsData = useSavedWorkouts();

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
      {showOnboarding && <OnboardingFlow onFinish={() => setShowOnboarding(false)} />}
      <WorkoutPlayer session={session} triggerHaptic={triggerHaptic} />

      <div className="min-h-screen bg-warm-bg text-warm-text pb-24">
        {session.viewingExInfo && (
          <ExerciseInfoModal exercise={session.viewingExInfo} historyData={session.exHistoryData} onClose={() => session.setViewingExInfo(null)} />
        )}

        <header className="bg-warm-bg/80 backdrop-blur-lg border-b border-warm-wood/20 py-4 px-6 sticky top-0 z-40 shadow-sm print:hidden">
          <div className="max-w-5xl mx-auto flex justify-between items-center">
            <div className="flex items-center gap-3">
              <button onClick={() => setPatientTab("plan")} className="w-10 h-10 bg-warm-green text-warm-text rounded-2xl flex items-center justify-center font-bold shadow-lg hover:bg-warm-green-bright hover:scale-105 transition-all">
                {loggedInPatient.full_name.charAt(0)}
              </button>
              <div>
                <h1 className="font-black text-warm-text">{loggedInPatient.full_name}</h1>
                <p className="text-xs text-warm-glow font-medium">OptimalMotion</p>
              </div>
            </div>
          </div>
        </header>

        {/* BOTTOM NAVIGATION BAR */}
        <nav className="fixed bottom-0 left-0 right-0 bg-warm-surface/90 backdrop-blur-lg border-t border-warm-wood/20 z-50 print:hidden pb-safe">
          <div className="flex justify-around items-center h-16 max-w-5xl mx-auto px-2">
            <button onClick={() => switchTab("plan")} className={`flex flex-col items-center justify-center w-16 h-full gap-1 transition-colors ${patientTab === "plan" ? "text-warm-green-bright" : "text-warm-text/40 hover:text-warm-text/70"}`}>
              <HomeIcon size={22} className={patientTab === "plan" ? "fill-warm-green-bright/20" : ""} />
              <span className="text-[10px] font-bold">ראשי</span>
            </button>

            {loggedInPatient.patient_type === "fitness" && (
              <button onClick={() => switchTab("diy")} className={`flex flex-col items-center justify-center w-16 h-full gap-1 transition-colors ${patientTab === "diy" ? "text-warm-green-bright" : "text-warm-text/40 hover:text-warm-text/70"}`}>
                <Dumbbell size={22} />
                <span className="text-[10px] font-bold">בנה אימון</span>
              </button>
            )}

            {loggedInPatient.patient_type === "fitness" && (
              <button onClick={() => switchTab("premium")} className={`flex flex-col items-center justify-center w-16 h-full gap-1 transition-colors ${patientTab === "premium" ? "text-warm-glow" : "text-warm-text/40 hover:text-warm-text/70"}`}>
                <Crown size={22} className={patientTab === "premium" ? "fill-warm-glow/20" : ""} />
                <span className="text-[10px] font-bold">תוכניות</span>
              </button>
            )}

            <button onClick={() => switchTab("profile")} className={`flex flex-col items-center justify-center w-16 h-full gap-1 transition-colors ${patientTab === "profile" ? "text-warm-wood" : "text-warm-text/40 hover:text-warm-text/70"}`}>
              <User size={22} className={patientTab === "profile" ? "fill-warm-wood/20" : ""} />
              <span className="text-[10px] font-bold">פרופיל</span>
            </button>
          </div>
        </nav>

        <main className="max-w-5xl mx-auto p-4 md:p-8 mt-4 relative z-0">
          {loggedInPatient.patient_type === "fitness" && loggedInPatient.email_verified === false && (
            <div className="print:hidden mb-6">
              <div className="bg-yellow-900/20 border border-yellow-900/50 p-4 rounded-2xl flex items-start gap-4 shadow-sm animate-in fade-in slide-in-from-top-4">
                <div className="w-10 h-10 bg-yellow-500/20 text-yellow-500 rounded-full flex items-center justify-center shrink-0 mt-1">
                  <AlertCircle size={20} />
                </div>
                <div>
                  <h4 className="font-bold text-yellow-400 text-sm">אנא אמת את כתובת המייל שלך</h4>
                  <p className="text-yellow-200/70 text-xs font-medium mt-1">
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
            />
          )}

          {patientTab === "diy" && !showMyWorkouts && (
            <DiyBuilderTab
              exerciseCatalog={patientData.exerciseCatalog}
              diyMuscleFilter={planSelection.diyMuscleFilter}
              setDiyMuscleFilter={planSelection.setDiyMuscleFilter}
              diyEquipFilter={planSelection.diyEquipFilter}
              setDiyEquipFilter={planSelection.setDiyEquipFilter}
              diyCategoryFilter={planSelection.diyCategoryFilter}
              setDiyCategoryFilter={planSelection.setDiyCategoryFilter}
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
            />
          )}
        </main>
      </div>
    </>
  );
}
