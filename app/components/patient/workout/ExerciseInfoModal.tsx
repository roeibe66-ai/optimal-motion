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
import { formatCueLines, getExerciseName, type CueLine } from "@/app/utils/format";

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
//
// The ✅/❌ marker is laid out as a fixed-width bullet (its own flex child,
// not prepended into the text) so a line that wraps to a second line stays
// aligned under the text above it rather than under the emoji. A cue/mistake
// line reads like a manual entry when it has a "lead: detail" shape — e.g.
// "Keep your body vertical: this puts more weight on your hands." Bolding
// everything up to and including the colon gives the list the scannable,
// premium-manual feel; a line with no colon just renders as one plain
// sentence, nothing forced bold.
function InstructionLine({ line }: { line: CueLine }) {
  const colonIdx = line.text.indexOf(":");
  const lead = colonIdx === -1 ? null : line.text.slice(0, colonIdx + 1);
  const rest = colonIdx === -1 ? line.text : line.text.slice(colonIdx + 1);
  return (
    <div className="flex items-start gap-3 mb-5 last:mb-0">
      <span className="text-xl shrink-0 mt-0.5">{line.emoji}</span>
      <p className="flex-1 text-base leading-relaxed text-start">
        {lead && <span className="font-bold text-stone-900">{lead}</span>}
        <span className="text-stone-600">{rest}</span>
      </p>
    </div>
  );
}

export default function ExerciseInfoModal({ exercise, historyData, onClose }: ExerciseInfoModalProps) {
  const { lang } = useAuth();

  // Cue lines first, mistake lines immediately after — one merged list, one
  // section ("הנחiות"/Instructions), rather than the two separately-colored
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

  // Content order is deliberately Title -> Description -> Instructions ->
  // History -> Heatmap: the heatmap is supplementary visual info the reader
  // gets to after the actual instructions, not the first thing they see, so
  // it sits at the very bottom of the scroll rather than up top. Each
  // section only draws the divider below it when something else still
  // follows, so whichever section ends up last (heatmap, history, or
  // instructions, depending on what this exercise actually has) never ends
  // in a trailing line.
  const hasMoreAfterDescription = instructionLines.length > 0 || hasHistory || hasHeatmapData;
  const hasMoreAfterInstructions = hasHistory || hasHeatmapData;
  const hasMoreAfterHistory = hasHeatmapData;

  return (
    <Modal onClose={onClose} title="מידע לתרגיל" icon={<Info size={20} className="text-emerald-700" />}>
      <h4 className="font-black text-xl tracking-tight mb-4 text-stone-900">{getExerciseName(exercise, lang)}</h4>

      {hasDescription && (
        <p className={`text-start text-stone-600 leading-relaxed text-lg font-medium pb-6 ${hasMoreAfterDescription ? "mb-6 border-b border-stone-100" : ""}`}>
          {exercise.description}
        </p>
      )}

      {instructionLines.length > 0 && (
        <div className={hasMoreAfterInstructions ? "pb-2 mb-6 border-b border-stone-100" : ""}>
          <div className="flex items-center gap-2 mb-4">
            <ClipboardList size={15} className="text-emerald-700" />
            <h4 className="font-bold text-[13px] tracking-wide text-stone-500 uppercase">הנחיות</h4>
          </div>
          <div>
            {instructionLines.map((line, i) => (
              <InstructionLine key={i} line={line} />
            ))}
          </div>
        </div>
      )}

      {hasHistory && (
        <div className={hasMoreAfterHistory ? "pb-6 mb-6 border-b border-stone-100" : ""}>
          <h4 className="font-bold text-sm mb-4 flex items-center gap-2 text-stone-900">
            <TrendingUp size={16} className="text-emerald-700" /> היסטוריית ביצועים (מקסימום לאימון)
          </h4>
          <div className="h-48 w-full" dir="ltr">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={historyData}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e7e5e4" />
                <XAxis dataKey="date" tick={{ fontSize: 10, fill: "#78716c" }} />
                <YAxis yAxisId="left" tick={{ fontSize: 10, fill: "#78716c" }} width={30} />
                <YAxis yAxisId="right" orientation="right" tick={{ fontSize: 10, fill: "#78716c" }} width={24} allowDecimals={false} />
                <RechartsTooltip contentStyle={{ backgroundColor: "#fff", borderColor: "#e7e5e4", color: "#1c1917" }} />
                <Line yAxisId="left" type="monotone" dataKey="reps" name="חזרות" stroke="#047857" strokeWidth={3} dot={{ r: 4 }} />
                <Line yAxisId="right" type="monotone" dataKey="rir" name="RIR" stroke="#f59e0b" strokeWidth={2} dot={{ r: 3 }} connectNulls={false} />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </div>
      )}

      {hasHeatmapData ? (
        <div className="w-full max-w-lg mx-auto">
          <AnatomyHeatmap primeMovers={primeMovers} synergists={synergists} />
        </div>
      ) : (
        <ExerciseMuscleMap exercise={exercise} />
      )}

      {instructionLines.length === 0 && !hasDescription && !hasHistory && !hasHeatmapData && (
        <div className="text-center text-stone-500 font-medium p-4">אין דגשים או היסטוריה לתרגיל זה.</div>
      )}
    </Modal>
  );
}
