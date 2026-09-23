"use client";

import { useState, type ReactNode } from "react";
import { Compass, Dumbbell, Flame, Heart, Sparkles } from "lucide-react";
import Modal from "@/app/components/ui/Modal";
import { DEFAULT_DIY_CATEGORY_STYLE, DIY_CATEGORY_STYLES } from "@/app/constants/catalog";
import { getExerciseName } from "@/app/utils/format";
import { useAuth } from "@/app/context/AuthContext";
import type { Exercise, Workout } from "@/app/types";

interface ExploreTabProps {
  freeWorkouts: Workout[];
  newReleases: Workout[];
  likedWorkouts: Workout[];
  likedWorkoutIds: Set<string>;
  onToggleLike: (workoutId: string) => void;
  exerciseCatalog: Exercise[];
  onStartWorkout: (workout: Workout) => void;
}

function WorkoutCard({
  workout,
  isLiked,
  onToggleLike,
  onOpen,
}: {
  workout: Workout;
  isLiked: boolean;
  onToggleLike: () => void;
  onOpen: () => void;
}) {
  const style = (workout.category && DIY_CATEGORY_STYLES[workout.category]) || DEFAULT_DIY_CATEGORY_STYLE;

  return (
    <button
      onClick={onOpen}
      className="min-w-[180px] w-[180px] shrink-0 rounded-3xl overflow-hidden bg-white text-start shadow-[0_8px_30px_rgb(0,0,0,0.06)] border border-stone-100 hover:-translate-y-0.5 hover:shadow-[0_16px_32px_-8px_rgba(0,0,0,0.12)] active:scale-[0.97] transition-all duration-200 ease-out"
    >
      <div className="h-[110px] relative">
        {workout.cover_image_url ? (
          <img src={workout.cover_image_url} alt="" className="absolute inset-0 w-full h-full object-cover" />
        ) : (
          <div className="absolute inset-0" style={{ background: `radial-gradient(circle at 70% 20%, ${style.bg}, ${style.border} 120%)` }} />
        )}

        <div
          onClick={(e) => {
            e.stopPropagation();
            onToggleLike();
          }}
          role="button"
          aria-label={isLiked ? "הסר לייק" : "אהבתי"}
          className="absolute top-2.5 left-2.5 w-8 h-8 rounded-full bg-white/85 backdrop-blur-md flex items-center justify-center shadow-sm active:scale-90 transition-transform"
        >
          <Heart size={15} className={isLiked ? "fill-red-500 text-red-500" : "text-stone-500"} />
        </div>

        {!workout.is_free && (
          <span className="absolute top-2.5 right-2.5 bg-amber-500 text-stone-950 text-[9px] font-black px-2 py-1 rounded-full uppercase tracking-wide">
            פרימיום
          </span>
        )}
      </div>

      <div className="p-3.5 flex flex-col gap-1.5">
        <h4 className="font-extrabold text-[13px] text-brand-espresso truncate">{workout.title}</h4>
        <div className="flex items-center gap-1.5">
          {workout.category && (
            <span className="text-[10px] font-extrabold px-2 py-0.5 rounded-full whitespace-nowrap" style={{ background: style.bg, color: style.text }}>
              {workout.category}
            </span>
          )}
          <span className="text-[10px] font-bold text-stone-400">{workout.exercise_ids.length} תרגילים</span>
        </div>
      </div>
    </button>
  );
}

function WorkoutCarousel({
  title,
  icon,
  workoutsList,
  likedWorkoutIds,
  onToggleLike,
  onOpen,
}: {
  title: string;
  icon: ReactNode;
  workoutsList: Workout[];
  likedWorkoutIds: Set<string>;
  onToggleLike: (id: string) => void;
  onOpen: (workout: Workout) => void;
}) {
  if (workoutsList.length === 0) return null;
  return (
    <div className="mb-8">
      <div className="flex items-center gap-2 mb-3.5">
        {icon}
        <h3 className="text-[13px] font-extrabold tracking-widest text-stone-500 uppercase">{title}</h3>
      </div>
      <div className="flex gap-3.5 overflow-x-auto no-scrollbar pb-1">
        {workoutsList.map((w) => (
          <WorkoutCard key={w.id} workout={w} isLiked={likedWorkoutIds.has(w.id)} onToggleLike={() => onToggleLike(w.id)} onOpen={() => onOpen(w)} />
        ))}
      </div>
    </div>
  );
}

// Bottom-nav "Explore" tab: horizontal carousels of admin-curated public
// workouts (workouts/workout_likes — see the 20260923100000 migration),
// with a like/heart toggle per card and a lightweight read-only preview
// (reusing Modal's bottom-sheet chrome) that can hand a workout straight to
// the DIY session-launch flow already used by saved programs.
export default function ExploreTab({ freeWorkouts, newReleases, likedWorkouts, likedWorkoutIds, onToggleLike, exerciseCatalog, onStartWorkout }: ExploreTabProps) {
  const { lang } = useAuth();
  const [previewWorkout, setPreviewWorkout] = useState<Workout | null>(null);

  const previewExercises = previewWorkout
    ? previewWorkout.exercise_ids.map((id) => exerciseCatalog.find((ex) => ex.id === id)).filter((ex): ex is Exercise => !!ex)
    : [];

  return (
    <div className="animate-in fade-in duration-500">
      <div className="mb-6">
        <h2 className="text-2xl md:text-3xl font-black text-brand-espresso tracking-tight mb-1.5 flex items-center gap-2">
          <Compass size={24} className="text-brand-terracotta" /> גלה אימונים
        </h2>
        <p className="text-stone-500 text-[13px] md:text-sm">עיין באימונים מוכנים מהמאגר, שמור מה שאהבת והתחל מיד.</p>
      </div>

      <WorkoutCarousel
        title="אימונים שאהבתי"
        icon={<Heart size={13} className="fill-red-500 text-red-500" />}
        workoutsList={likedWorkouts}
        likedWorkoutIds={likedWorkoutIds}
        onToggleLike={onToggleLike}
        onOpen={setPreviewWorkout}
      />

      <WorkoutCarousel
        title="אימונים חינמיים"
        icon={<Dumbbell size={13} className="text-brand-terracotta" />}
        workoutsList={freeWorkouts}
        likedWorkoutIds={likedWorkoutIds}
        onToggleLike={onToggleLike}
        onOpen={setPreviewWorkout}
      />

      <WorkoutCarousel
        title="חדש באתר"
        icon={<Sparkles size={13} className="text-amber-500" />}
        workoutsList={newReleases}
        likedWorkoutIds={likedWorkoutIds}
        onToggleLike={onToggleLike}
        onOpen={setPreviewWorkout}
      />

      {freeWorkouts.length === 0 && newReleases.length === 0 && (
        <div className="bg-white p-10 rounded-[2rem] shadow-[0_8px_30px_rgb(0,0,0,0.04)] text-center flex flex-col items-center gap-2">
          <Flame size={26} className="text-stone-300" />
          <p className="text-stone-500 text-sm">אין עדיין אימונים זמינים לעיון. חזור בקרוב!</p>
        </div>
      )}

      {previewWorkout && (
        <Modal onClose={() => setPreviewWorkout(null)} title="תצוגה מקדימה" icon={<Dumbbell size={20} className="text-brand-terracotta" />}>
          <h4 className="text-start font-black text-xl tracking-tight mb-1 text-brand-espresso">{previewWorkout.title}</h4>
          {previewWorkout.category && <p className="text-start text-stone-500 text-xs font-bold mb-5">{previewWorkout.category}</p>}

          <div className="flex flex-col gap-2 mb-6">
            {previewExercises.map((ex) => (
              <div key={ex.id} className="flex items-center gap-3 bg-stone-50 rounded-2xl p-3">
                {ex.gif_url ? (
                  <img src={ex.gif_url} alt={getExerciseName(ex, lang)} className="w-11 h-11 rounded-xl bg-white object-contain p-0.5 shrink-0" />
                ) : (
                  <div className="w-11 h-11 rounded-xl bg-stone-100 shrink-0" />
                )}
                <span className="text-sm font-bold text-stone-700 truncate">{getExerciseName(ex, lang)}</span>
              </div>
            ))}
          </div>

          <button
            onClick={() => {
              onStartWorkout(previewWorkout);
              setPreviewWorkout(null);
            }}
            className="w-full bg-brand-terracotta hover:brightness-90 text-white font-black text-sm py-3.5 rounded-2xl transition-colors"
          >
            התחל אימון זה
          </button>
        </Modal>
      )}
    </div>
  );
}
