"use client";

import { useCallback, useEffect, useState } from "react";
import { chatWithAssistant } from "@/app/actions/aiAssistant";
import { askCoach, clearCoachHistory, loadCoachHistory } from "@/app/actions/coach";
import { supabase } from "@/app/lib/supabase";
import type { AIAssistantContext, AIAssistantRole, AIChatMessage } from "@/app/types";

// Shared state/send logic behind both chat surfaces (the admin co-pilot
// drawer and the patient's coach sheet) — each renders its own themed UI on
// top of this, but neither duplicates the message-array/loading/error
// handling. "admin" -> chatWithAssistant (contextData = what's on screen);
// "patient" -> askCoach, which loads the patient's own data on the server,
// and the conversation continues from the stored history (coach_messages).
export function useAIAssistantChat(role: AIAssistantRole, contextData?: AIAssistantContext) {
  const [messages, setMessages] = useState<AIChatMessage[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState("");

  // Pick the stored conversation back up (patient only; the admin co-pilot
  // keeps nothing).
  useEffect(() => {
    if (role !== "patient") return;
    let cancelled = false;
    (async () => {
      const { data } = await supabase.auth.getSession();
      const result = await loadCoachHistory(data.session?.access_token ?? "");
      if (!cancelled && result.ok && result.messages.length > 0) {
        setMessages((prev) => (prev.length === 0 ? result.messages.map(({ role: r, content }) => ({ role: r, content })) : prev));
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [role]);

  const clearHistory = useCallback(async () => {
    const { data } = await supabase.auth.getSession();
    const result = await clearCoachHistory(data.session?.access_token ?? "");
    if (!result.ok) {
      setError(result.error ?? "המחיקה נכשלה");
      return false;
    }
    setMessages([]);
    setError("");
    return true;
  }, []);

  const sendMessage = useCallback(
    async (text: string) => {
      const trimmed = text.trim();
      if (!trimmed || isLoading) return;

      const nextMessages: AIChatMessage[] = [...messages, { role: "user", content: trimmed }];
      setMessages(nextMessages);
      setIsLoading(true);
      setError("");

      const { data } = await supabase.auth.getSession();
      const token = data.session?.access_token ?? "";
      const result = role === "admin" ? await chatWithAssistant(token, nextMessages, contextData) : await askCoach(token, nextMessages);
      setIsLoading(false);
      if (!result.ok) {
        setError(result.error);
        return;
      }
      setMessages((prev) => [...prev, { role: "assistant", content: result.reply }]);
    },
    [messages, isLoading, role, contextData]
  );

  return { messages, isLoading, error, sendMessage, clearHistory };
}
