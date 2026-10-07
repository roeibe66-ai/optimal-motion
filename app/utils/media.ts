import { supabase } from "@/app/lib/supabase";
import type { Exercise } from "@/app/types";

// Studio backdrop of the Ecco renders — the media box uses it so any
// letterboxing blends into the clip instead of showing the theme surface.
export const MEDIA_STUDIO_BG = "#0B1220";

export const MEDIA_BUCKET = "exercise-media";

// "1:1" only for legacy gif_url media, whose shape is unknown (rendered
// object-cover in a square, as before).
export type MediaAspect = "4:5" | "16:9" | "1:1";

export interface ExerciseMediaItem {
  key: string;
  kind: "video" | "image";
  src: string;
  poster: string | null;
  aspect: MediaAspect;
  legacy: boolean;
}

const isVideoUrl = (url: string) => /\.(mp4|webm)(\?|$)/i.test(url);

export function mediaPublicUrl(path: string) {
  return supabase.storage.from(MEDIA_BUCKET).getPublicUrl(path).data.publicUrl;
}

// Every playable angle for an exercise, primary first: approved
// exercise_media rows when there are any, otherwise the legacy
// gif_url/secondary_gif_url pair (so exercises without new media look
// exactly as they did).
export function getExerciseMediaItems(exercise: Exercise | null | undefined): ExerciseMediaItem[] {
  if (!exercise) return [];
  const rows = (exercise.media ?? []).filter((m) => m.approved).sort((a, b) => a.position - b.position);
  if (rows.length > 0) {
    return rows.map((m) => ({
      key: m.id,
      kind: m.kind,
      src: mediaPublicUrl(m.path),
      poster: m.poster_path ? mediaPublicUrl(m.poster_path) : null,
      aspect: m.aspect,
      legacy: false,
    }));
  }
  return [exercise.gif_url, exercise.secondary_gif_url]
    .filter((url): url is string => !!url)
    .map((url, i) => ({ key: `legacy-${i}`, kind: isVideoUrl(url) ? "video" : "image", src: url, poster: null, aspect: "1:1", legacy: true }));
}

// A still for small thumbnails: the new media's poster/image, or a legacy
// gif_url that isn't a video. Null = nothing still to show.
export function getExerciseThumbUrl(exercise: Exercise | null | undefined): string | null {
  const first = getExerciseMediaItems(exercise)[0];
  if (!first) return null;
  if (first.kind === "image") return first.src;
  return first.poster;
}
