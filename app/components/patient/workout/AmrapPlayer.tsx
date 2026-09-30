"use client";

import { useEffect, useRef, useState } from "react";
import { Dumbbell, Minus, Pause, Play, Plus, Timer, Trophy, X } from "lucide-react";
import { supabase } from "@/app/lib/supabase";
import { useAuth } from "@/app/context/AuthContext";
import RatingScale from "@/app/components/ui/RatingScale";
import { getRPEColor } from "@/app/utils/scoring";
import { getExerciseName } from "@/app/utils/format";
import type { HapticType } from "@/app/hooks/useHaptics";
import type { Exercise } from "@/app/types";

export interface AmrapStation {
  exercise: Exercise;
  reps: number; // per round; seconds when is_time
  is_time: boolean;
}

export interface AmrapSessionConfig {
  title: string;
  timeCapSeconds: number;
  stations: AmrapStation[];
}

interface AmrapPlayerProps {
  config: AmrapSessionConfig;
  triggerHaptic: (type: HapticType) => void;
  onClose: () => void;
  onLogged: () => void; // refetch the patient's logs after a successful save
}

type Phase = "ready" | "running" | "paused" | "result" | "rpe" | "done";

const formatClock = (ms: number) => {
  const totalSeconds = Math.max(0, Math.ceil(ms / 1000));
  const minutes = Math.floor(totalSeconds / 60);
  const seconds = totalSeconds % 60;
  return `${String(minutes).padStart(2, "0")}:${String(seconds).padStart(2, "0")}`;
};

const isVideoUrl = (url: string) => /\.(mp4|webm)(\?|$)/i.test(url);

// AMRAP ("as many rounds as possible") player: one big countdown for the
// whole time cap, a round counter the patient taps after each full round,
// and every station's media playing together in a small grid — the whole
// round visible at once, instead of the one-exercise-at-a-time player.
// When time runs out (or the patient finishes early) it asks for extra reps
// into the unfinished round, then RPE, and logs the result to workout_logs.
export default function AmrapPlayer({ config, triggerHaptic, onClose, onLogged }: AmrapPlayerProps) {
  const { loggedInPatient, lang } = useAuth();
  const dir = lang === "he" ? "rtl" : "ltr";
  const totalMs = config.timeCapSeconds * 1000;

  const [phase, setPhase] = useState<Phase>("ready");
  const [remainingMs, setRemainingMs] = useState(totalMs);
  const [rounds, setRounds] = useState(0);
  const [extraReps, setExtraReps] = useState(0);
  const [isSaving, setIsSaving] = useState(false);
  // Wall-clock end time while running, so the countdown stays accurate even
  // if the tab is throttled; the remaining time is derived from it each tick.
  const endAtRef = useRef<number | null>(null);

  useEffect(() => {
    if (phase !== "running") return;
    const tick = () => {
      const left = (endAtRef.current ?? Date.now()) - Date.now();
      if (left <= 0) {
        setRemainingMs(0);
        endAtRef.current = null;
        triggerHaptic("success");
        setPhase("result");
      } else {
        setRemainingMs(left);
      }
    };
    const interval = setInterval(tick, 250);
    return () => clearInterval(interval);
  }, [phase, triggerHaptic]);

  const start = () => {
    triggerHaptic("heavy");
    endAtRef.current = Date.now() + remainingMs;
    setPhase("running");
  };

  const pause = () => {
    if (endAtRef.current) setRemainingMs(Math.max(0, endAtRef.current - Date.now()));
    endAtRef.current = null;
    setPhase("paused");
  };

  const finishEarly = () => {
    if (!confirm("לסיים את האימון עכשיו?")) return;
    pause();
    setPhase("result");
  };

  const requestClose = () => {
    if ((phase === "running" || phase === "paused") && !confirm("לצאת מהאימון? התוצאה לא תישמר.")) return;
    onClose();
  };

  const addRound = () => {
    triggerHaptic("light");
    setRounds((r) => r + 1);
  };

  const saveWithRpe = async (rpe: number) => {
    if (!loggedInPatient || isSaving) return;
    setIsSaving(true);
    const { error } = await supabase.from("workout_logs").insert([
      {
        patient_id: loggedInPatient.id,
        category: config.title,
        rpe,
        pain_before: null,
        pain_after: null,
        result_rounds: rounds,
        result_extra_reps: extraReps,
      },
    ]);
    setIsSaving(false);
    if (error) {
      alert(`שגיאה בשמירה: ${error.message}`);
      return;
    }
    triggerHaptic("success");
    onLogged();
    setPhase("done");
  };

  const shell = "fixed inset-0 z-[150] bg-page text-fg flex flex-col overflow-hidden";

  if (phase === "result") {
    return (
      <div className={`${shell} items-center justify-center p-6 text-center`} dir={dir}>
        <Timer size={52} className="text-accent-fg mb-5" />
        <h2 className="text-3xl md:text-4xl font-black mb-2">הזמן נגמר!</h2>
        <p className="text-muted mb-10">בדוק את התוצאה שלך לפני השמירה.</p>

        <div className="flex flex-col gap-6 w-full max-w-xs">
          <Stepper label="סבבים שהושלמו" value={rounds} onChange={setRounds} />
          <Stepper label="חזרות נוספות בסבב שלא הושלם" value={extraReps} onChange={setExtraReps} />
        </div>

        <button
          onClick={() => setPhase("rpe")}
          className="mt-12 w-full max-w-xs bg-btn-primary hover:bg-btn-primary-hover active:bg-btn-primary-active text-btn-primary-fg font-black py-4 rounded-full transition-colors"
        >
          המשך
        </button>
      </div>
    );
  }

  if (phase === "rpe") {
    return (
      <div className={`${shell} items-center justify-center p-6 text-center`} dir={dir}>
        <h2 className="text-3xl md:text-4xl font-black mb-3">
          {rounds} סבבים{extraReps > 0 ? ` + ${extraReps} חזרות` : ""}
        </h2>
        <p className="text-lg text-muted mb-10">
          <strong className="text-fg">עד כמה קשה היה לך האימון (RPE)?</strong>
        </p>
        <RatingScale values={[1, 2, 3, 4, 5, 6, 7, 8, 9, 10]} getColor={getRPEColor} onSelect={saveWithRpe} />
      </div>
    );
  }

  if (phase === "done") {
    return (
      <div className={`${shell} items-center justify-center p-6 text-center`} dir={dir}>
        <Trophy size={80} className="text-warm-fg mb-8 animate-bounce" />
        <h2 className="text-4xl font-black mb-4">כל הכבוד!</h2>
        <p className="text-xl text-muted mb-10">
          {rounds} סבבים{extraReps > 0 ? ` + ${extraReps} חזרות` : ""} ב-{Math.round(config.timeCapSeconds / 60)} דקות — נשמר ביומן שלך.
        </p>
        <button
          onClick={onClose}
          className="bg-btn-primary text-btn-primary-fg px-10 py-4 rounded-full font-bold text-lg hover:bg-btn-primary-hover active:bg-btn-primary-active transition"
        >
          חזרה למסך הראשי
        </button>
      </div>
    );
  }

  // ready / running / paused
  const isFinalTen = phase === "running" && remainingMs <= 10_000;
  const progress = totalMs > 0 ? 1 - remainingMs / totalMs : 0;

  return (
    <div className={shell} dir={dir}>
      <div className="pt-[max(1rem,env(safe-area-inset-top))] px-5 pt-4 flex items-center justify-between gap-3">
        <button onClick={requestClose} aria-label="סגור" className="w-10 h-10 rounded-full bg-elevated border border-line flex items-center justify-center text-fg hover:bg-line transition-colors">
          <X size={18} />
        </button>
        <div className="text-center min-w-0">
          <div className="text-[11px] font-extrabold tracking-[0.2em] text-accent-fg">AMRAP · {Math.round(config.timeCapSeconds / 60)} דק׳</div>
          <h1 className="font-black text-lg truncate">{config.title}</h1>
        </div>
        <div className="w-10" />
      </div>

      {/* Countdown + round counter */}
      <div className="px-5 pt-5 flex flex-col items-center gap-4">
        <div
          className={`text-7xl md:text-8xl font-black tabular-nums tracking-tighter transition-colors ${isFinalTen ? "text-warm-fg" : "text-fg"}`}
          dir="ltr"
          aria-live="polite"
        >
          {formatClock(remainingMs)}
        </div>
        <div className="w-full max-w-md h-1.5 rounded-full bg-line overflow-hidden">
          <div className="h-full bg-accent transition-[width] duration-300 ease-linear" style={{ width: `${progress * 100}%` }} />
        </div>

        <div className="flex items-center gap-4">
          <button
            onClick={() => setRounds((r) => Math.max(0, r - 1))}
            disabled={rounds === 0}
            aria-label="הורד סבב"
            className="w-11 h-11 rounded-full bg-elevated border border-line flex items-center justify-center text-muted hover:text-fg disabled:opacity-40"
          >
            <Minus size={18} />
          </button>
          <div className="text-center min-w-[88px]">
            <div className="text-4xl font-black tabular-nums">{rounds}</div>
            <div className="text-[11px] font-bold text-muted">סבבים</div>
          </div>
          <button
            onClick={addRound}
            disabled={phase === "ready"}
            aria-label="סיימתי סבב"
            className="w-11 h-11 rounded-full bg-accent text-on-accent flex items-center justify-center disabled:bg-disabled disabled:text-disabled-fg"
          >
            <Plus size={18} />
          </button>
        </div>
      </div>

      {/* Every station of the round, all playing at once */}
      <div className="flex-1 overflow-y-auto px-4 py-5">
        <div className={`grid gap-3 max-w-2xl mx-auto ${config.stations.length > 4 ? "grid-cols-3" : "grid-cols-2"}`}>
          {config.stations.map((station, idx) => {
            const url = station.exercise.gif_url;
            return (
              <div key={`${station.exercise.id}-${idx}`} className="on-light rounded-2xl overflow-hidden bg-surface shadow-card">
                <div className="on-light aspect-square bg-surface-alt relative">
                  {url ? (
                    isVideoUrl(url) ? (
                      <video src={url} autoPlay muted playsInline loop className="w-full h-full object-cover" />
                    ) : (
                      <img src={url} alt={getExerciseName(station.exercise, lang)} className="w-full h-full object-cover" />
                    )
                  ) : (
                    <div className="w-full h-full flex items-center justify-center">
                      <Dumbbell size={24} className="text-muted" />
                    </div>
                  )}
                  <span className="absolute top-1.5 right-1.5 w-6 h-6 rounded-full bg-scrim/70 text-surface text-[11px] font-black flex items-center justify-center">{idx + 1}</span>
                </div>
                <div className="p-2">
                  <div className="text-[12px] font-extrabold text-fg truncate">{getExerciseName(station.exercise, lang)}</div>
                  <div className="text-[11px] font-bold text-accent-fg tabular-nums">
                    {station.reps} {station.is_time ? "שנ׳" : "חזרות"}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      <div className="px-5 pt-3 pb-[max(1.25rem,env(safe-area-inset-bottom))] border-t border-line bg-elevated/90 backdrop-blur-md flex items-center gap-3">
        {phase === "running" ? (
          <button onClick={pause} className="flex-1 bg-transparent border-[1.5px] border-btn-secondary text-accent-fg hover:bg-btn-secondary-hover font-black py-3.5 rounded-full flex items-center justify-center gap-2 transition-colors">
            <Pause size={18} /> השהה
          </button>
        ) : (
          <button onClick={start} className="flex-1 bg-btn-primary hover:bg-btn-primary-hover active:bg-btn-primary-active text-btn-primary-fg font-black py-3.5 rounded-full flex items-center justify-center gap-2 transition-colors">
            <Play size={18} /> {phase === "ready" ? "התחל" : "המשך"}
          </button>
        )}
        {phase !== "ready" && (
          <button onClick={finishEarly} className="px-6 py-3.5 rounded-full font-bold text-muted hover:text-fg bg-line/60 transition-colors">
            סיים
          </button>
        )}
      </div>
    </div>
  );
}

function Stepper({ label, value, onChange }: { label: string; value: number; onChange: (n: number) => void }) {
  return (
    <div className="flex items-center justify-between gap-4 bg-elevated border border-line rounded-2xl px-4 py-3">
      <span className="text-sm font-bold text-muted text-start">{label}</span>
      <div className="flex items-center gap-3">
        <button onClick={() => onChange(Math.max(0, value - 1))} aria-label="הפחת" className="w-9 h-9 rounded-full bg-line flex items-center justify-center text-fg">
          <Minus size={16} />
        </button>
        <span className="text-2xl font-black tabular-nums w-10 text-center">{value}</span>
        <button onClick={() => onChange(value + 1)} aria-label="הוסף" className="w-9 h-9 rounded-full bg-accent text-on-accent flex items-center justify-center">
          <Plus size={16} />
        </button>
      </div>
    </div>
  );
}
