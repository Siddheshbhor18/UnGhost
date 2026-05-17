"use client";

import { useEffect, useRef, useState } from "react";
import { Bot, Send, Sparkles } from "lucide-react";
import clsx from "clsx";

interface Msg {
  role: "student" | "tutor";
  content: string;
}

interface Props {
  bootcampId: string;
  videoId?: string;
  videoTitle?: string;
  /** Optional getter for current player timestamp in seconds. */
  getTimestamp?: () => number;
}

/**
 * Lesson-aware AI Tutor side rail. Constrained per PRD:
 * — explains concepts, summarises, quizzes, gives analogies
 * — refuses career advice (→ AI Coach) and answer-leaking
 */
export function TutorPanel({ bootcampId, videoId, videoTitle, getTimestamp }: Props) {
  const [input, setInput] = useState("");
  const [busy, setBusy] = useState(false);
  const [messages, setMessages] = useState<Msg[]>([
    {
      role: "tutor",
      content: videoTitle
        ? `I'm your tutor for "${videoTitle}". Ask about the concept, request a summary, or have me quiz you.`
        : "I'm your AI Tutor for this bootcamp. Ask about any concept from the lessons.",
    },
  ]);
  const [suggestions, setSuggestions] = useState<string[]>([
    "Summarize this video",
    "Quiz me",
    "Give an analogy",
  ]);
  const bottomRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth", block: "end" });
  }, [messages, busy]);

  async function send(text: string) {
    if (!text.trim() || busy) return;
    const next: Msg[] = [...messages, { role: "student", content: text }];
    setMessages(next);
    setInput("");
    setBusy(true);
    try {
      const res = await fetch("/api/tutor", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          bootcampId,
          videoId,
          timestampSec: getTimestamp?.(),
          history: next,
        }),
      });
      const data: { message?: string; suggestions?: string[]; error?: string } =
        await res.json();
      if (data.error) {
        setMessages([
          ...next,
          { role: "tutor", content: `Hmm — ${data.error}. Try again?` },
        ]);
      } else {
        setMessages([
          ...next,
          { role: "tutor", content: data.message ?? "I'm here. Try rephrasing?" },
        ]);
        if (data.suggestions) setSuggestions(data.suggestions);
      }
    } catch {
      setMessages([
        ...next,
        { role: "tutor", content: "Connection wobbled. Try again." },
      ]);
    } finally {
      setBusy(false);
    }
  }

  return (
    <aside className="flex flex-col rounded-2xl bg-white/70 backdrop-blur-2xl border border-white/60 shadow-glass overflow-hidden h-full min-h-[560px]">
      <header className="flex items-center gap-2 px-4 py-3 border-b border-brand-ink/5">
        <span className="grid place-items-center w-8 h-8 rounded-lg bg-brand-gradient text-white shadow-brand-glow">
          <Bot size={14} />
        </span>
        <div>
          <p className="font-display font-semibold text-sm text-brand-ink">
            AI Tutor
          </p>
          <p className="text-[10px] text-emerald-600">● lesson-aware</p>
        </div>
      </header>

      <div className="flex-1 overflow-y-auto px-4 py-3 space-y-3">
        {messages.map((m, i) => (
          <div
            key={i}
            className={clsx(
              "flex",
              m.role === "student" ? "justify-end" : "justify-start",
            )}
          >
            <div
              className={clsx(
                "max-w-[88%] rounded-2xl px-3.5 py-2.5 text-sm leading-relaxed",
                m.role === "student"
                  ? "bg-brand-primary text-white rounded-br-sm"
                  : "bg-white/70 text-brand-ink border border-brand-ink/5 rounded-bl-sm",
              )}
            >
              {m.content}
            </div>
          </div>
        ))}
        {busy && (
          <div className="flex justify-start">
            <div className="rounded-2xl bg-white/70 border border-brand-ink/5 px-3.5 py-2.5">
              <span className="inline-flex gap-1">
                <Dot delay="0s" />
                <Dot delay="0.15s" />
                <Dot delay="0.3s" />
              </span>
            </div>
          </div>
        )}
        <div ref={bottomRef} />
      </div>

      {suggestions.length > 0 && !busy && (
        <div className="px-4 pb-2 flex flex-wrap gap-1.5">
          {suggestions.slice(0, 3).map((s) => (
            <button
              key={s}
              onClick={() => send(s)}
              className="text-[11px] px-2.5 py-1 rounded-full bg-brand-primary/10 text-brand-primary border border-brand-primary/20 hover:bg-brand-primary hover:text-white transition"
            >
              {s}
            </button>
          ))}
        </div>
      )}

      <form
        onSubmit={(e) => {
          e.preventDefault();
          send(input);
        }}
        className="px-3 py-3 border-t border-brand-ink/5 flex items-center gap-2"
      >
        <input
          value={input}
          onChange={(e) => setInput(e.target.value)}
          placeholder="Ask about this lesson…"
          className="flex-1 bg-white/60 border border-brand-ink/10 rounded-xl px-3 py-2 text-sm text-brand-ink placeholder:text-brand-muted focus:outline-none focus:ring-2 focus:ring-brand-primary/30 focus:border-brand-primary"
        />
        <button
          type="submit"
          disabled={!input.trim() || busy}
          className="grid place-items-center w-9 h-9 rounded-xl bg-brand-gradient text-white shadow-brand-glow disabled:opacity-40 disabled:shadow-none transition"
        >
          <Send size={14} />
        </button>
      </form>
      <p className="px-4 pb-2 text-[10px] text-brand-muted">
        <Sparkles size={9} className="inline mr-1" />
        Tutor refuses skill-check answers + career advice.
      </p>
    </aside>
  );
}

function Dot({ delay }: { delay: string }) {
  return (
    <span
      className="w-1.5 h-1.5 rounded-full bg-brand-muted/60 animate-bounce"
      style={{ animationDelay: delay }}
    />
  );
}
