"use client";

import { ClipboardList, Info, TrendingUp } from "lucide-react";
import {
  CartesianGrid,
  Line,
  LineChart,
  ResponsiveContainer,
  Tooltip as RechartsTooltip,
  XAxis,
  YAxis,
} from "recharts";
import { useAuth } from "@/app/context/AuthContext";
import type { Exercise } from "@/app/types";
import Modal from "@/app/components/ui/Modal";
import ExerciseMuscleMap from "@/app/components/patient/ExerciseMuscleMap";
import AnatomyHeatmap from "@/app/components/AnatomyHeatmap";
import { formatCueLines, getExerciseName } from "@/app/utils/format";

interface ExerciseHistoryPoint {
  date: string;
  reps: number;
  rir: number | null; // null if this log predates RIR capture — leaves a gap on the RIR line rather than plotting 0
}

interface ExerciseInfoModalProps {
  exercise: Exercise;
  historyData: ExerciseHistoryPoint[];
  onClose: () => void;
}

// The "InfoModal" from the original file — exercise mistakes/description plus
// a per-exercise max-reps history chart. `historyData` is computed by the
// caller (it needs workout_logs + patient_type, which live outside this
// component's scope) and passed in already shaped for the chart.
export default function ExerciseInfoModal({ exercise, historyData, onClose }: ExerciseInfoModalProps) {
  const { lang } = useAuth();

  // Cue lines first, mistake lines immediately after — one merged list, one
  // card ("הנחiות"/Instructions), rather than the two separately-colored
  // cards this used to be. The ✅/❌ prefix on each line (from formatCueLines)
  // is what signals positive vs. negative now, not card color.
  const instructionLines = [...formatCueLines(exercise.patient_cues, "✅"), ...formatCueLines(exercise.common_mistake, "❌")];
  const hasDescription = !!exercise.description && exercise.description.trim() !== "" && exercise.description.trim() !== ".";
  const hasHistory = historyData.length > 0;

  // prime_movers/synergists (the new heatmap tagging) take priority when an
  // exercise has been tagged with them; exercises only tagged the old way
  // (target_muscle/secondary_muscles) still fall back to ExerciseMuscleMap's
  // AnatomyDiagram rather than rendering an empty heatmap.
  const primeMovers = exercise.prime_movers ?? [];
  const synergists = exercise.synergists ?? [];
  const hasHeatmapData = primeMovers.length > 0 || synergists.length > 0;

  return (
    <Modal onClose={onClose} title="מידע לתרגיל" icon={<Info size={20} className="text-teal-500" />}>
      <h4 className="font-black text-xl tracking-tight mb-4">{getExerciseName(exercise, lang)}</h4>

      {hasHeatmapData ? (
        <div className="mb-5 max-w-xs mx-auto">
          <AnatomyHeatmap primeMovers={primeMovers} synergists={synergists} />
        </div>
      ) : (
        <div className="mb-5">
          <ExerciseMuscleMap exercise={exercise} />
        </div>
      )}

      {hasDescription && <p className="text-stone-300 leading-relaxed text-[15px] font-medium mb-6">{exercise.description}</p>}

      {instructionLines.length > 0 && (
        <div className="rounded-2xl border border-stone-800 bg-gradient-to-b from-white/[0.03] to-transparent mb-6 overflow-hidden">
          <div className="flex items-center gap-2 px-5 pt-4 pb-3 border-b border-stone-800/80">
            <ClipboardList size={15} className="text-emerald-500" />
            <h4 className="font-bold text-[13px] tracking-wide text-stone-200">הנחיות</h4>
          </div>
          <div className="px-5 py-4 space-y-2.5">
            {instructionLines.map((line, i) => (
              <p key={i} className="text-stone-300 text-sm font-medium leading-relaxed">
                {line}
              </p>
            ))}
          </div>
        </div>
      )}

      {hasHistory && (
        <div className="mt-2 pt-6 border-t border-stone-800">
          <h4 className="font-bold text-sm mb-4 flex items-center gap-2">
            <TrendingUp size={16} className="text-teal-500" /> היסטוריית ביצועים (מקסימום לאימון)
          </h4>
          <div className="h-48 w-full" dir="ltr">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={historyData}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#333" />
                <XAxis dataKey="date" tick={{ fontSize: 10, fill: "#888" }} />
                <YAxis yAxisId="left" tick={{ fontSize: 10, fill: "#888" }} width={30} />
                <YAxis yAxisId="right" orientation="right" tick={{ fontSize: 10, fill: "#888" }} width={24} allowDecimals={false} />
                <RechartsTooltip contentStyle={{ backgroundColor: "#1c1c1e", borderColor: "#333", color: "#fff" }} />
                <Line yAxisId="left" type="monotone" dataKey="reps" name="חזרות" stroke="#14b8a6" strokeWidth={3} dot={{ r: 4 }} />
                <Line yAxisId="right" type="monotone" dataKey="rir" name="RIR" stroke="#f59e0b" strokeWidth={2} dot={{ r: 3 }} connectNulls={false} />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </div>
      )}

      {instructionLines.length === 0 && !hasDescription && !hasHistory && (
        <div className="text-center text-stone-500 font-medium p-4">אין דגשים או היסטוריה לתרגיל זה.</div>
      )}
    </Modal>
  );
}
