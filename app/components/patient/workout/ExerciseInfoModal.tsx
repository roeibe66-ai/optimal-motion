"use client";

import { useState, type ReactNode } from "react";
import { ClipboardList, Dumbbell, History, Info, Loader2, TrendingUp } from "lucide-react";
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
import { EQUIPMENT_LIST } from "@/app/constants/catalog";
import { useExerciseHistory } from "@/app/hooks/useExerciseHistory";

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

const TABS = [
  { id: "about", label: "אודות" },
  { id: "history", label: "היסטוריה" },
  { id: "charts", label: "גרפים" },
] as const;
type TabId = (typeof TABS)[number]["id"];

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
        {lead && <span className="font-bold text-brand-espresso">{lead}</span>}
        <span className="text-stone-600">{rest}</span>
      </p>
    </div>
  );
}

// A placeholder tab body — same shape used for both "History" (a future list
// of past sets/reps) and "Charts" without real data yet — nothing to build a
// real empty-state component around until either has real content.
function PlaceholderTabBody({ icon, text }: { icon: ReactNode; text: string }) {
  return (
    <div className="flex flex-col items-center text-center gap-3 py-14 text-stone-400">
      {icon}
      <p className="text-sm font-bold text-stone-500 max-w-[220px]">{text}</p>
    </div>
  );
}

// The "InfoModal" from the original file — exercise mistakes/description plus
// a per-exercise max-reps history chart. `historyData` is computed by the
// caller (it needs workout_logs + patient_type, which live outside this
// component's scope) and passed in already shaped for the chart.
export default function ExerciseInfoModal({ exercise, historyData, onClose }: ExerciseInfoModalProps) {
  const { lang } = useAuth();
  const [activeTab, setActiveTab] = useState<TabId>("about");
  const { sessions: pastSessions, isLoading: isHistoryLoading } = useExerciseHistory(exercise.id);

  // Cue lines first, mistake lines immediately after — one merged list, one
  // section ("הנחיות"/Instructions), rather than the two separately-colored
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

  // Description -> Instructions -> Heatmap within "About". The heatmap has
  // no header/colored panel of its own any more, so it only needs a divider
  // above it when the section right before it is Description with no
  // Instructions in between — Instructions already ends in its own rhythm.
  const hasMoreAfterDescription = instructionLines.length > 0;
  const hasAboutContent = hasDescription || instructionLines.length > 0 || hasHeatmapData;

  return (
    <Modal onClose={onClose} title="מידע לתרגיל" icon={<Info size={20} className="text-brand-terracotta" />}>
      <h4 className="text-start font-black text-xl tracking-tight mb-4 text-brand-espresso">{getExerciseName(exercise, lang)}</h4>

      {exercise.equipment && exercise.equipment.length > 0 && (
        <div className="flex flex-wrap gap-2 mb-5">
          {exercise.equipment.map((eqId) => (
            <span key={eqId} className="inline-flex items-center gap-1.5 bg-stone-50 border border-stone-100 text-stone-600 text-xs font-bold px-3 py-1.5 rounded-full">
              <Dumbbell size={12} className="text-brand-terracotta" />
              {EQUIPMENT_LIST.find((e) => e.id === eqId)?.label || eqId}
            </span>
          ))}
        </div>
      )}

      {/* Sticky under the modal's own fixed header so switching tabs never
          requires scrolling back up first — bleeds to the sheet's edges
          (-mx-6) so its white backing fully covers content scrolling under it. */}
      <div className="sticky top-0 z-10 -mx-6 px-6 bg-white flex gap-5 border-b border-stone-100 mb-6">
        {TABS.map((tab) => {
          const isActive = activeTab === tab.id;
          return (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`relative py-3 text-sm font-bold transition-colors ${isActive ? "text-brand-terracotta" : "text-stone-400 hover:text-stone-600"}`}
            >
              {tab.label}
              {isActive && <span className="absolute bottom-0 inset-x-0 h-[2.5px] bg-brand-terracotta rounded-full" />}
            </button>
          );
        })}
      </div>

      {activeTab === "about" && (
        <>
          {hasDescription && (
            <p className={`text-start text-stone-600 leading-relaxed text-lg font-medium pb-6 ${hasMoreAfterDescription ? "mb-6 border-b border-stone-100" : ""}`}>
              {exercise.description}
            </p>
          )}

          {instructionLines.length > 0 && (
            <div className={hasHeatmapData ? "mb-6" : ""}>
              <div className="flex items-center gap-2 mb-4">
                <ClipboardList size={15} className="text-brand-terracotta" />
                <h4 className="font-bold text-[13px] tracking-wide text-stone-500 uppercase">הנחיות</h4>
              </div>
              <div>
                {instructionLines.map((line, i) => (
                  <InstructionLine key={i} line={line} />
                ))}
              </div>
            </div>
          )}

          {hasHeatmapData ? (
            // Full-bleed against the modal's own p-6 padding (-mx-6) so the
            // map gets the sheet's entire width — no title/icon/colored
            // panel any more, just the map itself sitting directly on the
            // modal's plain white background.
            <div className="-mx-6 px-4">
              <AnatomyHeatmap primeMovers={primeMovers} synergists={synergists} className="max-w-2xl mx-auto" />
            </div>
          ) : (
            <ExerciseMuscleMap exercise={exercise} />
          )}

          {!hasAboutContent && <div className="text-center text-stone-500 font-medium p-4">אין מידע נוסף לתרגיל זה.</div>}
        </>
      )}

      {activeTab === "history" && (
        <>
          {isHistoryLoading ? (
            <div className="flex justify-center py-14">
              <Loader2 size={28} className="text-stone-300 animate-spin" />
            </div>
          ) : pastSessions.length === 0 ? (
            <PlaceholderTabBody icon={<History size={32} className="text-stone-300" />} text="עדיין אין היסטוריית ביצועים לתרגיל זה." />
          ) : (
            <div className="flex flex-col gap-3">
              {pastSessions.map((session) => (
                <div key={session.logId} className="bg-stone-50 rounded-2xl p-4">
                  <div className="flex items-center justify-between mb-3">
                    <span className="text-sm font-black text-brand-espresso">
                      {new Date(session.date).toLocaleDateString("he-IL", { weekday: "short", day: "2-digit", month: "2-digit", year: "numeric" })}
                    </span>
                    <span className="text-[11px] font-bold text-stone-400">{session.sets.length} סטים</span>
                  </div>
                  <div className="flex flex-col gap-1.5">
                    {session.sets.map((set, i) => (
                      <div key={i} className="flex items-center justify-between text-sm">
                        <span className="text-stone-500 font-medium">סט {set.set_number}</span>
                        <div className="flex items-center gap-2">
                          <span className="font-bold text-brand-espresso">{set.reps} חזרות</span>
                          {set.rir != null && (
                            <span className="bg-white text-brand-terracotta text-[10px] font-extrabold px-2 py-0.5 rounded-full border border-stone-100">
                              RIR {set.rir}
                            </span>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          )}
        </>
      )}

      {activeTab === "charts" && (
        <>
          {hasHistory ? (
            <div>
              <h4 className="font-bold text-sm mb-4 flex items-center gap-2 text-brand-espresso">
                <TrendingUp size={16} className="text-brand-terracotta" /> היסטוריית ביצועים (מקסימום לאימון)
              </h4>
              <div className="h-56 w-full" dir="ltr">
                <ResponsiveContainer width="100%" height="100%">
                  <LineChart data={historyData}>
                    <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e7e5e4" />
                    <XAxis dataKey="date" tick={{ fontSize: 10, fill: "#78716c" }} />
                    <YAxis yAxisId="left" tick={{ fontSize: 10, fill: "#78716c" }} width={30} />
                    <YAxis yAxisId="right" orientation="right" tick={{ fontSize: 10, fill: "#78716c" }} width={24} allowDecimals={false} />
                    <RechartsTooltip contentStyle={{ backgroundColor: "#fff", borderColor: "#e7e5e4", color: "#1c1917" }} />
                    <Line yAxisId="left" type="monotone" dataKey="reps" name="חזרות" stroke="#A15D38" strokeWidth={3} dot={{ r: 4 }} />
                    <Line yAxisId="right" type="monotone" dataKey="rir" name="RIR" stroke="#f59e0b" strokeWidth={2} dot={{ r: 3 }} connectNulls={false} />
                  </LineChart>
                </ResponsiveContainer>
              </div>
            </div>
          ) : (
            <PlaceholderTabBody icon={<TrendingUp size={32} className="text-stone-300" />} text="אין עדיין מספיק נתונים כדי להציג גרף התקדמות לתרגיל זה." />
          )}
        </>
      )}
    </Modal>
  );
}
