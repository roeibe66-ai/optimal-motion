"use client";

import { useState, type ReactNode } from "react";
import { CalendarPlus, Check, Compass, Crown, Dumbbell, Flame, Heart, Lock, Play, Plus, Timer } from "lucide-react";
import Modal from "@/app/components/ui/Modal";
import { DAYS_OF_WEEK } from "@/app/constants/catalog";
import { formatWeightKg, getExerciseName } from "@/app/utils/format";
import { getExerciseThumbUrl } from "@/app/utils/media";
import { ExerciseThumb as SharedExerciseThumb } from "@/app/components/ExerciseMedia";
import { toDateKey } from "@/app/hooks/useWorkoutSession";
import { useAuth } from "@/app/context/AuthContext";
import type { Exercise, ExploreProgram, Workout } from "@/app/types";

interface ExploreTabProps {
  freePrograms: ExploreProgram[];
  premiumPrograms: ExploreProgram[];
  likedPrograms: ExploreProgram[];
  likedProgramIds: Set<string>;
  addedPrograms: Map<string, { programId: string; isSelfAdded: boolean }>;
  onToggleLike: (programId: string) => void;
  onAddProgram: (programId: string) => Promise<boolean>;
  onRemoveProgram: (programId: string) => Promise<boolean>;
  exerciseCatalog: Exercise[];
  workouts: Workout[];
  likedWorkouts: Workout[];
  likedWorkoutIds: Set<string>;
  onToggleWorkoutLike: (workoutId: string) => void;
  onStartWorkout: (workout: Workout) => void;
  onAddWorkoutToDay: (workoutId: string, dayId: string, date?: string) => Promise<boolean>;
}

const workoutFormatLabel = (w: Workout) => (w.format === "amrap" ? `AMRAP · ${Math.round((w.time_cap_seconds ?? 0) / 60)} דק׳` : `${w.items.length} תרגילים`);

const workoutItemLabel = (w: Workout, item: Workout["items"][number]) => {
  const amount = `${item.reps} ${item.is_time ? "שנ׳" : "חזרות"}`;
  const weight = formatWeightKg(item.weight_kg);
  const base = w.format === "amrap" ? `${amount} בכל סבב` : `${item.sets ?? 3} × ${amount}`;
  return weight ? `${base} · ${weight}` : base;
};

function coverGifForWorkout(workout: Workout, exerciseCatalog: Exercise[]) {
  if (workout.cover_image_url) return workout.cover_image_url;
  for (const item of workout.items) {
    const url = getExerciseThumbUrl(exerciseCatalog.find((ex) => ex.id === item.exercise_id));
    if (url) return url;
  }
  return null;
}

function WorkoutCard({
  workout,
  coverUrl,
  isLiked,
  onToggleLike,
  onOpen,
}: {
  workout: Workout;
  coverUrl: string | null;
  isLiked: boolean;
  onToggleLike: () => void;
  onOpen: () => void;
}) {
  return (
    <button
      onClick={onOpen}
      className="on-light min-w-[180px] w-[180px] shrink-0 rounded-3xl overflow-hidden bg-surface text-start shadow-card border border-line hover:-translate-y-0.5 hover:shadow-[0_16px_32px_-8px_color-mix(in_srgb,var(--shadow-ink)_12%,transparent)] active:scale-[0.97] transition-all duration-200 ease-out"
    >
      <div className="on-light h-[110px] relative bg-surface-alt">
        {coverUrl ? (
          <img src={coverUrl} alt="" className="absolute inset-0 w-full h-full object-contain p-2" />
        ) : (
          <div className="absolute inset-0" style={{ background: "radial-gradient(circle at 70% 20%, color-mix(in srgb, var(--accent) 22%, transparent), transparent 70%)" }} />
        )}
        <div
          onClick={(e) => {
            e.stopPropagation();
            onToggleLike();
          }}
          role="button"
          aria-label={isLiked ? "הסר לייק" : "אהבתי"}
          className="on-light absolute top-2.5 left-2.5 w-8 h-8 rounded-full bg-surface backdrop-blur-md flex items-center justify-center shadow-sm active:scale-90 transition-transform"
        >
          <Heart size={15} className={isLiked ? "fill-accent-fg text-accent-fg" : "text-muted"} />
        </div>
        {!workout.is_free && (
          <span className="absolute top-2.5 right-2.5 bg-warm text-on-accent text-[9px] font-black px-2 py-1 rounded-full uppercase tracking-wide">פרימיום</span>
        )}
      </div>
      <div className="p-3.5 flex flex-col gap-1.5">
        <h4 className="font-extrabold text-[13px] text-fg truncate">{workout.title}</h4>
        <span className={`text-[10px] font-extrabold w-fit ${workout.format === "amrap" ? "px-2 py-0.5 rounded-full bg-accent/15 text-accent-fg" : "text-muted"}`}>
          {workoutFormatLabel(workout)}
        </span>
      </div>
    </button>
  );
}

// "3 שבועות · 4 ימי אימון" — distinct weeks, and distinct training days in week 1.
function programShape(program: ExploreProgram) {
  const weeks = new Set(program.exercises.map((e) => e.week || 1));
  const firstWeek = Math.min(...weeks);
  const days = new Set(program.exercises.filter((e) => (e.week || 1) === firstWeek).map((e) => e.scheduled_days || "0"));
  return { weeks: weeks.size, days: days.size, firstWeek };
}

function coverGifFor(program: ExploreProgram, exerciseCatalog: Exercise[]) {
  for (const row of program.exercises) {
    const url = getExerciseThumbUrl(exerciseCatalog.find((ex) => ex.id === row.exercise_id));
    if (url) return url;
  }
  return null;
}

// Small exercise media in the Explore previews: a still (new-media poster
// or legacy image), a paused legacy video, or a dumbbell placeholder.
function ExerciseThumb({ exercise, alt }: { exercise: Exercise; alt: string }) {
  return <SharedExerciseThumb exercise={exercise} alt={alt} className="on-light w-11 h-11 rounded-xl bg-surface shrink-0 overflow-hidden" legacyFit="object-contain p-0.5" />;
}

function ProgramCard({
  program,
  coverUrl,
  isLiked,
  isAdded,
  onToggleLike,
  onOpen,
}: {
  program: ExploreProgram;
  coverUrl: string | null;
  isLiked: boolean;
  isAdded: boolean;
  onToggleLike: () => void;
  onOpen: () => void;
}) {
  const { weeks, days } = programShape(program);

  return (
    <button
      onClick={onOpen}
      className="on-light min-w-[180px] w-[180px] shrink-0 rounded-3xl overflow-hidden bg-surface text-start shadow-card border border-line hover:-translate-y-0.5 hover:shadow-[0_16px_32px_-8px_color-mix(in_srgb,var(--shadow-ink)_12%,transparent)] active:scale-[0.97] transition-all duration-200 ease-out"
    >
      <div className="on-light h-[110px] relative bg-surface-alt">
        {coverUrl ? (
          <img src={coverUrl} alt="" className="absolute inset-0 w-full h-full object-contain p-2" />
        ) : (
          <div className="absolute inset-0" style={{ background: "radial-gradient(circle at 70% 20%, color-mix(in srgb, var(--accent) 22%, transparent), transparent 70%)" }} />
        )}

        <div
          onClick={(e) => {
            e.stopPropagation();
            onToggleLike();
          }}
          role="button"
          aria-label={isLiked ? "הסר לייק" : "אהבתי"}
          className="on-light absolute top-2.5 left-2.5 w-8 h-8 rounded-full bg-surface backdrop-blur-md flex items-center justify-center shadow-sm active:scale-90 transition-transform"
        >
          <Heart size={15} className={isLiked ? "fill-accent-fg text-accent-fg" : "text-muted"} />
        </div>

        {!program.is_free && (
          <span className="absolute top-2.5 right-2.5 bg-warm text-on-accent text-[9px] font-black px-2 py-1 rounded-full uppercase tracking-wide">
            פרימיום
          </span>
        )}
      </div>

      <div className="p-3.5 flex flex-col gap-1.5">
        <h4 className="font-extrabold text-[13px] text-fg truncate">{program.title}</h4>
        <span className="text-[10px] font-bold text-muted">
          {weeks > 1 ? `${weeks} שבועות · ` : ""}
          {days} ימי אימון
        </span>
        {isAdded && (
          <span className="text-[10px] font-extrabold px-2 py-0.5 rounded-full w-fit bg-accent/15 text-accent-fg flex items-center gap-1">
            <Check size={10} /> בתוכניות שלך
          </span>
        )}
      </div>
    </button>
  );
}

function ProgramCarousel<T = ExploreProgram>({
  title,
  icon,
  list,
  render,
}: {
  title: string;
  icon: ReactNode;
  list: T[];
  render: (item: T) => ReactNode;
}) {
  if (list.length === 0) return null;
  return (
    <div className="mb-8">
      <div className="flex items-center gap-2 mb-3.5">
        {icon}
        <h3 className="text-[13px] font-extrabold tracking-widest text-muted uppercase">{title}</h3>
      </div>
      <div className="flex gap-3.5 overflow-x-auto no-scrollbar pb-1">{list.map(render)}</div>
    </div>
  );
}

// Bottom-nav "Explore" tab: every program template the admin published in
// the program library. Free ones can be added to the patient's own programs
// (a full copy of every week/day, shown on Home like an assigned program);
// premium ones show a contact CTA instead. Assigned-by-admin copies of the
// same template show as "already in your programs".
export default function ExploreTab({
  freePrograms,
  premiumPrograms,
  likedPrograms,
  likedProgramIds,
  addedPrograms,
  onToggleLike,
  onAddProgram,
  onRemoveProgram,
  exerciseCatalog,
  workouts,
  likedWorkouts,
  likedWorkoutIds,
  onToggleWorkoutLike,
  onStartWorkout,
  onAddWorkoutToDay,
}: ExploreTabProps) {
  const { lang, loggedInPatient } = useAuth();
  const [preview, setPreview] = useState<ExploreProgram | null>(null);
  const [workoutPreview, setWorkoutPreview] = useState<Workout | null>(null);
  // The "add to a day in my plan" picker inside the workout preview.
  const [pickDayFor, setPickDayFor] = useState<string | null>(null);
  // Inside that picker: every week on a weekday, or once on a specific date.
  const [scheduleMode, setScheduleMode] = useState<"weekly" | "date">("weekly");
  const todayKey = toDateKey(new Date());
  const [pickedDate, setPickedDate] = useState(todayKey);
  // Weekly mode: the weekdays ticked so far — nothing is added until "אישור".
  const [pickedDays, setPickedDays] = useState<string[]>([]);
  const [isBusy, setIsBusy] = useState(false);

  const renderWorkoutCard = (workout: Workout) => (
    <WorkoutCard
      key={workout.id}
      workout={workout}
      coverUrl={coverGifForWorkout(workout, exerciseCatalog)}
      isLiked={likedWorkoutIds.has(String(workout.id))}
      onToggleLike={() => onToggleWorkoutLike(String(workout.id))}
      onOpen={() => {
        setPickDayFor(null);
        setWorkoutPreview(workout);
      }}
    />
  );

  const handleAddWorkoutToDay = async (dayId: string, date?: string) => {
    if (!workoutPreview) return;
    setIsBusy(true);
    const ok = await onAddWorkoutToDay(String(workoutPreview.id), dayId, date);
    setIsBusy(false);
    if (ok) {
      if (date) {
        const [y, m, d] = date.split("-").map(Number);
        alert(`"${workoutPreview.title}" נוסף ללו"ז שלך ב-${new Date(y, m - 1, d).toLocaleDateString("he-IL", { weekday: "long", day: "numeric", month: "numeric" })}.`);
      } else {
        const dayLabels = dayId
          .split(",")
          .map((id) => DAYS_OF_WEEK.find((d) => d.id === id)?.label)
          .filter(Boolean)
          .join(", ");
        alert(`"${workoutPreview.title}" נוסף לתוכנית שלך בכל שבוע בימים: ${dayLabels}.`);
      }
      setPickDayFor(null);
      setWorkoutPreview(null);
    }
  };

  const contactForPremium = (title: string) => {
    if (!loggedInPatient?.email_verified) {
      return alert("עליך לאמת את כתובת המייל שלך לפני שתוכל לרכוש תוכניות. בדוק את תיבת הדואר הנכנס שלך.");
    }
    window.open(`https://wa.me/972504441094?text=${encodeURIComponent(`היי רועי, אני באפליקציה ואשמח לפתוח את: ${title}.`)}`, "_blank");
  };

  const renderCard = (program: ExploreProgram) => (
    <ProgramCard
      key={program.id}
      program={program}
      coverUrl={coverGifFor(program, exerciseCatalog)}
      isLiked={likedProgramIds.has(String(program.id))}
      isAdded={addedPrograms.has(String(program.id))}
      onToggleLike={() => onToggleLike(String(program.id))}
      onOpen={() => setPreview(program)}
    />
  );

  const previewAdded = preview ? addedPrograms.get(String(preview.id)) : undefined;
  const previewShape = preview ? programShape(preview) : null;
  // First week's training days, in DAYS_OF_WEEK order, each with its exercises.
  const previewDays = preview && previewShape
    ? DAYS_OF_WEEK.map((day) => ({
        day,
        exercises: preview.exercises
          .filter((e) => (e.week || 1) === previewShape.firstWeek && (e.scheduled_days || "0") === day.id)
          .map((e) => exerciseCatalog.find((ex) => ex.id === e.exercise_id))
          .filter((ex): ex is Exercise => !!ex),
      })).filter((d) => d.exercises.length > 0)
    : [];

  const handleAdd = async () => {
    if (!preview) return;
    setIsBusy(true);
    await onAddProgram(String(preview.id));
    setIsBusy(false);
  };

  const handleRemove = async () => {
    if (!preview || !confirm(`להסיר את "${preview.title}" מהתוכניות שלך?`)) return;
    setIsBusy(true);
    await onRemoveProgram(String(preview.id));
    setIsBusy(false);
  };

  const handleContactForPremium = () => {
    if (preview) contactForPremium(preview.title);
  };

  return (
    <div className="animate-in fade-in duration-500">
      <div className="mb-6">
        <h2 className="text-2xl md:text-3xl font-black text-fg tracking-tight mb-1.5 flex items-center gap-2">
          <Compass size={24} className="text-accent-fg" /> גלה אימונים ותוכניות
        </h2>
        <p className="text-muted text-[13px] md:text-sm">אימונים לביצוע מיידי ותוכניות מוכנות — הוסף לתוכנית שלך והם יופיעו במסך הבית.</p>
      </div>

      <ProgramCarousel<Workout> title="אימונים שאהבתי" icon={<Heart size={13} className="fill-accent text-accent-fg" />} list={likedWorkouts} render={renderWorkoutCard} />
      <ProgramCarousel<Workout> title="אימונים" icon={<Timer size={13} className="text-accent-fg" />} list={workouts} render={renderWorkoutCard} />

      <ProgramCarousel title="תוכניות שאהבתי" icon={<Heart size={13} className="fill-accent text-accent-fg" />} list={likedPrograms} render={renderCard} />
      <ProgramCarousel title="תוכניות חינמיות" icon={<Dumbbell size={13} className="text-accent-fg" />} list={freePrograms} render={renderCard} />
      <ProgramCarousel title="תוכניות פרימיום" icon={<Crown size={13} className="text-warm-fg" />} list={premiumPrograms} render={renderCard} />

      {freePrograms.length === 0 && premiumPrograms.length === 0 && workouts.length === 0 && (
        <div className="on-light bg-surface p-10 rounded-[2rem] shadow-card text-center flex flex-col items-center gap-2">
          <Flame size={26} className="text-muted" />
          <p className="text-muted text-sm">אין עדיין אימונים או תוכניות זמינים לעיון. חזור בקרוב!</p>
        </div>
      )}

      {preview && previewShape && (
        <Modal onClose={() => setPreview(null)} title="תצוגה מקדימה" icon={<Dumbbell size={20} className="text-accent-fg" />}>
          <h4 className="text-start font-black text-xl tracking-tight mb-1 text-fg">{preview.title}</h4>
          <p className="text-start text-muted text-xs font-bold mb-2">
            {previewShape.weeks > 1 ? `${previewShape.weeks} שבועות · ` : ""}
            {previewShape.days} ימי אימון בשבוע
            {!preview.is_free && " · פרימיום"}
          </p>
          {preview.description && <p className="text-start text-muted text-sm leading-relaxed mb-5">{preview.description}</p>}

          <div className="flex flex-col gap-4 mb-6">
            {previewDays.map(({ day, exercises }) => (
              <div key={day.id}>
                <div className="text-[11px] font-extrabold text-accent-fg mb-2">יום {day.label}</div>
                <div className="flex flex-col gap-2">
                  {exercises.map((ex, idx) => (
                    <div key={`${ex.id}-${idx}`} className="on-light flex items-center gap-3 bg-surface-alt rounded-2xl p-3">
                      <ExerciseThumb exercise={ex} alt={getExerciseName(ex, lang)} />
                      <span className="text-sm font-bold text-fg truncate">{getExerciseName(ex, lang)}</span>
                    </div>
                  ))}
                </div>
              </div>
            ))}
          </div>

          {previewAdded ? (
            <div className="flex flex-col gap-2">
              <div className="w-full bg-accent/15 text-accent-fg font-black text-sm py-3.5 rounded-2xl flex items-center justify-center gap-2">
                <Check size={16} /> התוכנית נמצאת בתוכניות שלך — מופיעה במסך הבית
              </div>
              {previewAdded.isSelfAdded && (
                <button
                  onClick={handleRemove}
                  disabled={isBusy}
                  className="w-full bg-transparent border-[1.5px] border-btn-secondary text-accent-fg hover:bg-btn-secondary-hover font-bold text-sm py-3 rounded-2xl transition-colors disabled:bg-disabled disabled:text-disabled-fg"
                >
                  הסר מהתוכניות שלי
                </button>
              )}
            </div>
          ) : preview.is_free ? (
            <button
              onClick={handleAdd}
              disabled={isBusy}
              className="w-full bg-btn-primary hover:bg-btn-primary-hover active:bg-btn-primary-active text-btn-primary-fg font-black text-sm py-3.5 rounded-2xl transition-colors flex items-center justify-center gap-2 disabled:bg-disabled disabled:text-disabled-fg disabled:hover:bg-disabled"
            >
              <Plus size={16} /> הוסף לתוכניות שלי
            </button>
          ) : (
            <button
              onClick={handleContactForPremium}
              className="w-full bg-warm hover:brightness-110 text-on-accent font-black text-sm py-3.5 rounded-2xl transition-colors flex items-center justify-center gap-2"
            >
              <Lock size={16} /> תוכנית פרימיום — לפתיחה צור קשר
            </button>
          )}
        </Modal>
      )}
      {workoutPreview && (
        <Modal onClose={() => setWorkoutPreview(null)} title="תצוגה מקדימה" icon={<Timer size={20} className="text-accent-fg" />}>
          <h4 className="text-start font-black text-xl tracking-tight mb-1 text-fg">{workoutPreview.title}</h4>
          <p className="text-start text-muted text-xs font-bold mb-2">
            {workoutPreview.format === "amrap"
              ? `AMRAP · ${Math.round((workoutPreview.time_cap_seconds ?? 0) / 60)} דקות — כמה שיותר סבבים`
              : `${workoutPreview.items.length} תרגילים`}
            {!workoutPreview.is_free && " · פרימיום"}
          </p>
          {workoutPreview.description && <p className="text-start text-muted text-sm leading-relaxed mb-5">{workoutPreview.description}</p>}

          <div className="flex flex-col gap-2 mb-6">
            {workoutPreview.items.map((item, idx) => {
              const ex = exerciseCatalog.find((e) => e.id === item.exercise_id);
              if (!ex) return null;
              return (
                <div key={`${item.exercise_id}-${idx}`} className="on-light flex items-center gap-3 bg-surface-alt rounded-2xl p-3">
                  <ExerciseThumb exercise={ex} alt={getExerciseName(ex, lang)} />
                  <div className="min-w-0 flex-1">
                    <div className="text-sm font-bold text-fg truncate">{getExerciseName(ex, lang)}</div>
                    <div className="text-[11px] font-bold text-accent-fg tabular-nums">{workoutItemLabel(workoutPreview, item)}</div>
                  </div>
                </div>
              );
            })}
          </div>

          {!workoutPreview.is_free ? (
            <button
              onClick={() => contactForPremium(workoutPreview.title)}
              className="w-full bg-warm hover:brightness-110 text-on-accent font-black text-sm py-3.5 rounded-2xl transition-colors flex items-center justify-center gap-2"
            >
              <Lock size={16} /> אימון פרימיום — לפתיחה צור קשר
            </button>
          ) : pickDayFor === String(workoutPreview.id) ? (
            <div className="flex flex-col gap-3">
              <div className="flex bg-surface-alt p-1 rounded-xl border border-line">
                {(["weekly", "date"] as const).map((mode) => (
                  <button
                    key={mode}
                    type="button"
                    onClick={() => setScheduleMode(mode)}
                    className={`flex-1 py-2 rounded-lg text-sm font-bold transition-colors ${scheduleMode === mode ? "bg-accent text-on-accent" : "text-muted hover:text-fg"}`}
                  >
                    {mode === "weekly" ? "כל שבוע" : "תאריך מסוים"}
                  </button>
                ))}
              </div>
              {scheduleMode === "date" ? (
                <div className="flex flex-col gap-3">
                  <label className="flex flex-col gap-1.5 text-start">
                    <span className="text-sm font-bold text-fg">באיזה תאריך? האימון יופיע בלוח השנה ובמסך הבית רק ביום הזה.</span>
                    <input
                      type="date"
                      min={todayKey}
                      value={pickedDate}
                      onChange={(e) => setPickedDate(e.target.value)}
                      className="on-light w-full bg-surface border border-line-input rounded-xl px-3 py-2.5 text-sm font-bold text-fg outline-none focus:border-focus focus:ring-2 focus:ring-focus"
                    />
                  </label>
                  <button
                    onClick={() => {
                      if (!pickedDate) return;
                      const [y, m, d] = pickedDate.split("-").map(Number);
                      handleAddWorkoutToDay(String(new Date(y, m - 1, d).getDay()), pickedDate);
                    }}
                    disabled={isBusy || !pickedDate || pickedDate < todayKey}
                    className="w-full bg-btn-primary hover:bg-btn-primary-hover active:bg-btn-primary-active text-btn-primary-fg font-black text-sm py-3 rounded-2xl transition-colors disabled:bg-disabled disabled:text-disabled-fg"
                  >
                    הוסף ללו&quot;ז
                  </button>
                </div>
              ) : (
              <>
              <p className="text-sm font-bold text-fg text-start">באילו ימים בשבוע? אפשר לבחור כמה. האימון יחזור בכל שבוע בימים שבחרת.</p>
              <div className="grid grid-cols-7 gap-1.5">
                {DAYS_OF_WEEK.map((day) => {
                  const isPicked = pickedDays.includes(day.id);
                  return (
                    <button
                      key={day.id}
                      type="button"
                      onClick={() => setPickedDays((prev) => (isPicked ? prev.filter((d) => d !== day.id) : [...prev, day.id]))}
                      aria-pressed={isPicked}
                      aria-label={`יום ${day.label}`}
                      className={`on-light py-3 rounded-xl border font-black text-sm transition-colors ${
                        isPicked ? "bg-accent text-on-accent border-accent" : "bg-surface-alt text-fg border-line hover:bg-line"
                      }`}
                    >
                      {day.he_short}
                    </button>
                  );
                })}
              </div>
              <button
                onClick={() => handleAddWorkoutToDay([...pickedDays].sort().join(","))}
                disabled={isBusy || pickedDays.length === 0}
                className="w-full bg-btn-primary hover:bg-btn-primary-hover active:bg-btn-primary-active text-btn-primary-fg font-black text-sm py-3 rounded-2xl transition-colors disabled:bg-disabled disabled:text-disabled-fg"
              >
                {pickedDays.length === 0 ? "בחר לפחות יום אחד" : `אישור (${pickedDays.length} ${pickedDays.length === 1 ? "יום" : "ימים"})`}
              </button>
              </>
              )}
              <button onClick={() => setPickDayFor(null)} className="text-sm font-bold text-muted hover:text-fg">
                ביטול
              </button>
            </div>
          ) : (
            <div className="flex flex-col gap-2">
              <button
                onClick={() => {
                  onStartWorkout(workoutPreview);
                  setWorkoutPreview(null);
                }}
                className="w-full bg-btn-primary hover:bg-btn-primary-hover active:bg-btn-primary-active text-btn-primary-fg font-black text-sm py-3.5 rounded-2xl transition-colors flex items-center justify-center gap-2"
              >
                <Play size={16} /> התחל עכשיו
              </button>
              <button
                onClick={() => {
                  setScheduleMode("weekly");
                  setPickedDate(todayKey);
                  setPickedDays([]);
                  setPickDayFor(String(workoutPreview.id));
                }}
                className="w-full bg-transparent border-[1.5px] border-btn-secondary text-accent-fg hover:bg-btn-secondary-hover font-bold text-sm py-3 rounded-2xl transition-colors flex items-center justify-center gap-2"
              >
                <CalendarPlus size={16} /> הוסף ללו&quot;ז שלי
              </button>
            </div>
          )}
        </Modal>
      )}
    </div>
  );
}
