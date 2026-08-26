"use client";

import { useEffect, useState } from "react";
import { supabase } from "@/app/lib/supabase";
import { useAuth } from "@/app/context/AuthContext";
import type { HapticType } from "@/app/hooks/useHaptics";

// Reminder time/days are derived from `loggedInPatient` (re-synced whenever
// it changes — login, session hydration, or a save below replacing it with a
// fresh row) rather than being seeded ad-hoc from each auth flow, so this
// hook is the single place that keeps them in sync with the account.
export function useReminders(triggerHaptic: (type: HapticType) => void) {
  const { loggedInPatient, setLoggedInPatient } = useAuth();

  const [reminderTime, setReminderTime] = useState("");
  const [reminderDays, setReminderDays] = useState<string[]>([]);
  const [lastNotificationDate, setLastNotificationDate] = useState("");

  useEffect(() => {
    if (!loggedInPatient) return;
    // eslint-disable-next-line react-hooks/set-state-in-effect -- resyncing local editable fields whenever the account they're derived from changes (login/hydration/save)
    setReminderTime(loggedInPatient.reminder_time || "");
    setReminderDays(loggedInPatient.reminder_days ? loggedInPatient.reminder_days.split(",") : []);
  }, [loggedInPatient]);

  // Daily check: fire a local notification once per day at the saved time,
  // on a saved day.
  useEffect(() => {
    if (!loggedInPatient || !reminderTime || reminderDays.length === 0) return;

    const checkReminder = () => {
      const now = new Date();
      const currentDayStr = now.getDay().toString();
      const currentHour = now.getHours().toString().padStart(2, "0");
      const currentMin = now.getMinutes().toString().padStart(2, "0");
      const currentTimeStr = `${currentHour}:${currentMin}`;
      const todayDateStr = now.toDateString();

      if (reminderDays.includes(currentDayStr) && currentTimeStr === reminderTime && lastNotificationDate !== todayDateStr) {
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
  }, [loggedInPatient, reminderTime, reminderDays, lastNotificationDate]);

  const handleSaveSettings = async () => {
    if (!loggedInPatient) return;

    if ("Notification" in window) {
      if (Notification.permission !== "granted" && Notification.permission !== "denied") {
        await Notification.requestPermission();
      }
    }

    const updatedDays = reminderDays.join(",");
    const { data, error } = await supabase
      .from("patients")
      .update({ reminder_time: reminderTime, reminder_days: updatedDays })
      .eq("id", loggedInPatient.id)
      .select()
      .single();

    if (error) {
      alert("שגיאה בשמירת ההגדרות: " + error.message);
      return;
    }
    if (!data) return;

    setLoggedInPatient(data);
    localStorage.setItem("optimalMotionUser", JSON.stringify(data));
    triggerHaptic("success");
    alert("ההגדרות עודכנו! נשמרו העדפות ההתראה והרטט.");
  };

  return { reminderTime, setReminderTime, reminderDays, setReminderDays, handleSaveSettings };
}
