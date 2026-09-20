"use client";

import { useState } from "react";
import { Dumbbell, HeartPulse, Play, X } from "lucide-react";
import { AuthContext, useAuth, type AuthContextValue } from "@/app/context/AuthContext";
import { TRANSLATIONS } from "@/app/constants/translations";
import { useHaptics } from "@/app/hooks/useHaptics";
import { useWorkoutSession, type HydratedPatientExercise } from "@/app/hooks/useWorkoutSession";
import { getExerciseName } from "@/app/utils/format";
import WorkoutPlayer from "@/app/components/patient/workout/WorkoutPlayer";
import ExerciseInfoModal from "@/app/components/patient/workout/ExerciseInfoModal";
import type { Exercise, Package, PackageExercise, Patient, PatientType } from "@/app/types";

interface ProgramSimulatorModalProps {
  pkg: Package;
  packageExercises: PackageExercise[];
  exerciseCatalog: Exercise[];
  onClose: () => void;
}

// Admin "Run/Test": renders the real, unmodified <WorkoutPlayer> against a
// synthetic patient (id "-1") so a program can be tried exactly as a trainee
// would experience it — same timers, same screens — without leaving the
// admin console or writing anything to a real patient's data. The synthetic
// AuthContext.Provider nested below is what makes useWorkoutSession's
// internal useAuth() see the fake patient instead of the admin's own.
export default function ProgramSimulatorModal({ pkg, packageExercises, exerciseCatalog, onClose }: ProgramSimulatorModalProps) {
  const [patientType, setPatientType] = useState<PatientType>("fitness");

  const syntheticPatient: Patient = {
    id: "-1",
    user_id: "simulator",
    role: "patient",
    full_name: "מטופל לדוגמה",
    patient_type: patientType,
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

  const hydratedExercises: HydratedPatientExercise[] = packageExercises
    .map((pe) => {
      const exercise = exerciseCatalog.find((e) => e.id === pe.exercise_id);
      if (!exercise) return null;
      return {
        id: `sim_${pe.id}`,
        patient_id: "-1",
        exercise_id: pe.exercise_id,
        exercise,
        block: pe.block || "A",
        sets: Number(pe.sets) || 0,
        reps: Number(pe.reps) || 0,
        rir: pe.rir,
        is_time: pe.is_time,
        week: pe.week || 1,
        scheduled_days: pe.scheduled_days,
        rest_time_seconds: pe.rest_time_seconds ?? 60,
      } as HydratedPatientExercise;
    })
    .filter((x): x is HydratedPatientExercise => x !== null);

  return (
    <div className="fixed inset-0 z-[300] bg-stone-950/70 backdrop-blur-sm flex items-center justify-center p-0 md:p-6">
      <div className="relative w-full h-full md:h-[92vh] md:max-w-md md:rounded-[2.5rem] overflow-hidden bg-[#FDFBF7] shadow-2xl">
        <button
          onClick={onClose}
          className="absolute top-4 left-4 z-[400] w-10 h-10 rounded-full bg-stone-950/80 text-white flex items-center justify-center shadow-lg hover:bg-stone-950"
          aria-label="סגור סימולציה"
        >
          <X size={20} />
        </button>

        <AuthContext.Provider value={syntheticAuthValue}>
          <SimulatorPlayer
            programTitle={pkg.title}
            hydratedExercises={hydratedExercises}
            exerciseCatalog={exerciseCatalog}
            patientType={patientType}
            setPatientType={setPatientType}
          />
        </AuthContext.Provider>
      </div>
    </div>
  );
}

interface SimulatorPlayerProps {
  programTitle: string;
  hydratedExercises: HydratedPatientExercise[];
  exerciseCatalog: Exercise[];
  patientType: PatientType;
  setPatientType: (t: PatientType) => void;
}

function SimulatorPlayer({ programTitle, hydratedExercises, exerciseCatalog, patientType, setPatientType }: SimulatorPlayerProps) {
  const { triggerHaptic } = useHaptics();
  const { lang } = useAuth();

  const weeks = Array.from(new Set(hydratedExercises.map((h) => h.week || 1))).sort((a, b) => a - b);
  const [activeWeek, setActiveWeek] = useState(weeks[0] || 1);

  const weekExercises = hydratedExercises.filter((h) => (h.week || 1) === activeWeek);
  const categories = Array.from(new Set(weekExercises.flatMap((h) => h.exercise.categories)));
  const [selectedCategory, setSelectedCategory] = useState<string | null>(categories[0] || null);

  const session = useWorkoutSession({
    patientExercises: hydratedExercises,
    exerciseCatalog,
    workoutLogs: [],
    activePatientWeek: activeWeek,
    selectedCategory,
    selectedDayFilter: "all",
    isDiyMode: false,
    diySelectedExercises: [],
    diyScheduleDay: "",
    onExitDiyMode: () => {},
    triggerHaptic,
    onWorkoutLogged: () => {},
    isSimulation: true,
  });

  if (hydratedExercises.length === 0) {
    return (
      <div className="p-8 h-full flex flex-col items-center justify-center text-center gap-3 text-stone-500">
        <Dumbbell size={40} className="text-stone-300" />
        <p className="font-bold text-stone-700">לתבנית הזו עדיין אין תרגילים</p>
        <p className="text-sm">הוסף תרגילים בבונה החכם לפני שמריצים סימולציה.</p>
      </div>
    );
  }

  return (
    <>
      <WorkoutPlayer session={session} triggerHaptic={triggerHaptic} />

      {session.viewingExInfo && (
        <ExerciseInfoModal exercise={session.viewingExInfo} historyData={session.exHistoryData} onClose={() => session.setViewingExInfo(null)} />
      )}

      {!session.isWorkoutMode && (
        <div className="h-full overflow-y-auto p-6 pt-16 flex flex-col gap-6">
          <div>
            <div className="text-[10px] font-extrabold tracking-widest uppercase text-emerald-600">מצב סימולציה — אדמין</div>
            <h2 className="text-xl font-black text-stone-900 mt-1">{programTitle}</h2>
          </div>

          <div>
            <div className="text-xs font-bold text-stone-500 mb-2">הרץ בתור מטופל מסוג</div>
            <div className="flex gap-2">
              <button
                onClick={() => setPatientType("fitness")}
                className={`flex-1 flex items-center justify-center gap-1.5 py-2.5 rounded-xl text-sm font-bold border transition-colors ${
                  patientType === "fitness" ? "bg-stone-900 text-white border-stone-900" : "bg-white text-stone-600 border-stone-200"
                }`}
              >
                <Dumbbell size={15} /> כושר
              </button>
              <button
                onClick={() => setPatientType("clinical")}
                className={`flex-1 flex items-center justify-center gap-1.5 py-2.5 rounded-xl text-sm font-bold border transition-colors ${
                  patientType === "clinical" ? "bg-stone-900 text-white border-stone-900" : "bg-white text-stone-600 border-stone-200"
                }`}
              >
                <HeartPulse size={15} /> קליני
              </button>
            </div>
          </div>

          {weeks.length > 1 && (
            <div>
              <div className="text-xs font-bold text-stone-500 mb-2">שבוע</div>
              <div className="flex flex-wrap gap-2">
                {weeks.map((w) => (
                  <button
                    key={w}
                    onClick={() => setActiveWeek(w)}
                    className={`px-4 py-2 rounded-full text-sm font-bold border transition-colors ${
                      activeWeek === w ? "bg-emerald-600 text-white border-emerald-600" : "bg-white text-stone-600 border-stone-200"
                    }`}
                  >
                    שבוע {w}
                  </button>
                ))}
              </div>
            </div>
          )}

          <div>
            <div className="text-xs font-bold text-stone-500 mb-2">קטגוריה</div>
            {categories.length === 0 ? (
              <p className="text-sm text-stone-400">אין תרגילים בשבוע הנבחר.</p>
            ) : (
              <div className="flex flex-wrap gap-2">
                {categories.map((cat) => (
                  <button
                    key={cat}
                    onClick={() => setSelectedCategory(cat)}
                    className={`px-4 py-2 rounded-full text-sm font-bold border transition-colors ${
                      selectedCategory === cat ? "bg-emerald-600 text-white border-emerald-600" : "bg-white text-stone-600 border-stone-200"
                    }`}
                  >
                    {cat}
                  </button>
                ))}
              </div>
            )}
          </div>

          <div className="bg-white rounded-2xl border border-stone-100 p-4 space-y-2">
            {session.displayedExercises.length === 0 ? (
              <p className="text-sm text-stone-400 text-center py-4">בחר קטגוריה שיש בה תרגילים כדי לראות תצוגה מקדימה.</p>
            ) : (
              session.displayedExercises.map((pe) => (
                <div key={pe.id} className="flex items-center justify-between text-sm py-1.5 border-b border-stone-50 last:border-0">
                  <span className="font-bold text-stone-800">{getExerciseName(pe.exercise, lang)}</span>
                  <span className="text-stone-500">
                    {pe.sets} × {pe.reps} {pe.is_time ? "שנ׳" : "חז׳"} · מנוחה {pe.rest_time_seconds}s
                  </span>
                </div>
              ))
            )}
          </div>

          <button
            disabled={session.displayedExercises.length === 0}
            onClick={session.handleStartClick}
            className="mt-auto w-full flex items-center justify-center gap-2 py-4 rounded-2xl bg-emerald-600 text-white font-black text-base shadow-lg shadow-emerald-600/20 disabled:opacity-40 disabled:shadow-none"
          >
            <Play size={18} fill="currentColor" /> התחל סימולציה
          </button>
        </div>
      )}

    </>
  );
}
