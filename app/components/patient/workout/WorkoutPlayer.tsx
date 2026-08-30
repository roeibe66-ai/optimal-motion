"use client";

import { Info, Minus, Plus, SkipForward, Trophy, X } from "lucide-react";
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

const REST_RING_RADIUS = 81;
const REST_RING_CIRCUMFERENCE = 2 * Math.PI * REST_RING_RADIUS;
const RIR_OPTIONS = [0, 1, 2, 3, 4];

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
      <WorkoutFinishFlow
        feedbackPhase={session.feedbackPhase}
        onSelectRpe={session.handleRpeSelect}
        onSubmitPainAfter={(num) => session.submitFinalFeedback(num)}
        onClose={session.closeWorkout}
      />
    );
  }

  const ex = session.displayedExercise;
  const isSameExerciseNext = session.nextExercise && ex && session.nextExercise.exercise.id === ex.id;
  const restProgress = session.restTimerTotal > 0 ? Math.min(1, Math.max(0, session.restTimer / session.restTimerTotal)) : 0;

  return (
    <div
      className="fixed inset-0 z-[150] bg-stone-950 text-white flex flex-col overflow-hidden"
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

      {/* Background Video Layer (Immersive) - Full Screen Object Contain to not crop technique */}
      <div className="absolute inset-0 z-0 bg-stone-950 flex items-center justify-center">
        {!session.isResting && ex?.gif_url ? (
          ex.gif_url.toLowerCase().includes(".mp4") || ex.gif_url.toLowerCase().includes(".webm") ? (
            <video src={ex.gif_url} autoPlay muted playsInline loop className="w-full h-full object-contain md:object-cover opacity-60 mix-blend-screen" />
          ) : (
            <img src={ex.gif_url} alt={ex.title || "Exercise media"} className="w-full h-full object-contain md:object-cover opacity-60 mix-blend-screen" />
          )
        ) : session.isResting ? (
          !isSameExerciseNext && session.nextExercise?.exercise?.gif_url ? (
            session.nextExercise.exercise.gif_url.toLowerCase().includes(".mp4") ? (
              <video
                src={session.nextExercise.exercise.gif_url}
                autoPlay
                muted
                playsInline
                loop
                className="w-full h-full object-contain object-center md:object-cover opacity-30 mix-blend-screen"
              />
            ) : (
              <img
                src={session.nextExercise.exercise.gif_url}
                alt={session.nextExercise.exercise.title || "Exercise media"}
                className="w-full h-full object-contain object-center md:object-cover opacity-30 mix-blend-screen"
              />
            )
          ) : (
            <div className="w-full h-full bg-[#1c1c1e] opacity-50 blur-xl"></div>
          )
        ) : (
          <div className="w-full h-full bg-[#1c1c1e]"></div>
        )}

        {/* Ambient teal glow, matching the mockup's tint for this screen */}
        <div className="absolute inset-0" style={{ background: "radial-gradient(circle at 30% 65%, rgba(20,184,166,0.16), transparent 55%)" }}></div>

        {/* Gradient for text readability */}
        <div className="absolute inset-0 bg-gradient-to-b from-stone-950/80 via-transparent to-stone-950/90 pointer-events-none"></div>
      </div>

      {/* Top Bar Floating Controls */}
      <div className="relative z-10 pt-safe px-4 md:px-6 pt-8 flex flex-col w-full pointer-events-none">
        <div className="flex justify-between items-start w-full pointer-events-auto">
          {/* Close Button */}
          <button
            onClick={session.closeWorkout}
            className="w-10 h-10 md:w-12 md:h-12 bg-white/10 backdrop-blur-md rounded-full flex items-center justify-center text-white hover:bg-white/20 transition-colors border border-white/10 shadow-lg"
          >
            <X size={20} />
          </button>

          {/* Exercise Title (no block chip anymore) */}
          {!session.isResting && (
            <div className="text-right max-w-[70%]">
              <h2 className="text-2xl md:text-4xl font-black text-white drop-shadow-md leading-tight">{ex?.title}</h2>
            </div>
          )}
        </div>

        {/* Compact reps·set pill + Info / Easier / Harder */}
        {!session.isResting && (
          <div className="flex justify-end items-center mt-4 gap-2 pointer-events-auto">
            <span className="bg-black/40 border border-white/10 backdrop-blur-md text-white font-bold text-[11px] px-3 h-[38px] rounded-full flex items-center whitespace-nowrap">
              {session.effectiveTargetReps} חזרות · סט {session.currentBlockSet}/{session.maxSetsInBlock}
            </span>
            <button
              onClick={() => ex && session.setViewingExInfo(ex)}
              className="w-[38px] h-[38px] bg-black/35 backdrop-blur-md rounded-full flex items-center justify-center text-white hover:bg-black/50 transition-colors border border-white/10"
            >
              <Info size={15} />
            </button>
            <button
              onClick={session.makeEasier}
              aria-label="הפוך לקל יותר"
              className="w-[38px] h-[38px] bg-black/35 backdrop-blur-md rounded-full flex items-center justify-center text-white hover:bg-black/50 transition-colors border border-white/10"
            >
              <Minus size={15} />
            </button>
            <button
              onClick={session.makeHarder}
              aria-label="הפוך לקשה יותר"
              className="w-[38px] h-[38px] bg-black/35 backdrop-blur-md rounded-full flex items-center justify-center text-white hover:bg-black/50 transition-colors border border-white/10"
            >
              <Plus size={15} />
            </button>
          </div>
        )}
      </div>

      {/* Main Content Area (Layered over video at bottom center) */}
      <div className="relative z-10 flex-1 flex flex-col justify-end pb-8 px-4 w-full max-w-lg mx-auto pointer-events-auto">
        {!session.isResting ? (
          session.activeAssign?.is_time ? (
            // Timed exercises aren't covered by the approved mockups — kept as
            // the existing card-based timer UI, only recolored for consistency.
            <div className="w-full bg-[#1c1c1e]/80 backdrop-blur-2xl border border-stone-800 rounded-[2rem] p-6 text-center flex flex-col items-center shadow-2xl animate-in slide-in-from-bottom-8 duration-500">
              <h3 className="text-stone-400 font-bold text-xs tracking-widest uppercase mb-4">טיימר עבודה</h3>
              <div className="text-6xl font-black tracking-tighter mb-6 text-white" dir="ltr">
                {formatTime(session.exTimer ?? session.activeAssign.reps)}
              </div>
              {session.exTimer === 0 ? (
                <button
                  onClick={session.handleFinishAction}
                  className="w-full bg-teal-500 hover:bg-teal-400 text-stone-900 py-4 rounded-xl font-black text-lg transition-transform hover:scale-[1.02]"
                >
                  המשך
                </button>
              ) : (
                <button
                  onClick={session.toggleExerciseTimer}
                  className={`flex items-center justify-center w-full gap-3 py-4 rounded-xl font-black text-lg transition-all ${
                    session.isExTimerRunning ? "bg-stone-800 text-white border border-stone-700" : "bg-white text-stone-900 shadow-xl"
                  }`}
                >
                  {session.isExTimerRunning ? "השהה טיימר" : "הפעל טיימר"}
                </button>
              )}
            </div>
          ) : (
            // Single floating primary action — no card, matching the mockup.
            <button
              onClick={session.handleFinishAction}
              className="w-full bg-teal-500 hover:bg-teal-400 text-stone-950 font-black text-lg py-5 rounded-3xl flex items-center justify-center gap-2.5 shadow-[0_12px_32px_-8px_rgba(20,184,166,0.45)] transition-transform hover:scale-[1.01] animate-in slide-in-from-bottom-8 duration-500"
            >
              סיום סט
              <SkipForward size={19} />
            </button>
          )
        ) : (
          <div className="flex flex-col items-center justify-start pt-8 md:pt-12 text-center animate-in zoom-in duration-500 h-full w-full gap-5">
            {/* Reps + RIR — reported here, after the set, not typed live during
                it. Hidden for timed exercises: there's no "reps you did" or
                RIR to report for a time-held set. */}
            {!session.activeAssign?.is_time && (
              <div className="w-full max-w-sm bg-black/40 border border-white/10 backdrop-blur-md rounded-3xl p-5 flex flex-col gap-4">
                <div className="flex items-center justify-between">
                  <span className="text-[12px] font-extrabold text-stone-400">כמה חזרות עשית?</span>
                  <div className="flex items-center gap-3.5">
                    <button
                      onClick={() => session.adjustRestReps(-1)}
                      className="w-[30px] h-[30px] rounded-full bg-white/10 border border-white/15 flex items-center justify-center text-white"
                    >
                      <Minus size={13} />
                    </button>
                    <span className="text-2xl font-black text-white min-w-[28px] text-center" dir="ltr">
                      {session.actualRepsLogged}
                    </span>
                    <button
                      onClick={() => session.adjustRestReps(1)}
                      className="w-[30px] h-[30px] rounded-full bg-emerald-400/20 border border-emerald-400/40 flex items-center justify-center text-emerald-400"
                    >
                      <Plus size={13} />
                    </button>
                  </div>
                </div>

                <div className="h-px bg-white/10"></div>

                <div className="flex items-center justify-between">
                  <span className="text-[12px] font-extrabold text-stone-400">RIR — חזרות בהספק</span>
                  <div className="flex gap-1.5">
                    {RIR_OPTIONS.map((val) => {
                      const isSelected = session.pendingSetRir === val;
                      return (
                        <button
                          key={val}
                          onClick={() => session.selectRestRir(val)}
                          className={`w-[26px] h-[26px] rounded-full flex items-center justify-center text-[11px] font-bold transition-colors ${
                            isSelected ? "bg-emerald-400 text-stone-900" : "text-stone-400 border border-white/15"
                          }`}
                        >
                          {val === 4 ? "4+" : val}
                        </button>
                      );
                    })}
                  </div>
                </div>
              </div>
            )}

            {/* Rest timer ring — track + progress drawn as two circles in the
                same SVG at the same radius, so they render as one ring
                instead of two visibly separate concentric circles (the old
                version paired an SVG progress circle with a mismatched CSS
                border-ring on the wrapping div). */}
            <div className="w-[176px] h-[176px] rounded-full bg-black/35 backdrop-blur-xl flex items-center justify-center relative shadow-2xl">
              <svg width="176" height="176" viewBox="0 0 176 176" className="absolute inset-0 -rotate-90">
                <circle cx="88" cy="88" r={REST_RING_RADIUS} fill="none" stroke="rgba(52,211,153,0.25)" strokeWidth="5" />
                <circle
                  cx="88"
                  cy="88"
                  r={REST_RING_RADIUS}
                  fill="none"
                  stroke="#10b981"
                  strokeWidth="5"
                  strokeLinecap="round"
                  strokeDasharray={REST_RING_CIRCUMFERENCE}
                  strokeDashoffset={REST_RING_CIRCUMFERENCE * (1 - restProgress)}
                  opacity="0.9"
                />
              </svg>
              <span className="text-5xl font-black text-white tracking-tighter" dir="ltr">
                {session.restTimer}
              </span>
            </div>

            {/* Up next — compact row */}
            {isSameExerciseNext ? (
              <div className="text-stone-400 text-[13px] font-bold">
                מנוחה בין סטים · התכונן לסט {session.currentBlockSet + 1} מתוך {session.maxSetsInBlock}
              </div>
            ) : session.nextExercise ? (
              <div className="flex items-center gap-2 text-stone-400 text-[13px] font-bold">
                <SkipForward size={13} />
                הבא בתור: <span className="text-white">{session.nextExercise.exercise.title}</span>
              </div>
            ) : (
              <div className="flex items-center gap-2 text-white text-[13px] font-bold">
                <Trophy size={16} className="text-emerald-400" />
                הסט האחרון לאימון!
              </div>
            )}

            <div className="flex gap-3 w-full max-w-sm">
              <button
                onClick={session.addRestTime}
                className="flex-1 bg-white/10 backdrop-blur-md hover:bg-white/20 border border-white/18 text-white font-bold py-4 rounded-2xl transition-colors"
              >
                +15 שנ&apos;
              </button>
              <button
                onClick={session.handleEndRest}
                className="flex-[2] bg-white hover:bg-stone-200 text-stone-900 font-black py-4 rounded-2xl transition-transform hover:scale-[1.02]"
              >
                דלג
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
