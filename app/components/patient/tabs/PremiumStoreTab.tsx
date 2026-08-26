"use client";

import { ArrowRight, Check, Crown, Lock } from "lucide-react";
import { useAuth } from "@/app/context/AuthContext";
import { ADMIN_TAGS, CATEGORY_IMAGES, DEFAULT_COURSE_IMG } from "@/app/constants/catalog";

interface PremiumStoreTabProps {
  onGoToPlan: () => void;
}

export default function PremiumStoreTab({ onGoToPlan }: PremiumStoreTabProps) {
  const { loggedInPatient } = useAuth();

  return (
    <div className="animate-in fade-in duration-500">
      <div className="mb-10 text-center max-w-2xl mx-auto">
        <Crown className="mx-auto text-amber-500 mb-4" size={48} />
        <h2 className="text-3xl md:text-5xl font-black text-white tracking-tight mb-4">התוכניות שלנו</h2>
        <p className="text-lg text-stone-400">פתח את הפוטנציאל המלא שלך. בחר תוכנית, עקוב אחר ההתקדמות והשג תוצאות עם השיטה המקצועית שלנו.</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {ADMIN_TAGS.filter((tag) => tag.id !== "rehab" && tag.id !== "gym").map((track) => {
          const userOwnsTrack = loggedInPatient?.premium_tracks?.includes(track.id);
          const imgUrl = CATEGORY_IMAGES[String(track.label)] || DEFAULT_COURSE_IMG;

          return (
            <div key={track.id} className="bg-[#1c1c1e] rounded-[2rem] shadow-xl overflow-hidden group flex flex-col border border-stone-800 hover:border-stone-700 transition-colors">
              <div className="h-48 w-full relative overflow-hidden">
                <div className="absolute inset-0 bg-gradient-to-t from-[#1c1c1e] via-[#1c1c1e]/40 to-transparent z-10"></div>
                <img src={imgUrl} className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-700 opacity-70" alt={track.label} />

                <div className="absolute top-4 right-4 z-20">
                  <span className={`text-[10px] font-black px-3 py-1 rounded-full flex items-center gap-1 uppercase tracking-widest ${userOwnsTrack ? "bg-teal-500 text-stone-900 shadow-lg" : "bg-amber-500 text-stone-900 shadow-lg"}`}>
                    {userOwnsTrack ? (
                      <>
                        <Check size={12} /> פתוח
                      </>
                    ) : (
                      <>
                        <Lock size={12} /> פרימיום
                      </>
                    )}
                  </span>
                </div>

                <div className="absolute bottom-4 left-6 right-6 z-20">
                  <h3 className="text-2xl font-black text-white">{track.label}</h3>
                </div>
              </div>

              <div className="p-6 flex-1 flex flex-col bg-[#1c1c1e]">
                <p className="text-stone-400 text-sm font-medium leading-relaxed mb-8 flex-1">{track.desc}</p>

                {userOwnsTrack ? (
                  <button onClick={onGoToPlan} className="w-full bg-stone-800 text-white px-6 py-4 rounded-xl font-bold hover:bg-stone-700 transition-colors flex items-center justify-center gap-2">
                    עבור לאימון <ArrowRight size={18} />
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
                    className="w-full bg-white text-stone-900 px-6 py-4 rounded-xl font-black hover:bg-stone-200 transition-colors shadow-md flex items-center justify-center gap-2"
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
