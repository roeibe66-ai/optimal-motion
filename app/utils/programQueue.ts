import type { PatientProgram, QueueLogRef, WorkoutLog } from "@/app/types";
import { isInWeek, toDateKey, type HydratedPatientExercise, type SessionExercise } from "@/app/hooks/useWorkoutSession";

// The patient's week: which workouts are planned on which days, and which
// of them are done — including ones done on a different day than planned.
//
// - Programs with weekday slots (patient_exercises.scheduled_days) are
//   planned on those days, like the therapist set them. A workout logged on
//   another day still completes its planned day: the log records the slot it
//   was for (workout_logs.session_key) — see QueueLogRef.
// - Programs with no slots and a weekly goal (patient_programs.weekly_target,
//   "3 times a week") are flexible: N workouts, any days.
// - Programs with no slots and no goal run every day (the old meaning of an
//   empty scheduled_days).
// - One-time workouts from Explore sit on their date.

export const ALL_SESSION_KEY = "all"; // a flexible program's single workout

export interface ProgramSession {
  key: string; // selectedDayFilter value that selects its rows (a slot id, or ALL_SESSION_KEY)
  slotKeys: string[]; // every weekday slot holding this same workout
  index: number; // 0-based position among the week's distinct workouts
  rows: HydratedPatientExercise[];
}

export interface PlannedWorkout {
  id: string;
  slotKey: string; // the slot it's logged under — a weekday id, or ALL_SESSION_KEY when flexible
  date: string | null; // YYYY-MM-DD it's planned for; null = flexible (any day)
  session: ProgramSession;
  doneLog: WorkoutLog | null;
  doneOn: string | null; // YYYY-MM-DD it was actually done
}

export interface ProgramQueueEntry {
  key: string; // program id, or SELF_KEY for legacy DIY rows without one
  programId: string | null;
  name: string;
  isAmrap: boolean;
  isFlexible: boolean;
  isOneTime: boolean;
  scheduledDate: string | null;
  weeks: number[]; // numbered program weeks; empty = the same every week
  currentWeek: number | null; // program week of the week being shown
  sessions: ProgramSession[]; // that week's distinct workouts (what the builder edits)
  planned: PlannedWorkout[]; // that week's planned workouts, in day order
  weeklyTarget: number;
  doneThisWeek: number;
  // What to do next: today's workout if not done, else the earliest one
  // this week still open, else the next upcoming one. null = week complete.
  focus: PlannedWorkout | null;
  editedByPatientAt: string | null;
  canEdit: boolean;
}

const SELF_KEY = "__self__";
const ALL_DAYS = ["0", "1", "2", "3", "4", "5", "6"];
const DAY_MS = 86400000;

const slotKeysOf = (row: { scheduled_days?: string | null }) =>
  row.scheduled_days && row.scheduled_days.trim() !== "" ? row.scheduled_days.split(",").map((d) => d.trim()).filter(Boolean) : [];

export const sundayOf = (date: Date) => new Date(date.getFullYear(), date.getMonth(), date.getDate() - date.getDay());
const addDays = (date: Date, n: number) => new Date(date.getFullYear(), date.getMonth(), date.getDate() + n);

export const DAY_NAMES = ["ראשון", "שני", "שלישי", "רביעי", "חמישי", "שישי", "שבת"];
export const dayNameOfKey = (dateKey: string) => DAY_NAMES[new Date(`${dateKey}T00:00:00`).getDay()];

// "יום ראשון" for a slot-planned workout, "אימון 2" for a flexible one.
export const plannedLabel = (item: PlannedWorkout, entry: ProgramQueueEntry) =>
  item.date ? `יום ${dayNameOfKey(item.date)}` : entry.sessions.length > 1 ? `אימון ${item.session.index + 1}` : "אימון";

// One program week's distinct workouts. Slots whose rows are identical (one
// workout on Sun+Tue) are one workout; rows with no slot belong to all.
export const buildSessions = (weekRows: HydratedPatientExercise[], everyDay = false): ProgramSession[] => {
  const used = Array.from(new Set(weekRows.flatMap(slotKeysOf))).sort((a, b) => Number(a) - Number(b));
  const slots = used.length > 0 ? used : everyDay ? ALL_DAYS : [];
  if (slots.length === 0) return weekRows.length > 0 ? [{ key: ALL_SESSION_KEY, slotKeys: [], index: 0, rows: weekRows }] : [];

  const sessions: ProgramSession[] = [];
  const bySignature = new Map<string, ProgramSession>();
  for (const slot of slots) {
    const rows = weekRows.filter((r) => {
      const keys = slotKeysOf(r);
      return keys.length === 0 || keys.includes(slot);
    });
    if (rows.length === 0) continue;
    const signature = rows.map((r) => r.id).sort().join(",");
    const existing = bySignature.get(signature);
    if (existing) {
      existing.slotKeys.push(slot);
      continue;
    }
    const session: ProgramSession = { key: slot, slotKeys: [slot], index: sessions.length, rows };
    sessions.push(session);
    bySignature.set(signature, session);
  }
  return sessions;
};

// Does a log belong to this program? New logs carry program_id; older ones
// only the program name they were logged under.
const logMatches = (log: WorkoutLog, programId: string | null, name: string) => (log.program_id ? log.program_id === programId : log.category === name);

// Program week a calendar week falls in: weeks since the program was
// assigned (its created_at), clamped to the weeks it has. null = before it.
const programWeekFor = (weeks: number[], createdAt: string | undefined, weekStart: Date): number | null => {
  if (weeks.length === 0) return null;
  if (!createdAt) return weeks[0];
  const elapsed = Math.round((weekStart.getTime() - sundayOf(new Date(createdAt)).getTime()) / (7 * DAY_MS));
  if (elapsed < 0) return weeks[0];
  return weeks[Math.min(elapsed, weeks.length - 1)];
};

export function buildWeekPlan(
  rows: HydratedPatientExercise[],
  programs: PatientProgram[],
  logs: WorkoutLog[], // newest first
  weekOf: Date = new Date(),
  today: Date = new Date()
): ProgramQueueEntry[] {
  const todayKey = toDateKey(today);
  const weekStart = sundayOf(weekOf);
  const weekDays = ALL_DAYS.map((_, i) => toDateKey(addDays(weekStart, i)));
  const weekLogs = logs.filter((l) => {
    const d = toDateKey(new Date(l.created_at));
    return d >= weekDays[0] && d <= weekDays[6];
  });
  const programById = new Map(programs.map((p) => [p.id, p]));

  const groups = new Map<string, HydratedPatientExercise[]>();
  for (const row of rows) {
    const key = row.program_id ?? SELF_KEY;
    groups.set(key, [...(groups.get(key) ?? []), row]);
  }

  const entries: ProgramQueueEntry[] = [];
  for (const [key, programRows] of groups) {
    const programId = key === SELF_KEY ? null : key;
    const program = programId ? programById.get(programId) : undefined;
    const name = programRows[0].program_name ?? program?.name ?? "האימונים שלי";
    const isAmrap = programRows[0].program_format === "amrap";

    const dated = programRows.filter((r) => r.scheduled_date);
    const scheduledDate = dated.length > 0 ? dated.map((r) => r.scheduled_date!).sort()[0] : null;
    if (scheduledDate && (scheduledDate < weekDays[0] || scheduledDate > weekDays[6])) continue;

    // Nothing is planned before the program was assigned.
    const createdKey = program?.created_at ? toDateKey(new Date(program.created_at)) : null;
    if (!scheduledDate && createdKey && createdKey > weekDays[6]) continue;

    const weeks = Array.from(new Set(programRows.map((r) => r.week).filter((w): w is number => w != null))).sort((a, b) => a - b);
    const currentWeek = programWeekFor(weeks, program?.created_at, weekStart);
    const weekRows = currentWeek == null ? programRows : programRows.filter((r) => isInWeek(r, currentWeek));
    const hasSlots = weekRows.some((r) => slotKeysOf(r).length > 0);
    const isFlexible = !scheduledDate && !hasSlots && program?.weekly_target != null;
    const sessions = buildSessions(weekRows, !scheduledDate && !hasSlots && !isFlexible);
    if (sessions.length === 0) continue;

    const programLogs = weekLogs.filter((l) => logMatches(l, programId, name));
    const unused = [...programLogs].reverse(); // oldest first
    const take = (pred: (l: WorkoutLog) => boolean) => {
      const idx = unused.findIndex(pred);
      return idx === -1 ? null : unused.splice(idx, 1)[0];
    };

    let planned: PlannedWorkout[];
    if (scheduledDate) {
      planned = [{ id: `${key}:${scheduledDate}`, slotKey: sessions[0].key, date: scheduledDate, session: sessions[0], doneLog: null, doneOn: null }];
    } else if (isFlexible) {
      planned = Array.from({ length: program!.weekly_target! }, (_, i) => ({
        id: `${key}:${weekDays[0]}:flex${i}`,
        slotKey: sessions[i % sessions.length].key,
        date: null,
        session: sessions[i % sessions.length],
        doneLog: null,
        doneOn: null,
      }));
    } else {
      planned = sessions
        .flatMap((session) => session.slotKeys.map((slot) => ({ slot, session })))
        .sort((a, b) => Number(a.slot) - Number(b.slot))
        .map(({ slot, session }) => ({
          id: `${key}:${weekDays[0]}:${slot}`,
          slotKey: slot,
          date: weekDays[Number(slot)],
          session,
          doneLog: null,
          doneOn: null,
        }));
    }

    if (createdKey && !scheduledDate) planned = planned.filter((p) => p.date === null || p.date >= createdKey);
    if (planned.length === 0) continue;

    // Match logs to planned workouts: first the ones logged for that exact
    // slot (done any day), then older logs by date (done on the day), then
    // whatever's left fills the remaining ones in order (done another day).
    const markDone = (item: PlannedWorkout, log: WorkoutLog | null) => {
      if (!log) return;
      item.doneLog = log;
      item.doneOn = toDateKey(new Date(log.created_at));
    };
    for (const item of planned) markDone(item, take((l) => l.session_key === item.slotKey));
    for (const item of planned) if (!item.doneLog && item.date) markDone(item, take((l) => !l.session_key && toDateKey(new Date(l.created_at)) === item.date));
    for (const item of planned) if (!item.doneLog && !item.date) markDone(item, take(() => true));

    const open = planned.filter((p) => !p.doneLog);
    const focus =
      open.find((p) => p.date === todayKey) ??
      open.find((p) => p.date !== null && p.date < todayKey) ??
      open.find((p) => p.date === null) ??
      open.find((p) => p.date !== null && p.date > todayKey) ??
      null;

    entries.push({
      key,
      programId,
      name,
      isAmrap,
      isFlexible,
      isOneTime: scheduledDate !== null,
      scheduledDate,
      weeks,
      currentWeek,
      sessions,
      planned,
      weeklyTarget: planned.length,
      doneThisWeek: planned.filter((p) => p.doneLog).length,
      focus,
      editedByPatientAt: program?.patient_edited_at ?? null,
      canEdit: !!programId && !isAmrap && scheduledDate === null,
    });
  }

  // Due today first, then overdue this week, then flexible, then the rest.
  const rank = (e: ProgramQueueEntry) => {
    const f = e.focus;
    if (!f) return 4;
    if (f.date === todayKey) return 0;
    if (f.date !== null && f.date < todayKey) return 1;
    if (f.date === null) return 2;
    return 3;
  };
  return entries.sort((a, b) => rank(a) - rank(b));
}

// What a log for this planned workout records, so it completes this exact
// planned day even when it's done on another day.
export const queueRefFor = (entry: ProgramQueueEntry, item: PlannedWorkout): QueueLogRef | null =>
  entry.programId ? { program_id: entry.programId, program_week: entry.weeks.length > 0 ? entry.currentWeek : null, session_key: item.slotKey } : null;

// A planned workout's rows grouped into blocks, the shape QuickLogSheet and
// the player take.
export const blocksOf = (rows: HydratedPatientExercise[]) => {
  const blocksMap: Record<string, SessionExercise[]> = {};
  rows.forEach((pe) => {
    const b = pe.block || "A";
    (blocksMap[b] ??= []).push(pe);
  });
  return { blocksMap, blocksKeys: Object.keys(blocksMap).sort() };
};
