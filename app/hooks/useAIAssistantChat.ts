"use client";

import { useCallback, useState } from "react";
import { chatWithAssistant } from "@/app/actions/aiAssistant";
import { supabase } from "@/app/lib/supabase";
import type { AIAssistantContext, AIAssistantRole, AIChatMessage } from "@/app/types";

// Shared state/send logic behind both chat surfaces (the admin builder's
// co-pilot drawer and the patient's coach sheet) — each renders its own
// themed UI on top of this, but neither duplicates the message-array/
// loading/error handling.
export function useAIAssistantChat(role: AIAssistantRole, contextData?: AIAssistantContext) {
  const [messages, setMessages] = useState<AIChatMessage[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState("");

  const sendMessage = useCallback(
    async (text: string) => {
      const trimmed = text.trim();
      if (!trimmed || isLoading) return;

      const nextMessages: AIChatMessage[] = [...messages, { role: "user", content: trimmed }];
      setMessages(nextMessages);
      setIsLoading(true);
      setError("");

      const { data } = await supabase.auth.getSession();
      const result = await chatWithAssistant(data.session?.access_token ?? "", nextMessages, role, contextData);
      setIsLoading(false);
      if (!result.ok) {
        setError(result.error);
        return;
      }
      setMessages((prev) => [...prev, { role: "assistant", content: result.reply }]);
    },
    [messages, isLoading, role, contextData]
  );

  return { messages, isLoading, error, sendMessage };
}
