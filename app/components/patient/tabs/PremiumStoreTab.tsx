"use client";

import { ArrowLeft, Check, Crown, Lock } from "lucide-react";
import { useAuth } from "@/app/context/AuthContext";
import { ADMIN_TAGS, DEFAULT_TRACK_GLOW, TRACK_GLOW_TINTS } from "@/app/constants/catalog";

interface PremiumStoreTabProps {
  onGoToPlan: () => void;
}

export default function PremiumStoreTab({ onGoToPlan }: PremiumStoreTabProps) {
  const { loggedInPatient } = useAuth();

  return (
    <div className="animate-in fade-in duration-500">
      <div className="mb-10 text-center max-w-2xl mx-auto flex flex-col items-center gap-2.5">
        <Crown className="text-amber-500" size={34} />
        <h2 className="text-2xl md:text-4xl font-black text-white tracking-tight">התוכניות שלנו</h2>
        <p className="text-[13px] md:text-base text-stone-400 leading-relaxed max-w-[280px] md:max-w-md">
          פתח את הפוטנציאל המלא שלך. בחר מסלול ועקוב אחר ההתקדמות עם השיטה המקצועית.
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {ADMIN_TAGS.filter((tag) => tag.id !== "rehab" && tag.id !== "gym").map((track) => {
          const userOwnsTrack = loggedInPatient?.premium_tracks?.includes(track.id);
          const glowTint = TRACK_GLOW_TINTS[track.label] ?? DEFAULT_TRACK_GLOW;

          return (
            <div key={track.id} className="bg-[#1c1c1e] rounded-[1.75rem] overflow-hidden border border-stone-800 hover:border-stone-700 transition-colors flex flex-col">
              <div className="h-[150px] relative">
                <div className="absolute inset-0" style={{ background: `radial-gradient(circle at 70% 20%, ${glowTint}, transparent 55%)` }}></div>

                <span
                  className={`absolute top-3.5 right-3.5 text-[10px] font-black px-2.5 py-1 rounded-full flex items-center gap-1 uppercase tracking-widest ${
                    userOwnsTrack ? "bg-teal-500 text-stone-950" : "bg-amber-500 text-stone-950"
                  }`}
                >
                  {userOwnsTrack ? (
                    <>
                      <Check size={11} /> פתוח
                    </>
                  ) : (
                    <>
                      <Lock size={11} /> פרימיום
                    </>
                  )}
                </span>

                <h3 className="absolute bottom-3.5 right-4 left-4 text-xl font-black text-white">{track.label}</h3>
              </div>

              <div className="p-4.5 flex-1 flex flex-col gap-4">
                <p className="text-stone-400 text-[13px] leading-relaxed flex-1">{track.desc}</p>

                {userOwnsTrack ? (
                  <button
                    onClick={onGoToPlan}
                    className="w-full bg-stone-800 text-white px-6 py-3.5 rounded-2xl font-bold text-sm hover:bg-stone-700 transition-colors flex items-center justify-center gap-2"
                  >
                    עבור לאימון
                    {/* ArrowLeft, not ArrowRight: SVG icons don't mirror with dir="rtl", and "forward" in RTL points left */}
                    <ArrowLeft size={16} />
                  </button>
                ) : (
                  <button
                    onClick={() => {
                      if (!loggedInPatient?.email_verified) {
                        return alert("עליך לאמת את כתובת המייל שלך לפני שתוכל לרכוש תוכניות. בדוק את תיבת הדואר הנכנס שלך.");
                      }
                      window.open(
                        `https://wa.me/972504441094?text=${encodeURIComponent(`היי רועי, אני באפליקציה ואשמח לפתוח את המסלול: ${track.label}.`)}`,
                        "_blank"
                      );
                    }}
                    className="w-full bg-white text-stone-900 px-6 py-3.5 rounded-2xl font-black text-sm hover:bg-stone-200 transition-colors"
                  >
                    לרכישת המסלול
                  </button>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
