"use client";

import { AlertTriangle, CheckCircle, Info, TrendingUp, Target } from "lucide-react";
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
import { AVAILABLE_MUSCLES } from "@/app/constants/catalog";
import type { Exercise } from "@/app/types";
import Modal from "@/app/components/ui/Modal";

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
  const { t } = useAuth();

  const hasMistake = !!exercise.common_mistake;
  const hasDescription = !!exercise.description && exercise.description.trim() !== "" && exercise.description.trim() !== ".";
  const hasHistory = historyData.length > 0;
  const muscleLabel = exercise.target_muscle
    ? AVAILABLE_MUSCLES.find((m) => m.id === exercise.target_muscle)?.label ?? exercise.target_muscle
    : null;

  return (
    <Modal onClose={onClose} title="מידע לתרגיל" icon={<Info size={20} className="text-teal-500" />}>
      <div className="flex items-center justify-between gap-3 mb-4">
        <h4 className="font-black text-lg">{exercise.title}</h4>
        {muscleLabel && (
          <span className="shrink-0 flex items-center gap-1.5 bg-teal-500/10 text-teal-400 border border-teal-500/25 text-[11px] font-extrabold px-3 py-1.5 rounded-full">
            <Target size={12} /> {muscleLabel}
          </span>
        )}
      </div>

      {hasMistake && (
        <div className="p-4 rounded-2xl border mb-4 bg-red-900/20 border-red-900/50">
          <h4 className="font-bold text-red-500 mb-1 text-xs flex items-center gap-1.5">
            <AlertTriangle size={14} /> {t.warning}
          </h4>
          <p className="text-red-200 font-medium text-sm leading-relaxed">{exercise.common_mistake}</p>
        </div>
      )}

      {hasDescription && (
        <div className="mb-4">
          <h4 className="font-bold text-teal-500 text-xs tracking-widest mb-1.5 flex items-center gap-1.5">
            <CheckCircle size={14} /> {t.correct_execution}
          </h4>
          <p className="bg-stone-900 border-stone-800 text-stone-300 leading-relaxed text-sm font-medium p-4 rounded-xl border">
            {exercise.description}
          </p>
        </div>
      )}

      {hasHistory && (
        <div className="mt-6 pt-6 border-t border-stone-800">
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

      {!hasMistake && !hasDescription && !hasHistory && (
        <div className="text-center text-stone-500 font-medium p-4">אין דגשים או היסטוריה לתרגיל זה.</div>
      )}
    </Modal>
  );
}
