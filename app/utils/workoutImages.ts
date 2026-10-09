// Today-hero artwork (the Ecco character) per workout category, served from
// public/workouts/<folder>/<n>.webp. Keyed by the Hebrew labels stored in
// exercises.categories.
const WORKOUT_IMAGE_SETS: Record<string, { folder: string; count: number }> = {
  "קליסטניקס": { folder: "calisthenics", count: 6 },
  "מכון כושר": { folder: "gym", count: 5 },
  "קטלבל": { folder: "kettlebell", count: 3 },
  "פליומטרי": { folder: "plyometrics", count: 5 },
};

const ALL_IMAGES = Object.values(WORKOUT_IMAGE_SETS).flatMap(({ folder, count }) =>
  Array.from({ length: count }, (_, i) => `/workouts/${folder}/${i + 1}.webp`)
);

// The workout's category = whichever of the four image categories appears
// most across its exercises (an exercise can carry several categories, and
// "מוביליטי" etc. have no artwork, so they don't vote).
export function dominantWorkoutCategory(exerciseCategories: string[][]): string | null {
  const votes: Record<string, number> = {};
  exerciseCategories.flat().forEach((c) => {
    if (WORKOUT_IMAGE_SETS[c]) votes[c] = (votes[c] ?? 0) + 1;
  });
  let best: string | null = null;
  for (const c in votes) if (best === null || votes[c] > votes[best]) best = c;
  return best;
}

// One image per calendar day: stable across refreshes within a day, and
// rotating by day number guarantees tomorrow differs from today. No matching
// category → rotate through the whole pool.
export function dailyWorkoutImage(category: string | null, date = new Date()): string {
  const dayNumber = Math.floor(Date.UTC(date.getFullYear(), date.getMonth(), date.getDate()) / 86_400_000);
  const set = category ? WORKOUT_IMAGE_SETS[category] : undefined;
  if (!set) return ALL_IMAGES[dayNumber % ALL_IMAGES.length];
  return `/workouts/${set.folder}/${(dayNumber % set.count) + 1}.webp`;
}
