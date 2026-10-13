import type { Exercise } from "@/app/types";

// Per-exercise notes (patient_exercises.notes = the therapist's,
// .patient_notes = the patient's own; package_exercises.notes on templates).
// A one-sided exercise also offers a side ("ימין בלבד") — not a column of its
// own, just a quick prefix on the note, so it reads naturally wherever the
// note is shown.

// One leg / one arm at a time, by name — the catalog has no "unilateral"
// flag. Errs on the side of offering the chips: they're optional.
const UNILATERAL_EN = /\b(single|one)[- ]?(leg|arm|hand)|\bunilateral\b|\bpistol\b|\bbulgarian\b|\bsplit squat\b|\blunges?\b|\bstep[- ]?ups?\b|\bside plank\b|\bcopenhagen\b|\barcher\b|\bsuitcase\b/i;
const UNILATERAL_HE = /רגל אחת|יד אחת|זרוע אחת|חד[- ]צדדי|לאנג|בולגרי|פיסטול|עליות מדרגה|פלאנק צד/;

export function isUnilateral(ex: Pick<Exercise, "name_en" | "name_he"> | null | undefined): boolean {
  if (!ex) return false;
  return UNILATERAL_EN.test(ex.name_en ?? "") || UNILATERAL_HE.test(ex.name_he ?? "");
}

export const SIDE_OPTIONS = [
  { id: "both", label: "שני הצדדים" },
  { id: "right", label: "ימין בלבד" },
  { id: "left", label: "שמאל בלבד" },
] as const;
export type SideId = (typeof SIDE_OPTIONS)[number]["id"];

const SEPARATOR = " · ";

// The side a note currently starts with, if any.
export function sideOfNote(note: string | null | undefined): SideId | null {
  const text = (note ?? "").trimStart();
  return SIDE_OPTIONS.find((o) => text === o.label || text.startsWith(o.label + SEPARATOR))?.id ?? null;
}

// Sets (or, with null / the same side again, clears) the note's side prefix,
// keeping whatever was written after it.
export function withSide(note: string | null | undefined, side: SideId | null): string {
  const text = (note ?? "").trim();
  const current = SIDE_OPTIONS.find((o) => o.id === sideOfNote(text));
  const rest = current ? text.slice(current.label.length).replace(/^\s*·\s*/, "") : text;
  const next = SIDE_OPTIONS.find((o) => o.id === side);
  if (!next || next.id === current?.id) return rest;
  return rest ? `${next.label}${SEPARATOR}${rest}` : next.label;
}

export const NOTE_MAX_LENGTH = 300;
