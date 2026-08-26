"use client";

import { Info, PauseCircle, PlayCircle, Repeat, SkipForward, Trophy, X } from "lucide-react";
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
                className="w-full h-full object-contain md:object-cover opacity-30 mix-blend-screen blur-sm"
              />
            ) : (
              <img
                src={session.nextExercise.exercise.gif_url}
                alt={session.nextExercise.exercise.title || "Exercise media"}
                className="w-full h-full object-contain md:object-cover opacity-30 mix-blend-screen blur-sm"
              />
            )
          ) : (
            <div className="w-full h-full bg-stone-900 opacity-50 blur-xl"></div>
          )
        ) : (
          <div className="w-full h-full bg-stone-900"></div>
        )}

        {/* Gradients for text readability */}
        <div className="absolute inset-0 bg-gradient-to-b from-black/80 via-transparent to-black/90 pointer-events-none"></div>
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

          {/* Exercise Title and Tags (Top Right/Center) */}
          {!session.isResting && (
            <div className="flex flex-col items-end gap-2 text-right max-w-[75%]">
              <h2 className="text-2xl md:text-4xl font-black text-white drop-shadow-md leading-tight">{ex?.title}</h2>
              <div className="flex items-center gap-2 flex-wrap justify-end mt-1">
                <span className="bg-teal-500/90 backdrop-blur-sm text-stone-900 font-black px-3 py-1 rounded-full text-[10px] tracking-widest uppercase shadow-sm">
                  Block {session.activeBlockKey}
                </span>
                <span className="bg-black/50 border border-white/10 backdrop-blur-md text-white font-bold px-3 py-1 rounded-full text-[10px] tracking-widest uppercase shadow-sm">
                  Set {session.currentBlockSet} of {session.maxSetsInBlock}
                </span>
              </div>
            </div>
          )}
        </div>

        {/* Action Buttons (Info / Swap) */}
        {!session.isResting && (
          <div className="flex justify-end mt-4 gap-3 pointer-events-auto">
            <button
              onClick={() => ex && session.setViewingExInfo(ex)}
              className="w-10 h-10 bg-black/40 backdrop-blur-md rounded-full flex items-center justify-center text-white hover:bg-black/60 transition-colors border border-white/10 shadow-lg"
            >
              <Info size={16} />
            </button>
            <button
              onClick={session.handleSwapExercise}
              className="w-10 h-10 bg-black/40 backdrop-blur-md rounded-full flex items-center justify-center text-white hover:bg-black/60 transition-colors border border-white/10 shadow-lg"
            >
              <Repeat size={16} />
            </button>
          </div>
        )}
      </div>

      {/* Main Content Area (Layered over video at bottom center) */}
      <div className="relative z-10 flex-1 flex flex-col justify-end pb-8 px-4 w-full max-w-lg mx-auto pointer-events-auto">
        {!session.isResting ? (
          <div className="animate-in slide-in-from-bottom-8 duration-500 w-full flex flex-col items-center">
            {/* Compact Bottom Card */}
            {session.activeAssign?.is_time ? (
              <div className="w-full bg-stone-900/80 backdrop-blur-2xl border border-white/10 rounded-[2rem] p-6 text-center flex flex-col items-center shadow-2xl">
                <h3 className="text-stone-400 font-bold text-xs tracking-widest uppercase mb-4">טיימר עבודה</h3>
                <div className={`text-6xl font-black tracking-tighter mb-6 ${session.exTimer === 0 ? "text-teal-400" : "text-white"}`} dir="ltr">
                  {formatTime(session.exTimer ?? session.activeAssign.reps)}
                </div>
                {session.exTimer === 0 ? (
                  <button
                    onClick={session.handleFinishAction}
                    className="w-full bg-teal-500 text-stone-900 py-4 rounded-xl font-black text-lg shadow-[0_0_30px_rgba(20,184,166,0.3)] transition-transform hover:scale-[1.02]"
                  >
                    המשך
                  </button>
                ) : (
                  <button
                    onClick={session.toggleExerciseTimer}
                    className={`flex items-center justify-center w-full gap-3 py-4 rounded-xl font-black text-lg transition-all ${
                      session.isExTimerRunning ? "bg-amber-500/20 text-amber-400 border border-amber-500/50" : "bg-white text-stone-900 shadow-xl"
                    }`}
                  >
                    {session.isExTimerRunning ? (
                      <>
                        <PauseCircle size={20} /> השהה טיימר
                      </>
                    ) : (
                      <>
                        <PlayCircle size={20} /> הפעל טיימר
                      </>
                    )}
                  </button>
                )}
              </div>
            ) : (
              <div className="w-full bg-stone-900/80 backdrop-blur-2xl border border-white/10 rounded-[2rem] p-6 flex flex-col items-center shadow-2xl">
                <div className="flex justify-between w-full mb-6 gap-4">
                  {/* Target Box */}
                  <div className="flex-1 flex flex-col items-center justify-center bg-black/40 rounded-2xl p-4 border border-white/5 relative">
                    <span className="text-[10px] text-stone-400 font-bold uppercase tracking-widest mb-1">Target Reps</span>
                    <span className="text-4xl font-black text-teal-400 drop-shadow-md">{session.activeAssign?.reps}</span>
                    {session.activeAssign?.rir && (
                      <span className="absolute top-2 left-2 bg-stone-800 text-stone-400 text-[8px] font-bold px-2 py-0.5 rounded-full">
                        RIR {session.activeAssign.rir}
                      </span>
                    )}
                  </div>

                  {/* Actual Box */}
                  <div className="flex-1 flex flex-col items-center justify-center bg-black/40 rounded-2xl p-4 border border-white/5 relative group">
                    <span className="text-[10px] text-stone-400 font-bold uppercase tracking-widest mb-1">Actual Reps</span>
                    <input
                      type="number"
                      value={session.actualRepsLogged}
                      onChange={(e) => session.setActualRepsLogged(e.target.value)}
                      placeholder={String(session.activeAssign?.reps)}
                      className="w-full bg-transparent text-center text-4xl font-black text-white focus:text-teal-400 outline-none transition-colors placeholder-white/20"
                    />
                  </div>
                </div>

                <button
                  onClick={session.handleFinishAction}
                  className="w-full bg-teal-500 text-stone-900 py-4 rounded-xl font-black text-lg shadow-[0_0_30px_rgba(20,184,166,0.2)] flex justify-center items-center gap-2 transition-transform hover:scale-[1.02] group/btn"
                >
                  סיום סט <SkipForward size={20} className="group-hover/btn:translate-x-1 transition-transform" />
                </button>
              </div>
            )}
          </div>
        ) : (
          <div className="flex flex-col items-center justify-center text-center animate-in zoom-in duration-500 h-full w-full">
            {isSameExerciseNext ? (
              <div className="mb-8 text-center bg-black/40 backdrop-blur-md p-6 rounded-3xl border border-white/5 w-full max-w-sm">
                <span className="text-stone-400 font-bold text-xs uppercase tracking-widest mb-2 inline-block">מנוחה בין סטים</span>
                <h3 className="text-xl font-black text-white">התכונן לסט {session.currentBlockSet + 1} מתוך {session.maxSetsInBlock}</h3>
              </div>
            ) : session.nextExercise ? (
              <div className="mb-8 text-center bg-black/40 backdrop-blur-md p-6 rounded-3xl border border-white/5 w-full max-w-sm">
                <span className="bg-teal-500/20 text-teal-400 border border-teal-500/30 font-bold px-4 py-1.5 rounded-full text-[10px] uppercase tracking-widest mb-4 inline-flex items-center gap-2">
                  <SkipForward size={12} /> Up Next
                </span>
                <h3 className="text-2xl font-black text-white drop-shadow-md">{session.nextExercise.exercise.title}</h3>
              </div>
            ) : (
              <div className="mb-8 bg-black/40 backdrop-blur-md p-6 rounded-3xl border border-white/5 w-full max-w-sm">
                <Trophy size={40} className="text-yellow-400 mx-auto mb-3 drop-shadow-lg" />
                <h3 className="text-2xl font-black text-white">הסט האחרון לאימון!</h3>
              </div>
            )}

            <div className="flex justify-center items-center w-64 h-64 border-4 border-stone-800 rounded-full relative mb-12 bg-black/60 backdrop-blur-xl shadow-2xl">
              <div className="text-8xl font-black text-white tracking-tighter drop-shadow-lg" dir="ltr">
                {session.restTimer}
              </div>
            </div>

            <div className="flex w-full gap-4 max-w-sm">
              <button
                onClick={session.addRestTime}
                className="flex-1 bg-white/10 backdrop-blur-md hover:bg-white/20 border border-white/20 text-white font-bold py-4 rounded-2xl transition-colors shadow-lg"
              >
                +15s
              </button>
              <button
                onClick={session.handleEndRest}
                className="flex-[2] bg-white text-stone-900 font-black py-4 rounded-2xl shadow-lg transition-transform hover:scale-[1.02]"
              >
                דלג למנוחה
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
