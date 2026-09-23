"use client";

import { useCallback, useEffect, useState } from "react";
import { supabase } from "@/app/lib/supabase";
import { useAuth } from "@/app/context/AuthContext";
import type { Workout } from "@/app/types";

// The Explore tab's catalog (workouts, open read to every authenticated
// patient) plus this specific patient's own likes (workout_likes, scoped to
// them via RLS) — fetched together since Explore always needs both to know
// which hearts to render filled.
export function useWorkouts() {
  const { loggedInPatient } = useAuth();
  const [workouts, setWorkouts] = useState<Workout[]>([]);
  const [likedWorkoutIds, setLikedWorkoutIds] = useState<Set<string>>(new Set());

  const fetchWorkouts = useCallback(async () => {
    const { data } = await supabase.from("workouts").select("*").order("sort_order", { ascending: true });
    if (data) setWorkouts(data as Workout[]);
  }, []);

  const fetchLikes = useCallback(async () => {
    if (!loggedInPatient) return;
    const { data } = await supabase.from("workout_likes").select("workout_id").eq("patient_id", loggedInPatient.id);
    if (data) setLikedWorkoutIds(new Set(data.map((r) => r.workout_id as string)));
  }, [loggedInPatient]);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect -- fetching from Supabase, an external system, on mount
    fetchWorkouts();
  }, [fetchWorkouts]);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect -- fetching from Supabase, an external system, on mount and whenever the logged-in patient changes
    fetchLikes();
  }, [fetchLikes]);

  // Optimistic toggle — flips the local set immediately (Explore's heart
  // buttons need to feel instant), then reconciles with the actual DB state
  // via refetch; a failed write just gets silently corrected back on
  // refetch rather than shown as an error, same tolerance the rest of the
  // app's like-adjacent UI (favorites, saves) doesn't have anywhere yet to
  // be consistent with, so this is the first and sets the bar simply.
  const toggleLike = useCallback(
    async (workoutId: string) => {
      if (!loggedInPatient) return;
      const isLiked = likedWorkoutIds.has(workoutId);
      setLikedWorkoutIds((prev) => {
        const next = new Set(prev);
        if (isLiked) next.delete(workoutId);
        else next.add(workoutId);
        return next;
      });
      if (isLiked) {
        await supabase.from("workout_likes").delete().eq("patient_id", loggedInPatient.id).eq("workout_id", workoutId);
      } else {
        await supabase.from("workout_likes").insert({ patient_id: loggedInPatient.id, workout_id: workoutId });
      }
      await fetchLikes();
    },
    [loggedInPatient, likedWorkoutIds, fetchLikes]
  );

  const freeWorkouts = workouts.filter((w) => w.is_free);
  const newReleases = [...workouts].sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime()).slice(0, 8);
  const likedWorkouts = workouts.filter((w) => likedWorkoutIds.has(w.id));

  return { workouts, freeWorkouts, newReleases, likedWorkouts, likedWorkoutIds, toggleLike, refetchWorkouts: fetchWorkouts };
}
