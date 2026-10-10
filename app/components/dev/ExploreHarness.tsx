"use client";

import { useEffect, useState } from "react";
import { AuthProvider } from "@/app/context/AuthContext";
import { supabase } from "@/app/lib/supabase";
import { useExplorePrograms } from "@/app/hooks/useExplorePrograms";
import ExploreTab from "@/app/components/patient/tabs/ExploreTab";
import type { Exercise } from "@/app/types";

// Renders ExploreTab the way PatientShell does (same <main> width and
// padding), fed by the real useExplorePrograms hook so the `?data=` fixtures
// enter at the same boundary as production data. Actions are inert here.
function Harness() {
  const explore = useExplorePrograms();
  const [exerciseCatalog, setExerciseCatalog] = useState<Exercise[]>([]);

  useEffect(() => {
    supabase
      .from("exercises")
      .select("*")
      .then(({ data }) => setExerciseCatalog((data as Exercise[]) ?? []));
  }, []);

  const inert = async () => false;

  return (
    <div className="min-h-screen bg-page text-fg">
      <main className="max-w-5xl w-full mx-auto px-4 md:px-8 pt-6 pb-32">
        <ExploreTab
          freePrograms={explore.freePrograms}
          premiumPrograms={explore.premiumPrograms}
          likedPrograms={explore.likedPrograms}
          likedProgramIds={explore.likedProgramIds}
          addedPrograms={explore.addedPrograms}
          onToggleLike={() => {}}
          onAddProgram={inert}
          onRemoveProgram={inert}
          exerciseCatalog={exerciseCatalog}
          workouts={explore.workouts}
          likedWorkouts={explore.likedWorkouts}
          likedWorkoutIds={explore.likedWorkoutIds}
          onToggleWorkoutLike={() => {}}
          onStartWorkout={() => {}}
          onAddWorkoutToDay={inert}
        />
      </main>
    </div>
  );
}

export default function ExploreHarness() {
  return (
    <AuthProvider>
      <Harness />
    </AuthProvider>
  );
}
