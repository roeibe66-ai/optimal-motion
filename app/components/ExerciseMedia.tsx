"use client";

import { useEffect, useRef, useState, useSyncExternalStore, type ReactNode } from "react";
import { Dumbbell, Play } from "lucide-react";
import type { Exercise } from "@/app/types";
import { getExerciseMediaItems, MEDIA_STUDIO_BG, type ExerciseMediaItem, type MediaAspect } from "@/app/utils/media";

// Exercise demo media. Two shapes:
//  - <ExerciseMediaPlayer> — the big player (exercise info, active set,
//    rest preview, AMRAP stations): looping muted video that only plays
//    while on screen, poster-only under prefers-reduced-motion, and an
//    angle toggle when the exercise has more than one item.
//  - <ExerciseThumb> — small list thumbnails: a still (poster/image), never
//    an autoplaying video.
// Both fall back to the legacy gif_url/secondary_gif_url via
// getExerciseMediaItems, so exercises without new media render as before.

const ASPECT_CLASS: Record<MediaAspect, string> = {
  "4:5": "aspect-[4/5] max-w-[280px]",
  "16:9": "aspect-video max-w-[400px]",
  "1:1": "aspect-square max-w-[280px]",
};

const reducedMotionQuery = "(prefers-reduced-motion: reduce)";
function subscribeReducedMotion(onChange: () => void) {
  const mql = window.matchMedia(reducedMotionQuery);
  mql.addEventListener("change", onChange);
  return () => mql.removeEventListener("change", onChange);
}
function usePrefersReducedMotion() {
  return useSyncExternalStore(
    subscribeReducedMotion,
    () => window.matchMedia(reducedMotionQuery).matches,
    () => false,
  );
}

// The angle the patient last picked for each exercise, kept across visits.
// Read through useSyncExternalStore (server snapshot 0) rather than a
// useState initializer, so the first client render matches the server HTML
// and the stored choice applies right after hydration. The in-memory map
// keeps the toggle working when localStorage is unavailable (private mode).
const ANGLE_EVENT = "om-media-angle";
const angleKey = (exerciseId: string) => `om_media_angle:${exerciseId}`;
const angleMemory = new Map<string, number>();
function readAngle(exerciseId: string) {
  const inMemory = angleMemory.get(exerciseId);
  if (inMemory !== undefined) return inMemory;
  try {
    return Number(localStorage.getItem(angleKey(exerciseId))) || 0;
  } catch {
    return 0;
  }
}
function rememberAngle(exerciseId: string, angle: number) {
  angleMemory.set(exerciseId, angle);
  try {
    localStorage.setItem(angleKey(exerciseId), String(angle));
  } catch {
    // private mode — remembered for this page load only
  }
  window.dispatchEvent(new Event(ANGLE_EVENT));
}
function subscribeAngle(onChange: () => void) {
  window.addEventListener(ANGLE_EVENT, onChange);
  window.addEventListener("storage", onChange); // another tab picked an angle
  return () => {
    window.removeEventListener(ANGLE_EVENT, onChange);
    window.removeEventListener("storage", onChange);
  };
}
function useRememberedAngle(exerciseId: string) {
  return useSyncExternalStore(
    subscribeAngle,
    () => (exerciseId ? readAngle(exerciseId) : 0),
    () => 0,
  );
}

type Fit = "cover" | "contain";
// Full class names (not `object-${fit}`) so Tailwind's scanner sees them.
const FIT_CLASS: Record<Fit, string> = { cover: "w-full h-full object-cover", contain: "w-full h-full object-contain" };

// One <video> that plays only while at least a quarter of it is visible.
function InViewVideo({ item, label, reducedMotion, fit }: { item: ExerciseMediaItem; label: string; reducedMotion: boolean; fit: Fit }) {
  const ref = useRef<HTMLVideoElement>(null);
  const [userStarted, setUserStarted] = useState(false);
  const autoplay = !reducedMotion || userStarted;

  useEffect(() => {
    const video = ref.current;
    if (!video || !autoplay) return;
    const play = () => video.play().catch(() => {}); // autoplay can still be refused (Low Power Mode) — poster stays up
    if (typeof IntersectionObserver === "undefined") {
      play();
      return;
    }
    let inView = false;
    const io = new IntersectionObserver(
      ([entry]) => {
        inView = entry.isIntersecting;
        if (inView) play();
        else video.pause();
      },
      { threshold: 0.25 },
    );
    io.observe(video);
    // Browsers pause video-only media while the page is hidden (app switch,
    // locked phone) and the observer doesn't fire again on return, since
    // the clip never left the viewport — resume it here.
    const onVisibility = () => {
      if (document.visibilityState === "visible" && inView) play();
    };
    document.addEventListener("visibilitychange", onVisibility);
    return () => {
      io.disconnect();
      document.removeEventListener("visibilitychange", onVisibility);
    };
  }, [autoplay, item.src]);

  return (
    <>
      <video
        ref={ref}
        src={item.src}
        poster={item.poster ?? undefined}
        muted
        playsInline
        loop
        // Nothing is fetched until the clip scrolls into view (play() starts
        // the download); the poster holds the frame until then.
        preload="none"
        aria-label={label}
        className={FIT_CLASS[fit]}
      />
      {!autoplay && (
        <button
          onClick={(e) => {
            e.stopPropagation(); // the clip may sit inside a clickable row
            setUserStarted(true);
          }}
          aria-label={`הפעל סרטון: ${label}`}
          className="absolute inset-0 flex items-center justify-center"
        >
          <span className="w-14 h-14 rounded-full bg-scrim/60 backdrop-blur-md flex items-center justify-center text-surface">
            <Play size={24} className="translate-x-0.5" />
          </span>
        </button>
      )}
    </>
  );
}

// Legacy gif_url media was always cropped to cover; new media keeps its
// whole frame in its own aspect box, except when filling a fixed shape.
function MediaItemView({ item, label, reducedMotion, fit }: { item: ExerciseMediaItem; label: string; reducedMotion: boolean; fit: Fit }) {
  if (item.kind === "video") return <InViewVideo key={item.key} item={item} label={label} reducedMotion={reducedMotion} fit={fit} />;
  return <img src={item.src} alt={label} className={FIT_CLASS[fit]} />;
}

interface ExerciseMediaPlayerProps {
  exercise: Exercise | null | undefined;
  label: string; // exercise name, for alt/aria-label
  // "box": own aspect-ratio box + angle toggle. "fill": fills the parent
  // (a fixed-size square/circle), primary item only, cropped to cover.
  mode?: "box" | "fill";
  // "fill" only: "contain" keeps new media's whole frame (studio bg pads
  // it) — for tiles whose shape doesn't match the clip's aspect.
  fillFit?: Fit;
  className?: string;
  placeholder?: ReactNode; // shown when the exercise has no media at all
}

export function ExerciseMediaPlayer({ exercise, label, mode = "box", fillFit = "cover", className = "", placeholder }: ExerciseMediaPlayerProps) {
  const items = getExerciseMediaItems(exercise);
  const reducedMotion = usePrefersReducedMotion();
  const exerciseId = exercise?.id ?? "";
  const angle = useRememberedAngle(exerciseId);

  if (items.length === 0) return <>{placeholder ?? null}</>;

  if (mode === "fill") {
    const item = items[0];
    return (
      <div className={`relative w-full h-full ${className}`} style={item.legacy ? undefined : { background: MEDIA_STUDIO_BG }}>
        <MediaItemView item={item} label={label} reducedMotion={reducedMotion} fit={item.legacy ? "cover" : fillFit} />
      </div>
    );
  }

  const current = items[Math.min(angle, items.length - 1)];
  const pickAngle = (i: number) => rememberAngle(exerciseId, i);

  // The angle toggle sits under the box, not over it — overlaid it hid the
  // hands/feet in 16:9 floor clips.
  return (
    <div className={`w-full flex flex-col items-center gap-2.5 ${className}`}>
      <div
        className={`relative w-full ${ASPECT_CLASS[current.aspect]} rounded-[2rem] overflow-hidden border border-line shadow-card ${current.legacy ? "bg-fg/10" : ""}`}
        style={current.legacy ? undefined : { background: MEDIA_STUDIO_BG }}
      >
        <MediaItemView item={current} label={label} reducedMotion={reducedMotion} fit={current.legacy ? "cover" : "contain"} />
      </div>

      {items.length > 1 && (
        <div
          role="group"
          aria-label="בחירת זווית צילום"
          className="flex gap-1 p-1 rounded-full bg-elevated border border-line"
        >
          {items.map((item, i) => (
            <button
              key={item.key}
              onClick={() => pickAngle(i)}
              aria-pressed={item === current}
              className={`px-3 py-1.5 rounded-full text-xs font-bold transition-colors duration-150 ${
                item === current ? "bg-accent text-on-accent" : "text-muted hover:text-fg"
              }`}
            >
              זווית {i + 1}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

interface ExerciseThumbProps {
  exercise: Exercise | null | undefined;
  alt: string;
  className: string; // size/shape/background of the thumbnail element
  // Fit for legacy gif_url media (call sites historically varied, e.g.
  // "object-contain p-0.5"); new posters/images always fill the tile.
  legacyFit?: string;
  fallback?: ReactNode;
}

// Small still thumbnail. Legacy mp4 gif_urls keep rendering as a paused
// <video> (its first frame), exactly as the list rows did before.
export function ExerciseThumb({ exercise, alt, className, legacyFit = "object-cover", fallback }: ExerciseThumbProps) {
  const first = getExerciseMediaItems(exercise)[0];
  const empty = fallback ?? (
    <div className={`${className} flex items-center justify-center`}>
      <Dumbbell size={16} className="text-muted" />
    </div>
  );
  if (!first) return <>{empty}</>;
  if (first.legacy) {
    return first.kind === "video" ? (
      <video src={first.src} muted playsInline preload="metadata" className={`${className} ${legacyFit}`} />
    ) : (
      <img src={first.src} alt={alt} className={`${className} ${legacyFit}`} />
    );
  }
  const src = first.kind === "image" ? first.src : first.poster;
  if (!src) return <>{empty}</>;
  return <img src={src} alt={alt} loading="lazy" className={`${className} object-cover`} style={{ background: MEDIA_STUDIO_BG }} />;
}
