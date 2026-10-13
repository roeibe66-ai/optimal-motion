"use client";

import { useEffect, useLayoutEffect, useRef, useState, type KeyboardEvent, type PointerEvent as ReactPointerEvent } from "react";
import { ArrowLeftRight, GripVertical, Info, Minus, Plus, Trash2 } from "lucide-react";
import { AVAILABLE_MUSCLES } from "@/app/constants/catalog";
import { useAuth } from "@/app/context/AuthContext";
import { ExerciseThumb } from "@/app/components/ExerciseMedia";
import ExerciseNoteEditor from "@/app/components/ExerciseNoteEditor";
import ExerciseNotes from "@/app/components/ExerciseNotes";
import type { DiyExercise, DiyPrescription, Exercise } from "@/app/types";
import { getExerciseName } from "@/app/utils/format";
import { tapHaptic } from "@/app/utils/haptics";
import { prefersReducedMotion, rubberband } from "@/app/utils/motion";
import { DIY_LIMITS, clampDiy, getDiyPrescription } from "@/app/utils/diy";

interface DiyDayListProps {
  exercises: DiyExercise[];
  onChangePrescription: (idx: number, prescription: DiyPrescription) => void;
  onReorder: (from: number, to: number) => void;
  onRemove: (idx: number) => void;
  onViewExerciseInfo: (exercise: Exercise) => void;
}

type Limit = { min: number; max: number; step: number };

// A −/value/+ control whose value can also be typed. The typed text is kept
// locally while editing and only clamped and committed on blur/Enter, so a
// half-typed number ("1" on the way to "12") isn't snapped to the minimum.
function Stepper({ label, value, limit, onChange, labelAction }: { label: string; value: number; limit: Limit; onChange: (v: number) => void; labelAction?: { onClick: () => void; ariaLabel: string } }) {
  const [text, setText] = useState<string | null>(null);

  const commit = () => {
    if (text === null) return;
    const parsed = parseInt(text, 10);
    onChange(Number.isNaN(parsed) ? value : clampDiy(parsed, limit));
    setText(null);
  };

  const step = (dir: 1 | -1) => {
    const next = clampDiy(value + dir * limit.step, limit);
    if (next !== value) tapHaptic();
    onChange(next);
  };

  const stepButton =
    "w-8 h-8 rounded-full flex items-center justify-center text-fg hover:bg-line active:scale-90 transition-ui duration-150 ease-out disabled:opacity-30 disabled:pointer-events-none";

  return (
    <div className="on-light bg-surface-alt rounded-2xl px-1.5 pt-1.5 pb-1 flex flex-col items-center min-w-0">
      {labelAction ? (
        <button onClick={labelAction.onClick} aria-label={labelAction.ariaLabel} className="flex items-center gap-1 text-[0.6875rem] font-extrabold text-accent-fg hover:underline">
          {label}
          <ArrowLeftRight size={10} />
        </button>
      ) : (
        <span className="text-[0.6875rem] font-extrabold text-muted">{label}</span>
      )}
      <div className="flex items-center justify-between w-full">
        <button onClick={() => step(-1)} disabled={value <= limit.min} aria-label={`הפחת ${label}`} className={stepButton}>
          <Minus size={13} strokeWidth={2.5} />
        </button>
        <input
          type="text"
          inputMode="numeric"
          aria-label={label}
          value={text ?? String(value)}
          onFocus={(e) => e.target.select()}
          onChange={(e) => setText(e.target.value.replace(/\D/g, "").slice(0, 3))}
          onBlur={commit}
          onKeyDown={(e) => e.key === "Enter" && e.currentTarget.blur()}
          // 16px on phones: smaller inputs make iOS Safari zoom the page on focus.
          className="w-9 bg-transparent text-center text-base md:text-sm font-black text-fg tabular-nums outline-none rounded-md focus:bg-surface focus:ring-2 focus:ring-focus"
        />
        <button onClick={() => step(1)} disabled={value >= limit.max} aria-label={`הוסף ${label}`} className={stepButton}>
          <Plus size={13} strokeWidth={2.5} />
        </button>
      </div>
    </div>
  );
}

// The builder's day list: one card per exercise with its sets, reps (or
// seconds) and rest, reorderable by dragging the grip handle — or, from the
// keyboard, with ArrowUp/ArrowDown on the focused handle.
//
// Drag is hand-rolled on pointer events (no drag library in this app): the
// rows' rects are measured once at grab time, the grabbed row follows the
// finger via transform, and the rows it passes slide out of its way by its
// height. The new order is committed only on release.
export default function DiyDayList({ exercises, onChangePrescription, onReorder, onRemove, onViewExerciseInfo }: DiyDayListProps) {
  const { lang } = useAuth();
  const itemRefs = useRef<(HTMLLIElement | null)[]>([]);
  const handleRefs = useRef<(HTMLButtonElement | null)[]>([]);
  const [drag, setDrag] = useState<{ from: number; to: number; dy: number; startY: number; rects: DOMRect[] } | null>(null);

  // Live drag bookkeeping outside React state, for the auto-scroll loop:
  // the pointer's last position, and how far the scroller has moved since
  // the grab (rects were measured before it moved).
  const live = useRef({ clientY: 0, scroller: null as HTMLElement | null, scrollStart: 0, raf: 0 });
  // Where the grabbed row was when released, so it can settle into its new
  // slot from there instead of jumping (applied after the reorder renders).
  const settle = useRef<{ to: number; fromTop: number } | null>(null);

  const scrollerOf = (el: HTMLElement | null): HTMLElement => {
    for (let n = el?.parentElement; n; n = n.parentElement) {
      const oy = getComputedStyle(n).overflowY;
      if ((oy === "auto" || oy === "scroll") && n.scrollHeight > n.clientHeight) return n;
    }
    return document.scrollingElement as HTMLElement;
  };

  // Position the grabbed row for the pointer's current Y (plus any
  // auto-scroll), rubber-banding past the first/last slot instead of a hard stop.
  const track = (clientY: number) => {
    setDrag((d) => {
      if (!d) return d;
      const { rects } = d;
      const self = rects[d.from];
      const scrolled = (live.current.scroller?.scrollTop ?? 0) - live.current.scrollStart;
      const raw = clientY - d.startY + scrolled;
      const min = rects[0].top - self.top;
      const max = rects[rects.length - 1].bottom - self.bottom;
      const dy = raw < min ? min + rubberband(raw - min, self.height) : raw > max ? max + rubberband(raw - max, self.height) : raw;
      const center = self.top + self.height / 2 + dy;
      const to = rects.filter((r, i) => i !== d.from && r.top + r.height / 2 < center).length;
      if (to !== d.to) tapHaptic();
      return { ...d, to, dy };
    });
  };

  // Near the top/bottom of the scroller, keep scrolling (faster the closer
  // the finger is) so a row can be carried past what's on screen.
  const EDGE = 72;
  const autoScrollLoop = () => {
    const { scroller, clientY } = live.current;
    if (scroller) {
      const box = scroller === document.scrollingElement ? { top: 0, bottom: window.innerHeight } : scroller.getBoundingClientRect();
      const speed = clientY < box.top + EDGE ? -(box.top + EDGE - clientY) / EDGE : clientY > box.bottom - EDGE ? (clientY - (box.bottom - EDGE)) / EDGE : 0;
      if (speed !== 0) {
        scroller.scrollTop += Math.max(-1, Math.min(1, speed)) * 14;
        track(clientY);
      }
    }
    live.current.raf = requestAnimationFrame(autoScrollLoop);
  };

  const onHandlePointerDown = (e: ReactPointerEvent<HTMLButtonElement>, idx: number) => {
    if (e.button !== 0 || exercises.length < 2) return;
    e.preventDefault();
    e.currentTarget.setPointerCapture(e.pointerId);
    const rects = itemRefs.current.slice(0, exercises.length).map((el) => el!.getBoundingClientRect());
    const scroller = scrollerOf(itemRefs.current[idx]);
    live.current = { clientY: e.clientY, scroller, scrollStart: scroller.scrollTop, raf: requestAnimationFrame(autoScrollLoop) };
    setDrag({ from: idx, to: idx, dy: 0, startY: e.clientY, rects });
    tapHaptic();
  };

  const onHandlePointerMove = (e: ReactPointerEvent<HTMLButtonElement>) => {
    if (!drag) return;
    live.current.clientY = e.clientY;
    track(e.clientY);
  };

  const endDrag = () => {
    cancelAnimationFrame(live.current.raf);
    if (!drag) return;
    const el = itemRefs.current[drag.from];
    settle.current = el && !prefersReducedMotion() ? { to: drag.to, fromTop: el.getBoundingClientRect().top } : null;
    if (drag.to !== drag.from) onReorder(drag.from, drag.to);
    setDrag(null);
  };

  useEffect(() => () => cancelAnimationFrame(live.current.raf), []);

  // FLIP: after the reorder lands, start the moved row where it was dropped
  // and let it glide into its slot (it used to jump there).
  useLayoutEffect(() => {
    const s = settle.current;
    if (!s || drag) return;
    settle.current = null;
    const el = itemRefs.current[s.to];
    if (!el) return;
    const delta = s.fromTop - el.getBoundingClientRect().top;
    if (Math.abs(delta) < 1) return;
    el.style.transition = "none";
    el.style.transform = `translateY(${delta}px) scale(1.02)`;
    void el.offsetHeight; // commit the start position before transitioning
    el.style.transition = "transform 220ms var(--ease-drawer)";
    el.style.transform = "";
    const clear = () => {
      el.style.transition = "";
      el.removeEventListener("transitionend", clear);
    };
    el.addEventListener("transitionend", clear);
  });

  const onHandleKeyDown = (e: KeyboardEvent<HTMLButtonElement>, idx: number) => {
    const to = e.key === "ArrowUp" ? idx - 1 : e.key === "ArrowDown" ? idx + 1 : null;
    if (to === null || to < 0 || to >= exercises.length) return;
    e.preventDefault();
    onReorder(idx, to);
    requestAnimationFrame(() => handleRefs.current[to]?.focus());
  };

  // How far a non-grabbed row slides to make room for the grabbed one.
  const shiftFor = (i: number) => {
    if (!drag || i === drag.from) return 0;
    const { rects } = drag;
    const gap = rects.length > 1 ? rects[1].top - rects[0].bottom : 0;
    const h = rects[drag.from].height + gap;
    if (drag.from < drag.to && i > drag.from && i <= drag.to) return -h;
    if (drag.to < drag.from && i >= drag.to && i < drag.from) return h;
    return 0;
  };

  // Stable row keys across reorders and edits: the exercise id plus which
  // copy of it this is (the same exercise can appear twice in a day). The
  // index-based key used to remount every row a reorder touched.
  const seen: Record<string, number> = {};
  const rowKey = (ex: { id: string }) => {
    seen[ex.id] = (seen[ex.id] ?? 0) + 1;
    return `${ex.id}#${seen[ex.id]}`;
  };

  return (
    <ol className="flex flex-col gap-2.5">
      {exercises.map((ex, idx) => {
        const p = getDiyPrescription(ex);
        const isGrabbed = drag?.from === idx;
        const muscle = AVAILABLE_MUSCLES.find((m) => m.id === ex.target_muscle)?.label;
        const update = (patch: Partial<DiyPrescription>) => onChangePrescription(idx, { ...p, ...patch });
        return (
          <li
            key={rowKey(ex)}
            ref={(el) => {
              itemRefs.current[idx] = el;
            }}
            style={{ transform: `translateY(${isGrabbed ? drag.dy : shiftFor(idx)}px)${isGrabbed ? " scale(1.02)" : ""}` }}
            className={`on-light relative bg-surface border rounded-[1.25rem] p-3 ${
              isGrabbed ? "z-10 border-accent shadow-xl" : `border-line shadow-sm ${drag ? "transition-transform duration-200 ease-out" : ""}`
            }`}
          >
            <div className="flex items-center gap-2.5">
              <button
                ref={(el) => {
                  handleRefs.current[idx] = el;
                }}
                onPointerDown={(e) => onHandlePointerDown(e, idx)}
                onPointerMove={onHandlePointerMove}
                onPointerUp={endDrag}
                onPointerCancel={endDrag}
                onKeyDown={(e) => onHandleKeyDown(e, idx)}
                aria-label={`שנה סדר: ${getExerciseName(ex, lang)}, מקום ${idx + 1}. גרור, או השתמש בחצים למעלה ולמטה`}
                className={`w-8 h-12 -ms-1 rounded-xl flex items-center justify-center shrink-0 text-muted touch-none select-none hover:bg-surface-alt hover:text-fg focus-visible:ring-2 focus-visible:ring-focus outline-none ${
                  isGrabbed ? "cursor-grabbing text-accent-fg" : "cursor-grab"
                } ${exercises.length < 2 ? "opacity-30" : ""}`}
              >
                <GripVertical size={18} />
              </button>
              <div className="relative shrink-0">
                <ExerciseThumb
                  exercise={ex}
                  alt={getExerciseName(ex, lang)}
                  className="on-light w-12 h-12 rounded-xl bg-surface-alt"
                  legacyFit="object-contain p-1"
                  fallback={<div className="on-light w-12 h-12 rounded-xl bg-surface-alt" />}
                />
                <span className="absolute -top-1.5 -right-1.5 min-w-5 h-5 px-1 rounded-full bg-fg text-page text-[0.6875rem] font-black flex items-center justify-center tabular-nums">{idx + 1}</span>
              </div>
              <div className="flex-1 min-w-0">
                <h4 className="font-extrabold text-fg text-sm leading-snug line-clamp-2">{getExerciseName(ex, lang)}</h4>
                {muscle && <p className="text-[0.6875rem] text-muted mt-0.5 truncate">{muscle}</p>}
              </div>
              <button
                onClick={() => onViewExerciseInfo(ex)}
                aria-label="מידע על התרגיל"
                className="on-light w-10 h-10 rounded-full bg-surface-alt text-muted flex items-center justify-center shrink-0 hover:bg-line hover:text-fg transition-ui duration-150 ease-out active:scale-[0.97]"
              >
                <Info size={16} />
              </button>
              <button
                onClick={() => onRemove(idx)}
                aria-label="הסר תרגיל"
                className="on-light w-10 h-10 rounded-full bg-surface-alt text-muted flex items-center justify-center shrink-0 hover:bg-danger/10 hover:text-danger-fg transition-ui duration-150 ease-out active:scale-[0.97]"
              >
                <Trash2 size={15} />
              </button>
            </div>

            <div className="grid grid-cols-3 gap-2 mt-3">
              <Stepper label="סטים" value={p.sets} limit={DIY_LIMITS.sets} onChange={(sets) => update({ sets })} />
              <Stepper
                label={p.is_time ? "שניות" : "חזרות"}
                value={p.reps}
                limit={p.is_time ? DIY_LIMITS.seconds : DIY_LIMITS.reps}
                onChange={(reps) => update({ reps })}
                labelAction={{
                  onClick: () => update(p.is_time ? { is_time: false, reps: 10 } : { is_time: true, reps: 30 }),
                  ariaLabel: p.is_time ? "החלף לספירת חזרות" : "החלף לזמן בשניות",
                }}
              />
              <Stepper label="מנוחה (שנ׳)" value={p.rest_time_seconds} limit={DIY_LIMITS.rest} onChange={(rest_time_seconds) => update({ rest_time_seconds })} />
            </div>

            {/* The therapist's note on an assigned exercise is read-only here;
                the patient's own note sits under it. */}
            <ExerciseNotes therapistNote={ex.assigned?.notes} className="mt-3" />
            <ExerciseNoteEditor
              exercise={ex}
              value={p.notes ?? ""}
              onChange={(notes) => update({ notes })}
              placeholder="הערה שלי (לא חובה)"
              className="mt-2.5"
            />
          </li>
        );
      })}
    </ol>
  );
}
