"use client";

import type { Dispatch, SetStateAction } from "react";
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
      <h1 className="text-4xl font-black italic text-brand-espresso tracking-tight mb-6">פרופיל</h1>

      {/* Avatar + name row — avatar first (renders on the right under RTL),
          name + a static "manage account" subtitle beside it. No chevron
          here: there's no real account-management screen behind this row,
          and a chevron would promise a tap that goes nowhere. */}
      <div className="flex items-center gap-4 mb-8">
        <div className="w-20 h-20 rounded-full bg-brand-terracotta text-white flex items-center justify-center text-2xl font-black shrink-0">
          {initials}
        </div>
        <div className="text-right">
          <h2 className="text-xl font-black text-brand-espresso">{loggedInPatient?.full_name}</h2>
          <p className="text-stone-500 text-sm font-medium mt-0.5">ניהול חשבון</p>
        </div>
      </div>

      {/* הישגים — Achievements, as plain list rows instead of the old
          boxed stat cards. Label on the right, value on the far left. */}
      <div className="mb-8">
        <h3 className="text-xs font-bold uppercase tracking-widest text-stone-400 px-1 mb-2">הישגים</h3>
        <div className="bg-white rounded-2xl shadow-[0_8px_30px_rgb(0,0,0,0.04)] overflow-hidden">
          <div className="flex items-center justify-between px-5 py-4 border-b border-stone-100">
            <div className="flex items-center gap-3">
              <Flame size={18} className="text-stone-400" />
              <span className="font-bold text-brand-espresso text-sm">ימי רצף</span>
            </div>
            <span className="font-black text-brand-espresso tabular-nums">{streak}</span>
          </div>
          <div className="flex items-center justify-between px-5 py-4 border-b border-stone-100">
            <div className="flex items-center gap-3">
              <Medal size={18} className="text-stone-400" />
              <span className="font-bold text-brand-espresso text-sm">דרגה</span>
            </div>
            <span className={`font-black ${rank.color}`}>{rank.name}</span>
          </div>
          <div className="flex items-center justify-between px-5 py-4">
            <div className="flex items-center gap-3">
              <CheckCircle size={18} className="text-stone-400" />
              <span className="font-bold text-brand-espresso text-sm">אימונים</span>
            </div>
            <span className="font-black text-brand-espresso tabular-nums">{totalWorkouts}</span>
          </div>
        </div>

        {/* Progress to next rank — real data, kept below the list rather
            than folded into a row of its own. */}
        {rank.next && (
          <div className="mt-3 px-1">
            <div className="flex justify-between items-center mb-1.5 text-xs font-bold text-stone-500">
              <span>עוד {rank.max - totalWorkouts} אימונים ל-{rank.next}</span>
              <span className="tabular-nums">{Math.round(rank.percent)}%</span>
            </div>
            <div className="h-1.5 w-full bg-stone-100 rounded-full overflow-hidden">
              <div className={`h-full ${rank.bg} transition-all duration-1000`} style={{ width: `${rank.percent}%` }}></div>
            </div>
          </div>
        )}
      </div>

      {/* הגדרות — Settings, one grouped list: premium/invoices (still
          non-functional placeholders, dimmed + "בקרוב" per the earlier UX
          audit fix — not reintroducing a dead-end affordance), notification
          scheduling (its own real inputs, inline within the row), haptics
          toggle, language, logout. */}
      <div className="mb-8">
        <h3 className="text-xs font-bold uppercase tracking-widest text-stone-400 px-1 mb-2">הגדרות</h3>
        <div className="bg-white rounded-2xl shadow-[0_8px_30px_rgb(0,0,0,0.04)] overflow-hidden">
          <div className="flex items-center justify-between px-5 py-4 border-b border-stone-100 opacity-50 cursor-default">
            <div className="flex items-center gap-3">
              <Crown size={18} className="text-stone-400" />
              <div className="text-right">
                <h4 className="font-bold text-brand-espresso text-sm">ניהול מנוי פרימיום</h4>
                <p className="text-xs text-stone-500">הצטרפות, שדרוג וביטול מסלולים</p>
              </div>
            </div>
            <span className="text-[10px] font-bold text-stone-500 bg-stone-100 px-2 py-1 rounded-full shrink-0">בקרוב</span>
          </div>

          <div className="flex items-center justify-between px-5 py-4 border-b border-stone-100 opacity-50 cursor-default">
            <div className="flex items-center gap-3">
              <Receipt size={18} className="text-stone-400" />
              <div className="text-right">
                <h4 className="font-bold text-brand-espresso text-sm">חשבוניות וקבלות</h4>
                <p className="text-xs text-stone-500">היסטוריית תשלומים באפליקציה</p>
              </div>
            </div>
            <span className="text-[10px] font-bold text-stone-500 bg-stone-100 px-2 py-1 rounded-full shrink-0">בקרוב</span>
          </div>

          {/* Note: the mockup drops the "edit personal details" row entirely (Premium/Invoices/Notifications/Haptics/Logout only) — removed to match; it was a non-functional placeholder with no onClick either way, so nothing behavioral is lost. */}

          {/* הגדרות התראות באזור האישי */}
          <div className="flex flex-col px-5 py-4 border-b border-stone-100 gap-4">
            <div className="flex items-center gap-3">
              <Bell size={18} className="text-stone-400" />
              <div className="text-right">
                <h4 className="font-bold text-brand-espresso text-sm">התראות אימון (Push)</h4>
                <p className="text-xs text-stone-500">בחר שעה וימים לקבלת תזכורת</p>
              </div>
            </div>

            <div className="bg-stone-50 p-4 rounded-xl flex flex-col md:flex-row gap-4 items-center">
              <input
                type="time"
                value={reminderTime}
                onChange={(e) => setReminderTime(e.target.value)}
                className="text-center font-black text-brand-espresso border border-stone-200 rounded-lg p-2 focus:border-brand-terracotta focus:ring-1 focus:ring-brand-terracotta/20 outline-none bg-white"
              />
              <div className="flex flex-wrap justify-center gap-1">
                {DAYS_OF_WEEK.map((day) => {
                  const isSelected = reminderDays.includes(day.id);
                  return (
                    <button
                      key={day.id}
                      type="button"
                      onClick={() => setReminderDays((prev) => (isSelected ? prev.filter((d) => d !== day.id) : [...prev, day.id]))}
                      className={`w-8 h-8 rounded-lg font-bold text-xs transition-all duration-150 ease-out active:scale-90 ${
                        isSelected ? "bg-brand-terracotta text-white shadow-sm scale-105" : "bg-white text-stone-500 hover:bg-stone-100 border border-stone-200"
                      }`}
                    >
                      {lang === "he" ? day.he_short : day.short}
                    </button>
                  );
                })}
              </div>
              <button
                onClick={onSaveSettings}
                className="bg-brand-terracotta hover:brightness-90 text-white px-4 py-2 rounded-lg text-sm font-bold active:scale-95 transition-all duration-150 ease-out w-full md:w-auto"
              >
                שמור
              </button>
            </div>
          </div>

          <div className="flex items-center justify-between px-5 py-4 border-b border-stone-100">
            <div className="flex items-center gap-3">
              <Activity size={18} className="text-stone-400" />
              <div className="text-right">
                <h4 className="font-bold text-brand-espresso text-sm">פידבק רטט (Haptics)</h4>
                <p className="text-xs text-stone-500">רטט בסיום סטים ומנוחה</p>
              </div>
            </div>
            {/* Size tuned to the mockup; the enabled/disabled positioning classes below are untouched per the brief — don't change that logic, only confirm the visuals match it */}
            <button
              onClick={toggleHaptics}
              className={`w-[46px] h-[26px] rounded-full transition-all duration-300 ease-out relative flex items-center active:scale-95 ${
                hapticsEnabled ? "bg-brand-terracotta" : "bg-stone-300"
              }`}
            >
              <div className={`w-5 h-5 bg-white rounded-full absolute shadow-sm transition-transform duration-300 ease-out ${hapticsEnabled ? "left-1" : "right-1"}`}></div>
            </button>
          </div>

          <button
            onClick={() => setLang(lang === "he" ? "en" : "he")}
            className="w-full flex items-center justify-between px-5 py-4 border-b border-stone-100 hover:bg-stone-50 active:scale-[0.99] transition-all duration-150 ease-out group"
          >
            <div className="flex items-center gap-3">
              <Globe size={18} className="text-stone-400" />
              <div className="text-right">
                <h4 className="font-bold text-brand-espresso text-sm">שפת מערכת</h4>
                <p className="text-xs text-stone-500">{lang === "he" ? "עברית" : "English"}</p>
              </div>
            </div>
            <ChevronLeft size={18} className="text-stone-300 group-hover:text-stone-500" />
          </button>

          <button onClick={handleLogout} className="w-full flex items-center gap-3 px-5 py-4 hover:bg-red-50 active:scale-[0.99] transition-all duration-150 ease-out">
            <LogOut size={18} className="text-red-600" />
            <h4 className="font-bold text-red-600 text-sm">התנתק מהמערכת</h4>
          </button>
        </div>
      </div>
    </div>
  );
}
