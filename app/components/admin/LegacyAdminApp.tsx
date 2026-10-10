"use client";

import { useEffect, useRef, useState } from "react";
import {
  Activity,
  BrainCircuit,
  Check,
  ChevronDown,
  ChevronUp,
  Clock,
  Coffee,
  Copy,
  DownloadCloud,
  Dumbbell,
  Edit3,
  Eraser,
  Eye,
  EyeOff,
  Filter,
  GripVertical,
  HeartPulse,
  HelpCircle,
  History,
  Image as ImageIcon,
  Loader2,
  Map,
  Mic,
  PenTool,
  Phone,
  Plus,
  Repeat,
  Save,
  Search,
  Sparkles,
  Trash2,
  Users,
  Video,
  Wand2,
  X,
} from "lucide-react";
import { supabase } from "@/app/lib/supabase";
import { useAuth } from "@/app/context/AuthContext";
import { ADMIN_CATEGORY_STYLES, ADMIN_TAGS, AVAILABLE_MUSCLES, DAYS_OF_WEEK, DEFAULT_ADMIN_CATEGORY_STYLE, EQUIPMENT_LIST, MUSCLE_REGIONS } from "@/app/constants/catalog";
import AdminSidebar from "@/app/components/admin/AdminSidebar";
import AdminCoPilotDrawer from "@/app/components/admin/AdminCoPilotDrawer";
import WorkoutBuilderTab from "@/app/components/admin/tabs/WorkoutBuilderTab";
import ProgramLibraryTab from "@/app/components/admin/tabs/ProgramLibraryTab";
import ExerciseLibraryTab from "@/app/components/admin/tabs/ExerciseLibraryTab";
import { formatAdminDate, formatRepTarget, formatWeightKg, getExerciseName, parseRepInput, parseWeightInput } from "@/app/utils/format";
import { getAIInsight } from "@/app/utils/scoring";
import { generateResearchFacts, type ResearchInterpretation } from "@/app/actions/researchAgent";
import type { AIAssistantContext, CuratedFact, PatientProgram, ResearchFinding } from "@/app/types";
import { SELF_BUILT_PROGRAM_NAME } from "@/app/hooks/useWorkoutSession";

// NOT YET REFACTORED. This is a byte-faithful port of the admin side of the
// original monolith — CRM, exercise library, the drag-and-drop builder,
// manual assignment, plan editing, and the video-review mockup — kept
// exactly as it behaved there (including its `any`-typed, un-modularized
// style) so clinic-facing functionality isn't lost while only the patient
// side has been refactored so far. It reuses the constants/utils/supabase
// client already extracted, and its logout is wired to the real
// AuthContext so exiting admin correctly returns to the real landing page
// (the original's own internal logout only reset patient-side state that
// no longer exists at this level).
/* eslint-disable @typescript-eslint/no-explicit-any -- untyped by design, matching the original's loose style until this side gets its own refactor pass */

const REST_TIME_PRESETS = [30, 60, 90, 120];

// Research-result evidence grade chip (A strongest).
const EVIDENCE_GRADE_STYLE: Record<ResearchFinding["evidenceGrade"], string> = {
  A: "bg-accent text-on-accent border-accent",
  B: "bg-accent/15 text-accent-fg border-accent/30",
  C: "bg-surface-alt text-muted border-line",
};

// Manage-plans view: the selected patient's assignments grouped under their
// named program, in program creation order. Rows without a program were
// saved by the patient from the DIY builder, and are grouped last.
function groupAssignmentsByProgram<T extends { program_id?: string | null }>(assignments: T[], programs: PatientProgram[]) {
  const groups: { key: string; name: string; program: PatientProgram | null; items: T[] }[] = programs.map((program) => ({
    key: program.id,
    name: program.name,
    program,
    items: assignments.filter((a) => a.program_id === program.id),
  }));
  const unassigned = assignments.filter((a) => !a.program_id || !programs.some((p) => p.id === a.program_id));
  if (unassigned.length > 0) groups.push({ key: "self-built", name: SELF_BUILT_PROGRAM_NAME, program: null, items: unassigned });
  return groups.filter((g) => g.items.length > 0);
}

export default function LegacyAdminApp() {
  const { handleLogout, lang } = useAuth();

  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const [adminTab, setAdminTab] = useState("builder");

  const [patients, setPatients] = useState<any[]>([]);
  const [exercises, setExercises] = useState<any[]>([]);
  const [packages, setPackages] = useState<any[]>([]);
  const [workoutLogs, setWorkoutLogs] = useState<any[]>([]);

  // "עדכונים קליניים מהשטח" dismiss state. Each card IS a real workout_logs
  // row (patient-reported pain/RPE), also read independently by the
  // patient's own progress view — so dismissing here must never touch the
  // row itself. Kept in localStorage (per-browser, not a DB column) rather
  // than adding schema for what's currently a single-admin console.
  const [dismissedLogIds, setDismissedLogIds] = useState<string[]>(() => {
    try {
      const stored = localStorage.getItem("om_dismissed_clinic_logs");
      return stored ? JSON.parse(stored) : [];
    } catch {
      return []; // malformed/missing storage — falls back to showing everything
    }
  });
  const dismissLog = (id: string) => {
    setDismissedLogIds((prev) => {
      const next = [...prev, id];
      localStorage.setItem("om_dismissed_clinic_logs", JSON.stringify(next));
      return next;
    });
  };
  const visibleWorkoutLogs = workoutLogs.filter((log) => !dismissedLogIds.includes(String(log.id)));
  // Single ref, not per-card state: only one card can be mid-touch at a
  // time, and there's no drag-follow animation to render mid-gesture — the
  // distance is only read once, at touchend, same pattern as the workout
  // player's existing swipe-to-advance gesture.
  const swipeStartXRef = useRef<number | null>(null);

  const [crmFilter, setCrmFilter] = useState("all");

  const [curatedFacts, setCuratedFacts] = useState<CuratedFact[]>([]);
  const [researchQuery, setResearchQuery] = useState("");
  const [researchResults, setResearchResults] = useState<ResearchFinding[] | null>(null);
  const [isResearchLoading, setIsResearchLoading] = useState(false);
  const [researchError, setResearchError] = useState("");
  const [researchInterpretation, setResearchInterpretation] = useState<ResearchInterpretation | null>(null);
  // Tracks which of the current researchResults have been saved this
  // session, keyed by paperUrl (findings have no id until they become a
  // curated_facts row) — lets the "Save to App" button flip to a disabled
  // "Saved" state without waiting on a refetch of curatedFacts.
  const [savedFactUrls, setSavedFactUrls] = useState<Set<string>>(new Set());
  // Admin/practitioner-only notes, never sent to patients — deliberately a
  // separate table (exercise_internal_notes) rather than a column on
  // exercises, since exercises has a SELECT policy open to all authenticated
  // users and RLS is row-level, not column-level. See the migration comment.
  const [internalNotesByExerciseId, setInternalNotesByExerciseId] = useState<Record<string, string>>({});


  const [managePatientId, setManagePatientId] = useState("");
  const [managePatientExercises, setManagePatientExercises] = useState<any[]>([]);
  const [managePrograms, setManagePrograms] = useState<PatientProgram[]>([]);
  const [editingAssignId, setEditingAssignId] = useState<string | null>(null);
  const [editAssignForm, setEditAssignForm] = useState({
    sets: "3",
    reps: "10",
    rir: "",
    block: "A",
    notes: "",
    scheduled_days: [] as string[],
    is_time: false,
    week: 1,
    weight_kg: "",
  });


  const [builderMode, setBuilderMode] = useState<"patient" | "protocol">("patient");
  const [builderPatientId, setBuilderPatientId] = useState("");
  const [builderProtocolName, setBuilderProtocolName] = useState("");
  // Patient mode: every assignment is a named program — this name is the
  // workout title the patient sees (see patient_programs).
  const [builderProgramName, setBuilderProgramName] = useState("");
  const [builderProtocolDesc, setBuilderProtocolDesc] = useState("");

  const [builderSelectedWeek, setBuilderSelectedWeek] = useState<number>(1);
  const getInitialDays = (): Record<string, any[]> => DAYS_OF_WEEK.reduce((acc, day) => ({ ...acc, [day.id]: [] }), {} as Record<string, any[]>);

  const [builderPlan, setBuilderPlan] = useState<Record<number, Record<string, any[]>>>({
    1: getInitialDays(),
  });

  const [aiPrompt, setAiPrompt] = useState("");
  const [isAiLoading, setIsAiLoading] = useState(false);
  const [builderSearchFilter, setBuilderSearchFilter] = useState("all");
  const [builderNameQuery, setBuilderNameQuery] = useState("");
  const [builderMuscleFilter, setBuilderMuscleFilter] = useState("all");
  const [builderEquipmentFilter, setBuilderEquipmentFilter] = useState("all");
  const [enablePeriodizationUI, setEnablePeriodizationUI] = useState(false);

  // Which day's accordion is expanded in the timeline — a Set rather than a
  // single id since more than one day can be open at once (unlike a classic
  // single-open accordion). Days that already have exercises open by
  // default so existing content isn't hidden on first load; empty days stay
  // collapsed until the admin opens them.
  const [openBuilderDayIds, setOpenBuilderDayIds] = useState<Set<string>>(
    () => new Set(DAYS_OF_WEEK.filter((d) => (builderPlan[1]?.[d.id]?.length ?? 0) > 0).map((d) => d.id))
  );
  // The day the sidebar's "+" quick-add button targets — whichever day the
  // admin most recently opened, added to, or duplicated into. Defaults to
  // Sunday so quick-add always has a valid target even before any day has
  // been touched.
  const [builderActiveDayId, setBuilderActiveDayId] = useState<string>(DAYS_OF_WEEK[0].id);

  const [tacticalReviewMode, setTacticalReviewMode] = useState<any | null>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [isDrawing, setIsDrawing] = useState(false);

  const normalizedBuilderQuery = builderNameQuery.trim().toLowerCase();
  const filteredExercisesForBuilder = exercises.filter((e) => {
    const matchesTag = builderSearchFilter === "all" || (e.admin_tags && e.admin_tags.split(",").includes(builderSearchFilter));
    const matchesName =
      !normalizedBuilderQuery ||
      (e.name_he ?? "").toLowerCase().includes(normalizedBuilderQuery) ||
      (e.name_en ?? "").toLowerCase().includes(normalizedBuilderQuery);
    const matchesMuscle =
      builderMuscleFilter === "all" ||
      e.target_muscle === builderMuscleFilter ||
      (e.secondary_muscles ?? "").split(",").includes(builderMuscleFilter);
    const matchesEquipment = builderEquipmentFilter === "all" || (e.equipment ?? []).includes(builderEquipmentFilter);
    return matchesTag && matchesName && matchesMuscle && matchesEquipment;
  });

  // Grounds the co-pilot drawer in whatever's actually on screen: the
  // patient this plan is for (when in "patient" mode) and every exercise
  // currently dropped into the selected week's grid, across all days.
  const builderCoPilotContext: AIAssistantContext = (() => {
    const assignedPatient = builderMode === "patient" ? patients.find((p) => p.id === builderPatientId) : undefined;
    const weekPlan = builderPlan[builderSelectedWeek] || {};
    const currentExercises = Object.values(weekPlan)
      .flat()
      .map((ex: any) => ({ title: getExerciseName(ex, lang), block: ex.block || "A", sets: ex.sets, reps: ex.reps }));
    return {
      patientName: assignedPatient?.full_name,
      patientType: assignedPatient?.patient_type,
      currentExercises,
      notes: builderMode === "protocol" ? `בונה תבנית עבודה כללית${builderProtocolName ? ` בשם "${builderProtocolName}"` : ""}, לא משויכת למטופל ספציפי.` : undefined,
    };
  })();

  const displayedPatients = patients.filter((p) => {
    if (crmFilter === "all") return true;
    return p.patient_type === crmFilter;
  });
  const clinicalCount = patients.filter((p) => p.patient_type === "clinical" || !p.patient_type).length;
  const fitnessCount = patients.filter((p) => p.patient_type === "fitness").length;

  const fetchAdminData = async () => {
    const [pats, exs, pkgs, logs, notes, facts] = await Promise.all([
      supabase.from("patients").select("*"),
      supabase.from("exercises").select("*, media:exercise_media(*)"),
      supabase.from("packages").select("*"),
      supabase.from("workout_logs").select("*").order("created_at", { ascending: false }).limit(500),
      supabase.from("exercise_internal_notes").select("*"),
      supabase.from("curated_facts").select("*").order("created_at", { ascending: false }),
    ]);
    if (pats.data) setPatients(pats.data);
    if (exs.data) setExercises(exs.data);
    if (pkgs.data) setPackages(pkgs.data);
    if (logs.data) setWorkoutLogs(logs.data);
    if (notes.data) setInternalNotesByExerciseId(Object.fromEntries(notes.data.map((n) => [n.exercise_id, n.notes ?? ""])));
    if (facts.data) setCuratedFacts(facts.data);
  };

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect -- fetching from Supabase, an external system, on mount
    fetchAdminData();
  }, []);

  const fetchManagePatientExercises = async (patId: string) => {
    const [{ data: assigns }, { data: programs }] = await Promise.all([
      supabase.from("patient_exercises").select("*").eq("patient_id", patId),
      supabase.from("patient_programs").select("*").eq("patient_id", patId).order("created_at", { ascending: true }),
    ]);
    setManagePrograms((programs ?? []) as PatientProgram[]);
    if (assigns) {
      const combined = assigns
        .map((a) => {
          const ex = exercises.find((e) => e.id === a.exercise_id);
          return { ...a, exercise: ex };
        })
        .filter((a) => a.exercise);
      setManagePatientExercises(combined);
    }
  };

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect -- fetching from Supabase, an external system, whenever the selected patient or catalog changes
    if (managePatientId && exercises.length > 0) fetchManagePatientExercises(managePatientId);
    else setManagePatientExercises([]);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [managePatientId, exercises]);

  // Account creation moved to self-registration (RegisterPage) — clinical
  // patients are now onboarded in person on Roei's own device, same flow as
  // fitness patients, so the CRM no longer creates accounts (it also can't:
  // creating another user's real auth identity needs the service-role key,
  // which this app doesn't have access to anywhere). This is view/manage-
  // only now — patient_type is the one field still adjustable after the fact.
  const handleTogglePatientType = async (patientId: string, currentType: string) => {
    const nextType = currentType === "fitness" ? "clinical" : "fitness";
    const { error } = await supabase.from("patients").update({ patient_type: nextType }).eq("id", patientId);
    if (error) alert("שגיאה: " + error.message);
    else fetchAdminData();
  };

  const runResearchSearch = async (query: string) => {
    if (!query.trim() || isResearchLoading) return;
    setIsResearchLoading(true);
    setResearchError("");
    setResearchResults(null);
    setResearchInterpretation(null);
    setSavedFactUrls(new Set());
    try {
      const result = await generateResearchFacts(query);
      if (!result.ok) {
        setResearchError(result.error);
        return;
      }
      setResearchResults(result.findings);
      setResearchInterpretation(result.interpretation);
    } catch (err) {
      // A thrown server action (e.g. a platform timeout) otherwise leaves the
      // button spinning forever with no message.
      setResearchError(`החיפוש נכשל: ${err instanceof Error ? err.message : "שגיאה לא ידועה"}`);
    } finally {
      setIsResearchLoading(false);
    }
  };

  const handleResearchSearch = (e: any) => {
    e.preventDefault();
    runResearchSearch(researchQuery);
  };

  const handleSaveFact = async (finding: ResearchFinding) => {
    const { error } = await supabase.from("curated_facts").insert([
      {
        paper_title: finding.paperTitle,
        paper_url: finding.paperUrl,
        year: finding.year,
        summary_he: finding.summaryHe,
        did_you_know_he: finding.didYouKnowHe,
      },
    ]);
    if (error) {
      alert("שגיאה בשמירה: " + error.message);
      return;
    }
    setSavedFactUrls((prev) => new Set(prev).add(finding.paperUrl));
    fetchAdminData();
  };

  const handleToggleCuratedFactHidden = async (fact: CuratedFact) => {
    const { error } = await supabase.from("curated_facts").update({ is_hidden: !fact.is_hidden }).eq("id", fact.id);
    if (error) alert("שגיאה בעדכון: " + error.message);
    else fetchAdminData();
  };

  const handleDeleteCuratedFact = async (id: string) => {
    if (!confirm("למחוק את העובדה לצמיתות? אם רק רוצים שמטופלים לא יראו אותה, עדיף להסתיר.")) return;
    const { error } = await supabase.from("curated_facts").delete().eq("id", id);
    if (error) alert("שגיאה במחיקה: " + error.message);
    else fetchAdminData();
  };

  const handleRenameProgram = async (program: PatientProgram) => {
    const nextName = prompt("שם חדש לתוכנית (זה השם שהמטופל רואה):", program.name)?.trim();
    if (!nextName || nextName === program.name) return;
    const { error } = await supabase.from("patient_programs").update({ name: nextName }).eq("id", program.id);
    if (error) alert("שגיאה בשינוי השם: " + error.message);
    else fetchManagePatientExercises(managePatientId);
  };

  const handleDeleteProgram = async (program: PatientProgram) => {
    if (!confirm(`למחוק את התוכנית "${program.name}" וכל התרגילים שבה? המטופל לא יראה אותה יותר.`)) return;
    // patient_exercises.program_id cascades, so this removes the program's exercises too.
    const { error } = await supabase.from("patient_programs").delete().eq("id", program.id);
    if (error) alert("שגיאה במחיקה: " + error.message);
    else fetchManagePatientExercises(managePatientId);
  };

  const handleDeleteAssignment = async (assignId: string) => {
    if (!confirm("האם אתה בטוח שברצונך למחוק תרגיל זה מהתוכנית?")) return;
    const { error } = await supabase.from("patient_exercises").delete().eq("id", assignId);
    if (error) alert("שגיאה במחיקה: " + error.message);
    else fetchManagePatientExercises(managePatientId);
  };

  const handleStartEditAssign = (assign: any) => {
    setEditingAssignId(assign.id);
    setEditAssignForm({
      sets: assign.sets ? String(assign.sets) : "3",
      reps: assign.reps ? (assign.is_time ? String(assign.reps) : formatRepTarget(assign.reps, assign.reps_max)) : "10",
      rir: assign.rir ? String(assign.rir) : "",
      block: String(assign.block || "A"),
      notes: String(assign.notes || ""),
      scheduled_days: assign.scheduled_days ? String(assign.scheduled_days).split(",") : [],
      is_time: Boolean(assign.is_time),
      week: Number(assign.week || 1),
      weight_kg: Number(assign.weight_kg) > 0 ? String(Number(assign.weight_kg)) : "",
    });
  };

  const handleSaveEditAssign = async (assignId: string) => {
    // Accepts a single number or a range ("8-12"); a timed exercise keeps
    // only the low end.
    const repTarget = parseRepInput(editAssignForm.reps, !editAssignForm.is_time);
    if (!repTarget) return alert("יש להזין מספר חזרות תקין, או טווח כמו 8-12");
    const { error } = await supabase
      .from("patient_exercises")
      .update({
        sets: parseInt(editAssignForm.sets),
        reps: repTarget.reps,
        reps_max: repTarget.reps_max,
        rir: editAssignForm.rir ? parseInt(editAssignForm.rir) : null,
        block: editAssignForm.block.toUpperCase(),
        notes: editAssignForm.notes,
        scheduled_days: editAssignForm.scheduled_days.length > 0 ? editAssignForm.scheduled_days.join(",") : null,
        is_time: editAssignForm.is_time,
        week: editAssignForm.week,
        weight_kg: parseWeightInput(editAssignForm.weight_kg),
      })
      .eq("id", assignId);
    if (error) alert("שגיאה בעדכון: " + error.message);
    else {
      setEditingAssignId(null);
      fetchManagePatientExercises(managePatientId);
    }
  };

  const handleBuilderWeekChange = (w: number) => {
    setBuilderSelectedWeek(w);
    if (!builderPlan[w]) {
      setBuilderPlan((prev) => ({ ...prev, [w]: getInitialDays() }));
    }
  };

  const handleDragStart = (e: any, ex: any) => {
    e.dataTransfer.setData("ex_id", ex.id);
  };

  // Shared by drag-and-drop, the sidebar's "+" quick-add button, and
  // day duplication — appends one exercise (with fresh default set/rep
  // numbers and its own temp_id) to a day in the currently selected week,
  // then opens that day and marks it "active" so the result is immediately
  // visible and further quick-adds keep landing in the same place.
  const addExerciseToDay = (dayId: string, ex: any) => {
    setBuilderPlan((prev) => {
      const currentWeekBlocks = prev[builderSelectedWeek] || getInitialDays();
      return {
        ...prev,
        [builderSelectedWeek]: {
          ...currentWeekBlocks,
          [dayId]: [...(currentWeekBlocks[dayId] || []), { ...ex, temp_id: Math.random().toString(), sets: 3, reps: 10, rir: null, is_time: false, block: "A", rest_time_seconds: 60 }],
        },
      };
    });
    setOpenBuilderDayIds((prev) => new Set(prev).add(dayId));
    setBuilderActiveDayId(dayId);
  };

  const handleDrop = (e: any, dayId: string) => {
    e.preventDefault();
    const exId = e.dataTransfer.getData("ex_id");
    const ex = exercises.find((e) => e.id === exId);
    if (ex) addExerciseToDay(dayId, ex);
  };

  const handleDragOver = (e: any) => {
    e.preventDefault();
  };

  // Toggles one day's accordion open/closed and marks it as the active
  // quick-add target regardless of which way it toggled — collapsing a day
  // you were just working in shouldn't change where the next "+" click
  // lands.
  const toggleBuilderDayOpen = (dayId: string) => {
    setOpenBuilderDayIds((prev) => {
      const next = new Set(prev);
      if (next.has(dayId)) next.delete(dayId);
      else next.add(dayId);
      return next;
    });
    setBuilderActiveDayId(dayId);
  };

  // Copies every exercise from one day into the first still-empty day of
  // the same week (fresh temp_ids so removing/editing one copy doesn't
  // affect the other) — DAYS_OF_WEEK is a fixed Sunday-Saturday set, so
  // "a new day block" means the next open slot in that set, not an
  // arbitrary extra day.
  const duplicateBuilderDay = (sourceDayId: string) => {
    const currentWeekBlocks = builderPlan[builderSelectedWeek] || getInitialDays();
    const sourceItems = currentWeekBlocks[sourceDayId] || [];
    if (sourceItems.length === 0) return alert("אין תרגילים ביום הזה לשכפול.");
    const targetDay = DAYS_OF_WEEK.find((d) => d.id !== sourceDayId && (currentWeekBlocks[d.id]?.length ?? 0) === 0);
    if (!targetDay) return alert("כל ימי השבוע כבר מכילים תרגילים בשבוע הזה — פנה יום ריק כדי לשכפל אליו.");
    const duplicatedItems = sourceItems.map((ex: any) => ({ ...ex, temp_id: Math.random().toString() }));
    setBuilderPlan((prev) => {
      const weekBlocks = prev[builderSelectedWeek] || getInitialDays();
      return { ...prev, [builderSelectedWeek]: { ...weekBlocks, [targetDay.id]: duplicatedItems } };
    });
    setOpenBuilderDayIds((prev) => new Set(prev).add(targetDay.id));
    setBuilderActiveDayId(targetDay.id);
  };

  const removeBuilderExercise = (dayId: string, tempId: string) => {
    setBuilderPlan((prev) => {
      const currentWeekBlocks = prev[builderSelectedWeek];
      return { ...prev, [builderSelectedWeek]: { ...currentWeekBlocks, [dayId]: currentWeekBlocks[dayId].filter((ex) => ex.temp_id !== tempId) } };
    });
  };

  const updateBuilderExercise = (dayId: string, tempId: string, field: string, value: any) => {
    setBuilderPlan((prev) => {
      const currentWeekBlocks = prev[builderSelectedWeek];
      return {
        ...prev,
        [builderSelectedWeek]: { ...currentWeekBlocks, [dayId]: currentWeekBlocks[dayId].map((ex) => (ex.temp_id === tempId ? { ...ex, [field]: value } : ex)) },
      };
    });
  };

  const loadProtocolToBuilder = async (e: any) => {
    const pkgId = e.target.value;
    if (!pkgId) return;
    const pkgTitle = packages.find((p) => p.id === pkgId)?.title;
    if (pkgTitle) setBuilderProgramName((prev) => prev || pkgTitle);
    setIsAiLoading(true);
    const { data } = await supabase.from("package_exercises").select("*").eq("package_id", pkgId);
    if (data) {
      setBuilderPlan((prev) => {
        const newPlan = { ...prev };
        data.forEach((pe) => {
          const ex = exercises.find((e) => e.id === pe.exercise_id);
          if (ex) {
            const w = pe.week || 1;
            const day = pe.scheduled_days || "0";
            if (!newPlan[w]) newPlan[w] = getInitialDays();
            if (!newPlan[w][day]) newPlan[w][day] = [];
            // Number(...): pe.sets/pe.reps come from package_exercises, which is
            // still a text column — if this loaded protocol later gets assigned
            // directly to a patient, saveBuilderPlan writes these straight into
            // patient_exercises, now an integer column.
            newPlan[w][day].push({ ...ex, temp_id: Math.random().toString(), sets: Number(pe.sets) || 0, reps: Number(pe.reps) || 0, rir: pe.rir, is_time: pe.is_time, block: pe.block || "A", rest_time_seconds: pe.rest_time_seconds ?? 60, weight_kg: pe.weight_kg != null ? Number(pe.weight_kg) : null });
          }
        });
        return newPlan;
      });
      const loadedWeeks = Array.from(new Set(data.map((pe) => pe.week || 1)));
      if (loadedWeeks.length > 0) setBuilderSelectedWeek(Math.min(...loadedWeeks));
    }
    setIsAiLoading(false);
    e.target.value = "";
  };

  const handleAiGenerate = () => {
    if (!aiPrompt) return alert("הזן בקשה כדי שה-AI יוכל לייצר טיוטה");
    setIsAiLoading(true);
    setTimeout(() => {
      const prompt = aiPrompt.toLowerCase();
      let matched = [...exercises];
      if (prompt.includes("שיקום") || prompt.includes("rehab")) matched = matched.filter((e) => e.admin_tags?.includes("rehab") || e.categories?.includes("שיקום תנועתי"));
      else if (prompt.includes("כוח") || prompt.includes("מכון")) matched = matched.filter((e) => e.admin_tags?.includes("gym") || e.categories?.includes("מכון כושר"));
      else if (prompt.includes("מוביליטי") || prompt.includes("מתיחות")) matched = matched.filter((e) => e.admin_tags?.includes("mobility") || e.categories?.includes("מוביליטי ויוגה"));
      matched = matched.sort(() => 0.5 - Math.random()).slice(0, 4);

      const draftDays: Record<string, any[]> = getInitialDays();
      if (matched.length > 0) {
        draftDays["0"] = matched.slice(0, 2).map((ex) => ({ ...ex, temp_id: Math.random().toString(), sets: 3, reps: 10, rir: 2, is_time: false, block: "A", rest_time_seconds: 60 }));
        draftDays["2"] = matched.slice(2, 4).map((ex) => ({ ...ex, temp_id: Math.random().toString(), sets: 3, reps: 10, rir: 2, is_time: false, block: "A", rest_time_seconds: 60 }));
      } else {
        draftDays["0"] = exercises
          .sort(() => 0.5 - Math.random())
          .slice(0, 3)
          .map((ex) => ({ ...ex, temp_id: Math.random().toString(), sets: 3, reps: 10, rir: 2, is_time: false, block: "A", rest_time_seconds: 60 }));
      }

      setBuilderPlan((prev) => ({ ...prev, [builderSelectedWeek]: draftDays }));
      setIsAiLoading(false);
    }, 1500);
  };

  const saveBuilderPlan = async () => {
    let totalExercises = 0;
    Object.keys(builderPlan).forEach((w) => {
      Object.keys(builderPlan[w as any]).forEach((dayId) => {
        totalExercises += builderPlan[w as any][dayId].length;
      });
    });

    if (totalExercises === 0) return alert("התוכנית ריקה. גרור תרגילים לימים קודם.");

    if (builderMode === "protocol") {
      if (!builderProtocolName) return alert("חובה להזין שם תבנית");
      const { data: pkg, error: pkgErr } = await supabase.from("packages").insert([{ title: builderProtocolName, description: builderProtocolDesc }]).select().single();
      if (pkgErr) return alert(pkgErr.message);

      const inserts: any[] = [];
      Object.keys(builderPlan).forEach((w) => {
        Object.keys(builderPlan[w as any]).forEach((dayId) => {
          builderPlan[w as any][dayId].forEach((ex) => {
            inserts.push({ package_id: pkg.id, exercise_id: ex.id, block: ex.block || "A", sets: ex.sets, reps: ex.reps, rir: ex.rir, is_time: ex.is_time, week: parseInt(w), scheduled_days: dayId, rest_time_seconds: ex.rest_time_seconds || 60, weight_kg: ex.weight_kg ?? null });
          });
        });
      });
      const { error: peErr } = await supabase.from("package_exercises").insert(inserts);
      if (peErr) return alert("שגיאה בשמירת תרגילי התבנית: " + peErr.message);
      alert("התבנית נשמרה במאגר!");
      setBuilderProtocolName("");
      setBuilderProtocolDesc("");
      setBuilderPlan({ 1: getInitialDays() });
      setBuilderSelectedWeek(1);
      fetchAdminData();
      return;
    }

    if (!builderPatientId) return alert("חובה לבחור מטופל לשיוך התוכנית");
    const programName = builderProgramName.trim();
    if (!programName) return alert("חובה לתת שם לתוכנית — זה השם שהמטופל יראה");

    const { data: program, error: programErr } = await supabase
      .from("patient_programs")
      .insert([{ patient_id: builderPatientId, name: programName }])
      .select()
      .single();
    if (programErr) return alert("שגיאה ביצירת התוכנית: " + programErr.message);

    const inserts: any[] = [];
    Object.keys(builderPlan).forEach((w) => {
      Object.keys(builderPlan[w as any]).forEach((dayId) => {
        builderPlan[w as any][dayId].forEach((ex) => {
          inserts.push({
            patient_id: builderPatientId,
            program_id: program.id,
            exercise_id: ex.id,
            block: ex.block || "A",
            sets: ex.sets,
            reps: ex.reps,
            rir: ex.rir,
            is_time: ex.is_time,
            notes: "",
            scheduled_days: dayId,
            week: parseInt(w),
            rest_time_seconds: ex.rest_time_seconds || 60,
            weight_kg: ex.weight_kg ?? null,
          });
        });
      });
    });

    const { error } = await supabase.from("patient_exercises").insert(inserts);
    if (error) {
      // Don't leave an empty program behind for the patient to see.
      await supabase.from("patient_programs").delete().eq("id", program.id);
      alert("שגיאה בשמירת התוכנית: " + error.message);
    } else {
      alert(`התוכנית "${programName}" נשמרה ושוגרה בהצלחה! 🚀`);
      setBuilderProgramName("");
      setBuilderPlan({ 1: getInitialDays() });
      setBuilderSelectedWeek(1);
      setAiPrompt("");
    }
  };

  const showRirInfo = () => {
    alert(
      "מה זה RIR (Reps in Reserve)?\n\nמדד שקובע כמה חזרות נשארו לך 'בטנק' עד לכשל שריר מוחלט.\n\nלדוגמה:\nRIR 2: אומר שאתה צריך לעצור את הסט כשיש לך כוח לעוד 2 חזרות בדיוק.\nRIR 0: כשל מוחלט."
    );
  };

  const startDrawing = (e: any) => {
    setIsDrawing(true);
    draw(e);
  };
  const finishDrawing = () => {
    setIsDrawing(false);
    if (canvasRef.current) {
      const ctx = canvasRef.current.getContext("2d");
      ctx?.beginPath();
    }
  };
  const draw = (e: any) => {
    if (!isDrawing || !canvasRef.current) return;
    const canvas = canvasRef.current;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;
    const rect = canvas.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;
    ctx.lineWidth = 4;
    ctx.lineCap = "round";
    // Canvas can't resolve CSS variables itself — read the token off the
    // document so the annotation stroke still comes from the theme.
    ctx.strokeStyle = getComputedStyle(document.documentElement).getPropertyValue("--warm").trim();
    ctx.lineTo(x, y);
    ctx.stroke();
    ctx.beginPath();
    ctx.moveTo(x, y);
  };
  const clearCanvas = () => {
    if (canvasRef.current) {
      const ctx = canvasRef.current.getContext("2d");
      ctx?.clearRect(0, 0, canvasRef.current.width, canvasRef.current.height);
    }
  };

  if (tacticalReviewMode) {
    return (
      <div className="fixed inset-0 bg-page z-[150] flex flex-col" dir="rtl">
        <header className="bg-elevated border-b border-line p-4 flex justify-between items-center text-fg">
          <div>
            <h2 className="text-xl font-black flex items-center gap-2">
              <Video className="text-warm-fg" size={24} /> ניתוח תנועה: {tacticalReviewMode.patientName}
            </h2>
            <p className="text-muted text-sm">{tacticalReviewMode.exerciseTitle}</p>
          </div>
          <div className="flex items-center gap-4">
            <div className="bg-line rounded-lg p-1 flex gap-1">
              <button className="p-2 bg-line rounded text-fg hover:bg-line transition-colors" title="צייר קו">
                <PenTool size={18} />
              </button>
              <button onClick={clearCanvas} className="p-2 text-muted hover:text-fg hover:bg-line rounded transition-colors" title="נקה מסך">
                <Eraser size={18} />
              </button>
            </div>
            <button className="bg-btn-primary hover:bg-btn-primary-hover active:bg-btn-primary-active text-btn-primary-fg px-4 py-2 rounded-lg font-bold flex items-center gap-2">
              <Mic size={18} /> הקלט משוב קולי
            </button>
            <button onClick={() => setTacticalReviewMode(null)} className="text-muted hover:text-fg p-2">
              <X size={24} />
            </button>
          </div>
        </header>

        <div className="flex-1 flex flex-col lg:flex-row bg-page p-4 gap-4 overflow-hidden relative">
          <div className="flex-1 bg-page rounded-2xl relative border border-line overflow-hidden flex items-center justify-center group">
            <span className="absolute top-4 right-4 bg-warm text-on-accent text-xs font-bold px-3 py-1 rounded-full z-20 shadow-md">המטופל</span>
            <div className="w-full h-full bg-line animate-pulse flex items-center justify-center text-muted">Video Placeholder</div>
            <canvas
              ref={canvasRef}
              onMouseDown={startDrawing}
              onMouseUp={finishDrawing}
              onMouseMove={draw}
              onMouseLeave={finishDrawing}
              className="absolute inset-0 w-full h-full z-10 cursor-crosshair"
              width={800}
              height={600}
              style={{ touchAction: "none" }}
            />
          </div>
          <div className="flex-1 bg-page rounded-2xl relative border border-line overflow-hidden flex items-center justify-center">
            <span className="absolute top-4 right-4 bg-accent text-on-accent text-xs font-bold px-3 py-1 rounded-full z-20 shadow-md">רפרנס אידיאלי</span>
            {tacticalReviewMode.gifUrl ? (
              <img src={tacticalReviewMode.gifUrl} alt={tacticalReviewMode.exerciseTitle || "Reference"} className="w-full h-full object-contain opacity-80" />
            ) : (
              <div className="text-muted">אין וידאו רפרנס</div>
            )}
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col md:flex-row h-screen bg-page overflow-hidden" dir="rtl">
      <AdminSidebar adminTab={adminTab} setAdminTab={setAdminTab} isSidebarOpen={isSidebarOpen} setIsSidebarOpen={setIsSidebarOpen} onLogout={handleLogout} />

      <main className="flex-1 overflow-y-auto p-4 md:p-12">
        {adminTab === "video_reviews" && (
          <div className="max-w-6xl mx-auto">
            <header className="mb-10 hidden md:block">
              <h1 className="text-3xl md:text-4xl font-black text-fg tracking-tight flex items-center gap-3">
                <Video className="text-warm-fg" size={32} /> ביקורות וידאו ממטופלים
              </h1>
            </header>
            <div className="on-light bg-surface rounded-[1.75rem] border border-line p-8 h-full">
              <div className="on-light border border-line p-5 rounded-2xl flex flex-col md:flex-row items-start md:items-center justify-between gap-4 bg-surface-alt hover:bg-surface-alt transition-colors group">
                <div className="flex items-center gap-4">
                  <div className="w-14 h-14 bg-warm/15 text-warm-fg rounded-xl flex items-center justify-center">
                    <Video size={24} />
                  </div>
                  <div>
                    <h3 className="font-bold text-fg text-lg">דוגמה למטופל (מוקאפ)</h3>
                    <p className="text-sm text-muted">העלה סרטון ביצוע ל: &quot;Squat&quot;</p>
                  </div>
                </div>
                <button
                  onClick={() => setTacticalReviewMode({ patientName: "דוגמה למטופל", exerciseTitle: "Squat", gifUrl: "https://wger.de/media/exercise-images/88/Squats-1.png" })}
                  className="bg-btn-primary text-btn-primary-fg px-6 py-2.5 rounded-xl font-bold hover:bg-btn-primary-hover active:bg-btn-primary-active transition-colors flex items-center gap-2"
                >
                  <PenTool size={16} /> פתח חדר ניתוח
                </button>
              </div>
            </div>
          </div>
        )}

        {adminTab === "dashboard" && (
          <div className="max-w-6xl mx-auto">
            <header className="mb-10 hidden md:block">
              <h1 className="text-3xl md:text-4xl font-black text-fg tracking-tight">קליניקה לייב</h1>
            </header>
            <div className="on-light bg-surface rounded-[1.75rem] border border-line p-8 h-full">
              <div className="flex justify-between items-center mb-6">
                <h2 className="text-xl font-bold text-fg flex items-center gap-2">
                  <Activity size={20} className="text-accent-fg" /> עדכונים קליניים מהשטח
                </h2>
                <span className="on-light text-sm font-bold text-muted bg-surface-alt px-3 py-1 rounded-full border border-line">{visibleWorkoutLogs.length} דיווחים</span>
              </div>
              {visibleWorkoutLogs.length === 0 ? (
                <div className="text-center p-12 flex flex-col items-center">
                  <div className="on-light w-20 h-20 bg-surface-alt rounded-full flex items-center justify-center text-muted mb-4">
                    <Coffee size={32} />
                  </div>
                  <p className="text-muted font-bold text-lg">שקט בקליניקה כרגע</p>
                  <p className="text-muted text-sm">הדיווחים של המטופלים יופיעו כאן בזמן אמת.</p>
                </div>
              ) : (
                <div className="space-y-4 max-h-[600px] overflow-y-auto pr-2">
                  {visibleWorkoutLogs.map((log) => {
                    const patientName = patients.find((p) => p.id === log.patient_id)?.full_name || "מטופל לא ידוע";
                    const rpeColor = log.rpe >= 8 ? "bg-warm-strong text-surface border-warm-fg" : log.rpe >= 5 ? "bg-warm/15 text-warm-fg border-warm/30" : "bg-accent/15 text-accent-fg border-accent/25";
                    return (
                      <div
                        key={log.id}
                        onTouchStart={(e) => { swipeStartXRef.current = e.targetTouches[0].clientX; }}
                        onTouchEnd={(e) => {
                          if (swipeStartXRef.current === null) return;
                          const distance = swipeStartXRef.current - e.changedTouches[0].clientX;
                          swipeStartXRef.current = null;
                          if (Math.abs(distance) > 50) dismissLog(String(log.id));
                        }}
                        className="on-light flex flex-col md:flex-row justify-between items-start md:items-center p-5 rounded-2xl border border-line bg-surface-alt hover:border-line-input transition-colors gap-4"
                      >
                        {/* Swipe (either direction) dismisses this card from the admin's own view only —
                            it's a real workout_logs row read independently by the patient's progress view,
                            so this never touches the row; dismissed ids are per-browser localStorage, see
                            dismissLog above. */}
                        <div>
                          <h4 className="font-black text-fg text-lg">{patientName}</h4>
                          <p className="text-sm text-muted font-medium">{log.category}</p>
                          <span className="text-xs text-muted mt-1 block">{formatAdminDate(log.created_at)}</span>
                          {log.pain_areas && (
                            <div className="flex flex-wrap gap-1 mt-2">
                              {log.pain_areas.split(",").map((area: string) => (
                                <span key={area} className="bg-warm/15 text-warm-fg px-2 py-0.5 rounded-md text-[10px] font-bold border border-warm/30">
                                  {AVAILABLE_MUSCLES.find((m) => m.id === area)?.label || area}
                                </span>
                              ))}
                            </div>
                          )}
                        </div>
                        <div className="flex gap-2 w-full md:w-auto">
                          <div className="on-light flex flex-col items-center justify-center w-full md:w-16 h-16 rounded-xl border border-line bg-surface">
                            <span className="text-[10px] font-bold text-muted uppercase">כאב לפני</span>
                            <span className="text-xl font-black text-fg">{log.pain_before ?? "-"}</span>
                          </div>
                          <div className="on-light flex flex-col items-center justify-center w-full md:w-16 h-16 rounded-xl border border-line bg-surface">
                            <span className="text-[10px] font-bold text-muted uppercase">כאב אחרי</span>
                            <span className="text-xl font-black text-fg">{log.pain_after ?? "-"}</span>
                          </div>
                          {log.result_rounds != null && (
                            // AMRAP result: completed rounds + reps into the unfinished one.
                            <div
                              title={`AMRAP: ${log.result_rounds} סבבים${log.result_extra_reps ? ` + ${log.result_extra_reps} חזרות` : ""}`}
                              className="flex flex-col items-center justify-center w-full md:w-20 h-16 rounded-xl border-2 border-accent/30 bg-accent/15 text-accent-fg"
                            >
                              <span className="text-[10px] font-bold uppercase mb-0.5">סבבים</span>
                              <span className="text-xl font-black leading-none tabular-nums" dir="ltr">
                                {log.result_rounds}
                                {log.result_extra_reps ? <span className="text-sm">+{log.result_extra_reps}</span> : null}
                              </span>
                            </div>
                          )}
                          <div className={`flex flex-col items-center justify-center w-full md:w-16 h-16 rounded-xl border-2 ${rpeColor}`}>
                            <span className="text-[10px] font-bold uppercase mb-0.5">RPE</span>
                            <span className="text-xl font-black leading-none">{log.rpe}</span>
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          </div>
        )}

        {adminTab === "crm" && (
          <div className="max-w-6xl mx-auto">
            <header className="mb-10 hidden md:block">
              <h1 className="text-3xl md:text-4xl font-black text-fg tracking-tight">ניהול תיקים ולקוחות</h1>
            </header>
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-8">
              <div className="on-light bg-surface rounded-3xl p-6 border border-line flex items-center gap-4">
                <div className="on-light w-14 h-14 rounded-2xl bg-surface-alt flex items-center justify-center text-fg">
                  <Users size={24} />
                </div>
                <div>
                  <p className="text-sm font-bold text-muted uppercase">סה&quot;כ לקוחות</p>
                  <p className="text-2xl font-black text-fg">{patients.length}</p>
                </div>
              </div>
              <div className="on-light bg-surface rounded-3xl p-6 border border-line flex items-center gap-4">
                <div className="w-14 h-14 rounded-2xl bg-accent/10 flex items-center justify-center text-accent-fg">
                  <HeartPulse size={24} />
                </div>
                <div>
                  <p className="text-sm font-bold text-accent-fg/80 uppercase">שיקום קליני</p>
                  <p className="text-2xl font-black text-fg">{clinicalCount}</p>
                </div>
              </div>
              <div className="on-light bg-surface rounded-3xl p-6 border border-line flex items-center gap-4">
                <div className="w-14 h-14 rounded-2xl bg-warm/10 flex items-center justify-center text-warm-fg">
                  <Dumbbell size={24} />
                </div>
                <div>
                  <p className="text-sm font-bold text-warm-fg/80 uppercase">מתאמני כושר ויוגה</p>
                  <p className="text-2xl font-black text-fg">{fitnessCount}</p>
                </div>
              </div>
            </div>
            <div className="on-light bg-surface rounded-[1.75rem] border border-line p-8">
              <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-8 gap-4">
                <h2 className="text-xl font-bold text-fg flex items-center gap-2">
                  <Filter size={20} className="text-accent-fg" /> רשימת לקוחות
                </h2>
                <div className="on-light flex bg-surface-alt p-1 rounded-xl border border-line">
                  <button onClick={() => setCrmFilter("all")} className={`px-4 py-1.5 text-sm font-bold rounded-lg transition-colors ${crmFilter === "all" ? "bg-accent text-on-accent" : "text-muted hover:text-fg"}`}>
                    הכל
                  </button>
                  <button onClick={() => setCrmFilter("clinical")} className={`px-4 py-1.5 text-sm font-bold rounded-lg transition-colors ${crmFilter === "clinical" ? "bg-accent text-on-accent" : "text-muted hover:text-fg"}`}>
                    שיקום
                  </button>
                  <button onClick={() => setCrmFilter("fitness")} className={`px-4 py-1.5 text-sm font-bold rounded-lg transition-colors ${crmFilter === "fitness" ? "bg-accent text-on-accent" : "text-muted hover:text-fg"}`}>
                    כושר
                  </button>
                </div>
              </div>
              <p className="text-xs text-muted -mt-5 mb-6">
                חשבונות נוצרים כעת רק דרך מסך ההרשמה העצמית — כאן אפשר לצפות ברשימת הלקוחות ולעדכן מסלול.
              </p>
              <div className="space-y-4">
                {displayedPatients.map((p) => {
                  const aiInsight = getAIInsight(workoutLogs, p.id);
                  return (
                    <div key={p.id} className="flex flex-col p-4 rounded-2xl border border-line hover:bg-surface-alt transition-colors group">
                      <div className="flex items-center justify-between mb-3 gap-3">
                        <div className="flex items-center gap-4 min-w-0">
                          <div className={`w-12 h-12 rounded-xl flex items-center justify-center font-bold text-lg shrink-0 ${p.patient_type === "fitness" ? "bg-warm/15 text-warm-fg" : "bg-accent/15 text-accent-fg"}`}>
                            {p.full_name.charAt(0)}
                          </div>
                          <div className="min-w-0">
                            <h4 className="font-bold text-fg truncate">{p.full_name}</h4>
                            {(p.phone || p.email) && (
                              <p className="text-sm text-muted flex items-center gap-2 truncate">
                                {p.phone ? (
                                  <>
                                    <Phone size={12} className="shrink-0" /> {p.phone}
                                  </>
                                ) : (
                                  p.email
                                )}
                              </p>
                            )}
                          </div>
                        </div>
                        <button
                          onClick={() => handleTogglePatientType(p.id, p.patient_type)}
                          title="לחץ כדי לשנות מסלול"
                          className={`shrink-0 text-xs font-bold px-3 py-1 rounded-full border transition-colors ${
                            p.patient_type === "fitness" ? "bg-warm/10 text-warm-fg border-warm/20 hover:bg-warm/20" : "bg-accent/10 text-accent-fg border-accent/20 hover:bg-accent/20"
                          }`}
                        >
                          {p.patient_type === "fitness" ? "כושר ויציבה" : "שיקום קליני"}
                        </button>
                      </div>
                      <div className={`flex items-center gap-2 p-2.5 rounded-xl text-xs font-bold border ${aiInsight.color}`}>
                        <BrainCircuit size={14} />
                        <span>{aiInsight.text}</span>
                      </div>
                    </div>
                  );
                })}
                {displayedPatients.length === 0 && <div className="text-center p-10 text-muted">לא נמצאו לקוחות תחת סינון זה.</div>}
              </div>
            </div>
          </div>
        )}

        {/* ----- הבונה החכם המבוסס ימים ----- */}
        {adminTab === "builder" && (
          <div className="max-w-7xl mx-auto h-full flex flex-col">
            <AdminCoPilotDrawer contextData={builderCoPilotContext} />
            <header className="mb-6 flex flex-col md:flex-row md:items-center justify-between gap-4">
              <h1 className="text-2xl md:text-3xl font-black text-fg tracking-tight flex items-center gap-3">
                <Wand2 className="text-accent-fg" size={28} /> בונה חכם & תבניות
              </h1>

              <div className="flex bg-elevated p-1.5 rounded-full border border-line">
                <button onClick={() => setBuilderMode("patient")} className={`px-6 py-2.5 rounded-full font-extrabold text-[13px] transition-all ${builderMode === "patient" ? "bg-accent text-on-accent" : "text-muted hover:text-fg"}`}>
                  שיוך למטופל
                </button>
                <button onClick={() => setBuilderMode("protocol")} className={`px-6 py-2.5 rounded-full font-bold text-[13px] transition-all ${builderMode === "protocol" ? "bg-accent text-on-accent" : "text-muted hover:text-fg"}`}>
                  יצירת תבנית עבודה
                </button>
              </div>
            </header>

            <div className="bg-elevated border border-accent/25 rounded-[1.75rem] p-6 md:p-7 mb-5 flex flex-col md:flex-row items-center gap-5 relative overflow-hidden">
              <div className="absolute -top-8 -left-2.5 opacity-[0.08] text-accent-fg pointer-events-none">
                <Sparkles size={140} />
              </div>
              <div className="flex-1 w-full z-10">
                <label className="block text-[11px] font-extrabold text-accent-fg mb-2.5 uppercase tracking-widest">עוזר קליני AI</label>
                <input
                  type="text"
                  value={aiPrompt}
                  onChange={(e) => setAiPrompt(e.target.value)}
                  placeholder="למשל: בנה לי תוכנית שיקום וכוח עם דגש על מוביליטי..."
                  className="on-light w-full bg-surface border border-line p-3.5 rounded-2xl text-fg placeholder:text-muted focus:border-focus focus:ring-2 focus:ring-focus outline-none"
                />
              </div>
              <button
                onClick={handleAiGenerate}
                disabled={isAiLoading}
                className="w-full md:w-auto bg-btn-primary hover:bg-btn-primary-hover active:bg-btn-primary-active text-btn-primary-fg px-7 py-4 rounded-2xl font-black transition-all shadow-[0_12px_28px_-10px_color-mix(in_srgb,var(--accent)_50%,transparent)] disabled:bg-disabled disabled:text-disabled-fg disabled:hover:bg-disabled z-10 flex items-center justify-center gap-2 whitespace-nowrap"
              >
                {isAiLoading ? (
                  "מייצר קסם..."
                ) : (
                  <>
                    <Sparkles size={16} /> ייצר פרומפט תרגילים
                  </>
                )}
              </button>
            </div>

            {/* UI Mockup for Automated Periodization (הכנה לשדרוג הבא) — stays collapsed by default, don't auto-expand */}
            <div className="mb-5 bg-accent/5 border border-accent/20 p-4 md:p-5 rounded-2xl flex items-center justify-between gap-4">
              <div className="flex items-center gap-3">
                <History className="text-accent-fg shrink-0" size={20} />
                <div>
                  <h4 className="font-extrabold text-accent-fg text-[13px] flex items-center gap-2">
                    פריודיזציה אוטומטית <span className="text-accent-fg font-bold text-[10px] bg-accent/15 px-2 py-0.5 rounded-full">בטא</span>
                  </h4>
                  <p className="text-[11px] text-muted mt-0.5">הגדר חוקי התקדמות והמערכת תייצר עבורך 12 שבועות קדימה אוטומטית.</p>
                </div>
              </div>
              <button onClick={() => setEnablePeriodizationUI(!enablePeriodizationUI)} className="bg-transparent border border-btn-secondary text-accent-fg px-4 py-2.5 rounded-xl text-xs font-bold hover:bg-btn-secondary-hover transition-colors whitespace-nowrap">
                {enablePeriodizationUI ? "סגור הגדרות" : "הגדר חוקים"}
              </button>
            </div>

            {enablePeriodizationUI && (
              <div className="on-light mb-5 bg-surface border border-line p-6 rounded-2xl">
                <h4 className="font-black text-fg mb-4">הגדרת חוקי התקדמות לפרוטוקול</h4>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div>
                    <label className="block text-xs font-bold text-muted uppercase mb-1">מחזור התקדמות</label>
                    <select className="on-light w-full bg-surface-alt p-2.5 rounded-xl border border-line-input outline-none text-sm font-bold text-fg">
                      <option>כל שבוע</option>
                      <option>כל שבועיים</option>
                    </select>
                  </div>
                  <div>
                    <label className="block text-xs font-bold text-muted uppercase mb-1">פקודת עומס (Progressive Overload)</label>
                    <select className="on-light w-full bg-surface-alt p-2.5 rounded-xl border border-line-input outline-none text-sm font-bold text-fg">
                      <option>הוסף 1 חזרה לכל הסטים</option>
                      <option>הוסף 2.5 ק&quot;ג למשקל</option>
                      <option>הוסף סט 1 לכל תרגיל</option>
                    </select>
                  </div>
                  <div>
                    <label className="block text-xs font-bold text-muted uppercase mb-1">דילואוד (Deload)</label>
                    <select className="on-light w-full bg-surface-alt p-2.5 rounded-xl border border-line-input outline-none text-sm font-bold text-fg">
                      <option>שבוע 4: חתוך סטים ב-50%</option>
                      <option>שבוע 8: הורד משקל ב-20%</option>
                      <option>ללא דילואוד מובנה</option>
                    </select>
                  </div>
                </div>
                <p className="text-[10px] text-muted mt-4">* מנגנון הפריודיזציה נמצא כרגע בגרסת בטא (UI Mockup) ויופעל בעדכון הקרוב.</p>
              </div>
            )}

            <div className="flex flex-col lg:flex-row gap-5 flex-1 min-h-[500px]">
              <div className="on-light w-full lg:w-[340px] lg:shrink-0 bg-surface rounded-3xl border border-line flex flex-col overflow-hidden">
                <div className="p-5 border-b border-line space-y-2.5">
                  <h3 className="font-extrabold text-fg mb-1 flex items-center gap-2 text-sm">
                    <ImageIcon size={16} className="text-accent-fg" /> ספריית תרגילים
                  </h3>
                  <div className="relative">
                    <Search size={14} className="pointer-events-none absolute top-1/2 right-3 -translate-y-1/2 text-muted" />
                    <input
                      type="text"
                      value={builderNameQuery}
                      onChange={(e) => setBuilderNameQuery(e.target.value)}
                      placeholder="חפש תרגיל לפי שם..."
                      className="on-light w-full bg-surface-alt border border-line-input p-2.5 pr-9 rounded-xl text-xs font-bold text-fg placeholder:text-muted outline-none focus:border-focus focus:ring-2 focus:ring-focus"
                    />
                  </div>
                  <select value={builderSearchFilter} onChange={(e) => setBuilderSearchFilter(e.target.value)} className="on-light w-full bg-surface-alt border border-line-input p-2.5 rounded-xl text-xs font-bold text-fg outline-none">
                    <option value="all">-- כל התגיות --</option>
                    {ADMIN_TAGS.map((t) => (
                      <option key={t.id} value={t.id}>
                        {t.label}
                      </option>
                    ))}
                  </select>
                  <div className="grid grid-cols-2 gap-2">
                    <select value={builderMuscleFilter} onChange={(e) => setBuilderMuscleFilter(e.target.value)} className="on-light w-full bg-surface-alt border border-line-input p-2.5 rounded-xl text-[11px] font-bold text-fg outline-none">
                      <option value="all">-- שריר --</option>
                      {MUSCLE_REGIONS.map((region) => (
                        <optgroup key={region.id} label={region.label}>
                          {AVAILABLE_MUSCLES.filter((m) => region.muscleIds.includes(m.id)).map((m) => (
                            <option key={m.id} value={m.id}>
                              {m.label}
                            </option>
                          ))}
                        </optgroup>
                      ))}
                    </select>
                    <select value={builderEquipmentFilter} onChange={(e) => setBuilderEquipmentFilter(e.target.value)} className="on-light w-full bg-surface-alt border border-line-input p-2.5 rounded-xl text-[11px] font-bold text-fg outline-none">
                      <option value="all">-- ציוד --</option>
                      {EQUIPMENT_LIST.map((eq) => (
                        <option key={eq.id} value={eq.id}>
                          {eq.label}
                        </option>
                      ))}
                    </select>
                  </div>
                </div>
                <div className="flex-1 overflow-y-auto p-3.5 space-y-2.5">
                  {filteredExercisesForBuilder.length === 0 && <p className="text-center text-muted text-xs font-semibold p-4">אין תרגילים העונים לסינון.</p>}
                  {filteredExercisesForBuilder.map((ex) => {
                    const style = ADMIN_CATEGORY_STYLES[ex.categories?.[0]] ?? DEFAULT_ADMIN_CATEGORY_STYLE;
                    return (
                      <div
                        key={ex.id}
                        draggable
                        onDragStart={(e) => handleDragStart(e, ex)}
                        className="on-light bg-surface-alt p-2.5 rounded-2xl border border-line cursor-grab hover:border-accent/50 transition-colors flex items-center gap-2.5 group active:cursor-grabbing"
                      >
                        <div className="text-muted group-hover:text-accent-fg shrink-0">
                          <GripVertical size={18} />
                        </div>
                        <div className="w-[38px] h-[38px] rounded-[10px] shrink-0" style={{ background: `linear-gradient(150deg, ${style.glow}, var(--bg-elevated))` }}></div>
                        <div className="min-w-0 flex-1">
                          <h4 className="font-extrabold text-fg text-xs leading-tight truncate">{getExerciseName(ex, lang)}</h4>
                          <span className="text-[9px] font-extrabold px-2 py-0.5 rounded-full mt-1 inline-block" style={{ color: style.text, background: style.bg }}>
                            {(ex.categories || []).join(" / ")}
                          </span>
                        </div>
                        <button
                          type="button"
                          onClick={() => addExerciseToDay(builderActiveDayId, ex)}
                          title={`הוסף ליום ${DAYS_OF_WEEK.find((d) => d.id === builderActiveDayId)?.label ?? ""}`}
                          className="shrink-0 w-7 h-7 rounded-full bg-accent/15 text-accent-fg hover:bg-accent hover:text-on-accent flex items-center justify-center transition-colors"
                        >
                          <Plus size={14} />
                        </button>
                      </div>
                    );
                  })}
                </div>
              </div>

              <div className="on-light w-full lg:flex-1 bg-surface rounded-3xl border border-line p-7 flex flex-col min-w-0">
                <div className="mb-5 flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-line pb-4.5">
                  <h3 className="font-extrabold text-fg text-base flex items-center gap-2">
                    <Map size={17} className="text-accent-fg" /> ציר זמן התוכנית
                  </h3>
                  <div className="flex items-center gap-1.5 overflow-x-auto pb-1 no-scrollbar">
                    {Object.keys(builderPlan).map((weekNum) => (
                      <button
                        key={weekNum}
                        onClick={() => handleBuilderWeekChange(parseInt(weekNum))}
                        className={`px-4 py-2 rounded-xl font-extrabold text-xs transition-colors border ${
                          builderSelectedWeek === parseInt(weekNum) ? "bg-surface-alt text-fg border-line" : "bg-transparent text-muted border-transparent hover:bg-surface-alt"
                        }`}
                      >
                        שבוע {weekNum}
                      </button>
                    ))}
                    <button
                      onClick={() => handleBuilderWeekChange(Math.max(...Object.keys(builderPlan).map(Number)) + 1)}
                      className="w-[30px] h-[30px] rounded-full bg-accent/10 text-accent-fg hover:bg-accent/20 flex items-center justify-center font-bold transition-colors border border-accent/30"
                      title="הוסף שבוע חדש לתוכנית"
                    >
                      <Plus size={16} />
                    </button>
                  </div>
                </div>

                <div className="on-light mb-5 bg-surface-alt p-5 rounded-2xl border border-line flex flex-col gap-4">
                  {builderMode === "patient" ? (
                    <div className="flex flex-col md:flex-row gap-6">
                      <div className="flex-1">
                        <label className="block text-[10px] font-extrabold text-muted mb-2 uppercase tracking-wider">שיוך למטופל</label>
                        <select value={builderPatientId} onChange={(e) => setBuilderPatientId(e.target.value)} className="w-full border-b-2 border-accent p-1.5 outline-none font-bold text-fg bg-transparent">
                          <option value="" className="on-light bg-surface-alt">
                            -- בחר מטופל יעד --
                          </option>
                          {patients.map((p) => (
                            <option key={p.id} value={p.id} className="on-light bg-surface-alt">
                              {p.full_name}
                            </option>
                          ))}
                        </select>
                      </div>

                      <div className="flex-1">
                        <label className="block text-[10px] font-extrabold text-muted mb-2 uppercase tracking-wider">שם התוכנית (מה שהמטופל יראה)</label>
                        <input
                          type="text"
                          value={builderProgramName}
                          onChange={(e) => setBuilderProgramName(e.target.value)}
                          placeholder="למשל: חיזוק ברך — שלב א׳"
                          className="w-full border-b-2 border-line-input p-1.5 outline-none font-bold text-fg placeholder:text-muted bg-transparent"
                        />
                      </div>

                      <div className="flex-1">
                        <label className="block text-[10px] font-extrabold text-accent-fg mb-2 uppercase tracking-wider flex items-center gap-1.5">
                          <DownloadCloud size={11} /> טען תבנית פרוטוקול ללוח
                        </label>
                        <select onChange={loadProtocolToBuilder} className="w-full border-b-2 border-accent-fg/60 p-1.5 outline-none font-bold text-accent-fg bg-transparent">
                          <option value="" className="on-light bg-surface-alt">
                            -- בחר פרוטוקול --
                          </option>
                          {packages.map((p) => (
                            <option key={p.id} value={p.id} className="on-light bg-surface-alt">
                              {p.title}
                            </option>
                          ))}
                        </select>
                      </div>
                    </div>
                  ) : (
                    <div className="flex flex-col md:flex-row gap-6">
                      <div className="flex-1">
                        <label className="block text-[10px] font-extrabold text-muted mb-2 uppercase tracking-wider">שם התבנית (פרוטוקול)</label>
                        <input
                          type="text"
                          value={builderProtocolName}
                          onChange={(e) => setBuilderProtocolName(e.target.value)}
                          placeholder="למשל: קליסטניקס רמה 1 (12 שבועות)"
                          className="w-full border-b-2 border-line-input p-1.5 outline-none font-bold text-fg placeholder:text-muted bg-transparent"
                        />
                      </div>
                      <div className="flex-1">
                        <label className="block text-[10px] font-extrabold text-muted mb-2 uppercase tracking-wider">תיאור קצר (אופציונלי)</label>
                        <input
                          type="text"
                          value={builderProtocolDesc}
                          onChange={(e) => setBuilderProtocolDesc(e.target.value)}
                          placeholder="כוח ומתיחות למתחילים..."
                          className="w-full border-b-2 border-line-input p-1.5 outline-none text-fg placeholder:text-muted bg-transparent"
                        />
                      </div>
                    </div>
                  )}
                </div>

                {/* אזורי הגרירה - ימות השבוע (DAYS_OF_WEEK is already ordered ראשון→שבת — keep it that way) */}
                <div className="flex-1 overflow-y-auto space-y-3.5 pr-2">
                  {DAYS_OF_WEEK.map((day) => {
                    const currentWeekBlocks = builderPlan[builderSelectedWeek] || getInitialDays();
                    const currentDayItems = currentWeekBlocks[day.id] || [];
                    const hasItems = currentDayItems.length > 0;
                    const isOpen = openBuilderDayIds.has(day.id);
                    const isActiveDay = builderActiveDayId === day.id;

                    return (
                      <div
                        key={day.id}
                        onDragOver={handleDragOver}
                        onDrop={(e) => handleDrop(e, day.id)}
                        className={`border-2 border-dashed rounded-[1.375rem] p-4.5 transition-colors flex flex-col ${hasItems ? "border-accent/30 bg-accent/5" : "border-line bg-surface"} ${
                          isActiveDay ? "ring-1 ring-focus/40" : ""
                        }`}
                      >
                        <div className="flex items-center gap-2">
                          <button type="button" onClick={() => toggleBuilderDayOpen(day.id)} className="flex-1 flex items-center gap-3 text-start">
                            {isOpen ? <ChevronUp size={16} className="text-muted shrink-0" /> : <ChevronDown size={16} className="text-muted shrink-0" />}
                            <div className={`px-4 py-1.5 rounded-[10px] flex items-center justify-center font-extrabold text-[13px] border ${hasItems ? "bg-accent text-on-accent border-accent" : "bg-surface-alt text-fg border-line"}`}>
                              יום {day.label}
                            </div>
                            {hasItems ? (
                              <span className="text-xs font-bold text-muted">{currentDayItems.length} תרגילים</span>
                            ) : (
                              <span className="text-xs font-semibold text-muted">גרור תרגילים לכאן</span>
                            )}
                          </button>
                          <button
                            type="button"
                            onClick={() => duplicateBuilderDay(day.id)}
                            title="שכפל יום לתוך יום ריק אחר"
                            className="shrink-0 p-2 text-muted hover:text-accent-fg hover:bg-accent/10 rounded-xl transition-colors"
                          >
                            <Copy size={15} />
                          </button>
                        </div>

                        {isOpen && hasItems && (
                          <div className="space-y-2 mt-3.5">
                            {currentDayItems.map((ex: any) => (
                              <div key={ex.temp_id} className="on-light bg-surface p-2.5 rounded-2xl border border-line flex flex-wrap items-center gap-2.5">
                                <h5 className="font-extrabold text-fg text-[13px] flex-1 min-w-[120px] line-clamp-1">{getExerciseName(ex, lang)}</h5>

                                <div className="on-light flex items-center gap-1.5 bg-surface-alt p-1.5 rounded-xl border border-line">
                                  <span className="text-muted text-[10px] font-bold uppercase ml-1">בלוק</span>
                                  <input
                                    type="text"
                                    value={ex.block || "A"}
                                    onChange={(e) => updateBuilderExercise(day.id, ex.temp_id, "block", e.target.value.toUpperCase())}
                                    className="w-8 text-center bg-transparent outline-none font-black text-fg"
                                    placeholder="A"
                                  />
                                </div>

                                <div className="on-light flex items-center gap-1.5 bg-surface-alt p-1.5 rounded-xl border border-line">
                                  <input type="number" value={ex.sets} onChange={(e) => updateBuilderExercise(day.id, ex.temp_id, "sets", parseInt(e.target.value))} className="w-12 text-center bg-transparent outline-none font-bold text-sm text-fg" />
                                  <span className="text-muted text-xs font-bold">סטים</span>
                                </div>
                                <div className="on-light flex items-center gap-1.5 bg-surface-alt p-1.5 rounded-xl border border-line">
                                  <input type="number" value={ex.reps} onChange={(e) => updateBuilderExercise(day.id, ex.temp_id, "reps", parseInt(e.target.value))} className="w-12 text-center bg-transparent outline-none font-bold text-sm text-fg" />
                                  <button onClick={() => updateBuilderExercise(day.id, ex.temp_id, "is_time", !ex.is_time)} className="text-muted text-xs font-bold hover:text-accent-fg w-10">
                                    {ex.is_time ? "שניות" : "חזרות"}
                                  </button>
                                </div>
                                <div className="on-light flex items-center gap-1 bg-surface-alt p-1.5 rounded-xl border border-line">
                                  <input
                                    type="number"
                                    value={ex.rir || ""}
                                    onChange={(e) => updateBuilderExercise(day.id, ex.temp_id, "rir", e.target.value ? parseInt(e.target.value) : null)}
                                    placeholder="-"
                                    className="w-10 text-center bg-transparent outline-none font-bold text-sm text-fg placeholder:text-muted"
                                  />
                                  <span className="text-muted text-xs font-bold flex items-center gap-1">
                                    RIR{" "}
                                    <button onClick={showRirInfo} className="text-muted hover:text-accent-fg">
                                      <HelpCircle size={12} />
                                    </button>
                                  </span>
                                </div>
                                {!ex.is_time && (
                                  <div className="on-light flex items-center gap-1 bg-surface-alt p-1.5 rounded-xl border border-line" title="משקל יעד (לא חובה) — אם ריק, לא יוצג למטופל">
                                    <input
                                      type="number"
                                      min={0}
                                      step="0.5"
                                      value={ex.weight_kg ?? ""}
                                      onChange={(e) => updateBuilderExercise(day.id, ex.temp_id, "weight_kg", parseWeightInput(e.target.value))}
                                      placeholder="-"
                                      className="w-10 text-center bg-transparent outline-none font-bold text-sm text-fg placeholder:text-muted"
                                    />
                                    <span className="text-muted text-xs font-bold">ק״ג</span>
                                  </div>
                                )}
                                <div className="on-light flex items-center gap-1 bg-surface-alt p-1.5 rounded-xl border border-line">
                                  <Clock size={12} className="text-muted shrink-0" />
                                  {REST_TIME_PRESETS.map((secs) => (
                                    <button
                                      key={secs}
                                      onClick={() => updateBuilderExercise(day.id, ex.temp_id, "rest_time_seconds", secs)}
                                      className={`px-1.5 py-1 rounded-lg text-[10px] font-bold transition-colors ${
                                        (ex.rest_time_seconds ?? 60) === secs ? "bg-accent text-on-accent" : "text-muted hover:text-accent-fg"
                                      }`}
                                    >
                                      {secs}
                                    </button>
                                  ))}
                                  <input
                                    type="number"
                                    value={REST_TIME_PRESETS.includes(ex.rest_time_seconds ?? 60) ? "" : (ex.rest_time_seconds ?? "")}
                                    onChange={(e) => updateBuilderExercise(day.id, ex.temp_id, "rest_time_seconds", e.target.value ? parseInt(e.target.value) : 60)}
                                    placeholder="אחר"
                                    className="w-9 text-center bg-transparent outline-none font-bold text-[10px] text-fg placeholder:text-muted"
                                  />
                                </div>
                                <button onClick={() => removeBuilderExercise(day.id, ex.temp_id)} className="p-2 text-danger-fg hover:bg-danger/10 rounded-xl transition-colors">
                                  <Trash2 size={16} />
                                </button>
                              </div>
                            ))}
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>

                <div className="mt-5 pt-5 border-t border-line flex justify-end">
                  <button
                    onClick={saveBuilderPlan}
                    className={`px-9 py-3.5 rounded-2xl font-black text-[15px] transition-colors shadow-lg flex items-center gap-2 ${
                      builderMode === "patient" ? "bg-btn-primary text-btn-primary-fg hover:bg-btn-primary-hover shadow-[0_14px_32px_-10px_color-mix(in_srgb,var(--accent)_50%,transparent)]" : "bg-btn-primary text-btn-primary-fg hover:bg-btn-primary-hover active:bg-btn-primary-active"
                    }`}
                  >
                    <Save size={18} /> {builderMode === "patient" ? "שגר למטופל" : "שמור תבנית למאגר"}
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}

        {adminTab === "workout_builder" && <WorkoutBuilderTab exercises={exercises} patients={patients} lang={lang} />}

        {adminTab === "program_library" && <ProgramLibraryTab packages={packages} exercises={exercises} patients={patients} onRefresh={fetchAdminData} />}

        {adminTab === "exercises" && (
          <ExerciseLibraryTab exercises={exercises} internalNotesByExerciseId={internalNotesByExerciseId} lang={lang} onRefresh={fetchAdminData} />
        )}

        {adminTab === "manage_plans" && (
          <div className="max-w-6xl mx-auto">
            <header className="mb-10 hidden md:block">
              <h1 className="text-3xl md:text-4xl font-black text-fg tracking-tight">עריכת תוכניות פעילות</h1>
            </header>
            <div className="on-light bg-surface rounded-[1.75rem] border border-line p-8 md:p-10">
              <div className="mb-8">
                <label className="block text-sm font-bold text-muted mb-2 uppercase">בחר מטופל לעריכת התוכנית שלו</label>
                <select value={managePatientId} onChange={(e) => setManagePatientId(e.target.value)} className="w-full md:w-1/2 border-b-2 border-line-input p-3 bg-transparent text-fg outline-none focus:border-focus focus:ring-2 focus:ring-focus">
                  <option value="" className="on-light bg-surface-alt">
                    -- בחר מטופל --
                  </option>
                  {patients.map((p) => (
                    <option key={p.id} value={p.id} className="on-light bg-surface-alt">
                      {p.full_name}
                    </option>
                  ))}
                </select>
              </div>

              {!managePatientId ? (
                <div className="on-light text-center p-10 text-muted bg-surface-alt rounded-3xl border border-line">בחר מטופל מהרשימה כדי לצפות ולערוך את התוכנית הפעילה שלו.</div>
              ) : managePatientExercises.length === 0 ? (
                <div className="on-light text-center p-10 text-muted bg-surface-alt rounded-3xl border border-line">למטופל זה אין תרגילים משויכים כרגע.</div>
              ) : (
                <div className="space-y-10">
                  {groupAssignmentsByProgram(managePatientExercises, managePrograms).map((group) => (
                    <section key={group.key} className="space-y-4">
                      <div className="flex flex-wrap items-center justify-between gap-3 border-b border-line pb-3">
                        <div>
                          <h3 className="text-xl font-black text-fg">{group.name}</h3>
                          <p className="text-xs font-bold text-muted mt-0.5">
                            {group.program ? "תוכנית משויכת" : "נשמר ע״י המטופל מבונה האימונים"} · {group.items.length} תרגילים
                          </p>
                        </div>
                        {group.program && (
                          <div className="flex gap-2">
                            <button onClick={() => handleRenameProgram(group.program!)} className="bg-surface-alt border border-line text-fg px-4 py-2 rounded-xl text-sm font-bold flex items-center gap-2 hover:bg-line">
                              <Edit3 size={14} /> שנה שם
                            </button>
                            <button onClick={() => handleDeleteProgram(group.program!)} className="bg-danger text-on-danger px-4 py-2 rounded-xl text-sm font-bold flex items-center gap-2 hover:brightness-110">
                              <Trash2 size={14} /> מחק תוכנית
                            </button>
                          </div>
                        )}
                      </div>
                      {group.items.map((assign) => (
                        <div key={assign.id} className="on-light border border-line p-5 rounded-2xl flex flex-col md:flex-row justify-between items-start md:items-center gap-4 hover:border-line-input transition-colors bg-surface-alt">
                          <div className="flex-1 w-full">
                            <h4 className="text-lg font-black text-fg">{assign.exercise && getExerciseName(assign.exercise, lang)}</h4>
                            <p className="text-sm font-bold text-accent-fg mb-2">{(assign.exercise?.categories || []).join(" / ")}</p>
    
                            {editingAssignId === assign.id ? (
                              <div className="on-light flex flex-col gap-3 mt-4 bg-surface p-4 rounded-xl border border-line">
                                <div className="flex flex-wrap gap-3">
                                  <div>
                                    <label className="block text-xs font-bold text-muted uppercase">שבוע</label>
                                    <input
                                      type="number"
                                      value={editAssignForm.week}
                                      onChange={(e) => setEditAssignForm({ ...editAssignForm, week: parseInt(e.target.value) })}
                                      className="w-16 border-b border-line-input bg-transparent text-fg p-1 text-center font-bold"
                                      min="1"
                                    />
                                  </div>
                                  <div>
                                    <label className="block text-xs font-bold text-muted uppercase">בלוק</label>
                                    <input
                                      type="text"
                                      value={editAssignForm.block}
                                      onChange={(e) => setEditAssignForm({ ...editAssignForm, block: e.target.value })}
                                      className="w-16 border-b border-line-input bg-transparent text-fg p-1 text-center font-bold"
                                    />
                                  </div>
                                  <div>
                                    <label className="block text-xs font-bold text-muted uppercase">סטים</label>
                                    <input
                                      type="number"
                                      value={editAssignForm.sets}
                                      onChange={(e) => setEditAssignForm({ ...editAssignForm, sets: String(e.target.value) })}
                                      className="w-16 border-b border-line-input bg-transparent text-fg p-1 text-center"
                                    />
                                  </div>
                                  <div>
                                    <label className="block text-xs font-bold text-muted uppercase flex items-center justify-between">
                                      יעד{" "}
                                      <button onClick={() => setEditAssignForm({ ...editAssignForm, is_time: !editAssignForm.is_time })} className="text-[8px] text-accent-fg ml-1">
                                        {editAssignForm.is_time ? "שנה לחזרות" : "שנה לזמן"}
                                      </button>
                                    </label>
                                    <input
                                      type="text"
                                      inputMode="numeric"
                                      dir="ltr"
                                      value={editAssignForm.reps}
                                      onChange={(e) => setEditAssignForm({ ...editAssignForm, reps: String(e.target.value) })}
                                      placeholder={editAssignForm.is_time ? "שניות" : "10 / 8-12"}
                                      className="w-16 border-b border-line-input bg-transparent text-fg placeholder:text-muted p-1 text-center"
                                    />
                                  </div>
                                  <div>
                                    <label className="block text-xs font-bold text-muted uppercase">RIR</label>
                                    <input
                                      type="number"
                                      value={editAssignForm.rir}
                                      onChange={(e) => setEditAssignForm({ ...editAssignForm, rir: String(e.target.value) })}
                                      placeholder="-"
                                      className="w-16 border-b border-line-input bg-transparent text-fg placeholder:text-muted p-1 text-center"
                                    />
                                  </div>
                                  <div>
                                    <label className="block text-xs font-bold text-muted uppercase">משקל (ק״ג)</label>
                                    <input
                                      type="text"
                                      inputMode="decimal"
                                      value={editAssignForm.weight_kg}
                                      onChange={(e) => setEditAssignForm({ ...editAssignForm, weight_kg: e.target.value })}
                                      placeholder="-"
                                      className="w-16 border-b border-line-input bg-transparent text-fg placeholder:text-muted p-1 text-center"
                                    />
                                  </div>
                                  <div className="flex-1 min-w-[150px]">
                                    <label className="block text-xs font-bold text-muted uppercase">הערה</label>
                                    <input
                                      type="text"
                                      value={editAssignForm.notes}
                                      onChange={(e) => setEditAssignForm({ ...editAssignForm, notes: e.target.value })}
                                      className="w-full border-b border-line-input bg-transparent text-fg p-1"
                                    />
                                  </div>
                                </div>
                                <div className="w-full mt-2">
                                  <label className="block text-xs font-bold text-muted uppercase mb-2">ימי אימון מתוכננים</label>
                                  <div className="flex flex-wrap gap-1">
                                    {DAYS_OF_WEEK.map((day) => {
                                      const isSelected = editAssignForm.scheduled_days.includes(day.id);
                                      return (
                                        <button
                                          key={day.id}
                                          type="button"
                                          onClick={() => setEditAssignForm((prev) => ({ ...prev, scheduled_days: isSelected ? prev.scheduled_days.filter((d) => d !== day.id) : [...prev.scheduled_days, day.id] }))}
                                          className={`px-3 py-1.5 rounded-lg font-bold text-xs transition-colors ${isSelected ? "bg-accent text-on-accent" : "bg-surface-alt text-muted border border-line"}`}
                                        >
                                          {day.label}
                                        </button>
                                      );
                                    })}
                                  </div>
                                </div>
                              </div>
                            ) : (
                              <div className="flex flex-col gap-2">
                                <div className="flex flex-wrap gap-2 text-sm font-medium text-muted">
                                  <span className="on-light bg-surface-alt px-3 py-1 rounded-lg border border-line">
                                    {assign.scheduled_date ? "תאריך: " : "שבוע: "}<strong className="text-fg">{assign.scheduled_date ? new Date(`${assign.scheduled_date}T00:00:00`).toLocaleDateString("he-IL") : (assign.week ?? "כל שבוע")}</strong>
                                  </span>
                                  <span className="on-light bg-surface-alt px-3 py-1 rounded-lg border border-line">
                                    בלוק: <strong className="text-fg">{assign.block || "A"}</strong>
                                  </span>
                                  <span className="on-light bg-surface-alt px-3 py-1 rounded-lg border border-line">
                                    סטים: <strong className="text-fg">{assign.sets}</strong>
                                  </span>
                                  <span className="on-light bg-surface-alt px-3 py-1 rounded-lg border border-line inline-flex items-center gap-1.5">
                                    {assign.is_time ? <Clock size={12} /> : <Repeat size={12} />} {assign.is_time ? "שניות:" : "חזרות:"} <strong className="text-fg">{assign.is_time ? assign.reps : formatRepTarget(assign.reps, assign.reps_max)}</strong>
                                  </span>
                                  {assign.rir && (
                                    <span className="on-light bg-surface-alt px-3 py-1 rounded-lg border border-line">
                                      RIR: <strong className="text-fg">{assign.rir}</strong>
                                    </span>
                                  )}
                                  {formatWeightKg(assign.weight_kg) && (
                                    <span className="on-light bg-surface-alt px-3 py-1 rounded-lg border border-line">
                                      משקל: <strong className="text-fg">{formatWeightKg(assign.weight_kg)}</strong>
                                    </span>
                                  )}
                                  {assign.notes && <span className="on-light bg-surface-alt px-3 py-1 rounded-lg border border-line max-w-[200px] truncate">הערה: {assign.notes}</span>}
                                </div>
                                {assign.scheduled_days && (
                                  <div className="flex flex-wrap gap-1 mt-1">
                                    {assign.scheduled_days.split(",").map((dayId: string) => {
                                      const dayLabel = DAYS_OF_WEEK.find((d) => d.id === dayId)?.label;
                                      return (
                                        <span key={dayId} className="bg-accent/10 text-accent-fg px-2 py-0.5 rounded-md text-xs font-bold border border-accent/20">
                                          {dayLabel}
                                        </span>
                                      );
                                    })}
                                  </div>
                                )}
                              </div>
                            )}
                          </div>
                          <div className="flex gap-2 w-full md:w-auto mt-4 md:mt-0">
                            {editingAssignId === assign.id ? (
                              <>
                                <button onClick={() => handleSaveEditAssign(assign.id)} className="flex-1 md:flex-none bg-btn-primary text-btn-primary-fg px-4 py-2 rounded-xl font-bold flex items-center justify-center gap-2 hover:bg-btn-primary-hover active:bg-btn-primary-active">
                                  <Save size={16} /> שמור
                                </button>
                                <button onClick={() => setEditingAssignId(null)} className="on-light flex-1 md:flex-none bg-surface-alt text-fg px-4 py-2 rounded-xl font-bold hover:bg-line">
                                  ביטול
                                </button>
                              </>
                            ) : (
                              <>
                                <button onClick={() => handleStartEditAssign(assign)} className="on-light flex-1 md:flex-none bg-surface-alt border border-line text-fg px-4 py-2 rounded-xl font-bold flex items-center justify-center gap-2 hover:bg-line">
                                  <Edit3 size={16} /> ערוך
                                </button>
                                <button onClick={() => handleDeleteAssignment(assign.id)} className="flex-1 md:flex-none bg-danger text-on-danger px-4 py-2 rounded-xl font-bold flex items-center justify-center gap-2 hover:brightness-110">
                                  <Trash2 size={16} /> מחק
                                </button>
                              </>
                            )}
                          </div>
                        </div>
                      ))}
                    </section>
                  ))}
                </div>
              )}
            </div>
          </div>
        )}

        {adminTab === "research" && (
          <div className="max-w-6xl mx-auto">
            <header className="mb-10 hidden md:block">
              <h1 className="text-3xl md:text-4xl font-black text-fg tracking-tight">מחקר ועדכוני &quot;הידעת?&quot;</h1>
              <p className="text-[13px] text-muted mt-1.5">חפש ספרות אקדמית מדורגת לפי ציטוטים, ובחר אילו ממצאים יוצגו למטופלים כעובדות &quot;הידעת?&quot; באפליקציה.</p>
            </header>

            <div className="on-light bg-surface rounded-[1.75rem] border border-line p-8 md:p-10 mb-10">
              <form onSubmit={handleResearchSearch} className="flex flex-col md:flex-row md:items-end gap-4">
                <textarea
                  value={researchQuery}
                  onChange={(e) => setResearchQuery(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === "Enter" && !e.shiftKey) {
                      e.preventDefault();
                      runResearchSearch(researchQuery);
                    }
                  }}
                  placeholder="כתוב חופשי מה מעניין אותך — מילת מפתח, שאלה, עברית או אנגלית"
                  rows={2}
                  className="flex-1 resize-none border-b-2 border-line-input p-3 bg-transparent text-fg placeholder:text-muted focus:border-focus focus:ring-2 focus:ring-focus outline-none leading-relaxed"
                  dir="auto"
                  required
                />
                <button
                  type="submit"
                  disabled={isResearchLoading}
                  className="bg-btn-primary text-btn-primary-fg px-8 py-3.5 rounded-2xl font-black hover:bg-btn-primary-hover active:bg-btn-primary-active transition-colors disabled:bg-disabled disabled:text-disabled-fg disabled:hover:bg-disabled disabled:cursor-not-allowed flex items-center justify-center gap-2 shrink-0"
                >
                  {isResearchLoading ? (
                    <>
                      <Loader2 size={18} className="animate-spin" /> מחפש ומנתח...
                    </>
                  ) : (
                    <>
                      <Search size={18} /> חפש מאמרים
                    </>
                  )}
                </button>
              </form>

              <div className="mt-5 flex flex-wrap gap-2">
                {[
                  "האם מתיחות לפני ריצה מונעות פציעות?",
                  "פחד מתנועה אחרי פציעת גב",
                  "כמה חזרות צריך כדי לבנות שריר אחרי גיל 60?",
                  "does sleep affect tendon healing",
                ].map((example) => (
                  <button
                    key={example}
                    type="button"
                    disabled={isResearchLoading}
                    onClick={() => {
                      setResearchQuery(example);
                      runResearchSearch(example);
                    }}
                    className="on-light text-[12px] font-bold text-muted bg-surface-alt border border-line px-3.5 py-2 rounded-full hover:border-accent/40 hover:text-accent-fg transition-colors disabled:opacity-50"
                    dir="auto"
                  >
                    {example}
                  </button>
                ))}
              </div>

              {isResearchLoading && <p className="mt-4 text-[12px] text-muted">מנתב את השאלה למאגרי PubMed ו-Semantic Scholar, מסנן לפי רלוונטיות ומסכם — בדרך כלל 20–40 שניות.</p>}

              {researchError && <div className="mt-5 bg-danger/10 border border-danger/20 text-danger-fg text-sm font-bold px-5 py-3.5 rounded-2xl">{researchError}</div>}
            </div>

            {researchResults && (
              <div className="mb-12">
                <h2 className="text-lg font-extrabold text-fg mb-5 border-b-2 border-accent pb-3 inline-block">
                  תוצאות עבור &quot;{researchInterpretation?.topicHe ?? researchQuery}&quot; ({researchResults.length})
                </h2>
                {researchInterpretation && (
                  <div className="mb-5 text-[12px] text-muted space-y-1">
                    <p dir="ltr" className="text-right">{researchInterpretation.focusEn}</p>
                    <p>
                      שאילתת PubMed: <code dir="ltr" className="text-muted bg-page border border-line px-2 py-0.5 rounded-md">{researchInterpretation.pubmedQuery}</code>
                    </p>
                  </div>
                )}
                {researchResults.length === 0 ? (
                  <div className="text-center p-10 text-muted bg-page rounded-3xl border border-line">לא נמצאו מאמרים מתאימים לנושא זה. נסה ניסוח אחר או נושא רחב יותר.</div>
                ) : (
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
                    {researchResults.map((finding) => {
                      const isSaved = savedFactUrls.has(finding.paperUrl);
                      return (
                        <div key={finding.paperUrl} className="on-light bg-surface rounded-[1.75rem] border border-line p-6 flex flex-col gap-4">
                          <div>
                            <div className="flex flex-wrap items-center gap-1.5">
                              <span className="inline-flex items-center gap-1.5 bg-success/10 text-accent-fg text-[10px] font-extrabold px-3 py-1.5 rounded-full border border-success/20">
                                <Sparkles size={11} /> הידעת?
                              </span>
                              {/* Evidence tier the search ranking already computed (see
                                  classifyEvidence/EVIDENCE_LABEL_HE in researchAgent.ts) —
                                  shown here so the admin can see at a glance why this
                                  paper ranked where it did before publishing it. */}
                              <span
                                title="ציון ראיות: A = מטה-אנליזה/סקירה שיטתית, B = ניסוי מבוקר אקראי, C = מחקר תצפיתי או אחר"
                                className={`inline-flex items-center text-[10px] font-extrabold px-3 py-1.5 rounded-full border ${EVIDENCE_GRADE_STYLE[finding.evidenceGrade]}`}
                              >
                                רמת ראיות {finding.evidenceGrade}
                              </span>
                              <span className="on-light inline-flex items-center bg-surface-alt text-muted text-[10px] font-bold px-3 py-1.5 rounded-full border border-line">
                                {finding.citationLabelHe}
                              </span>
                            </div>
                            <p className="text-fg font-bold text-[15px] leading-relaxed mt-3">{finding.didYouKnowHe}</p>
                          </div>
                          <p className="text-muted text-[13px] leading-relaxed flex-1">{finding.summaryHe}</p>
                          {/* Quality signals — all from the source metadata or the
                              abstract text (see researchAgent.ts), never generated. */}
                          <dl className="on-light grid grid-cols-2 gap-x-4 gap-y-2 bg-surface-alt border border-line rounded-2xl p-3.5 text-[11px]">
                            <div>
                              <dt className="text-muted font-bold">כתב עת</dt>
                              <dd className="text-fg font-bold mt-0.5 line-clamp-2" dir="auto">
                                {finding.venue ?? "לא ידוע"}
                                {finding.isTopTierJournal && <span className="text-accent-fg"> · מוביל בתחום</span>}
                              </dd>
                            </div>
                            <div>
                              <dt className="text-muted font-bold">ציטוטים</dt>
                              <dd className="text-fg font-bold mt-0.5 tabular-nums">{finding.citationCount != null ? finding.citationCount.toLocaleString("he-IL") : "לא זמין (PubMed)"}</dd>
                            </div>
                            <div>
                              <dt className="text-muted font-bold">מדגם</dt>
                              <dd className="text-fg font-bold mt-0.5">{finding.sampleSizeHe ?? "לא צוין בתקציר"}</dd>
                            </div>
                            <div>
                              <dt className="text-muted font-bold">שנה</dt>
                              <dd className="text-fg font-bold mt-0.5 tabular-nums">{finding.year ?? "לא ידוע"}</dd>
                            </div>
                          </dl>
                          <div className="pt-4 border-t border-line">
                            <a
                              href={finding.paperUrl}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="text-[11px] font-bold text-muted hover:text-accent-fg transition-colors line-clamp-2 hover:underline"
                            >
                              {finding.paperTitle} {finding.year ? `(${finding.year})` : ""}
                            </a>
                            <button
                              onClick={() => handleSaveFact(finding)}
                              disabled={isSaved}
                              className={`w-full mt-4 py-3 rounded-xl font-black text-sm flex items-center justify-center gap-2 transition-colors ${
                                isSaved ? "bg-success/10 text-accent-fg cursor-default" : "bg-btn-primary text-btn-primary-fg hover:bg-btn-primary-hover"
                              }`}
                            >
                              {isSaved ? (
                                <>
                                  <Check size={16} /> נשמר באפליקציה
                                </>
                              ) : (
                                <>
                                  <Plus size={16} /> הוסף לאפליקציה
                                </>
                              )}
                            </button>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            )}

            <div>
              <h2 className="text-lg font-extrabold text-fg mb-5 border-b-2 border-success pb-3 inline-block">
                עובדות &quot;הידעת?&quot; <span className="text-success">({curatedFacts.filter((f) => !f.is_hidden).length} פעילות</span>
                {curatedFacts.some((f) => f.is_hidden) && <span className="text-muted"> · {curatedFacts.filter((f) => f.is_hidden).length} מוסתרות</span>}
                <span className="text-success">)</span>
              </h2>
              {curatedFacts.length === 0 ? (
                <div className="text-center p-10 text-muted bg-page rounded-3xl border border-line">עדיין לא נשמרו עובדות. חפש נושא למעלה כדי להתחיל.</div>
              ) : (
                <div className="space-y-3">
                  {curatedFacts.map((fact) => (
                    <div key={fact.id} className={`on-light bg-surface border border-line rounded-2xl p-5 flex items-start justify-between gap-4 ${fact.is_hidden ? "opacity-60" : ""}`}>
                      <div className="flex-1">
                        {fact.is_hidden && (
                          <span className="inline-flex items-center gap-1 bg-surface-alt text-muted text-[10px] font-extrabold px-2.5 py-1 rounded-full border border-line mb-2">
                            <EyeOff size={11} /> מוסתר מהמטופלים
                          </span>
                        )}
                        <p className="text-fg font-bold text-sm mb-1">{fact.did_you_know_he}</p>
                        <p className="text-muted text-xs">
                          {fact.paper_title} {fact.year ? `· ${fact.year}` : ""}
                        </p>
                      </div>
                      <div className="shrink-0 flex gap-2">
                        <button
                          onClick={() => handleToggleCuratedFactHidden(fact)}
                          title={fact.is_hidden ? "הצג שוב במטופלים" : "הסתר מהמטופלים (נשאר כאן)"}
                          aria-label={fact.is_hidden ? "הצג שוב במטופלים" : "הסתר מהמטופלים"}
                          className="bg-surface-alt border border-line text-fg p-2.5 rounded-xl hover:bg-line transition-colors"
                        >
                          {fact.is_hidden ? <Eye size={16} /> : <EyeOff size={16} />}
                        </button>
                        <button onClick={() => handleDeleteCuratedFact(fact.id)} title="מחק לצמיתות" aria-label="מחק לצמיתות" className="bg-danger text-on-danger p-2.5 rounded-xl hover:brightness-110 transition-colors">
                          <Trash2 size={16} />
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        )}
      </main>
    </div>
  );
}
