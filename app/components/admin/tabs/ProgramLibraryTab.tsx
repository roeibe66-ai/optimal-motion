"use client";

import { useEffect, useState } from "react";
import { CheckCircle2, Dumbbell, FileDown, Loader2, Play, Send, Trash2, X } from "lucide-react";
import { supabase } from "@/app/lib/supabase";
import type { Exercise, Package, PackageExercise, Patient } from "@/app/types";
import ProgramSimulatorModal from "@/app/components/admin/tabs/ProgramSimulatorModal";
import ProgramPdfExport from "@/app/components/admin/tabs/ProgramPdfExport";

interface ProgramLibraryTabProps {
  packages: Package[];
  exercises: Exercise[];
  patients: Patient[];
  onRefresh: () => void; // re-fetches `packages` (and everything else) up in LegacyAdminApp
}

// Every template built in the drag-and-drop builder ("protocol" mode) lands
// in `packages` — this tab is where they're actually managed afterward:
// publish/unpublish, assign a copy to a real patient, delete, or run the
// exact patient-facing player against one without leaving the admin console.
export default function ProgramLibraryTab({ packages, exercises, patients, onRefresh }: ProgramLibraryTabProps) {
  const [packageExercises, setPackageExercises] = useState<PackageExercise[]>([]);
  const [isLoadingExercises, setIsLoadingExercises] = useState(true);
  const [simulatingPackage, setSimulatingPackage] = useState<Package | null>(null);
  const [assigningPackage, setAssigningPackage] = useState<Package | null>(null);
  const [exportingPackage, setExportingPackage] = useState<Package | null>(null);
  const [busyPackageId, setBusyPackageId] = useState<string | null>(null);

  const fetchPackageExercises = async () => {
    setIsLoadingExercises(true);
    const { data } = await supabase.from("package_exercises").select("*");
    if (data) setPackageExercises(data as PackageExercise[]);
    setIsLoadingExercises(false);
  };

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect -- fetching from Supabase, an external system, on mount
    fetchPackageExercises();
  }, []);

  const rowsForPackage = (packageId: string) => packageExercises.filter((pe) => String(pe.package_id) === String(packageId));

  const handleTogglePublish = async (pkg: Package) => {
    setBusyPackageId(pkg.id);
    const nextStatus = pkg.status === "published" ? "draft" : "published";
    const { error } = await supabase.from("packages").update({ status: nextStatus }).eq("id", pkg.id);
    setBusyPackageId(null);
    if (error) alert("שגיאה: " + error.message);
    else onRefresh();
  };

  const handleDelete = async (pkg: Package) => {
    if (!confirm(`למחוק לצמיתות את התבנית "${pkg.title}"? הפעולה אינה הפיכה.`)) return;
    setBusyPackageId(pkg.id);
    const { error: peErr } = await supabase.from("package_exercises").delete().eq("package_id", pkg.id);
    if (peErr) {
      setBusyPackageId(null);
      return alert("שגיאה במחיקת תרגילי התבנית: " + peErr.message);
    }
    const { error } = await supabase.from("packages").delete().eq("id", pkg.id);
    setBusyPackageId(null);
    if (error) alert("שגיאה: " + error.message);
    else {
      onRefresh();
      fetchPackageExercises();
    }
  };

  const handleAssign = async (pkg: Package, patientId: string, programName: string) => {
    const rows = rowsForPackage(pkg.id);
    if (rows.length === 0) return alert("לתבנית הזו אין תרגילים לשיוך.");
    // Every assignment is a named program — the name is what the patient sees.
    const { data: program, error: programErr } = await supabase
      .from("patient_programs")
      .insert([{ patient_id: patientId, name: programName }])
      .select()
      .single();
    if (programErr) return alert("שגיאה ביצירת התוכנית: " + programErr.message);
    const inserts = rows.map((pe) => ({
      patient_id: patientId,
      program_id: program.id,
      exercise_id: pe.exercise_id,
      block: pe.block || "A",
      sets: Number(pe.sets) || 0,
      reps: Number(pe.reps) || 0,
      rir: pe.rir,
      is_time: pe.is_time,
      notes: "",
      scheduled_days: pe.scheduled_days,
      week: pe.week || 1,
      rest_time_seconds: pe.rest_time_seconds ?? 60,
    }));
    const { error } = await supabase.from("patient_exercises").insert(inserts);
    if (error) {
      await supabase.from("patient_programs").delete().eq("id", program.id);
      alert("שגיאה בשיוך התבנית: " + error.message);
    } else {
      alert("התבנית שויכה בהצלחה למטופל!");
      setAssigningPackage(null);
    }
  };

  return (
    <div className="max-w-6xl mx-auto animate-in fade-in">
      <header className="mb-10 hidden md:block">
        <h1 className="text-3xl md:text-4xl font-black text-fg tracking-tight">ספריית תוכניות</h1>
        <p className="text-muted font-medium mt-2">נהל, שגר ובדוק את התבניות שבנית בבונה החכם.</p>
      </header>

      {isLoadingExercises && packages.length > 0 && (
        <div className="flex items-center gap-2 text-muted text-sm mb-6">
          <Loader2 size={14} className="animate-spin" /> טוען תרגילי תבניות...
        </div>
      )}

      {packages.length === 0 ? (
        <div className="on-light text-center p-14 text-muted bg-surface rounded-[1.75rem] border border-line">
          <Dumbbell size={36} className="mx-auto mb-4 text-muted" />
          עדיין לא נבנו תבניות. עבור ל&quot;בונה חכם &amp; פרוטוקולים&quot; ושמור תבנית ראשונה.
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
          {packages.map((pkg) => {
            const rows = rowsForPackage(pkg.id);
            const exerciseCount = rows.length;
            const isPublished = pkg.status === "published";
            const isBusy = busyPackageId === pkg.id;

            return (
              <div key={pkg.id} className="on-light bg-surface rounded-[1.75rem] border border-line p-6 flex flex-col gap-4 hover:border-line-input transition-colors">
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0">
                    <h3 className="text-lg font-black text-fg truncate">{pkg.title}</h3>
                    {pkg.description && <p className="text-sm text-muted mt-1 line-clamp-2">{pkg.description}</p>}
                  </div>
                  <span
                    className={`shrink-0 text-[10px] font-extrabold uppercase tracking-wider px-2.5 py-1 rounded-full ${
                      isPublished ? "bg-accent/15 text-accent-fg" : "bg-surface-alt text-muted"
                    }`}
                  >
                    {isPublished ? "פורסם" : "טיוטה"}
                  </span>
                </div>

                <div className="text-xs font-bold text-muted">{exerciseCount} תרגילים</div>

                <div className="flex flex-wrap gap-2 mt-auto pt-2 border-t border-line">
                  <button
                    onClick={() => setSimulatingPackage(pkg)}
                    disabled={exerciseCount === 0}
                    className="flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-btn-primary text-btn-primary-fg text-xs font-extrabold hover:bg-btn-primary-hover active:bg-btn-primary-active transition-colors disabled:bg-disabled disabled:text-disabled-fg disabled:hover:bg-disabled disabled:pointer-events-none"
                  >
                    <Play size={13} fill="currentColor" /> הרץ / בדוק
                  </button>
                  <button
                    onClick={() => setAssigningPackage(pkg)}
                    disabled={exerciseCount === 0}
                    className="on-light flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-surface-alt text-fg text-xs font-bold hover:bg-line transition-colors disabled:opacity-30 disabled:pointer-events-none"
                  >
                    <Send size={13} /> שיוך למטופל
                  </button>
                  <button
                    onClick={() => handleTogglePublish(pkg)}
                    disabled={isBusy}
                    className="on-light flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-surface-alt text-fg text-xs font-bold hover:bg-line transition-colors disabled:opacity-30"
                  >
                    <CheckCircle2 size={13} /> {isPublished ? "בטל פרסום" : "פרסם"}
                  </button>
                  <button
                    onClick={() => setExportingPackage(pkg)}
                    disabled={exerciseCount === 0}
                    className="on-light flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-surface-alt text-fg text-xs font-bold hover:bg-line transition-colors disabled:opacity-30 disabled:pointer-events-none"
                  >
                    <FileDown size={13} /> PDF
                  </button>
                  <button
                    onClick={() => handleDelete(pkg)}
                    disabled={isBusy}
                    className="flex items-center gap-1.5 px-3 py-2 rounded-xl bg-danger text-on-danger text-xs font-bold hover:brightness-110 transition-colors disabled:opacity-30 mr-auto"
                  >
                    <Trash2 size={13} />
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {assigningPackage && (
        <AssignModal patients={patients} pkg={assigningPackage} onClose={() => setAssigningPackage(null)} onAssign={handleAssign} />
      )}

      {simulatingPackage && (
        <ProgramSimulatorModal
          pkg={simulatingPackage}
          packageExercises={rowsForPackage(simulatingPackage.id)}
          exerciseCatalog={exercises}
          onClose={() => setSimulatingPackage(null)}
        />
      )}

      {exportingPackage && (
        <ProgramPdfExport
          pkg={exportingPackage}
          packageExercises={rowsForPackage(exportingPackage.id)}
          exerciseCatalog={exercises}
          onClose={() => setExportingPackage(null)}
        />
      )}
    </div>
  );
}

interface AssignModalProps {
  patients: Patient[];
  pkg: Package;
  onClose: () => void;
  onAssign: (pkg: Package, patientId: string, programName: string) => Promise<void>;
}

function AssignModal({ patients, pkg, onClose, onAssign }: AssignModalProps) {
  const [patientId, setPatientId] = useState("");
  const [programName, setProgramName] = useState(pkg.title);
  const [isSaving, setIsSaving] = useState(false);

  const submit = async () => {
    if (!patientId || !programName.trim()) return;
    setIsSaving(true);
    await onAssign(pkg, patientId, programName.trim());
    setIsSaving(false);
  };

  return (
    <div className="fixed inset-0 z-[250] bg-scrim/70 backdrop-blur-sm flex items-center justify-center p-4">
      <div className="bg-elevated border border-line rounded-[1.75rem] p-7 w-full max-w-sm">
        <div className="flex items-start justify-between mb-5">
          <div>
            <h3 className="text-lg font-black text-fg">שיוך תבנית למטופל</h3>
            <p className="text-sm text-muted mt-1">{pkg.title}</p>
          </div>
          <button onClick={onClose} className="text-muted hover:text-fg">
            <X size={20} />
          </button>
        </div>

        <label className="block text-[10px] font-extrabold text-muted mb-2 uppercase tracking-wider">בחר מטופל</label>
        <select
          value={patientId}
          onChange={(e) => setPatientId(e.target.value)}
          className="on-light w-full border-b-2 border-line p-2 outline-none font-bold text-fg bg-surface mb-6 focus:border-focus focus:ring-2 focus:ring-focus"
        >
          <option value="" className="on-light bg-surface">
            -- בחר מטופל --
          </option>
          {patients.map((p) => (
            <option key={p.id} value={p.id} className="on-light bg-surface">
              {p.full_name}
            </option>
          ))}
        </select>

        <label className="block text-[10px] font-extrabold text-muted mb-2 uppercase tracking-wider">שם התוכנית (מה שהמטופל יראה)</label>
        <input
          type="text"
          value={programName}
          onChange={(e) => setProgramName(e.target.value)}
          className="on-light w-full border-b-2 border-line p-2 outline-none font-bold text-fg bg-surface mb-6 focus:border-focus focus:ring-2 focus:ring-focus"
        />

        <button
          onClick={submit}
          disabled={!patientId || !programName.trim() || isSaving}
          className="w-full flex items-center justify-center gap-2 py-3.5 rounded-xl bg-btn-primary text-btn-primary-fg hover:bg-btn-primary-hover active:bg-btn-primary-active font-extrabold disabled:bg-disabled disabled:text-disabled-fg disabled:hover:bg-disabled"
        >
          {isSaving ? <Loader2 size={16} className="animate-spin" /> : <Send size={16} />}
          שגר תוכנית
        </button>
      </div>
    </div>
  );
}
