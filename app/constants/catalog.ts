import { Activity, Dumbbell, Wind, Target, Layers, Flame, HeartPulse } from "lucide-react";
import type { ComponentType } from "react";

type IconComponent = ComponentType<{ size?: number; className?: string }>;

export const AVAILABLE_MUSCLES = [
  // Original 15 - ids/labels unchanged (existing exercises reference these).
  { id: "chest", label: "חזה" }, { id: "front-deltoids", label: "כתף קדמית" }, { id: "back-deltoids", label: "כתף אחורית" },
  { id: "biceps", label: "יד קדמית" }, { id: "triceps", label: "יד אחורית" }, { id: "upper-back", label: "גב עליון" },
  { id: "lower-back", label: "גב תחתון" }, { id: "abs", label: "בטן" }, { id: "obliques", label: "אלכסונים" },
  { id: "gluteal", label: "ישבן" }, { id: "quadriceps", label: "ארבע ראשי" }, { id: "hamstring", label: "האמסטרינג" },
  { id: "calves", label: "תאומים" }, { id: "adductors", label: "מקרבים" }, { id: "abductors", label: "מרחיקים" },
  // Added for full anatomical coverage (confirmed with Roei) - purely
  // additive, nothing above renamed/removed so existing exercise data
  // keeps resolving. Grouped here by region purely for readability;
  // MUSCLE_REGIONS below is what actually drives the grouped admin UI.
  { id: "serratus-anterior", label: "משונן קדמי" },
  { id: "side-deltoids", label: "כתף אמצעית" }, { id: "rotator-cuff", label: "מסובבי כתף" },
  { id: "lats", label: "גב רחב (לאטס)" }, { id: "trapezius", label: "טרפז" }, { id: "rhomboids", label: "רומבואיד" },
  { id: "brachialis", label: "ברכיאליס" }, { id: "forearm-flexors", label: "כופפי אמה" }, { id: "forearm-extensors", label: "פושטי אמה" },
  { id: "transverse-abdominis", label: "שריר בטן רוחבי" },
  { id: "hip-flexors", label: "כופפי ירך" }, { id: "glute-medius", label: "ישבן תיכון" },
  { id: "soleus", label: "סוליאוס" }, { id: "tibialis-anterior", label: "טיביאליס קדמי" }, { id: "peroneus-longus", label: "פרונאוס לונגוס" },
  // Added for the anatomy heatmap's 2026-09-20 overlay.svg re-export, which
  // added erector_spine/lower_erector_spine paths (see muscleMapping.ts).
  { id: "erector-spinae", label: "זוקפי הגב" }
];

// Purely for grouping the (now 30-entry) muscle picker in the admin form by
// anatomical region, so it's still scannable. Organized by physical
// location on the body - independent of, and not always 1:1 with,
// BODY_PART_GROUPS below (e.g. lower-back sits here under "back" since
// that's where it is on the body, but tags as "core" for the DIY filter
// since that's its functional role).
export const MUSCLE_REGIONS: { id: string; label: string; muscleIds: string[] }[] = [
  { id: "chest", label: "חזה", muscleIds: ["chest", "serratus-anterior"] },
  { id: "shoulders", label: "כתפיים", muscleIds: ["front-deltoids", "side-deltoids", "back-deltoids", "rotator-cuff"] },
  { id: "back", label: "גב", muscleIds: ["upper-back", "lower-back", "lats", "trapezius", "rhomboids", "erector-spinae"] },
  { id: "arms", label: "זרועות", muscleIds: ["biceps", "triceps", "brachialis", "forearm-flexors", "forearm-extensors"] },
  { id: "core", label: "בטן וליבה", muscleIds: ["abs", "obliques", "transverse-abdominis"] },
  { id: "legs", label: "רגליים וירכיים", muscleIds: ["quadriceps", "hamstring", "gluteal", "glute-medius", "adductors", "abductors", "hip-flexors", "calves", "soleus", "tibialis-anterior", "peroneus-longus"] },
];

// Body-part filter/tag taxonomy for the DIY builder (confirmed with Roei).
// "upper-body"/"lower-body" are umbrella tags layered on top of the
// specific ones (see MUSCLE_TO_BODY_PARTS) - e.g. a chest exercise carries
// both "chest" and "upper-body" for filtering purposes, though the exercise
// card itself only surfaces the single most specific tag (see
// getPrimaryBodyPart in DiyBuilderTab). Confirmed decisions: lower-back
// tags as core (not upper-body); hip-flexors tags as legs only (not core).
export const BODY_PART_GROUPS: { id: string; label: string }[] = [
  { id: "chest", label: "חזה" },
  { id: "back", label: "גב" },
  { id: "shoulders", label: "כתפיים" },
  { id: "arms", label: "זרועות" },
  { id: "core", label: "core" },
  { id: "legs", label: "רגליים" },
  { id: "upper-body", label: "גוף עליון" },
  { id: "lower-body", label: "גוף תחתון" },
];

export const MUSCLE_TO_BODY_PARTS: Record<string, string[]> = {
  chest: ["chest", "upper-body"],
  "serratus-anterior": ["chest", "upper-body"],
  "front-deltoids": ["shoulders", "upper-body"],
  "side-deltoids": ["shoulders", "upper-body"],
  "back-deltoids": ["shoulders", "upper-body"],
  "rotator-cuff": ["shoulders", "upper-body"],
  biceps: ["arms", "upper-body"],
  triceps: ["arms", "upper-body"],
  brachialis: ["arms", "upper-body"],
  "forearm-flexors": ["arms", "upper-body"],
  "forearm-extensors": ["arms", "upper-body"],
  "upper-back": ["back", "upper-body"],
  lats: ["back", "upper-body"],
  trapezius: ["back", "upper-body"],
  rhomboids: ["back", "upper-body"],
  abs: ["core"],
  obliques: ["core"],
  "transverse-abdominis": ["core"],
  "lower-back": ["core"],
  quadriceps: ["legs", "lower-body"],
  hamstring: ["legs", "lower-body"],
  gluteal: ["legs", "lower-body"],
  "glute-medius": ["legs", "lower-body"],
  adductors: ["legs", "lower-body"],
  abductors: ["legs", "lower-body"],
  "hip-flexors": ["legs", "lower-body"],
  calves: ["legs", "lower-body"],
  soleus: ["legs", "lower-body"],
  "tibialis-anterior": ["legs", "lower-body"],
  "peroneus-longus": ["legs", "lower-body"],
};

// Tag/badge colors, shared by every tag map below. All built from the
// global color tokens (app/globals.css) — no per-category hues any more:
// the theme has one accent (teal) for tags, and --warm is reserved for a
// single highlight type (premium/featured), not for any category. `text`/`bg`/`border` are for tags on
// a light --surface (accent-on-light text on a 15% accent tint clears
// WCAG AA); `solid` is a small filled dot/indicator.
const mix = (token: string, pct: number) => `color-mix(in srgb, var(${token}) ${pct}%, transparent)`;
const ACCENT_TAG = { text: "var(--accent-on-light)", bg: mix("--accent", 15), border: mix("--accent", 30), solid: "var(--accent)" };
const NEUTRAL_TAG = { text: "var(--text-on-light-muted)", bg: mix("--text-on-light-muted", 12), border: mix("--text-on-light-muted", 30), solid: "var(--text-on-light-muted)" };

export const BODY_PART_STYLES: Record<string, { text: string; bg: string; border: string; solid: string }> = {
  chest: ACCENT_TAG,
  back: ACCENT_TAG,
  shoulders: ACCENT_TAG,
  arms: ACCENT_TAG,
  core: ACCENT_TAG,
  legs: ACCENT_TAG,
  "upper-body": ACCENT_TAG,
  "lower-body": ACCENT_TAG,
};
export const DEFAULT_BODY_PART_STYLE = NEUTRAL_TAG;

export const EQUIPMENT_LIST = [
  { id: "pullup_bar", label: "מתח" },
  { id: "parallettes", label: "פרלטים" },
  { id: "dip_bar", label: "מקבילים" },
  { id: "rings", label: "טבעות" },
  { id: "kettlebell", label: "קטלבל" },
  { id: "dumbbells", label: "משקולות" },
  { id: "bodyweight", label: "משקל גוף (ללא ציוד)" },
  { id: "ab_wheel", label: "Ab Wheel" },
  { id: "resistance_band", label: "גומיית התנגדות" },
];

export const DAYS_OF_WEEK = [
  { id: "0", label: "ראשון", short: "Su", he_short: "א'" }, { id: "1", label: "שני", short: "Mo", he_short: "ב'" }, { id: "2", label: "שלישי", short: "Tu", he_short: "ג'" },
  { id: "3", label: "רביעי", short: "We", he_short: "ד'" }, { id: "4", label: "חמישי", short: "Th", he_short: "ה'" }, { id: "5", label: "שישי", short: "Fr", he_short: "ו'" }, { id: "6", label: "שבת", short: "Sa", he_short: "ש'" }
];

export const ADMIN_TAGS: { id: string; label: string; icon: IconComponent; desc: string }[] = [
  { id: "calisthenics", label: "קליסטניקס", icon: Activity, desc: "שליטה במשקל גוף, מתח ותנועה חופשית" },
  { id: "gym", label: "מכון כושר", icon: Dumbbell, desc: "היפרטרופיה ועבודת משקולות מתקדמת (לשימור ידע)" },
  { id: "yoga", label: "יוגה", icon: Wind, desc: "זרימה, נשימה ושליטה אבסולוטית בגוף" },
  { id: "mobility", label: "מוביליטי", icon: Target, desc: "טווחי תנועה, גמישות ומניעת פציעות" },
  { id: "kettlebell", label: "קטלבל", icon: Layers, desc: "כוח דינאמי, יציבות קור וסיבולת לב ריאה" },
  { id: "plyometrics", label: "פליומטרי", icon: Flame, desc: "כוח מתפרץ, זריזות וכוח פליומטרי טהור" },
  { id: "rehab", label: "שיקום", icon: HeartPulse, desc: "קליני בלבד - פתוח למטופלים תחת השגחה" }
];

// exercises.name_display_preference (NameDisplayPreference, app/types/index.ts)
// — shown in the admin builder's display-name dropdown.
export const NAME_DISPLAY_PREFERENCES: { id: "en" | "he" | "both"; label: string }[] = [
  { id: "en", label: "אנגלית" },
  { id: "he", label: "עברית" },
  { id: "both", label: "שתיהן" },
];

// exercises.difficulty_level (DifficultyLevel, app/types/index.ts) — shown in
// the admin builder's difficulty dropdown.
export const DIFFICULTY_LEVELS: { id: "beginner" | "intermediate" | "advanced" | "clinical"; label: string }[] = [
  { id: "beginner", label: "מתחיל" },
  { id: "intermediate", label: "בינוני" },
  { id: "advanced", label: "מתקדם" },
  { id: "clinical", label: "קליני" },
];

export const CATEGORY_IMAGES: Record<string, string> = {
  "קליסטניקס": "https://images.unsplash.com/photo-1598971639058-fab354c622d2?auto=format&fit=crop&w=800&q=80",
  "מכון כושר": "https://images.unsplash.com/photo-1534438327276-14e5300c3a48?auto=format&fit=crop&w=800&q=80",
  "מוביליטי ויוגה": "https://images.unsplash.com/photo-1544367567-0f2fcb009e0b?auto=format&fit=crop&w=800&q=80",
  "יוגה": "https://images.unsplash.com/photo-1544367567-0f2fcb009e0b?auto=format&fit=crop&w=800&q=80",
  "קטלבל": "https://images.unsplash.com/photo-1517838503506-3b561768809d?auto=format&fit=crop&w=800&q=80",
  "כוח וסיבולת": "https://images.unsplash.com/photo-1534438327276-14e5300c3a48?auto=format&fit=crop&w=800&q=80",
  "שיקום תנועתי": "https://images.unsplash.com/photo-1576678927484-cc907957088c?auto=format&fit=crop&w=800&q=80"
};

export const DEFAULT_COURSE_IMG = "https://images.unsplash.com/photo-1517836357463-d25dfeac3438?auto=format&fit=crop&w=800&q=80";

// Glow tint per category track (Main's track cards, the Premium store's
// track cards) — a card base plus a category-tinted radial glow, replacing
// per-category stock photos. All tracks share the accent glow now (single
// color system); the map is kept so a category can opt into a different
// token later without touching the consumers.
export const TRACK_GLOW_TINTS: Record<string, string> = {
  "יוגה": mix("--accent", 30),
  "קטלבל": mix("--accent", 30),
  "מוביליטי": mix("--accent", 30),
  "קליסטניקס": mix("--accent", 30),
  "מכון כושר": mix("--accent", 30),
  "שיקום": mix("--accent", 30),
};
export const DEFAULT_TRACK_GLOW = mix("--accent", 22);

// Patient-facing DIY-builder category tag colors — a separate, smaller
// taxonomy from ADMIN_TAGS (which is admin-only and has 7 values). Exercises'
// `category` is a free-text column, so any value not in this map (e.g. a
// legacy value like "כוח וסיבולת") falls back to DEFAULT_DIY_CATEGORY_STYLE
// rather than being hidden.
//
// Same light-surface tag styling as BODY_PART_STYLES above — this map feeds
// the same DiyBuilderTab.tsx pills.
export const DIY_CATEGORY_STYLES: Record<string, { text: string; bg: string; border: string; solid: string }> = {
  "קטלבל": ACCENT_TAG,
  "יוגה": ACCENT_TAG,
  "שרירים": ACCENT_TAG,
  "מוביליטי": ACCENT_TAG,
};
export const DEFAULT_DIY_CATEGORY_STYLE = NEUTRAL_TAG;

// Admin-facing category tag colors (AdminExerciseLibrary + ProtocolBuilder,
// and the patient calendar's category dots). A separate 7-value taxonomy
// from DIY_CATEGORY_STYLES above — keyed by ADMIN_TAGS label (Hebrew text),
// which is what exercises.category actually stores. These render on dark
// (card thumbnail headers / the dark page), so `text` is the plain accent;
// `glow` is the tinted dark tone behind card thumbnails. (--warm is
// reserved for the premium/featured highlight, so no category uses it.)
const darkTag = (token: string) => ({
  text: `var(${token})`,
  bg: mix(token, 15),
  border: mix(token, 30),
  glow: `color-mix(in srgb, var(${token}) 22%, var(--bg-base))`,
  radial: mix(token, 30),
});
export const ADMIN_CATEGORY_STYLES: Record<string, { text: string; bg: string; border: string; glow: string; radial: string }> = {
  "קליסטניקס": darkTag("--accent"),
  "מכון כושר": darkTag("--accent"),
  "יוגה": darkTag("--accent"),
  "מוביליטי": darkTag("--accent"),
  "קטלבל": darkTag("--accent"),
  "פליומטרי": darkTag("--accent"),
  "שיקום": darkTag("--accent"),
};
export const DEFAULT_ADMIN_CATEGORY_STYLE = { ...darkTag("--text-on-dark-muted"), glow: "var(--bg-elevated)" };

// react-body-highlighter (the muscle-diagram library backing ExerciseMuscleMap
// and PlanTab's hero diagram) only recognizes a fixed ~21-muscle vocabulary and
// crashes (not silently ignores) on any id outside it — confirmed the hard way:
// fillMuscleData() indexes straight into a lookup object with no undefined
// guard. Our own AVAILABLE_MUSCLES has 30 entries (several with no equivalent
// in the library, plus one name mismatch: our "adductors" vs its "adductor"),
// so ids are mapped through this allowlist rather than passed straight
// through. A muscle with no entry here is dropped from the diagram entirely
// (by design, confirmed with Roei) rather than approximated to a nearby
// region — anatomical accuracy matters more here than a fuller-looking
// picture. Single source of truth: PlanTab's hero diagram and
// ExerciseMuscleMap both import this rather than keeping their own copies.
export const BODY_MODEL_MUSCLE_MAP: Record<string, string> = {
  chest: "chest",
  "front-deltoids": "front-deltoids",
  "back-deltoids": "back-deltoids",
  biceps: "biceps",
  triceps: "triceps",
  forearm: "forearm",
  "upper-back": "upper-back",
  "lower-back": "lower-back",
  trapezius: "trapezius",
  abs: "abs",
  obliques: "obliques",
  adductors: "adductor",
  abductors: "abductors",
  hamstring: "hamstring",
  quadriceps: "quadriceps",
  calves: "calves",
  gluteal: "gluteal",
};

export function toBodyModelMuscles(ids: string[]): string[] {
  return Array.from(new Set(ids.map((id) => BODY_MODEL_MUSCLE_MAP[id]).filter((m): m is string => Boolean(m))));
}

// Two-tone intensity scale for ExerciseMuscleMap: index 0 = secondary/
// stabilizer muscles (exercises.secondary_muscles), index 1 = the primary
// agonist (exercises.target_muscle) — matches react-body-highlighter's
// `highlightedColors[frequency - 1]` indexing (see ExerciseMuscleMap.tsx).
export const MUSCLE_MAP_TIER_COLORS = ["var(--muscle-secondary)", "var(--muscle-primary)"];

// AnatomyDiagram now draws from a custom-commissioned SVG (see
// app/components/patient/anatomy/customAnatomyRegions.ts) instead of the
// `body-muscles` package (removed as a dependency — nothing else used it).
// That source is an image-trace export: it has exactly 2 giant compound
// paths, not one path per muscle, so CUSTOM_ANATOMY_REGIONS was built by
// splitting those compound paths on their subpath boundaries — 116 regions,
// numbered by extraction order, with NO inherent anatomical labels. Some
// regions are genuinely single-muscle-sized (e.g. one whole quad); others
// are much bigger fused blobs (e.g. the entire front torso — chest+abs+
// neck together, since the source line art never draws a boundary between
// them that closes off separate shapes). AnatomyDiagram's Dev Mode
// (NODE_ENV !== "production") click-logs each region's id/view/center so
// this table can be filled in by hand — click around locally, note which
// AVAILABLE_MUSCLES id maps to which region id(s), and add rows below. A
// region that's actually 3 fused muscles has to be mapped to whichever one
// AVAILABLE_MUSCLES id makes sense (or left out) — there's no way to
// recover a finer boundary the source file never drew.
export const MUSCLE_TO_ANATOMY_REGIONS: Record<string, { view: "front" | "back"; ids: number[] }> = {
  // TODO: fill in via AnatomyDiagram's Dev Mode click-to-console.log.
};

// Muscle-diagram tier colors — the theme's dedicated muscle tokens (teal
// primary mover, warm assisting muscle). Never red: --danger is reserved
// for errors/destructive actions, and a red diagram would read as "these
// muscles hurt" next to the separate pain-area check-in.
export const ANATOMY_TIER_COLORS = { primary: "var(--muscle-primary)", secondary: "var(--muscle-secondary)" };
