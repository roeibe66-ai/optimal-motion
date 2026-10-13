// Gesture physics shared by the sheet (ui/Modal) and the builder's drag-to-
// reorder list (Apple, "Designing Fluid Interfaces").

// Where a flick would come to rest, scroll-deceleration style.
export const project = (velocityPxPerSec: number, decelerationRate = 0.998) => ((velocityPxPerSec / 1000) * decelerationRate) / (1 - decelerationRate);

// Resistance past a boundary: the further past it, the less the element follows.
export const rubberband = (overshoot: number, dimension: number, constant = 0.55) =>
  (overshoot * dimension * constant) / (dimension + constant * Math.abs(overshoot));

export const prefersReducedMotion = () => typeof window !== "undefined" && window.matchMedia("(prefers-reduced-motion: reduce)").matches;
