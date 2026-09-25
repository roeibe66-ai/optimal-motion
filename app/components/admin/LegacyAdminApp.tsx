"use client";

import { useEffect, useRef, useState } from "react";
import {
  Activity,
  BrainCircuit,
  Calendar,
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
import ProgramLibraryTab from "@/app/components/admin/tabs/ProgramLibraryTab";
import ExerciseLibraryTab from "@/app/components/admin/tabs/ExerciseLibraryTab";
import { formatAdminDate, getExerciseName } from "@/app/utils/format";
import { getAIInsight } from "@/app/utils/scoring";
import { generateResearchFacts } from "@/app/actions/researchAgent";
import type { AIAssistantContext, CuratedFact, ResearchFinding } from "@/app/types";

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

  const [assignPatientId, setAssignPatientId] = useState("");
  const [assignExerciseId, setAssignExerciseId] = useState("");
  const [assignSets, setAssignSets] = useState("3");
  const [assignReps, setAssignReps] = useState("10");
  const [assignRir, setAssignRir] = useState("");
  const [assignNotes, setAssignNotes] = useState("");
  const [assignBlock, setAssignBlock] = useState("A");
  const [assignIsTime, setAssignIsTime] = useState(false);
  const [assignWeek, setAssignWeek] = useState<number>(1);
  const [assignDays, setAssignDays] = useState<string[]>([]);

  const [managePatientId, setManagePatientId] = useState("");
  const [managePatientExercises, setManagePatientExercises] = useState<any[]>([]);
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
  });

  const [assignExerciseTagFilter, setAssignExerciseTagFilter] = useState<string>("all");

  const [builderMode, setBuilderMode] = useState<"patient" | "protocol">("patient");
  const [builderPatientId, setBuilderPatientId] = useState("");
  const [builderProtocolName, setBuilderProtocolName] = useState("");
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

  const filteredExercisesForAssign = exercises.filter((e) => {
    if (assignExerciseTagFilter === "all") return true;
    return e.admin_tags && e.admin_tags.split(",").includes(assignExerciseTagFilter);
  });

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
      supabase.from("exercises").select("*"),
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
    const { data: assigns } = await supabase.from("patient_exercises").select("*").eq("patient_id", patId);
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

  const handleResearchSearch = async (e: any) => {
    e.preventDefault();
    if (!researchQuery.trim()) return;
    setIsResearchLoading(true);
    setResearchError("");
    setResearchResults(null);
    setSavedFactUrls(new Set());
    const result = await generateResearchFacts(researchQuery);
    setIsResearchLoading(false);
    if (!result.ok) {
      setResearchError(result.error);
      return;
    }
    setResearchResults(result.findings);
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

  const handleDeleteCuratedFact = async (id: string) => {
    if (!confirm("להסיר עובדה זו מהאפליקציה? מטופלים לא יראו אותה יותר.")) return;
    const { error } = await supabase.from("curated_facts").delete().eq("id", id);
    if (error) alert("שגיאה במחיקה: " + error.message);
    else fetchAdminData();
  };

  const handleAssignSingle = async (e: any) => {
    e.preventDefault();
    if (!assignPatientId || !assignExerciseId) return alert("חובה לבחור מטופל ותרגיל");
    const { error } = await supabase.from("patient_exercises").insert([
      {
        patient_id: assignPatientId,
        exercise_id: assignExerciseId,
        sets: parseInt(assignSets),
        reps: parseInt(assignReps),
        rir: assignRir ? parseInt(assignRir) : null,
        notes: assignNotes,
        block: assignBlock,
        scheduled_days: assignDays.length > 0 ? assignDays.join(",") : null,
        is_time: assignIsTime,
        week: assignWeek,
      },
    ]);
    if (error) alert("שגיאה: " + error.message);
    else {
      alert("התרגיל שויך בהצלחה!");
      setAssignNotes("");
      setAssignDays([]);
      setAssignRir("");
      if (managePatientId === assignPatientId) fetchManagePatientExercises(managePatientId);
    }
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
      reps: assign.reps ? String(assign.reps) : "10",
      rir: assign.rir ? String(assign.rir) : "",
      block: String(assign.block || "A"),
      notes: String(assign.notes || ""),
      scheduled_days: assign.scheduled_days ? String(assign.scheduled_days).split(",") : [],
      is_time: Boolean(assign.is_time),
      week: Number(assign.week || 1),
    });
  };

  const handleSaveEditAssign = async (assignId: string) => {
    const { error } = await supabase
      .from("patient_exercises")
      .update({
        sets: parseInt(editAssignForm.sets),
        reps: parseInt(editAssignForm.reps),
        rir: editAssignForm.rir ? parseInt(editAssignForm.rir) : null,
        block: editAssignForm.block.toUpperCase(),
        notes: editAssignForm.notes,
        scheduled_days: editAssignForm.scheduled_days.length > 0 ? editAssignForm.scheduled_days.join(",") : null,
        is_time: editAssignForm.is_time,
        week: editAssignForm.week,
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
            newPlan[w][day].push({ ...ex, temp_id: Math.random().toString(), sets: Number(pe.sets) || 0, reps: Number(pe.reps) || 0, rir: pe.rir, is_time: pe.is_time, block: pe.block || "A", rest_time_seconds: pe.rest_time_seconds ?? 60 });
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
            inserts.push({ package_id: pkg.id, exercise_id: ex.id, block: ex.block || "A", sets: ex.sets, reps: ex.reps, rir: ex.rir, is_time: ex.is_time, week: parseInt(w), scheduled_days: dayId, rest_time_seconds: ex.rest_time_seconds || 60 });
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

    const inserts: any[] = [];
    Object.keys(builderPlan).forEach((w) => {
      Object.keys(builderPlan[w as any]).forEach((dayId) => {
        builderPlan[w as any][dayId].forEach((ex) => {
          inserts.push({
            patient_id: builderPatientId,
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
          });
        });
      });
    });

    const { error } = await supabase.from("patient_exercises").insert(inserts);
    if (error) alert("שגיאה בשמירת התוכנית: " + error.message);
    else {
      alert("התוכנית נשמרה ושוגרה בהצלחה! 🚀");
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
    ctx.strokeStyle = "#ef4444";
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
      <div className="fixed inset-0 bg-stone-950 z-[150] flex flex-col" dir="rtl">
        <header className="bg-stone-900 border-b border-stone-800 p-4 flex justify-between items-center text-white">
          <div>
            <h2 className="text-xl font-black flex items-center gap-2">
              <Video className="text-red-500" size={24} /> ניתוח תנועה: {tacticalReviewMode.patientName}
            </h2>
            <p className="text-stone-400 text-sm">{tacticalReviewMode.exerciseTitle}</p>
          </div>
          <div className="flex items-center gap-4">
            <div className="bg-stone-800 rounded-lg p-1 flex gap-1">
              <button className="p-2 bg-stone-700 rounded text-white hover:bg-stone-600 transition-colors" title="צייר קו">
                <PenTool size={18} />
              </button>
              <button onClick={clearCanvas} className="p-2 text-stone-400 hover:text-white hover:bg-stone-700 rounded transition-colors" title="נקה מסך">
                <Eraser size={18} />
              </button>
            </div>
            <button className="bg-red-500 hover:bg-red-600 text-white px-4 py-2 rounded-lg font-bold flex items-center gap-2">
              <Mic size={18} /> הקלט משוב קולי
            </button>
            <button onClick={() => setTacticalReviewMode(null)} className="text-stone-400 hover:text-white p-2">
              <X size={24} />
            </button>
          </div>
        </header>

        <div className="flex-1 flex flex-col lg:flex-row bg-stone-950 p-4 gap-4 overflow-hidden relative">
          <div className="flex-1 bg-black rounded-2xl relative border border-stone-800 overflow-hidden flex items-center justify-center group">
            <span className="absolute top-4 right-4 bg-red-500 text-white text-xs font-bold px-3 py-1 rounded-full z-20 shadow-md">המטופל</span>
            <div className="w-full h-full bg-stone-800 animate-pulse flex items-center justify-center text-stone-600">Video Placeholder</div>
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
          <div className="flex-1 bg-black rounded-2xl relative border border-stone-800 overflow-hidden flex items-center justify-center">
            <span className="absolute top-4 right-4 bg-teal-500 text-white text-xs font-bold px-3 py-1 rounded-full z-20 shadow-md">רפרנס אידיאלי</span>
            {tacticalReviewMode.gifUrl ? (
              <img src={tacticalReviewMode.gifUrl} alt={tacticalReviewMode.exerciseTitle || "Reference"} className="w-full h-full object-contain opacity-80" />
            ) : (
              <div className="text-stone-600">אין וידאו רפרנס</div>
            )}
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col md:flex-row h-screen bg-[#0c0a09] overflow-hidden" dir="rtl">
      <AdminSidebar adminTab={adminTab} setAdminTab={setAdminTab} isSidebarOpen={isSidebarOpen} setIsSidebarOpen={setIsSidebarOpen} onLogout={handleLogout} />

      <main className="flex-1 overflow-y-auto p-4 md:p-12">
        {adminTab === "video_reviews" && (
          <div className="max-w-6xl mx-auto animate-in fade-in">
            <header className="mb-10 hidden md:block">
              <h1 className="text-3xl md:text-4xl font-black text-white tracking-tight flex items-center gap-3">
                <Video className="text-red-400" size={32} /> ביקורות וידאו ממטופלים
              </h1>
            </header>
            <div className="bg-[#1c1c1e] rounded-[1.75rem] border border-stone-800 p-8 h-full">
              <div className="border border-stone-800 p-5 rounded-2xl flex flex-col md:flex-row items-start md:items-center justify-between gap-4 bg-stone-950 hover:bg-stone-900 transition-colors group">
                <div className="flex items-center gap-4">
                  <div className="w-14 h-14 bg-red-500/10 text-red-400 rounded-xl flex items-center justify-center">
                    <Video size={24} />
                  </div>
                  <div>
                    <h3 className="font-bold text-white text-lg">דוגמה למטופל (מוקאפ)</h3>
                    <p className="text-sm text-stone-500">העלה סרטון ביצוע ל: &quot;Squat&quot;</p>
                  </div>
                </div>
                <button
                  onClick={() => setTacticalReviewMode({ patientName: "דוגמה למטופל", exerciseTitle: "Squat", gifUrl: "https://wger.de/media/exercise-images/88/Squats-1.png" })}
                  className="bg-white text-stone-950 px-6 py-2.5 rounded-xl font-bold hover:bg-red-500 hover:text-white transition-colors flex items-center gap-2"
                >
                  <PenTool size={16} /> פתח חדר ניתוח
                </button>
              </div>
            </div>
          </div>
        )}

        {adminTab === "dashboard" && (
          <div className="max-w-6xl mx-auto animate-in fade-in">
            <header className="mb-10 hidden md:block">
              <h1 className="text-3xl md:text-4xl font-black text-white tracking-tight">קליניקה לייב</h1>
            </header>
            <div className="bg-[#1c1c1e] rounded-[1.75rem] border border-stone-800 p-8 h-full">
              <div className="flex justify-between items-center mb-6">
                <h2 className="text-xl font-bold text-white flex items-center gap-2">
                  <Activity size={20} className="text-teal-400" /> עדכונים קליניים מהשטח
                </h2>
                <span className="text-sm font-bold text-stone-400 bg-stone-950 px-3 py-1 rounded-full border border-stone-800">{visibleWorkoutLogs.length} דיווחים</span>
              </div>
              {visibleWorkoutLogs.length === 0 ? (
                <div className="text-center p-12 flex flex-col items-center">
                  <div className="w-20 h-20 bg-stone-950 rounded-full flex items-center justify-center text-stone-600 mb-4">
                    <Coffee size={32} />
                  </div>
                  <p className="text-stone-400 font-bold text-lg">שקט בקליניקה כרגע</p>
                  <p className="text-stone-500 text-sm">הדיווחים של המטופלים יופיעו כאן בזמן אמת.</p>
                </div>
              ) : (
                <div className="space-y-4 max-h-[600px] overflow-y-auto pr-2">
                  {visibleWorkoutLogs.map((log) => {
                    const patientName = patients.find((p) => p.id === log.patient_id)?.full_name || "מטופל לא ידוע";
                    const rpeColor = log.rpe >= 8 ? "bg-red-500/10 text-red-400 border-red-500/25" : log.rpe >= 5 ? "bg-amber-500/10 text-amber-400 border-amber-500/25" : "bg-teal-500/10 text-teal-400 border-teal-500/25";
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
                        className="flex flex-col md:flex-row justify-between items-start md:items-center p-5 rounded-2xl border border-stone-800 bg-stone-950 hover:border-stone-700 transition-colors gap-4"
                      >
                        {/* Swipe (either direction) dismisses this card from the admin's own view only —
                            it's a real workout_logs row read independently by the patient's progress view,
                            so this never touches the row; dismissed ids are per-browser localStorage, see
                            dismissLog above. */}
                        <div>
                          <h4 className="font-black text-white text-lg">{patientName}</h4>
                          <p className="text-sm text-stone-400 font-medium">{log.category}</p>
                          <span className="text-xs text-stone-500 mt-1 block">{formatAdminDate(log.created_at)}</span>
                          {log.pain_areas && (
                            <div className="flex flex-wrap gap-1 mt-2">
                              {log.pain_areas.split(",").map((area: string) => (
                                <span key={area} className="bg-red-500/10 text-red-400 px-2 py-0.5 rounded-md text-[10px] font-bold border border-red-500/20">
                                  {AVAILABLE_MUSCLES.find((m) => m.id === area)?.label || area}
                                </span>
                              ))}
                            </div>
                          )}
                        </div>
                        <div className="flex gap-2 w-full md:w-auto">
                          <div className="flex flex-col items-center justify-center w-full md:w-16 h-16 rounded-xl border border-stone-800 bg-[#1c1c1e]">
                            <span className="text-[10px] font-bold text-stone-500 uppercase">כאב לפני</span>
                            <span className="text-xl font-black text-stone-200">{log.pain_before ?? "-"}</span>
                          </div>
                          <div className="flex flex-col items-center justify-center w-full md:w-16 h-16 rounded-xl border border-stone-800 bg-[#1c1c1e]">
                            <span className="text-[10px] font-bold text-stone-500 uppercase">כאב אחרי</span>
                            <span className="text-xl font-black text-stone-200">{log.pain_after ?? "-"}</span>
                          </div>
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
          <div className="max-w-6xl mx-auto animate-in fade-in">
            <header className="mb-10 hidden md:block">
              <h1 className="text-3xl md:text-4xl font-black text-white tracking-tight">ניהול תיקים ולקוחות</h1>
            </header>
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-8">
              <div className="bg-[#1c1c1e] rounded-3xl p-6 border border-stone-800 flex items-center gap-4">
                <div className="w-14 h-14 rounded-2xl bg-stone-950 flex items-center justify-center text-stone-300">
                  <Users size={24} />
                </div>
                <div>
                  <p className="text-sm font-bold text-stone-500 uppercase">סה&quot;כ לקוחות</p>
                  <p className="text-2xl font-black text-white">{patients.length}</p>
                </div>
              </div>
              <div className="bg-[#1c1c1e] rounded-3xl p-6 border border-stone-800 flex items-center gap-4">
                <div className="w-14 h-14 rounded-2xl bg-blue-500/10 flex items-center justify-center text-blue-400">
                  <HeartPulse size={24} />
                </div>
                <div>
                  <p className="text-sm font-bold text-blue-400/80 uppercase">שיקום קליני</p>
                  <p className="text-2xl font-black text-white">{clinicalCount}</p>
                </div>
              </div>
              <div className="bg-[#1c1c1e] rounded-3xl p-6 border border-stone-800 flex items-center gap-4">
                <div className="w-14 h-14 rounded-2xl bg-amber-500/10 flex items-center justify-center text-amber-400">
                  <Dumbbell size={24} />
                </div>
                <div>
                  <p className="text-sm font-bold text-amber-400/80 uppercase">מתאמני כושר ויוגה</p>
                  <p className="text-2xl font-black text-white">{fitnessCount}</p>
                </div>
              </div>
            </div>
            <div className="bg-[#1c1c1e] rounded-[1.75rem] border border-stone-800 p-8">
              <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-8 gap-4">
                <h2 className="text-xl font-bold text-white flex items-center gap-2">
                  <Filter size={20} className="text-teal-400" /> רשימת לקוחות
                </h2>
                <div className="flex bg-stone-950 p-1 rounded-xl border border-stone-800">
                  <button onClick={() => setCrmFilter("all")} className={`px-4 py-1.5 text-sm font-bold rounded-lg transition-colors ${crmFilter === "all" ? "bg-white text-stone-950" : "text-stone-500 hover:text-stone-300"}`}>
                    הכל
                  </button>
                  <button onClick={() => setCrmFilter("clinical")} className={`px-4 py-1.5 text-sm font-bold rounded-lg transition-colors ${crmFilter === "clinical" ? "bg-white text-blue-600" : "text-stone-500 hover:text-stone-300"}`}>
                    שיקום
                  </button>
                  <button onClick={() => setCrmFilter("fitness")} className={`px-4 py-1.5 text-sm font-bold rounded-lg transition-colors ${crmFilter === "fitness" ? "bg-white text-amber-600" : "text-stone-500 hover:text-stone-300"}`}>
                    כושר
                  </button>
                </div>
              </div>
              <p className="text-xs text-stone-500 -mt-5 mb-6">
                חשבונות נוצרים כעת רק דרך מסך ההרשמה העצמית — כאן אפשר לצפות ברשימת הלקוחות ולעדכן מסלול.
              </p>
              <div className="space-y-4">
                {displayedPatients.map((p) => {
                  const aiInsight = getAIInsight(workoutLogs, p.id);
                  return (
                    <div key={p.id} className="flex flex-col p-4 rounded-2xl border border-stone-800 hover:bg-stone-950 transition-colors group">
                      <div className="flex items-center justify-between mb-3 gap-3">
                        <div className="flex items-center gap-4 min-w-0">
                          <div className={`w-12 h-12 rounded-xl flex items-center justify-center font-bold text-lg shrink-0 ${p.patient_type === "fitness" ? "bg-amber-500/15 text-amber-400" : "bg-blue-500/15 text-blue-400"}`}>
                            {p.full_name.charAt(0)}
                          </div>
                          <div className="min-w-0">
                            <h4 className="font-bold text-white truncate">{p.full_name}</h4>
                            {(p.phone || p.email) && (
                              <p className="text-sm text-stone-500 flex items-center gap-2 truncate">
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
                            p.patient_type === "fitness" ? "bg-amber-500/10 text-amber-400 border-amber-500/20 hover:bg-amber-500/20" : "bg-blue-500/10 text-blue-400 border-blue-500/20 hover:bg-blue-500/20"
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
                {displayedPatients.length === 0 && <div className="text-center p-10 text-stone-500">לא נמצאו לקוחות תחת סינון זה.</div>}
              </div>
            </div>
          </div>
        )}

        {/* ----- הבונה החכם המבוסס ימים ----- */}
        {adminTab === "builder" && (
          <div className="max-w-7xl mx-auto animate-in fade-in h-full flex flex-col">
            <AdminCoPilotDrawer contextData={builderCoPilotContext} />
            <header className="mb-6 flex flex-col md:flex-row md:items-center justify-between gap-4">
              <h1 className="text-2xl md:text-3xl font-black text-white tracking-tight flex items-center gap-3">
                <Wand2 className="text-teal-400" size={28} /> בונה חכם & תבניות
              </h1>

              <div className="flex bg-[#1c1c1e] p-1.5 rounded-full border border-stone-800">
                <button onClick={() => setBuilderMode("patient")} className={`px-6 py-2.5 rounded-full font-extrabold text-[13px] transition-all ${builderMode === "patient" ? "bg-teal-500 text-stone-950" : "text-stone-400 hover:text-stone-200"}`}>
                  שיוך למטופל
                </button>
                <button onClick={() => setBuilderMode("protocol")} className={`px-6 py-2.5 rounded-full font-bold text-[13px] transition-all ${builderMode === "protocol" ? "bg-white text-stone-950" : "text-stone-400 hover:text-stone-200"}`}>
                  יצירת תבנית עבודה
                </button>
              </div>
            </header>

            <div className="bg-[#161311] border border-teal-500/25 rounded-[1.75rem] p-6 md:p-7 mb-5 flex flex-col md:flex-row items-center gap-5 relative overflow-hidden">
              <div className="absolute -top-8 -left-2.5 opacity-[0.08] text-teal-400 pointer-events-none">
                <Sparkles size={140} />
              </div>
              <div className="flex-1 w-full z-10">
                <label className="block text-[11px] font-extrabold text-teal-400 mb-2.5 uppercase tracking-widest">עוזר קליני AI</label>
                <input
                  type="text"
                  value={aiPrompt}
                  onChange={(e) => setAiPrompt(e.target.value)}
                  placeholder="למשל: בנה לי תוכנית שיקום וכוח עם דגש על מוביליטי..."
                  className="w-full bg-white/[0.06] border border-white/10 p-3.5 rounded-2xl text-white placeholder-stone-500 focus:border-teal-500 focus:ring-1 focus:ring-teal-500/30 outline-none"
                />
              </div>
              <button
                onClick={handleAiGenerate}
                disabled={isAiLoading}
                className="w-full md:w-auto bg-teal-500 hover:bg-teal-400 text-stone-950 px-7 py-4 rounded-2xl font-black transition-all shadow-[0_12px_28px_-10px_rgba(20,184,166,0.5)] disabled:opacity-50 z-10 flex items-center justify-center gap-2 whitespace-nowrap"
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
            <div className="mb-5 bg-blue-500/[0.06] border border-blue-500/20 p-4 md:p-5 rounded-2xl flex items-center justify-between gap-4">
              <div className="flex items-center gap-3">
                <History className="text-blue-400 shrink-0" size={20} />
                <div>
                  <h4 className="font-extrabold text-blue-300 text-[13px] flex items-center gap-2">
                    פריודיזציה אוטומטית <span className="text-blue-300 font-bold text-[10px] bg-blue-400/15 px-2 py-0.5 rounded-full">בטא</span>
                  </h4>
                  <p className="text-[11px] text-stone-400 mt-0.5">הגדר חוקי התקדמות והמערכת תייצר עבורך 12 שבועות קדימה אוטומטית.</p>
                </div>
              </div>
              <button onClick={() => setEnablePeriodizationUI(!enablePeriodizationUI)} className="bg-stone-950 border border-blue-400/30 text-blue-300 px-4 py-2.5 rounded-xl text-xs font-bold hover:bg-blue-500/10 transition-colors whitespace-nowrap">
                {enablePeriodizationUI ? "סגור הגדרות" : "הגדר חוקים"}
              </button>
            </div>

            {enablePeriodizationUI && (
              <div className="mb-5 bg-[#1c1c1e] border border-stone-800 p-6 rounded-2xl animate-in zoom-in duration-300">
                <h4 className="font-black text-white mb-4">הגדרת חוקי התקדמות לפרוטוקול</h4>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div>
                    <label className="block text-xs font-bold text-stone-500 uppercase mb-1">מחזור התקדמות</label>
                    <select className="w-full bg-stone-950 p-2.5 rounded-xl border border-stone-800 outline-none text-sm font-bold text-white">
                      <option>כל שבוע</option>
                      <option>כל שבועיים</option>
                    </select>
                  </div>
                  <div>
                    <label className="block text-xs font-bold text-stone-500 uppercase mb-1">פקודת עומס (Progressive Overload)</label>
                    <select className="w-full bg-stone-950 p-2.5 rounded-xl border border-stone-800 outline-none text-sm font-bold text-white">
                      <option>הוסף 1 חזרה לכל הסטים</option>
                      <option>הוסף 2.5 ק&quot;ג למשקל</option>
                      <option>הוסף סט 1 לכל תרגיל</option>
                    </select>
                  </div>
                  <div>
                    <label className="block text-xs font-bold text-stone-500 uppercase mb-1">דילואוד (Deload)</label>
                    <select className="w-full bg-stone-950 p-2.5 rounded-xl border border-stone-800 outline-none text-sm font-bold text-white">
                      <option>שבוע 4: חתוך סטים ב-50%</option>
                      <option>שבוע 8: הורד משקל ב-20%</option>
                      <option>ללא דילואוד מובנה</option>
                    </select>
                  </div>
                </div>
                <p className="text-[10px] text-stone-600 mt-4">* מנגנון הפריודיזציה נמצא כרגע בגרסת בטא (UI Mockup) ויופעל בעדכון הקרוב.</p>
              </div>
            )}

            <div className="flex flex-col lg:flex-row gap-5 flex-1 min-h-[500px]">
              <div className="w-full lg:w-[340px] lg:shrink-0 bg-[#1c1c1e] rounded-3xl border border-stone-800 flex flex-col overflow-hidden">
                <div className="p-5 border-b border-stone-800 space-y-2.5">
                  <h3 className="font-extrabold text-white mb-1 flex items-center gap-2 text-sm">
                    <ImageIcon size={16} className="text-teal-400" /> ספריית תרגילים
                  </h3>
                  <div className="relative">
                    <Search size={14} className="pointer-events-none absolute top-1/2 right-3 -translate-y-1/2 text-stone-500" />
                    <input
                      type="text"
                      value={builderNameQuery}
                      onChange={(e) => setBuilderNameQuery(e.target.value)}
                      placeholder="חפש תרגיל לפי שם..."
                      className="w-full bg-stone-950 border border-stone-800 p-2.5 pr-9 rounded-xl text-xs font-bold text-white placeholder:text-stone-600 outline-none focus:border-teal-500 focus:ring-1 focus:ring-teal-500/30"
                    />
                  </div>
                  <select value={builderSearchFilter} onChange={(e) => setBuilderSearchFilter(e.target.value)} className="w-full bg-stone-950 border border-stone-800 p-2.5 rounded-xl text-xs font-bold text-stone-300 outline-none">
                    <option value="all">-- כל התגיות --</option>
                    {ADMIN_TAGS.map((t) => (
                      <option key={t.id} value={t.id}>
                        {t.label}
                      </option>
                    ))}
                  </select>
                  <div className="grid grid-cols-2 gap-2">
                    <select value={builderMuscleFilter} onChange={(e) => setBuilderMuscleFilter(e.target.value)} className="w-full bg-stone-950 border border-stone-800 p-2.5 rounded-xl text-[11px] font-bold text-stone-300 outline-none">
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
                    <select value={builderEquipmentFilter} onChange={(e) => setBuilderEquipmentFilter(e.target.value)} className="w-full bg-stone-950 border border-stone-800 p-2.5 rounded-xl text-[11px] font-bold text-stone-300 outline-none">
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
                  {filteredExercisesForBuilder.length === 0 && <p className="text-center text-stone-500 text-xs font-semibold p-4">אין תרגילים העונים לסינון.</p>}
                  {filteredExercisesForBuilder.map((ex) => {
                    const style = ADMIN_CATEGORY_STYLES[ex.categories?.[0]] ?? DEFAULT_ADMIN_CATEGORY_STYLE;
                    return (
                      <div
                        key={ex.id}
                        draggable
                        onDragStart={(e) => handleDragStart(e, ex)}
                        className="bg-stone-950 p-2.5 rounded-2xl border border-stone-800 cursor-grab hover:border-teal-500/50 transition-colors flex items-center gap-2.5 group active:cursor-grabbing"
                      >
                        <div className="text-stone-600 group-hover:text-teal-400 shrink-0">
                          <GripVertical size={18} />
                        </div>
                        <div className="w-[38px] h-[38px] rounded-[10px] shrink-0" style={{ background: `linear-gradient(150deg, ${style.glow}, #1c1c1e)` }}></div>
                        <div className="min-w-0 flex-1">
                          <h4 className="font-extrabold text-white text-xs leading-tight truncate">{getExerciseName(ex, lang)}</h4>
                          <span className="text-[9px] font-extrabold px-2 py-0.5 rounded-full mt-1 inline-block" style={{ color: style.text, background: style.bg }}>
                            {(ex.categories || []).join(" / ")}
                          </span>
                        </div>
                        <button
                          type="button"
                          onClick={() => addExerciseToDay(builderActiveDayId, ex)}
                          title={`הוסף ליום ${DAYS_OF_WEEK.find((d) => d.id === builderActiveDayId)?.label ?? ""}`}
                          className="shrink-0 w-7 h-7 rounded-full bg-teal-500/15 text-teal-400 hover:bg-teal-500 hover:text-stone-950 flex items-center justify-center transition-colors"
                        >
                          <Plus size={14} />
                        </button>
                      </div>
                    );
                  })}
                </div>
              </div>

              <div className="w-full lg:flex-1 bg-[#1c1c1e] rounded-3xl border border-stone-800 p-7 flex flex-col min-w-0">
                <div className="mb-5 flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-stone-800 pb-4.5">
                  <h3 className="font-extrabold text-white text-base flex items-center gap-2">
                    <Map size={17} className="text-teal-400" /> ציר זמן התוכנית
                  </h3>
                  <div className="flex items-center gap-1.5 overflow-x-auto pb-1 no-scrollbar">
                    {Object.keys(builderPlan).map((weekNum) => (
                      <button
                        key={weekNum}
                        onClick={() => handleBuilderWeekChange(parseInt(weekNum))}
                        className={`px-4 py-2 rounded-xl font-extrabold text-xs transition-colors border ${
                          builderSelectedWeek === parseInt(weekNum) ? "bg-stone-950 text-white border-stone-800" : "bg-transparent text-stone-400 border-transparent hover:bg-stone-800/50"
                        }`}
                      >
                        שבוע {weekNum}
                      </button>
                    ))}
                    <button
                      onClick={() => handleBuilderWeekChange(Math.max(...Object.keys(builderPlan).map(Number)) + 1)}
                      className="w-[30px] h-[30px] rounded-full bg-teal-500/10 text-teal-400 hover:bg-teal-500/20 flex items-center justify-center font-bold transition-colors border border-teal-500/30"
                      title="הוסף שבוע חדש לתוכנית"
                    >
                      <Plus size={16} />
                    </button>
                  </div>
                </div>

                <div className="mb-5 bg-stone-950 p-5 rounded-2xl border border-stone-800 flex flex-col gap-4">
                  {builderMode === "patient" ? (
                    <div className="flex flex-col md:flex-row gap-6">
                      <div className="flex-1">
                        <label className="block text-[10px] font-extrabold text-stone-400 mb-2 uppercase tracking-wider">שיוך למטופל</label>
                        <select value={builderPatientId} onChange={(e) => setBuilderPatientId(e.target.value)} className="w-full border-b-2 border-teal-500 p-1.5 outline-none font-bold text-white bg-transparent">
                          <option value="" className="bg-stone-950">
                            -- בחר מטופל יעד --
                          </option>
                          {patients.map((p) => (
                            <option key={p.id} value={p.id} className="bg-stone-950">
                              {p.full_name}
                            </option>
                          ))}
                        </select>
                      </div>

                      <div className="flex-1">
                        <label className="block text-[10px] font-extrabold text-blue-400 mb-2 uppercase tracking-wider flex items-center gap-1.5">
                          <DownloadCloud size={11} /> טען תבנית פרוטוקול ללוח
                        </label>
                        <select onChange={loadProtocolToBuilder} className="w-full border-b-2 border-blue-400/40 p-1.5 outline-none font-bold text-blue-300 bg-transparent">
                          <option value="" className="bg-stone-950">
                            -- בחר פרוטוקול --
                          </option>
                          {packages.map((p) => (
                            <option key={p.id} value={p.id} className="bg-stone-950">
                              {p.title}
                            </option>
                          ))}
                        </select>
                      </div>
                    </div>
                  ) : (
                    <div className="flex flex-col md:flex-row gap-6">
                      <div className="flex-1">
                        <label className="block text-[10px] font-extrabold text-stone-400 mb-2 uppercase tracking-wider">שם התבנית (פרוטוקול)</label>
                        <input
                          type="text"
                          value={builderProtocolName}
                          onChange={(e) => setBuilderProtocolName(e.target.value)}
                          placeholder="למשל: קליסטניקס רמה 1 (12 שבועות)"
                          className="w-full border-b-2 border-stone-700 p-1.5 outline-none font-bold text-white placeholder:text-stone-600 bg-transparent"
                        />
                      </div>
                      <div className="flex-1">
                        <label className="block text-[10px] font-extrabold text-stone-400 mb-2 uppercase tracking-wider">תיאור קצר (אופציונלי)</label>
                        <input
                          type="text"
                          value={builderProtocolDesc}
                          onChange={(e) => setBuilderProtocolDesc(e.target.value)}
                          placeholder="כוח ומתיחות למתחילים..."
                          className="w-full border-b-2 border-stone-800 p-1.5 outline-none text-stone-300 placeholder:text-stone-600 bg-transparent"
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
                        className={`border-2 border-dashed rounded-[1.375rem] p-4.5 transition-colors flex flex-col ${hasItems ? "border-teal-500/30 bg-teal-500/[0.04]" : "border-stone-800 bg-[#161311]"} ${
                          isActiveDay ? "ring-1 ring-teal-500/40" : ""
                        }`}
                      >
                        <div className="flex items-center gap-2">
                          <button type="button" onClick={() => toggleBuilderDayOpen(day.id)} className="flex-1 flex items-center gap-3 text-start">
                            {isOpen ? <ChevronUp size={16} className="text-stone-500 shrink-0" /> : <ChevronDown size={16} className="text-stone-500 shrink-0" />}
                            <div className={`px-4 py-1.5 rounded-[10px] flex items-center justify-center font-extrabold text-[13px] border ${hasItems ? "bg-teal-500 text-stone-950 border-teal-400" : "bg-stone-950 text-stone-300 border-stone-800"}`}>
                              יום {day.label}
                            </div>
                            {hasItems ? (
                              <span className="text-xs font-bold text-stone-500">{currentDayItems.length} תרגילים</span>
                            ) : (
                              <span className="text-xs font-semibold text-stone-500">גרור תרגילים לכאן</span>
                            )}
                          </button>
                          <button
                            type="button"
                            onClick={() => duplicateBuilderDay(day.id)}
                            title="שכפל יום לתוך יום ריק אחר"
                            className="shrink-0 p-2 text-stone-500 hover:text-teal-400 hover:bg-teal-500/10 rounded-xl transition-colors"
                          >
                            <Copy size={15} />
                          </button>
                        </div>

                        {isOpen && hasItems && (
                          <div className="space-y-2 mt-3.5">
                            {currentDayItems.map((ex: any) => (
                              <div key={ex.temp_id} className="bg-[#161311] p-2.5 rounded-2xl border border-stone-800 flex flex-wrap items-center gap-2.5">
                                <h5 className="font-extrabold text-white text-[13px] flex-1 min-w-[120px] line-clamp-1">{getExerciseName(ex, lang)}</h5>

                                <div className="flex items-center gap-1.5 bg-stone-950 p-1.5 rounded-xl border border-stone-800">
                                  <span className="text-stone-500 text-[10px] font-bold uppercase ml-1">בלוק</span>
                                  <input
                                    type="text"
                                    value={ex.block || "A"}
                                    onChange={(e) => updateBuilderExercise(day.id, ex.temp_id, "block", e.target.value.toUpperCase())}
                                    className="w-8 text-center bg-transparent outline-none font-black text-white"
                                    placeholder="A"
                                  />
                                </div>

                                <div className="flex items-center gap-1.5 bg-stone-950 p-1.5 rounded-xl border border-stone-800">
                                  <input type="number" value={ex.sets} onChange={(e) => updateBuilderExercise(day.id, ex.temp_id, "sets", parseInt(e.target.value))} className="w-12 text-center bg-transparent outline-none font-bold text-sm text-white" />
                                  <span className="text-stone-500 text-xs font-bold">סטים</span>
                                </div>
                                <div className="flex items-center gap-1.5 bg-stone-950 p-1.5 rounded-xl border border-stone-800">
                                  <input type="number" value={ex.reps} onChange={(e) => updateBuilderExercise(day.id, ex.temp_id, "reps", parseInt(e.target.value))} className="w-12 text-center bg-transparent outline-none font-bold text-sm text-white" />
                                  <button onClick={() => updateBuilderExercise(day.id, ex.temp_id, "is_time", !ex.is_time)} className="text-stone-500 text-xs font-bold hover:text-teal-400 w-10">
                                    {ex.is_time ? "שניות" : "חזרות"}
                                  </button>
                                </div>
                                <div className="flex items-center gap-1 bg-stone-950 p-1.5 rounded-xl border border-stone-800">
                                  <input
                                    type="number"
                                    value={ex.rir || ""}
                                    onChange={(e) => updateBuilderExercise(day.id, ex.temp_id, "rir", e.target.value ? parseInt(e.target.value) : null)}
                                    placeholder="-"
                                    className="w-10 text-center bg-transparent outline-none font-bold text-sm text-white placeholder:text-stone-600"
                                  />
                                  <span className="text-stone-500 text-xs font-bold flex items-center gap-1">
                                    RIR{" "}
                                    <button onClick={showRirInfo} className="text-stone-600 hover:text-teal-400">
                                      <HelpCircle size={12} />
                                    </button>
                                  </span>
                                </div>
                                <div className="flex items-center gap-1 bg-stone-950 p-1.5 rounded-xl border border-stone-800">
                                  <Clock size={12} className="text-stone-600 shrink-0" />
                                  {REST_TIME_PRESETS.map((secs) => (
                                    <button
                                      key={secs}
                                      onClick={() => updateBuilderExercise(day.id, ex.temp_id, "rest_time_seconds", secs)}
                                      className={`px-1.5 py-1 rounded-lg text-[10px] font-bold transition-colors ${
                                        (ex.rest_time_seconds ?? 60) === secs ? "bg-teal-500 text-stone-950" : "text-stone-400 hover:text-white"
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
                                    className="w-9 text-center bg-transparent outline-none font-bold text-[10px] text-white placeholder:text-stone-600"
                                  />
                                </div>
                                <button onClick={() => removeBuilderExercise(day.id, ex.temp_id)} className="p-2 text-red-400 hover:bg-red-500/10 rounded-xl transition-colors">
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

                <div className="mt-5 pt-5 border-t border-stone-800 flex justify-end">
                  <button
                    onClick={saveBuilderPlan}
                    className={`px-9 py-3.5 rounded-2xl font-black text-[15px] transition-colors shadow-lg flex items-center gap-2 ${
                      builderMode === "patient" ? "bg-teal-500 text-stone-950 hover:bg-teal-400 shadow-[0_14px_32px_-10px_rgba(20,184,166,0.5)]" : "bg-white text-stone-950 hover:bg-stone-200"
                    }`}
                  >
                    <Save size={18} /> {builderMode === "patient" ? "שגר למטופל" : "שמור תבנית למאגר"}
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}

        {adminTab === "program_library" && <ProgramLibraryTab packages={packages} exercises={exercises} patients={patients} onRefresh={fetchAdminData} />}

        {adminTab === "exercises" && (
          <ExerciseLibraryTab exercises={exercises} internalNotesByExerciseId={internalNotesByExerciseId} lang={lang} onRefresh={fetchAdminData} />
        )}

        {adminTab === "assign" && (
          <div className="max-w-5xl mx-auto animate-in fade-in">
            <header className="mb-10 hidden md:block">
              <h1 className="text-3xl md:text-4xl font-black text-white tracking-tight">שיוך מהיר (ידני)</h1>
            </header>
            <div className="bg-[#1c1c1e] rounded-[1.75rem] border border-stone-800 p-8 md:p-10 mb-8">
              <div className="mb-8">
                <label className="block text-sm font-bold text-stone-500 mb-2 uppercase">מטופל יעד</label>
                <select value={assignPatientId} onChange={(e) => setAssignPatientId(e.target.value)} className="w-full md:w-1/2 border-b-2 border-stone-800 p-3 bg-transparent text-white outline-none focus:border-teal-500 focus:ring-1 focus:ring-teal-500/30" required>
                  <option value="" className="bg-stone-950">
                    -- בחר מטופל --
                  </option>
                  {patients.map((p) => (
                    <option key={p.id} value={p.id} className="bg-stone-950">
                      {p.full_name}
                    </option>
                  ))}
                </select>
              </div>

              <div className="mt-6 mb-8 bg-stone-950 p-6 rounded-2xl border border-stone-800">
                <label className="block text-sm font-bold text-stone-400 mb-3 uppercase flex items-center gap-2">
                  <Calendar size={16} /> ימי אימון בשבוע (אופציונלי)
                </label>
                <div className="flex flex-wrap gap-2">
                  {DAYS_OF_WEEK.map((day) => {
                    const isSelected = assignDays.includes(day.id);
                    return (
                      <button
                        key={day.id}
                        type="button"
                        onClick={() => setAssignDays((prev) => (isSelected ? prev.filter((d) => d !== day.id) : [...prev, day.id]))}
                        className={`w-12 h-12 rounded-xl font-bold text-sm transition-colors ${isSelected ? "bg-teal-500 text-stone-950" : "bg-[#1c1c1e] text-stone-400 hover:bg-stone-800 border border-stone-800"}`}
                      >
                        {day.label}
                      </button>
                    );
                  })}
                </div>
              </div>

              <form onSubmit={handleAssignSingle} className="flex flex-col gap-6 animate-in fade-in">
                <div className="flex flex-col md:flex-row gap-6">
                  <div className="flex-1">
                    <div className="flex items-center justify-between mb-2">
                      <label className="block text-sm font-bold text-stone-500 uppercase">בחר תרגיל</label>
                      <select value={assignExerciseTagFilter} onChange={(e) => setAssignExerciseTagFilter(e.target.value)} className="text-[10px] font-bold bg-stone-950 text-stone-400 px-2 py-1 rounded-md outline-none border border-stone-800 cursor-pointer">
                        <option value="all">כל התגיות (ללא סינון)</option>
                        {ADMIN_TAGS.map((tag) => (
                          <option key={tag.id} value={tag.id}>
                            {tag.label}
                          </option>
                        ))}
                      </select>
                    </div>
                    <select value={assignExerciseId} onChange={(e) => setAssignExerciseId(e.target.value)} className="w-full border-b-2 border-stone-800 p-3 bg-transparent text-white outline-none focus:border-teal-500 focus:ring-1 focus:ring-teal-500/30" required>
                      <option value="" className="bg-stone-950">
                        -- בחר תרגיל --
                      </option>
                      {filteredExercisesForAssign.map((e) => (
                        <option key={e.id} value={e.id} className="bg-stone-950">
                          {getExerciseName(e, lang)}
                        </option>
                      ))}
                    </select>
                  </div>
                  <div className="w-full md:w-32">
                    <label className="block text-sm font-bold text-stone-500 mb-2 uppercase">שבוע</label>
                    <input
                      type="number"
                      value={assignWeek}
                      onChange={(e) => setAssignWeek(parseInt(e.target.value))}
                      className="w-full border-b-2 border-stone-800 p-3 bg-transparent text-white outline-none text-center font-bold focus:border-teal-500 focus:ring-1 focus:ring-teal-500/30"
                      required
                      min="1"
                    />
                  </div>
                  <div className="w-full md:w-32">
                    <label className="block text-sm font-bold text-stone-500 mb-2 uppercase">בלוק</label>
                    <input
                      type="text"
                      value={assignBlock}
                      onChange={(e) => setAssignBlock(e.target.value)}
                      className="w-full border-b-2 border-stone-800 p-3 bg-transparent text-white outline-none text-center uppercase font-bold focus:border-teal-500 focus:ring-1 focus:ring-teal-500/30"
                      required
                      placeholder="A"
                    />
                  </div>
                </div>

                <div className="flex flex-col md:flex-row gap-6">
                  <div className="w-full md:w-1/4">
                    <label className="block text-sm font-bold text-stone-500 mb-2 uppercase">סטים</label>
                    <input type="number" value={assignSets} onChange={(e) => setAssignSets(e.target.value)} className="w-full border-b-2 border-stone-800 p-3 bg-transparent text-white outline-none text-center focus:border-teal-500 focus:ring-1 focus:ring-teal-500/30" required />
                  </div>

                  <div className="w-full md:w-1/4">
                    <div className="flex items-center justify-between mb-2">
                      <label className="block text-sm font-bold text-stone-500 uppercase">יעד</label>
                      <button type="button" onClick={() => setAssignIsTime(!assignIsTime)} className="text-[10px] font-bold bg-stone-950 text-stone-400 px-2 py-1 rounded-md hover:bg-stone-800 transition-colors border border-stone-800">
                        {assignIsTime ? "שנה לחזרות" : "שנה לזמן"}
                      </button>
                    </div>
                    <input
                      type="number"
                      value={assignReps}
                      onChange={(e) => setAssignReps(e.target.value)}
                      placeholder={assignIsTime ? "שניות" : "חזרות"}
                      className="w-full border-b-2 border-stone-800 p-3 bg-transparent text-white placeholder:text-stone-600 outline-none text-center focus:border-teal-500 focus:ring-1 focus:ring-teal-500/30"
                      required
                    />
                  </div>

                  <div className="w-full md:w-1/4">
                    <div className="flex items-center gap-1 mb-2">
                      <label className="block text-sm font-bold text-stone-500 uppercase">RIR (רשות)</label>
                      <button type="button" onClick={showRirInfo} className="text-stone-600 hover:text-teal-400">
                        <HelpCircle size={14} />
                      </button>
                    </div>
                    <input
                      type="number"
                      value={assignRir}
                      onChange={(e) => setAssignRir(e.target.value)}
                      placeholder="-"
                      className="w-full border-b-2 border-stone-800 p-3 bg-transparent text-white placeholder:text-stone-600 outline-none text-center focus:border-teal-500 focus:ring-1 focus:ring-teal-500/30"
                    />
                  </div>

                  <div className="flex-1">
                    <label className="block text-sm font-bold text-stone-500 mb-2 uppercase">הערות (רשות)</label>
                    <input type="text" value={assignNotes} onChange={(e) => setAssignNotes(e.target.value)} className="w-full border-b-2 border-stone-800 p-3 bg-transparent text-white outline-none focus:border-teal-500 focus:ring-1 focus:ring-teal-500/30" />
                  </div>
                </div>

                <button type="submit" className="bg-teal-500 text-stone-950 px-10 py-4 rounded-2xl font-black w-full md:w-fit self-end hover:bg-teal-400 transition-colors">
                  שגר למטופל
                </button>
              </form>
            </div>
          </div>
        )}

        {adminTab === "manage_plans" && (
          <div className="max-w-6xl mx-auto animate-in fade-in">
            <header className="mb-10 hidden md:block">
              <h1 className="text-3xl md:text-4xl font-black text-white tracking-tight">עריכת תוכניות פעילות</h1>
            </header>
            <div className="bg-[#1c1c1e] rounded-[1.75rem] border border-stone-800 p-8 md:p-10">
              <div className="mb-8">
                <label className="block text-sm font-bold text-stone-500 mb-2 uppercase">בחר מטופל לעריכת התוכנית שלו</label>
                <select value={managePatientId} onChange={(e) => setManagePatientId(e.target.value)} className="w-full md:w-1/2 border-b-2 border-stone-800 p-3 bg-transparent text-white outline-none focus:border-teal-500 focus:ring-1 focus:ring-teal-500/30">
                  <option value="" className="bg-stone-950">
                    -- בחר מטופל --
                  </option>
                  {patients.map((p) => (
                    <option key={p.id} value={p.id} className="bg-stone-950">
                      {p.full_name}
                    </option>
                  ))}
                </select>
              </div>

              {!managePatientId ? (
                <div className="text-center p-10 text-stone-500 bg-stone-950 rounded-3xl border border-stone-800">בחר מטופל מהרשימה כדי לצפות ולערוך את התוכנית הפעילה שלו.</div>
              ) : managePatientExercises.length === 0 ? (
                <div className="text-center p-10 text-stone-500 bg-stone-950 rounded-3xl border border-stone-800">למטופל זה אין תרגילים משויכים כרגע.</div>
              ) : (
                <div className="space-y-4">
                  {managePatientExercises.map((assign) => (
                    <div key={assign.id} className="border border-stone-800 p-5 rounded-2xl flex flex-col md:flex-row justify-between items-start md:items-center gap-4 hover:border-stone-700 transition-colors bg-stone-950/50">
                      <div className="flex-1 w-full">
                        <h4 className="text-lg font-black text-white">{assign.exercise && getExerciseName(assign.exercise, lang)}</h4>
                        <p className="text-sm font-bold text-teal-400 mb-2">{(assign.exercise?.categories || []).join(" / ")}</p>

                        {editingAssignId === assign.id ? (
                          <div className="flex flex-col gap-3 mt-4 bg-[#1c1c1e] p-4 rounded-xl border border-stone-800">
                            <div className="flex flex-wrap gap-3">
                              <div>
                                <label className="block text-xs font-bold text-stone-500 uppercase">שבוע</label>
                                <input
                                  type="number"
                                  value={editAssignForm.week}
                                  onChange={(e) => setEditAssignForm({ ...editAssignForm, week: parseInt(e.target.value) })}
                                  className="w-16 border-b border-stone-700 bg-transparent text-white p-1 text-center font-bold"
                                  min="1"
                                />
                              </div>
                              <div>
                                <label className="block text-xs font-bold text-stone-500 uppercase">בלוק</label>
                                <input
                                  type="text"
                                  value={editAssignForm.block}
                                  onChange={(e) => setEditAssignForm({ ...editAssignForm, block: e.target.value })}
                                  className="w-16 border-b border-stone-700 bg-transparent text-white p-1 text-center font-bold"
                                />
                              </div>
                              <div>
                                <label className="block text-xs font-bold text-stone-500 uppercase">סטים</label>
                                <input
                                  type="number"
                                  value={editAssignForm.sets}
                                  onChange={(e) => setEditAssignForm({ ...editAssignForm, sets: String(e.target.value) })}
                                  className="w-16 border-b border-stone-700 bg-transparent text-white p-1 text-center"
                                />
                              </div>
                              <div>
                                <label className="block text-xs font-bold text-stone-500 uppercase flex items-center justify-between">
                                  יעד{" "}
                                  <button onClick={() => setEditAssignForm({ ...editAssignForm, is_time: !editAssignForm.is_time })} className="text-[8px] text-blue-400 ml-1">
                                    {editAssignForm.is_time ? "שנה לחזרות" : "שנה לזמן"}
                                  </button>
                                </label>
                                <input
                                  type="number"
                                  value={editAssignForm.reps}
                                  onChange={(e) => setEditAssignForm({ ...editAssignForm, reps: String(e.target.value) })}
                                  placeholder={editAssignForm.is_time ? "שניות" : "חזרות"}
                                  className="w-16 border-b border-stone-700 bg-transparent text-white placeholder:text-stone-600 p-1 text-center"
                                />
                              </div>
                              <div>
                                <label className="block text-xs font-bold text-stone-500 uppercase">RIR</label>
                                <input
                                  type="number"
                                  value={editAssignForm.rir}
                                  onChange={(e) => setEditAssignForm({ ...editAssignForm, rir: String(e.target.value) })}
                                  placeholder="-"
                                  className="w-16 border-b border-stone-700 bg-transparent text-white placeholder:text-stone-600 p-1 text-center"
                                />
                              </div>
                              <div className="flex-1 min-w-[150px]">
                                <label className="block text-xs font-bold text-stone-500 uppercase">הערה</label>
                                <input
                                  type="text"
                                  value={editAssignForm.notes}
                                  onChange={(e) => setEditAssignForm({ ...editAssignForm, notes: e.target.value })}
                                  className="w-full border-b border-stone-700 bg-transparent text-white p-1"
                                />
                              </div>
                            </div>
                            <div className="w-full mt-2">
                              <label className="block text-xs font-bold text-stone-500 uppercase mb-2">ימי אימון מתוכננים</label>
                              <div className="flex flex-wrap gap-1">
                                {DAYS_OF_WEEK.map((day) => {
                                  const isSelected = editAssignForm.scheduled_days.includes(day.id);
                                  return (
                                    <button
                                      key={day.id}
                                      type="button"
                                      onClick={() => setEditAssignForm((prev) => ({ ...prev, scheduled_days: isSelected ? prev.scheduled_days.filter((d) => d !== day.id) : [...prev.scheduled_days, day.id] }))}
                                      className={`px-3 py-1.5 rounded-lg font-bold text-xs transition-colors ${isSelected ? "bg-teal-500 text-stone-950" : "bg-stone-950 text-stone-400 border border-stone-800"}`}
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
                            <div className="flex flex-wrap gap-2 text-sm font-medium text-stone-400">
                              <span className="bg-stone-950 px-3 py-1 rounded-lg border border-stone-800">
                                שבוע: <strong className="text-stone-200">{assign.week || 1}</strong>
                              </span>
                              <span className="bg-stone-950 px-3 py-1 rounded-lg border border-stone-800">
                                בלוק: <strong className="text-stone-200">{assign.block || "A"}</strong>
                              </span>
                              <span className="bg-stone-950 px-3 py-1 rounded-lg border border-stone-800">
                                סטים: <strong className="text-stone-200">{assign.sets}</strong>
                              </span>
                              <span className="bg-stone-950 px-3 py-1 rounded-lg border border-stone-800 inline-flex items-center gap-1.5">
                                {assign.is_time ? <Clock size={12} /> : <Repeat size={12} />} {assign.is_time ? "שניות:" : "חזרות:"} <strong className="text-stone-200">{assign.reps}</strong>
                              </span>
                              {assign.rir && (
                                <span className="bg-stone-950 px-3 py-1 rounded-lg border border-stone-800">
                                  RIR: <strong className="text-stone-200">{assign.rir}</strong>
                                </span>
                              )}
                              {assign.notes && <span className="bg-stone-950 px-3 py-1 rounded-lg border border-stone-800 max-w-[200px] truncate">הערה: {assign.notes}</span>}
                            </div>
                            {assign.scheduled_days && (
                              <div className="flex flex-wrap gap-1 mt-1">
                                {assign.scheduled_days.split(",").map((dayId: string) => {
                                  const dayLabel = DAYS_OF_WEEK.find((d) => d.id === dayId)?.label;
                                  return (
                                    <span key={dayId} className="bg-teal-500/10 text-teal-400 px-2 py-0.5 rounded-md text-xs font-bold border border-teal-500/20">
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
                            <button onClick={() => handleSaveEditAssign(assign.id)} className="flex-1 md:flex-none bg-teal-500 text-stone-950 px-4 py-2 rounded-xl font-bold flex items-center justify-center gap-2 hover:bg-teal-400">
                              <Save size={16} /> שמור
                            </button>
                            <button onClick={() => setEditingAssignId(null)} className="flex-1 md:flex-none bg-stone-800 text-stone-300 px-4 py-2 rounded-xl font-bold hover:bg-stone-700">
                              ביטול
                            </button>
                          </>
                        ) : (
                          <>
                            <button onClick={() => handleStartEditAssign(assign)} className="flex-1 md:flex-none bg-stone-950 border border-stone-800 text-stone-300 px-4 py-2 rounded-xl font-bold flex items-center justify-center gap-2 hover:bg-stone-800">
                              <Edit3 size={16} /> ערוך
                            </button>
                            <button onClick={() => handleDeleteAssignment(assign.id)} className="flex-1 md:flex-none bg-red-500/10 text-red-400 px-4 py-2 rounded-xl font-bold flex items-center justify-center gap-2 hover:bg-red-500/20">
                              <Trash2 size={16} /> מחק
                            </button>
                          </>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        )}

        {adminTab === "research" && (
          <div className="max-w-6xl mx-auto animate-in fade-in">
            <header className="mb-10 hidden md:block">
              <h1 className="text-3xl md:text-4xl font-black text-white tracking-tight">מחקר ועדכוני &quot;הידעת?&quot;</h1>
              <p className="text-[13px] text-stone-500 mt-1.5">חפש ספרות אקדמית מדורגת לפי ציטוטים, ובחר אילו ממצאים יוצגו למטופלים כעובדות &quot;הידעת?&quot; באפליקציה.</p>
            </header>

            <div className="bg-[#1c1c1e] rounded-[1.75rem] border border-stone-800 p-8 md:p-10 mb-10">
              <form onSubmit={handleResearchSearch} className="flex flex-col md:flex-row gap-4">
                <input
                  type="text"
                  value={researchQuery}
                  onChange={(e) => setResearchQuery(e.target.value)}
                  placeholder='נושא לחיפוש, לדוגמה: "ACL rehab"'
                  className="flex-1 border-b-2 border-stone-800 p-3 bg-transparent text-white placeholder:text-stone-600 focus:border-teal-500 focus:ring-1 focus:ring-teal-500/30 outline-none"
                  dir="auto"
                  required
                />
                <button
                  type="submit"
                  disabled={isResearchLoading}
                  className="bg-teal-500 text-stone-950 px-8 py-3.5 rounded-2xl font-black hover:bg-teal-400 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2 shrink-0"
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

              {researchError && <div className="mt-5 bg-red-500/10 border border-red-500/20 text-red-400 text-sm font-bold px-5 py-3.5 rounded-2xl">{researchError}</div>}
            </div>

            {researchResults && (
              <div className="mb-12">
                <h2 className="text-lg font-extrabold text-white mb-5 border-b-2 border-teal-500 pb-3 inline-block">
                  תוצאות עבור &quot;{researchQuery}&quot; ({researchResults.length})
                </h2>
                {researchResults.length === 0 ? (
                  <div className="text-center p-10 text-stone-500 bg-stone-950 rounded-3xl border border-stone-800">לא נמצאו מאמרים מתאימים לנושא זה. נסה ניסוח אחר או נושא רחב יותר.</div>
                ) : (
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
                    {researchResults.map((finding) => {
                      const isSaved = savedFactUrls.has(finding.paperUrl);
                      return (
                        <div key={finding.paperUrl} className="bg-[#1c1c1e] rounded-[1.75rem] border border-stone-800 p-6 flex flex-col gap-4">
                          <div>
                            <div className="flex flex-wrap items-center gap-1.5">
                              <span className="inline-flex items-center gap-1.5 bg-emerald-500/10 text-emerald-400 text-[10px] font-extrabold px-3 py-1.5 rounded-full border border-emerald-500/20">
                                <Sparkles size={11} /> הידעת?
                              </span>
                              {/* Evidence tier the search ranking already computed (see
                                  classifyEvidence/EVIDENCE_LABEL_HE in researchAgent.ts) —
                                  shown here so the admin can see at a glance why this
                                  paper ranked where it did before publishing it. */}
                              <span className="inline-flex items-center bg-stone-950 text-stone-400 text-[10px] font-bold px-3 py-1.5 rounded-full border border-stone-800">
                                {finding.citationLabelHe}
                              </span>
                            </div>
                            <p className="text-white font-bold text-[15px] leading-relaxed mt-3">{finding.didYouKnowHe}</p>
                          </div>
                          <p className="text-stone-400 text-[13px] leading-relaxed flex-1">{finding.summaryHe}</p>
                          <div className="pt-4 border-t border-stone-800">
                            <a
                              href={finding.paperUrl}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="text-[11px] font-bold text-stone-500 hover:text-teal-400 transition-colors line-clamp-2"
                            >
                              {finding.paperTitle} {finding.year ? `(${finding.year})` : ""}
                            </a>
                            <button
                              onClick={() => handleSaveFact(finding)}
                              disabled={isSaved}
                              className={`w-full mt-4 py-3 rounded-xl font-black text-sm flex items-center justify-center gap-2 transition-colors ${
                                isSaved ? "bg-emerald-500/10 text-emerald-400 cursor-default" : "bg-teal-500 text-stone-950 hover:bg-teal-400"
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
              <h2 className="text-lg font-extrabold text-white mb-5 border-b-2 border-emerald-500 pb-3 inline-block">
                עובדות פעילות באפליקציה <span className="text-emerald-400">({curatedFacts.length})</span>
              </h2>
              {curatedFacts.length === 0 ? (
                <div className="text-center p-10 text-stone-500 bg-stone-950 rounded-3xl border border-stone-800">עדיין לא נשמרו עובדות. חפש נושא למעלה כדי להתחיל.</div>
              ) : (
                <div className="space-y-3">
                  {curatedFacts.map((fact) => (
                    <div key={fact.id} className="bg-[#1c1c1e] border border-stone-800 rounded-2xl p-5 flex items-start justify-between gap-4">
                      <div className="flex-1">
                        <p className="text-white font-bold text-sm mb-1">{fact.did_you_know_he}</p>
                        <p className="text-stone-500 text-xs">
                          {fact.paper_title} {fact.year ? `· ${fact.year}` : ""}
                        </p>
                      </div>
                      <button onClick={() => handleDeleteCuratedFact(fact.id)} className="shrink-0 bg-red-500/10 text-red-400 p-2.5 rounded-xl hover:bg-red-500/20 transition-colors">
                        <Trash2 size={16} />
                      </button>
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
