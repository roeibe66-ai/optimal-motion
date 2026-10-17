"use client";

import { useCallback, useEffect, useState, type FormEvent } from "react";
import { Check, ChevronDown, Loader2, Plus, Trash2 } from "lucide-react";
import { supabase } from "@/app/lib/supabase";
import { confirmAction } from "@/app/components/ui/feedback";

interface AdminTask {
  id: string;
  title: string;
  notes: string | null;
  priority: 1 | 2 | 3;
  done_at: string | null;
  created_at: string;
}

const PRIORITIES: { value: 1 | 2 | 3; label: string; className: string }[] = [
  { value: 1, label: "גבוהה", className: "bg-danger/10 text-danger-fg border-danger/25" },
  { value: 2, label: "רגילה", className: "bg-surface-alt text-muted border-line" },
  { value: 3, label: "נמוכה", className: "bg-surface-alt text-muted border-line opacity-70" },
];
const priorityOf = (p: number) => PRIORITIES.find((x) => x.value === p) ?? PRIORITIES[1];

// "משימות": Roei's own to-do list for the app (admin_tasks, admins only).
// Open tasks by priority then age; done ones collapse at the bottom.
export default function AdminTasksTab() {
  const [tasks, setTasks] = useState<AdminTask[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [title, setTitle] = useState("");
  const [notes, setNotes] = useState("");
  const [priority, setPriority] = useState<1 | 2 | 3>(2);
  const [isSaving, setIsSaving] = useState(false);
  const [showDone, setShowDone] = useState(false);
  const [expandedId, setExpandedId] = useState<string | null>(null);

  const load = useCallback(async () => {
    const { data } = await supabase.from("admin_tasks").select("*").order("created_at", { ascending: false });
    setTasks((data ?? []) as AdminTask[]);
    setIsLoading(false);
  }, []);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect -- fetching from Supabase, an external system, on mount
    load();
  }, [load]);

  const add = async (e: FormEvent) => {
    e.preventDefault();
    if (!title.trim() || isSaving) return;
    setIsSaving(true);
    const { error } = await supabase.from("admin_tasks").insert({ title: title.trim(), notes: notes.trim() || null, priority });
    setIsSaving(false);
    if (error) {
      alert("שגיאה בשמירה: " + error.message);
      return;
    }
    setTitle("");
    setNotes("");
    setPriority(2);
    load();
  };

  const toggleDone = async (task: AdminTask) => {
    // Optimistic: the row moves at once; reload reconciles.
    setTasks((prev) => prev.map((t) => (t.id === task.id ? { ...t, done_at: t.done_at ? null : new Date().toISOString() } : t)));
    await supabase.from("admin_tasks").update({ done_at: task.done_at ? null : new Date().toISOString() }).eq("id", task.id);
    load();
  };

  const remove = async (task: AdminTask) => {
    if (!(await confirmAction({ title: "למחוק את המשימה?", message: task.title, confirmLabel: "מחיקה", cancelLabel: "ביטול", destructive: true }))) return;
    await supabase.from("admin_tasks").delete().eq("id", task.id);
    load();
  };

  const open = tasks.filter((t) => !t.done_at).sort((a, b) => a.priority - b.priority || b.created_at.localeCompare(a.created_at));
  const done = tasks.filter((t) => t.done_at).sort((a, b) => (b.done_at ?? "").localeCompare(a.done_at ?? ""));

  const row = (task: AdminTask) => {
    const p = priorityOf(task.priority);
    const isExpanded = expandedId === task.id;
    return (
      <li key={task.id} className="flex items-start gap-3 px-5 py-3.5">
        <button
          type="button"
          onClick={() => toggleDone(task)}
          aria-label={task.done_at ? "החזר לפתוחות" : "סמן כבוצע"}
          aria-pressed={!!task.done_at}
          className={`mt-0.5 w-6 h-6 shrink-0 rounded-lg border-2 flex items-center justify-center transition-[background-color,border-color,transform] duration-150 ease-out active:scale-90 ${
            task.done_at ? "bg-accent border-accent text-on-accent" : "border-line-input hover:border-accent"
          }`}
        >
          {task.done_at && <Check size={14} strokeWidth={3} />}
        </button>
        <div className="flex-1 min-w-0">
          <button type="button" onClick={() => task.notes && setExpandedId(isExpanded ? null : task.id)} className="w-full text-start">
            <span className={`block text-sm font-bold ${task.done_at ? "text-muted line-through" : "text-fg"}`}>{task.title}</span>
            {task.notes && <span className={`block text-xs text-muted mt-0.5 whitespace-pre-wrap ${isExpanded ? "" : "line-clamp-1"}`}>{task.notes}</span>}
          </button>
        </div>
        {!task.done_at && <span className={`shrink-0 text-[10px] font-extrabold px-2.5 py-1 rounded-full border ${p.className}`}>{p.label}</span>}
        <button type="button" onClick={() => remove(task)} aria-label="מחיקה" className="shrink-0 p-1.5 text-muted hover:text-danger-fg transition-colors">
          <Trash2 size={15} />
        </button>
      </li>
    );
  };

  return (
    <div className="max-w-3xl mx-auto">
      <header className="mb-8 hidden md:block">
        <h1 className="text-3xl md:text-4xl font-black text-fg tracking-tight">משימות</h1>
        <p className="text-[13px] text-muted mt-1.5">דברים לעשות באפליקציה. רק אתה רואה אותם.</p>
      </header>

      <form onSubmit={add} className="on-light bg-surface rounded-[1.75rem] border border-line p-5 mb-6 space-y-3">
        <input
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          placeholder="משימה חדשה..."
          maxLength={300}
          className="w-full bg-page border border-line rounded-xl px-4 py-3 text-fg text-sm outline-none focus:border-focus focus:ring-2 focus:ring-focus"
        />
        {title.trim() && (
          <textarea
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            placeholder="הערה (לא חובה)"
            rows={2}
            className="w-full bg-page border border-line rounded-xl px-4 py-2.5 text-fg text-sm outline-none focus:border-focus focus:ring-2 focus:ring-focus resize-y"
          />
        )}
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-1.5" role="radiogroup" aria-label="עדיפות">
            <span className="text-xs font-bold text-muted me-1">עדיפות:</span>
            {PRIORITIES.map((p) => (
              <button
                key={p.value}
                type="button"
                role="radio"
                aria-checked={priority === p.value}
                onClick={() => setPriority(p.value)}
                className={`text-[11px] font-extrabold px-3 py-1.5 rounded-full border transition-colors ${priority === p.value ? "bg-btn-primary text-btn-primary-fg border-transparent" : "bg-surface-alt text-muted border-line hover:text-fg"}`}
              >
                {p.label}
              </button>
            ))}
          </div>
          <button
            type="submit"
            disabled={!title.trim() || isSaving}
            className="bg-btn-primary text-btn-primary-fg px-5 py-2.5 rounded-xl font-black text-sm flex items-center gap-1.5 hover:bg-btn-primary-hover transition-colors disabled:bg-disabled disabled:text-disabled-fg active:scale-[0.98]"
          >
            {isSaving ? <Loader2 size={15} className="animate-spin" /> : <Plus size={15} />} הוסף
          </button>
        </div>
      </form>

      {isLoading ? (
        <div className="flex justify-center p-10 text-muted">
          <Loader2 size={18} className="animate-spin" />
        </div>
      ) : (
        <>
          <section className="on-light bg-surface rounded-[1.75rem] border border-line mb-5">
            <h2 className="px-5 py-3 border-b border-line text-sm font-extrabold text-fg">פתוחות ({open.length})</h2>
            {open.length === 0 ? <p className="px-5 py-8 text-sm text-muted text-center">אין משימות פתוחות.</p> : <ul className="divide-y divide-line">{open.map(row)}</ul>}
          </section>
          {done.length > 0 && (
            <section className="on-light bg-surface rounded-[1.75rem] border border-line">
              <button type="button" onClick={() => setShowDone((v) => !v)} className="w-full flex items-center justify-between px-5 py-3 text-sm font-extrabold text-muted">
                בוצעו ({done.length})
                <ChevronDown size={16} className={`transition-transform duration-200 ${showDone ? "rotate-180" : ""}`} />
              </button>
              {showDone && <ul className="divide-y divide-line border-t border-line">{done.map(row)}</ul>}
            </section>
          )}
        </>
      )}
    </div>
  );
}
