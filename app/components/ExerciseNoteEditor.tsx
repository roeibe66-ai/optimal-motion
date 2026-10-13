"use client";

import type { Exercise } from "@/app/types";
import { isUnilateral, NOTE_MAX_LENGTH, SIDE_OPTIONS, sideOfNote, withSide } from "@/app/utils/exerciseNotes";

interface ExerciseNoteEditorProps {
  exercise: Pick<Exercise, "name_en" | "name_he">;
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  className?: string;
}

// A per-exercise note field, shared by the admin builder (the therapist's
// note) and the patient's DIY builder (their own). One-sided exercises also
// get side chips that set the note's prefix (app/utils/exerciseNotes.ts).
export default function ExerciseNoteEditor({ exercise, value, onChange, placeholder = "הערה לתרגיל (לא חובה)", className = "" }: ExerciseNoteEditorProps) {
  const side = sideOfNote(value);
  return (
    <div className={`flex flex-col gap-1.5 ${className}`}>
      {isUnilateral(exercise) && (
        <div className="flex flex-wrap gap-1.5" role="group" aria-label="צד">
          {SIDE_OPTIONS.map((o) => (
            <button
              key={o.id}
              type="button"
              onClick={() => onChange(withSide(value, o.id))}
              aria-pressed={side === o.id}
              className={`text-[0.6875rem] font-bold px-2.5 py-1 rounded-full border transition-colors duration-150 active:scale-95 ${
                side === o.id ? "bg-accent text-on-accent border-transparent" : "text-muted border-line hover:text-fg"
              }`}
            >
              {o.label}
            </button>
          ))}
        </div>
      )}
      <input
        type="text"
        value={value}
        maxLength={NOTE_MAX_LENGTH}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        aria-label={placeholder}
        className="w-full bg-transparent border-b border-line-input text-fg text-sm py-1 outline-none focus:border-focus placeholder:text-muted"
      />
    </div>
  );
}
