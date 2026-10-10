"use client";

import { useMemo } from "react";
import { AuthContext, type AuthContextValue } from "@/app/context/AuthContext";
import { TRANSLATIONS } from "@/app/constants/translations";
import { useWorkoutSession } from "@/app/hooks/useWorkoutSession";
import WorkoutPlayer from "@/app/components/patient/workout/WorkoutPlayer";
import DevDataToggle from "@/app/components/dev/DevDataToggle";
import FeedbackHost from "@/app/components/ui/FeedbackHost";
import { useDevDataMode } from "@/app/components/dev/devDataMode";
import { playerFixture, type PlayerFixture } from "@/app/components/dev/playerFixtures";

const AUTH: AuthContextValue = {
  lang: "he",
  setLang: () => {},
  t: TRANSLATIONS.he,
  currentView: "patient",
  setCurrentView: () => {},
  loggedInPatient: { id: "-1", user_id: "dev", role: "patient", full_name: "מטופל לדוגמה", patient_type: "fitness" },
  setLoggedInPatient: () => {},
  handleLogout: () => {},
};

// Runs the real WorkoutPlayer through the real useWorkoutSession — the same
// adHocSession path an Explore workout / saved DIY day takes, and the same
// synthetic-patient setup as the admin WorkoutSimulatorModal. isSimulation
// keeps every write off; its admin-only banner is hidden here so the layout
// under test is the one a patient sees.
function Session({ fixture }: { fixture: PlayerFixture }) {
  const session = useWorkoutSession({
    patientExercises: [],
    exerciseCatalog: fixture.exercises.map((e) => e.exercise),
    workoutLogs: fixture.workoutLogs,
    activePatientWeek: 1,
    selectedCategory: null,
    selectedDayFilter: "all",
    isDiyMode: true,
    diySelectedExercises: [],
    diyScheduleDay: "",
    adHocSession: { title: fixture.title, exercises: fixture.exercises },
    onExitDiyMode: () => {},
    triggerHaptic: () => {},
    onWorkoutLogged: () => {},
    isSimulation: true,
  });

  return (
    <>
      {!session.isWorkoutMode && (
        <div className="p-8 flex flex-col items-center gap-3 text-center">
          <p className="font-bold">{fixture.title}</p>
          <button onClick={session.startDiyWorkoutNow} className="px-5 py-2.5 rounded-full bg-btn-primary text-btn-primary-fg font-bold">
            Start workout (dev)
          </button>
        </div>
      )}
      <WorkoutPlayer session={session} triggerHaptic={() => {}} />
    </>
  );
}

export default function PlayerHarness() {
  const mode = useDevDataMode();
  const fixture = useMemo(() => playerFixture(mode), [mode]);
  return (
    <AuthContext.Provider value={AUTH}>
      <style>{`[data-simulation-banner] { display: none !important; }`}</style>
      <div className="min-h-screen bg-page text-fg">
        <Session key={mode} fixture={fixture} />
        {/* Above the player's z-[150] so it stays usable mid-workout. */}
        <div className="relative z-[400]">
          <DevDataToggle />
        </div>
        <FeedbackHost />
      </div>
    </AuthContext.Provider>
  );
}
