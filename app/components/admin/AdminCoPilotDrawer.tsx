"use client";

import { useState, type FormEvent } from "react";
import { Bot, Send, Sparkles, X } from "lucide-react";
import { useAIAssistantChat } from "@/app/hooks/useAIAssistantChat";
import type { AIAssistantContext } from "@/app/types";

interface AdminCoPilotDrawerProps {
  contextData?: AIAssistantContext;
}

// Floating trigger + slide-in side drawer, mounted only within the builder
// tab (see adminTab === "builder" in LegacyAdminApp.tsx) so it always has
// the in-progress plan's contextData to ground its answers in. Not the same
// thing as the "עוזר קליני AI" prompt bar already in that tab — that one is
// a keyword-matched exercise-filter mock (handleAiGenerate); this is a real
// chat backed by app/actions/aiAssistant.ts.
export default function AdminCoPilotDrawer({ contextData }: AdminCoPilotDrawerProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [input, setInput] = useState("");
  const { messages, isLoading, error, sendMessage } = useAIAssistantChat("admin", contextData);

  const handleSubmit = (e: FormEvent) => {
    e.preventDefault();
    const text = input;
    setInput("");
    sendMessage(text);
  };

  return (
    <>
      <button
        onClick={() => setIsOpen(true)}
        className={`fixed bottom-8 left-8 z-40 w-16 h-16 rounded-full bg-btn-primary text-btn-primary-fg shadow-[0_12px_28px_-8px_color-mix(in_srgb,var(--accent)_60%,transparent)] flex items-center justify-center hover:bg-btn-primary-hover active:bg-btn-primary-active hover:scale-105 active:scale-95 transition-all duration-200 ${
          isOpen ? "opacity-0 pointer-events-none" : "opacity-100"
        }`}
        aria-label="פתח עוזר קליני AI"
      >
        <Bot size={26} />
      </button>

      {isOpen && <div className="fixed inset-0 bg-scrim/50 z-40 backdrop-blur-sm" onClick={() => setIsOpen(false)}></div>}

      <div
        className={`fixed inset-y-0 left-0 z-50 w-full sm:w-[420px] bg-elevated border-l border-line flex flex-col transition-transform duration-300 ease-out ${
          isOpen ? "translate-x-0" : "-translate-x-full"
        }`}
      >
        <div className="p-5 border-b border-line flex items-center justify-between shrink-0">
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-xl bg-accent/15 text-accent-fg flex items-center justify-center shrink-0">
              <Sparkles size={18} />
            </div>
            <div>
              <h3 className="font-black text-fg text-sm">עוזר קליני AI</h3>
              <p className="text-[10px] text-muted font-bold">שותף מקצועי לבניית תוכניות</p>
            </div>
          </div>
          <button onClick={() => setIsOpen(false)} className="p-2 text-muted hover:text-fg transition-colors" aria-label="סגור">
            <X size={20} />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto p-5 space-y-4">
          {messages.length === 0 && (
            <div className="text-center text-muted text-xs font-medium mt-10 px-4 leading-relaxed">
              שאל אותי על בניית פרוטוקול, פריודיזציה של בלוקים, או התאמת תרגילים למקרה שאתה בונה כרגע.
            </div>
          )}
          {messages.map((m, i) => (
            <div key={i} className={`flex ${m.role === "user" ? "justify-start" : "justify-end"}`}>
              <div
                className={`max-w-[85%] rounded-2xl px-4 py-3 text-[13px] leading-relaxed whitespace-pre-wrap ${
                  m.role === "user" ? "bg-line text-fg" : "bg-accent/10 border border-accent/20 text-fg"
                }`}
              >
                {m.content}
              </div>
            </div>
          ))}
          {isLoading && (
            <div className="flex justify-end">
              <div className="bg-accent/10 border border-accent/20 rounded-2xl px-4 py-3 text-accent-fg text-xs font-bold">חושב...</div>
            </div>
          )}
          {error && <div className="bg-danger/10 border border-danger/20 text-danger-fg text-xs font-bold px-4 py-3 rounded-2xl">{error}</div>}
        </div>

        <form onSubmit={handleSubmit} className="p-4 border-t border-line flex gap-2 shrink-0">
          <input
            type="text"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            placeholder="שאל את העוזר הקליני..."
            className="on-light flex-1 bg-surface border border-line rounded-2xl px-4 py-3 text-fg text-sm placeholder:text-muted outline-none focus:border-focus focus:ring-2 focus:ring-focus"
          />
          <button
            type="submit"
            disabled={isLoading || !input.trim()}
            className="bg-btn-primary text-btn-primary-fg w-11 h-11 rounded-2xl flex items-center justify-center hover:bg-btn-primary-hover active:bg-btn-primary-active disabled:bg-disabled disabled:text-disabled-fg disabled:hover:bg-disabled disabled:cursor-not-allowed transition-colors shrink-0"
            aria-label="שלח"
          >
            <Send size={18} />
          </button>
        </form>
      </div>
    </>
  );
}
