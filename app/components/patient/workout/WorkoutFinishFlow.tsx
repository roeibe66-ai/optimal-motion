"use client";

import { Activity, Flame, Trophy } from "lucide-react";
import { useAuth } from "@/app/context/AuthContext";
import RatingScale from "@/app/components/ui/RatingScale";
import { getPainColor, getRPEColor } from "@/app/utils/scoring";
import type { FeedbackPhase } from "@/app/hooks/useWorkoutSession";

interface WorkoutFinishFlowProps {
  feedbackPhase: FeedbackPhase; // "rpe" | "pain_after" | "done" while this flow is showing
  onSelectRpe: (num: number) => void;
  onSubmitPainAfter: (num: number) => void;
  onClose: () => void;
}

// Post-workout feedback: RPE -> (clinical only) pain-after -> done.
export default function WorkoutFinishFlow({ feedbackPhase, onSelectRpe, onSubmitPainAfter, onClose }: WorkoutFinishFlowProps) {
  const { lang } = useAuth();
  const dir = lang === "he" ? "rtl" : "ltr";

  if (feedbackPhase === "rpe") {
    return (
      <div
        className="fixed inset-0 z-[100] bg-stone-900 flex flex-col items-center justify-center p-6 text-center animate-in zoom-in duration-500"
        dir={dir}
      >
        <Flame size={60} className="text-amber-400 mb-6" />
        <h2 className="text-3xl md:text-5xl font-black text-white mb-4">כל הכבוד! סיימת.</h2>
        <p className="text-lg md:text-xl text-stone-400 mb-12 max-w-lg mx-auto">
          <strong className="text-white">עד כמה קשה היה לך האימון (RPE)?</strong>
        </p>
        <RatingScale values={[1, 2, 3, 4, 5, 6, 7, 8, 9, 10]} getColor={getRPEColor} onSelect={onSelectRpe} />
      </div>
    );
  }

  if (feedbackPhase === "pain_after") {
    return (
      <div
        className="fixed inset-0 z-[100] bg-stone-900 flex flex-col items-center justify-center p-6 text-center animate-in slide-in-from-right duration-300"
        dir={dir}
      >
        <Activity size={60} className="text-teal-400 mb-6" />
        <h2 className="text-3xl md:text-5xl font-black text-white mb-4">שאלה אחרונה</h2>
        <p className="text-lg md:text-xl text-stone-400 mb-12 max-w-lg mx-auto">
          <strong className="text-white">מה רמת הכאב שלך עכשיו (אחרי האימון)?</strong>
        </p>
        <RatingScale values={[0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10]} getColor={getPainColor} onSelect={onSubmitPainAfter} />
      </div>
    );
  }

  // feedbackPhase === "done"
  return (
    <div
      className="fixed inset-0 z-[100] bg-stone-950 flex flex-col items-center justify-center p-6 text-center animate-in zoom-in duration-500"
      dir={dir}
    >
      <Trophy size={80} className="text-yellow-400 mb-8 animate-bounce" />
      <h2 className="text-4xl md:text-5xl font-black text-white mb-4">הפידבק נשלח!</h2>
      <p className="text-xl text-stone-400 mb-10">הנתונים התעדכנו בתיק שלך.</p>
      <button onClick={onClose} className="bg-teal-500 text-stone-900 px-10 py-4 rounded-full font-bold text-lg hover:bg-teal-400 transition">
        חזרה למסך הראשי
      </button>
    </div>
  );
}
