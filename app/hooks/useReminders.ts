"use client";

import { useEffect, useState } from "react";
import { supabase } from "@/app/lib/supabase";
import { useAuth } from "@/app/context/AuthContext";
import type { HapticType } from "@/app/hooks/useHaptics";
import { notify } from "@/app/components/ui/feedback";

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
  const [lastNotificationDate, setLastNotificationDate] = useState("");

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

  // Checked every minute: fire a local notification once per day, at that
  // day's own time.
  useEffect(() => {
    if (!loggedInPatient || Object.keys(reminderSchedule).length === 0) return;

    const checkReminder = () => {
      const now = new Date();
      const todayTime = reminderSchedule[now.getDay().toString()];
      const currentTimeStr = `${now.getHours().toString().padStart(2, "0")}:${now.getMinutes().toString().padStart(2, "0")}`;
      const todayDateStr = now.toDateString();

      if (todayTime && currentTimeStr === todayTime && lastNotificationDate !== todayDateStr) {
        if ("Notification" in window && Notification.permission === "granted") {
          new Notification("הגיע הזמן להתאמן! 💪", {
            body: "התוכנית שלך באופטימל מושן מחכה לך. בוא נתחיל!",
            icon: "/icon.png",
          });
          setLastNotificationDate(todayDateStr);
        }
      }
    };

    const interval = setInterval(checkReminder, 60000);
    return () => clearInterval(interval);
  }, [loggedInPatient, reminderSchedule, lastNotificationDate]);

  const handleSaveSettings = async () => {
    if (!loggedInPatient) return;

    if ("Notification" in window) {
      if (Notification.permission !== "granted" && Notification.permission !== "denied") {
        await Notification.requestPermission();
      }
    }

    // Days whose time was cleared are dropped rather than saved empty.
    const cleaned = Object.fromEntries(Object.entries(reminderSchedule).filter(([, time]) => /^\d{2}:\d{2}$/.test(time)));
    const { data, error } = await supabase
      .from("patients")
      .update({ reminder_schedule: cleaned })
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
    notify("ההגדרות נשמרו");
  };

  return { reminderSchedule, setReminderDayTime, handleSaveSettings };
}
