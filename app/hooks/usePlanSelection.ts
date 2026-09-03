"use client";

import { useState } from "react";
import type { Exercise } from "@/app/types";
import type { HydratedPatientExercise } from "@/app/hooks/useWorkoutSession";

// Everything the Plan/DIY tabs let the patient pick: which week/category/day
// they're viewing, and the exercises/filters/name for a DIY workout being
// built. Kept separate from useWorkoutSession, which only consumes this
// selection (as input params) to compute what the session actually looks
// like — this hook doesn't know anything about blocks, sets, or timers.
export function usePlanSelection(patientExercises: HydratedPatientExercise[]) {
  const [patientSelectedWeek, setPatientSelectedWeek] = useState(1);
  const [selectedCategory, setSelectedCategory] = useState<string | null>(null);
  const [selectedDayFilter, setSelectedDayFilter] = useState(new Date().getDay().toString());

  const [isDiyMode, setIsDiyMode] = useState(false);
  const [diySelectedExercises, setDiySelectedExercises] = useState<Exercise[]>([]);
  const [diyMuscleFilter, setDiyMuscleFilter] = useState("all");
  const [diyEquipFilter, setDiyEquipFilter] = useState("all");
  const [diyCategoryFilter, setDiyCategoryFilter] = useState("all");
  const [diyBodyPartFilter, setDiyBodyPartFilter] = useState("all");
  const [diyScheduleDay, setDiyScheduleDay] = useState(new Date().getDay().toString());
  const [diyWorkoutName, setDiyWorkoutName] = useState("אימון מותאם אישית");

  const availablePatientWeeks = Array.from(new Set(patientExercises.map((ex) => ex.week || 1))).sort((a, b) => a - b);
  const activePatientWeek = availablePatientWeeks.includes(patientSelectedWeek) ? patientSelectedWeek : availablePatientWeeks[0] || 1;

  // Called when a workout ends/closes — clears the DIY builder's picked
  // exercises along with exiting DIY mode, matching the original's closeWorkout.
  const exitDiyMode = () => {
    setIsDiyMode(false);
    setDiySelectedExercises([]);
  };

  return {
    patientSelectedWeek,
    setPatientSelectedWeek,
    availablePatientWeeks,
    activePatientWeek,

    selectedCategory,
    setSelectedCategory,
    selectedDayFilter,
    setSelectedDayFilter,

    isDiyMode,
    setIsDiyMode,
    diySelectedExercises,
    setDiySelectedExercises,
    diyMuscleFilter,
    setDiyMuscleFilter,
    diyEquipFilter,
    setDiyEquipFilter,
    diyCategoryFilter,
    setDiyCategoryFilter,
    diyBodyPartFilter,
    setDiyBodyPartFilter,
    diyScheduleDay,
    setDiyScheduleDay,
    diyWorkoutName,
    setDiyWorkoutName,
    exitDiyMode,
  };
}
