"use client";

import { Fingerprint, X } from "lucide-react";
import { usePasskeys } from "@/app/hooks/usePasskeys";

// A dismissible bottom-sheet upsell shown once per patient (localStorage-
// gated, see usePasskeys) after a normal password login, on a device whose
// browser reports a platform authenticator (Face ID/Touch ID/Windows Hello)
// and that hasn't registered a passkey yet. "הפעל עכשיו" runs a real WebAuthn
// registration ceremony — this isn't a decorative stand-in.
export default function PasskeyPrompt() {
  const { shouldShowPrompt, isRegistering, error, registerPasskey, dismissPrompt } = usePasskeys();

  if (!shouldShowPrompt) return null;

  return (
    <div
      className="fixed inset-0 z-[180] flex items-end sm:items-center justify-center bg-brand-espresso/40 backdrop-blur-sm print:hidden"
      onClick={dismissPrompt}
    >
      <div
        className="bg-white w-full sm:max-w-sm rounded-t-3xl sm:rounded-3xl p-6 pb-[calc(1.5rem+env(safe-area-inset-bottom))] sm:pb-6 shadow-2xl animate-in slide-in-from-bottom-6 sm:zoom-in-95 duration-300"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex justify-between items-start mb-4">
          <div className="w-12 h-12 rounded-2xl bg-brand-terracotta/8 text-brand-terracotta flex items-center justify-center">
            <Fingerprint size={26} />
          </div>
          <button onClick={dismissPrompt} aria-label="סגור" className="text-stone-400 hover:text-stone-600 p-1 -m-1">
            <X size={18} />
          </button>
        </div>

        <h3 className="text-lg font-black text-brand-espresso mb-1.5">כניסה מהירה עם Face ID</h3>
        <p className="text-sm text-stone-500 leading-relaxed mb-5">
          הפעל כניסה עם טביעת אצבע או זיהוי פנים כדי להתחבר בפעם הבאה בלי להקליד סיסמה.
        </p>

        {error && <p className="text-xs font-bold text-red-600 mb-3">{error}</p>}

        <div className="flex gap-2.5">
          <button
            onClick={dismissPrompt}
            className="flex-1 border-[1.5px] border-stone-200 text-stone-600 font-bold text-sm py-3 rounded-2xl hover:bg-stone-50 transition-colors"
          >
            אולי מאוחר יותר
          </button>
          <button
            onClick={registerPasskey}
            disabled={isRegistering}
            className="flex-[1.4] bg-brand-terracotta text-white font-black text-sm py-3 rounded-2xl hover:brightness-90 transition-colors disabled:opacity-60"
          >
            {isRegistering ? "מפעיל..." : "הפעל עכשיו"}
          </button>
        </div>
      </div>
    </div>
  );
}
