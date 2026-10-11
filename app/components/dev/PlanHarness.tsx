"use client";

import { useEffect, useMemo, useState } from "react";
import { AuthContext, type AuthContextValue } from "@/app/context/AuthContext";
import { TRANSLATIONS } from "@/app/constants/translations";
import { isInWeek, programNameOf, type SessionExercise } from "@/app/hooks/useWorkoutSession";
import PlanTab from "@/app/components/patient/tabs/PlanTab";
import DevDataToggle from "@/app/components/dev/DevDataToggle";
import FeedbackHost from "@/app/components/ui/FeedbackHost";
import { useDevDataMode } from "@/app/components/dev/devDataMode";
import { planFixture } from "@/app/components/dev/planFixtures";

// Renders PlanTab the way PatientShell does (same <main> width/padding),
// fed by planFixtures through the same props usePatientData +
// useWorkoutSession produce — the program/day filtering and block grouping
// below mirror useWorkoutSession. A synthetic AuthContext supplies the
// patient's name, the same trick ProgramSimulatorModal uses. Actions are inert.
export default function PlanHarness() {
  const mode = useDevDataMode();
  const fixture = useMemo(() => planFixture(mode), [mode]);
  const [selectedCategory, setSelectedCategory] = useState<string | null>(null);
  const [selectedDayFilter, setSelectedDayFilter] = useState(new Date().getDay().toString());
  // `?loading=1` holds PlanTab in its first-load state (skeletons) — read
  // after mount, since the URL isn't available during the server render.
  const [isLoading, setIsLoading] = useState(false);
  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect -- reading the URL, browser-only
    setIsLoading(new URLSearchParams(window.location.search).has("loading"));
  }, []);

  const weekFiltered = fixture.exercises.filter((pe) => isInWeek(pe, 1));
  const patientCategories = Array.from(new Set(weekFiltered.map(programNameOf)));
  const displayedExercises = weekFiltered.filter((pe) => {
    if (!selectedCategory || programNameOf(pe) !== selectedCategory) return false;
    if (!pe.scheduled_days || pe.scheduled_days.trim() === "") return true;
    return pe.scheduled_days.split(",").includes(selectedDayFilter);
  });
  const blocksMap: Record<string, SessionExercise[]> = {};
  displayedExercises.forEach((pe) => {
    const b = pe.block || "A";
    (blocksMap[b] ??= []).push(pe);
  });
  const blocksKeys = Object.keys(blocksMap).sort();

  const authValue: AuthContextValue = {
    lang: "he",
    setLang: () => {},
    t: TRANSLATIONS.he,
    currentView: "patient",
    setCurrentView: () => {},
    loggedInPatient: { id: "-1", user_id: "dev", role: "patient", full_name: fixture.fullName, first_name: fixture.firstName ?? null, patient_type: "fitness" },
    setLoggedInPatient: () => {},
    handleLogout: () => {},
  };

  return (
    <AuthContext.Provider value={authValue}>
      <div className="min-h-screen bg-page text-fg">
        <main className="max-w-5xl w-full mx-auto px-4 md:px-8 pt-6 pb-32">
          <PlanTab
            key={mode}
            isLoading={isLoading}
            workoutLogs={isLoading ? [] : fixture.workoutLogs}
            selectedCategory={selectedCategory}
            setSelectedCategory={setSelectedCategory}
            selectedDayFilter={selectedDayFilter}
            setSelectedDayFilter={setSelectedDayFilter}
            activePatientWeek={1}
            isDiyMode={false}
            diyProgramName=""
            patientCategories={isLoading ? [] : patientCategories}
            weekFilteredExercises={weekFiltered}
            displayedExercises={displayedExercises}
            blocksMap={blocksMap}
            blocksKeys={blocksKeys}
            onViewExerciseInfo={() => {}}
            onStartWorkout={() => {}}
            onWorkoutLogged={() => {}}
            curatedFacts={fixture.curatedFacts}
            hasAnyAssignedExercises={fixture.exercises.length > 0}
            starterPrograms={fixture.starterPrograms}
            onAddStarterProgram={async () => false}
          />
        </main>
        <DevDataToggle />
        <FeedbackHost />
      </div>
    </AuthContext.Provider>
  );
}
