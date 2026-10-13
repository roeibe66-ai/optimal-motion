import { MessageSquareText, UserRound } from "lucide-react";

interface ExerciseNotesProps {
  therapistNote?: string | null;
  patientNote?: string | null;
  className?: string;
  align?: "start" | "center";
}

// The therapist's and the patient's notes on an exercise, as the patient
// sees them (the workout player under the exercise name, the plan list).
// Renders nothing when both are empty.
export default function ExerciseNotes({ therapistNote, patientNote, className = "", align = "start" }: ExerciseNotesProps) {
  const therapist = therapistNote?.trim();
  const patient = patientNote?.trim();
  if (!therapist && !patient) return null;
  const justify = align === "center" ? "justify-center text-center" : "justify-start text-start";
  return (
    <div className={`flex flex-col gap-1 ${className}`}>
      {therapist && (
        <p className={`flex items-start gap-1.5 text-xs font-bold text-accent-fg ${justify}`}>
          <MessageSquareText size={13} className="shrink-0 mt-px" aria-label="הערת המטפל" />
          <span className="[overflow-wrap:anywhere]">{therapist}</span>
        </p>
      )}
      {patient && (
        <p className={`flex items-start gap-1.5 text-xs font-medium text-muted ${justify}`}>
          <UserRound size={13} className="shrink-0 mt-px" aria-label="הערה שלי" />
          <span className="[overflow-wrap:anywhere]">{patient}</span>
        </p>
      )}
    </div>
  );
}
