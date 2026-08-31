"use client";

import { useState } from "react";
import { BrainCircuit, Map, Target } from "lucide-react";
import { useAuth } from "@/app/context/AuthContext";
import { supabase } from "@/app/lib/supabase";

interface OnboardingFlowProps {
  onFinish: () => void;
}

// The 3-step wizard shown once at first login after email confirmation (goal
// -> training location -> "analyzing" -> done). `onboardingAnswers.pain`
// exists in the original's shape but is never actually set by any step there
// either — preserved as an unused field rather than invented a use for it.
export default function OnboardingFlow({ onFinish }: OnboardingFlowProps) {
  const { lang, loggedInPatient } = useAuth();
  const [onboardingStep, setOnboardingStep] = useState(1);
  const [onboardingAnswers, setOnboardingAnswers] = useState({ goal: "", location: "", pain: "" });

  const finishOnboarding = () => {
    if (loggedInPatient) {
      supabase.from("patients").update({ onboarding_completed_at: new Date().toISOString() }).eq("id", loggedInPatient.id);
    }
    onFinish();
    alert("הותאמה עבורך תוכנית חינמית להתחלה! בהצלחה.");
  };

  return (
    <div className="fixed inset-0 z-[200] bg-stone-900 flex flex-col" dir={lang === "he" ? "rtl" : "ltr"}>
      <div className="flex-1 flex flex-col items-center justify-center p-6 text-center animate-in fade-in duration-500 relative">
        <div className="absolute top-10 left-10 right-10 flex gap-2">
          {[1, 2, 3].map((step) => (
            <div key={step} className={`h-1.5 flex-1 rounded-full transition-colors ${step <= onboardingStep ? "bg-teal-500" : "bg-stone-800"}`}></div>
          ))}
        </div>

        {onboardingStep === 1 && (
          <div className="w-full max-w-md animate-in slide-in-from-right">
            <Target size={48} className="text-teal-400 mx-auto mb-6" />
            <h2 className="text-3xl font-black text-white mb-8">מה המטרה העיקרית שלך?</h2>
            <div className="space-y-4">
              <button
                onClick={() => {
                  setOnboardingAnswers({ ...onboardingAnswers, goal: "strength" });
                  setOnboardingStep(2);
                }}
                className="w-full bg-[#1c1c1e] hover:bg-stone-800 text-white p-5 rounded-2xl font-bold border border-stone-800 transition-colors"
              >
                בניית כוח ושליטה בגוף
              </button>
              <button
                onClick={() => {
                  setOnboardingAnswers({ ...onboardingAnswers, goal: "mobility" });
                  setOnboardingStep(2);
                }}
                className="w-full bg-[#1c1c1e] hover:bg-stone-800 text-white p-5 rounded-2xl font-bold border border-stone-800 transition-colors"
              >
                גמישות, מוביליטי ויציבה
              </button>
              <button
                onClick={() => {
                  setOnboardingAnswers({ ...onboardingAnswers, goal: "rehab" });
                  setOnboardingStep(2);
                }}
                className="w-full bg-[#1c1c1e] hover:bg-stone-800 text-white p-5 rounded-2xl font-bold border border-stone-800 transition-colors"
              >
                התאוששות ומניעת פציעות
              </button>
            </div>
          </div>
        )}

        {onboardingStep === 2 && (
          <div className="w-full max-w-md animate-in slide-in-from-right">
            <Map size={48} className="text-blue-400 mx-auto mb-6" />
            <h2 className="text-3xl font-black text-white mb-8">איפה אתה מתאמן בדרך כלל?</h2>
            <div className="space-y-4">
              <button
                onClick={() => {
                  setOnboardingAnswers({ ...onboardingAnswers, location: "home" });
                  setOnboardingStep(3);
                }}
                className="w-full bg-[#1c1c1e] hover:bg-stone-800 text-white p-5 rounded-2xl font-bold border border-stone-800 transition-colors"
              >
                בבית (ללא ציוד)
              </button>
              <button
                onClick={() => {
                  setOnboardingAnswers({ ...onboardingAnswers, location: "park" });
                  setOnboardingStep(3);
                }}
                className="w-full bg-[#1c1c1e] hover:bg-stone-800 text-white p-5 rounded-2xl font-bold border border-stone-800 transition-colors"
              >
                בפארק (מתח ומקבילים)
              </button>
              <button
                onClick={() => {
                  setOnboardingAnswers({ ...onboardingAnswers, location: "gym" });
                  setOnboardingStep(3);
                }}
                className="w-full bg-[#1c1c1e] hover:bg-stone-800 text-white p-5 rounded-2xl font-bold border border-stone-800 transition-colors"
              >
                בחדר כושר
              </button>
            </div>
          </div>
        )}

        {onboardingStep === 3 && (
          <div className="w-full max-w-md animate-in zoom-in duration-500 flex flex-col items-center">
            <BrainCircuit size={60} className="text-purple-400 mx-auto mb-6 animate-pulse" />
            <h2 className="text-3xl font-black text-white mb-4">המערכת מנתחת את הנתונים...</h2>
            <p className="text-stone-400 mb-8">מתאימים לך את מסלולי החינם הטובים ביותר להתחלה.</p>

            <button
              onClick={finishOnboarding}
              className="bg-teal-500 hover:bg-teal-400 text-stone-900 px-10 py-4 rounded-full font-black text-lg transition-colors shadow-[0_0_30px_rgba(20,184,166,0.3)]"
            >
              היכנס לתוכנית שלי
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
