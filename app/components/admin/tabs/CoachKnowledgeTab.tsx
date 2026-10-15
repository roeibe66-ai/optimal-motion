"use client";

import { useCallback, useEffect, useState } from "react";
import { Check, Eye, EyeOff, History, Loader2, Pencil, Save, Trash2, X } from "lucide-react";
import { supabase } from "@/app/lib/supabase";
import { EVIDENCE_GRADE_LABELS, KNOWLEDGE_AREA_TAGS, KNOWLEDGE_TAG_LABELS, KNOWLEDGE_TOPIC_TAGS } from "@/app/constants/knowledgeTags";
import type { CoachPrinciplesVersion, CuratedFact } from "@/app/types";

// Headline length the "Did you know?" card shows without clamping much; a
// soft limit (the counter turns red), not enforced.
const HEADLINE_SOFT_LIMIT = 120;
const PRINCIPLES_HISTORY_LIMIT = 15;

type FactDraft = Pick<CuratedFact, "did_you_know_he" | "takeaway_he" | "summary_he" | "tags" | "evidence_grade" | "paper_title" | "paper_url" | "year">;

const draftOf = (fact: CuratedFact): FactDraft => ({
  did_you_know_he: fact.did_you_know_he,
  takeaway_he: fact.takeaway_he ?? "",
  summary_he: fact.summary_he,
  tags: fact.tags ?? [],
  evidence_grade: fact.evidence_grade,
  paper_title: fact.paper_title,
  paper_url: fact.paper_url ?? "",
  year: fact.year,
});

const formatDateTime = (iso: string) => new Date(iso).toLocaleString("he-IL", { day: "2-digit", month: "2-digit", year: "2-digit", hour: "2-digit", minute: "2-digit" });

// "ידע ועקרונות" — the knowledge base shared by the "Did you know?" cards and
// the patient AI coach: the coach's principles (versioned, coach_principles)
// and the published research facts (curated_facts), which the research tab
// adds to and this tab edits, tags and grades.
export default function CoachKnowledgeTab() {
  const [versions, setVersions] = useState<CoachPrinciplesVersion[]>([]);
  const [principlesDraft, setPrinciplesDraft] = useState("");
  const [isSavingPrinciples, setIsSavingPrinciples] = useState(false);
  const [showHistory, setShowHistory] = useState(false);

  const [facts, setFacts] = useState<CuratedFact[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [loadError, setLoadError] = useState("");
  const [tagFilter, setTagFilter] = useState<string | null>(null);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [factDraft, setFactDraft] = useState<FactDraft | null>(null);
  const [isSavingFact, setIsSavingFact] = useState(false);

  const fetchAll = useCallback(async () => {
    const [principlesRes, factsRes] = await Promise.all([
      supabase.from("coach_principles").select("id, body, created_at").order("id", { ascending: false }).limit(PRINCIPLES_HISTORY_LIMIT),
      supabase.from("curated_facts").select("*").order("created_at", { ascending: false }),
    ]);
    setIsLoading(false);
    if (principlesRes.error || factsRes.error) {
      setLoadError((principlesRes.error ?? factsRes.error)!.message);
      return;
    }
    const nextVersions = (principlesRes.data ?? []) as CoachPrinciplesVersion[];
    setVersions(nextVersions);
    setPrinciplesDraft((current) => current || nextVersions[0]?.body || "");
    setFacts((factsRes.data ?? []) as CuratedFact[]);
  }, []);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect -- fetching from Supabase, an external system, on mount
    fetchAll();
  }, [fetchAll]);

  const liveBody = versions[0]?.body ?? "";
  const hasUnsavedPrinciples = principlesDraft.trim() !== liveBody.trim();

  const savePrinciples = async () => {
    if (!principlesDraft.trim() || !hasUnsavedPrinciples) return;
    setIsSavingPrinciples(true);
    const { error } = await supabase.from("coach_principles").insert([{ body: principlesDraft.trim() }]);
    setIsSavingPrinciples(false);
    if (error) {
      alert("שגיאה בשמירה: " + error.message);
      return;
    }
    fetchAll();
  };

  const startEdit = (fact: CuratedFact) => {
    setEditingId(fact.id);
    setFactDraft(draftOf(fact));
  };

  const cancelEdit = () => {
    setEditingId(null);
    setFactDraft(null);
  };

  const saveFact = async () => {
    if (!editingId || !factDraft) return;
    if (!factDraft.did_you_know_he.trim() || !factDraft.summary_he.trim() || !factDraft.paper_title.trim()) {
      alert("כותרת, סיכום ושם המאמר הם שדות חובה");
      return;
    }
    setIsSavingFact(true);
    const { error } = await supabase
      .from("curated_facts")
      .update({
        did_you_know_he: factDraft.did_you_know_he.trim(),
        takeaway_he: factDraft.takeaway_he?.trim() || null,
        summary_he: factDraft.summary_he.trim(),
        tags: factDraft.tags,
        evidence_grade: factDraft.evidence_grade,
        paper_title: factDraft.paper_title.trim(),
        paper_url: factDraft.paper_url?.trim() || null,
        year: factDraft.year,
        updated_at: new Date().toISOString(),
      })
      .eq("id", editingId);
    setIsSavingFact(false);
    if (error) {
      alert("שגיאה בשמירה: " + error.message);
      return;
    }
    cancelEdit();
    fetchAll();
  };

  const toggleHidden = async (fact: CuratedFact) => {
    const { error } = await supabase.from("curated_facts").update({ is_hidden: !fact.is_hidden }).eq("id", fact.id);
    if (error) alert("שגיאה בעדכון: " + error.message);
    else fetchAll();
  };

  const deleteFact = async (id: string) => {
    if (!confirm("למחוק את העובדה לצמיתות? אם רק רוצים שמטופלים לא יראו אותה, עדיף להסתיר.")) return;
    const { error } = await supabase.from("curated_facts").delete().eq("id", id);
    if (error) alert("שגיאה במחיקה: " + error.message);
    else fetchAll();
  };

  const toggleDraftTag = (tag: string) =>
    setFactDraft((d) => (d ? { ...d, tags: d.tags.includes(tag) ? d.tags.filter((t) => t !== tag) : [...d.tags, tag] } : d));

  const usedTags = Array.from(new Set(facts.flatMap((f) => f.tags ?? []))).filter((t) => KNOWLEDGE_TAG_LABELS[t]);
  const visibleFacts = tagFilter ? facts.filter((f) => f.tags?.includes(tagFilter)) : facts;
  const untaggedCount = facts.filter((f) => !f.tags || f.tags.length === 0).length;

  if (isLoading) {
    return (
      <div className="flex items-center justify-center gap-2 text-muted p-20">
        <Loader2 size={18} className="animate-spin" /> טוען...
      </div>
    );
  }

  return (
    <div className="max-w-6xl mx-auto">
      <header className="mb-10 hidden md:block">
        <h1 className="text-3xl md:text-4xl font-black text-fg tracking-tight">ידע ועקרונות</h1>
        <p className="text-[13px] text-muted mt-1.5">העקרונות שהמאמן האישי עובד לפיהם, וספריית המחקרים שמשמשת גם את כרטיסי &quot;הידעת?&quot; וגם את המאמן.</p>
      </header>

      {loadError && <div className="mb-6 bg-danger/10 border border-danger/20 text-danger-fg text-sm font-bold px-5 py-3.5 rounded-2xl">שגיאה בטעינה: {loadError}</div>}

      {/* Principles */}
      <section className="on-light bg-surface rounded-[1.75rem] border border-line p-6 md:p-8 mb-10">
        <div className="flex flex-wrap items-start justify-between gap-3 mb-4">
          <div>
            <h2 className="text-lg font-extrabold text-fg">עקרונות המאמן</h2>
            <p className="text-[12px] text-muted mt-1">
              נשלחים למאמן בכל שיחה. כל שמירה יוצרת גרסה חדשה.
              {versions[0] && <> גרסה פעילה מ-{formatDateTime(versions[0].created_at)}.</>}
            </p>
          </div>
          <div className="flex items-center gap-2">
            {versions.length > 1 && (
              <button
                type="button"
                onClick={() => setShowHistory((v) => !v)}
                className="on-light flex items-center gap-1.5 text-[12px] font-bold text-muted bg-surface-alt border border-line px-3.5 py-2 rounded-xl hover:text-fg transition-colors"
              >
                <History size={14} /> גרסאות קודמות ({versions.length - 1})
              </button>
            )}
            <button
              type="button"
              onClick={savePrinciples}
              disabled={!hasUnsavedPrinciples || !principlesDraft.trim() || isSavingPrinciples}
              className="bg-btn-primary text-btn-primary-fg px-5 py-2 rounded-xl font-black text-sm flex items-center gap-1.5 hover:bg-btn-primary-hover transition-colors disabled:bg-disabled disabled:text-disabled-fg disabled:cursor-not-allowed"
            >
              {isSavingPrinciples ? <Loader2 size={15} className="animate-spin" /> : <Save size={15} />} שמור גרסה
            </button>
          </div>
        </div>

        {showHistory && (
          <ul className="on-light mb-4 bg-surface-alt border border-line rounded-2xl divide-y divide-line">
            {versions.slice(1).map((v) => (
              <li key={v.id} className="flex items-center justify-between gap-3 px-4 py-2.5 text-[12px]">
                <span className="text-muted tabular-nums">{formatDateTime(v.created_at)}</span>
                <span className="text-muted truncate flex-1">{v.body.slice(0, 80)}</span>
                <button
                  type="button"
                  onClick={() => {
                    if (hasUnsavedPrinciples && !confirm("לטעון את הגרסה הזו לעורך? השינויים שלא נשמרו יימחקו.")) return;
                    setPrinciplesDraft(v.body);
                  }}
                  className="font-bold text-accent-fg hover:underline shrink-0"
                >
                  טען לעורך
                </button>
              </li>
            ))}
          </ul>
        )}

        <textarea
          value={principlesDraft}
          onChange={(e) => setPrinciplesDraft(e.target.value)}
          rows={18}
          dir="rtl"
          placeholder="עדיין לא נשמרו עקרונות. המאמן עובד בלעדיהם רק עם ההנחיות הבסיסיות."
          className="w-full bg-page border border-line rounded-2xl p-4 text-fg text-[13px] leading-relaxed placeholder:text-muted outline-none focus:border-focus focus:ring-2 focus:ring-focus resize-y"
        />
        <div className="mt-2 flex justify-between text-[11px] text-muted">
          <span>{hasUnsavedPrinciples ? "יש שינויים שלא נשמרו" : " "}</span>
          <span className="tabular-nums">{principlesDraft.length.toLocaleString("he-IL")} תווים</span>
        </div>
      </section>

      {/* Knowledge cards */}
      <section>
        <div className="flex flex-wrap items-end justify-between gap-3 mb-4">
          <div>
            <h2 className="text-lg font-extrabold text-fg">ספריית הידע</h2>
            <p className="text-[12px] text-muted mt-1">
              {facts.filter((f) => !f.is_hidden).length} פעילות
              {facts.some((f) => f.is_hidden) && ` · ${facts.filter((f) => f.is_hidden).length} מוסתרות (גם מהמאמן)`}
              {untaggedCount > 0 && ` · ${untaggedCount} בלי תגיות`}. מוסיפים עובדות מטאב המחקר.
            </p>
          </div>
        </div>

        {usedTags.length > 0 && (
          <div className="flex flex-wrap gap-2 mb-5">
            <button
              type="button"
              onClick={() => setTagFilter(null)}
              className={`text-[12px] font-bold px-3.5 py-1.5 rounded-full border transition-colors ${tagFilter === null ? "bg-btn-primary text-btn-primary-fg border-transparent" : "on-light bg-surface text-muted border-line hover:text-fg"}`}
            >
              הכול
            </button>
            {usedTags.map((tag) => (
              <button
                key={tag}
                type="button"
                onClick={() => setTagFilter(tag === tagFilter ? null : tag)}
                className={`text-[12px] font-bold px-3.5 py-1.5 rounded-full border transition-colors ${tagFilter === tag ? "bg-btn-primary text-btn-primary-fg border-transparent" : "on-light bg-surface text-muted border-line hover:text-fg"}`}
              >
                {KNOWLEDGE_TAG_LABELS[tag]}
              </button>
            ))}
          </div>
        )}

        {visibleFacts.length === 0 ? (
          <div className="on-light text-center p-10 text-muted bg-surface rounded-3xl border border-line">אין עדיין עובדות. חפש נושא בטאב המחקר והוסף.</div>
        ) : (
          <div className="space-y-3">
            {visibleFacts.map((fact) =>
              editingId === fact.id && factDraft ? (
                <FactEditor
                  key={fact.id}
                  draft={factDraft}
                  setDraft={setFactDraft}
                  toggleTag={toggleDraftTag}
                  onSave={saveFact}
                  onCancel={cancelEdit}
                  isSaving={isSavingFact}
                />
              ) : (
                <div key={fact.id} className={`on-light bg-surface border border-line rounded-2xl p-5 flex items-start justify-between gap-4 ${fact.is_hidden ? "opacity-60" : ""}`}>
                  <div className="flex-1 min-w-0">
                    <div className="flex flex-wrap items-center gap-1.5 mb-2">
                      {fact.is_hidden && (
                        <span className="inline-flex items-center gap-1 bg-surface-alt text-muted text-[10px] font-extrabold px-2.5 py-1 rounded-full border border-line">
                          <EyeOff size={11} /> מוסתר
                        </span>
                      )}
                      {fact.evidence_grade && (
                        <span className="inline-flex items-center bg-surface-alt text-fg text-[10px] font-extrabold px-2.5 py-1 rounded-full border border-line">רמת ראיות {fact.evidence_grade}</span>
                      )}
                      {(fact.tags ?? []).map((t) => (
                        <span key={t} className="inline-flex items-center bg-accent/10 text-accent-fg text-[10px] font-bold px-2.5 py-1 rounded-full">
                          {KNOWLEDGE_TAG_LABELS[t] ?? t}
                        </span>
                      ))}
                    </div>
                    <p className="text-fg font-bold text-sm mb-1">{fact.did_you_know_he}</p>
                    {fact.takeaway_he && <p className="text-fg text-[13px] mb-1">← {fact.takeaway_he}</p>}
                    <p className="text-muted text-xs truncate">
                      {fact.paper_title} {fact.year ? `· ${fact.year}` : ""}
                    </p>
                  </div>
                  <div className="shrink-0 flex gap-2">
                    <button
                      onClick={() => startEdit(fact)}
                      title="עריכה"
                      aria-label="עריכה"
                      className="bg-surface-alt border border-line text-fg p-2.5 rounded-xl hover:bg-line transition-colors"
                    >
                      <Pencil size={16} />
                    </button>
                    <button
                      onClick={() => toggleHidden(fact)}
                      title={fact.is_hidden ? "הצג שוב" : "הסתר מהמטופלים ומהמאמן"}
                      aria-label={fact.is_hidden ? "הצג שוב" : "הסתר"}
                      className="bg-surface-alt border border-line text-fg p-2.5 rounded-xl hover:bg-line transition-colors"
                    >
                      {fact.is_hidden ? <Eye size={16} /> : <EyeOff size={16} />}
                    </button>
                    <button onClick={() => deleteFact(fact.id)} title="מחק לצמיתות" aria-label="מחק לצמיתות" className="bg-danger text-on-danger p-2.5 rounded-xl hover:brightness-110 transition-colors">
                      <Trash2 size={16} />
                    </button>
                  </div>
                </div>
              )
            )}
          </div>
        )}
      </section>
    </div>
  );
}

interface FactEditorProps {
  draft: FactDraft;
  setDraft: (updater: (d: FactDraft | null) => FactDraft | null) => void;
  toggleTag: (tag: string) => void;
  onSave: () => void;
  onCancel: () => void;
  isSaving: boolean;
}

const inputClass = "w-full bg-page border border-line rounded-xl px-3.5 py-2.5 text-fg text-[13px] outline-none focus:border-focus focus:ring-2 focus:ring-focus";

function FactEditor({ draft, setDraft, toggleTag, onSave, onCancel, isSaving }: FactEditorProps) {
  const set = <K extends keyof FactDraft>(key: K, value: FactDraft[K]) => setDraft((d) => (d ? { ...d, [key]: value } : d));
  const headlineLength = draft.did_you_know_he.length;

  return (
    <div className="on-light bg-surface border-2 border-accent/40 rounded-2xl p-5 space-y-4">
      <label className="block">
        <span className="flex justify-between text-[12px] font-bold text-muted mb-1.5">
          <span>כותרת &quot;הידעת?&quot; (טענה אחת, בלי &quot;הידעת?&quot; בהתחלה)</span>
          <span className={`tabular-nums ${headlineLength > HEADLINE_SOFT_LIMIT ? "text-danger-fg" : ""}`}>
            {headlineLength}/{HEADLINE_SOFT_LIMIT}
          </span>
        </span>
        <textarea value={draft.did_you_know_he} onChange={(e) => set("did_you_know_he", e.target.value)} rows={2} className={`${inputClass} resize-y`} />
      </label>

      <label className="block">
        <span className="block text-[12px] font-bold text-muted mb-1.5">מה זה אומר בשבילך (שורה אחת, מעשי)</span>
        <input value={draft.takeaway_he ?? ""} onChange={(e) => set("takeaway_he", e.target.value)} className={inputClass} placeholder="למשל: חימום דינמי של 5-10 דקות לפני ריצה" />
      </label>

      <label className="block">
        <span className="block text-[12px] font-bold text-muted mb-1.5">סיכום המחקר</span>
        <textarea value={draft.summary_he} onChange={(e) => set("summary_he", e.target.value)} rows={4} className={`${inputClass} resize-y`} />
      </label>

      <div>
        <span className="block text-[12px] font-bold text-muted mb-1.5">תגיות</span>
        {[
          { title: "אזור", tags: KNOWLEDGE_AREA_TAGS },
          { title: "נושא", tags: KNOWLEDGE_TOPIC_TAGS },
        ].map((group) => (
          <div key={group.title} className="flex flex-wrap items-center gap-1.5 mb-2">
            <span className="text-[11px] text-muted w-10 shrink-0">{group.title}</span>
            {group.tags.map((tag) => {
              const on = draft.tags.includes(tag.id);
              return (
                <button
                  key={tag.id}
                  type="button"
                  onClick={() => toggleTag(tag.id)}
                  aria-pressed={on}
                  className={`text-[11px] font-bold px-3 py-1.5 rounded-full border transition-colors ${on ? "bg-accent text-on-accent border-transparent" : "bg-surface-alt text-muted border-line hover:text-fg"}`}
                >
                  {tag.label}
                </button>
              );
            })}
          </div>
        ))}
      </div>

      <div className="grid grid-cols-1 md:grid-cols-[1fr_8rem_14rem] gap-3">
        <label className="block">
          <span className="block text-[12px] font-bold text-muted mb-1.5">שם המאמר</span>
          <input value={draft.paper_title} onChange={(e) => set("paper_title", e.target.value)} className={inputClass} dir="auto" />
        </label>
        <label className="block">
          <span className="block text-[12px] font-bold text-muted mb-1.5">שנה</span>
          <input
            type="number"
            inputMode="numeric"
            value={draft.year ?? ""}
            onChange={(e) => set("year", e.target.value ? Number(e.target.value) : null)}
            className={`${inputClass} tabular-nums`}
          />
        </label>
        <label className="block">
          <span className="block text-[12px] font-bold text-muted mb-1.5">רמת ראיות</span>
          <select value={draft.evidence_grade ?? ""} onChange={(e) => set("evidence_grade", (e.target.value || null) as FactDraft["evidence_grade"])} className={inputClass}>
            <option value="">לא סומן</option>
            {(["A", "B", "C"] as const).map((g) => (
              <option key={g} value={g}>
                {EVIDENCE_GRADE_LABELS[g]}
              </option>
            ))}
          </select>
        </label>
      </div>

      <label className="block">
        <span className="block text-[12px] font-bold text-muted mb-1.5">קישור למאמר</span>
        <input value={draft.paper_url ?? ""} onChange={(e) => set("paper_url", e.target.value)} className={inputClass} dir="ltr" />
      </label>

      <div className="flex justify-end gap-2 pt-1">
        <button type="button" onClick={onCancel} className="on-light flex items-center gap-1.5 text-sm font-bold text-muted bg-surface-alt border border-line px-4 py-2 rounded-xl hover:text-fg transition-colors">
          <X size={15} /> ביטול
        </button>
        <button
          type="button"
          onClick={onSave}
          disabled={isSaving}
          className="bg-btn-primary text-btn-primary-fg px-5 py-2 rounded-xl font-black text-sm flex items-center gap-1.5 hover:bg-btn-primary-hover transition-colors disabled:bg-disabled disabled:text-disabled-fg"
        >
          {isSaving ? <Loader2 size={15} className="animate-spin" /> : <Check size={15} />} שמור
        </button>
      </div>
    </div>
  );
}
