"use client";

import { useEffect, useRef, useState, type FormEvent } from "react";
import { AlertTriangle, Check, ChevronDown, Dumbbell, Lock, Target, TrendingDown, TrendingUp, X } from "lucide-react";
import { supabase } from "@/app/lib/supabase";
import { ADMIN_TAGS, AVAILABLE_MUSCLES, DIFFICULTY_LEVELS, EQUIPMENT_LIST, MUSCLE_REGIONS, NAME_DISPLAY_PREFERENCES } from "@/app/constants/catalog";
import MusclePicker from "@/app/components/admin/MusclePicker";
import { getExerciseName } from "@/app/utils/format";
import type { Exercise, Lang, NameDisplayPreference } from "@/app/types";

interface ExerciseFormModalProps {
  exercise: Exercise | null; // null = create mode; non-null = edit mode, pre-filled from this row
  exercises: Exercise[]; // full catalog, for the easier/harder-version pickers (self excluded when editing)
  internalNotes: string; // seeded admin-only note text; "" for create
  lang: Lang;
  onClose: () => void;
  onSaved: () => void; // re-fetch up in the parent tab
}

interface ExerciseFormState {
  name_he: string;
  name_en: string;
  name_display_preference: NameDisplayPreference;
  categories: string[];
  difficulty_level: string;
  equipment: string[];
  gif_url: string;
  secondary_gif_url: string;
  target_muscle: string;
  secondary_muscles: string[];
  prime_movers: string[];
  synergists: string[];
  description: string;
  description_en: string;
  patient_cues: string;
  cues_en: string;
  common_mistake: string;
  mistakes_en: string;
  internal_notes: string;
  easier_version_id: string;
  harder_version_id: string;
}

const buildInitialForm = (exercise: Exercise | null, internalNotes: string): ExerciseFormState => ({
  name_he: exercise?.name_he || "",
  name_en: exercise?.name_en || "",
  name_display_preference: exercise?.name_display_preference || "en",
  categories: exercise?.categories || [],
  difficulty_level: exercise?.difficulty_level || "",
  equipment: exercise?.equipment || [],
  gif_url: exercise?.gif_url || "",
  secondary_gif_url: exercise?.secondary_gif_url || "",
  target_muscle: exercise?.target_muscle || "",
  secondary_muscles: exercise?.secondary_muscles ? exercise.secondary_muscles.split(",").filter(Boolean) : [],
  prime_movers: exercise?.prime_movers || [],
  synergists: exercise?.synergists || [],
  description: exercise?.description || "",
  description_en: exercise?.description_en || "",
  patient_cues: exercise?.patient_cues || "",
  cues_en: exercise?.cues_en || "",
  common_mistake: exercise?.common_mistake || "",
  mistakes_en: exercise?.mistakes_en || "",
  internal_notes: internalNotes,
  easier_version_id: exercise?.easier_version_id || "",
  harder_version_id: exercise?.harder_version_id || "",
});

// admin_tags mirrors the categories selection — same ADMIN_TAGS taxonomy,
// label vs id, kept in sync automatically at save time rather than as a
// second manual picker (see LegacyAdminApp's original comment on this).
const deriveAdminTagIds = (categoryLabels: string[]): string[] =>
  categoryLabels.map((label) => ADMIN_TAGS.find((t) => t.label === label)?.id).filter((id): id is string => Boolean(id));

// Mirrors the opposite easier/harder link on the linked exercise so the
// relationship reads correctly from both sides (Pull-up.easier = Banded
// Pull-up implies Banded Pull-up.harder = Pull-up). If the link changed away
// from a previous target, that old target's reciprocal is cleared too, but
// only if it still points back at this exercise (so it isn't clobbered if it
// was independently repointed elsewhere in the meantime).
const syncReciprocalLink = async (
  thisId: string,
  oldLinkedId: string | null | undefined,
  newLinkedId: string | null | undefined,
  reciprocalField: "easier_version_id" | "harder_version_id"
) => {
  if ((oldLinkedId || null) === (newLinkedId || null)) return;
  if (oldLinkedId) {
    await supabase.from("exercises").update({ [reciprocalField]: null }).eq("id", oldLinkedId).eq(reciprocalField, thisId);
  }
  if (newLinkedId) {
    await supabase.from("exercises").update({ [reciprocalField]: thisId }).eq("id", newLinkedId);
  }
};

// Searchable replacement for a plain <select> of exercises — with hundreds
// of exercises, a native dropdown makes finding one by scrolling alone
// impractical. Click to open, type to filter by name_he/name_en (same
// matching as the library's own search bar), click a row to select. Closes
// on an outside click; the search text always resets on close/select so
// reopening starts from the full list rather than the last filter.
function ExerciseCombobox({
  value,
  onChange,
  options,
  lang,
  placeholder,
}: {
  value: string;
  onChange: (id: string) => void;
  options: Exercise[];
  lang: Lang;
  placeholder: string;
}) {
  const [isOpen, setIsOpen] = useState(false);
  const [query, setQuery] = useState("");
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!isOpen) return;
    const handleClickOutside = (e: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setIsOpen(false);
        setQuery("");
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, [isOpen]);

  const selected = options.find((o) => o.id === value);
  const normalizedQuery = query.trim().toLowerCase();
  const filteredOptions = options.filter(
    (o) => !normalizedQuery || (o.name_he ?? "").toLowerCase().includes(normalizedQuery) || (o.name_en ?? "").toLowerCase().includes(normalizedQuery)
  );

  const select = (id: string) => {
    onChange(id);
    setIsOpen(false);
    setQuery("");
  };

  return (
    <div className="relative" ref={containerRef}>
      <button
        type="button"
        onClick={() => setIsOpen((prev) => !prev)}
        className="w-full flex items-center justify-between gap-2 border-b-2 border-accent/30 p-2 bg-transparent text-start focus:border-focus outline-none"
      >
        <span className={`truncate ${selected ? "text-fg font-bold" : "text-muted"}`}>{selected ? getExerciseName(selected, lang) : placeholder}</span>
        <ChevronDown size={14} className="text-muted shrink-0" />
      </button>

      {isOpen && (
        <div className="on-light absolute z-10 mt-1.5 w-full bg-surface border border-line rounded-xl shadow-elevated overflow-hidden">
          <div className="p-2 border-b border-line">
            <input
              autoFocus
              type="text"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="הקלד לחיפוש..."
              className="on-light w-full bg-surface-alt border border-line-input text-fg text-sm rounded-lg px-3 py-2 outline-none focus:border-focus"
            />
          </div>
          <div className="max-h-56 overflow-y-auto">
            <button type="button" onClick={() => select("")} className="w-full text-start px-3 py-2 text-sm text-muted hover:bg-line transition-colors">
              -- ללא --
            </button>
            {filteredOptions.length === 0 && <p className="px-3 py-3 text-xs text-muted">אין תוצאות</p>}
            {filteredOptions.map((o) => (
              <button
                key={o.id}
                type="button"
                onClick={() => select(o.id)}
                className={`w-full text-start px-3 py-2 text-sm truncate transition-colors ${
                  o.id === value ? "bg-accent/15 text-accent-fg font-bold" : "text-fg hover:bg-line"
                }`}
              >
                {getExerciseName(o, lang)}
              </button>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

// Unified create/edit form: the exact same layout, fields, and styling
// regardless of mode, only pre-filled (from `exercise`) and re-labeled
// ("עריכת תרגיל" vs "הוספת תרגיל חדש") when editing. Previously "edit" was a
// cramped, separately-maintained inline replica crammed into the library
// card (tiny unstyled inputs, no section styling) while "create" got the
// full treatment — this component is now the single source of truth for
// both, rendered as a bottom-sheet/modal from ExerciseLibraryTab.
export default function ExerciseFormModal({ exercise, exercises, internalNotes, lang, onClose, onSaved }: ExerciseFormModalProps) {
  const [form, setForm] = useState<ExerciseFormState>(() => buildInitialForm(exercise, internalNotes));
  const [isSaving, setIsSaving] = useState(false);
  const isEditing = !!exercise;

  const set = <K extends keyof ExerciseFormState>(key: K, value: ExerciseFormState[K]) => setForm((prev) => ({ ...prev, [key]: value }));

  const toggleInArray = (key: "categories" | "equipment" | "secondary_muscles", id: string) => {
    setForm((prev) => ({
      ...prev,
      [key]: prev[key].includes(id) ? prev[key].filter((v) => v !== id) : [...prev[key], id],
    }));
  };

  // Excludes self from the progression pickers — an exercise can't be its
  // own easier/harder version.
  const otherExercises = exercises.filter((e) => e.id !== exercise?.id);

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    if (!form.name_he.trim() && !form.name_en.trim()) {
      alert("חובה להזין שם תרגיל בעברית או באנגלית (לפחות אחד)");
      return;
    }
    setIsSaving(true);

    const payload = {
      name_he: form.name_he || null,
      name_en: form.name_en || null,
      name_display_preference: form.name_display_preference,
      categories: form.categories,
      difficulty_level: form.difficulty_level || null,
      equipment: form.equipment,
      description: form.description,
      description_en: form.description_en || null,
      gif_url: form.gif_url || null,
      secondary_gif_url: form.secondary_gif_url || null,
      target_muscle: form.target_muscle,
      secondary_muscles: form.secondary_muscles.join(","),
      prime_movers: form.prime_movers,
      synergists: form.synergists,
      admin_tags: deriveAdminTagIds(form.categories).join(","),
      common_mistake: form.common_mistake,
      mistakes_en: form.mistakes_en || null,
      patient_cues: form.patient_cues,
      cues_en: form.cues_en || null,
      easier_version_id: form.easier_version_id || null,
      harder_version_id: form.harder_version_id || null,
    };

    const { data, error } = isEditing
      ? await supabase.from("exercises").update(payload).eq("id", exercise.id).select().single()
      : await supabase.from("exercises").insert([payload]).select().single();

    if (error) {
      alert((isEditing ? "שגיאה בעדכון: " : "שגיאה: ") + error.message);
      setIsSaving(false);
      return;
    }

    const targetId = isEditing ? exercise.id : data.id;
    // Create only upserts the internal note when there's actually something
    // to save; edit always does, so clearing the field on an existing
    // exercise actually clears it rather than leaving the old note behind.
    if (form.internal_notes.trim() || isEditing) {
      const { error: notesError } = await supabase
        .from("exercise_internal_notes")
        .upsert({ exercise_id: targetId, notes: form.internal_notes, updated_at: new Date().toISOString() });
      if (notesError) alert("התרגיל נשמר, אך שמירת ההערות הפנימיות נכשלה: " + notesError.message);
    }

    await syncReciprocalLink(targetId, isEditing ? exercise.easier_version_id : null, form.easier_version_id || null, "harder_version_id");
    await syncReciprocalLink(targetId, isEditing ? exercise.harder_version_id : null, form.harder_version_id || null, "easier_version_id");

    setIsSaving(false);
    onSaved();
    onClose();
  };

  return (
    <div className="fixed inset-0 z-[60] bg-backdrop backdrop-blur-sm flex items-end sm:items-center justify-center" onClick={onClose}>
      <div
        className="bg-elevated border border-line w-full sm:max-w-3xl sm:rounded-[2rem] rounded-t-[2rem] max-h-[92vh] flex flex-col animate-in slide-in-from-bottom sm:zoom-in-95 duration-200"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between p-6 border-b border-line shrink-0">
          <h2 className="text-lg font-extrabold text-fg">{isEditing ? "עריכת תרגיל" : "הוספת תרגיל חדש"}</h2>
          <button onClick={onClose} className="p-2 text-muted hover:text-fg transition-colors" aria-label="סגור">
            <X size={20} />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="on-light flex flex-col gap-6 p-6 md:p-8 overflow-y-auto bg-surface text-fg">
          <div className="flex flex-col md:flex-row gap-6">
            <div className="flex-1">
              <label className="block text-[10px] font-extrabold text-muted mb-2 uppercase tracking-wider">שם תרגיל (עברית, אופציונלי)</label>
              <input
                type="text"
                value={form.name_he}
                onChange={(e) => set("name_he", e.target.value)}
                placeholder="לדוגמה: פשיטת ברך במכונה"
                className="w-full border-b-2 border-line-input p-2 bg-transparent text-fg placeholder:text-muted focus:border-focus focus:ring-2 focus:ring-focus outline-none"
              />
            </div>
            <div className="flex-1">
              <label className="block text-[10px] font-extrabold text-muted mb-2 uppercase tracking-wider">שם תרגיל (אנגלית, אופציונלי)</label>
              <input
                type="text"
                value={form.name_en}
                onChange={(e) => set("name_en", e.target.value)}
                placeholder="e.g. Leg Extension"
                className="w-full border-b-2 border-line-input p-2 bg-transparent text-fg placeholder:text-muted focus:border-focus focus:ring-2 focus:ring-focus outline-none text-left"
                dir="ltr"
              />
            </div>
            <div className="flex-1">
              <label className="block text-[10px] font-extrabold text-muted mb-2 uppercase tracking-wider">שם מוצג כברירת מחדל</label>
              <select
                value={form.name_display_preference}
                onChange={(e) => set("name_display_preference", e.target.value as NameDisplayPreference)}
                className="w-full border-b-2 border-line-input p-2 bg-transparent text-fg font-bold focus:border-focus focus:ring-2 focus:ring-focus outline-none"
              >
                {NAME_DISPLAY_PREFERENCES.map((p) => (
                  <option key={p.id} value={p.id} className="on-light bg-surface">
                    {p.label}
                  </option>
                ))}
              </select>
            </div>
          </div>

          <div className="flex flex-col md:flex-row gap-6">
            <div className="flex-[2]">
              <label className="block text-[10px] font-extrabold text-muted mb-2 uppercase tracking-wider">קטגוריות (ניתן לבחור כמה)</label>
              <div className="flex flex-wrap gap-2">
                {ADMIN_TAGS.map((tag) => {
                  const isSelected = form.categories.includes(tag.label);
                  return (
                    <button
                      key={tag.id}
                      type="button"
                      onClick={() => toggleInArray("categories", tag.label)}
                      className={`px-3 py-1.5 rounded-full text-xs font-bold transition-all border ${
                        isSelected ? "bg-accent text-on-accent border-accent shadow-sm" : "bg-surface-alt text-fg border-line hover:bg-line"
                      }`}
                    >
                      {tag.label}
                    </button>
                  );
                })}
              </div>
            </div>
            <div className="flex-1">
              <label className="block text-[10px] font-extrabold text-muted mb-2 uppercase tracking-wider">רמת קושי</label>
              <select
                value={form.difficulty_level}
                onChange={(e) => set("difficulty_level", e.target.value)}
                className="w-full border-b-2 border-line-input p-2 bg-transparent text-fg font-bold focus:border-focus focus:ring-2 focus:ring-focus outline-none"
              >
                <option value="" className="on-light bg-surface">
                  -- לא צוין --
                </option>
                {DIFFICULTY_LEVELS.map((d) => (
                  <option key={d.id} value={d.id} className="on-light bg-surface">
                    {d.label}
                  </option>
                ))}
              </select>
            </div>
          </div>

          <div>
            <label className="block text-[10px] font-extrabold text-muted mb-2 uppercase tracking-wider flex items-center gap-1.5">
              <Dumbbell size={12} /> ציוד נדרש (ניתן לבחור כמה)
            </label>
            <div className="flex flex-wrap gap-2">
              {EQUIPMENT_LIST.map((eq) => {
                const isSelected = form.equipment.includes(eq.id);
                return (
                  <button
                    key={eq.id}
                    type="button"
                    onClick={() => toggleInArray("equipment", eq.id)}
                    className={`px-3 py-1.5 rounded-full text-xs font-bold transition-all border ${
                      isSelected ? "bg-accent text-on-accent border-accent shadow-sm" : "bg-surface-alt text-fg border-line hover:bg-line"
                    }`}
                  >
                    {eq.label}
                  </button>
                );
              })}
            </div>
          </div>

          <div>
            <label className="block text-[10px] font-extrabold text-muted mb-2 uppercase tracking-wider">קישור לגיף או תמונה (URL)</label>
            <input
              type="url"
              value={form.gif_url}
              onChange={(e) => set("gif_url", e.target.value)}
              placeholder="https://... (אופציונלי)"
              className="w-full border-b-2 border-line-input p-2 bg-transparent text-fg placeholder:text-muted focus:border-focus focus:ring-2 focus:ring-focus outline-none text-left"
              dir="ltr"
            />
          </div>
          <div>
            <label className="block text-[10px] font-extrabold text-muted mb-2 uppercase tracking-wider">קישור מדיה - זווית נוספת (אופציונלי)</label>
            <input
              type="url"
              value={form.secondary_gif_url}
              onChange={(e) => set("secondary_gif_url", e.target.value)}
              placeholder="https://..."
              className="w-full border-b-2 border-line-input p-2 bg-transparent text-fg placeholder:text-muted focus:border-focus focus:ring-2 focus:ring-focus outline-none text-left"
              dir="ltr"
            />
          </div>

          <div className="bg-accent/5 p-5 rounded-2xl border border-accent/20 flex flex-col md:flex-row gap-6">
            <div className="flex-1 border-b md:border-b-0 md:border-l border-accent/20 pb-4 md:pb-0 md:pl-6">
              <label className="block text-sm font-bold text-accent-fg mb-2 flex items-center gap-2">
                <Target size={18} /> שריר מטרה (אגוניסט)
              </label>
              <select
                value={form.target_muscle}
                onChange={(e) => set("target_muscle", e.target.value)}
                className="w-full border-b-2 border-accent/30 p-2 bg-transparent focus:border-focus focus:ring-2 focus:ring-focus outline-none text-fg font-bold"
              >
                <option value="" className="on-light bg-surface">
                  -- בחר שריר מרכזי --
                </option>
                {MUSCLE_REGIONS.map((region) => (
                  <optgroup key={region.id} label={region.label} className="on-light bg-surface">
                    {AVAILABLE_MUSCLES.filter((m) => region.muscleIds.includes(m.id)).map((m) => (
                      <option key={m.id} value={m.id} className="on-light bg-surface">
                        {m.label}
                      </option>
                    ))}
                  </optgroup>
                ))}
              </select>
              <p className="text-[10px] text-accent-fg/80 mt-2 font-medium">* לפיו המערכת תחפש תרגילים חלופיים.</p>
            </div>
            <div className="flex-[2]">
              <label className="block text-sm font-bold text-accent-fg mb-2">שרירים מייצבים (סינרגיסטים)</label>
              <div className="flex flex-col gap-2.5">
                {MUSCLE_REGIONS.map((region) => {
                  const muscles = AVAILABLE_MUSCLES.filter((m) => region.muscleIds.includes(m.id) && m.id !== form.target_muscle);
                  if (muscles.length === 0) return null;
                  return (
                    <div key={region.id}>
                      <div className="text-[10px] font-bold text-muted mb-1">{region.label}</div>
                      <div className="flex flex-wrap gap-2">
                        {muscles.map((m) => {
                          const isSelected = form.secondary_muscles.includes(m.id);
                          return (
                            <button
                              key={m.id}
                              type="button"
                              onClick={() => toggleInArray("secondary_muscles", m.id)}
                              className={`px-3 py-1.5 rounded-full text-xs font-bold transition-all border ${
                                isSelected ? "bg-accent text-on-accent border-accent shadow-sm" : "bg-surface-alt text-fg border-line hover:bg-line"
                              }`}
                            >
                              {m.label}
                            </button>
                          );
                        })}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          </div>

          <div>
            <label className="block text-sm font-bold text-accent-fg mb-2 flex items-center gap-2">
              <Target size={18} /> מפת שרירים (Heatmap)
            </label>
            <MusclePicker
              primeMovers={form.prime_movers}
              synergists={form.synergists}
              onChange={({ primeMovers, synergists }) => setForm((prev) => ({ ...prev, prime_movers: primeMovers, synergists }))}
            />
          </div>

          <div className="bg-accent/5 p-5 rounded-2xl border border-accent/20 flex flex-col md:flex-row gap-6">
            <div className="flex-1">
              <label className="block text-sm font-bold text-accent-fg mb-2 flex items-center gap-2">
                <TrendingDown size={18} /> גרסה קלה יותר (Progression / קל)
              </label>
              <ExerciseCombobox value={form.easier_version_id} onChange={(id) => set("easier_version_id", id)} options={otherExercises} lang={lang} placeholder="-- ללא --" />
            </div>
            <div className="flex-1">
              <label className="block text-sm font-bold text-accent-fg mb-2 flex items-center gap-2">
                <TrendingUp size={18} /> גרסה קשה יותר (Progression / קשה)
              </label>
              <ExerciseCombobox value={form.harder_version_id} onChange={(id) => set("harder_version_id", id)} options={otherExercises} lang={lang} placeholder="-- ללא --" />
            </div>
          </div>

          <div className="on-light bg-surface-alt p-5 rounded-2xl border border-line">
            <label className="block text-sm font-bold text-muted mb-3 flex items-center gap-2">
              <Lock size={16} /> הערות פנימיות לצוות (לאדמין בלבד, לא מוצג למטופלים)
            </label>
            <textarea
              value={form.internal_notes}
              onChange={(e) => set("internal_notes", e.target.value)}
              placeholder="הערות קליניות, שיקולים פנימיים וכו'"
              className="w-full min-h-[120px] border-b-2 border-line-input p-2 bg-transparent text-fg placeholder:text-muted focus:border-focus focus:ring-2 focus:ring-focus outline-none"
              rows={4}
            />
          </div>

          <div className="bg-accent/5 p-5 rounded-2xl border border-accent/20">
            <label className="block text-sm font-bold text-accent-fg mb-2 flex items-center gap-2">
              <Check size={18} /> דגשים קליניים (Clinical Cues, עברית · אופציונלי)
            </label>
            <textarea
              value={form.patient_cues}
              onChange={(e) => set("patient_cues", e.target.value)}
              placeholder={"שורה אחת לכל דגש, לדוגמה:\nשמור על גב ישר\nנשוף בזמן המאמץ"}
              className="w-full min-h-[120px] border-b-2 border-accent-fg/50 p-2 bg-transparent text-fg placeholder:text-muted focus:border-focus focus:ring-2 focus:ring-focus outline-none"
              rows={4}
            />
            <p className="text-[10px] text-accent-fg/80 mt-2 font-medium">* כל שורה תוצג למטופל עם ✅ בתחילתה.</p>
          </div>

          <div className="bg-accent/5 p-5 rounded-2xl border border-accent/20">
            <label className="block text-sm font-bold text-accent-fg mb-2 flex items-center gap-2" dir="ltr">
              <Check size={18} /> Clinical Cues / Do&apos;s (English · Optional)
            </label>
            <textarea
              value={form.cues_en}
              onChange={(e) => set("cues_en", e.target.value)}
              dir="ltr"
              placeholder={"One cue per line, e.g.:\nKeep your back straight\nExhale during the effort"}
              className="w-full min-h-[120px] border-b-2 border-accent-fg/50 p-2 bg-transparent text-fg placeholder:text-muted focus:border-focus focus:ring-2 focus:ring-focus outline-none text-left"
              rows={4}
            />
            <p className="text-[10px] text-accent-fg/80 mt-2 font-medium" dir="ltr">* Each line is shown to the patient with a ✅.</p>
          </div>

          <div className="bg-warm/10 p-5 rounded-2xl border border-warm/30">
            <label className="block text-sm font-bold text-warm-fg mb-2 flex items-center gap-2">
              <AlertTriangle size={18} /> טעויות נפוצות (עברית · אופציונלי)
            </label>
            <textarea
              value={form.common_mistake}
              onChange={(e) => set("common_mistake", e.target.value)}
              placeholder={"שורה אחת לכל טעות, לדוגמה:\nאל תיתן לברך לקרוס פנימה\nאל תנעל מרפקים בקצה התנועה"}
              className="w-full min-h-[120px] border-b-2 border-warm-fg/50 p-2 bg-transparent text-fg placeholder:text-muted focus:border-focus focus:ring-2 focus:ring-focus outline-none"
              rows={4}
            />
            <p className="text-[10px] text-warm-fg mt-2 font-medium">* כל שורה תוצג למטופל עם ❌ בתחילתה.</p>
          </div>

          <div className="bg-warm/10 p-5 rounded-2xl border border-warm/30">
            <label className="block text-sm font-bold text-warm-fg mb-2 flex items-center gap-2" dir="ltr">
              <AlertTriangle size={18} /> Common Mistakes / Don&apos;ts (English · Optional)
            </label>
            <textarea
              value={form.mistakes_en}
              onChange={(e) => set("mistakes_en", e.target.value)}
              dir="ltr"
              placeholder={"One mistake per line, e.g.:\nDon't let the knee cave inward\nDon't lock the elbows at the end of the movement"}
              className="w-full min-h-[120px] border-b-2 border-warm-fg/50 p-2 bg-transparent text-fg placeholder:text-muted focus:border-focus focus:ring-2 focus:ring-focus outline-none text-left"
              rows={4}
            />
            <p className="text-[10px] text-warm-fg mt-2 font-medium" dir="ltr">* Each line is shown to the patient with a ❌.</p>
          </div>

          <div>
            <label className="block text-[10px] font-extrabold text-muted mb-2 uppercase tracking-wider">תיאור / הנחיות ביצוע (עברית · אופציונלי)</label>
            <textarea
              value={form.description}
              onChange={(e) => set("description", e.target.value)}
              className="w-full min-h-[120px] border-b-2 border-line-input p-2 bg-transparent text-fg focus:border-focus focus:ring-2 focus:ring-focus outline-none"
              rows={4}
            />
          </div>

          <div>
            <label className="block text-[10px] font-extrabold text-muted mb-2 uppercase tracking-wider" dir="ltr">
              Description / Instructions (English · Optional)
            </label>
            <textarea
              value={form.description_en}
              onChange={(e) => set("description_en", e.target.value)}
              dir="ltr"
              className="w-full min-h-[120px] border-b-2 border-line-input p-2 bg-transparent text-fg focus:border-focus focus:ring-2 focus:ring-focus outline-none text-left"
              rows={4}
            />
          </div>

          <div className="on-light flex gap-3 sticky bottom-0 -mx-6 md:-mx-8 -mb-6 md:-mb-8 px-6 md:px-8 py-5 bg-surface border-t border-line">
            <button type="submit" disabled={isSaving} className="flex-1 bg-btn-primary text-btn-primary-fg py-3.5 rounded-2xl font-black hover:bg-btn-primary-hover active:bg-btn-primary-active transition-colors disabled:bg-disabled disabled:text-disabled-fg disabled:hover:bg-disabled">
              {isSaving ? "שומר..." : isEditing ? "שמור שינויים" : "שמור במאגר"}
            </button>
            <button type="button" onClick={onClose} className="on-light px-8 bg-surface-alt text-fg py-3.5 rounded-2xl font-bold hover:bg-line transition-colors">
              ביטול
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
