// A light tap on the device for small "it happened" moments outside a live
// workout (liking, adding an exercise). Honors the Profile haptics setting
// (useHaptics' "optimalMotionHaptics" key). navigator.vibrate is Android-only
// — iOS Safari has no web vibration, so this is a silent no-op there.
export function tapHaptic(ms = 30) {
  try {
    if (localStorage.getItem("optimalMotionHaptics") === "false") return;
  } catch {
    // Storage unavailable (private mode etc.) — fall through with the default "on".
  }
  navigator.vibrate?.(ms);
}
