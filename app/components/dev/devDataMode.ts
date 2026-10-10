"use client";

import { useSyncExternalStore } from "react";

// Dev-only data switch for break-ui style stress tests: `?data=worst` (etc.)
// in the URL swaps a hook's real data for a fixture at the data boundary.
// Always "demo" (the real data) outside `next dev`, so it can't leak into
// production even if the param is present.
export const DEV_DATA_MODES = ["demo", "worst", "empty", "one", "huge"] as const;
export type DevDataMode = (typeof DEV_DATA_MODES)[number];

const IS_DEV = process.env.NODE_ENV === "development";
const CHANGE_EVENT = "devdatamode";

function readMode(): DevDataMode {
  const param = new URLSearchParams(window.location.search).get("data");
  return (DEV_DATA_MODES as readonly string[]).includes(param ?? "") ? (param as DevDataMode) : "demo";
}

function subscribe(onChange: () => void) {
  window.addEventListener("popstate", onChange);
  window.addEventListener(CHANGE_EVENT, onChange);
  return () => {
    window.removeEventListener("popstate", onChange);
    window.removeEventListener(CHANGE_EVENT, onChange);
  };
}

export function useDevDataMode(): DevDataMode {
  const mode = useSyncExternalStore(subscribe, readMode, () => "demo" as const);
  return IS_DEV ? mode : "demo";
}

export function setDevDataMode(mode: DevDataMode) {
  const url = new URL(window.location.href);
  if (mode === "demo") url.searchParams.delete("data");
  else url.searchParams.set("data", mode);
  window.history.replaceState(window.history.state, "", url);
  window.dispatchEvent(new Event(CHANGE_EVENT));
}
