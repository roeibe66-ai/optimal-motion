"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { supabase } from "@/app/lib/supabase";
import { useAuth } from "@/app/context/AuthContext";
import { useDevDataMode } from "@/app/components/dev/devDataMode";
import { exploreFixture } from "@/app/components/dev/exploreFixtures";
import type { ExploreProgram, Package, PackageExercise, Workout } from "@/app/types";
import { notify } from "@/app/components/ui/feedback";

// The Explore tab's catalog: every program template (packages) and single
// workout (workouts, from the admin workout builder) the admin has
// published — both readable by patients only once published, via RLS —
// plus this patient's likes (package_likes / workout_likes) and which
// templates are already in their programs (patient_programs.source_package_id).
export function useExplorePrograms() {
  const { loggedInPatient } = useAuth();
  const [programs, setPrograms] = useState<ExploreProgram[]>([]);
  const [likedProgramIds, setLikedProgramIds] = useState<Set<string>>(new Set());
  const [workouts, setWorkouts] = useState<Workout[]>([]);
  const [likedWorkoutIds, setLikedWorkoutIds] = useState<Set<string>>(new Set());
  // template id -> the patient_programs row it was copied into
  const [addedPrograms, setAddedPrograms] = useState<Map<string, { programId: string; isSelfAdded: boolean }>>(new Map());

  const fetchPrograms = useCallback(async () => {
    const [{ data: packages }, { data: rows }, { data: workoutRows }] = await Promise.all([
      supabase.from("packages").select("*").eq("status", "published").order("created_at", { ascending: false }),
      supabase.from("package_exercises").select("*"),
      supabase.from("workouts").select("*").eq("status", "published").order("created_at", { ascending: false }),
    ]);
    if (workoutRows) setWorkouts((workoutRows as Workout[]).filter((w) => (w.items ?? []).length > 0));
    if (!packages) return;
    const exercisesByPackage = new Map<string, PackageExercise[]>();
    ((rows ?? []) as PackageExercise[]).forEach((row) => {
      const key = String(row.package_id);
      exercisesByPackage.set(key, [...(exercisesByPackage.get(key) ?? []), row]);
    });
    setPrograms(
      (packages as Package[])
        .map((pkg) => ({ ...pkg, exercises: exercisesByPackage.get(String(pkg.id)) ?? [] }))
        .filter((pkg) => pkg.exercises.length > 0)
    );
  }, []);

  const fetchPatientState = useCallback(async () => {
    if (!loggedInPatient) return;
    const [{ data: likes }, { data: owned }, { data: workoutLikes }] = await Promise.all([
      supabase.from("package_likes").select("package_id").eq("patient_id", loggedInPatient.id),
      supabase.from("patient_programs").select("id, source_package_id, is_self_added").eq("patient_id", loggedInPatient.id).not("source_package_id", "is", null),
      supabase.from("workout_likes").select("workout_id").eq("patient_id", loggedInPatient.id),
    ]);
    if (workoutLikes) setLikedWorkoutIds(new Set(workoutLikes.map((r) => String(r.workout_id))));
    if (likes) setLikedProgramIds(new Set(likes.map((r) => String(r.package_id))));
    if (owned) {
      setAddedPrograms(new Map(owned.map((r) => [String(r.source_package_id), { programId: r.id as string, isSelfAdded: Boolean(r.is_self_added) }])));
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [loggedInPatient?.id]);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect -- fetching from Supabase, an external system, on mount
    fetchPrograms();
  }, [fetchPrograms]);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect -- fetching from Supabase, an external system, on mount and whenever the logged-in patient changes
    fetchPatientState();
  }, [fetchPatientState]);

  // Optimistic heart toggle, reconciled with the DB via refetch.
  const toggleLike = useCallback(
    async (programId: string) => {
      if (!loggedInPatient) return;
      const isLiked = likedProgramIds.has(programId);
      setLikedProgramIds((prev) => {
        const next = new Set(prev);
        if (isLiked) next.delete(programId);
        else next.add(programId);
        return next;
      });
      if (isLiked) await supabase.from("package_likes").delete().eq("patient_id", loggedInPatient.id).eq("package_id", programId);
      else await supabase.from("package_likes").insert({ patient_id: loggedInPatient.id, package_id: programId });
      await fetchPatientState();
    },
    [loggedInPatient, likedProgramIds, fetchPatientState]
  );

  const toggleWorkoutLike = useCallback(
    async (workoutId: string) => {
      if (!loggedInPatient) return;
      const isLiked = likedWorkoutIds.has(workoutId);
      setLikedWorkoutIds((prev) => {
        const next = new Set(prev);
        if (isLiked) next.delete(workoutId);
        else next.add(workoutId);
        return next;
      });
      if (isLiked) await supabase.from("workout_likes").delete().eq("patient_id", loggedInPatient.id).eq("workout_id", workoutId);
      else await supabase.from("workout_likes").insert({ patient_id: loggedInPatient.id, workout_id: workoutId });
      await fetchPatientState();
    },
    [loggedInPatient, likedWorkoutIds, fetchPatientState]
  );

  // Adds a free published workout to the patient's plan: pinned to a weekday
  // (every week), or — when `date` (YYYY-MM-DD) is given — once, on that
  // date. Server-side check in the RPC, same as templates.
  const addWorkoutToDay = useCallback(async (workoutId: string, dayId: string, date?: string): Promise<boolean> => {
    const { error } = await supabase.rpc("add_published_workout_to_my_programs", { p_workout_id: workoutId, p_day: dayId, p_date: date ?? null });
    if (error) {
      notify(error.message.includes("premium") ? "זה אימון פרימיום — צור קשר כדי לפתוח אותו." : "לא הצלחנו להוסיף את האימון. נסה שוב.", error.message.includes("premium") ? "info" : "error");
      return false;
    }
    return true;
  }, []);

  // Copies a free published template into the patient's programs. The
  // published/free check runs server-side in the RPC.
  const addToMyPrograms = useCallback(
    async (programId: string): Promise<boolean> => {
      const { error } = await supabase.rpc("add_published_package_to_my_programs", { p_package_id: Number(programId) });
      if (error) {
        notify(error.message.includes("premium") ? "זו תוכנית פרימיום — צור קשר כדי לפתוח אותה." : "לא הצלחנו להוסיף את התוכנית. נסה שוב.", error.message.includes("premium") ? "info" : "error");
        return false;
      }
      await fetchPatientState();
      return true;
    },
    [fetchPatientState]
  );

  // Only programs the patient added themselves can be removed (RLS enforces it too).
  const removeFromMyPrograms = useCallback(
    async (programId: string): Promise<boolean> => {
      const added = addedPrograms.get(programId);
      if (!added?.isSelfAdded) return false;
      const { error } = await supabase.from("patient_programs").delete().eq("id", added.programId);
      if (error) {
        notify("לא הצלחנו להסיר את התוכנית. נסה שוב.", "error");
        return false;
      }
      await fetchPatientState();
      return true;
    },
    [addedPrograms, fetchPatientState]
  );

  // Dev-only `?data=worst|empty|one|huge` swap (break-ui stress test). Real
  // data in production and in the default "demo" mode; fixture covers
  // borrow real exercise ids so cards still get artwork.
  const devDataMode = useDevDataMode();
  const fixture = useMemo(() => {
    const exerciseIds = [...new Set([...programs.flatMap((p) => p.exercises.map((e) => e.exercise_id)), ...workouts.flatMap((w) => w.items.map((it) => it.exercise_id))])];
    return exploreFixture(devDataMode, exerciseIds);
  }, [devDataMode, programs, workouts]);
  const shownPrograms = fixture ? fixture.programs : programs;
  const shownWorkouts = fixture ? fixture.workouts : workouts;
  const shownLikedProgramIds = fixture ? new Set([...likedProgramIds, ...fixture.likedProgramIds]) : likedProgramIds;
  const shownLikedWorkoutIds = fixture ? new Set([...likedWorkoutIds, ...fixture.likedWorkoutIds]) : likedWorkoutIds;
  const shownAddedPrograms = fixture
    ? new Map([...addedPrograms, ...fixture.addedProgramIds.map((id) => [id, { programId: id, isSelfAdded: true }] as const)])
    : addedPrograms;

  const freePrograms = shownPrograms.filter((p) => p.is_free);
  const premiumPrograms = shownPrograms.filter((p) => !p.is_free);
  const likedPrograms = shownPrograms.filter((p) => shownLikedProgramIds.has(String(p.id)));

  const likedWorkouts = shownWorkouts.filter((w) => shownLikedWorkoutIds.has(String(w.id)));

  return {
    programs: shownPrograms,
    freePrograms,
    premiumPrograms,
    likedPrograms,
    likedProgramIds: shownLikedProgramIds,
    addedPrograms: shownAddedPrograms,
    toggleLike,
    addToMyPrograms,
    removeFromMyPrograms,
    workouts: shownWorkouts,
    likedWorkouts,
    likedWorkoutIds: shownLikedWorkoutIds,
    toggleWorkoutLike,
    addWorkoutToDay,
  };
}
