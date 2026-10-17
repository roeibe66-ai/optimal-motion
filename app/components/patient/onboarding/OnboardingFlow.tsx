"use client";

import { useEffect, useRef, useState, type ReactNode, type TouchEvent } from "react";
import Link from "next/link";
import { useDialog } from "@/app/hooks/useDialog";
import { createPortal } from "react-dom";
import {
  ArrowLeftRight,
  ArrowRight,
  Bandage,
  BicepsFlexed,
  Building2,
  CalendarDays,
  Check,
  Dumbbell,
  Feather,
  Footprints,
  HeartPulse,
  House,
  MapPin,
  PersonStanding,
  Scale,
  Sprout,
  Target,
  TreePine,
  Trees,
  Leaf,
  HeartHandshake,
  Loader2,
  type LucideIcon,
} from "lucide-react";
import BodyDiagram, { BodyAreaButtons } from "@/app/components/BodyDiagram";
import { EQUIPMENT_LIST } from "@/app/constants/catalog";
import { ADDRESS_FORMS, MAX_TRAINING_GOALS, SESSION_MINUTES, TRAINING_DAYS, TRAINING_EXPERIENCE, TRAINING_GOALS, TRAINING_LOCATIONS } from "@/app/constants/onboarding";
import type { HapticType } from "@/app/hooks/useHaptics";
import type { Patient, TrainingExperience } from "@/app/types";

// The fitness onboarding questionnaire: a welcome, six optional questions and
// a summary. Every question can be skipped; "אמלא אחר כך" on the welcome
// defers the whole thing (PatientShell then offers it from a home card).
// Opened again later (home card / profile) it starts from the saved answers.
//
// Motion (a once-per-user screen, so it gets some delight): steps slide in
// from the direction of travel (animate-step-in / -back, RTL-aware), options
// stagger in 40 ms apart (animate-card-in), presses scale to 0.97, and a
// single-choice answer moves on by itself after AUTO_ADVANCE_MS so the
// selection is seen first. Swipe forward/back like the workout player.

export interface OnboardingAnswers {
  training_goals: string[];
  training_experience: TrainingExperience | null;
  training_days: number | null;
  session_minutes: number | null;
  training_location: "gym" | "home" | "both" | null;
  home_equipment: string[];
  address_form: "m" | "f" | "n" | null;
  birth_year: number | null;
  height_cm: number | null;
  weight_kg: number | null;
  limitation_areas: string[];
  recent_surgery: boolean | null;
}

interface OnboardingFlowProps {
  patient: Patient;
  onFinish: (answers: OnboardingAnswers) => Promise<boolean>; // false = save failed, stay
  onLater: () => void;
  triggerHaptic: (type: HapticType) => void;
}

const STEPS = ["welcome", "goal", "experience", "time", "location", "about", "pain", "done"] as const;
type Step = (typeof STEPS)[number];
const QUESTION_COUNT = STEPS.length - 2;
const AUTO_ADVANCE_MS = 220;
const SWIPE_MIN_PX = 60;

const GOAL_ICONS: Record<string, LucideIcon> = {
  strength: Dumbbell,
  muscle: BicepsFlexed,
  weight_loss: Scale,
  fitness: HeartPulse,
  injury_return: Bandage,
  less_pain: Feather,
  sport: Footprints,
  mobility: PersonStanding,
};
const EXPERIENCE_ICONS: Record<TrainingExperience, LucideIcon> = { none: Sprout, beginner: Leaf, intermediate: TreePine, advanced: Trees };
const LOCATION_ICONS = { gym: Building2, home: House, both: ArrowLeftRight };
const HOME_GEAR = EQUIPMENT_LIST.filter((e) => !e.gymOnly && e.id !== "bodyweight");

// Module-level: the React Compiler flags Date inside components.
const currentYear = () => new Date().getFullYear();

const fromPatient = (p: Patient): OnboardingAnswers => ({
  training_goals: p.training_goals ?? [],
  training_experience: p.training_experience ?? null,
  training_days: p.training_days ?? null,
  session_minutes: p.session_minutes ?? null,
  training_location: p.training_location ?? null,
  home_equipment: p.home_equipment ?? [],
  address_form: p.address_form ?? null,
  birth_year: p.birth_year ?? null,
  height_cm: p.height_cm ?? null,
  weight_kg: p.weight_kg != null ? Number(p.weight_kg) : null,
  limitation_areas: p.limitation_areas ?? [],
  recent_surgery: p.recent_surgery ?? null,
});

const isAnswered = (step: Step, a: OnboardingAnswers, age: string) =>
  ({
    welcome: true,
    goal: a.training_goals.length > 0,
    experience: !!a.training_experience,
    time: !!(a.training_days || a.session_minutes),
    location: !!a.training_location,
    about: !!(a.address_form || age || a.height_cm || a.weight_kg),
    pain: a.limitation_areas.length > 0 || a.recent_surgery !== null,
    done: true,
  })[step];

// Staggered entrance for a step's items.
const stagger = (n: number) => ({ animationDelay: `${n * 40}ms` });

// A large selectable card: check badge pops in on selection, press = 0.97.
function OptionCard({ selected, onClick, icon: Icon, label, hint, n }: { selected: boolean; onClick: () => void; icon?: LucideIcon; label: string; hint?: string | null; n: number }) {
  return (
    <button
      type="button"
      aria-pressed={selected}
      onClick={onClick}
      style={stagger(n)}
      className={`animate-card-in relative w-full flex items-center gap-3 text-start rounded-2xl border-2 px-4 py-3.5 transition-ui duration-150 ease-out active:scale-[0.97] ${
        selected ? "border-accent bg-accent/10 text-accent-fg" : "on-light border-line bg-surface text-fg"
      }`}
    >
      {Icon && <Icon size={20} className="shrink-0" aria-hidden="true" />}
      <span className="min-w-0">
        <span className="block font-extrabold text-[0.9375rem]">{label}</span>
        {hint && <span className="block text-xs opacity-75 mt-0.5">{hint}</span>}
      </span>
      <span
        aria-hidden="true"
        className={`absolute top-2.5 end-2.5 w-5 h-5 rounded-full bg-accent text-on-accent flex items-center justify-center transition-[opacity,scale] duration-200 ease-out-strong ${
          selected ? "opacity-100 scale-100" : "opacity-0 scale-75"
        }`}
      >
        <Check size={12} strokeWidth={3} />
      </span>
    </button>
  );
}

function Chip({ selected, onClick, children }: { selected: boolean; onClick: () => void; children: ReactNode }) {
  return (
    <button
      type="button"
      aria-pressed={selected}
      onClick={onClick}
      className={`min-h-11 rounded-full border-2 px-4 text-sm font-bold transition-ui duration-150 ease-out active:scale-[0.97] ${
        selected ? "border-accent bg-accent/10 text-accent-fg" : "on-light border-line bg-surface text-fg"
      }`}
    >
      {children}
    </button>
  );
}

function NumberField({ label, value, onChange, max }: { label: string; value: string; onChange: (v: string) => void; max: number }) {
  return (
    <label className="block text-xs font-bold text-muted">
      {label}
      <input
        inputMode="numeric"
        enterKeyHint="next"
        value={value}
        onChange={(e) => onChange(e.target.value.replace(/\D/g, "").slice(0, String(max).length))}
        className="on-light mt-1.5 w-full rounded-xl border-2 border-line bg-surface py-2.5 text-center text-lg font-black text-fg tabular-nums outline-none focus:border-focus"
      />
    </label>
  );
}

export default function OnboardingFlow({ patient, onFinish, onLater, triggerHaptic }: OnboardingFlowProps) {
  const [answers, setAnswers] = useState<OnboardingAnswers>(() => fromPatient(patient));
  const [age, setAge] = useState(() => (patient.birth_year ? String(currentYear() - patient.birth_year) : ""));
  const [heightText, setHeightText] = useState(() => (patient.height_cm ? String(patient.height_cm) : ""));
  const [weightText, setWeightText] = useState(() => (patient.weight_kg ? String(Number(patient.weight_kg)) : ""));
  const [stepIndex, setStepIndex] = useState(0);
  const [direction, setDirection] = useState<1 | -1>(1);
  const [goalLimitHit, setGoalLimitHit] = useState(0); // bumps to replay the counter nudge
  const [isSaving, setIsSaving] = useState(false);
  const autoAdvance = useRef<ReturnType<typeof setTimeout> | null>(null);
  const touchStart = useRef<{ x: number; y: number } | null>(null);
  const [isMounted, setIsMounted] = useState(false);
  const dialogRef = useRef<HTMLDivElement>(null);
  useDialog(dialogRef, isMounted);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect -- portal target exists only after the first client render
    setIsMounted(true);
    return () => {
      if (autoAdvance.current) clearTimeout(autoAdvance.current);
    };
  }, []);

  const step = STEPS[stepIndex];
  const set = <K extends keyof OnboardingAnswers>(key: K, value: OnboardingAnswers[K]) => setAnswers((a) => ({ ...a, [key]: value }));

  const goTo = (index: number) => {
    if (autoAdvance.current) clearTimeout(autoAdvance.current);
    if (index < 0 || index >= STEPS.length || index === stepIndex) return;
    setDirection(index > stepIndex ? 1 : -1);
    setStepIndex(index);
  };

  const finish = async () => {
    if (isSaving) return;
    setIsSaving(true);
    const ageNum = Number(age);
    const ok = await onFinish({
      ...answers,
      birth_year: ageNum >= 10 && ageNum <= 100 ? currentYear() - ageNum : null,
      height_cm: Number(heightText) >= 100 && Number(heightText) <= 250 ? Number(heightText) : null,
      weight_kg: Number(weightText) >= 25 && Number(weightText) <= 300 ? Number(weightText) : null,
    });
    setIsSaving(false);
    if (ok) triggerHaptic("success");
  };

  const next = () => (step === "done" ? finish() : goTo(stepIndex + 1));
  const back = () => goTo(stepIndex - 1);

  // Single choice that moves on by itself once the selection has shown.
  const chooseAndAdvance = (apply: () => void) => {
    triggerHaptic("light");
    apply();
    if (autoAdvance.current) clearTimeout(autoAdvance.current);
    autoAdvance.current = setTimeout(() => goTo(stepIndex + 1), AUTO_ADVANCE_MS);
  };

  const toggleGoal = (id: string) => {
    const has = answers.training_goals.includes(id);
    if (!has && answers.training_goals.length >= MAX_TRAINING_GOALS) {
      setGoalLimitHit((n) => n + 1);
      return;
    }
    triggerHaptic("light");
    set("training_goals", has ? answers.training_goals.filter((g) => g !== id) : [...answers.training_goals, id]);
  };

  const toggleIn = (key: "home_equipment" | "limitation_areas", id: string) => {
    triggerHaptic("light");
    const list = answers[key];
    set(key, list.includes(id) ? list.filter((x) => x !== id) : [...list, id]);
  };

  const pick = <K extends keyof OnboardingAnswers>(key: K, value: OnboardingAnswers[K]) => {
    triggerHaptic("light");
    set(key, answers[key] === value ? (null as OnboardingAnswers[K]) : value);
  };

  // Swipe: forward is rightward in Hebrew (as in the workout player).
  const onTouchStart = (e: TouchEvent) => {
    touchStart.current = { x: e.touches[0].clientX, y: e.touches[0].clientY };
  };
  const onTouchEnd = (e: TouchEvent) => {
    const start = touchStart.current;
    touchStart.current = null;
    if (!start || (e.target as HTMLElement).closest("input, svg")) return;
    const dx = e.changedTouches[0].clientX - start.x;
    const dy = e.changedTouches[0].clientY - start.y;
    if (Math.abs(dx) < SWIPE_MIN_PX || Math.abs(dx) < Math.abs(dy) * 1.5) return;
    if (dx > 0 && step !== "done") next();
    else if (dx < 0 && stepIndex > 0 && step !== "done") back();
  };

  const answered = isAnswered(step, answers, age);
  const ctaLabel = step === "welcome" ? "בואו נתחיל" : step === "done" ? "יאללה, לעמוד הבית" : answered ? "המשך" : "דלג על השאלה";
  const ctaPrimary = step === "welcome" || step === "done" || answered;
  const showBack = stepIndex > 0 && step !== "done";

  const levelLabel = TRAINING_EXPERIENCE.find((e) => e.id === answers.training_experience)?.label;
  const locationLabel = TRAINING_LOCATIONS.find((l) => l.id === answers.training_location)?.label;

  const body = (() => {
    switch (step) {
      case "welcome":
        return (
          <div className="text-center pt-6">
            <img src="/ecco/feedback-thumbs.webp" alt="" className="animate-card-in w-40 h-40 mx-auto rounded-[2rem] object-cover shadow-card" />
            <h1 className="animate-card-in text-3xl font-black text-fg mt-7" style={stagger(1)}>
              בואו נכיר
            </h1>
            <p className="animate-card-in text-muted mt-2 leading-relaxed max-w-xs mx-auto" style={stagger(2)}>
              {QUESTION_COUNT} שאלות קצרות, כ-2 דקות. ככה התוכנית, הנפח וההצעות יתאימו בדיוק לכם. אפשר לדלג על כל שאלה.
            </p>
          </div>
        );
      case "goal":
        return (
          <>
            <div className="flex items-baseline justify-between gap-3">
              <h2 className="animate-card-in text-2xl font-black text-fg">מה המטרה העיקרית?</h2>
              <span
                key={goalLimitHit}
                className={`text-xs font-extrabold px-2.5 py-1 rounded-full tabular-nums transition-colors duration-150 ${
                  answers.training_goals.length === MAX_TRAINING_GOALS ? "bg-accent/15 text-accent-fg" : "bg-surface-alt text-muted"
                } ${goalLimitHit ? "animate-nudge" : ""}`}
                dir="ltr"
              >
                {answers.training_goals.length}/{MAX_TRAINING_GOALS}
              </span>
            </div>
            <p className="animate-card-in text-sm text-muted mt-1 mb-4" style={stagger(1)}>
              {goalLimitHit ? "אפשר עד 2. בטלו אחת כדי לבחור אחרת" : "אפשר לבחור עד 2"}
            </p>
            <div className="grid grid-cols-2 gap-2.5">
              {TRAINING_GOALS.map((g, n) => (
                <OptionCard key={g.id} n={n + 2} icon={GOAL_ICONS[g.id]} label={g.label} selected={answers.training_goals.includes(g.id)} onClick={() => toggleGoal(g.id)} />
              ))}
            </div>
          </>
        );
      case "experience":
        return (
          <>
            <h2 className="animate-card-in text-2xl font-black text-fg">כמה זמן אתם מתאמנים בעקביות?</h2>
            <p className="animate-card-in text-sm text-muted mt-1 mb-4" style={stagger(1)}>
              אימוני כוח או משקולות
            </p>
            <div className="flex flex-col gap-2.5">
              {TRAINING_EXPERIENCE.map((e, n) => (
                <OptionCard
                  key={e.id}
                  n={n + 2}
                  icon={EXPERIENCE_ICONS[e.id]}
                  label={e.label}
                  hint={e.hint}
                  selected={answers.training_experience === e.id}
                  onClick={() => chooseAndAdvance(() => set("training_experience", e.id))}
                />
              ))}
            </div>
          </>
        );
      case "time":
        return (
          <>
            <h2 className="animate-card-in text-2xl font-black text-fg">כמה זמן יש לכם?</h2>
            <p className="animate-card-in text-sm font-bold text-muted mt-5 mb-2" style={stagger(1)}>
              ימים בשבוע
            </p>
            <div className="animate-card-in flex flex-wrap gap-2" style={stagger(2)}>
              {TRAINING_DAYS.map((d) => (
                <Chip key={d} selected={answers.training_days === d} onClick={() => pick("training_days", d)}>
                  {d}
                </Chip>
              ))}
            </div>
            <p className="animate-card-in text-sm font-bold text-muted mt-6 mb-2" style={stagger(3)}>
              דקות לאימון
            </p>
            <div className="animate-card-in flex flex-wrap gap-2" style={stagger(4)}>
              {SESSION_MINUTES.map((m) => (
                <Chip key={m.value} selected={answers.session_minutes === m.value} onClick={() => pick("session_minutes", m.value)}>
                  {/* "60+" would read "+60" in RTL. */}
                  <span dir="ltr">{m.label}</span>
                </Chip>
              ))}
            </div>
            <p className="text-xs text-muted mt-4 min-h-8">
              {answers.session_minutes === 20 ? "20 דקות = אימון זריז ואינטנסיבי, בסופר-סטים" : answers.session_minutes ? "אימון רגיל, עם מנוחות מלאות בין סטים" : ""}
            </p>
          </>
        );
      case "location":
        return (
          <>
            <h2 className="animate-card-in text-2xl font-black text-fg">איפה מתאמנים?</h2>
            <p className="animate-card-in text-sm text-muted mt-1 mb-4" style={stagger(1)}>
              ככה נציע רק תרגילים שאפשר לעשות
            </p>
            <div className="flex flex-col gap-2.5">
              {TRAINING_LOCATIONS.map((l, n) => (
                <OptionCard
                  key={l.id}
                  n={n + 2}
                  icon={LOCATION_ICONS[l.id]}
                  label={l.label}
                  selected={answers.training_location === l.id}
                  // The gym needs nothing more; home opens the equipment list.
                  onClick={() => (l.id === "gym" ? chooseAndAdvance(() => set("training_location", "gym")) : pick("training_location", l.id))}
                />
              ))}
            </div>
            {answers.training_location && answers.training_location !== "gym" && (
              <div className="animate-card-in">
                <p className="text-sm font-bold text-muted mt-6 mb-2">מה יש בבית?</p>
                <div className="flex flex-wrap gap-2">
                  {HOME_GEAR.map((g) => (
                    <Chip key={g.id} selected={answers.home_equipment.includes(g.id)} onClick={() => toggleIn("home_equipment", g.id)}>
                      {g.label}
                    </Chip>
                  ))}
                </div>
              </div>
            )}
          </>
        );
      case "about":
        return (
          <>
            <h2 className="animate-card-in text-2xl font-black text-fg">קצת עליכם</h2>
            <p className="animate-card-in text-sm text-muted mt-1" style={stagger(1)}>
              הכול אופציונלי
            </p>
            <p className="animate-card-in text-sm font-bold text-muted mt-5 mb-2" style={stagger(2)}>
              איך לפנות אליכם?
            </p>
            <div className="animate-card-in flex flex-wrap gap-2" style={stagger(3)}>
              {ADDRESS_FORMS.map((f) => (
                <Chip key={f.id} selected={answers.address_form === f.id} onClick={() => pick("address_form", f.id)}>
                  {f.label}
                </Chip>
              ))}
            </div>
            <div className="animate-card-in grid grid-cols-3 gap-2.5 mt-6" style={stagger(4)}>
              <NumberField label="גיל" value={age} onChange={setAge} max={100} />
              <NumberField label='גובה (ס"מ)' value={heightText} onChange={setHeightText} max={250} />
              <NumberField label='משקל (ק"ג)' value={weightText} onChange={setWeightText} max={300} />
            </div>
          </>
        );
      case "pain":
        return (
          <>
            <h2 className="animate-card-in text-2xl font-black text-fg">משהו כואב או מגביל?</h2>
            <p className="animate-card-in text-sm text-muted mt-1 mb-4" style={stagger(1)}>
              נגיעה באזור במפה, מלפנים ומאחור
            </p>
            <div className="animate-card-in scheme-dark bg-elevated border border-line rounded-3xl p-4 flex flex-col items-center gap-4" style={stagger(2)}>
              <div className="flex justify-center gap-4">
                {(["anterior", "posterior"] as const).map((view) => (
                  <BodyDiagram key={view} view={view} width={120} showButtons={false} highlightedMuscles={answers.limitation_areas} onMuscleClick={(m) => toggleIn("limitation_areas", m)} />
                ))}
              </div>
              <BodyAreaButtons views={["anterior", "posterior"]} selected={answers.limitation_areas} onToggle={(m) => toggleIn("limitation_areas", m)} />
            </div>
            <p className="text-xs text-muted mt-2 min-h-5 text-center">
              {answers.limitation_areas.length > 0 ? (
                <>
                  {answers.limitation_areas.length === 1 ? "סומן אזור אחד" : `סומנו ${answers.limitation_areas.length} אזורים`} ·{" "}
                  <button type="button" className="font-bold text-accent-fg underline" onClick={() => set("limitation_areas", [])}>
                    ניקוי
                  </button>
                </>
              ) : (
                "אין? אפשר להמשיך"
              )}
            </p>
            <p className="animate-card-in text-sm font-bold text-muted mt-4 mb-2" style={stagger(3)}>
              ניתוח בשנה האחרונה?
            </p>
            <div className="animate-card-in flex gap-2" style={stagger(4)}>
              <Chip selected={answers.recent_surgery === false} onClick={() => pick("recent_surgery", false)}>
                לא
              </Chip>
              <Chip selected={answers.recent_surgery === true} onClick={() => pick("recent_surgery", true)}>
                כן
              </Chip>
            </div>
            {/* Notice at the point of collection: this is health data
                (מידע רגיש), optional, and who sees it — matches /privacy. */}
            <p className="animate-card-in text-xs text-muted mt-6 leading-relaxed" style={stagger(5)}>
              מידע רפואי, רשות למסור. משמש רק להתאמת האימונים, ומוצג למטפל שלכם ולמאמן ה-AI.{" "}
              <Link href="/privacy" target="_blank" className="underline font-bold">
                מדיניות הפרטיות
              </Link>
            </p>
          </>
        );
      case "done": {
        const rows: { icon: LucideIcon; text: string }[] = [
          { icon: Target, text: answers.training_goals.length ? `מטרות: ${answers.training_goals.map((g) => TRAINING_GOALS.find((x) => x.id === g)?.label).join(", ")}` : "מטרה: לא צוין" },
          { icon: Trees, text: levelLabel ? `ניסיון: ${levelLabel}` : "ניסיון: נניח שמתחילים" },
          {
            icon: CalendarDays,
            text: [answers.training_days ? `${answers.training_days} ימים בשבוע` : null, answers.session_minutes ? `${answers.session_minutes} דק' לאימון` : null].filter(Boolean).join(" · ") || "זמן: לא צוין",
          },
          { icon: MapPin, text: locationLabel ? `מתאמנים ${locationLabel}` : "מקום: לא צוין" },
          { icon: HeartHandshake, text: answers.limitation_areas.length === 1 ? "נשים לב לאזור רגיש אחד" : answers.limitation_areas.length ? `נשים לב ל-${answers.limitation_areas.length} אזורים רגישים` : "בלי מגבלות שדווחו" },
        ];
        return (
          <div className="pt-2">
            <img src="/ecco/celebrate-streak.webp" alt="" className="animate-card-in w-28 h-28 mx-auto rounded-[1.75rem] object-cover shadow-card" />
            <h2 className="animate-card-in text-2xl font-black text-fg text-center mt-5 mb-3" style={stagger(1)}>
              הנה מה שהבנו
            </h2>
            <ul>
              {rows.map((r, n) => (
                <li key={n} className="animate-card-in flex items-center gap-3 py-3 border-b border-line" style={stagger(n + 2)}>
                  <r.icon size={18} className="text-accent-fg shrink-0" aria-hidden="true" />
                  <span className="text-sm font-semibold text-fg">{r.text}</span>
                </li>
              ))}
            </ul>
            <p className="animate-card-in text-xs text-muted mt-3" style={stagger(rows.length + 2)}>
              אפשר לשנות הכול בפרופיל
            </p>
          </div>
        );
      }
    }
  })();

  if (!isMounted) return null;

  return createPortal(
    <div ref={dialogRef} role="dialog" aria-modal="true" aria-label="שאלון היכרות" className="fixed inset-0 z-[120] bg-page flex flex-col" dir="rtl" onTouchStart={onTouchStart} onTouchEnd={onTouchEnd}>
      <div className="pt-safe px-5 pt-4 flex items-center gap-3 min-h-14">
        <button
          type="button"
          onClick={back}
          aria-label="חזרה"
          inert={!showBack}
          className={`w-10 h-10 -ms-2 rounded-full flex items-center justify-center text-muted active:scale-90 transition-[scale,opacity] duration-150 ${showBack ? "" : "opacity-0 pointer-events-none"}`}
        >
          <ArrowRight size={20} />
        </button>
        <div className="flex-1 h-1 rounded-full bg-fg/10 overflow-hidden">
          {/* scaleX from the start edge (right in RTL): transform only, no layout. */}
          <div className="h-full bg-accent origin-right transition-transform duration-[360ms] ease-out-strong" style={{ transform: `scaleX(${stepIndex / (STEPS.length - 1)})` }} />
        </div>
        <span className="w-9 text-xs font-bold text-muted tabular-nums text-left" dir="ltr">
          {stepIndex > 0 && step !== "done" ? `${stepIndex}/${QUESTION_COUNT}` : ""}
        </span>
      </div>

      <div className="flex-1 overflow-y-auto px-5 pb-4">
        <div key={step} className={`max-w-md mx-auto pt-2 ${direction === 1 ? "animate-step-in" : "animate-step-back"}`}>
          {body}
        </div>
      </div>

      <div className="px-5 pt-2 pb-[max(1.25rem,env(safe-area-inset-bottom))] max-w-md w-full mx-auto">
        <button
          type="button"
          onClick={next}
          disabled={isSaving}
          className={`w-full min-h-14 rounded-2xl font-black text-base flex items-center justify-center gap-2 border-2 transition-ui duration-200 ease-out active:scale-[0.97] ${
            ctaPrimary ? "bg-btn-primary text-btn-primary-fg border-transparent" : "bg-transparent text-muted border-line"
          }`}
        >
          {isSaving ? <Loader2 size={18} className="animate-spin" /> : ctaLabel}
        </button>
        {step === "welcome" && (
          <button type="button" onClick={onLater} className="w-full mt-2 py-2.5 text-sm font-bold text-muted active:scale-[0.97] transition-transform duration-150">
            אמלא אחר כך
          </button>
        )}
      </div>
    </div>,
    document.body
  );
}
