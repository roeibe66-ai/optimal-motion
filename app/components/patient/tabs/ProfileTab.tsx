"use client";

import type { CSSProperties, Dispatch, SetStateAction } from "react";
import { Activity, Bell, ChevronLeft, CheckCircle, Crown, Flame, Globe, LogOut, Medal, Receipt, SunMoon } from "lucide-react";
import { useTheme } from "@/app/components/ThemeProvider";
import type { ThemeSetting } from "@/app/lib/theme";
import { useAuth } from "@/app/context/AuthContext";
import { DAYS_OF_WEEK } from "@/app/constants/catalog";
import { getUserRank } from "@/app/utils/scoring";
import type { HapticType } from "@/app/hooks/useHaptics";
import type { WorkoutLog } from "@/app/types";
import { toDateKey } from "@/app/hooks/useWorkoutSession";
import { countLabel } from "@/app/utils/format";

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
const THEME_OPTIONS: { id: ThemeSetting; label: string }[] = [
  { id: "system", label: "מערכת" },
  { id: "light", label: "בהיר" },
  { id: "dark", label: "כהה" },
];

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
  const { setting: themeSetting, setSetting: setThemeSetting } = useTheme();

  const userLogs = workoutLogs.filter((l) => l.patient_id === loggedInPatient?.id);
  const totalWorkouts = userLogs.length;
  const rank = getUserRank(totalWorkouts);

  // Consecutive calendar days with a logged workout, counting back from
  // today — or from yesterday, so the streak doesn't read 0 before today's
  // workout. (It used to be min(total workouts, 14) whenever the last log
  // was within two days: 9 workouts over six months showed "9".)
  const loggedDays = new Set(userLogs.map((l) => toDateKey(new Date(l.created_at))));
  let streak = 0;
  const cursor = new Date();
  if (!loggedDays.has(toDateKey(cursor))) cursor.setDate(cursor.getDate() - 1);
  while (loggedDays.has(toDateKey(cursor))) {
    streak++;
    cursor.setDate(cursor.getDate() - 1);
  }

  const toggleHaptics = () => {
    const newState = !hapticsEnabled;
    setHapticsEnabled(newState);
    localStorage.setItem("optimalMotionHaptics", String(newState));
    triggerHaptic("light");
  };

  // Initials: first name + surname. first_name is stored as typed at signup
  // ("בת שבע"), so the surname is whatever full_name has after it; older
  // accounts fall back to first + last word. Array.from takes a whole code
  // point, so a name starting with an emoji isn't cut to half a surrogate.
  const fullName = loggedInPatient?.full_name?.trim() ?? "";
  const firstName = loggedInPatient?.first_name?.trim() || fullName.split(/\s+/)[0] || "";
  const surnameWords = (fullName.startsWith(firstName) ? fullName.slice(firstName.length) : fullName.split(/\s+/).slice(1).join(" ")).trim().split(/\s+/).filter(Boolean);
  const initial = (word: string | undefined) => (word ? Array.from(word)[0] ?? "" : "");
  const initials = (initial(firstName) + initial(surnameWords[surnameWords.length - 1])).toUpperCase();

  return (
    <div>
      <h1 className="text-4xl font-black text-fg tracking-tight mb-6">פרופיל</h1>

      {/* Avatar + name row — avatar first (renders on the right under RTL),
          name + a static "manage account" subtitle beside it. No chevron
          here: there's no real account-management screen behind this row,
          and a chevron would promise a tap that goes nowhere. */}
      <div className="flex items-center gap-4 mb-8">
        <div className="w-20 h-20 rounded-full bg-accent text-on-accent flex items-center justify-center text-2xl font-black shrink-0">
          {initials}
        </div>
        <div className="text-right">
          <h2 className="text-xl font-black text-fg">{loggedInPatient?.full_name}</h2>
          <p className="text-muted text-sm font-medium mt-0.5">ניהול חשבון</p>
        </div>
      </div>

      {/* הישגים — Achievements, as plain list rows instead of the old
          boxed stat cards. Label on the right, value on the far left. */}
      <div className="mb-8">
        <h3 className="text-xs font-bold text-muted px-1 mb-2">הישגים</h3>
        <div className="on-light bg-surface rounded-2xl shadow-card overflow-hidden">
          <div className="flex items-center justify-between px-5 py-4 border-b border-line">
            <div className="flex items-center gap-3">
              <Flame size={18} className="text-muted" />
              <span className="font-bold text-fg text-sm">ימי רצף</span>
            </div>
            <span className="font-black text-fg tabular-nums">{streak}</span>
          </div>
          <div className="flex items-center justify-between px-5 py-4 border-b border-line">
            <div className="flex items-center gap-3">
              <Medal size={18} className="text-muted" />
              <span className="font-bold text-fg text-sm">דרגה</span>
            </div>
            <span className={`font-black ${rank.color}`}>{rank.name}</span>
          </div>
          <div className="flex items-center justify-between px-5 py-4">
            <div className="flex items-center gap-3">
              <CheckCircle size={18} className="text-muted" />
              <span className="font-bold text-fg text-sm">אימונים</span>
            </div>
            <span className="font-black text-fg tabular-nums">{totalWorkouts}</span>
          </div>
        </div>

        {/* Progress to next rank — real data, kept below the list rather
            than folded into a row of its own. */}
        {rank.next && (
          <div className="mt-3 px-1">
            <div className="flex justify-between items-center mb-1.5 text-xs font-bold text-muted">
              <span>עוד {countLabel(rank.max - totalWorkouts, "אימון אחד", "אימונים")} לדרגת {rank.next}</span>
              <span className="tabular-nums">{Math.round(rank.percent)}%</span>
            </div>
            <div className="h-1.5 w-full bg-line rounded-full overflow-hidden">
              {/* scaleX (not width) from the start edge; fills once on entry
                  (starting:scale-x-0), a small reward on a rarely-visited screen. */}
              <div
                className={`h-full w-full ${rank.bg} origin-right ltr:origin-left transition-[scale] duration-[600ms] ease-out-strong scale-x-(--rank-progress) starting:scale-x-0`}
                style={{ "--rank-progress": rank.percent / 100 } as CSSProperties}
              ></div>
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
        <h3 className="text-xs font-bold text-muted px-1 mb-2">הגדרות</h3>
        <div className="on-light bg-surface rounded-2xl shadow-card overflow-hidden">
          <div className="flex items-center justify-between px-5 py-4 border-b border-line opacity-50 cursor-default">
            <div className="flex items-center gap-3">
              <Crown size={18} className="text-muted" />
              <div className="text-right">
                <h4 className="font-bold text-fg text-sm">ניהול מנוי פרימיום</h4>
                <p className="text-xs text-muted">הצטרפות, שדרוג וביטול מסלולים</p>
              </div>
            </div>
            <span className="on-light text-[10px] font-bold text-muted bg-surface-alt px-2 py-1 rounded-full shrink-0">בקרוב</span>
          </div>

          <div className="flex items-center justify-between px-5 py-4 border-b border-line opacity-50 cursor-default">
            <div className="flex items-center gap-3">
              <Receipt size={18} className="text-muted" />
              <div className="text-right">
                <h4 className="font-bold text-fg text-sm">חשבוניות וקבלות</h4>
                <p className="text-xs text-muted">היסטוריית תשלומים באפליקציה</p>
              </div>
            </div>
            <span className="on-light text-[10px] font-bold text-muted bg-surface-alt px-2 py-1 rounded-full shrink-0">בקרוב</span>
          </div>

          {/* Note: the mockup drops the "edit personal details" row entirely (Premium/Invoices/Notifications/Haptics/Logout only) — removed to match; it was a non-functional placeholder with no onClick either way, so nothing behavioral is lost. */}

          {/* הגדרות התראות באזור האישי */}
          <div className="flex flex-col px-5 py-4 border-b border-line gap-4">
            <div className="flex items-center gap-3">
              <Bell size={18} className="text-muted" />
              <div className="text-right">
                <h4 className="font-bold text-fg text-sm">התראות אימון (Push)</h4>
                <p className="text-xs text-muted">בחר שעה וימים לקבלת תזכורת</p>
              </div>
            </div>

            <div className="on-light bg-surface-alt p-4 rounded-xl flex flex-col md:flex-row gap-4 items-center">
              <input
                type="time"
                value={reminderTime}
                onChange={(e) => setReminderTime(e.target.value)}
                className="on-light text-center font-black text-fg border border-line-input rounded-lg p-2 focus:border-focus focus:ring-2 focus:ring-focus outline-none bg-surface"
              />
              <div className="flex flex-wrap justify-center gap-1">
                {DAYS_OF_WEEK.map((day) => {
                  const isSelected = reminderDays.includes(day.id);
                  return (
                    <button
                      key={day.id}
                      type="button"
                      onClick={() => setReminderDays((prev) => (isSelected ? prev.filter((d) => d !== day.id) : [...prev, day.id]))}
                      className={`w-8 h-8 rounded-lg font-bold text-xs transition-ui duration-150 ease-out active:scale-90 ${
                        isSelected ? "bg-accent text-on-accent shadow-sm scale-105" : "bg-surface text-muted hover:bg-surface-alt border border-line-input"
                      }`}
                    >
                      {lang === "he" ? day.he_short : day.short}
                    </button>
                  );
                })}
              </div>
              <button
                onClick={onSaveSettings}
                className="bg-btn-primary hover:bg-btn-primary-hover active:bg-btn-primary-active text-btn-primary-fg px-4 py-2 rounded-lg text-sm font-bold active:scale-95 transition-ui duration-150 ease-out w-full md:w-auto"
              >
                שמור
              </button>
            </div>
          </div>

          <div className="flex items-center justify-between px-5 py-4 border-b border-line">
            <div className="flex items-center gap-3">
              <Activity size={18} className="text-muted" />
              <div className="text-right">
                <h4 className="font-bold text-fg text-sm">פידבק רטט (Haptics)</h4>
                <p className="text-xs text-muted">רטט בסיום סטים ומנוחה</p>
              </div>
            </div>
            {/* Size tuned to the mockup; the enabled/disabled positioning classes below are untouched per the brief — don't change that logic, only confirm the visuals match it */}
            {/* The knob slides with a transform (it used to swap left-1/right-1,
                which transition-transform can't animate, so it jumped). On =
                knob at the end edge, i.e. the left in RTL. */}
            <button
              onClick={toggleHaptics}
              role="switch"
              aria-checked={hapticsEnabled}
              aria-label="רטט"
              className={`w-[46px] h-[26px] rounded-full transition-[background-color,scale] duration-200 ease-out relative flex items-center active:scale-95 ${
                hapticsEnabled ? "bg-accent" : "bg-line-input"
              }`}
            >
              <div
                className={`on-light w-5 h-5 bg-surface rounded-full absolute right-1 shadow-sm transition-transform duration-200 ease-out-strong ${
                  hapticsEnabled ? "-translate-x-[18px]" : "translate-x-0"
                }`}
              ></div>
            </button>
          </div>

          <div className="flex items-center justify-between gap-3 px-5 py-4 border-b border-line">
            <div className="flex items-center gap-3">
              <SunMoon size={18} className="text-muted" />
              <div className="text-right">
                <h4 className="font-bold text-fg text-sm">ערכת נושא</h4>
                <p className="text-xs text-muted">בהיר, כהה או לפי המכשיר</p>
              </div>
            </div>
            <div role="radiogroup" aria-label="ערכת נושא" className="flex bg-surface-alt p-1 rounded-xl border border-line shrink-0">
              {THEME_OPTIONS.map((option) => (
                <button
                  key={option.id}
                  type="button"
                  role="radio"
                  aria-checked={themeSetting === option.id}
                  onClick={() => setThemeSetting(option.id)}
                  className={`px-3 py-1.5 text-xs font-bold rounded-lg transition-colors ${
                    themeSetting === option.id ? "bg-accent text-on-accent" : "text-muted hover:text-fg"
                  }`}
                >
                  {option.label}
                </button>
              ))}
            </div>
          </div>

          <button
            onClick={() => setLang(lang === "he" ? "en" : "he")}
            className="w-full flex items-center justify-between px-5 py-4 border-b border-line hover:bg-surface-alt active:scale-[0.99] transition-ui duration-150 ease-out group"
          >
            <div className="flex items-center gap-3">
              <Globe size={18} className="text-muted" />
              <div className="text-right">
                <h4 className="font-bold text-fg text-sm">שפת מערכת</h4>
                <p className="text-xs text-muted">{lang === "he" ? "עברית" : "English"}</p>
              </div>
            </div>
            <ChevronLeft size={18} className="text-muted group-hover:text-fg" />
          </button>

          <button onClick={handleLogout} className="w-full flex items-center gap-3 px-5 py-4 hover:bg-danger/10 active:scale-[0.99] transition-ui duration-150 ease-out">
            <LogOut size={18} className="text-danger-fg" />
            <h4 className="font-bold text-danger-fg text-sm">התנתק מהמערכת</h4>
          </button>
        </div>
      </div>
    </div>
  );
}
