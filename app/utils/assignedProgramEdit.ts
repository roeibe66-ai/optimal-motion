import type { DiyExercise } from "@/app/types";
import { ALL_SESSION_KEY, type ProgramQueueEntry } from "@/app/utils/programQueue";
import { getDiyPrescription } from "@/app/utils/diy";

// Editing an assigned program in the DIY builder: one builder day per
// workout of the program's current week, and back again into the
// patient_save_program_week RPC's sessions payload.

export interface AssignedProgramDraft {
  programId: string;
  week: number | null;
  name: string;
  byDay: Record<number, DiyExercise[]>;
  // Builder day -> the weekday slot(s) that workout already used, so it is
  // written back under the same key(s). New days get free slots on save.
  slotKeysByDay: Record<number, string[]>;
  activeDay: number;
}

export function assignedEntryToDraft(entry: ProgramQueueEntry): AssignedProgramDraft | null {
  if (!entry.programId) return null;
  const byDay: Record<number, DiyExercise[]> = {};
  const slotKeysByDay: Record<number, string[]> = {};
  entry.sessions.forEach((session, idx) => {
    const day = idx + 1;
    slotKeysByDay[day] = session.key === ALL_SESSION_KEY ? [] : session.slotKeys;
    // Same order the player runs them in: by block letter, then as assigned.
    byDay[day] = [...session.rows]
      .sort((a, b) => (a.block || "A").localeCompare(b.block || "A") || Number(a.id) - Number(b.id))
      .map((row) => ({
        ...row.exercise,
        prescription: {
          sets: Number(row.sets) || 3,
          reps: Number(row.reps) || 10,
          is_time: !!row.is_time,
          rest_time_seconds: Number(row.rest_time_seconds) || 0,
        },
        assigned: {
          block: row.block || "A",
          reps: Number(row.reps) || 0,
          reps_max: row.reps_max ?? null,
          rir: row.rir ?? null,
          weight_kg: row.weight_kg ?? null,
          notes: row.notes ?? "",
        },
      }));
  });
  return {
    programId: entry.programId,
    week: entry.weeks.length > 0 ? entry.currentWeek : null,
    name: entry.name,
    byDay,
    slotKeysByDay,
    activeDay: entry.focus ? entry.focus.session.index + 1 : 1,
  };
}

export function draftToSessionsPayload(draft: AssignedProgramDraft) {
  const days = Object.keys(draft.byDay)
    .map(Number)
    .sort((a, b) => a - b)
    .filter((d) => (draft.byDay[d] ?? []).length > 0);
  const used = new Set(days.flatMap((d) => draft.slotKeysByDay[d] ?? []));
  const freeSlot = () => {
    const slot = ["0", "1", "2", "3", "4", "5", "6"].find((k) => !used.has(k))!;
    used.add(slot);
    return slot;
  };
  // A workout with no slot of its own ("every day" rows) only stays that
  // way while it is the program's only workout.
  const needSlots = days.length > 1;

  return days.map((day) => {
    const slots = draft.slotKeysByDay[day] ?? [];
    const daysValue = slots.length > 0 ? slots.join(",") : needSlots ? freeSlot() : null;

    // Supersets survive as long as their exercises stay next to each other:
    // consecutive exercises from the same original block share a letter.
    let letterIdx = -1;
    let prevBlock: string | null = null;
    const items = (draft.byDay[day] ?? []).map((ex) => {
      const block = ex.assigned?.block ?? null;
      if (block === null || block !== prevBlock) letterIdx += 1;
      prevBlock = block;
      const p = getDiyPrescription(ex);
      const keepRange = !p.is_time && ex.assigned && ex.assigned.reps === p.reps;
      return {
        exercise_id: ex.id,
        block: String.fromCharCode(65 + (letterIdx % 26)),
        sets: p.sets,
        reps: p.reps,
        reps_max: keepRange ? ex.assigned!.reps_max : null,
        rir: ex.assigned?.rir ?? null,
        is_time: p.is_time,
        rest_time_seconds: p.rest_time_seconds,
        weight_kg: ex.assigned?.weight_kg ?? null,
        notes: ex.assigned?.notes ?? "",
      };
    });
    return { days: daysValue, items };
  });
}
