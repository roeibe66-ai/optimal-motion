import type { DiyExercise, DiyPrescription } from "@/app/types";

export const DEFAULT_DIY_PRESCRIPTION: DiyPrescription = { sets: 3, reps: 10, is_time: false, rest_time_seconds: 60 };

export const getDiyPrescription = (ex: DiyExercise): DiyPrescription => ex.prescription ?? DEFAULT_DIY_PRESCRIPTION;

// Bounds and step for each builder stepper.
export const DIY_LIMITS = {
  sets: { min: 1, max: 10, step: 1 },
  reps: { min: 1, max: 100, step: 1 },
  seconds: { min: 5, max: 600, step: 5 },
  rest: { min: 0, max: 600, step: 15 },
} as const;

export const clampDiy = (value: number, limit: { min: number; max: number }) => Math.min(limit.max, Math.max(limit.min, Math.round(value)));

