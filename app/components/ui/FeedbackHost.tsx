"use client";

import { AlertTriangle, HelpCircle } from "lucide-react";
import Modal from "@/app/components/ui/Modal";
import { ToastPill } from "@/app/components/ui/Toast";
import { dismissToast, settleConfirm, useFeedbackState } from "@/app/components/ui/feedback";

// Renders whatever notify()/confirmAction() (feedback.ts) asked for. Mounted
// once per app root (app/page.tsx, and the /dev harnesses).
export default function FeedbackHost() {
  const { toasts, confirm } = useFeedbackState();

  return (
    <>
      {/* Newest nearest the screen edge, up to three; older ones recede
          (scale/opacity by depth). Placement is CSS (.toast-stack): above the
          bottom nav, or at the top while a sheet/full-screen flow is open. */}
      {toasts.length > 0 && (
        <div className="toast-stack fixed bottom-24 left-1/2 -translate-x-1/2 z-[250] flex flex-col-reverse items-center gap-2 w-max max-w-[calc(100vw-2rem)] print:hidden">
          {[...toasts].reverse().map((toast, depth) => (
            <ToastPill
              key={toast.id}
              depth={depth}
              message={toast.message}
              tone={toast.tone}
              action={toast.action}
              // Long or error messages stay up longer: ~60ms per character on
              // top of the base, capped so a stack trace can't pin it forever.
              // An undo needs time to be reached for: at least 5s.
              durationMs={Math.max(toast.action ? 5000 : 0, Math.min(7000, (toast.tone === "error" ? 3500 : 2500) + toast.message.length * 60))}
              onDismiss={() => dismissToast(toast.id)}
            />
          ))}
        </div>
      )}

      {confirm && (
        <Modal
          key={confirm.id}
          onClose={() => settleConfirm(confirm.id, false)}
          title={confirm.title}
          icon={confirm.destructive ? <AlertTriangle size={20} className="text-danger-fg" /> : <HelpCircle size={20} className="text-accent-fg" />}
        >
          {confirm.message && <p className="text-start text-fg text-[0.9375rem] leading-relaxed mb-6">{confirm.message}</p>}
          <div className="flex flex-col gap-2.5">
            <button
              onClick={() => settleConfirm(confirm.id, true)}
              className={`w-full py-3.5 rounded-full font-black text-base active:scale-[0.98] transition-ui duration-150 ease-out ${
                confirm.destructive ? "bg-danger text-on-accent hover:brightness-110" : "bg-btn-primary text-btn-primary-fg hover:bg-btn-primary-hover active:bg-btn-primary-active"
              }`}
            >
              {confirm.confirmLabel}
            </button>
            {confirm.cancelLabel !== null && (
              <button
                onClick={() => settleConfirm(confirm.id, false)}
                className="w-full py-3 rounded-full font-bold text-sm text-fg hover:bg-line active:scale-[0.98] transition-ui duration-150 ease-out"
              >
                {confirm.cancelLabel ?? "ביטול"}
              </button>
            )}
          </div>
        </Modal>
      )}
    </>
  );
}
