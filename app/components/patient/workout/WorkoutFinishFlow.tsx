"use client";

import { useState } from "react";
import { Activity } from "lucide-react";
import { useAuth } from "@/app/context/AuthContext";
import RatingScale from "@/app/components/ui/RatingScale";
import EccoRpeScale from "@/app/components/ui/EccoRpeScale";
import { FEEDBACK_DONE_IMAGES } from "@/app/constants/ecco";
import { getPainColor } from "@/app/utils/scoring";
import type { FeedbackPhase } from "@/app/hooks/useWorkoutSession";

interface WorkoutFinishFlowProps {
  feedbackPhase: FeedbackPhase; // "rpe" | "pain_after" | "done" while this flow is showing
  onSelectRpe: (num: number) => void;
  onSubmitPainAfter: (num: number) => void;
  onClose: () => void;
}

// Post-workout feedback: RPE -> (clinical only) pain-after -> done. Each
// question step's content slides in from the "forward" side
// (animate-step-in, globals.css) over an opaque page that never moves, so the
// dashboard underneath can't flash through between steps. The keys force a
// fresh mount per step — otherwise React reuses the wrapper and the
// animation wouldn't replay.
export default function WorkoutFinishFlow({ feedbackPhase, onSelectRpe, onSubmitPainAfter, onClose }: WorkoutFinishFlowProps) {
  const { lang } = useAuth();
  const dir = lang === "he" ? "rtl" : "ltr";
  // Picked once per finish flow, so it doesn't flip on re-render.
  const [doneImage] = useState(() => FEEDBACK_DONE_IMAGES[Math.floor(Math.random() * FEEDBACK_DONE_IMAGES.length)]);

  if (feedbackPhase === "rpe") {
    return (
      <div
        className="fixed inset-0 z-[100] bg-page flex flex-col items-center justify-center p-6 text-center"
        dir={dir}
      >
        <div key="rpe" className="animate-step-in w-full flex flex-col items-center">
          <h2 className="text-3xl md:text-5xl font-black text-fg mb-2">כל הכבוד! סיימת.</h2>
          <p className="text-lg md:text-xl text-muted mb-6 max-w-lg mx-auto">
            <strong className="text-fg">איך הרגיש האימון?</strong>
          </p>
          <EccoRpeScale onSelect={onSelectRpe} />
        </div>
      </div>
    );
  }

  if (feedbackPhase === "pain_after") {
    return (
      <div
        className="fixed inset-0 z-[100] bg-page flex flex-col items-center justify-center p-6 text-center"
        dir={dir}
      >
        <div key="pain_after" className="animate-step-in w-full flex flex-col items-center">
          <Activity size={60} className="text-accent-fg mb-6" />
          <h2 className="text-3xl md:text-5xl font-black text-fg mb-4">שאלה אחרונה</h2>
          <p className="text-lg md:text-xl text-muted mb-12 max-w-lg mx-auto">
            <strong className="text-fg">מה רמת הכאב שלך עכשיו (אחרי האימון)?</strong>
          </p>
          <RatingScale values={[0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10]} getColor={getPainColor} onSelect={onSubmitPainAfter} />
        </div>
      </div>
    );
  }

  // feedbackPhase === "done" — the once-per-workout celebration: the trophy
  // pops in once (overshoot, no endless bounce), then the text and button
  // rise in 60ms apart. The button is clickable from the first frame.
  return (
    <div
      className="fixed inset-0 z-[100] bg-page flex flex-col items-center justify-center p-6 text-center"
      dir={dir}
    >
      <img src={doneImage} alt="" className="w-56 h-56 rounded-[2rem] object-cover shadow-card mb-8 animate-celebrate-pop" />
      <h2 className="text-4xl md:text-5xl font-black text-fg mb-4 animate-celebrate-rise" style={{ animationDelay: "100ms" }}>
        הפידבק נשלח!
      </h2>
      <p className="text-xl text-muted mb-10 animate-celebrate-rise" style={{ animationDelay: "160ms" }}>
        הנתונים התעדכנו בתיק שלך.
      </p>
      <button onClick={onClose} style={{ animationDelay: "220ms" }} className="animate-celebrate-rise bg-btn-primary text-btn-primary-fg px-10 py-4 rounded-full font-bold text-lg hover:bg-btn-primary-hover active:bg-btn-primary-active transition">
        חזרה למסך הראשי
      </button>
    </div>
  );
}
