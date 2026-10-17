"use client";

import { useCallback, useEffect, useState } from "react";
import { Check, ChevronDown, Loader2 } from "lucide-react";
import { supabase } from "@/app/lib/supabase";

interface ChangeRequest {
  id: string;
  patient_id: number;
  message: string;
  status: "open" | "done";
  admin_note: string | null;
  created_at: string;
  handled_at: string | null;
  patients: { full_name: string | null; patient_type: string | null } | null;
  patient_programs: { name: string | null } | null;
}

const when = (iso: string) => new Date(iso).toLocaleString("he-IL", { day: "2-digit", month: "2-digit", hour: "2-digit", minute: "2-digit" });

// "בקשות מתאמנים": requests to change a workout (change_requests). Open ones
// first; marking one handled can carry a short reply the patient sees in
// the request sheet.
export default function ChangeRequestsTab() {
  const [requests, setRequests] = useState<ChangeRequest[] | null>(null);
  const [notes, setNotes] = useState<Record<string, string>>({});
  const [busyId, setBusyId] = useState<string | null>(null);
  const [showDone, setShowDone] = useState(false);

  const load = useCallback(async () => {
    const { data } = await supabase
      .from("change_requests")
      .select("*, patients(full_name, patient_type), patient_programs(name)")
      .order("created_at", { ascending: false })
      .limit(200);
    setRequests((data ?? []) as ChangeRequest[]);
  }, []);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect -- fetching from Supabase, an external system, on mount
    load();
  }, [load]);

  const markDone = async (r: ChangeRequest) => {
    setBusyId(r.id);
    const { error } = await supabase
      .from("change_requests")
      .update({ status: "done", handled_at: new Date().toISOString(), admin_note: notes[r.id]?.trim() || null })
      .eq("id", r.id);
    setBusyId(null);
    if (error) {
      alert("שגיאה: " + error.message);
      return;
    }
    load();
  };

  const reopen = async (r: ChangeRequest) => {
    await supabase.from("change_requests").update({ status: "open", handled_at: null }).eq("id", r.id);
    load();
  };

  if (!requests) {
    return (
      <div className="flex justify-center p-20 text-muted">
        <Loader2 size={18} className="animate-spin" />
      </div>
    );
  }

  const open = requests.filter((r) => r.status === "open");
  const done = requests.filter((r) => r.status === "done");

  const card = (r: ChangeRequest) => (
    <li key={r.id} className="px-5 py-4">
      <div className="flex flex-wrap items-center gap-2 mb-1.5">
        <span className="text-sm font-black text-fg">{r.patients?.full_name ?? `#${r.patient_id}`}</span>
        {r.patient_programs?.name && <span className="text-[11px] font-bold text-muted bg-surface-alt border border-line px-2 py-0.5 rounded-full">{r.patient_programs.name}</span>}
        <span className="text-[11px] text-muted tabular-nums">{when(r.created_at)}</span>
      </div>
      <p className="text-sm text-fg whitespace-pre-wrap">{r.message}</p>
      {r.status === "open" ? (
        <div className="mt-3 flex flex-col md:flex-row gap-2">
          <input
            value={notes[r.id] ?? ""}
            onChange={(e) => setNotes((n) => ({ ...n, [r.id]: e.target.value.slice(0, 1000) }))}
            placeholder="תשובה קצרה למתאמן (לא חובה)"
            className="flex-1 bg-page border border-line rounded-xl px-3.5 py-2 text-sm text-fg outline-none focus:border-focus focus:ring-2 focus:ring-focus"
          />
          <button
            type="button"
            onClick={() => markDone(r)}
            disabled={busyId === r.id}
            className="bg-btn-primary text-btn-primary-fg px-4 py-2 rounded-xl text-sm font-black flex items-center justify-center gap-1.5 hover:bg-btn-primary-hover active:scale-[0.98] transition-[transform,background-color] duration-150 disabled:bg-disabled"
          >
            {busyId === r.id ? <Loader2 size={14} className="animate-spin" /> : <Check size={14} />} טופל
          </button>
        </div>
      ) : (
        <div className="mt-2 flex flex-wrap items-center gap-3 text-xs text-muted">
          {r.admin_note && <span className="text-fg">↩ {r.admin_note}</span>}
          {r.handled_at && <span className="tabular-nums">טופל {when(r.handled_at)}</span>}
          <button type="button" onClick={() => reopen(r)} className="font-bold hover:text-fg underline">
            פתח מחדש
          </button>
        </div>
      )}
    </li>
  );

  return (
    <div className="max-w-3xl mx-auto">
      <header className="mb-8 hidden md:block">
        <h1 className="text-3xl md:text-4xl font-black text-fg tracking-tight">בקשות מתאמנים</h1>
        <p className="text-[13px] text-muted mt-1.5">בקשות לשינוי או שדרוג אימון. מתאמני כושר: בקשה פתוחה אחת ועד 2 בחודש; שיקומיים בלי הגבלה.</p>
      </header>
      <section className="on-light bg-surface rounded-[1.75rem] border border-line mb-5">
        <h2 className="px-5 py-3 border-b border-line text-sm font-extrabold text-fg">פתוחות ({open.length})</h2>
        {open.length === 0 ? <p className="px-5 py-8 text-sm text-muted text-center">אין בקשות פתוחות.</p> : <ul className="divide-y divide-line">{open.map(card)}</ul>}
      </section>
      {done.length > 0 && (
        <section className="on-light bg-surface rounded-[1.75rem] border border-line">
          <button type="button" onClick={() => setShowDone((v) => !v)} className="w-full flex items-center justify-between px-5 py-3 text-sm font-extrabold text-muted">
            טופלו ({done.length})
            <ChevronDown size={16} className={`transition-transform duration-200 ${showDone ? "rotate-180" : ""}`} />
          </button>
          {showDone && <ul className="divide-y divide-line border-t border-line">{done.map(card)}</ul>}
        </section>
      )}
    </div>
  );
}
