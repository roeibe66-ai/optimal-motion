"use client";

import { useEffect, useState } from "react";
import { BellRing, Loader2 } from "lucide-react";
import { disablePush, enablePush, getPushStatus, type PushStatus } from "@/app/utils/pushClient";
import { notify } from "@/app/components/ui/feedback";

const HINTS: Record<PushStatus, string> = {
  on: "סוף מנוחה ותזכורות אימון מגיעים גם כשהאפליקציה סגורה.",
  off: "כדי לקבל התראה בסוף מנוחה ותזכורות אימון, גם כשהאפליקציה סגורה.",
  "needs-install": "באייפון זה עובד רק מהאפליקציה שעל מסך הבית: שתף ← הוסף למסך הבית.",
  denied: "ההתראות חסומות. אפשר להפעיל אותן בהגדרות הטלפון ← התראות ← Eccentric.",
  unsupported: "הדפדפן הזה לא תומך בהתראות.",
};

// Profile row: turns Web Push on/off for this device (app/utils/pushClient.ts)
// — both the rest-end alert and the daily reminders depend on it.
export default function RestAlertSetting() {
  const [status, setStatus] = useState<PushStatus | null>(null);
  const [isBusy, setIsBusy] = useState(false);

  useEffect(() => {
    let cancelled = false;
    getPushStatus().then((s) => !cancelled && setStatus(s));
    return () => {
      cancelled = true;
    };
  }, []);

  const toggle = async () => {
    if (isBusy || !status) return;
    setIsBusy(true);
    if (status === "on") {
      await disablePush();
      setStatus("off");
    } else {
      const result = await enablePush();
      if (result.ok) setStatus("on");
      else {
        setStatus(result.status);
        if (result.error) notify(`לא הצלחנו להפעיל התראות: ${result.error}`, "error");
      }
    }
    setIsBusy(false);
  };

  const canToggle = status === "on" || status === "off";

  return (
    <div className="flex items-center justify-between gap-3 px-5 py-4 border-b border-line">
      <div className="flex items-center gap-3 min-w-0">
        <BellRing size={18} className="text-muted shrink-0" />
        <div className="text-right min-w-0">
          <h4 className="font-bold text-fg text-sm">התראות</h4>
          <p className="text-xs text-muted">{status ? HINTS[status] : " "}</p>
        </div>
      </div>
      {canToggle && (
        // Same switch as the haptics row in ProfileTab.
        <button
          type="button"
          role="switch"
          aria-checked={status === "on"}
          aria-label="התראות"
          onClick={toggle}
          disabled={isBusy}
          className={`w-[46px] h-[26px] shrink-0 rounded-full transition-[background-color,scale] duration-200 ease-out relative flex items-center active:scale-95 disabled:opacity-60 ${
            status === "on" ? "bg-accent" : "bg-line-input"
          }`}
        >
          {isBusy ? (
            <Loader2 size={14} className="absolute inset-0 m-auto animate-spin text-fg" />
          ) : (
            <div
              className={`on-light w-5 h-5 bg-surface rounded-full absolute right-1 shadow-sm transition-transform duration-200 ease-out-strong ${
                status === "on" ? "-translate-x-[18px]" : "translate-x-0"
              }`}
            ></div>
          )}
        </button>
      )}
    </div>
  );
}
