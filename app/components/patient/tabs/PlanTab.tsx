"use client";

import {
  ArrowRight,
  Activity,
  CalendarCheck,
  ChevronLeft,
  Dumbbell,
  Info,
  Lock,
  MoreHorizontal,
  Timer,
  User,
  Wind,
} from "lucide-react";
import {
  Bar,
  BarChart,
  CartesianGrid,
  Legend,
  Line,
  LineChart,
  ResponsiveContainer,
  Tooltip as RechartsTooltip,
  XAxis,
  YAxis,
} from "recharts";
import { useAuth } from "@/app/context/AuthContext";
import { AVAILABLE_MUSCLES, CATEGORY_IMAGES, DAYS_OF_WEEK, DEFAULT_COURSE_IMG } from "@/app/constants/catalog";
import { getTrackAccess } from "@/app/utils/premium";
import type { Exercise, WorkoutLog } from "@/app/types";
import type { HydratedPatientExercise, SessionExercise } from "@/app/hooks/useWorkoutSession";

interface PlanTabProps {
  workoutLogs: WorkoutLog[];
  selectedCategory: string | null;
  setSelectedCategory: (category: string | null) => void;
  selectedDayFilter: string;
  setSelectedDayFilter: (day: string) => void;
  activePatientWeek: number;
  availablePatientWeeks: number[];
  setPatientSelectedWeek: (week: number) => void;
  isDiyMode: boolean;
  diyWorkoutName: string;
  patientCategories: string[];
  displayedExercises: HydratedPatientExercise[];
  blocksMap: Record<string, SessionExercise[]>;
  blocksKeys: string[];
  onViewExerciseInfo: (exercise: Exercise) => void;
  onStartWorkout: () => void;
}

export default function PlanTab({
  workoutLogs,
  selectedCategory,
  setSelectedCategory,
  selectedDayFilter,
  setSelectedDayFilter,
  activePatientWeek,
  availablePatientWeeks,
  setPatientSelectedWeek,
  isDiyMode,
  diyWorkoutName,
  patientCategories,
  displayedExercises,
  blocksMap,
  blocksKeys,
  onViewExerciseInfo,
  onStartWorkout,
}: PlanTabProps) {
  const { loggedInPatient } = useAuth();

  const progressData = [...workoutLogs].reverse().map((log, index) => ({
    name: `אימון ${index + 1}`,
    date: new Date(log.created_at).toLocaleDateString("he-IL", { day: "2-digit", month: "2-digit" }),
    "כאב לפני": log.pain_before,
    "כאב אחרי": log.pain_after,
    "מאמץ (RPE)": log.rpe,
  }));

  // Week Switcher: the original never exposed a way to change
  // patientSelectedWeek at all, so patients could never navigate past
  // whichever week happened to be the lowest with assigned exercises. This
  // steps through availablePatientWeeks (the only weeks that actually have
  // content) rather than raw +1/-1, so it can't get stuck on a gap between
  // sparsely-assigned week numbers.
  const weeks = availablePatientWeeks.length > 0 ? availablePatientWeeks : [1];
  const weekIndex = weeks.indexOf(activePatientWeek);
  const goPrevWeek = () => {
    if (weekIndex > 0) setPatientSelectedWeek(weeks[weekIndex - 1]);
  };
  const goNextWeek = () => {
    if (weekIndex < weeks.length - 1) setPatientSelectedWeek(weeks[weekIndex + 1]);
  };

  // ----- Overview screen -----
  if (!selectedCategory) {
    return (
      <div className="animate-in fade-in duration-700 print:hidden">
        {/* Week Switcher */}
        <div className="flex items-center justify-center gap-3 mb-8">
          <button
            onClick={goPrevWeek}
            disabled={weekIndex <= 0}
            aria-label="Previous week"
            className="w-9 h-9 rounded-full bg-[#1c1c1e] border border-stone-800 flex items-center justify-center text-stone-300 hover:bg-stone-800 transition-colors disabled:opacity-30 disabled:cursor-not-allowed disabled:hover:bg-[#1c1c1e]"
          >
            <ChevronLeft size={18} />
          </button>
          <span className="text-sm font-black text-white tracking-wide px-5 py-1.5 bg-[#1c1c1e] border border-stone-800 rounded-full min-w-[110px] text-center">
            Week {activePatientWeek}
          </span>
          <button
            onClick={goNextWeek}
            disabled={weekIndex >= weeks.length - 1}
            aria-label="Next week"
            className="w-9 h-9 rounded-full bg-[#1c1c1e] border border-stone-800 flex items-center justify-center text-stone-300 hover:bg-stone-800 transition-colors disabled:opacity-30 disabled:cursor-not-allowed disabled:hover:bg-[#1c1c1e]"
          >
            <ChevronLeft size={18} className="rotate-180" />
          </button>
        </div>

        {/* לוח שנה עליון */}
        <div className="mb-10">
          <div className="flex items-center justify-between mb-6">
            <h2 className="text-2xl font-black text-white tracking-tight">Daily Workout</h2>
            <button className="bg-white text-stone-900 px-4 py-1.5 rounded-full text-xs font-bold flex items-center gap-1">
              <CalendarCheck size={14} /> Calendar
            </button>
          </div>

          <div className="flex justify-between items-center bg-[#1c1c1e] p-3 rounded-full border border-stone-800 mb-8 overflow-x-auto no-scrollbar gap-2">
            {DAYS_OF_WEEK.map((day) => {
              const isActive = selectedDayFilter === day.id;
              return (
                <button
                  key={day.id}
                  onClick={() => setSelectedDayFilter(day.id)}
                  className={`w-10 h-10 flex items-center justify-center rounded-full text-sm font-bold transition-all shrink-0 ${isActive ? "bg-white text-stone-900 shadow-md" : "text-stone-500 hover:text-stone-300"}`}
                >
                  {day.short}
                </button>
              );
            })}
          </div>

          {/* כרטיס אימון היום */}
          {patientCategories.length > 0 ? (
            (() => {
              const todayCat = patientCategories[0];
              const imgUrl = CATEGORY_IMAGES[String(todayCat)] || DEFAULT_COURSE_IMG;
              return (
                <div className="bg-stone-900 rounded-[2.5rem] shadow-xl overflow-hidden relative border border-stone-800 h-[400px]">
                  <img src={imgUrl} className="absolute inset-0 w-full h-full object-cover opacity-60 mix-blend-overlay" alt="" />
                  <div className="absolute inset-0 bg-gradient-to-t from-stone-950 via-stone-900/60 to-transparent z-10"></div>

                  <div className="absolute top-6 left-6 right-6 flex justify-between z-20">
                    <div className="bg-white/20 backdrop-blur-md text-white font-bold text-xs px-3 py-1.5 rounded-full flex items-center gap-1 border border-white/10">
                      <Timer size={12} /> To be Completed
                    </div>
                  </div>

                  <div className="absolute bottom-6 left-6 right-6 z-20">
                    <h3 className="text-4xl font-black text-white mb-1">{isDiyMode ? diyWorkoutName : todayCat}</h3>
                    <p className="text-stone-400 font-medium mb-4">{new Date().toLocaleDateString("en-US", { month: "long", day: "numeric", year: "numeric" })}</p>

                    <div className="flex items-center gap-4 mb-6">
                      <span className="flex items-center gap-1 text-stone-300 text-sm font-bold">
                        <Timer size={16} /> 45 Minutes
                      </span>
                      <span className="flex items-center gap-1 text-stone-300 text-sm font-bold">
                        <Activity size={16} /> For All Levels
                      </span>
                    </div>

                    <button
                      onClick={() => setSelectedCategory(String(todayCat))}
                      className="w-14 h-14 bg-white text-stone-900 rounded-full flex items-center justify-center hover:bg-stone-200 transition-transform hover:scale-105 shadow-lg absolute bottom-0 right-0"
                    >
                      <ArrowRight size={24} />
                    </button>
                  </div>
                </div>
              );
            })()
          ) : (
            <div className="bg-[#1c1c1e] rounded-[2.5rem] p-10 text-center border border-stone-800 h-[300px] flex flex-col items-center justify-center relative overflow-hidden">
              {/* Fallback to basic mobility track if nothing is assigned */}
              <div className="absolute inset-0 bg-[url('https://images.unsplash.com/photo-1544367567-0f2fcb009e0b?auto=format&fit=crop&w=800&q=80')] bg-cover opacity-20 mix-blend-screen grayscale"></div>
              <div className="relative z-10">
                <Wind size={48} className="text-teal-500 mx-auto mb-4" />
                <h3 className="text-2xl font-black text-white mb-2">Morning Mobility</h3>
                <p className="text-stone-400 text-sm">אין אימוני כוח מתוכננים להיום. מומלץ לבצע את רוטינת התנועתיות הבסיסית.</p>
              </div>
            </div>
          )}
        </div>

        <div className="flex justify-between items-end mb-4 pt-4">
          <h2 className="text-xl font-bold text-stone-400 uppercase tracking-widest text-xs">All Programs</h2>
        </div>

        {patientCategories.length === 0 ? (
          <div className="mt-4 bg-[#1c1c1e] p-10 rounded-[2rem] border border-stone-800 text-center flex flex-col items-center shadow-sm mb-12">
            <p className="text-stone-500">אתה יכול גם להסתכל על שאר התוכניות שלך (אם קיימות).</p>
          </div>
        ) : (
          <div className="flex overflow-x-auto gap-5 pb-12 snap-x no-scrollbar">
            {patientCategories.map((cat, idx) => {
              const { owned: userOwnsTrack } = getTrackAccess(loggedInPatient, cat);
              const isLocked = loggedInPatient?.patient_type === "fitness" && activePatientWeek >= 3 && !userOwnsTrack;

              const imgUrl = CATEGORY_IMAGES[String(cat)] || DEFAULT_COURSE_IMG;
              const fakeProgressPercent = Math.min(activePatientWeek * 8, 100);

              return (
                <div key={idx} className={`min-w-[280px] w-[280px] md:min-w-[320px] bg-[#1c1c1e] text-white rounded-[2rem] shadow-lg overflow-hidden group snap-center relative border border-stone-800 ${isLocked ? "opacity-90" : ""}`}>
                  <div className="h-64 w-full relative overflow-hidden">
                    <div className="absolute inset-0 bg-gradient-to-t from-[#1c1c1e] to-transparent z-10"></div>
                    <img src={imgUrl} className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-700 opacity-50" alt={String(cat)} />
                    {isLocked && (
                      <div className="absolute inset-0 z-20 flex items-center justify-center">
                        <Lock size={40} className="text-white/30" />
                      </div>
                    )}

                    <div className="absolute inset-0 z-20 flex flex-col justify-between p-6">
                      <div className="flex justify-between items-start">
                        <span className="bg-stone-900/80 backdrop-blur-md px-3 py-1 rounded-full text-xs font-bold border border-stone-700">L1</span>
                      </div>
                      <div className="text-center">
                        <div className="w-12 h-12 border-2 border-white/20 rounded-full mx-auto flex items-center justify-center mb-2 backdrop-blur-md">
                          <Activity size={20} className="text-white" />
                        </div>
                        <h3 className="text-2xl font-black text-white uppercase tracking-widest">{cat}</h3>
                      </div>
                    </div>
                  </div>
                  <div className="p-5 bg-[#1c1c1e] border-t border-stone-800">
                    <div className="flex items-center gap-3 mb-4">
                      <div className="flex-1 h-1.5 bg-stone-800 rounded-full overflow-hidden">
                        <div className={`h-full rounded-full transition-all duration-1000 ${isLocked ? "bg-amber-500" : "bg-teal-500"}`} style={{ width: `${fakeProgressPercent}%` }}></div>
                      </div>
                    </div>
                    <button
                      onClick={() => setSelectedCategory(String(cat))}
                      className={`w-full py-3 rounded-xl font-bold flex items-center justify-center gap-2 transition-colors text-sm ${isLocked ? "bg-stone-900 text-amber-500 hover:bg-stone-800 border border-stone-800" : "bg-white text-stone-900 hover:bg-stone-200"}`}
                    >
                      {isLocked ? (
                        <>
                          <Lock size={14} /> פתח מסלול נעול
                        </>
                      ) : (
                        <>המשך אימון</>
                      )}
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        )}

        {/* שילוב מנגנון ההתקדמות (Progress) לתוך המסך הראשי! */}
        <div className="border-t border-stone-800 pt-10">
          <h2 className="text-2xl font-black text-white mb-8 tracking-tight">מגמות והתקדמות אישית</h2>
          {workoutLogs.length === 0 ? (
            <div className="bg-[#1c1c1e] p-10 rounded-[2rem] border border-stone-800 text-center">
              <p className="text-stone-500">הנתונים יופיעו כאן ברגע שתסיים את האימון הראשון.</p>
            </div>
          ) : (
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
              {loggedInPatient?.patient_type !== "fitness" && (
                <div className="bg-[#1c1c1e] p-6 rounded-3xl shadow-sm border border-stone-800">
                  <h3 className="text-lg font-black text-white mb-6 flex items-center gap-2">
                    <Activity size={18} className="text-teal-500" /> מגמת כאב לאורך זמן
                  </h3>
                  <div className="h-64 w-full" dir="ltr">
                    <ResponsiveContainer width="100%" height="100%">
                      <LineChart data={progressData} margin={{ top: 5, right: 20, bottom: 5, left: 0 }}>
                        <CartesianGrid strokeDasharray="3 3" stroke="#333" vertical={false} />
                        <XAxis dataKey="date" tick={{ fontSize: 10, fill: "#888" }} />
                        <YAxis domain={[0, 10]} tick={{ fontSize: 10, fill: "#888" }} />
                        <RechartsTooltip contentStyle={{ backgroundColor: "#1c1c1e", borderColor: "#333", color: "#fff" }} />
                        <Legend wrapperStyle={{ fontSize: "12px", fontWeight: "bold", marginTop: "10px", color: "#888" }} />
                        <Line type="monotone" dataKey="כאב לפני" stroke="#f59e0b" strokeWidth={3} dot={{ r: 4, strokeWidth: 2 }} activeDot={{ r: 6 }} isAnimationActive={false} />
                        <Line type="monotone" dataKey="כאב אחרי" stroke="#14b8a6" strokeWidth={3} dot={{ r: 4, strokeWidth: 2 }} activeDot={{ r: 6 }} isAnimationActive={false} />
                      </LineChart>
                    </ResponsiveContainer>
                  </div>
                </div>
              )}
              <div className="bg-[#1c1c1e] p-6 rounded-3xl shadow-sm border border-stone-800">
                <h3 className="text-lg font-black text-white mb-6 flex items-center gap-2">
                  <Activity size={18} className="text-amber-500" /> עומס ומאמץ (RPE)
                </h3>
                <div className="h-64 w-full" dir="ltr">
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={progressData} margin={{ top: 5, right: 20, bottom: 5, left: 0 }}>
                      <CartesianGrid strokeDasharray="3 3" stroke="#333" vertical={false} />
                      <XAxis dataKey="date" tick={{ fontSize: 10, fill: "#888" }} />
                      <YAxis domain={[0, 10]} tick={{ fontSize: 10, fill: "#888" }} />
                      <RechartsTooltip cursor={{ fill: "#333" }} contentStyle={{ backgroundColor: "#1c1c1e", borderColor: "#333", color: "#fff" }} />
                      <Bar dataKey="מאמץ (RPE)" fill="#14b8a6" radius={[6, 6, 0, 0]} barSize={32} isAnimationActive={false} />
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    );
  }

  // ----- Detail / summary screen -----
  const { owned: userOwnsTrack } = getTrackAccess(loggedInPatient, selectedCategory);

  return (
    <div className="animate-in slide-in-from-left duration-500 print:hidden max-w-lg mx-auto">
      <div className="mb-6 flex items-center justify-between">
        <button onClick={() => setSelectedCategory(null)} className="p-2 bg-stone-900 rounded-full hover:bg-stone-800 transition-colors text-white">
          <ChevronLeft size={24} />
        </button>
        <span className="text-xs font-bold uppercase tracking-widest text-stone-500">Details</span>
        <button className="p-2 text-stone-500 hover:text-white">
          <MoreHorizontal size={24} />
        </button>
      </div>

      {loggedInPatient?.patient_type === "fitness" && activePatientWeek >= 3 && !userOwnsTrack && !isDiyMode ? (
        <div className="bg-gradient-to-b from-[#1c1c1e] to-stone-900 rounded-[2.5rem] p-10 text-center text-white relative overflow-hidden shadow-2xl border border-stone-800">
          <Lock size={60} className="text-amber-500 mx-auto mb-6 relative z-10" />
          <h2 className="text-3xl md:text-5xl font-black mb-4 relative z-10 tracking-tight">המשך המסלול נעול</h2>
          <p className="text-lg text-stone-400 mb-8 max-w-md mx-auto relative z-10 font-medium">
            סיימת את השבועיים הראשונים במסלול {selectedCategory}! כדי להמשיך להתקדם ולהיפתח לכל התרגילים, פתח את מסלול הפרימיום.
          </p>
          <button
            onClick={() => {
              if (!loggedInPatient?.email_verified) {
                return alert("עליך לאמת את כתובת המייל שלך לפני שתוכל לרכוש תוכניות. בדוק את תיבת הדואר הנכנס שלך.");
              }
              window.open(
                `https://wa.me/972504441094?text=${encodeURIComponent(`היי רועי, סיימתי את השבועיים החינמיים של ${selectedCategory} ואשמח לפתוח את המסלול!`)}`,
                "_blank"
              );
            }}
            className="bg-amber-500 hover:bg-amber-400 text-stone-900 px-10 py-4 rounded-xl font-black text-lg transition-colors relative z-10 shadow-xl"
          >
            שדרג עכשיו לפרימיום
          </button>
        </div>
      ) : (
        (() => {
          const totalSets = displayedExercises.reduce((acc, curr) => acc + (curr.sets || 0), 0);
          const estimatedTime = Math.max(10, Math.round(totalSets * 1.5));
          const uniqueMuscles = Array.from(new Set(displayedExercises.map((a) => a.exercise?.target_muscle).filter(Boolean)));
          const muscleLabels = uniqueMuscles.map((m) => AVAILABLE_MUSCLES.find((am) => am.id === m)?.label).filter(Boolean).join(", ");

          const equipSet = new Set<string>();
          displayedExercises.forEach((a) => {
            const str = (a.exercise?.title + " " + a.exercise?.description).toLowerCase();
            if (str.includes("מתח") || str.includes("pull up") || str.includes("pull-up")) equipSet.add("Pull up bar");
            if (str.includes("מקבילים") || str.includes("dip")) equipSet.add("Dip bar");
            if (str.includes("טבעות") || str.includes("ring")) equipSet.add("Rings");
            if (str.includes("פרללס") || str.includes("parallettes")) equipSet.add("Parallettes");
            if (str.includes("משקולות") || str.includes("dumbbell")) equipSet.add("Dumbbells");
          });
          const equipmentLabels = equipSet.size > 0 ? Array.from(equipSet).join(", ") : "Bodyweight (No equipment)";

          return (
            <>
              <div className="mb-8">
                <span className="bg-stone-800 text-stone-300 font-bold px-3 py-1 rounded-md text-[10px] uppercase tracking-widest mb-3 inline-block border border-stone-700">Classic</span>
                <h1 className="text-4xl font-black text-white tracking-tight leading-tight mb-2">{isDiyMode ? diyWorkoutName : selectedCategory}</h1>
                <p className="text-stone-500 text-sm font-medium">
                  Week {activePatientWeek} - Session {selectedDayFilter === "all" ? "1" : selectedDayFilter} - {new Date().toLocaleDateString("en-US", { weekday: "short", month: "short", day: "numeric" })}
                </p>
              </div>

              <div className="space-y-4 mb-10 text-stone-300 text-sm">
                <div className="flex items-start gap-4">
                  <Dumbbell size={20} className="text-orange-500 shrink-0 mt-0.5" />
                  <div className="flex-1 flex justify-between items-center border-b border-stone-800 pb-4">
                    <span>{equipmentLabels}</span>
                    <Info size={14} className="text-stone-600" />
                  </div>
                </div>
                <div className="flex items-start gap-4">
                  <Timer size={20} className="text-orange-500 shrink-0 mt-0.5" />
                  <div className="flex-1 flex justify-between items-center border-b border-stone-800 pb-4">
                    <span>~{estimatedTime} mins</span>
                    <Info size={14} className="text-stone-600" />
                  </div>
                </div>
                <div className="flex items-start gap-4">
                  <User size={20} className="text-orange-500 shrink-0 mt-0.5" />
                  <div className="flex-1 flex justify-between items-center pb-4">
                    <span className="leading-relaxed pr-4">{muscleLabels || "Full body"}</span>
                    <Info size={14} className="text-stone-600" />
                  </div>
                </div>
              </div>

              <div className="space-y-4 pb-32">
                {blocksKeys.map((blockKey) => (
                  <div key={blockKey} className="space-y-4">
                    {blocksMap[blockKey].length > 1 && <div className="text-xs font-bold text-teal-500 uppercase tracking-widest mt-6 mb-2">Block {blockKey} (Super-Set)</div>}

                    {blocksMap[blockKey].map((assignment) => (
                      <div key={assignment.id} className="flex items-center gap-4 group cursor-pointer hover:bg-stone-900 p-2 -mx-2 rounded-2xl transition-colors" onClick={() => onViewExerciseInfo(assignment.exercise)}>
                        <div className="w-16 h-16 rounded-2xl overflow-hidden bg-stone-900 shrink-0 border border-stone-800">
                          {assignment.exercise.gif_url ? (
                            assignment.exercise.gif_url.toLowerCase().includes(".mp4") || assignment.exercise.gif_url.toLowerCase().includes(".webm") ? (
                              <video src={assignment.exercise.gif_url} className="w-full h-full object-cover" />
                            ) : (
                              <img src={assignment.exercise.gif_url} alt={assignment.exercise.title} className="w-full h-full object-cover" />
                            )
                          ) : (
                            <div className="w-full h-full bg-stone-800"></div>
                          )}
                        </div>
                        <div className="flex-1 overflow-hidden py-1">
                          <div className="text-stone-500 text-xs font-bold mb-1 flex items-center gap-1">
                            {assignment.sets} sets x {assignment.is_time ? `${assignment.reps}"` : `${assignment.reps} reps`}
                            {assignment.rir && <span className="bg-stone-800 text-stone-400 px-1.5 py-0.5 rounded text-[8px] ml-1">RIR {assignment.rir}</span>}
                          </div>
                          <h4 className="text-white font-bold truncate">{assignment.exercise.title}</h4>
                        </div>
                        <ChevronLeft size={16} className="text-stone-600 group-hover:text-white transition-colors rotate-180" />
                      </div>
                    ))}
                  </div>
                ))}
              </div>

              {displayedExercises.length > 0 && (
                <div className="fixed bottom-[4.5rem] left-0 right-0 p-6 bg-gradient-to-t from-stone-950 via-stone-950/90 to-transparent z-40 flex justify-center pointer-events-none">
                  <button onClick={onStartWorkout} className="w-full max-w-sm bg-orange-600/90 backdrop-blur-md text-white py-4 rounded-full font-black text-lg hover:bg-orange-500 transition-colors shadow-[0_10px_40px_rgba(234,88,12,0.3)] pointer-events-auto tracking-widest">
                    START SESSION
                  </button>
                </div>
              )}
            </>
          );
        })()
      )}
    </div>
  );
}
