"use client";

import { useMemo, useState } from "react";
import { AuthContext, type AuthContextValue } from "@/app/context/AuthContext";
import { TRANSLATIONS } from "@/app/constants/translations";
import CalendarTab from "@/app/components/patient/tabs/CalendarTab";
import DiyBuilderTab from "@/app/components/patient/tabs/DiyBuilderTab";
import MyWorkoutsScreen from "@/app/components/patient/tabs/MyWorkoutsScreen";
import ProfileTab from "@/app/components/patient/tabs/ProfileTab";
import DevDataToggle from "@/app/components/dev/DevDataToggle";
import FeedbackHost from "@/app/components/ui/FeedbackHost";
import { useDevDataMode, type DevDataMode } from "@/app/components/dev/devDataMode";
import { tabsFixture, type TabsFixture } from "@/app/components/dev/tabFixtures";
import type { Exercise } from "@/app/types";

const TABS = [
  { id: "calendar", label: "Calendar" },
  { id: "diy", label: "Builder" },
  { id: "saved", label: "My workouts" },
  { id: "profile", label: "Profile" },
] as const;
type TabId = (typeof TABS)[number]["id"];

// Renders the Calendar / builder / My workouts / Profile tabs the way
// PatientShell does, fed by tabFixtures through the same props, with a
// synthetic AuthContext for the patient's name (as ProgramSimulatorModal
// does). Builder/profile state lives here like usePlanSelection/useReminders
// would hold it; actions that would write are inert.
function TabBody({ tab, fixture }: { tab: TabId; fixture: TabsFixture }) {
  const [equip, setEquip] = useState("all");
  const [category, setCategory] = useState<string | null>("__muscle_groups__");
  const [bodyPart, setBodyPart] = useState<string | null>(null);
  const [days, setDays] = useState<Record<number, Exercise[]>>(fixture.diyDays);
  const [activeDay, setActiveDay] = useState(Number(Object.keys(fixture.diyDays)[0] ?? 1));
  const [programName, setProgramName] = useState("");
  const [reminderTime, setReminderTime] = useState("18:00");
  const [reminderDays, setReminderDays] = useState<string[]>(["0", "2", "4"]);
  const [haptics, setHaptics] = useState(true);

  if (tab === "calendar") {
    return (
      <CalendarTab
        patientExercises={fixture.patientExercises}
        workoutLogs={fixture.workoutLogs}
        patientId="-1"
        programStartDate={fixture.programStartDate}
        onSelectDate={() => {}}
        onBrowsePrograms={() => {}}
      />
    );
  }
  if (tab === "diy") {
    return (
      <DiyBuilderTab
        exerciseCatalog={fixture.catalog}
        onViewExerciseInfo={() => {}}
        diyEquipFilter={equip}
        setDiyEquipFilter={setEquip}
        diyCategoryFilter={category}
        setDiyCategoryFilter={setCategory}
        diyBodyPartFilter={bodyPart}
        setDiyBodyPartFilter={setBodyPart}
        diyExercisesByDay={days}
        setDiyExercisesByDay={setDays}
        diyActiveDay={activeDay}
        setDiyActiveDay={setActiveDay}
        onAddDiyDay={() => setDays((d) => ({ ...d, [Math.max(0, ...Object.keys(d).map(Number)) + 1]: [] }))}
        onRemoveDiyDay={(day) => setDays((d) => Object.fromEntries(Object.entries(d).filter(([k]) => Number(k) !== day)))}
        diyProgramName={programName}
        setDiyProgramName={setProgramName}
        onStartDiyWorkoutNow={() => {}}
        onOpenMyWorkouts={() => {}}
        onSaveDiyProgram={() => {}}
        isEditingSavedProgram={false}
        onCancelEditSavedProgram={() => {}}
      />
    );
  }
  if (tab === "saved") {
    return (
      <MyWorkoutsScreen
        savedPrograms={fixture.savedPrograms}
        exerciseCatalog={fixture.catalog}
        onBack={() => {}}
        onStartProgramDay={() => {}}
        onEditProgram={() => {}}
        onDeleteProgram={() => {}}
      />
    );
  }
  return (
    <ProfileTab
      workoutLogs={fixture.workoutLogs}
      reminderTime={reminderTime}
      setReminderTime={setReminderTime}
      reminderDays={reminderDays}
      setReminderDays={setReminderDays}
      onSaveSettings={() => {}}
      hapticsEnabled={haptics}
      setHapticsEnabled={setHaptics}
      triggerHaptic={() => {}}
    />
  );
}

export default function TabsHarness() {
  const mode: DevDataMode = useDevDataMode();
  const fixture = useMemo(() => tabsFixture(mode), [mode]);
  const [tab, setTab] = useState<TabId>("calendar");

  const authValue: AuthContextValue = {
    lang: "he",
    setLang: () => {},
    t: TRANSLATIONS.he,
    currentView: "patient",
    setCurrentView: () => {},
    loggedInPatient: { id: "-1", user_id: "dev", role: "patient", full_name: fixture.fullName, first_name: fixture.firstName, patient_type: "fitness" },
    setLoggedInPatient: () => {},
    handleLogout: () => {},
  };

  return (
    <AuthContext.Provider value={authValue}>
      <div className="min-h-screen bg-page text-fg">
        {/* Dev chrome: which tab is under test. Plain on purpose. */}
        <div dir="ltr" className="sticky top-0 z-[60] flex gap-1 p-2 justify-center" style={{ background: "#e4e4e7", fontFamily: "system-ui, sans-serif" }}>
          {TABS.map((t) => (
            <button
              key={t.id}
              onClick={() => setTab(t.id)}
              className="px-2.5 py-1 rounded-full text-[11px]"
              style={t.id === tab ? { background: "#fff", color: "#18181b", fontWeight: 600 } : { color: "#52525b" }}
            >
              {t.label}
            </button>
          ))}
        </div>
        <main className="max-w-5xl w-full mx-auto px-4 md:px-8 pt-6 pb-32">
          <TabBody key={`${mode}:${tab}`} tab={tab} fixture={fixture} />
        </main>
        <DevDataToggle />
        <FeedbackHost />
      </div>
    </AuthContext.Provider>
  );
}
