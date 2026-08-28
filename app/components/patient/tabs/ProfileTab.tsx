"use client";

import { useState, type Dispatch, type SetStateAction } from "react";
import { Activity, Bell, ChevronLeft, CheckCircle, Crown, Flame, Globe, LogOut, Medal, Receipt } from "lucide-react";
import { useAuth } from "@/app/context/AuthContext";
import { DAYS_OF_WEEK } from "@/app/constants/catalog";
import { getUserRank } from "@/app/utils/scoring";
import type { HapticType } from "@/app/hooks/useHaptics";
import type { WorkoutLog } from "@/app/types";

interface ProfileTabProps {
  workoutLogs: WorkoutLog[];
  reminderTime: string;
  setReminderTime: (value: string) => void;
  reminderDays: string[];
  setReminderDays: Dispatch<SetStateAction<string[]>>;
  onSaveSettings: () => void;
  hapticsEnabled: boolean;
  setHapticsEnabled: Dispatch<SetStateAction<boolean>>;
  triggerHaptic: (type: HapticType) => void;
}

// The gamification hub: streak/rank/practice stats, then the settings list
// (premium management / invoices / edit details are still non-functional
// placeholders in the original — ported as-is, not wired to anything, since
// they weren't wired to anything there either).
export default function ProfileTab({
  workoutLogs,
  reminderTime,
  setReminderTime,
  reminderDays,
  setReminderDays,
  onSaveSettings,
  hapticsEnabled,
  setHapticsEnabled,
  triggerHaptic,
}: ProfileTabProps) {
  const { loggedInPatient, lang, setLang, handleLogout } = useAuth();

  // Fallback "member since" date for the (unexpected) case created_at is
  // missing — computed once via lazy useState init rather than calling
  // Date.now() directly in the render body, which the compiler flags as an
  // impure call.
  const [fallbackJoinDate] = useState(() => new Date());

  const userLogs = workoutLogs.filter((l) => l.patient_id === loggedInPatient?.id);
  const totalWorkouts = userLogs.length;
  const rank = getUserRank(totalWorkouts);

  let streak = 0;
  if (userLogs.length > 0) {
    const lastLogDate = new Date(userLogs[0].created_at);
    const now = new Date();
    const diffDays = Math.floor((now.getTime() - lastLogDate.getTime()) / (1000 * 3600 * 24));
    if (diffDays <= 2) streak = Math.min(totalWorkouts, 14);
  }

  const toggleHaptics = () => {
    const newState = !hapticsEnabled;
    setHapticsEnabled(newState);
    localStorage.setItem("optimalMotionHaptics", String(newState));
    triggerHaptic("light");
  };

  // Real two-letter initials (first letter of first + last name) instead of
  // the first two characters of the raw string, so a Hebrew "First Last"
  // name reads as two meaningful initials on the avatar, matching the mockup.
  const initials = loggedInPatient?.full_name
    ? loggedInPatient.full_name
        .trim()
        .split(/\s+/)
        .map((part) => part.charAt(0))
        .slice(0, 2)
        .join("")
        .toUpperCase()
    : "";

  return (
    <div className="animate-in fade-in duration-500">
      <div className="bg-[#1c1c1e] text-white rounded-[2rem] p-6 md:p-10 shadow-2xl relative overflow-hidden mb-8 border border-stone-800">
        <div className="absolute top-0 right-0 w-64 h-64 bg-purple-500 rounded-full mix-blend-screen filter blur-3xl opacity-10 animate-pulse"></div>

        <div className="relative z-10 flex items-center gap-6 mb-10">
          <div className="w-24 h-24 rounded-full bg-amber-500 text-stone-950 flex items-center justify-center text-3xl font-black shadow-lg">
            {initials}
          </div>
          <div>
            <h2 className="text-3xl font-black tracking-tight">{loggedInPatient?.full_name}</h2>
            <p className="text-stone-400 text-sm flex items-center gap-2 mt-1">
              <Crown size={14} /> חבר מאז{" "}
              {new Date(loggedInPatient?.created_at || fallbackJoinDate).toLocaleDateString("he-IL", { month: "long", year: "numeric" })}
            </p>
          </div>
        </div>

        <div className="grid grid-cols-3 gap-4 mb-8">
          <div className="bg-stone-900/50 p-4 md:p-6 rounded-3xl border border-stone-800 flex flex-col items-center justify-center text-center">
            <Flame size={28} className="text-orange-500 mb-2" />
            <h4 className="text-2xl md:text-3xl font-black">{streak}</h4>
            <span className="text-[10px] md:text-xs text-stone-500 font-bold uppercase tracking-wider mt-1">ימי רצף</span>
          </div>
          <div className="bg-stone-900/50 p-4 md:p-6 rounded-3xl border border-stone-800 flex flex-col items-center justify-center text-center">
            <Medal size={28} className={`${rank.color} mb-2`} />
            <h4 className={`text-xl md:text-2xl font-black ${rank.color}`}>{rank.name}</h4>
            <span className="text-[10px] md:text-xs text-stone-500 font-bold uppercase tracking-wider mt-1">דרגה</span>
          </div>
          <div className="bg-stone-900/50 p-4 md:p-6 rounded-3xl border border-stone-800 flex flex-col items-center justify-center text-center">
            <CheckCircle size={28} className="text-teal-400 mb-2" />
            <h4 className="text-2xl md:text-3xl font-black">{totalWorkouts}</h4>
            <span className="text-[10px] md:text-xs text-stone-500 font-bold uppercase tracking-wider mt-1">אימונים</span>
          </div>
        </div>

        <div className="bg-stone-900/50 p-6 rounded-3xl border border-stone-800">
          <div className="flex justify-between items-end mb-3">
            <div>
              <span className={`text-sm font-bold flex items-center gap-2 ${rank.color}`}>
                <Medal size={16} /> {rank.name} · {totalWorkouts} אימונים
              </span>
            </div>
            {rank.next && <span className="text-xs text-stone-500 font-bold">עוד {rank.max - totalWorkouts} ל-{rank.next}</span>}
          </div>
          <div className="h-3 w-full bg-stone-950 rounded-full overflow-hidden border border-stone-800">
            <div className={`h-full ${rank.bg} transition-all duration-1000`} style={{ width: `${rank.percent}%` }}></div>
          </div>
        </div>
      </div>

      {/* תפריט הגדרות פרופיל */}
      <div className="bg-[#1c1c1e] rounded-[2rem] p-4 shadow-sm border border-stone-800">
        <div className="space-y-2">
          <button className="w-full flex items-center justify-between p-4 hover:bg-stone-800 rounded-2xl transition-colors group">
            <div className="flex items-center gap-4">
              <div className="w-10 h-10 rounded-full bg-amber-500/20 text-amber-500 flex items-center justify-center">
                <Crown size={18} />
              </div>
              <div className="text-right">
                <h4 className="font-bold text-white text-sm">ניהול מנוי פרימיום</h4>
                <p className="text-xs text-stone-500">הצטרפות, שדרוג וביטול מסלולים</p>
              </div>
            </div>
            <ChevronLeft size={20} className="text-stone-600 group-hover:text-stone-400" />
          </button>

          <button className="w-full flex items-center justify-between p-4 hover:bg-stone-800 rounded-2xl transition-colors group">
            <div className="flex items-center gap-4">
              <div className="w-10 h-10 rounded-full bg-blue-500/20 text-blue-400 flex items-center justify-center">
                <Receipt size={18} />
              </div>
              <div className="text-right">
                <h4 className="font-bold text-white text-sm">חשבוניות וקבלות</h4>
                <p className="text-xs text-stone-500">היסטוריית תשלומים באפליקציה</p>
              </div>
            </div>
            <ChevronLeft size={20} className="text-stone-600 group-hover:text-stone-400" />
          </button>

          {/* Note: the mockup drops the "edit personal details" row entirely (Premium/Invoices/Notifications/Haptics/Logout only) — removed to match; it was a non-functional placeholder with no onClick either way, so nothing behavioral is lost. */}

          {/* הגדרות התראות באזור האישי */}
          <div className="flex flex-col p-4 border-t border-stone-800 mt-2 pt-4 gap-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-4">
                <div className="w-10 h-10 rounded-full bg-purple-500/20 text-purple-400 flex items-center justify-center">
                  <Bell size={18} />
                </div>
                <div className="text-right">
                  <h4 className="font-bold text-white text-sm">התראות אימון (Push)</h4>
                  <p className="text-xs text-stone-500">בחר שעה וימים לקבלת תזכורת</p>
                </div>
              </div>
            </div>

            <div className="bg-stone-950 p-4 rounded-xl flex flex-col md:flex-row gap-4 items-center border border-stone-800">
              <input
                type="time"
                value={reminderTime}
                onChange={(e) => setReminderTime(e.target.value)}
                className="text-center font-black text-white border border-stone-700 rounded-lg p-2 focus:border-teal-500 outline-none bg-[#1c1c1e]"
              />
              <div className="flex flex-wrap justify-center gap-1">
                {DAYS_OF_WEEK.map((day) => {
                  const isSelected = reminderDays.includes(day.id);
                  return (
                    <button
                      key={day.id}
                      type="button"
                      onClick={() => setReminderDays((prev) => (isSelected ? prev.filter((d) => d !== day.id) : [...prev, day.id]))}
                      className={`w-8 h-8 rounded-lg font-bold text-xs transition-colors ${isSelected ? "bg-purple-500 text-white shadow-sm" : "bg-stone-800 text-stone-500 hover:bg-stone-700 border border-stone-700"}`}
                    >
                      {lang === "he" ? day.he_short : day.short}
                    </button>
                  );
                })}
              </div>
              <button onClick={onSaveSettings} className="bg-white text-stone-900 px-4 py-2 rounded-lg text-sm font-bold hover:bg-stone-200 w-full md:w-auto">
                שמור
              </button>
            </div>
          </div>

          <div className="flex items-center justify-between p-4 border-t border-stone-800">
            <div className="flex items-center gap-4">
              <div className="w-10 h-10 rounded-full bg-teal-500/20 text-teal-400 flex items-center justify-center">
                <Activity size={18} />
              </div>
              <div className="text-right">
                <h4 className="font-bold text-white text-sm">פידבק רטט (Haptics)</h4>
                <p className="text-xs text-stone-500">רטט בסיום סטים ומנוחה</p>
              </div>
            </div>
            {/* Size tuned to the mockup; the enabled/disabled positioning classes below are untouched per the brief — don't change that logic, only confirm the visuals match it */}
            <button onClick={toggleHaptics} className={`w-[46px] h-[26px] rounded-full transition-colors relative flex items-center ${hapticsEnabled ? "bg-teal-500" : "bg-stone-700"}`}>
              <div className={`w-5 h-5 bg-white rounded-full absolute shadow-sm transition-transform ${hapticsEnabled ? "left-1" : "right-1"}`}></div>
            </button>
          </div>

          <button onClick={() => setLang(lang === "he" ? "en" : "he")} className="w-full flex items-center justify-between p-4 hover:bg-stone-800 rounded-2xl transition-colors group mt-2 border-t border-stone-800">
            <div className="flex items-center gap-4">
              <div className="w-10 h-10 rounded-full bg-stone-800 text-stone-400 flex items-center justify-center">
                <Globe size={18} />
              </div>
              <div className="text-right">
                <h4 className="font-bold text-white text-sm">שפת מערכת</h4>
                <p className="text-xs text-stone-500">{lang === "he" ? "עברית" : "English"}</p>
              </div>
            </div>
            <ChevronLeft size={20} className="text-stone-600 group-hover:text-stone-400" />
          </button>

          <button onClick={handleLogout} className="w-full flex items-center justify-between p-4 hover:bg-red-900/20 rounded-2xl transition-colors group mt-2">
            <div className="flex items-center gap-4">
              <div className="w-10 h-10 rounded-full bg-red-500/15 text-red-400 flex items-center justify-center">
                <LogOut size={18} />
              </div>
              <div className="text-right">
                <h4 className="font-bold text-red-400 text-sm">התנתק מהמערכת</h4>
              </div>
            </div>
          </button>
        </div>
      </div>
    </div>
  );
}
