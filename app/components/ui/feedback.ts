"use client";

import { useSyncExternalStore } from "react";

// App-wide feedback without native alert()/confirm(): those freeze the page
// in a gray system box (often titled with the site's address, buttons
// sometimes in English) — the clearest "this is a website" tell on a phone.
// Callable from anywhere, hooks included: notify() shows the shared Toast,
// confirmAction() opens a bottom sheet and resolves true/false.
// <FeedbackHost /> (mounted once at the app root) renders both.

export type ToastTone = "success" | "error" | "info";

export interface ToastRequest {
  id: number;
  message: string;
  tone: ToastTone;
}

export interface ConfirmOptions {
  title: string;
  message?: string;
  confirmLabel: string;
  cancelLabel?: string | null; // null = acknowledge-only (one button)
  destructive?: boolean;
}

export interface ConfirmRequest extends ConfirmOptions {
  id: number;
  resolve: (confirmed: boolean) => void;
}

interface FeedbackState {
  toast: ToastRequest | null;
  confirm: ConfirmRequest | null;
}

let state: FeedbackState = { toast: null, confirm: null };
let nextId = 1;
const listeners = new Set<() => void>();

function setState(next: Partial<FeedbackState>) {
  state = { ...state, ...next };
  listeners.forEach((l) => l());
}

export function notify(message: string, tone: ToastTone = "success") {
  setState({ toast: { id: nextId++, message, tone } });
}

export function confirmAction(options: ConfirmOptions): Promise<boolean> {
  // A second confirm while one is open answers the first with "no".
  state.confirm?.resolve(false);
  return new Promise((resolve) => {
    setState({ confirm: { ...options, id: nextId++, resolve } });
  });
}

export function dismissToast(id: number) {
  if (state.toast?.id === id) setState({ toast: null });
}

export function settleConfirm(id: number, confirmed: boolean) {
  if (state.confirm?.id !== id) return;
  state.confirm.resolve(confirmed);
  setState({ confirm: null });
}

const subscribe = (l: () => void) => {
  listeners.add(l);
  return () => listeners.delete(l);
};
const SERVER_STATE: FeedbackState = { toast: null, confirm: null };

export function useFeedbackState() {
  return useSyncExternalStore(subscribe, () => state, () => SERVER_STATE);
}
