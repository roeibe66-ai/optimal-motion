// Tags on curated_facts (the "Did you know?" cards, which double as the AI
// coach's knowledge cards). Two kinds: where in the body, and what it's
// about. Stored as the ids; the labels are only for display.

export const KNOWLEDGE_AREA_TAGS: { id: string; label: string }[] = [
  { id: "neck", label: "צוואר" },
  { id: "shoulder", label: "כתף" },
  { id: "elbow-wrist", label: "מרפק ושורש כף היד" },
  { id: "upper-back", label: "גב עליון" },
  { id: "lower-back", label: "גב תחתון" },
  { id: "hip", label: "ירך ואגן" },
  { id: "knee", label: "ברך" },
  { id: "ankle-foot", label: "קרסול וכף רגל" },
];

export const KNOWLEDGE_TOPIC_TAGS: { id: string; label: string }[] = [
  { id: "pain", label: "כאב" },
  { id: "tendon", label: "גידים" },
  { id: "injury-prevention", label: "מניעת פציעות" },
  { id: "return-to-sport", label: "חזרה לספורט" },
  { id: "post-surgery", label: "אחרי ניתוח" },
  { id: "strength", label: "כוח" },
  { id: "hypertrophy", label: "מסת שריר" },
  { id: "endurance", label: "סיבולת" },
  { id: "mobility", label: "גמישות ומוביליטי" },
  { id: "warm-up", label: "חימום" },
  { id: "recovery", label: "התאוששות" },
  { id: "sleep", label: "שינה" },
  { id: "nutrition", label: "תזונה" },
  { id: "breathing", label: "נשימה" },
  { id: "running", label: "ריצה" },
  { id: "aging", label: "גיל מבוגר" },
  { id: "motivation", label: "התמדה" },
];

export const KNOWLEDGE_TAG_LABELS: Record<string, string> = Object.fromEntries(
  [...KNOWLEDGE_AREA_TAGS, ...KNOWLEDGE_TOPIC_TAGS].map((t) => [t.id, t.label])
);

export const EVIDENCE_GRADE_LABELS: Record<"A" | "B" | "C", string> = {
  A: "A · סקירה שיטתית / מטה-אנליזה",
  B: "B · ניסוי מבוקר אקראי",
  C: "C · מחקר אחר",
};
