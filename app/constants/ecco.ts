// Ecco artwork (public/ecco/) for the patient app's feedback, empty states
// and the DIY builder's categories. Prompts: ECCO-PROMPTS.md.

// RPE as 5 Ecco states instead of a 1-10 number grid (most patients didn't
// know what "RPE" meant). Each state is stored on the original 1-10 scale
// (workout_logs.rpe), so history, averages and the trend chart keep working.
export const RPE_LEVELS: { value: number; label: string; hint: string; image: string }[] = [
  { value: 2, label: "קליל", hint: "יכולתי להמשיך עוד הרבה", image: "/ecco/rpe-1.webp" },
  { value: 4, label: "נוח", hint: "עבדתי, אבל בנוחות", image: "/ecco/rpe-2.webp" },
  { value: 6, label: "מאתגר", hint: "היה צריך להתאמץ", image: "/ecco/rpe-3.webp" },
  { value: 8, label: "קשה מאוד", hint: "בקושי סיימתי", image: "/ecco/rpe-4.webp" },
  { value: 10, label: "נגמרתי", hint: "לא נשאר לי כלום", image: "/ecco/rpe-5.webp" },
];

// "Feedback sent" — one of these at random each time.
export const FEEDBACK_DONE_IMAGES = ["/ecco/feedback-thumbs.webp", "/ecco/feedback-flex.webp"];

// DIY builder category headers, keyed by exercises.categories values.
export const ECCO_CATEGORY_IMAGES: Record<string, string> = {
  "קליסטניקס": "/ecco/category-calisthenics.webp",
  "מכון כושר": "/ecco/category-gym.webp",
  "מוביליטי": "/ecco/category-mobility.webp",
  "קטלבל": "/ecco/category-kettlebell.webp",
  "פליומטרי": "/ecco/category-plyometrics.webp",
};
export const ECCO_MUSCLE_GROUPS_IMAGE = "/ecco/category-muscle-groups.webp";

// BODY_PART_GROUPS ids -> Ecco with that region highlighted. The umbrella
// upper/lower-body groups reuse chest/legs until they get their own art.
export const ECCO_REGION_IMAGES: Record<string, string> = {
  chest: "/ecco/region-chest.webp",
  back: "/ecco/region-back.webp",
  shoulders: "/ecco/region-shoulders.webp",
  arms: "/ecco/region-arms.webp",
  core: "/ecco/region-core.webp",
  legs: "/ecco/region-legs.webp",
  "upper-body": "/ecco/region-chest.webp",
  "lower-body": "/ecco/region-legs.webp",
};

export const ECCO_EMPTY = {
  weekComplete: "/ecco/celebrate-streak.webp",
  noData: "/ecco/empty-no-data.webp",
  noPlan: "/ecco/rest-day.webp",
  offline: "/ecco/offline.webp",
};
