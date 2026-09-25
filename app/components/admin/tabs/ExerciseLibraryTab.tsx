"use client";

import { useState } from "react";
import { Dumbbell, Edit3, Image as ImageIcon, Lock, Plus, Search, Target, Trash2, TrendingDown, TrendingUp, X } from "lucide-react";
import { supabase } from "@/app/lib/supabase";
import { ADMIN_CATEGORY_STYLES, ADMIN_TAGS, AVAILABLE_MUSCLES, DEFAULT_ADMIN_CATEGORY_STYLE, DIFFICULTY_LEVELS, EQUIPMENT_LIST } from "@/app/constants/catalog";
import { formatCueLines, getExerciseName } from "@/app/utils/format";
import type { Exercise, Lang } from "@/app/types";
import ExerciseFormModal from "@/app/components/admin/ExerciseFormModal";

interface ExerciseLibraryTabProps {
  exercises: Exercise[];
  internalNotesByExerciseId: Record<string, string>;
  lang: Lang;
  onRefresh: () => void;
}

// The exercise library: filterable grid + a single unified form (
// ExerciseFormModal) for both "add new" and "edit" — previously edit was a
// separate, cramped inline replica of the create form crammed into the
// library card. Extracted out of LegacyAdminApp.tsx the same way
// ProgramLibraryTab already was.
export default function ExerciseLibraryTab({ exercises, internalNotesByExerciseId, lang, onRefresh }: ExerciseLibraryTabProps) {
  const [libExerciseTagFilter, setLibExerciseTagFilter] = useState<string>("all");
  const [searchQuery, setSearchQuery] = useState("");
  const [isCreating, setIsCreating] = useState(false);
  const [editingExercise, setEditingExercise] = useState<Exercise | null>(null);

  // Matches on the raw name_he/name_en columns rather than the resolved
  // getExerciseName() display string, so an admin can find an exercise by
  // typing either language regardless of its name_display_preference.
  const normalizedQuery = searchQuery.trim().toLowerCase();
  const filteredLibraryExercises = exercises.filter((e) => {
    const matchesTag = libExerciseTagFilter === "all" || (e.admin_tags && e.admin_tags.split(",").includes(libExerciseTagFilter));
    const matchesSearch =
      !normalizedQuery ||
      (e.name_he ?? "").toLowerCase().includes(normalizedQuery) ||
      (e.name_en ?? "").toLowerCase().includes(normalizedQuery);
    return matchesTag && matchesSearch;
  });

  const handleDeleteEx = async (id: string) => {
    if (!confirm("האם אתה בטוח שברצונך למחוק תרגיל זה לצמיתות ממאגר התרגילים?")) return;
    const { error } = await supabase.from("exercises").delete().eq("id", id);
    if (error) alert("לא ניתן למחוק את התרגיל מכיוון שהוא משויך כבר לפרוטוקול או למטופל פעיל. הסר אותו קודם משם.");
    else {
      alert("התרגיל נמחק בהצלחה!");
      onRefresh();
    }
  };

  return (
    <div className="max-w-6xl mx-auto animate-in fade-in">
      <header className="mb-10 hidden md:flex items-center justify-between">
        <div>
          <h1 className="text-3xl md:text-4xl font-black text-white tracking-tight">ספריית התרגילים</h1>
          <p className="text-[13px] text-stone-500 mt-1.5">ניהול מאגר התרגילים המרכזי — משמש את בונה הפרוטוקולים ואת בונה ה-DIY של המטופלים.</p>
        </div>
        <button
          onClick={() => setIsCreating(true)}
          className="shrink-0 flex items-center gap-2 bg-teal-500 text-stone-950 px-6 py-3 rounded-2xl font-black hover:bg-teal-400 transition-colors"
        >
          <Plus size={18} /> תרגיל חדש
        </button>
      </header>
      <button
        onClick={() => setIsCreating(true)}
        className="md:hidden w-full mb-8 flex items-center justify-center gap-2 bg-teal-500 text-stone-950 px-6 py-3.5 rounded-2xl font-black hover:bg-teal-400 transition-colors"
      >
        <Plus size={18} /> תרגיל חדש
      </button>

      <div className="relative mb-4">
        <Search size={16} className="pointer-events-none absolute top-1/2 right-4 -translate-y-1/2 text-stone-500" />
        <input
          type="text"
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          placeholder="חפש תרגיל לפי שם (עברית או אנגלית)..."
          className="w-full bg-[#1c1c1e] border border-stone-800 text-white placeholder:text-stone-600 rounded-2xl pr-11 pl-11 py-3 outline-none focus:border-teal-500 focus:ring-1 focus:ring-teal-500/30"
        />
        {searchQuery && (
          <button
            onClick={() => setSearchQuery("")}
            aria-label="נקה חיפוש"
            className="absolute top-1/2 left-4 -translate-y-1/2 text-stone-500 hover:text-white transition-colors"
          >
            <X size={16} />
          </button>
        )}
      </div>

      <div className="mb-6 flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
        <h2 className="text-xl font-black text-white flex items-center gap-2">
          מאגר תרגילים <span className="text-teal-400 text-base font-extrabold">({filteredLibraryExercises.length})</span>
        </h2>
        <div className="flex flex-wrap gap-1.5 bg-[#1c1c1e] p-1.5 rounded-2xl border border-stone-800">
          <button
            onClick={() => setLibExerciseTagFilter("all")}
            className={`px-4 py-2 text-xs font-extrabold rounded-xl transition-colors ${libExerciseTagFilter === "all" ? "bg-white text-stone-950" : "text-stone-400 hover:bg-stone-800"}`}
          >
            הכל
          </button>
          {ADMIN_TAGS.map((tag) => (
            <button
              key={tag.id}
              onClick={() => setLibExerciseTagFilter(tag.id)}
              className={`px-4 py-2 text-xs font-extrabold rounded-xl transition-colors flex items-center gap-1 ${
                libExerciseTagFilter === tag.id ? "bg-teal-500 text-stone-950" : "text-stone-400 hover:bg-stone-800"
              }`}
            >
              <Lock size={11} /> {tag.label}
            </button>
          ))}
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {filteredLibraryExercises.length === 0 && (
          <div className="col-span-full text-center p-12 bg-[#1c1c1e]/50 rounded-3xl border border-stone-800">
            <ImageIcon size={40} className="mx-auto text-stone-600 mb-4" />
            <h3 className="text-xl font-bold text-white">אין תרגילים העונים לסינון</h3>
            <p className="text-stone-500">נסה לשנות את החיפוש, לבחור תגית אחרת, או להוסיף תרגיל חדש.</p>
          </div>
        )}
        {filteredLibraryExercises.map((ex) => {
          const style = ADMIN_CATEGORY_STYLES[ex.categories?.[0]] ?? DEFAULT_ADMIN_CATEGORY_STYLE;
          return (
            <div key={ex.id} className="bg-[#1c1c1e] rounded-3xl border border-stone-800 overflow-hidden flex flex-col group relative">
              <div className="h-[150px] relative overflow-hidden" style={{ background: `linear-gradient(150deg, ${style.glow}, #1c1c1e 75%)` }}>
                <div className="absolute inset-0" style={{ background: `radial-gradient(circle at 70% 20%, ${style.radial}, transparent 55%)` }}></div>
                {ex.gif_url ? (
                  <div className="absolute inset-0 flex items-center justify-center p-6">
                    {ex.gif_url.toLowerCase().includes(".mp4") || ex.gif_url.toLowerCase().includes(".webm") ? (
                      <video src={ex.gif_url} autoPlay muted playsInline loop className="max-w-full max-h-full rounded-xl bg-white/95 object-contain p-1.5 shadow-lg group-hover:scale-105 transition-transform duration-500" />
                    ) : (
                      <img src={ex.gif_url} alt={getExerciseName(ex, lang)} className="max-w-full max-h-full rounded-xl bg-white/95 object-contain p-1.5 shadow-lg group-hover:scale-105 transition-transform duration-500" />
                    )}
                  </div>
                ) : (
                  <div className="absolute inset-0 flex items-center justify-center text-stone-500 text-xs font-bold">אין מדיה</div>
                )}
                <div className="absolute top-3.5 right-3.5 bg-white/95 text-stone-950 text-[11px] font-extrabold px-3 py-1.5 rounded-full">{(ex.categories || []).join(" / ")}</div>
              </div>
              <div className="p-5 flex-1 flex flex-col">
                <h3 className="text-[15px] font-extrabold text-white mb-2">{getExerciseName(ex, lang)}</h3>

                {ex.admin_tags && (
                  <div className="flex flex-wrap gap-1 mb-2.5">
                    {ex.admin_tags.split(",").filter(Boolean).map((tagId: string) => {
                      const tagLabel = ADMIN_TAGS.find((t) => t.id === tagId)?.label || tagId;
                      return (
                        <span key={tagId} className="bg-stone-950 text-stone-400 px-2.5 py-1 rounded-full text-[9px] font-extrabold border border-stone-800 flex items-center gap-1">
                          <Lock size={8} />
                          {tagLabel}
                        </span>
                      );
                    })}
                  </div>
                )}

                {ex.difficulty_level && (
                  <p className="text-[11px] font-bold text-amber-400 mb-1.5 flex items-center gap-1.5">
                    {DIFFICULTY_LEVELS.find((d) => d.id === ex.difficulty_level)?.label || ex.difficulty_level}
                  </p>
                )}
                {ex.target_muscle && (
                  <p className="text-[11px] font-bold text-teal-400 mb-1.5 flex items-center gap-1.5">
                    <Target size={11} /> מרכזי: {AVAILABLE_MUSCLES.find((m) => m.id === ex.target_muscle)?.label || ex.target_muscle}
                  </p>
                )}
                {ex.equipment && ex.equipment.length > 0 && (
                  <div className="flex flex-wrap gap-1 mb-1.5">
                    {ex.equipment.map((eqId: string) => (
                      <span key={eqId} className="bg-stone-950 text-stone-300 px-2 py-0.5 rounded-md text-[10px] font-bold border border-stone-800 flex items-center gap-1">
                        <Dumbbell size={9} />
                        {EQUIPMENT_LIST.find((e) => e.id === eqId)?.label || eqId}
                      </span>
                    ))}
                  </div>
                )}
                {formatCueLines(ex.patient_cues, "✅").map((line, i) => (
                  <p key={`cue-${i}`} className="text-[11px] font-bold text-emerald-400 mb-1 leading-relaxed">
                    {line.emoji} {line.text}
                  </p>
                ))}
                {formatCueLines(ex.common_mistake, "❌").map((line, i) => (
                  <p key={`mistake-${i}`} className="text-[11px] font-bold text-red-400 mb-1 leading-relaxed">
                    {line.emoji} {line.text}
                  </p>
                ))}
                {ex.easier_version_id && (
                  <p className="text-[11px] font-bold text-indigo-400 mb-1.5 flex items-center gap-1.5">
                    <TrendingDown size={11} /> קל יותר: {(() => {
                      const linked = exercises.find((e) => e.id === ex.easier_version_id);
                      return linked ? getExerciseName(linked, lang) : "—";
                    })()}
                  </p>
                )}
                {ex.harder_version_id && (
                  <p className="text-[11px] font-bold text-indigo-400 mb-1.5 flex items-center gap-1.5">
                    <TrendingUp size={11} /> קשה יותר: {(() => {
                      const linked = exercises.find((e) => e.id === ex.harder_version_id);
                      return linked ? getExerciseName(linked, lang) : "—";
                    })()}
                  </p>
                )}
                <p className="text-[13px] text-stone-500 font-medium leading-relaxed mt-1 flex-1">{ex.description}</p>
                <div className="flex gap-2 mt-3 pt-3 border-t border-stone-800">
                  <button onClick={() => setEditingExercise(ex)} className="flex-1 flex items-center justify-center gap-1 text-stone-400 hover:text-teal-400 hover:bg-teal-500/10 py-2 rounded-lg transition-colors">
                    <Edit3 size={16} />
                    <span className="text-xs font-bold">ערוך</span>
                  </button>
                  <button onClick={() => handleDeleteEx(ex.id)} className="flex-1 flex items-center justify-center gap-1 text-stone-400 hover:text-red-400 hover:bg-red-500/10 py-2 rounded-lg transition-colors">
                    <Trash2 size={16} />
                    <span className="text-xs font-bold">מחק</span>
                  </button>
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {isCreating && (
        <ExerciseFormModal
          exercise={null}
          exercises={exercises}
          internalNotes=""
          lang={lang}
          onClose={() => setIsCreating(false)}
          onSaved={onRefresh}
        />
      )}
      {editingExercise && (
        <ExerciseFormModal
          key={editingExercise.id}
          exercise={editingExercise}
          exercises={exercises}
          internalNotes={internalNotesByExerciseId[editingExercise.id] || ""}
          lang={lang}
          onClose={() => setEditingExercise(null)}
          onSaved={onRefresh}
        />
      )}
    </div>
  );
}
