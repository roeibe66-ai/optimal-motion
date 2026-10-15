import "server-only";
import type { SupabaseClient } from "@supabase/supabase-js";
import type { CuratedFact, Exercise, WorkoutLog } from "@/app/types";
import type { CoachPatientContext, CoachProgramRow } from "@/app/utils/coachPrompt";

// Loads what the AI coach and the admin assistants know, with the caller's
// own RLS-scoped client (verifyCaller().client): an admin reads any
// patient, a patient only themselves. Formatting: app/utils/coachPrompt.ts.

const RECENT_LOGS = 8;

export interface SharedKnowledge {
  principles: string | null;
  facts: CuratedFact[];
  exercises: Exercise[];
}

export async function loadSharedKnowledge(client: SupabaseClient): Promise<SharedKnowledge> {
  const [principles, facts, exercises] = await Promise.all([
    client.from("coach_principles").select("body").order("id", { ascending: false }).limit(1).maybeSingle(),
    client.from("curated_facts").select("*").eq("is_hidden", false).order("created_at", { ascending: false }),
    client
      .from("exercises")
      .select("id, name_he, name_en, name_display_preference, categories, equipment, difficulty_level, target_muscle, prime_movers, synergists"),
  ]);
  return {
    principles: (principles.data?.body as string | undefined) ?? null,
    facts: (facts.data ?? []) as CuratedFact[],
    exercises: (exercises.data ?? []) as Exercise[],
  };
}

export async function loadPatientContext(client: SupabaseClient, patientId: string, exercises: Exercise[]): Promise<CoachPatientContext | null> {
  const [patient, programs, rows, logs] = await Promise.all([
    client.from("patients").select("*").eq("id", patientId).maybeSingle(),
    client.from("patient_programs").select("id, name, weekly_target").eq("patient_id", patientId),
    client
      .from("patient_exercises")
      .select("program_id, exercise_id, block, sets, reps, reps_max, is_time, rir, weight_kg, notes, patient_notes, week")
      .eq("patient_id", patientId),
    client.from("workout_logs").select("*").eq("patient_id", patientId).order("created_at", { ascending: false }).limit(RECENT_LOGS),
  ]);
  if (!patient.data) return null;

  const exerciseNames = Object.fromEntries(exercises.map((e) => [e.id, e.name_he || e.name_en || "תרגיל"]));
  const programById = new Map((programs.data ?? []).map((p) => [p.id as string, p]));

  // Only each program's latest week — earlier weeks are history, not the plan.
  const latestWeek = new Map<string, number>();
  for (const r of rows.data ?? []) {
    const key = (r.program_id as string | null) ?? "";
    latestWeek.set(key, Math.max(latestWeek.get(key) ?? 0, Number(r.week) || 0));
  }

  const programRows: CoachProgramRow[] = (rows.data ?? [])
    .filter((r) => (Number(r.week) || 0) === latestWeek.get((r.program_id as string | null) ?? ""))
    .map((r) => {
      const program = r.program_id ? programById.get(r.program_id as string) : undefined;
      return {
        programName: (program?.name as string | undefined) ?? "תוכנית",
        weeklyTarget: (program?.weekly_target as number | null | undefined) ?? null,
        exerciseName: exerciseNames[r.exercise_id as string] ?? "תרגיל",
        block: (r.block as string | null) ?? null,
        sets: (r.sets as number | null) ?? null,
        reps: r.reps != null ? Number(r.reps) : null,
        repsMax: r.reps_max != null ? Number(r.reps_max) : null,
        isTime: !!r.is_time,
        rir: (r.rir as number | null) ?? null,
        weightKg: r.weight_kg != null ? Number(r.weight_kg) : null,
        therapistNote: (r.notes as string | null)?.trim() || null,
        patientNote: (r.patient_notes as string | null)?.trim() || null,
      };
    });

  const firstName = (patient.data.first_name as string | null)?.trim() || (patient.data.full_name as string | null)?.trim().split(/\s+/)[0] || null;
  const row = patient.data as Record<string, unknown>;
  const profile = row.onboarding_completed_at
    ? {
        goals: (row.training_goals as string[] | null) ?? [],
        experience: (row.training_experience as string | null) ?? null,
        days: (row.training_days as number | null) ?? null,
        minutes: (row.session_minutes as number | null) ?? null,
        location: (row.training_location as string | null) ?? null,
        homeEquipment: (row.home_equipment as string[] | null) ?? [],
        addressForm: (row.address_form as string | null) ?? null,
        birthYear: (row.birth_year as number | null) ?? null,
        heightCm: (row.height_cm as number | null) ?? null,
        weightKg: row.weight_kg != null ? Number(row.weight_kg) : null,
        limitationAreas: (row.limitation_areas as string[] | null) ?? [],
        recentSurgery: (row.recent_surgery as boolean | null) ?? null,
      }
    : null;
  return {
    firstName,
    patientType: (patient.data.patient_type as string | null) ?? null,
    profile,
    programs: programRows,
    logs: (logs.data ?? []) as WorkoutLog[],
    exerciseNames,
    today: new Date().toISOString().slice(0, 10),
  };
}
