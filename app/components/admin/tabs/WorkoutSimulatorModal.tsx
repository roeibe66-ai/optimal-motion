"use client";

import { useState } from "react";
import { Dumbbell, Play, Timer, X } from "lucide-react";
import { AuthContext, useAuth, type AuthContextValue } from "@/app/context/AuthContext";
import { TRANSLATIONS } from "@/app/constants/translations";
import { useHaptics } from "@/app/hooks/useHaptics";
import { useWorkoutSession, type SessionExercise } from "@/app/hooks/useWorkoutSession";
import { getExerciseName } from "@/app/utils/format";
import WorkoutPlayer from "@/app/components/patient/workout/WorkoutPlayer";
import AmrapPlayer, { type AmrapStation } from "@/app/components/patient/workout/AmrapPlayer";
import ExerciseInfoModal from "@/app/components/patient/workout/ExerciseInfoModal";
import type { Exercise, Patient, Workout } from "@/app/types";

interface WorkoutSimulatorModalProps {
  workout: Workout;
  exerciseCatalog: Exercise[];
  onClose: () => void;
}

// Admin "Run/Test" for the workout builder — the workout counterpart of
// ProgramSimulatorModal. Runs the exact patient-facing player (the regular
// WorkoutPlayer for a standard workout, AmrapPlayer for an AMRAP) against a
// synthetic fitness patient (id "-1"), with every write skipped, so a
// workout can be tried before or after publishing it.
export default function WorkoutSimulatorModal({ workout, exerciseCatalog, onClose }: WorkoutSimulatorModalProps) {
  const syntheticPatient: Patient = {
    id: "-1",
    user_id: "simulator",
    role: "patient",
    full_name: "מטופל לדוגמה",
    patient_type: "fitness",
  };

  const syntheticAuthValue: AuthContextValue = {
    lang: "he",
    setLang: () => {},
    t: TRANSLATIONS.he,
    currentView: "patient",
    setCurrentView: () => {},
    loggedInPatient: syntheticPatient,
    setLoggedInPatient: () => {},
    handleLogout: () => {},
  };

  return (
    <div className="fixed inset-0 z-[300] bg-scrim/70 backdrop-blur-sm flex items-center justify-center p-0 md:p-6">
      <div className="relative w-full h-full md:h-[92vh] md:max-w-md md:rounded-[2.5rem] overflow-hidden bg-page shadow-elevated">
        <button
          onClick={onClose}
          className="absolute top-4 left-4 z-[100] w-10 h-10 rounded-full bg-scrim/80 text-surface flex items-center justify-center shadow-lg hover:bg-scrim"
          aria-label="סגור סימולציה"
        >
          <X size={20} />
        </button>

        <AuthContext.Provider value={syntheticAuthValue}>
          <SimulatorBody workout={workout} exerciseCatalog={exerciseCatalog} />
        </AuthContext.Provider>
      </div>
    </div>
  );
}

function SimulatorBody({ workout, exerciseCatalog }: { workout: Workout; exerciseCatalog: Exercise[] }) {
  const { triggerHaptic } = useHaptics();
  const { lang } = useAuth();
  const [isAmrapRunning, setIsAmrapRunning] = useState(false);
  const isAmrap = workout.format === "amrap";

  const exerciseById = (id: string) => exerciseCatalog.find((e) => e.id === id);

  // Same mapping PatientShell uses when a patient hits "start now" in Explore.
  const sessionExercises: SessionExercise[] = workout.items
    .map((item, idx): SessionExercise | null => {
      const exercise = exerciseById(item.exercise_id);
      if (!exercise) return null;
      return {
        id: `sim_${idx}`,
        exercise,
        sets: item.sets ?? 3,
        reps: item.reps,
        rir: item.rir ?? null,
        is_time: item.is_time,
        block: item.block || String.fromCharCode(65 + idx),
        rest_time_seconds: item.rest_time_seconds ?? 60,
        weight_kg: item.weight_kg ?? null,
      };
    })
    .filter((se): se is SessionExercise => se !== null);

  const stations: AmrapStation[] = sessionExercises.map((se) => ({ exercise: se.exercise, reps: se.reps, is_time: se.is_time }));

  const session = useWorkoutSession({
    patientExercises: [],
    exerciseCatalog,
    workoutLogs: [],
    activePatientWeek: 1,
    selectedCategory: null,
    selectedDayFilter: "all",
    isDiyMode: true,
    diySelectedExercises: [],
    diyScheduleDay: "",
    adHocSession: { title: workout.title, exercises: sessionExercises },
    onExitDiyMode: () => {},
    triggerHaptic,
    onWorkoutLogged: () => {},
    isSimulation: true,
  });

  if (sessionExercises.length === 0) {
    return (
      <div className="p-8 h-full flex flex-col items-center justify-center text-center gap-3 text-muted">
        <Dumbbell size={40} className="text-muted" />
        <p className="font-bold text-fg">לאימון הזה עדיין אין תרגילים</p>
        <p className="text-sm">הוסף תרגילים בעורך לפני שמריצים סימולציה.</p>
      </div>
    );
  }

  return (
    <>
      <WorkoutPlayer session={session} triggerHaptic={triggerHaptic} />

      {session.viewingExInfo && (
        <ExerciseInfoModal exercise={session.viewingExInfo} historyData={session.exHistoryData} onClose={() => session.setViewingExInfo(null)} />
      )}

      {isAmrapRunning && workout.time_cap_seconds && (
        <AmrapPlayer
          config={{ title: workout.title, timeCapSeconds: workout.time_cap_seconds, stations }}
          triggerHaptic={triggerHaptic}
          onClose={() => setIsAmrapRunning(false)}
          onLogged={() => {}}
          isSimulation
        />
      )}

      {!session.isWorkoutMode && !isAmrapRunning && (
        <div className="h-full overflow-y-auto p-6 pt-16 flex flex-col gap-6">
          <div>
            <div className="text-[10px] font-extrabold tracking-widest uppercase text-success">מצב סימולציה — אדמין</div>
            <h2 className="text-xl font-black text-fg mt-1">{workout.title}</h2>
            <p className="text-xs font-bold text-muted mt-1">
              {isAmrap ? `AMRAP · ${Math.round((workout.time_cap_seconds ?? 0) / 60)} דקות` : `אימון רגיל · ${sessionExercises.length} תרגילים`}
            </p>
          </div>

          <div className="on-light bg-surface rounded-2xl border border-line p-4 space-y-2">
            {sessionExercises.map((se) => (
              <div key={se.id} className="flex items-center justify-between text-sm py-1.5 border-b border-line last:border-0">
                <span className="font-bold text-fg">{getExerciseName(se.exercise, lang)}</span>
                <span className="text-muted">
                  {isAmrap
                    ? `${se.reps} ${se.is_time ? "שנ׳" : "חז׳"} בסבב`
                    : `${se.sets} × ${se.reps} ${se.is_time ? "שנ׳" : "חז׳"} · מנוחה ${se.rest_time_seconds}s`}
                </span>
              </div>
            ))}
          </div>

          <button
            disabled={isAmrap && !workout.time_cap_seconds}
            onClick={() => (isAmrap ? setIsAmrapRunning(true) : session.startDiyWorkoutNow())}
            className="mt-auto w-full flex items-center justify-center gap-2 py-4 rounded-2xl bg-btn-primary text-btn-primary-fg hover:bg-btn-primary-hover active:bg-btn-primary-active font-black text-base shadow-lg shadow-accent/20 disabled:bg-disabled disabled:text-disabled-fg disabled:hover:bg-disabled disabled:shadow-none"
          >
            {isAmrap ? <Timer size={18} /> : <Play size={18} fill="currentColor" />} התחל סימולציה
          </button>
        </div>
      )}
    </>
  );
}
