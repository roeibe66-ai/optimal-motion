"use client";

import { useEffect, useState } from "react";
import { AlertTriangle, MessagesSquare, Siren } from "lucide-react";
import { supabase } from "@/app/lib/supabase";
import type { Patient } from "@/app/types";

interface StoredMessage {
  id: number;
  role: "user" | "assistant";
  content: string;
  red_flag: "urgent" | "emergency" | null;
  created_at: string;
}

const PAGE = 200;
const dayLabel = (iso: string) => new Date(iso).toLocaleDateString("he-IL", { weekday: "long", day: "numeric", month: "numeric" });
const timeLabel = (iso: string) => new Date(iso).toLocaleTimeString("he-IL", { hour: "2-digit", minute: "2-digit" });

// The admin's read-only view of a patient's stored AI-coach conversation
// (coach_messages, kept 6 months; admins read everything under RLS).
export default function CoachConversations({ patients }: { patients: Patient[] }) {
  const [patientId, setPatientId] = useState("");
  const [messages, setMessages] = useState<StoredMessage[] | null>(null);
  const [counts, setCounts] = useState<Record<string, number>>({});

  // Who has a conversation at all, to list them first.
  useEffect(() => {
    let cancelled = false;
    supabase
      .from("coach_messages")
      .select("patient_id")
      .eq("role", "user")
      .then(({ data }) => {
        if (cancelled || !data) return;
        const next: Record<string, number> = {};
        for (const r of data) next[String(r.patient_id)] = (next[String(r.patient_id)] ?? 0) + 1;
        setCounts(next);
      });
    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    if (!patientId) return;
    let cancelled = false;
    supabase
      .from("coach_messages")
      .select("id, role, content, red_flag, created_at")
      .eq("patient_id", patientId)
      .order("created_at", { ascending: false })
      .order("id", { ascending: false })
      .limit(PAGE)
      .then(({ data }) => {
        if (!cancelled) setMessages(((data ?? []) as StoredMessage[]).reverse());
      });
    return () => {
      cancelled = true;
    };
  }, [patientId]);

  const sorted = patients
    .filter((p) => p.role !== "admin")
    .sort((a, b) => (counts[String(b.id)] ?? 0) - (counts[String(a.id)] ?? 0) || (a.full_name ?? "").localeCompare(b.full_name ?? "", "he"));

  return (
    <section className="on-light bg-surface rounded-[1.75rem] border border-line mb-6">
      <div className="flex flex-wrap items-center justify-between gap-3 px-5 py-3 border-b border-line">
        <h2 className="flex items-center gap-2 text-sm font-extrabold text-fg">
          <MessagesSquare size={16} className="text-muted" /> שיחות מתאמנים עם המאמן
        </h2>
        <select
          value={patientId}
          onChange={(e) => {
            setMessages(null);
            setPatientId(e.target.value);
          }}
          className="bg-page border border-line rounded-xl px-3 py-2 text-fg text-sm outline-none focus:border-focus"
        >
          <option value="">בחר מתאמן...</option>
          {sorted.map((p) => (
            <option key={p.id} value={p.id}>
              {p.full_name || `#${p.id}`}
              {counts[String(p.id)] ? ` (${counts[String(p.id)]} הודעות)` : ""}
            </option>
          ))}
        </select>
      </div>

      {!patientId ? (
        <p className="px-5 py-6 text-sm text-muted text-center">שיחות נשמרות 6 חודשים, רק כשהמאמן פתוח למתאמנים. שיחות בדיקה לא נשמרות.</p>
      ) : messages === null ? (
        <p className="px-5 py-6 text-sm text-muted text-center">טוען...</p>
      ) : messages.length === 0 ? (
        <p className="px-5 py-6 text-sm text-muted text-center">אין שיחות שמורות למתאמן הזה.</p>
      ) : (
        <div className="px-5 py-4 space-y-2.5 max-h-[32rem] overflow-y-auto">
          {messages.map((m, i) => {
            const newDay = i === 0 || dayLabel(messages[i - 1].created_at) !== dayLabel(m.created_at);
            return (
              <div key={m.id}>
                {newDay && <p className="text-center text-[11px] font-bold text-muted my-3">{dayLabel(m.created_at)}</p>}
                <div className={`flex ${m.role === "user" ? "justify-start" : "justify-end"}`}>
                  <div className={`max-w-[85%] rounded-2xl px-4 py-2.5 text-[13px] leading-relaxed whitespace-pre-wrap ${m.role === "user" ? "bg-line text-fg" : "bg-accent/10 border border-accent/20 text-fg"}`}>
                    {m.red_flag && (
                      <span className="mb-1.5 inline-flex items-center gap-1 bg-danger text-on-danger text-[10px] font-extrabold px-2.5 py-1 rounded-full">
                        {m.red_flag === "emergency" ? <Siren size={11} /> : <AlertTriangle size={11} />} {m.red_flag === "emergency" ? "חירום" : "לפנות היום"}
                      </span>
                    )}
                    <span className="block">{m.content}</span>
                    <span className="block text-[10px] text-muted mt-1 tabular-nums">{timeLabel(m.created_at)}</span>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </section>
  );
}
