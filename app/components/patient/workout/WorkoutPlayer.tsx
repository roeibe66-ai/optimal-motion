"use client";

import { useState } from "react";
import { Dumbbell, FlipHorizontal, Info, Minus, Pause, Play, Plus, SkipForward, Trophy, X } from "lucide-react";
import { useAuth } from "@/app/context/AuthContext";
import ExerciseInfoModal from "@/app/components/patient/workout/ExerciseInfoModal";
import PreWorkoutFlow from "@/app/components/patient/PreWorkoutFlow";
import WorkoutFinishFlow from "@/app/components/patient/workout/WorkoutFinishFlow";
import { formatTime } from "@/app/utils/format";
import type { HapticType } from "@/app/hooks/useHaptics";
import type { useWorkoutSession } from "@/app/hooks/useWorkoutSession";

interface WorkoutPlayerProps {
  session: ReturnType<typeof useWorkoutSession>;
  triggerHaptic: (type: HapticType) => void;
}

// The rest screen's square media hero: a rounded-rect progress border drawn
// the same stroke-dasharray/dashoffset way the old circular ring was, just
// traced around a <rect> instead of a <circle> — same technique, new shape.
const REST_SQUARE_SIZE = 200;
const REST_SQUARE_RADIUS = 28;
const REST_SQUARE_STROKE = 6;
const REST_SQUARE_PERIMETER = 4 * (REST_SQUARE_SIZE - REST_SQUARE_STROKE - 2 * REST_SQUARE_RADIUS) + 2 * Math.PI * REST_SQUARE_RADIUS;
const RIR_OPTIONS = [0, 1, 2, 3, 4];

// Shared "frosted glass" recipe used across every floating control in this
// screen — light glass now (bg-white/70 backdrop-blur-md per the boutique-
// clinic palette), a soft diffused shadow standing in for the old inset
// highlight, which only reads correctly against a dark surface.
const GLASS = "bg-white/70 backdrop-blur-md border border-stone-200/60 shadow-[0_4px_20px_rgba(0,0,0,0.04)]";

// The whole active-workout experience: the pre-workout pain check-in, the
// immersive full-screen player, and the post-workout feedback flow. Renders
// null when none of those are active, so a parent can mount this
// unconditionally alongside the patient's tabs.
export default function WorkoutPlayer({ session, triggerHaptic }: WorkoutPlayerProps) {
  const { lang } = useAuth();
  const dir = lang === "he" ? "rtl" : "ltr";

  // Which of the two media URLs the active-exercise box is showing (0 =
  // gif_url, 1 = secondary_gif_url). Reset via the render-time "adjusting
  // state when a prop changes" pattern (React's own recommended approach —
  // see "You Might Not Need an Effect") rather than a useEffect, so there's
  // no synchronous setState-in-effect and no extra render pass. Declared
  // before the early returns below since Hooks can't be called conditionally.
  const [activeMediaIndex, setActiveMediaIndex] = useState(0);
  const [lastMediaExerciseId, setLastMediaExerciseId] = useState(session.displayedExercise?.id);
  if (session.displayedExercise?.id !== lastMediaExerciseId) {
    setLastMediaExerciseId(session.displayedExercise?.id);
    setActiveMediaIndex(0);
  }

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
      <WorkoutFinishFlow
        feedbackPhase={session.feedbackPhase}
        onSelectRpe={session.handleRpeSelect}
        onSubmitPainAfter={(num) => session.submitFinalFeedback(num)}
        onClose={session.closeWorkout}
      />
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
      className="fixed inset-0 z-[150] bg-[#FDFBF7] text-stone-900 flex flex-col overflow-hidden"
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

      {/* Background — solid warm off-white for both states now; the active
          screen's exercise media lives only inside its own contained
          player below, never as a full-bleed background. */}
      <div className="absolute inset-0 z-0 bg-[#FDFBF7]"></div>

      {!isPostSet ? (
        /* Top bar for the active-set screen: one continuous progress line
           (overallProgress — real, derived above, not decoration) with the
           help (exercise-info) control on the right and close on the left. */
        <div className="relative z-10 pt-safe px-5 md:px-8 pt-5 flex flex-col gap-5 w-full animate-in fade-in duration-500">
          <div className="flex items-center gap-3 w-full">
            <button
              onClick={() => ex && session.setViewingExInfo(ex)}
              aria-label="פרטי תרגיל"
              className="w-7 h-7 shrink-0 rounded-full border border-stone-300 text-stone-500 hover:text-stone-900 hover:border-stone-400 active:scale-90 transition-all duration-150 ease-out flex items-center justify-center"
            >
              <Info size={13} />
            </button>
            <div className="flex-1 h-[3px] rounded-full bg-stone-200 overflow-hidden">
              <div className="h-full bg-emerald-800 rounded-full transition-all duration-500 ease-out" style={{ width: `${overallProgress * 100}%` }}></div>
            </div>
            <button
              onClick={session.closeWorkout}
              aria-label="סגור אימון"
              className="w-7 h-7 shrink-0 flex items-center justify-center text-stone-500 hover:text-stone-900 active:scale-90 transition-all duration-150 ease-out"
            >
              <X size={18} />
            </button>
          </div>

          <div className="text-center">
            <h2 className="text-2xl md:text-3xl font-black italic text-stone-900 tracking-tight">{ex?.title}</h2>
            <p className="text-stone-500 text-sm font-bold mt-1 tabular-nums">
              סט {session.currentBlockSet} / {session.maxSetsInBlock}
            </p>
          </div>
        </div>
      ) : (
        /* Rest screen keeps its own minimal top bar — just the close button
           — unchanged from the previous pass; this redesign is scoped to
           the active-set screen only. */
        <div className="relative z-10 pt-safe px-5 md:px-8 pt-6 flex justify-between items-start w-full">
          <button
            onClick={session.closeWorkout}
            aria-label="סגור אימון"
            className={`w-11 h-11 rounded-full flex items-center justify-center text-stone-700 hover:bg-stone-50 active:scale-90 active:bg-stone-100 transition-all duration-200 ease-out ${GLASS}`}
          >
            <X size={20} />
          </button>
        </div>
      )}

      {/* Rest label + digital timer — a real rest has a countdown; the
          lightweight mid-superset check doesn't run one, same distinction
          the old ring's !isSupersetCheck guard made. */}
      {isPostSet && !session.isSupersetCheck && (
        <div className="relative z-10 flex flex-col items-center pt-2 animate-in fade-in duration-500">
          <span className="text-[11px] font-bold tracking-[0.25em] uppercase text-stone-400 mb-1">מנוחה</span>
          <span className="text-6xl font-black tabular-nums text-stone-900 tracking-tighter" dir="ltr">
            {formatTime(session.restTimer)}
          </span>
        </div>
      )}

      {/* Main Stage — vertically centered for both states now: the hero
          metric, contained media player, and controls for the active
          screen; the rest screen's own content below its timer above. */}
      <div className="relative z-10 flex-1 flex flex-col justify-center items-center pb-safe pb-6 px-5 md:px-8 w-full max-w-md mx-auto">
        {!isPostSet ? (
          <div className="w-full flex flex-col items-center gap-7 animate-in fade-in duration-500">
            {/* Dynamic hero metric — a massive countdown for a timed set, or
                split reps/RIR typography for a countable one. */}
            {session.activeAssign?.is_time ? (
              <div className="text-7xl md:text-8xl font-black tracking-tighter tabular-nums text-stone-900" dir="ltr">
                {formatTime(session.exTimer ?? session.effectiveTargetReps ?? session.activeAssign.reps)}
              </div>
            ) : (
              <div className="flex items-end justify-center gap-10">
                <div className="flex flex-col items-center">
                  <span className="text-7xl font-black text-stone-900 tabular-nums leading-none">{session.effectiveTargetReps}</span>
                  <span className="text-[11px] font-bold text-stone-500 uppercase tracking-wide mt-2">חזרות</span>
                </div>
                {session.effectiveTargetRir !== null && (
                  <div className="flex flex-col items-center">
                    <span className="text-7xl font-black text-emerald-800 tabular-nums leading-none">{session.effectiveTargetRir}</span>
                    <span className="text-[11px] font-bold text-stone-500 uppercase tracking-wide mt-2">RIR</span>
                  </div>
                )}
              </div>
            )}

            {/* Contained media player — a clean, distinct box, no text
                overlaid on it (aside from the angle-toggle button). Media
                is optional now (exercises can be text/metadata-only), and
                an exercise with a secondary_gif_url gets a toggle to flip
                between the two angles. */}
            {(() => {
              const currentUrl = activeMediaIndex === 0 ? ex?.gif_url : ex?.secondary_gif_url ?? ex?.gif_url;
              const isVideo = currentUrl ? currentUrl.toLowerCase().includes(".mp4") || currentUrl.toLowerCase().includes(".webm") : false;
              const hasSecondAngle = Boolean(ex?.secondary_gif_url);

              return (
                <div className="relative w-full max-w-[280px] aspect-square rounded-[2rem] overflow-hidden border border-stone-200 bg-stone-100 shadow-[0_8px_30px_rgb(0,0,0,0.04)]">
                  {currentUrl ? (
                    isVideo ? (
                      <video src={currentUrl} autoPlay muted playsInline loop className="w-full h-full object-cover" />
                    ) : (
                      <img src={currentUrl} alt={ex?.title || "Exercise media"} className="w-full h-full object-cover" />
                    )
                  ) : (
                    // Adapted to this screen's light theme rather than the
                    // literal "dark gradient block" spec — a black block
                    // would clash against everything else here now being
                    // bg-stone-50/white; same muted-icon-plus-caption idea,
                    // just in the palette this screen actually uses.
                    <div className="w-full h-full bg-gradient-to-br from-stone-100 to-stone-200 flex flex-col items-center justify-center gap-2">
                      <Dumbbell size={40} className="text-stone-300" />
                      <span className="text-stone-400 text-sm font-bold">אין מדיה זמינה</span>
                    </div>
                  )}

                  {hasSecondAngle && (
                    <button
                      onClick={() => setActiveMediaIndex((i) => (i === 0 ? 1 : 0))}
                      className={`absolute bottom-3 left-3 flex items-center gap-1.5 px-3 py-2 rounded-full text-stone-700 text-xs font-bold active:scale-90 transition-all duration-150 ease-out ${GLASS}`}
                    >
                      <FlipHorizontal size={14} />
                      החלף זווית
                    </button>
                  )}
                </div>
              );
            })()}

            {/* Minimal controls, seamless below the player — no drawer/card. */}
            {session.activeAssign?.is_time ? (
              session.exTimer === 0 ? (
                <button
                  onClick={session.handleFinishAction}
                  className="w-full max-w-[220px] bg-emerald-800 hover:bg-emerald-900 text-white py-4 rounded-full font-black text-base transition-all duration-200 ease-out hover:scale-[1.02] active:scale-[0.97] shadow-[0_12px_32px_-8px_rgba(6,78,59,0.4)]"
                >
                  המשך
                </button>
              ) : (
                <div className="flex items-center justify-center gap-8">
                  <button
                    onClick={session.skipExerciseTimer}
                    className="flex flex-col items-center gap-1 text-stone-500 hover:text-stone-900 active:scale-90 transition-all duration-150 ease-out"
                  >
                    <SkipForward size={20} />
                    <span className="text-[10px] font-bold uppercase tracking-wide">דלג</span>
                  </button>
                  <button
                    onClick={session.toggleExerciseTimer}
                    aria-label={session.isExTimerRunning ? "השהה טיימר" : "הפעל טיימר"}
                    className="w-16 h-16 rounded-full bg-emerald-800 flex items-center justify-center text-white shadow-[0_12px_32px_-8px_rgba(6,78,59,0.4)] active:scale-95 transition-transform duration-150 ease-out"
                  >
                    {session.isExTimerRunning ? <Pause size={24} className="fill-white" /> : <Play size={24} className="fill-white ms-0.5" />}
                  </button>
                </div>
              )
            ) : (
              <div className="flex items-center justify-center gap-5 w-full max-w-[280px]">
                <button
                  onClick={session.makeEasier}
                  aria-label="הפוך לקל יותר"
                  className="w-12 h-12 shrink-0 rounded-full bg-stone-100 hover:bg-stone-200 flex items-center justify-center text-stone-500 hover:text-stone-900 active:scale-90 transition-all duration-150 ease-out"
                >
                  <Minus size={18} />
                </button>
                <button
                  onClick={session.handleFinishAction}
                  className="flex-1 bg-emerald-800 hover:bg-emerald-900 text-white font-black text-base py-4 rounded-full flex items-center justify-center gap-2 transition-all duration-200 ease-out hover:scale-[1.02] active:scale-[0.97] shadow-[0_12px_32px_-8px_rgba(6,78,59,0.4)]"
                >
                  <SkipForward size={18} />
                  סיום סט
                </button>
                <button
                  onClick={session.makeHarder}
                  aria-label="הפוך לקשה יותר"
                  className="w-12 h-12 shrink-0 rounded-full bg-stone-100 hover:bg-stone-200 flex items-center justify-center text-stone-500 hover:text-stone-900 active:scale-90 transition-all duration-150 ease-out"
                >
                  <Plus size={18} />
                </button>
              </div>
            )}
          </div>
        ) : (
          <div className="flex flex-col items-center text-center animate-in fade-in zoom-in-95 duration-500 w-full gap-8">
            {/* Hero square — the next exercise's media inside a rounded-rect
                progress border (same stroke-dasharray technique the old
                circular ring used, traced around a <rect>). No progress
                sweep during the lightweight mid-superset check, since there's
                no timer running then — plain border instead. */}
            {(() => {
              const heroExercise = isSameExerciseNext ? ex : next?.exercise;
              const heroUrl = heroExercise?.gif_url;
              const isVideo = heroUrl ? heroUrl.toLowerCase().includes(".mp4") || heroUrl.toLowerCase().includes(".webm") : false;
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
                      {/* Darker stops than the old bright teal/emerald pair —
                          those were tuned to pop against black; against a
                          cream page a darker gradient reads clearly without
                          needing a glow (dropped below, glows are a
                          dark-surface technique that just looks smudgy here). */}
                      <linearGradient id="restSquareGradient" x1="0" y1="0" x2="1" y2="1">
                        <stop offset="0%" stopColor="#0f766e" />
                        <stop offset="100%" stopColor="#065f46" />
                      </linearGradient>
                    </defs>
                    <rect
                      x={REST_SQUARE_STROKE / 2}
                      y={REST_SQUARE_STROKE / 2}
                      width={REST_SQUARE_SIZE - REST_SQUARE_STROKE}
                      height={REST_SQUARE_SIZE - REST_SQUARE_STROKE}
                      rx={REST_SQUARE_RADIUS}
                      fill="none"
                      stroke="rgba(0,0,0,0.08)"
                      strokeWidth={REST_SQUARE_STROKE}
                    />
                    {showProgress && (
                      <rect
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
                      />
                    )}
                  </svg>
                  <div className="absolute rounded-[1.5rem] overflow-hidden bg-stone-100" style={{ inset: REST_SQUARE_STROKE + 5 }}>
                    {heroUrl ? (
                      isVideo ? (
                        <video src={heroUrl} autoPlay muted playsInline loop className="w-full h-full object-cover" />
                      ) : (
                        <img src={heroUrl} alt="" className="w-full h-full object-cover" />
                      )
                    ) : (
                      // Passive glance at what's next — no toggle button here,
                      // just the same fallback placeholder as the active box.
                      <div className="w-full h-full bg-gradient-to-br from-stone-100 to-stone-200 flex flex-col items-center justify-center gap-1.5">
                        <Dumbbell size={28} className="text-stone-300" />
                        <span className="text-stone-400 text-[11px] font-bold">אין מדיה זמינה</span>
                      </div>
                    )}
                  </div>
                </div>
              );
            })()}

            {/* Text hierarchy: eyebrow label, set count, exercise name. */}
            {isSameExerciseNext ? (
              <div className="flex flex-col items-center gap-1.5">
                <span className="text-[11px] font-bold tracking-[0.2em] uppercase text-stone-400">הסט הבא</span>
                <span className="text-stone-500 text-sm font-bold tabular-nums">
                  סט {session.currentBlockSet + 1} מתוך {session.maxSetsInBlock}
                </span>
                <h3 className="text-xl font-black text-stone-900">{ex?.title}</h3>
              </div>
            ) : next ? (
              <div className="flex flex-col items-center gap-1.5">
                <span className="text-[11px] font-bold tracking-[0.2em] uppercase text-stone-400">הבא בתור</span>
                <span className="text-stone-500 text-sm font-bold tabular-nums">סט 1 מתוך {next.sets}</span>
                <button
                  onClick={() => session.setViewingExInfo(next.exercise)}
                  className="flex items-center gap-1.5 active:scale-95 transition-transform duration-150 ease-out"
                >
                  <h3 className="text-xl font-black text-stone-900">{next.exercise.title}</h3>
                  <Info size={14} className="text-stone-400" />
                </button>
              </div>
            ) : (
              <div className="flex flex-col items-center gap-2">
                <Trophy size={32} className="text-emerald-800" />
                <h3 className="text-xl font-black text-stone-900">הסט האחרון לאימון!</h3>
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
                  className="w-9 h-9 rounded-full bg-stone-100 border border-stone-200 flex items-center justify-center text-stone-700 active:scale-90 transition-transform duration-150 ease-out"
                >
                  <Minus size={15} />
                </button>
                <div className="flex flex-col items-center">
                  <span className="text-4xl font-black text-stone-900 tabular-nums" dir="ltr">
                    {session.actualRepsLogged}
                  </span>
                  <span className="text-[10px] font-bold text-stone-500 uppercase tracking-wide mt-0.5">
                    {session.activeAssign?.is_time ? "שניות שהוחזקו" : "חזרות שבוצעו"}
                  </span>
                </div>
                <button
                  onClick={() => session.adjustRestReps(session.activeAssign?.is_time ? 5 : 1)}
                  className="w-9 h-9 rounded-full bg-emerald-800/10 border border-emerald-800/25 flex items-center justify-center text-emerald-800 active:scale-90 transition-transform duration-150 ease-out"
                >
                  <Plus size={15} />
                </button>
              </div>

              <div className="flex items-center gap-2">
                <span className="text-[11px] font-bold text-stone-500 uppercase tracking-wide ml-1">RIR</span>
                {RIR_OPTIONS.map((val) => {
                  const isSelected = session.pendingSetRir === val;
                  return (
                    <button
                      key={val}
                      onClick={() => session.selectRestRir(val)}
                      className={`w-7 h-7 rounded-full flex items-center justify-center text-[11px] font-bold transition-all duration-150 ease-out active:scale-90 ${
                        isSelected ? "bg-emerald-800 text-white scale-110 shadow-[0_2px_10px_-2px_rgba(6,78,59,0.5)]" : "text-stone-500 border border-stone-200"
                      }`}
                    >
                      {val === 4 ? "4+" : val}
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Bottom controls — minimal media-control feel: a ghost
                secondary action and one solid primary pill, not two
                stretched full-width cards. The old "bg-white" primary
                buttons only read as a pop of contrast against black — on
                this cream background they'd be nearly invisible, so both
                convert to the solid emerald accent instead. */}
            <div className="flex items-center justify-center gap-8">
              {session.isSupersetCheck ? (
                <button
                  onClick={session.handleContinueSuperset}
                  className="bg-emerald-800 hover:bg-emerald-900 text-white font-black px-10 py-4 rounded-full transition-transform ease-out hover:scale-[1.02] active:scale-[0.97] shadow-[0_12px_32px_-8px_rgba(6,78,59,0.4)]"
                >
                  המשך לתרגיל הבא
                </button>
              ) : (
                <>
                  <button
                    onClick={session.addRestTime}
                    className="flex flex-col items-center gap-1 text-stone-500 hover:text-stone-900 active:scale-90 transition-all duration-150 ease-out"
                  >
                    <span className="text-lg font-black">+15</span>
                    <span className="text-[10px] font-bold uppercase tracking-wide">שניות</span>
                  </button>
                  <button
                    onClick={session.handleEndRest}
                    className="bg-emerald-800 hover:bg-emerald-900 text-white font-black px-10 py-4 rounded-full transition-transform ease-out hover:scale-[1.02] active:scale-[0.97] shadow-[0_12px_32px_-8px_rgba(6,78,59,0.4)]"
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
