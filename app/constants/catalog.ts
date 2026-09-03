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
  { id: "soleus", label: "סוליאוס" }, { id: "tibialis-anterior", label: "טיביאליס קדמי" }, { id: "peroneus-longus", label: "פרונאוס לונגוס" }
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
  { id: "back", label: "גב", muscleIds: ["upper-back", "lower-back", "lats", "trapezius", "rhomboids"] },
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
  "upper-back": ["upper-body"],
  lats: ["upper-body"],
  trapezius: ["upper-body"],
  rhomboids: ["upper-body"],
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

// Distinct 7-color palette for BODY_PART_GROUPS - deliberately not reusing
// any hex from DIY_CATEGORY_STYLES or ADMIN_CATEGORY_STYLES below so the
// two existing tag systems and this new one never collide on an exercise
// card.
export const BODY_PART_STYLES: Record<string, { text: string; bg: string; border: string }> = {
  chest: { text: "#fb7185", bg: "rgba(251,113,133,0.14)", border: "rgba(251,113,133,0.3)" },
  shoulders: { text: "#e879f9", bg: "rgba(232,121,249,0.14)", border: "rgba(232,121,249,0.3)" },
  arms: { text: "#a3e635", bg: "rgba(163,230,53,0.14)", border: "rgba(163,230,53,0.3)" },
  core: { text: "#34d399", bg: "rgba(52,211,153,0.14)", border: "rgba(52,211,153,0.3)" },
  legs: { text: "#818cf8", bg: "rgba(129,140,248,0.14)", border: "rgba(129,140,248,0.3)" },
  "upper-body": { text: "#22d3ee", bg: "rgba(34,211,238,0.14)", border: "rgba(34,211,238,0.3)" },
  "lower-body": { text: "#38bdf8", bg: "rgba(56,189,248,0.14)", border: "rgba(56,189,248,0.3)" },
};
export const DEFAULT_BODY_PART_STYLE = { text: "#a8a29e", bg: "rgba(168,162,158,0.14)", border: "rgba(168,162,158,0.3)" };

export const EQUIPMENT_LIST = [
  { id: "pullup_bar", label: "מתח" },
  { id: "dip_bar", label: "מקבילים" },
  { id: "parallettes", label: "פרללס" },
  { id: "ab_wheel", label: "Ab Wheel" },
  { id: "rings", label: "טבעות" },
  { id: "kettlebell", label: "קטלבל" },
  { id: "bodyweight", label: "משקל גוף (ללא ציוד)" }
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

// Warm-tinted glow per category track (Main's track cards, the Premium
// store's track cards) — a dark card base plus a category-tinted radial
// glow, replacing per-category stock photos with a hand-authored look.
// Generalized rather than hand-coded per category, since the real category
// list isn't fixed to whichever categories a given mockup happened to show.
export const TRACK_GLOW_TINTS: Record<string, string> = {
  "יוגה": "rgba(248,113,86,0.32)",
  "קטלבל": "rgba(245,158,11,0.3)",
  "מוביליטי": "rgba(234,179,8,0.3)",
  "קליסטניקס": "rgba(20,184,166,0.3)",
  "מכון כושר": "rgba(234,88,12,0.3)",
  "שיקום": "rgba(16,185,129,0.25)",
};
export const DEFAULT_TRACK_GLOW = "rgba(245,158,11,0.22)";

// Patient-facing DIY-builder category tag colors — a separate, smaller
// taxonomy from ADMIN_TAGS (which is admin-only and has 7 values). Exercises'
// `category` is a free-text column, so any value not in this map (e.g. a
// legacy value like "כוח וסיבולת") falls back to DEFAULT_DIY_CATEGORY_STYLE
// rather than being hidden.
export const DIY_CATEGORY_STYLES: Record<string, { text: string; bg: string; border: string }> = {
  "קטלבל": { text: "#f59e0b", bg: "rgba(245,158,11,0.14)", border: "rgba(245,158,11,0.3)" },
  "יוגה": { text: "#f87156", bg: "rgba(248,113,86,0.14)", border: "rgba(248,113,86,0.3)" },
  "שרירים": { text: "#60a5fa", bg: "rgba(59,130,246,0.14)", border: "rgba(59,130,246,0.3)" },
  "מוביליטי": { text: "#facc15", bg: "rgba(234,179,8,0.14)", border: "rgba(234,179,8,0.3)" },
};
export const DEFAULT_DIY_CATEGORY_STYLE = { text: "#a8a29e", bg: "rgba(168,162,158,0.14)", border: "rgba(168,162,158,0.3)" };

// Admin-facing category tag colors (AdminExerciseLibrary + ProtocolBuilder).
// A separate 7-value taxonomy from DIY_CATEGORY_STYLES above — keyed by
// ADMIN_TAGS label (Hebrew text), which is what exercises.category actually
// stores. `glow` is the darker tone used behind card thumbnails.
export const ADMIN_CATEGORY_STYLES: Record<string, { text: string; bg: string; border: string; glow: string; radial: string }> = {
  "קליסטניקס": { text: "#14b8a6", bg: "rgba(20,184,166,0.14)", border: "rgba(20,184,166,0.3)", glow: "#123a34", radial: "rgba(20,184,166,0.32)" },
  "מכון כושר": { text: "#a78bfa", bg: "rgba(167,139,250,0.14)", border: "rgba(167,139,250,0.3)", glow: "#241a3a", radial: "rgba(167,139,250,0.28)" },
  "יוגה": { text: "#f87156", bg: "rgba(248,113,86,0.14)", border: "rgba(248,113,86,0.3)", glow: "#3a1e18", radial: "rgba(248,113,86,0.3)" },
  "מוביליטי": { text: "#facc15", bg: "rgba(234,179,8,0.14)", border: "rgba(234,179,8,0.3)", glow: "#3a3414", radial: "rgba(234,179,8,0.28)" },
  "קטלבל": { text: "#f59e0b", bg: "rgba(245,158,11,0.14)", border: "rgba(245,158,11,0.3)", glow: "#3a2c14", radial: "rgba(245,158,11,0.3)" },
  "פליומטרי": { text: "#fb923c", bg: "rgba(251,146,60,0.14)", border: "rgba(251,146,60,0.3)", glow: "#3a2410", radial: "rgba(251,146,60,0.28)" },
  "שיקום": { text: "#60a5fa", bg: "rgba(96,165,250,0.14)", border: "rgba(96,165,250,0.3)", glow: "#14263a", radial: "rgba(96,165,250,0.28)" },
};
export const DEFAULT_ADMIN_CATEGORY_STYLE = { text: "#a8a29e", bg: "rgba(168,162,158,0.14)", border: "rgba(168,162,158,0.3)", glow: "#1c1c1e", radial: "rgba(168,162,158,0.24)" };
