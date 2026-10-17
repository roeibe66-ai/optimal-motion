"use client";

import { useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { Loader2, MessageSquarePlus, X } from "lucide-react";
import { supabase } from "@/app/lib/supabase";
import { submitChangeRequest } from "@/app/actions/changeRequests";
import { useDialog } from "@/app/hooks/useDialog";
import { useAddress } from "@/app/hooks/useAddress";
import { notify } from "@/app/components/ui/feedback";

interface ChangeRequestSheetProps {
  programId: string | null;
  programName: string;
  onClose: () => void;
}

interface OwnRequest {
  id: string;
  message: string;
  status: "open" | "done";
  admin_note: string | null;
  created_at: string;
  handled_at: string | null;
}

const MAX_CHARS = 500;
const shortDate = (iso: string) => new Date(iso).toLocaleDateString("he-IL", { day: "numeric", month: "numeric" });

// "רוצה שינוי בתוכנית?": a few words to the therapist (change_requests).
// Shows an open request instead of the form, and the last reply. The limits
// are enforced by the database; its message is shown as is.
export default function ChangeRequestSheet({ programId, programName, onClose }: ChangeRequestSheetProps) {
  const t = useAddress();
  const [text, setText] = useState("");
  const [requests, setRequests] = useState<OwnRequest[] | null>(null);
  const [isSending, setIsSending] = useState(false);
  const [error, setError] = useState("");
  const [isMounted, setIsMounted] = useState(false);
  const panelRef = useRef<HTMLDivElement>(null);
  useDialog(panelRef, isMounted, onClose);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect -- portal target exists only after the first client render
    setIsMounted(true);
    supabase
      .from("change_requests")
      .select("id, message, status, admin_note, created_at, handled_at")
      .order("created_at", { ascending: false })
      .limit(5)
      .then(({ data }) => setRequests((data ?? []) as OwnRequest[]));
  }, []);

  const open = requests?.find((r) => r.status === "open");
  const lastReply = requests?.find((r) => r.status === "done" && r.admin_note);

  const send = async () => {
    if (!text.trim() || isSending) return;
    setIsSending(true);
    setError("");
    const { data } = await supabase.auth.getSession();
    const result = await submitChangeRequest(data.session?.access_token ?? "", programId, text);
    setIsSending(false);
    if (!result.ok) {
      setError(result.error);
      return;
    }
    notify("הבקשה נשלחה");
    onClose();
  };

  if (!isMounted) return null;

  return createPortal(
    <div className="fixed inset-0 z-[130] flex items-end md:items-center justify-center" dir="rtl">
      <div className="absolute inset-0 bg-backdrop backdrop-blur-sm" onClick={onClose} aria-hidden="true" />
      <div
        ref={panelRef}
        role="dialog"
        aria-modal="true"
        aria-label="בקשה לשינוי בתוכנית"
        className="on-light animate-card-in relative w-full md:max-w-lg bg-surface rounded-t-[2rem] md:rounded-[2rem] shadow-elevated max-h-[88dvh] flex flex-col"
      >
        <div className="flex items-center justify-between gap-3 px-6 pt-5 pb-3 border-b border-line">
          <div className="flex items-center gap-2.5 min-w-0">
            <MessageSquarePlus size={20} className="text-accent-fg shrink-0" />
            <div className="min-w-0">
              <h2 className="font-black text-fg truncate">בקשה לשינוי בתוכנית</h2>
              <p className="text-xs text-muted truncate">{programName}</p>
            </div>
          </div>
          <button type="button" onClick={onClose} aria-label="סגירה" className="p-2 text-muted hover:text-fg active:scale-90 transition-transform">
            <X size={20} />
          </button>
        </div>

        <div className="overflow-y-auto px-6 py-4 space-y-4">
          {lastReply && (
            <div className="bg-accent/10 border border-accent/20 rounded-2xl p-4">
              <p className="text-xs font-bold text-accent-fg mb-1">התשובה לבקשה מ-{shortDate(lastReply.created_at)}</p>
              <p className="text-sm text-fg whitespace-pre-wrap">{lastReply.admin_note}</p>
            </div>
          )}
          {requests === null ? (
            <div className="flex justify-center py-6 text-muted">
              <Loader2 size={18} className="animate-spin" />
            </div>
          ) : open ? (
            <div className="bg-surface-alt border border-line rounded-2xl p-4">
              <p className="text-xs font-bold text-muted mb-1">בקשה פתוחה מ-{shortDate(open.created_at)} · מחכה למטפל</p>
              <p className="text-sm text-fg whitespace-pre-wrap">{open.message}</p>
            </div>
          ) : (
            <>
              <p className="text-sm text-muted">{t("כתוב בכמה מילים מה תרצה לשנות: תרגיל שלא מתאים, משהו שקל או קשה מדי, יותר ימים, ציוד אחר...")}</p>
              <textarea
                value={text}
                onChange={(e) => setText(e.target.value.slice(0, MAX_CHARS))}
                rows={5}
                autoFocus
                className="w-full bg-page border border-line rounded-2xl px-4 py-3 text-fg text-base outline-none focus:border-focus focus:ring-2 focus:ring-focus resize-none"
              />
              <p className="text-[11px] text-muted text-left tabular-nums" dir="ltr">
                {text.length}/{MAX_CHARS}
              </p>
            </>
          )}
          {error && (
            <p role="alert" className="text-sm font-bold text-danger-fg">
              {error}
            </p>
          )}
        </div>

        {!open && requests !== null && (
          <div className="px-6 pt-3 pb-[max(1.25rem,env(safe-area-inset-bottom))] border-t border-line">
            <button
              type="button"
              onClick={send}
              disabled={isSending || !text.trim()}
              className="w-full min-h-12 rounded-2xl bg-btn-primary text-btn-primary-fg font-black flex items-center justify-center gap-2 hover:bg-btn-primary-hover active:scale-[0.98] transition-[transform,background-color] duration-150 ease-out disabled:bg-disabled disabled:text-disabled-fg"
            >
              {isSending ? <Loader2 size={18} className="animate-spin" /> : "שליחה למטפל"}
            </button>
          </div>
        )}
      </div>
    </div>,
    document.body
  );
}
