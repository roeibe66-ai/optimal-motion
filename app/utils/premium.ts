import { ADMIN_TAGS } from "@/app/constants/catalog";
import type { Patient } from "@/app/types";

// Shared "does this category correspond to a purchasable track, and does the
// patient own it" lookup, reused by the Plan tab (category cards + detail
// lock screen) and the Premium store. Callers still combine `owned` with
// their own extra conditions (week number, DIY mode, etc.) since those
// differ slightly between call sites in the original and aren't unified here.
export function getTrackAccess(patient: Patient | null, categoryLabel: string | null | undefined) {
  const track = ADMIN_TAGS.find((t) => t.label === categoryLabel && t.id !== "rehab");
  const owned = track ? !!patient?.premium_tracks?.includes(track.id) : true;
  return { track, owned };
}
