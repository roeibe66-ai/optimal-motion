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

  const handleAssign = async (pkg: Package, patientId: string) => {
    const rows = rowsForPackage(pkg.id);
    if (rows.length === 0) return alert("לתבנית הזו אין תרגילים לשיוך.");
    const inserts = rows.map((pe) => ({
      patient_id: patientId,
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
    if (error) alert("שגיאה בשיוך התבנית: " + error.message);
    else {
      alert("התבנית שויכה בהצלחה למטופל!");
      setAssigningPackage(null);
    }
  };

  return (
    <div className="max-w-6xl mx-auto animate-in fade-in">
      <header className="mb-10 hidden md:block">
        <h1 className="text-3xl md:text-4xl font-black text-white tracking-tight">ספריית תוכניות</h1>
        <p className="text-stone-500 font-medium mt-2">נהל, שגר ובדוק את התבניות שבנית בבונה החכם.</p>
      </header>

      {isLoadingExercises && packages.length > 0 && (
        <div className="flex items-center gap-2 text-stone-500 text-sm mb-6">
          <Loader2 size={14} className="animate-spin" /> טוען תרגילי תבניות...
        </div>
      )}

      {packages.length === 0 ? (
        <div className="text-center p-14 text-stone-500 bg-[#1c1c1e] rounded-[1.75rem] border border-stone-800">
          <Dumbbell size={36} className="mx-auto mb-4 text-stone-700" />
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
              <div key={pkg.id} className="bg-[#1c1c1e] rounded-[1.75rem] border border-stone-800 p-6 flex flex-col gap-4 hover:border-stone-700 transition-colors">
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0">
                    <h3 className="text-lg font-black text-white truncate">{pkg.title}</h3>
                    {pkg.description && <p className="text-sm text-stone-500 mt-1 line-clamp-2">{pkg.description}</p>}
                  </div>
                  <span
                    className={`shrink-0 text-[10px] font-extrabold uppercase tracking-wider px-2.5 py-1 rounded-full ${
                      isPublished ? "bg-teal-500/15 text-teal-400" : "bg-stone-500/15 text-stone-400"
                    }`}
                  >
                    {isPublished ? "פורסם" : "טיוטה"}
                  </span>
                </div>

                <div className="text-xs font-bold text-stone-500">{exerciseCount} תרגילים</div>

                <div className="flex flex-wrap gap-2 mt-auto pt-2 border-t border-stone-800">
                  <button
                    onClick={() => setSimulatingPackage(pkg)}
                    disabled={exerciseCount === 0}
                    className="flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-teal-500 text-stone-950 text-xs font-extrabold hover:bg-teal-400 transition-colors disabled:opacity-30 disabled:pointer-events-none"
                  >
                    <Play size={13} fill="currentColor" /> הרץ / בדוק
                  </button>
                  <button
                    onClick={() => setAssigningPackage(pkg)}
                    disabled={exerciseCount === 0}
                    className="flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-white/5 text-white text-xs font-bold hover:bg-white/10 transition-colors disabled:opacity-30 disabled:pointer-events-none"
                  >
                    <Send size={13} /> שיוך למטופל
                  </button>
                  <button
                    onClick={() => handleTogglePublish(pkg)}
                    disabled={isBusy}
                    className="flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-white/5 text-stone-300 text-xs font-bold hover:bg-white/10 transition-colors disabled:opacity-30"
                  >
                    <CheckCircle2 size={13} /> {isPublished ? "בטל פרסום" : "פרסם"}
                  </button>
                  <button
                    onClick={() => setExportingPackage(pkg)}
                    disabled={exerciseCount === 0}
                    className="flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-white/5 text-stone-300 text-xs font-bold hover:bg-white/10 transition-colors disabled:opacity-30 disabled:pointer-events-none"
                  >
                    <FileDown size={13} /> PDF
                  </button>
                  <button
                    onClick={() => handleDelete(pkg)}
                    disabled={isBusy}
                    className="flex items-center gap-1.5 px-3 py-2 rounded-xl bg-red-500/10 text-red-400 text-xs font-bold hover:bg-red-500/20 transition-colors disabled:opacity-30 mr-auto"
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
  onAssign: (pkg: Package, patientId: string) => Promise<void>;
}

function AssignModal({ patients, pkg, onClose, onAssign }: AssignModalProps) {
  const [patientId, setPatientId] = useState("");
  const [isSaving, setIsSaving] = useState(false);

  const submit = async () => {
    if (!patientId) return;
    setIsSaving(true);
    await onAssign(pkg, patientId);
    setIsSaving(false);
  };

  return (
    <div className="fixed inset-0 z-[250] bg-black/70 backdrop-blur-sm flex items-center justify-center p-4">
      <div className="bg-[#1c1c1e] border border-stone-800 rounded-[1.75rem] p-7 w-full max-w-sm">
        <div className="flex items-start justify-between mb-5">
          <div>
            <h3 className="text-lg font-black text-white">שיוך תבנית למטופל</h3>
            <p className="text-sm text-stone-500 mt-1">{pkg.title}</p>
          </div>
          <button onClick={onClose} className="text-stone-500 hover:text-white">
            <X size={20} />
          </button>
        </div>

        <label className="block text-[10px] font-extrabold text-stone-400 mb-2 uppercase tracking-wider">בחר מטופל</label>
        <select
          value={patientId}
          onChange={(e) => setPatientId(e.target.value)}
          className="w-full border-b-2 border-teal-500 p-2 outline-none font-bold text-white bg-transparent mb-6"
        >
          <option value="" className="bg-stone-950">
            -- בחר מטופל --
          </option>
          {patients.map((p) => (
            <option key={p.id} value={p.id} className="bg-stone-950">
              {p.full_name}
            </option>
          ))}
        </select>

        <button
          onClick={submit}
          disabled={!patientId || isSaving}
          className="w-full flex items-center justify-center gap-2 py-3.5 rounded-xl bg-teal-500 text-stone-950 font-extrabold disabled:opacity-40"
        >
          {isSaving ? <Loader2 size={16} className="animate-spin" /> : <Send size={16} />}
          שגר תוכנית
        </button>
      </div>
    </div>
  );
}
