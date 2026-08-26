"use client";

import { Activity } from "lucide-react";
import { useAuth } from "@/app/context/AuthContext";
import BodyDiagram from "@/app/components/BodyDiagram";
import RatingScale from "@/app/components/ui/RatingScale";
import { getPainColor } from "@/app/utils/scoring";
import type { HapticType } from "@/app/hooks/useHaptics";
import type { FeedbackPhase } from "@/app/hooks/useWorkoutSession";

interface PreWorkoutFlowProps {
  feedbackPhase: FeedbackPhase; // "pain_heatmap" | "pain_scale" while this flow is showing
  selectedPainAreas: string[];
  setSelectedPainAreas: (updater: (prev: string[]) => string[]) => void;
  onConfirmPainAreas: () => void;
  onConfirmPreWorkout: (pain: number) => void;
  triggerHaptic: (type: HapticType) => void;
}

// The clinical-patient pain check-in shown before a workout starts: pick
// painful areas on the body diagram, then rate overall pain 0-10.
export default function PreWorkoutFlow({
  feedbackPhase,
  selectedPainAreas,
  setSelectedPainAreas,
  onConfirmPainAreas,
  onConfirmPreWorkout,
  triggerHaptic,
}: PreWorkoutFlowProps) {
  const { lang } = useAuth();
  const dir = lang === "he" ? "rtl" : "ltr";

  const toggleMuscle = (muscle: string) => {
    triggerHaptic("light");
    setSelectedPainAreas((prev) => (prev.includes(muscle) ? prev.filter((m) => m !== muscle) : [...prev, muscle]));
  };

  if (feedbackPhase === "pain_heatmap") {
    return (
      <div
        className="fixed inset-0 z-[100] bg-stone-950 flex flex-col items-center justify-start pt-12 p-6 text-center animate-in zoom-in duration-500 overflow-y-auto"
        dir={dir}
      >
        <Activity size={40} className="text-teal-400 mb-4" />
        <h2 className="text-3xl md:text-4xl font-black text-white mb-2 tracking-tight">איפה כואב לך היום?</h2>
        <p className="text-stone-400 mb-8 max-w-sm mx-auto text-sm">סמן על גבי המודל את האזורים שמרגישים מתוחים או כואבים כרגע.</p>

        <div className="bg-[#1c1c1e] p-6 rounded-3xl w-full max-w-sm mb-8 flex justify-center border border-stone-800">
          <div className="pointer-events-auto" style={{ width: "150px" }}>
            <BodyDiagram highlightedMuscles={selectedPainAreas} onMuscleClick={toggleMuscle} />
          </div>
        </div>

        <button
          onClick={onConfirmPainAreas}
          className="bg-teal-500 text-stone-900 px-10 py-4 rounded-full font-bold text-lg hover:bg-teal-400 transition-colors shadow-lg w-full max-w-sm"
        >
          המשך
        </button>
      </div>
    );
  }

  // feedbackPhase === "pain_scale"
  return (
    <div
      className="fixed inset-0 z-[100] bg-stone-950 flex flex-col items-center justify-center p-6 text-center animate-in slide-in-from-right duration-300"
      dir={dir}
    >
      <Activity size={60} className="text-blue-400 mb-6" />
      <h2 className="text-3xl md:text-5xl font-black text-white mb-4 tracking-tight">ועד כמה זה כואב?</h2>
      <p className="text-lg md:text-xl text-stone-400 mb-12 max-w-lg mx-auto">מ-0 (ללא כאב) עד 10 (כאב בלתי נסבל).</p>
      <RatingScale values={[0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10]} getColor={getPainColor} onSelect={onConfirmPreWorkout} />
    </div>
  );
}
