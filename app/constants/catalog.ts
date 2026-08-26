import { Activity, Dumbbell, Wind, Target, Layers, Flame, HeartPulse } from "lucide-react";
import type { ComponentType } from "react";

type IconComponent = ComponentType<{ size?: number; className?: string }>;

export const AVAILABLE_MUSCLES = [
  { id: "chest", label: "חזה" }, { id: "front-deltoids", label: "כתף קדמית" }, { id: "back-deltoids", label: "כתף אחורית" },
  { id: "biceps", label: "יד קדמית" }, { id: "triceps", label: "יד אחורית" }, { id: "upper-back", label: "גב עליון" },
  { id: "lower-back", label: "גב תחתון" }, { id: "abs", label: "בטן" }, { id: "obliques", label: "אלכסונים" },
  { id: "gluteal", label: "ישבן" }, { id: "quadriceps", label: "ארבע ראשי" }, { id: "hamstring", label: "האמסטרינג" },
  { id: "calves", label: "תאומים" }, { id: "adductors", label: "מקרבים" }, { id: "abductors", label: "מרחיקים" }
];

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
