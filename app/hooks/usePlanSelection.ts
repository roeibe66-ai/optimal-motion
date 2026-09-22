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
  // The DIY builder's draft: a full weekly program, keyed by ordinal builder
  // day (1, 2, 3, ...) — not a calendar weekday. diyActiveDay is whichever
  // day tab is currently open in the builder; "start workout now" runs only
  // that day's exercises (a live session is always one sitting).
  const [diyExercisesByDay, setDiyExercisesByDay] = useState<Record<number, Exercise[]>>({ 1: [] });
  const [diyActiveDay, setDiyActiveDay] = useState(1);
  const [diyEquipFilter, setDiyEquipFilter] = useState("all");
  // DiyBuilderTab's accordion navigation: which top-level category tab is
  // expanded (null = all collapsed) and, within it, which body-region
  // sub-list entry is selected (null = still showing the region list, not
  // exercise cards yet). Not filters in the old sense — there's no "all"
  // state anymore, since the accordion always narrows one level at a time.
  const [diyCategoryFilter, setDiyCategoryFilter] = useState<string | null>(null);
  const [diyBodyPartFilter, setDiyBodyPartFilter] = useState<string | null>(null);
  // Only used by useWorkoutSession's "promote this finished DIY session into
  // your permanent weekly plan" prompt (a patient_exercises write, unrelated
  // to the builder's own ordinal day tabs) — not surfaced in the builder UI.
  const [diyScheduleDay, setDiyScheduleDay] = useState(new Date().getDay().toString());
  const [diyProgramName, setDiyProgramName] = useState("תוכנית מותאמת אישית");

  const availablePatientWeeks = Array.from(new Set(patientExercises.map((ex) => ex.week || 1))).sort((a, b) => a - b);
  const activePatientWeek = availablePatientWeeks.includes(patientSelectedWeek) ? patientSelectedWeek : availablePatientWeeks[0] || 1;

  const addDiyDay = () => {
    const existingDays = Object.keys(diyExercisesByDay).map(Number);
    const nextDayNumber = existingDays.length === 0 ? 1 : Math.max(...existingDays) + 1;
    setDiyExercisesByDay((prev) => ({ ...prev, [nextDayNumber]: [] }));
    setDiyActiveDay(nextDayNumber);
  };

  const removeDiyDay = (dayNumber: number) => {
    const remainingDays = Object.keys(diyExercisesByDay).map(Number).filter((d) => d !== dayNumber);
    if (remainingDays.length === 0) return; // always keep at least one day
    setDiyExercisesByDay((prev) => {
      const next = { ...prev };
      delete next[dayNumber];
      return next;
    });
    if (diyActiveDay === dayNumber) setDiyActiveDay(Math.min(...remainingDays));
  };

  // Called when a live workout session ends/closes. Deliberately does NOT
  // clear diyExercisesByDay any more — with a multi-day program, "start now"
  // only test-runs the active day, and the rest of the draft (other days)
  // should survive that the same way it already survives a tab switch away
  // from "diy" and back. Loading a saved program to start/edit it explicitly
  // overwrites the draft instead (see PatientShell).
  const exitDiyMode = () => {
    setIsDiyMode(false);
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
    diyExercisesByDay,
    setDiyExercisesByDay,
    diyActiveDay,
    setDiyActiveDay,
    addDiyDay,
    removeDiyDay,
    diyEquipFilter,
    setDiyEquipFilter,
    diyCategoryFilter,
    setDiyCategoryFilter,
    diyBodyPartFilter,
    setDiyBodyPartFilter,
    diyScheduleDay,
    setDiyScheduleDay,
    diyProgramName,
    setDiyProgramName,
    exitDiyMode,
  };
}
