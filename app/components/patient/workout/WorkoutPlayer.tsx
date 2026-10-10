"use client";

import { useState } from "react";
import { ArrowRight, Dumbbell, FlaskConical, Info, Minus, Pause, Play, Plus, SkipForward, Trophy, X } from "lucide-react";
import { useAuth } from "@/app/context/AuthContext";
import ExerciseInfoModal from "@/app/components/patient/workout/ExerciseInfoModal";
import { ExerciseMediaPlayer } from "@/app/components/ExerciseMedia";
import PreWorkoutFlow from "@/app/components/patient/PreWorkoutFlow";
import WorkoutFinishFlow from "@/app/components/patient/workout/WorkoutFinishFlow";
import Toast from "@/app/components/ui/Toast";
import { formatRepTarget, formatTime, formatWeightKg, getExerciseName } from "@/app/utils/format";
import type { HapticType } from "@/app/hooks/useHaptics";
import type { useWorkoutSession } from "@/app/hooks/useWorkoutSession";

// Sticky warning strip shown for the whole duration of an admin Run/Test
// session (both the live player and the finish flow) — amber for "this is a
// distinct, non-real state", not the emerald used for the simulator's own
// pre-session config screen (ProgramSimulatorModal), which is a different UI
// entirely. onExit reuses session.closeWorkout, the same action the real
// close (X) button triggers, so "exit simulation" just backs out to the
// simulator's config screen rather than needing a separate code path.
export function SimulationBanner({ onExit }: { onExit: () => void }) {
  return (
    <div className="sticky top-0 inset-x-0 z-[200] pt-safe px-4 pt-3 print:hidden">
      <div className="flex items-center gap-2.5 bg-warm/15 border border-warm/40 text-warm-fg text-xs font-bold px-4 py-2.5 rounded-2xl shadow-[0_4px_20px_color-mix(in_srgb,var(--shadow-ink)_6%,transparent)]">
        <FlaskConical size={16} className="text-warm-fg shrink-0" />
        <span className="flex-1">מצב סימולציה פעיל — הנתונים לא נשמרים</span>
        <button onClick={onExit} className="shrink-0 bg-warm hover:brightness-110 text-on-accent font-extrabold px-3 py-1.5 rounded-full transition-colors">
          יציאה
        </button>
      </div>
    </div>
  );
}

interface WorkoutPlayerProps {
  session: ReturnType<typeof useWorkoutSession>;
  triggerHaptic: (type: HapticType) => void;
}

// The rest screen's round media hero ("next up"): a circular progress
// border drawn with stroke-dasharray/dashoffset. It's still a <rect>, with
// rx = half its side, so the perimeter formula below reduces to the
// circle's circumference.
const REST_SQUARE_SIZE = 200;
const REST_SQUARE_STROKE = 6;
const REST_SQUARE_RADIUS = (REST_SQUARE_SIZE - REST_SQUARE_STROKE) / 2;
const REST_SQUARE_PERIMETER = 4 * (REST_SQUARE_SIZE - REST_SQUARE_STROKE - 2 * REST_SQUARE_RADIUS) + 2 * Math.PI * REST_SQUARE_RADIUS;
const RIR_OPTIONS = [0, 1, 2, 3, 4];

// Shared "frosted glass" recipe used across every floating control in this
// screen — dark glass (bg-elevated/90 backdrop-blur-md) with a soft
// diffused shadow, on the --bg-page player background.
const GLASS = "bg-elevated/90 backdrop-blur-md border border-line shadow-[0_4px_20px_color-mix(in_srgb,var(--shadow-ink)_4%,transparent)]";

// The "what does RIR mean" info icon + popover, next to every RIR label in
// the player (the active-set target and the rest screen's RIR picker) — a
// brief explainer, not a full Modal.
function RirInfoButton() {
  const [isOpen, setIsOpen] = useState(false);
  return (
    <span className="relative inline-flex normal-case tracking-normal">
      <button onClick={() => setIsOpen((prev) => !prev)} aria-label="מה זה RIR" aria-expanded={isOpen} className="text-muted hover:text-fg transition-colors p-1 -m-1">
        <Info size={13} />
      </button>
      {isOpen && (
        <>
          <span className="fixed inset-0 z-40" onClick={() => setIsOpen(false)} />
          {/* Grows up out of the ⓘ it's anchored to (origin-bottom). */}
          <span className="absolute bottom-full left-1/2 -translate-x-1/2 mb-3 z-50 w-64 bg-elevated text-fg rounded-2xl shadow-elevated border border-line p-4 text-start font-normal block origin-bottom transition-[opacity,scale] duration-150 ease-out-strong starting:opacity-0 starting:scale-95">
            <span className="block font-black text-fg text-[13px] mb-1.5">מהו RIR?</span>
            <span className="block text-xs leading-relaxed">
              Reps In Reserve — כמה חזרות נוספות היית יכול לבצע בטכניקה תקינה. לדוגמה, RIR 2 אומר שצריך לעצור את הסט כשאתה מרגיש שנשארו לך עוד 2 חזרות בלבד עד הכשל.
            </span>
          </span>
        </>
      )}
    </span>
  );
}

// Undo an accidental "next": back to the previous set's screen (only shown
// once at least one set has been marked done).
function BackButton({ onClick }: { onClick: () => void }) {
  return (
    <button
      onClick={onClick}
      aria-label="חזור לסט הקודם"
      className={`h-9 shrink-0 rounded-full px-3.5 flex items-center gap-1.5 text-fg text-xs font-bold hover:bg-line active:scale-95 transition-[scale,background-color,color,border-color] duration-150 ease-out ${GLASS}`}
    >
      <ArrowRight size={15} /> חזור
    </button>
  );
}

// The whole active-workout experience: the pre-workout pain check-in, the
// immersive full-screen player, and the post-workout feedback flow. Renders
// null when none of those are active, so a parent can mount this
// unconditionally alongside the patient's tabs.
export default function WorkoutPlayer({ session, triggerHaptic }: WorkoutPlayerProps) {
  const { lang } = useAuth();
  const dir = lang === "he" ? "rtl" : "ltr";

  if (session.showPreWorkout) {
    return (
      <PreWorkoutFlow
        feedbackPhase={session.feedbackPhase}
        selectedPainAreas={session.selectedPainAreas}
        setSelectedPainAreas={session.setSelectedPainAreas}
        onConfirmPainAreas={session.confirmPainAreas}
        onConfirmPreWorkout={session.confirmPreWorkout}
        triggerHaptic={triggerHaptic}
      />
    );
  }

  if (!session.isWorkoutMode) return null;

  if (session.workoutFinished) {
    return (
      <>
        {session.isSimulation && <SimulationBanner onExit={session.closeWorkout} />}
        <WorkoutFinishFlow
          feedbackPhase={session.feedbackPhase}
          onSelectRpe={session.handleRpeSelect}
          onSubmitPainAfter={(num) => session.submitFinalFeedback(num)}
          onClose={session.closeWorkout}
        />
        {session.simulationToast && <Toast message={session.simulationToast} onDismiss={session.dismissSimulationToast} />}
      </>
    );
  }

  const ex = session.displayedExercise;
  const next = session.nextExercise;
  const isSameExerciseNext = next && ex && next.exercise.id === ex.id;
  const restProgress = session.restTimerTotal > 0 ? Math.min(1, Math.max(0, session.restTimer / session.restTimerTotal)) : 0;
  // Covers both a real rest and the lightweight mid-superset check — both
  // hide the live-exercise HUD the same way; they differ only in whether a
  // countdown ring/timer-driven buttons show (see isSupersetCheck below).
  const isPostSet = session.isResting || session.isSupersetCheck;

  // Top progress bar: a single real fraction of the whole workout, derived
  // from actual session state. useWorkoutSession doesn't export the raw
  // block/exercise-in-block indices, so they're derived here from what it
  // does export (blocksKeys, activeBlockKey, blocksMap, activeAssign)
  // instead of touching the hook itself.
  const activeBlockIdx = Math.max(0, session.blocksKeys.indexOf(session.activeBlockKey));
  const activeBlockExercises = session.activeBlockKey ? session.blocksMap[session.activeBlockKey] ?? [] : [];
  const activeExInBlockIdx = session.activeAssign ? Math.max(0, activeBlockExercises.findIndex((a) => a.id === session.activeAssign!.id)) : 0;
  const blockExerciseCount = activeBlockExercises.length || 1;
  const activeBlockProgress = Math.min(
    1,
    Math.max(0, ((session.currentBlockSet - 1) * blockExerciseCount + activeExInBlockIdx) / (session.maxSetsInBlock * blockExerciseCount))
  );
  const overallProgress = session.blocksKeys.length > 0 ? Math.min(1, (activeBlockIdx + activeBlockProgress) / session.blocksKeys.length) : 0;

  return (
    <div
      className="fixed inset-0 z-[150] bg-page text-fg flex flex-col overflow-hidden"
      dir={dir}
      onTouchStart={session.onTouchStart}
      onTouchMove={session.onTouchMove}
      onTouchEnd={session.onTouchEnd}
    >
      {session.viewingExInfo && (
        <ExerciseInfoModal
          exercise={session.viewingExInfo}
          historyData={session.exHistoryData}
          onClose={() => session.setViewingExInfo(null)}
        />
      )}

      {session.isSimulation && <SimulationBanner onExit={session.closeWorkout} />}
      {session.simulationToast && <Toast message={session.simulationToast} onDismiss={session.dismissSimulationToast} />}

      {/* Background — solid --bg-page for both states; the active
          screen's exercise media lives only inside its own contained
          player below, never as a full-bleed background. */}
      <div className="absolute inset-0 z-0 bg-page"></div>

      {!isPostSet ? (
        /* Top bar for the active-set screen: one continuous progress line
           (overallProgress — real, derived above, not decoration) with the
           help (exercise-info) control on the right and close on the left. */
        <div className="relative z-10 pt-safe px-5 md:px-8 pt-5 flex flex-col gap-5 w-full">
          <div className="flex items-center gap-3 w-full">
            {session.canGoBack && <BackButton onClick={session.goBack} />}
            <button
              onClick={() => ex && session.setViewingExInfo(ex)}
              aria-label="פרטי תרגיל"
              className="w-7 h-7 shrink-0 rounded-full border border-line text-muted hover:text-fg hover:border-muted active:scale-90 transition-[scale,background-color,color,border-color] duration-150 ease-out flex items-center justify-center"
            >
              <Info size={13} />
            </button>
            <div className="flex-1 h-[3px] rounded-full bg-fg/10 overflow-hidden">
              {/* scaleX, not width (a layout property); fills from the
                  start edge — the right in Hebrew. */}
              <div
                className="h-full w-full bg-accent rounded-full origin-right ltr:origin-left transition-transform duration-300 ease-out-strong"
                style={{ transform: `scaleX(${overallProgress})` }}
              ></div>
            </div>
            <button
              onClick={session.closeWorkout}
              aria-label="סגור אימון"
              className="w-7 h-7 shrink-0 flex items-center justify-center text-muted hover:text-fg active:scale-90 transition-[scale,background-color,color,border-color] duration-150 ease-out"
            >
              <X size={18} />
            </button>
          </div>

          <div className="text-center">
            <h2 className="text-2xl md:text-3xl font-black text-fg tracking-tight">{ex && getExerciseName(ex, lang)}</h2>
            <p className="text-muted text-sm font-bold mt-1 tabular-nums">
              סט {session.currentBlockSet} / {session.maxSetsInBlock}
            </p>
            {/* Weight: what the patient used last time for this exercise
                (from past logs) leads; the therapist's target, if set and
                different, sits next to it. Neither set = nothing shown. */}
            {(() => {
              const previous = formatWeightKg(session.previousWeight);
              const target = formatWeightKg(session.activeAssign?.weight_kg);
              if (!previous && !target) return null;
              return (
                <div className="flex flex-wrap items-center justify-center gap-2 mt-2">
                  {previous && (
                    <span className="inline-flex items-center gap-1.5 bg-accent/15 text-accent-fg text-xs font-extrabold px-3 py-1 rounded-full">
                      <Dumbbell size={12} /> פעם קודמת: {previous}
                    </span>
                  )}
                  {target && target !== previous && (
                    <span className="inline-flex items-center gap-1.5 bg-fg/10 text-muted text-xs font-bold px-3 py-1 rounded-full">
                      {previous ? `יעד: ${target}` : <><Dumbbell size={12} /> {target}</>}
                    </span>
                  )}
                </div>
              );
            })()}
          </div>
        </div>
      ) : (
        /* Rest screen keeps its own minimal top bar — just the close button
           — unchanged from the previous pass; this redesign is scoped to
           the active-set screen only. */
        <div className="relative z-10 pt-safe px-5 md:px-8 pt-6 flex justify-between items-start w-full">
          {session.canGoBack ? <BackButton onClick={session.goBack} /> : <span />}
          <button
            onClick={session.closeWorkout}
            aria-label="סגור אימון"
            className={`w-11 h-11 rounded-full flex items-center justify-center text-fg hover:bg-line active:scale-90 active:bg-fg/10 transition-[scale,background-color] duration-150 ease-out ${GLASS}`}
          >
            <X size={20} />
          </button>
        </div>
      )}

      {/* Rest label + digital timer — a real rest has a countdown; the
          lightweight mid-superset check doesn't run one, same distinction
          the old ring's !isSupersetCheck guard made. */}
      {isPostSet && !session.isSupersetCheck && (
        <div className="relative z-10 flex flex-col items-center pt-2">
          <span className="text-[11px] font-bold text-muted mb-1">מנוחה</span>
          <span className="text-6xl font-black tabular-nums text-fg tracking-tighter" dir="ltr">
            {formatTime(session.restTimer)}
          </span>
        </div>
      )}

      {/* Main Stage — vertically centered for both states now: the hero
          metric, contained media player, and controls for the active
          screen; the rest screen's own content below its timer above. */}
      <div className="relative z-10 flex-1 flex flex-col justify-center items-center pb-safe pb-6 px-5 md:px-8 w-full max-w-md mx-auto">
        {!isPostSet ? (
          <div className="w-full flex flex-col items-center gap-7">
            {/* Dynamic hero metric — a massive countdown for a timed set, or
                split reps/RIR typography for a countable one. */}
            {session.activeAssign?.is_time ? (
              <div className="text-7xl md:text-8xl font-black tracking-tighter tabular-nums text-fg" dir="ltr">
                {formatTime(session.exTimer ?? session.effectiveTargetReps ?? session.activeAssign.reps)}
              </div>
            ) : (
              <div className="flex items-end justify-center gap-10">
                <div className="flex flex-col items-center">
                  <span className="text-7xl font-black text-fg tabular-nums leading-none" dir="ltr">
                    {/* A prescribed range ("8-12") shows as-is until the patient
                        adjusts the target with easier/harder. */}
                    {session.effectiveTargetReps === session.activeAssign?.reps
                      ? formatRepTarget(session.activeAssign?.reps, session.activeAssign?.reps_max)
                      : session.effectiveTargetReps}
                  </span>
                  <span className="text-[11px] font-bold text-muted mt-2">חזרות</span>
                </div>
                {session.effectiveTargetRir !== null && (
                  <div className="flex flex-col items-center">
                    <span className="text-7xl font-black text-accent-fg tabular-nums leading-none">{session.effectiveTargetRir}</span>
                    <span className="relative flex items-center gap-1 text-[11px] font-bold text-muted uppercase tracking-wide mt-2">
                      RIR <RirInfoButton />
                    </span>
                  </div>
                )}
              </div>
            )}

            {/* Contained media player — a clean, distinct box, no text
                overlaid on it (aside from the angle toggle). Media is
                optional (exercises can be text/metadata-only); the box takes
                the clip's own aspect (4:5 / 16:9), legacy gif_url stays square. */}
            <ExerciseMediaPlayer
              exercise={ex}
              label={ex ? getExerciseName(ex, lang) : "Exercise media"}
              placeholder={
                // Muted-icon-plus-caption placeholder on a dark elevated
                // gradient, matching the player's dark shell.
                <div className="w-full max-w-[280px] aspect-square rounded-[2rem] overflow-hidden border border-line shadow-card bg-gradient-to-br from-elevated to-line flex flex-col items-center justify-center gap-2">
                  <Dumbbell size={40} className="text-muted" />
                  <span className="text-muted text-sm font-bold">אין מדיה זמינה</span>
                </div>
              }
            />

            {/* Minimal controls, seamless below the player — no drawer/card. */}
            {session.activeAssign?.is_time ? (
              session.exTimer === 0 ? (
                <button
                  onClick={session.handleFinishAction}
                  className="w-full max-w-[220px] bg-btn-primary hover:bg-btn-primary-hover active:bg-btn-primary-active text-btn-primary-fg py-4 rounded-full font-black text-base transition-[scale,background-color] duration-150 ease-out hover:scale-[1.02] active:scale-[0.97] shadow-[0_12px_32px_-8px_color-mix(in_srgb,var(--accent)_40%,transparent)]"
                >
                  המשך
                </button>
              ) : (
                <div className="flex items-center justify-center gap-8">
                  <button
                    onClick={session.skipExerciseTimer}
                    className="flex flex-col items-center gap-1 text-muted hover:text-fg active:scale-90 transition-[scale,background-color,color,border-color] duration-150 ease-out"
                  >
                    <SkipForward size={20} />
                    <span className="text-[10px] font-bold">דלג</span>
                  </button>
                  <button
                    onClick={session.toggleExerciseTimer}
                    aria-label={session.isExTimerRunning ? "השהה טיימר" : "הפעל טיימר"}
                    className="w-16 h-16 rounded-full bg-accent flex items-center justify-center text-on-accent shadow-[0_12px_32px_-8px_color-mix(in_srgb,var(--accent)_40%,transparent)] active:scale-95 transition-transform duration-150 ease-out"
                  >
                    {session.isExTimerRunning ? <Pause size={24} className="fill-on-accent" /> : <Play size={24} className="fill-on-accent ms-0.5" />}
                  </button>
                </div>
              )
            ) : (
              <div className="flex items-center justify-center gap-5 w-full max-w-[280px]">
                <button
                  onClick={session.makeEasier}
                  aria-label="הפוך לקל יותר"
                  className="w-12 h-12 shrink-0 rounded-full bg-fg/10 hover:bg-line flex items-center justify-center text-muted hover:text-fg active:scale-90 transition-[scale,background-color,color,border-color] duration-150 ease-out"
                >
                  <Minus size={18} />
                </button>
                <button
                  onClick={session.handleFinishAction}
                  className="flex-1 bg-btn-primary hover:bg-btn-primary-hover active:bg-btn-primary-active text-btn-primary-fg font-black text-base py-4 rounded-full flex items-center justify-center gap-2 transition-[scale,background-color] duration-150 ease-out hover:scale-[1.02] active:scale-[0.97] shadow-[0_12px_32px_-8px_color-mix(in_srgb,var(--accent)_40%,transparent)]"
                >
                  <SkipForward size={18} />
                  סיום סט
                </button>
                <button
                  onClick={session.makeHarder}
                  aria-label="הפוך לקשה יותר"
                  className="w-12 h-12 shrink-0 rounded-full bg-fg/10 hover:bg-line flex items-center justify-center text-muted hover:text-fg active:scale-90 transition-[scale,background-color,color,border-color] duration-150 ease-out"
                >
                  <Plus size={18} />
                </button>
              </div>
            )}
          </div>
        ) : (
          <div className="flex flex-col items-center text-center w-full gap-8">
            {/* Hero square — the next exercise's media inside a rounded-rect
                progress border (same stroke-dasharray technique the old
                circular ring used, traced around a <rect>). No progress
                sweep during the lightweight mid-superset check, since there's
                no timer running then — plain border instead. */}
            {(() => {
              const heroExercise = isSameExerciseNext ? ex : next?.exercise;
              const showProgress = !session.isSupersetCheck;
              if (!heroExercise) return null;

              return (
                <div className="relative" style={{ width: REST_SQUARE_SIZE, height: REST_SQUARE_SIZE }}>
                  <svg
                    width={REST_SQUARE_SIZE}
                    height={REST_SQUARE_SIZE}
                    viewBox={`0 0 ${REST_SQUARE_SIZE} ${REST_SQUARE_SIZE}`}
                    className="absolute inset-0 -rotate-90"
                  >
                    <defs>
                      {/* Accent gradient (hover -> active teal) for the rest
                          countdown border. Colors via `style` so the CSS
                          variables resolve on every browser. */}
                      <linearGradient id="restSquareGradient" x1="0" y1="0" x2="1" y2="1">
                        <stop offset="0%" style={{ stopColor: "var(--accent-hover)" }} />
                        <stop offset="100%" style={{ stopColor: "var(--accent-active)" }} />
                      </linearGradient>
                    </defs>
                    <rect
                      x={REST_SQUARE_STROKE / 2}
                      y={REST_SQUARE_STROKE / 2}
                      width={REST_SQUARE_SIZE - REST_SQUARE_STROKE}
                      height={REST_SQUARE_SIZE - REST_SQUARE_STROKE}
                      rx={REST_SQUARE_RADIUS}
                      fill="none"
                      style={{ stroke: "var(--border)" }}
                      strokeWidth={REST_SQUARE_STROKE}
                    />
                    {/* Keyed per rest so a new rest starts full instead of
                        sweeping back up from the last one's empty ring; the
                        1s linear transition matches the 1s timer tick, so the
                        ring drains continuously instead of jumping. */}
                    {showProgress && (
                      <rect
                        key={session.restTimerTotal + ":" + session.activeBlockKey + ":" + session.currentBlockSet + ":" + (session.activeAssign?.id ?? "")}
                        x={REST_SQUARE_STROKE / 2}
                        y={REST_SQUARE_STROKE / 2}
                        width={REST_SQUARE_SIZE - REST_SQUARE_STROKE}
                        height={REST_SQUARE_SIZE - REST_SQUARE_STROKE}
                        rx={REST_SQUARE_RADIUS}
                        fill="none"
                        stroke="url(#restSquareGradient)"
                        strokeWidth={REST_SQUARE_STROKE}
                        strokeLinecap="round"
                        strokeDasharray={REST_SQUARE_PERIMETER}
                        strokeDashoffset={REST_SQUARE_PERIMETER * (1 - restProgress)}
                        style={{ transition: "stroke-dashoffset 1s linear" }}
                      />
                    )}
                  </svg>
                  <div className="absolute rounded-full overflow-hidden bg-fg/10" style={{ inset: REST_SQUARE_STROKE + 5 }}>
                    {/* Passive glance at what's next — primary angle only, no
                        toggle, same fallback placeholder as the active box. */}
                    <ExerciseMediaPlayer
                      exercise={heroExercise}
                      label={getExerciseName(heroExercise, lang)}
                      mode="fill"
                      placeholder={
                        <div className="w-full h-full bg-gradient-to-br from-elevated to-line flex flex-col items-center justify-center gap-1.5">
                          <Dumbbell size={28} className="text-muted" />
                          <span className="text-muted text-[11px] font-bold">אין מדיה זמינה</span>
                        </div>
                      }
                    />
                  </div>
                </div>
              );
            })()}

            {/* Text hierarchy: eyebrow label, set count, exercise name. */}
            {isSameExerciseNext ? (
              <div className="flex flex-col items-center gap-1.5">
                <span className="text-[11px] font-bold text-muted">הסט הבא</span>
                <span className="text-muted text-sm font-bold tabular-nums">
                  סט {session.currentBlockSet + 1} מתוך {session.maxSetsInBlock}
                </span>
                <h3 className="text-xl font-black text-fg">{ex && getExerciseName(ex, lang)}</h3>
              </div>
            ) : next ? (
              <div className="flex flex-col items-center gap-1.5">
                <span className="text-[11px] font-bold text-muted">הבא בתור</span>
                <span className="text-muted text-sm font-bold tabular-nums">סט 1 מתוך {next.sets}</span>
                <button
                  onClick={() => session.setViewingExInfo(next.exercise)}
                  className="flex items-center gap-1.5 active:scale-95 transition-transform duration-150 ease-out"
                >
                  <h3 className="text-xl font-black text-fg">{getExerciseName(next.exercise, lang)}</h3>
                  <Info size={14} className="text-muted" />
                </button>
              </div>
            ) : (
              <div className="flex flex-col items-center gap-2">
                <Trophy size={32} className="text-accent-fg" />
                <h3 className="text-xl font-black text-fg">הסט האחרון לאימון!</h3>
              </div>
            )}

            {/* Reps/RIR — sleek inline controls, no enclosing card. Same
                adjustRestReps/selectRestRir handlers and actualRepsLogged/
                pendingSetRir state as before, only the chrome around them
                changed. "Actual value" is reps for a countable exercise, or
                seconds held for a timed one, since workout_logs already
                stores seconds in this same field for timed exercises. */}
            <div className="flex flex-col items-center gap-6">
              <div className="flex items-center gap-6">
                <button
                  onClick={() => session.adjustRestReps(session.activeAssign?.is_time ? -5 : -1)}
                  aria-label={session.activeAssign?.is_time ? "פחות שניות" : "פחות חזרות"}
                  className="w-11 h-11 rounded-full bg-fg/10 border border-line flex items-center justify-center text-fg active:scale-90 transition-transform duration-150 ease-out"
                >
                  <Minus size={15} />
                </button>
                <div className="flex flex-col items-center">
                  <span className="text-4xl font-black text-fg tabular-nums" dir="ltr">
                    {session.actualRepsLogged}
                  </span>
                  <span className="text-[10px] font-bold text-muted mt-0.5">
                    {session.activeAssign?.is_time ? "שניות שהוחזקו" : "חזרות שבוצעו"}
                  </span>
                </div>
                <button
                  onClick={() => session.adjustRestReps(session.activeAssign?.is_time ? 5 : 1)}
                  aria-label={session.activeAssign?.is_time ? "יותר שניות" : "יותר חזרות"}
                  className="w-11 h-11 rounded-full bg-accent/15 border border-accent/25 flex items-center justify-center text-accent-fg active:scale-90 transition-transform duration-150 ease-out"
                >
                  <Plus size={15} />
                </button>
              </div>

              <div className="relative flex items-center gap-3">
                <span className="text-[11px] font-bold text-muted uppercase tracking-wide">RIR</span>
                <RirInfoButton />

                {RIR_OPTIONS.map((val) => {
                  const isSelected = session.pendingSetRir === val;
                  return (
                    <button
                      key={val}
                      onClick={() => session.selectRestRir(val)}
                      aria-pressed={isSelected}
                      aria-label={`RIR ${val === 4 ? "4 ומעלה" : val}`}
                      // 28px circle, 40×44 tap target (the after: inset, sized to the gap-3 so neighbours don't overlap) — tapped between sets with a raised pulse.
                      className={`relative w-7 h-7 rounded-full flex items-center justify-center text-[11px] font-bold transition-[scale,background-color,color,box-shadow] duration-150 ease-out active:scale-90 after:absolute after:-inset-x-1.5 after:-inset-y-2 after:content-[''] ${
                        isSelected ? "bg-accent text-on-accent scale-110 shadow-[0_2px_10px_-2px_color-mix(in_srgb,var(--accent)_50%,transparent)]" : "text-muted border border-line"
                      }`}
                    >
                      {val === 4 ? "4+" : val}
                    </button>
                  );
                })}
              </div>

              {/* Optional weight used — left empty, nothing is logged. */}
              {!session.activeAssign?.is_time && (
                <label className="flex items-center gap-2">
                  <span className="text-[11px] font-bold text-muted">משקל</span>
                  <input
                    type="text"
                    inputMode="decimal"
                    value={session.pendingSetWeight}
                    onChange={(e) => session.setRestWeight(e.target.value)}
                    placeholder="—"
                    aria-label="משקל בקילוגרמים (לא חובה)"
                    className="w-16 bg-fg/10 border border-line rounded-full px-2 py-1 text-center text-sm font-bold text-fg tabular-nums outline-none focus:border-focus focus:ring-2 focus:ring-focus placeholder:text-muted"
                    dir="ltr"
                  />
                  <span className="text-[11px] font-bold text-muted">ק״ג</span>
                </label>
              )}
            </div>

            {/* Bottom controls — minimal media-control feel: a ghost
                secondary action and one solid primary pill, not two
                stretched full-width cards. The old "bg-elevated" primary
                buttons only read as a pop of contrast against black — on
                this cream background they'd be nearly invisible, so both
                convert to the solid brand-terracotta accent instead. */}
            <div className="flex items-center justify-center gap-8">
              {session.isSupersetCheck ? (
                <button
                  onClick={session.handleContinueSuperset}
                  className="bg-btn-primary hover:bg-btn-primary-hover active:bg-btn-primary-active text-btn-primary-fg font-black px-10 py-4 rounded-full transition-transform ease-out hover:scale-[1.02] active:scale-[0.97] shadow-[0_12px_32px_-8px_color-mix(in_srgb,var(--accent)_40%,transparent)]"
                >
                  המשך לתרגיל הבא
                </button>
              ) : (
                <>
                  <button
                    onClick={session.addRestTime}
                    className="flex flex-col items-center gap-1 text-muted hover:text-fg active:scale-90 transition-[scale,background-color,color,border-color] duration-150 ease-out"
                  >
                    <span className="text-lg font-black">+15</span>
                    <span className="text-[10px] font-bold">שניות</span>
                  </button>
                  <button
                    onClick={session.handleEndRest}
                    className="bg-btn-primary hover:bg-btn-primary-hover active:bg-btn-primary-active text-btn-primary-fg font-black px-10 py-4 rounded-full transition-transform ease-out hover:scale-[1.02] active:scale-[0.97] shadow-[0_12px_32px_-8px_color-mix(in_srgb,var(--accent)_40%,transparent)]"
                  >
                    דלג
                  </button>
                </>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
