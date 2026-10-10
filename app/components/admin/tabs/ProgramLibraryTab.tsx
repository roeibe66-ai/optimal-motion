"use client";

import { useEffect, useState } from "react";
import { CheckCircle2, Crown, Dumbbell, FileDown, Loader2, Play, Send, Trash2 } from "lucide-react";
import { supabase } from "@/app/lib/supabase";
import type { Exercise, Package, PackageExercise, Patient } from "@/app/types";
import ProgramSimulatorModal from "@/app/components/admin/tabs/ProgramSimulatorModal";
import ProgramPdfExport from "@/app/components/admin/tabs/ProgramPdfExport";
import AssignToPatientsModal, { type AssignResult } from "@/app/components/admin/AssignToPatientsModal";

interface ProgramLibraryTabProps {
  packages: Package[];
  exercises: Exercise[];
  patients: Patient[];
  onRefresh: () => void; // re-fetches `packages` (and everything else) up in LegacyAdminApp
}

// Every template built in the drag-and-drop builder ("protocol" mode) lands
// in `packages` — this tab is where they're actually managed afterward:
// publish/unpublish (published = listed in the patient Explore tab), mark
// free/premium, assign a copy to a real patient, delete, or run the exact
// patient-facing player against one without leaving the admin console.
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

  const handleToggleFree = async (pkg: Package) => {
    setBusyPackageId(pkg.id);
    const { error } = await supabase.from("packages").update({ is_free: !pkg.is_free }).eq("id", pkg.id);
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

  // One named program per selected patient — a failure for one patient
  // (rolled back) doesn't stop the others.
  const handleAssign = async (pkg: Package, patientIds: string[], programName: string): Promise<AssignResult> => {
    const rows = rowsForPackage(pkg.id);
    const failed: AssignResult["failed"] = [];
    if (rows.length === 0) {
      return { failed: patientIds.map((id) => ({ patientName: patientNameOf(id), message: "לתבנית אין תרגילים" })) };
    }
    for (const patientId of patientIds) {
      const { data: program, error: programErr } = await supabase
        .from("patient_programs")
        .insert([{ patient_id: patientId, name: programName, source_package_id: pkg.id }])
        .select()
        .single();
      if (programErr) {
        failed.push({ patientName: patientNameOf(patientId), message: programErr.message });
        continue;
      }
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
        weight_kg: pe.weight_kg ?? null,
      }));
      const { error } = await supabase.from("patient_exercises").insert(inserts);
      if (error) {
        await supabase.from("patient_programs").delete().eq("id", program.id);
        failed.push({ patientName: patientNameOf(patientId), message: error.message });
      }
    }
    return { failed };
  };

  const patientNameOf = (id: string) => patients.find((p) => String(p.id) === id)?.full_name ?? id;

  return (
    <div className="max-w-6xl mx-auto">
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
                  <div className="shrink-0 flex flex-col items-end gap-1.5">
                    <span
                      className={`text-[10px] font-extrabold uppercase tracking-wider px-2.5 py-1 rounded-full ${
                        isPublished ? "bg-accent/15 text-accent-fg" : "bg-surface-alt text-muted"
                      }`}
                    >
                      {isPublished ? "מפורסם בטאב גלה" : "טיוטה"}
                    </span>
                    <span
                      className={`text-[10px] font-extrabold uppercase tracking-wider px-2.5 py-1 rounded-full ${
                        pkg.is_free ? "bg-surface-alt text-muted" : "bg-warm text-on-accent"
                      }`}
                    >
                      {pkg.is_free ? "חינמי" : "פרימיום"}
                    </span>
                  </div>
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
                    <Send size={13} /> שיוך למטופלים
                  </button>
                  <button
                    onClick={() => handleTogglePublish(pkg)}
                    disabled={isBusy}
                    className="on-light flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-surface-alt text-fg text-xs font-bold hover:bg-line transition-colors disabled:opacity-30"
                  >
                    <CheckCircle2 size={13} /> {isPublished ? "הסר מגלה" : "פרסם לגלה"}
                  </button>
                  <button
                    onClick={() => handleToggleFree(pkg)}
                    disabled={isBusy}
                    className="on-light flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-surface-alt text-fg text-xs font-bold hover:bg-line transition-colors disabled:opacity-30"
                  >
                    <Crown size={13} /> {pkg.is_free ? "הפוך לפרימיום" : "הפוך לחינמי"}
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
        <AssignToPatientsModal
          heading="שיוך תבנית למטופלים"
          subtitle={assigningPackage.title}
          defaultProgramName={assigningPackage.title}
          patients={patients}
          askSchedule={false}
          onClose={() => setAssigningPackage(null)}
          onAssign={(ids, name) => handleAssign(assigningPackage, ids, name)}
        />
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
