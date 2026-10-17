"use client";

// End-of-rest sound in the workout player: a soft tick on each of the last
// 3 seconds and a two-note bell when the rest ends. Synthesized with Web
// Audio (no files to load). Only while the app is on screen — in the
// background the rest-end push notification takes over.
//
// iOS only lets audio start inside a user gesture, so primeRestSound() is
// called from the "set done" tap that starts every rest; after that the
// context stays unlocked for the session.

const STORAGE_KEY = "optimalMotionRestSound";

let ctx: AudioContext | null = null;

export function isRestSoundEnabled(): boolean {
  try {
    return localStorage.getItem(STORAGE_KEY) !== "false";
  } catch {
    return true;
  }
}

export function setRestSoundEnabled(on: boolean) {
  try {
    localStorage.setItem(STORAGE_KEY, String(on));
  } catch {
    // Not remembered; the default (on) applies next time.
  }
}

export function primeRestSound() {
  if (typeof window === "undefined" || !isRestSoundEnabled()) return;
  const Ctor = window.AudioContext ?? (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
  if (!Ctor) return;
  if (!ctx) ctx = new Ctor();
  if (ctx.state === "suspended") void ctx.resume();
}

// One sine partial with a fast attack and an exponential decay.
function tone(at: number, frequency: number, peak: number, decay: number) {
  if (!ctx) return;
  const osc = ctx.createOscillator();
  const gain = ctx.createGain();
  osc.type = "sine";
  osc.frequency.value = frequency;
  gain.gain.setValueAtTime(0.0001, at);
  gain.gain.exponentialRampToValueAtTime(peak, at + 0.008);
  gain.gain.exponentialRampToValueAtTime(0.0001, at + decay);
  osc.connect(gain).connect(ctx.destination);
  osc.start(at);
  osc.stop(at + decay + 0.05);
}

function ready() {
  return !!ctx && ctx.state === "running" && isRestSoundEnabled() && document.visibilityState === "visible";
}

// A short, quiet wood-like tick (3, 2, 1).
export function playRestTick() {
  if (!ready()) return;
  const t = ctx!.currentTime;
  tone(t, 1320, 0.06, 0.09);
  tone(t, 660, 0.03, 0.07);
}

// A soft two-note bell: G5 then C6, each with a quiet octave partial so it
// rings rather than beeps.
export function playRestEnd() {
  if (!ready()) return;
  const t = ctx!.currentTime;
  for (const [offset, f] of [
    [0, 783.99],
    [0.16, 1046.5],
  ] as const) {
    tone(t + offset, f, 0.16, 1.4);
    tone(t + offset, f * 2, 0.04, 0.6);
  }
}
