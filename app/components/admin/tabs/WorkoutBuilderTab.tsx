"use client";

import { useEffect, useState } from "react";
import { ArrowDown, ArrowUp, CheckCircle2, Crown, Dumbbell, Edit3, Loader2, Play, Plus, Search, Send, Sparkles, Timer, Trash2, X } from "lucide-react";
import { supabase } from "@/app/lib/supabase";
import { formatRepTarget, getExerciseName, parseRepInput, parseWeightInput } from "@/app/utils/format";
import type { Exercise, Lang, Patient, Workout, WorkoutFormat, WorkoutItem } from "@/app/types";
import WorkoutSimulatorModal from "@/app/components/admin/tabs/WorkoutSimulatorModal";
import AssignToPatientsModal, { type AssignResult, type AssignSchedule } from "@/app/components/admin/AssignToPatientsModal";
import { ExerciseThumb } from "@/app/components/ExerciseMedia";
import WorkoutBuilderAssistant from "@/app/components/admin/WorkoutBuilderAssistant";
import type { BuilderProposal } from "@/app/actions/workoutBuilderAssistant";
import { MAX_CATALOG_TITLE_LENGTH } from "@/app/utils/validation";

interface WorkoutBuilderTabProps {
  exercises: Exercise[];
  patients: Patient[];
  lang: Lang;
}

interface Draft {
  id: string | null; // null = new workout
  title: string;
  description: string;
  format: WorkoutFormat;
  timeCapMinutes: string;
  items: WorkoutItem[];
}

const EMPTY_DRAFT: Draft = { id: null, title: "", description: "", format: "standard", timeCapMinutes: "12", items: [] };

// Keeps only the fields each format uses, with sane numeric bounds — shared
// by save and by "Run/Test" on an unsaved draft.
const normalizeItems = (items: WorkoutItem[], format: WorkoutFormat): WorkoutItem[] =>
  items.map((it, idx) =>
    format === "amrap"
      ? { exercise_id: it.exercise_id, reps: Math.max(1, Number(it.reps) || 1), ...repsMaxOf(it), is_time: it.is_time, ...weightOf(it) }
      : {
          exercise_id: it.exercise_id,
          block: (it.block || String.fromCharCode(65 + (idx % 26))).toUpperCase().slice(0, 1),
          sets: Math.max(1, Number(it.sets) || 1),
          reps: Math.max(1, Number(it.reps) || 1),
          ...repsMaxOf(it),
          is_time: it.is_time,
          rir: it.rir === null || it.rir === undefined || String(it.rir) === "" ? null : Number(it.rir),
          rest_time_seconds: Math.max(0, Number(it.rest_time_seconds) || 0),
          ...weightOf(it),
        }
  );

// reps_max (top of a rep range like 8-12) is stored only for counted reps
// and only when it's above reps, so single-target items stay unchanged.
function repsMaxOf(it: WorkoutItem): { reps_max?: number } {
  const max = Number(it.reps_max);
  return !it.is_time && Number.isFinite(max) && max > Math.max(1, Number(it.reps) || 1) ? { reps_max: max } : {};
}

// weight_kg is stored only when set (and never for timed exercises), so items
// without one stay exactly as they were.
function weightOf(it: WorkoutItem): { weight_kg?: number } {
  const w = Number(it.weight_kg);
  return !it.is_time && Number.isFinite(w) && w > 0 ? { weight_kg: w } : {};
}

const newItem = (exerciseId: string, index: number, format: WorkoutFormat): WorkoutItem =>
  format === "amrap"
    ? { exercise_id: exerciseId, reps: 10, is_time: false }
    : { exercise_id: exerciseId, block: String.fromCharCode(65 + (index % 26)), sets: 3, reps: 10, is_time: false, rir: null, rest_time_seconds: 60 };

// Admin "workout builder": single workouts — a regular sets/reps session or a
// time-capped AMRAP — authored here and published to the patient Explore tab
// (the `workouts` table). Separate from the smart builder's multi-week
// program templates (packages), which publish to Explore from the program
// library. Patients can start a published workout right away or pin it to a
// weekday in their plan. Alternatively ("שיוך למטופלים") the admin assigns a
// copy straight to specific patients, without publishing it to everyone.
export default function WorkoutBuilderTab({ exercises, patients, lang }: WorkoutBuilderTabProps) {
  const [workouts, setWorkouts] = useState<Workout[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [draft, setDraft] = useState<Draft | null>(null);
  const [busyId, setBusyId] = useState<string | null>(null);
  const [simulating, setSimulating] = useState<Workout | null>(null);
  const [assigning, setAssigning] = useState<Workout | null>(null);

  const fetchWorkouts = async () => {
    const { data } = await supabase.from("workouts").select("*").order("created_at", { ascending: false });
    if (data) setWorkouts(data as Workout[]);
    setIsLoading(false);
  };

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect -- fetching from Supabase, an external system, on mount
    fetchWorkouts();
  }, []);

  const exerciseById = (id: string) => exercises.find((e) => e.id === id);

  const updateWorkout = async (workout: Workout, patch: Partial<Workout>) => {
    setBusyId(workout.id);
    const { error } = await supabase.from("workouts").update({ ...patch, updated_at: new Date().toISOString() }).eq("id", workout.id);
    setBusyId(null);
    if (error) alert("שגיאה: " + error.message);
    else fetchWorkouts();
  };

  const handleDelete = async (workout: Workout) => {
    if (!confirm(`למחוק לצמיתות את האימון "${workout.title}"? מטופלים שכבר הוסיפו אותו לתוכנית שלהם ישמרו את העותק שלהם.`)) return;
    setBusyId(workout.id);
    const { error } = await supabase.from("workouts").delete().eq("id", workout.id);
    setBusyId(null);
    if (error) alert("שגיאה במחיקה: " + error.message);
    else fetchWorkouts();
  };

  const patientNameOf = (id: string) => patients.find((p) => String(p.id) === id)?.full_name ?? id;

  // Mirrors add_published_workout_to_my_programs (the patient's own "add to
  // my plan" RPC), but admin-side and for any workout, published or not:
  // week null = recurs every week on the chosen weekdays; a one-time date
  // pins it to that date's weekday.
  const handleAssign = async (workout: Workout, patientIds: string[], programName: string, schedule: AssignSchedule | null): Promise<AssignResult> => {
    const failed: AssignResult["failed"] = [];
    const isAmrap = workout.format === "amrap";
    const scheduledDate = schedule?.kind === "date" ? schedule.date : null;
    const scheduledDays =
      schedule?.kind === "date" ? String(new Date(`${schedule.date}T00:00:00`).getDay()) : schedule?.kind === "weekdays" ? schedule.days.join(",") : String(new Date().getDay());

    for (const patientId of patientIds) {
      const { data: program, error: programErr } = await supabase
        .from("patient_programs")
        .insert([
          {
            patient_id: patientId,
            name: programName,
            source_workout_id: workout.id,
            format: workout.format,
            time_cap_seconds: workout.time_cap_seconds ?? null,
          },
        ])
        .select()
        .single();
      if (programErr) {
        failed.push({ patientName: patientNameOf(patientId), message: programErr.message });
        continue;
      }
      const inserts = workout.items.map((item, idx) => ({
        patient_id: patientId,
        program_id: program.id,
        exercise_id: item.exercise_id,
        block: isAmrap ? "A" : item.block || String.fromCharCode(65 + (idx % 26)),
        sets: isAmrap ? 1 : (item.sets ?? 3),
        reps: item.reps,
        reps_max: !item.is_time && item.reps_max && item.reps_max > item.reps ? item.reps_max : null,
        rir: item.rir ?? null,
        is_time: item.is_time,
        notes: "",
        scheduled_days: scheduledDays,
        scheduled_date: scheduledDate,
        week: null,
        rest_time_seconds: item.rest_time_seconds ?? 60,
        weight_kg: item.weight_kg ?? null,
      }));
      const { error } = await supabase.from("patient_exercises").insert(inserts);
      if (error) {
        await supabase.from("patient_programs").delete().eq("id", program.id);
        failed.push({ patientName: patientNameOf(patientId), message: error.message });
      }
    }
    return { failed };
  };

  const openEditor = (workout?: Workout) => {
    setDraft(
      workout
        ? {
            id: workout.id,
            title: workout.title,
            description: workout.description ?? "",
            format: workout.format,
            timeCapMinutes: workout.time_cap_seconds ? String(Math.round(workout.time_cap_seconds / 60)) : "12",
            items: workout.items ?? [],
          }
        : EMPTY_DRAFT
    );
  };

  return (
    <div className="max-w-6xl mx-auto">
      <header className="mb-10 flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl md:text-4xl font-black text-fg tracking-tight">יצירת אימונים</h1>
          <p className="text-[13px] text-muted mt-1.5">אימונים בודדים — רגילים או AMRAP — לפרסום בטאב &quot;גלה&quot; לכולם, או לשיוך למטופלים ספציפיים.</p>
        </div>
        <button
          onClick={() => openEditor()}
          className="shrink-0 flex items-center justify-center gap-2 bg-btn-primary text-btn-primary-fg px-6 py-3 rounded-2xl font-black hover:bg-btn-primary-hover active:bg-btn-primary-active transition-colors"
        >
          <Plus size={18} /> אימון חדש
        </button>
      </header>

      {isLoading ? (
        <div className="flex items-center gap-2 text-muted text-sm">
          <Loader2 size={14} className="animate-spin" /> טוען אימונים...
        </div>
      ) : workouts.length === 0 ? (
        <div className="on-light text-center p-14 text-muted bg-surface rounded-[1.75rem] border border-line">
          <Timer size={36} className="mx-auto mb-4 text-muted" />
          עדיין לא יצרת אימונים. לחץ &quot;אימון חדש&quot; כדי להתחיל.
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
          {workouts.map((workout) => {
            const isPublished = workout.status === "published";
            const isBusy = busyId === workout.id;
            return (
              <div key={workout.id} className="on-light bg-surface rounded-[1.75rem] border border-line p-6 flex flex-col gap-4">
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0">
                    <h3 className="text-lg font-black text-fg truncate">{workout.title}</h3>
                    <p className="text-xs font-bold text-muted mt-1">
                      {workout.format === "amrap" ? `AMRAP · ${Math.round((workout.time_cap_seconds ?? 0) / 60)} דקות · ` : "רגיל · "}
                      {workout.items.length} תרגילים
                    </p>
                  </div>
                  <div className="shrink-0 flex flex-col items-end gap-1.5">
                    <span className={`text-[10px] font-extrabold px-2.5 py-1 rounded-full ${isPublished ? "bg-accent/15 text-accent-fg" : "bg-surface-alt text-muted"}`}>
                      {isPublished ? "מפורסם בטאב גלה" : "טיוטה"}
                    </span>
                    <span className={`text-[10px] font-extrabold px-2.5 py-1 rounded-full ${workout.is_free ? "bg-surface-alt text-muted" : "bg-warm text-on-accent"}`}>
                      {workout.is_free ? "חינמי" : "פרימיום"}
                    </span>
                  </div>
                </div>

                <div className="flex flex-wrap gap-2 mt-auto pt-2 border-t border-line">
                  <button
                    onClick={() => setSimulating(workout)}
                    disabled={workout.items.length === 0}
                    className="flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-btn-primary text-btn-primary-fg text-xs font-extrabold hover:bg-btn-primary-hover active:bg-btn-primary-active transition-colors disabled:bg-disabled disabled:text-disabled-fg disabled:pointer-events-none"
                  >
                    <Play size={13} fill="currentColor" /> הרץ / בדוק
                  </button>
                  <button
                    onClick={() => setAssigning(workout)}
                    disabled={workout.items.length === 0}
                    className="on-light flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-surface-alt text-fg text-xs font-bold hover:bg-line transition-colors disabled:opacity-30 disabled:pointer-events-none"
                  >
                    <Send size={13} /> שיוך למטופלים
                  </button>
                  <button
                    onClick={() => openEditor(workout)}
                    className="on-light flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-surface-alt text-fg text-xs font-bold hover:bg-line transition-colors"
                  >
                    <Edit3 size={13} /> ערוך
                  </button>
                  <button
                    onClick={() => updateWorkout(workout, { status: isPublished ? "draft" : "published" })}
                    disabled={isBusy || workout.items.length === 0}
                    className="on-light flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-surface-alt text-fg text-xs font-bold hover:bg-line transition-colors disabled:opacity-30"
                  >
                    <CheckCircle2 size={13} /> {isPublished ? "הסר מגלה" : "פרסם לגלה"}
                  </button>
                  <button
                    onClick={() => updateWorkout(workout, { is_free: !workout.is_free })}
                    disabled={isBusy}
                    className="on-light flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-surface-alt text-fg text-xs font-bold hover:bg-line transition-colors disabled:opacity-30"
                  >
                    <Crown size={13} /> {workout.is_free ? "הפוך לפרימיום" : "הפוך לחינמי"}
                  </button>
                  <button
                    onClick={() => handleDelete(workout)}
                    disabled={isBusy}
                    className="flex items-center gap-1.5 px-3 py-2 rounded-xl bg-danger text-on-danger text-xs font-bold hover:brightness-110 transition-colors disabled:opacity-30 mr-auto"
                  >
                    <Trash2 size={13} /> מחק
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {assigning && (
        <AssignToPatientsModal
          heading="שיוך אימון למטופלים"
          subtitle={assigning.title}
          defaultProgramName={assigning.title}
          patients={patients}
          askSchedule
          onClose={() => setAssigning(null)}
          onAssign={(ids, name, schedule) => handleAssign(assigning, ids, name, schedule)}
        />
      )}

      {simulating && <WorkoutSimulatorModal workout={simulating} exerciseCatalog={exercises} onClose={() => setSimulating(null)} />}

      {draft && (
        <WorkoutEditor
          onSimulate={setSimulating}
          draft={draft}
          setDraft={setDraft}
          exercises={exercises}
          exerciseById={exerciseById}
          lang={lang}
          onClose={() => setDraft(null)}
          onSaved={() => {
            setDraft(null);
            fetchWorkouts();
          }}
        />
      )}
    </div>
  );
}

// Rep field that takes a single number or a range ("8-12"). Keeps its own
// text while typing (so "8-" isn't rejected mid-entry) and commits on blur.
function RepsField({ item, onCommit, className }: { item: WorkoutItem; onCommit: (patch: Partial<WorkoutItem>) => void; className: string }) {
  const shown = item.is_time ? String(item.reps) : formatRepTarget(item.reps, item.reps_max);
  const [text, setText] = useState(shown);
  const [prevShown, setPrevShown] = useState(shown);
  if (shown !== prevShown) {
    // the item changed from outside (AI apply, is_time toggle) — follow it
    setPrevShown(shown);
    setText(shown);
  }
  const commit = () => {
    const parsed = parseRepInput(text, !item.is_time);
    if (!parsed) return setText(shown);
    onCommit({ reps: parsed.reps, reps_max: parsed.reps_max });
    setText(item.is_time ? String(parsed.reps) : formatRepTarget(parsed.reps, parsed.reps_max));
  };
  return (
    <input
      type="text"
      inputMode="numeric"
      dir="ltr"
      value={text}
      placeholder={item.is_time ? "30" : "10 / 8-12"}
      onChange={(e) => setText(e.target.value)}
      onBlur={commit}
      onKeyDown={(e) => e.key === "Enter" && (e.target as HTMLInputElement).blur()}
      className={className}
    />
  );
}

function WorkoutEditor({
  draft,
  setDraft,
  exercises,
  exerciseById,
  lang,
  onClose,
  onSaved,
  onSimulate,
}: {
  onSimulate: (workout: Workout) => void;
  draft: Draft;
  setDraft: (d: Draft | null) => void;
  exercises: Exercise[];
  exerciseById: (id: string) => Exercise | undefined;
  lang: Lang;
  onClose: () => void;
  onSaved: () => void;
}) {
  const [query, setQuery] = useState("");
  const [categoryFilter, setCategoryFilter] = useState<string | null>(null);
  const [isSaving, setIsSaving] = useState(false);
  // AI panel: always docked on wide screens; a toggleable overlay below xl.
  const [isAssistantOpen, setIsAssistantOpen] = useState(false);
  const isAmrap = draft.format === "amrap";

  const set = (patch: Partial<Draft>) => setDraft({ ...draft, ...patch });
  const setItem = (idx: number, patch: Partial<WorkoutItem>) => set({ items: draft.items.map((it, i) => (i === idx ? { ...it, ...patch } : it)) });
  const moveItem = (idx: number, delta: number) => {
    const target = idx + delta;
    if (target < 0 || target >= draft.items.length) return;
    const items = [...draft.items];
    [items[idx], items[target]] = [items[target], items[idx]];
    set({ items });
  };

  const categories = Array.from(new Set(exercises.flatMap((e) => e.categories ?? []))).sort((a, b) => a.localeCompare(b, "he"));
  const normalized = query.trim().toLowerCase();
  const searchResults =
    normalized || categoryFilter
      ? exercises
          .filter((e) => !categoryFilter || (e.categories ?? []).includes(categoryFilter))
          .filter((e) => !normalized || (e.name_he ?? "").toLowerCase().includes(normalized) || (e.name_en ?? "").toLowerCase().includes(normalized))
          .slice(0, 40)
      : [];

  const totalSets = isAmrap ? 0 : draft.items.reduce((acc, it) => acc + (Number(it.sets) || 0), 0);
  const estimatedMinutes = isAmrap ? Number(draft.timeCapMinutes) || 0 : Math.max(draft.items.length ? 5 : 0, Math.round(totalSets * 1.5));

  const applyProposal = (proposal: BuilderProposal) => {
    const before = draft;
    setDraft({
      ...draft,
      title: draft.title.trim() ? draft.title : proposal.title,
      format: proposal.format,
      timeCapMinutes: proposal.timeCapMinutes ? String(proposal.timeCapMinutes) : draft.timeCapMinutes,
      items: proposal.items,
    });
    return () => setDraft(before);
  };

  const requestClose = () => {
    if (draft.items.length > 0 && !confirm("לצאת בלי לשמור? השינויים באימון יאבדו.")) return;
    onClose();
  };

  const save = async (publish: boolean) => {
    const title = draft.title.trim();
    if (!title) return alert("חובה לתת שם לאימון");
    if (draft.items.length === 0) return alert("הוסף לפחות תרגיל אחד");
    const minutes = Number(draft.timeCapMinutes);
    if (isAmrap && (!Number.isFinite(minutes) || minutes < 1)) return alert("ל-AMRAP צריך משך של דקה לפחות");

    // Only the fields each format uses are stored.
    const items = normalizeItems(draft.items, draft.format);
    const row = {
      title,
      description: draft.description.trim() || null,
      format: draft.format,
      time_cap_seconds: isAmrap ? Math.round(minutes * 60) : null,
      items,
      exercise_ids: items.map((it) => it.exercise_id),
      updated_at: new Date().toISOString(),
      ...(publish ? { status: "published" } : {}),
    };

    setIsSaving(true);
    const { error } = draft.id ? await supabase.from("workouts").update(row).eq("id", draft.id) : await supabase.from("workouts").insert([row]);
    setIsSaving(false);
    if (error) return alert("שגיאה בשמירה: " + error.message);
    onSaved();
  };

  const simulate = () => {
    if (draft.items.length === 0) return alert("הוסף לפחות תרגיל אחד כדי להריץ");
    const minutes = Number(draft.timeCapMinutes);
    if (isAmrap && (!Number.isFinite(minutes) || minutes < 1)) return alert("ל-AMRAP צריך משך של דקה לפחות");
    // Runs the draft as currently edited — nothing is saved.
    const items = normalizeItems(draft.items, draft.format);
    onSimulate({
      id: draft.id ?? "draft",
      title: draft.title.trim() || "אימון ללא שם",
      description: draft.description,
      format: draft.format,
      time_cap_seconds: isAmrap ? Math.round(minutes * 60) : null,
      status: "draft",
      is_free: true,
      items,
      exercise_ids: items.map((it) => it.exercise_id),
      created_at: new Date().toISOString(),
    });
  };

  const inputClass = "on-light w-full bg-surface border border-line-input rounded-xl px-3.5 py-2.5 text-sm font-bold text-fg outline-none focus:border-focus focus:ring-2 focus:ring-focus";
  const fieldClass = "on-light w-full h-10 bg-surface border border-line-input rounded-lg px-2 text-center text-sm font-bold text-fg tabular-nums outline-none focus:border-focus focus:ring-2 focus:ring-focus";

  const assistant = (
    <WorkoutBuilderAssistant
      draft={draft}
      exercises={exercises}
      exerciseById={exerciseById}
      lang={lang}
      onApply={applyProposal}
      onClose={() => setIsAssistantOpen(false)}
    />
  );

  return (
    <div className="fixed inset-0 z-[60] bg-page flex flex-col">
      {/* Top bar: title + live summary on one side, every action on the other. */}
      <header className="shrink-0 bg-elevated border-b border-line px-4 md:px-6 py-3 flex flex-wrap items-center gap-3">
        <button onClick={requestClose} className="p-2 -m-1 text-muted hover:text-fg transition-colors" aria-label="סגור">
          <X size={22} />
        </button>
        <div className="min-w-0 flex-1">
          <h2 className="text-lg font-black text-fg truncate">{draft.title.trim() || (draft.id ? "עריכת אימון" : "אימון חדש")}</h2>
          <p className="text-[11px] font-bold text-muted">
            {draft.items.length} תרגילים
            {isAmrap ? ` · AMRAP ${draft.timeCapMinutes || "?"} דק׳` : totalSets > 0 ? ` · ${totalSets} סטים · ~${estimatedMinutes} דק׳` : ""}
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <button
            type="button"
            onClick={() => setIsAssistantOpen((v) => !v)}
            className="xl:hidden flex items-center gap-1.5 px-3.5 py-2.5 rounded-xl bg-accent/15 text-accent-fg text-sm font-extrabold hover:bg-accent/25 transition-colors"
          >
            <Sparkles size={15} /> עוזר AI
          </button>
          <button type="button" onClick={simulate} className="flex items-center gap-1.5 px-3.5 py-2.5 rounded-xl bg-line text-fg text-sm font-bold hover:bg-line/70 transition-colors">
            <Play size={14} fill="currentColor" /> הרץ / בדוק
          </button>
          <button
            type="button"
            onClick={() => save(false)}
            disabled={isSaving}
            className="px-4 py-2.5 rounded-xl border-[1.5px] border-btn-secondary text-accent-fg text-sm font-bold hover:bg-btn-secondary-hover transition-colors disabled:opacity-50"
          >
            {draft.id ? "שמור" : "שמור כטיוטה"}
          </button>
          <button
            type="button"
            onClick={() => save(true)}
            disabled={isSaving}
            className="px-5 py-2.5 rounded-xl bg-btn-primary text-btn-primary-fg text-sm font-black hover:bg-btn-primary-hover active:bg-btn-primary-active transition-colors disabled:bg-disabled disabled:text-disabled-fg"
          >
            {isSaving ? "שומר..." : "שמור ופרסם לגלה"}
          </button>
        </div>
      </header>

      <div className="flex-1 min-h-0 flex">
        <main className="on-light flex-1 min-w-0 overflow-y-auto bg-surface text-fg">
          <div className="max-w-4xl mx-auto p-4 md:p-8 flex flex-col gap-8 pb-24">
            {/* Details */}
            <section className="flex flex-col gap-4">
              <input
                value={draft.title}
                onChange={(e) => set({ title: e.target.value })}
                maxLength={MAX_CATALOG_TITLE_LENGTH}
                placeholder="שם האימון (מה שהמטופל יראה)"
                className="on-light w-full bg-transparent border-b-2 border-line-input focus:border-focus px-1 py-2 text-2xl md:text-3xl font-black text-fg placeholder:text-muted/60 outline-none"
              />
              <span className={`block text-[10px] font-bold -mt-3 tabular-nums text-start ${draft.title.length >= MAX_CATALOG_TITLE_LENGTH ? "text-warm-fg" : "text-muted"}`}>
                {draft.title.length}/{MAX_CATALOG_TITLE_LENGTH}
              </span>
              <div className="grid md:grid-cols-[auto_1fr] gap-4 items-start">
                <div className="flex bg-surface-alt p-1 rounded-xl border border-line">
                  {(["standard", "amrap"] as const).map((fmt) => (
                    <button
                      key={fmt}
                      type="button"
                      onClick={() => set({ format: fmt })}
                      className={`px-4 py-2 rounded-lg text-sm font-bold transition-colors ${draft.format === fmt ? "bg-accent text-on-accent" : "text-muted hover:text-fg"}`}
                    >
                      {fmt === "standard" ? "רגיל (סטים וחזרות)" : "AMRAP (לפי זמן)"}
                    </button>
                  ))}
                </div>
                {isAmrap ? (
                  <label className="flex items-center gap-3 bg-accent/5 border border-accent/20 rounded-xl px-4 py-2">
                    <Timer size={18} className="text-accent-fg shrink-0" />
                    <span className="text-sm font-bold text-fg">משך</span>
                    <input type="number" min={1} value={draft.timeCapMinutes} onChange={(e) => set({ timeCapMinutes: e.target.value })} className={`${fieldClass} w-20`} />
                    <span className="text-sm font-bold text-muted">דקות, כמה שיותר סבבים</span>
                  </label>
                ) : (
                  <p className="text-xs font-medium text-muted md:pt-2.5">תרגילים עם אותה אות בלוק מבוצעים ברצף (סופר-סט), והמנוחה היא אחרי האחרון בבלוק.</p>
                )}
              </div>
              <textarea
                value={draft.description}
                onChange={(e) => set({ description: e.target.value })}
                rows={2}
                placeholder="תיאור (אופציונלי)"
                className={`${inputClass} font-medium resize-none`}
              />
            </section>

            {/* Exercises */}
            <section className="flex flex-col gap-3">
              <h3 className="text-sm font-black text-fg">{isAmrap ? "התרגילים בכל סבב" : "התרגילים"}</h3>
              {draft.items.length === 0 && (
                <div className="on-light text-center text-sm text-muted bg-surface-alt border border-dashed border-line-input rounded-2xl p-8">
                  חפש תרגיל למטה, או בקש מהעוזר לבנות לך אימון.
                </div>
              )}
              {draft.items.map((item, idx) => {
                const ex = exerciseById(item.exercise_id);
                const prevBlock = draft.items[idx - 1]?.block;
                const nextBlock = draft.items[idx + 1]?.block;
                const inSuperset = !isAmrap && !!item.block && (item.block === prevBlock || item.block === nextBlock);
                return (
                  <div key={`${item.exercise_id}-${idx}`} className="on-light bg-surface-alt border border-line rounded-2xl p-3 md:p-4 flex flex-col gap-3">
                    <div className="flex items-center gap-3">
                      <span className="w-7 h-7 rounded-full bg-accent text-on-accent text-xs font-black flex items-center justify-center shrink-0">{idx + 1}</span>
                      <ExerciseThumb
                        exercise={ex}
                        alt=""
                        className="on-light w-12 h-12 rounded-xl bg-surface shrink-0"
                        legacyFit="object-contain"
                        fallback={
                          <span className="on-light w-12 h-12 rounded-xl bg-surface flex items-center justify-center shrink-0">
                            <Dumbbell size={16} className="text-muted" />
                          </span>
                        }
                      />
                      <div className="min-w-0 flex-1">
                        <div className="font-extrabold text-fg truncate">{ex ? getExerciseName(ex, lang) : "תרגיל שנמחק"}</div>
                        <div className="flex items-center gap-1.5 mt-0.5">
                          {(ex?.categories ?? []).slice(0, 2).map((c) => (
                            <span key={c} className="text-[10px] font-bold text-muted">
                              {c}
                            </span>
                          ))}
                          {inSuperset && <span className="text-[10px] font-extrabold bg-accent/15 text-accent-fg px-1.5 py-0.5 rounded">סופר-סט {item.block}</span>}
                        </div>
                      </div>
                      <div className="flex items-center gap-0.5 shrink-0">
                        <button type="button" onClick={() => moveItem(idx, -1)} disabled={idx === 0} aria-label="הזז למעלה" className="p-2 rounded-lg text-muted hover:text-fg hover:bg-line disabled:opacity-30">
                          <ArrowUp size={16} />
                        </button>
                        <button
                          type="button"
                          onClick={() => moveItem(idx, 1)}
                          disabled={idx === draft.items.length - 1}
                          aria-label="הזז למטה"
                          className="p-2 rounded-lg text-muted hover:text-fg hover:bg-line disabled:opacity-30"
                        >
                          <ArrowDown size={16} />
                        </button>
                        <button type="button" onClick={() => set({ items: draft.items.filter((_, i) => i !== idx) })} aria-label="הסר" className="p-2 rounded-lg text-danger-fg hover:bg-danger/10">
                          <Trash2 size={16} />
                        </button>
                      </div>
                    </div>

                    <div className={`grid gap-2 ${isAmrap ? "grid-cols-2 sm:grid-cols-3" : "grid-cols-3 sm:grid-cols-6"}`}>
                      {!isAmrap && (
                        <label className="flex flex-col gap-1">
                          <span className="text-[10px] font-extrabold text-muted text-center">בלוק</span>
                          <input value={item.block ?? ""} maxLength={1} onChange={(e) => setItem(idx, { block: e.target.value.toUpperCase() })} className={`${fieldClass} uppercase`} />
                        </label>
                      )}
                      {!isAmrap && (
                        <label className="flex flex-col gap-1">
                          <span className="text-[10px] font-extrabold text-muted text-center">סטים</span>
                          <input type="number" min={1} value={item.sets ?? 3} onChange={(e) => setItem(idx, { sets: Number(e.target.value) })} className={fieldClass} />
                        </label>
                      )}
                      <label className="flex flex-col gap-1">
                        <button
                          type="button"
                          onClick={() => setItem(idx, { is_time: !item.is_time, reps_max: null })}
                          className="text-[10px] font-extrabold text-muted text-center underline decoration-dotted hover:text-accent-fg"
                          title="לחץ להחלפה בין חזרות לשניות"
                        >
                          {item.is_time ? "שניות ⇄" : "חזרות ⇄"}
                        </button>
                        <RepsField item={item} onCommit={(patch) => setItem(idx, patch)} className={fieldClass} />
                      </label>
                      {!isAmrap && (
                        <label className="flex flex-col gap-1">
                          <span className="text-[10px] font-extrabold text-muted text-center">RIR</span>
                          <input
                            type="number"
                            min={0}
                            value={item.rir ?? ""}
                            placeholder="-"
                            onChange={(e) => setItem(idx, { rir: e.target.value === "" ? null : Number(e.target.value) })}
                            className={fieldClass}
                          />
                        </label>
                      )}
                      {!isAmrap && (
                        <label className="flex flex-col gap-1">
                          <span className="text-[10px] font-extrabold text-muted text-center">מנוחה (שנ׳)</span>
                          <input type="number" min={0} step={15} value={item.rest_time_seconds ?? 60} onChange={(e) => setItem(idx, { rest_time_seconds: Number(e.target.value) })} className={fieldClass} />
                        </label>
                      )}
                      {!item.is_time && (
                        <label className="flex flex-col gap-1" title="לא חובה — אם ריק, לא יוצג למטופל">
                          <span className="text-[10px] font-extrabold text-muted text-center">משקל (ק״ג)</span>
                          <input
                            type="number"
                            min={0}
                            step="0.5"
                            value={item.weight_kg ?? ""}
                            placeholder="-"
                            onChange={(e) => setItem(idx, { weight_kg: parseWeightInput(e.target.value) })}
                            className={fieldClass}
                          />
                        </label>
                      )}
                    </div>
                  </div>
                );
              })}
            </section>

            {/* Add exercises: search by name, or browse a category. */}
            <section className="flex flex-col gap-3">
              <h3 className="text-sm font-black text-fg">הוספת תרגיל</h3>
              <div className="relative">
                <Search size={16} className="pointer-events-none absolute top-1/2 right-3.5 -translate-y-1/2 text-muted" />
                <input value={query} onChange={(e) => setQuery(e.target.value)} placeholder="חפש תרגיל (עברית או אנגלית)" className={`${inputClass} pr-10 font-medium py-3`} />
              </div>
              <div className="flex flex-wrap gap-1.5">
                {categories.map((c) => (
                  <button
                    key={c}
                    type="button"
                    onClick={() => setCategoryFilter((cur) => (cur === c ? null : c))}
                    className={`px-3 py-1.5 rounded-full text-xs font-bold border transition-colors ${
                      categoryFilter === c ? "bg-accent text-on-accent border-accent" : "bg-surface-alt text-muted border-line hover:text-fg"
                    }`}
                  >
                    {c}
                  </button>
                ))}
              </div>
              {searchResults.length > 0 && (
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                  {searchResults.map((ex) => (
                    <button
                      key={ex.id}
                      type="button"
                      onClick={() => set({ items: [...draft.items, newItem(ex.id, draft.items.length, draft.format)] })}
                      className="on-light flex items-center gap-3 rounded-xl p-2 bg-surface-alt border border-line hover:border-accent/50 text-start transition-colors"
                    >
                      <ExerciseThumb
                        exercise={ex}
                        alt=""
                        className="on-light w-11 h-11 rounded-lg bg-surface shrink-0"
                        legacyFit="object-contain"
                        fallback={
                          <span className="on-light w-11 h-11 rounded-lg bg-surface flex items-center justify-center shrink-0">
                            <Dumbbell size={14} className="text-muted" />
                          </span>
                        }
                      />
                      <span className="min-w-0 flex-1">
                        <span className="block text-sm font-bold text-fg truncate">{getExerciseName(ex, lang)}</span>
                        <span className="block text-[10px] font-bold text-muted truncate">{(ex.categories ?? []).join(" · ")}</span>
                      </span>
                      <Plus size={18} className="text-accent-fg shrink-0" />
                    </button>
                  ))}
                </div>
              )}
              {(normalized || categoryFilter) && searchResults.length === 0 && <p className="text-sm text-muted">לא נמצאו תרגילים.</p>}
            </section>
          </div>
        </main>

        {/* AI co-pilot: one instance (so the chat survives closing it) —
            docked beside the editor on xl screens, an overlay sheet below. */}
        {isAssistantOpen && <div className="xl:hidden fixed inset-0 z-[70] bg-backdrop backdrop-blur-sm" onClick={() => setIsAssistantOpen(false)} />}
        <aside
          className={`${
            isAssistantOpen ? "fixed inset-y-0 left-0 z-[71] flex w-full sm:w-[420px] shadow-elevated" : "hidden"
          } xl:static xl:z-auto xl:flex xl:w-[400px] xl:shadow-none shrink-0 border-s border-line flex-col min-h-0`}
        >
          {assistant}
        </aside>
      </div>
    </div>
  );
}
