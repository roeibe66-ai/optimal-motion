"use client";

import { useEffect, useState } from "react";
import { supabase } from "@/app/lib/supabase";
import { useAuth } from "@/app/context/AuthContext";
import type { HapticType } from "@/app/hooks/useHaptics";
import { notify } from "@/app/components/ui/feedback";
import { enablePush, getPushStatus, type PushStatus } from "@/app/utils/pushClient";

// Why a saved reminder can't reach this device.
const PUSH_HINT: Record<PushStatus, string> = {
  on: "",
  off: "ההתראות לא הופעלו, אז התזכורות לא יגיעו",
  "needs-install": "באייפון תזכורות מגיעות רק לאפליקציה שעל מסך הבית",
  denied: "ההתראות חסומות בהגדרות הטלפון",
  unsupported: "המכשיר הזה לא תומך בהתראות",
};

// The reminder schedule — a time per weekday, {"1": "17:00", "3": "08:00"}
// (patients.reminder_schedule) — is derived from `loggedInPatient`
// (re-synced whenever it changes — login, session hydration, or a save
// below replacing it with a fresh row), so this hook is the single place
// that keeps it in sync with the account. Accounts saved before per-day
// times fall back to their one shared time on each chosen day.
const scheduleOf = (patient: { reminder_schedule?: Record<string, string> | null; reminder_time?: string; reminder_days?: string }) => {
  if (patient.reminder_schedule && Object.keys(patient.reminder_schedule).length > 0) return patient.reminder_schedule;
  if (!patient.reminder_time || !patient.reminder_days) return {};
  return Object.fromEntries(patient.reminder_days.split(",").filter(Boolean).map((d) => [d, patient.reminder_time!]));
};

export function useReminders(triggerHaptic: (type: HapticType) => void) {
  const { loggedInPatient, setLoggedInPatient } = useAuth();

  const [reminderSchedule, setReminderSchedule] = useState<Record<string, string>>({});

  useEffect(() => {
    if (!loggedInPatient) return;
    // eslint-disable-next-line react-hooks/set-state-in-effect -- resyncing the local editable schedule whenever the account it's derived from changes (login/hydration/save)
    setReminderSchedule(scheduleOf(loggedInPatient));
  }, [loggedInPatient]);

  // null turns the day off.
  const setReminderDayTime = (day: string, time: string | null) =>
    setReminderSchedule((prev) => {
      const next = { ...prev };
      if (time === null) delete next[day];
      else next[day] = time;
      return next;
    });

  const handleSaveSettings = async () => {
    if (!loggedInPatient) return;

    // Days whose time was cleared are dropped rather than saved empty.
    const cleaned = Object.fromEntries(Object.entries(reminderSchedule).filter(([, time]) => /^\d{2}:\d{2}$/.test(time)));

    // Reminders are Web Push from the server (supabase/functions/daily-reminders),
    // so this device has to be subscribed. Runs from the save tap, which iOS
    // needs for the permission prompt.
    let pushNote: string | null = null;
    if (Object.keys(cleaned).length > 0) {
      const status = await getPushStatus();
      if (status === "off") {
        const result = await enablePush();
        if (!result.ok) pushNote = PUSH_HINT[result.status];
      } else if (status !== "on") {
        pushNote = PUSH_HINT[status];
      }
    }

    const { data, error } = await supabase
      .from("patients")
      .update({ reminder_schedule: cleaned, reminder_timezone: Intl.DateTimeFormat().resolvedOptions().timeZone || "Asia/Jerusalem" })
      .eq("id", loggedInPatient.id)
      .select()
      .single();

    if (error) {
      notify("שגיאה בשמירת ההגדרות: " + error.message, "error");
      return;
    }
    if (!data) return;

    setLoggedInPatient(data);
    localStorage.setItem("optimalMotionUser", JSON.stringify(data));
    triggerHaptic("success");
    if (pushNote) notify(`התזכורות נשמרו, אבל ${pushNote}`, "error");
    else notify("ההגדרות נשמרו");
  };

  return { reminderSchedule, setReminderDayTime, handleSaveSettings };
}
