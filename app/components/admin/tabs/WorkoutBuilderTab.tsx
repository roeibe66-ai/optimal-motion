"use client";

import { useEffect, useState } from "react";
import { ArrowDown, ArrowUp, CheckCircle2, Crown, Dumbbell, Edit3, Loader2, Plus, Search, Timer, Trash2, X } from "lucide-react";
import { supabase } from "@/app/lib/supabase";
import { getExerciseName } from "@/app/utils/format";
import type { Exercise, Lang, Workout, WorkoutFormat, WorkoutItem } from "@/app/types";

interface WorkoutBuilderTabProps {
  exercises: Exercise[];
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

const newItem = (exerciseId: string, index: number, format: WorkoutFormat): WorkoutItem =>
  format === "amrap"
    ? { exercise_id: exerciseId, reps: 10, is_time: false }
    : { exercise_id: exerciseId, block: String.fromCharCode(65 + (index % 26)), sets: 3, reps: 10, is_time: false, rir: null, rest_time_seconds: 60 };

// Admin "workout builder": single workouts — a regular sets/reps session or a
// time-capped AMRAP — authored here and published to the patient Explore tab
// (the `workouts` table). Separate from the smart builder's multi-week
// program templates (packages), which publish to Explore from the program
// library. Patients can start a published workout right away or pin it to a
// weekday in their plan.
export default function WorkoutBuilderTab({ exercises, lang }: WorkoutBuilderTabProps) {
  const [workouts, setWorkouts] = useState<Workout[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [draft, setDraft] = useState<Draft | null>(null);
  const [busyId, setBusyId] = useState<string | null>(null);

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
    <div className="max-w-6xl mx-auto animate-in fade-in">
      <header className="mb-10 flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl md:text-4xl font-black text-fg tracking-tight">יצירת אימונים</h1>
          <p className="text-[13px] text-muted mt-1.5">אימונים בודדים — רגילים או AMRAP — שמתפרסמים בטאב &quot;גלה&quot; של המטופלים.</p>
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
                    onClick={() => openEditor(workout)}
                    className="flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-btn-primary text-btn-primary-fg text-xs font-extrabold hover:bg-btn-primary-hover active:bg-btn-primary-active transition-colors"
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

      {draft && (
        <WorkoutEditor
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

function WorkoutEditor({
  draft,
  setDraft,
  exercises,
  exerciseById,
  lang,
  onClose,
  onSaved,
}: {
  draft: Draft;
  setDraft: (d: Draft | null) => void;
  exercises: Exercise[];
  exerciseById: (id: string) => Exercise | undefined;
  lang: Lang;
  onClose: () => void;
  onSaved: () => void;
}) {
  const [query, setQuery] = useState("");
  const [isSaving, setIsSaving] = useState(false);
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

  const normalized = query.trim().toLowerCase();
  const searchResults = normalized
    ? exercises.filter((e) => (e.name_he ?? "").toLowerCase().includes(normalized) || (e.name_en ?? "").toLowerCase().includes(normalized)).slice(0, 12)
    : [];

  const save = async (publish: boolean) => {
    const title = draft.title.trim();
    if (!title) return alert("חובה לתת שם לאימון");
    if (draft.items.length === 0) return alert("הוסף לפחות תרגיל אחד");
    const minutes = Number(draft.timeCapMinutes);
    if (isAmrap && (!Number.isFinite(minutes) || minutes < 1)) return alert("ל-AMRAP צריך משך של דקה לפחות");

    // Only the fields each format uses are stored.
    const items: WorkoutItem[] = draft.items.map((it, idx) =>
      isAmrap
        ? { exercise_id: it.exercise_id, reps: Math.max(1, Number(it.reps) || 1), is_time: it.is_time }
        : {
            exercise_id: it.exercise_id,
            block: (it.block || String.fromCharCode(65 + (idx % 26))).toUpperCase().slice(0, 1),
            sets: Math.max(1, Number(it.sets) || 1),
            reps: Math.max(1, Number(it.reps) || 1),
            is_time: it.is_time,
            rir: it.rir === null || it.rir === undefined || String(it.rir) === "" ? null : Number(it.rir),
            rest_time_seconds: Math.max(0, Number(it.rest_time_seconds) || 0),
          }
    );
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

  const inputClass = "on-light w-full bg-surface border border-line-input rounded-xl px-3 py-2 text-sm font-bold text-fg outline-none focus:border-focus focus:ring-2 focus:ring-focus";
  const numClass = "on-light w-16 bg-surface border border-line-input rounded-lg px-2 py-1.5 text-center text-sm font-bold text-fg outline-none focus:border-focus focus:ring-2 focus:ring-focus";

  return (
    <div className="fixed inset-0 z-[60] bg-backdrop backdrop-blur-sm flex items-end sm:items-center justify-center" onClick={onClose}>
      <div
        className="bg-elevated border border-line w-full sm:max-w-3xl sm:rounded-[2rem] rounded-t-[2rem] max-h-[92vh] flex flex-col shadow-elevated"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between p-6 border-b border-line shrink-0">
          <h2 className="text-lg font-extrabold text-fg">{draft.id ? "עריכת אימון" : "אימון חדש"}</h2>
          <button onClick={onClose} className="p-2 text-muted hover:text-fg transition-colors" aria-label="סגור">
            <X size={20} />
          </button>
        </div>

        <div className="on-light flex flex-col gap-6 p-6 md:p-8 overflow-y-auto bg-surface text-fg">
          <div className="grid md:grid-cols-2 gap-4">
            <label className="flex flex-col gap-1.5">
              <span className="text-[11px] font-extrabold text-muted">שם האימון (מה שהמטופל יראה)</span>
              <input value={draft.title} onChange={(e) => set({ title: e.target.value })} placeholder="למשל: גוף מלא 20 דקות" className={inputClass} />
            </label>
            <div className="flex flex-col gap-1.5">
              <span className="text-[11px] font-extrabold text-muted">סוג האימון</span>
              <div className="flex bg-surface-alt p-1 rounded-xl border border-line">
                {(["standard", "amrap"] as const).map((fmt) => (
                  <button
                    key={fmt}
                    type="button"
                    onClick={() => set({ format: fmt })}
                    className={`flex-1 py-2 rounded-lg text-sm font-bold transition-colors ${draft.format === fmt ? "bg-accent text-on-accent" : "text-muted hover:text-fg"}`}
                  >
                    {fmt === "standard" ? "רגיל (סטים וחזרות)" : "AMRAP (לפי זמן)"}
                  </button>
                ))}
              </div>
            </div>
          </div>

          {isAmrap && (
            <label className="flex items-center gap-3 bg-accent/5 border border-accent/20 rounded-2xl p-4">
              <Timer size={18} className="text-accent-fg shrink-0" />
              <span className="text-sm font-bold text-fg">משך האימון</span>
              <input type="number" min={1} value={draft.timeCapMinutes} onChange={(e) => set({ timeCapMinutes: e.target.value })} className={numClass} />
              <span className="text-sm font-bold text-muted">דקות — כמה שיותר סבבים של כל התרגילים ברשימה</span>
            </label>
          )}

          <label className="flex flex-col gap-1.5">
            <span className="text-[11px] font-extrabold text-muted">תיאור (אופציונלי)</span>
            <textarea value={draft.description} onChange={(e) => set({ description: e.target.value })} rows={2} className={`${inputClass} font-medium resize-none`} />
          </label>

          <div className="flex flex-col gap-3">
            <span className="text-[11px] font-extrabold text-muted">{isAmrap ? "התרגילים בכל סבב" : "התרגילים"}</span>
            {draft.items.length === 0 && <p className="text-sm text-muted">חפש תרגיל למטה והוסף אותו לאימון.</p>}
            {draft.items.map((item, idx) => {
              const ex = exerciseById(item.exercise_id);
              return (
                <div key={`${item.exercise_id}-${idx}`} className="on-light flex flex-wrap items-center gap-3 bg-surface-alt border border-line rounded-2xl p-3">
                  <span className="w-7 h-7 rounded-full bg-accent text-on-accent text-xs font-black flex items-center justify-center shrink-0">{idx + 1}</span>
                  <span className="font-extrabold text-sm text-fg flex-1 min-w-[140px] truncate">{ex ? getExerciseName(ex, lang) : "תרגיל שנמחק"}</span>

                  {!isAmrap && (
                    <label className="flex items-center gap-1.5 text-xs font-bold text-muted">
                      בלוק
                      <input value={item.block ?? ""} maxLength={1} onChange={(e) => setItem(idx, { block: e.target.value.toUpperCase() })} className={`${numClass} w-10 uppercase`} />
                    </label>
                  )}
                  {!isAmrap && (
                    <label className="flex items-center gap-1.5 text-xs font-bold text-muted">
                      סטים
                      <input type="number" min={1} value={item.sets ?? 3} onChange={(e) => setItem(idx, { sets: Number(e.target.value) })} className={numClass} />
                    </label>
                  )}
                  <label className="flex items-center gap-1.5 text-xs font-bold text-muted">
                    <button type="button" onClick={() => setItem(idx, { is_time: !item.is_time })} className="underline decoration-dotted hover:text-accent-fg">
                      {item.is_time ? "שניות" : "חזרות"}
                    </button>
                    <input type="number" min={1} value={item.reps} onChange={(e) => setItem(idx, { reps: Number(e.target.value) })} className={numClass} />
                  </label>
                  {!isAmrap && (
                    <label className="flex items-center gap-1.5 text-xs font-bold text-muted">
                      RIR
                      <input
                        type="number"
                        min={0}
                        value={item.rir ?? ""}
                        placeholder="-"
                        onChange={(e) => setItem(idx, { rir: e.target.value === "" ? null : Number(e.target.value) })}
                        className={`${numClass} w-12`}
                      />
                    </label>
                  )}
                  {!isAmrap && (
                    <label className="flex items-center gap-1.5 text-xs font-bold text-muted">
                      מנוחה
                      <input type="number" min={0} value={item.rest_time_seconds ?? 60} onChange={(e) => setItem(idx, { rest_time_seconds: Number(e.target.value) })} className={numClass} />
                      שנ׳
                    </label>
                  )}

                  <div className="flex items-center gap-1 mr-auto">
                    <button type="button" onClick={() => moveItem(idx, -1)} disabled={idx === 0} aria-label="הזז למעלה" className="p-1.5 rounded-lg text-muted hover:text-fg hover:bg-line disabled:opacity-30">
                      <ArrowUp size={15} />
                    </button>
                    <button
                      type="button"
                      onClick={() => moveItem(idx, 1)}
                      disabled={idx === draft.items.length - 1}
                      aria-label="הזז למטה"
                      className="p-1.5 rounded-lg text-muted hover:text-fg hover:bg-line disabled:opacity-30"
                    >
                      <ArrowDown size={15} />
                    </button>
                    <button type="button" onClick={() => set({ items: draft.items.filter((_, i) => i !== idx) })} aria-label="הסר" className="p-1.5 rounded-lg text-danger-fg hover:bg-danger/10">
                      <Trash2 size={15} />
                    </button>
                  </div>
                </div>
              );
            })}

            <div className="relative">
              <Search size={15} className="pointer-events-none absolute top-1/2 right-3 -translate-y-1/2 text-muted" />
              <input value={query} onChange={(e) => setQuery(e.target.value)} placeholder="חפש תרגיל להוספה (עברית או אנגלית)" className={`${inputClass} pr-9 font-medium`} />
            </div>
            {searchResults.length > 0 && (
              <div className="on-light flex flex-col gap-1.5 bg-surface-alt border border-line rounded-2xl p-2 max-h-64 overflow-y-auto">
                {searchResults.map((ex) => (
                  <button
                    key={ex.id}
                    type="button"
                    onClick={() => {
                      set({ items: [...draft.items, newItem(ex.id, draft.items.length, draft.format)] });
                      setQuery("");
                    }}
                    className="flex items-center gap-3 rounded-xl p-2 hover:bg-line text-start transition-colors"
                  >
                    {ex.gif_url ? (
                      <img src={ex.gif_url} alt="" className="on-light w-9 h-9 rounded-lg bg-surface object-contain shrink-0" />
                    ) : (
                      <span className="on-light w-9 h-9 rounded-lg bg-surface flex items-center justify-center shrink-0">
                        <Dumbbell size={14} className="text-muted" />
                      </span>
                    )}
                    <span className="text-sm font-bold text-fg flex-1 truncate">{getExerciseName(ex, lang)}</span>
                    <Plus size={16} className="text-accent-fg shrink-0" />
                  </button>
                ))}
              </div>
            )}
          </div>

          <div className="flex flex-wrap gap-3 sticky bottom-0 -mx-6 md:-mx-8 -mb-6 md:-mb-8 px-6 md:px-8 py-5 bg-surface border-t border-line">
            <button
              onClick={() => save(true)}
              disabled={isSaving}
              className="flex-1 bg-btn-primary text-btn-primary-fg py-3.5 rounded-2xl font-black hover:bg-btn-primary-hover active:bg-btn-primary-active transition-colors disabled:bg-disabled disabled:text-disabled-fg"
            >
              {isSaving ? "שומר..." : "שמור ופרסם לגלה"}
            </button>
            <button
              onClick={() => save(false)}
              disabled={isSaving}
              className="px-6 bg-transparent border-[1.5px] border-btn-secondary text-accent-fg py-3.5 rounded-2xl font-bold hover:bg-btn-secondary-hover transition-colors"
            >
              {draft.id ? "שמור בלי לשנות פרסום" : "שמור כטיוטה"}
            </button>
            <button onClick={onClose} className="px-6 bg-surface-alt text-fg py-3.5 rounded-2xl font-bold hover:bg-line transition-colors">
              ביטול
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
