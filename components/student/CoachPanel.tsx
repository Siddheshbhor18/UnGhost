"use client";

import { useState, useRef, useEffect } from "react";
import Link from "next/link";
import { Sparkles, Send, Maximize2, ChevronRight, Bot } from "lucide-react";
import clsx from "clsx";

interface Msg {
  role: "user" | "assistant";
  text: string;
}

const STARTER_PROMPTS = [
  "What's missing from my profile?",
  "Help me prep for my next interview.",
  "Which bootcamp closes the biggest gap?",
];

/**
 * Collapsible AI Coach side panel. Streams responses from /api/coach
 * (mocked echo for Phase 1). Real impl will use Claude with cross-session memory.
 */
export function CoachPanel({ studentFirstName }: { studentFirstName: string }) {
  const [open, setOpen] = useState(true);
  const [input, setInput] = useState("");
  const [busy, setBusy] = useState(false);
  const [messages, setMessages] = useState<Msg[]>([
    {
      role: "assistant",
      text: `Hey ${studentFirstName}. I'm your AI Coach. Career strategy, prep, drafting — ask anything. I remember our chats across sessions.`,
    },
  ]);
  const bottomRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth", block: "end" });
  }, [messages, busy]);

  async function send(text: string) {
    if (!text.trim() || busy) return;
    const next: Msg[] = [...messages, { role: "user", text }];
    setMessages(next);
    setInput("");
    setBusy(true);
    try {
      const res = await fetch("/api/coach", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          history: next.map((m) => ({ role: m.role, content: m.text })),
        }),
      });
      const data = await res.json();
      const replyText =
        typeof data === "string"
          ? data
          : data.text ??
            data.reply ??
            data.content ??
            "I'm still warming up — try again in a moment.";
      setMessages([...next, { role: "assistant", text: replyText }]);
    } catch {
      setMessages([
        ...next,
        {
          role: "assistant",
          text: "Connection wobbled. Try again.",
        },
      ]);
    } finally {
      setBusy(false);
    }
  }

  if (!open) {
    return (
      <button
        onClick={() => setOpen(true)}
        className="lg:sticky lg:top-24 w-full glass-panel !p-3 flex items-center justify-between gap-2 hover:shadow-glass-hover transition"
      >
        <span className="flex items-center gap-2">
          <span className="grid place-items-center w-8 h-8 rounded-lg bg-brand-gradient text-white shadow-brand-glow">
            <Bot size={14} />
          </span>
          <span className="font-display font-semibold text-sm text-brand-ink">
            AI Coach
          </span>
        </span>
        <ChevronRight size={14} className="text-brand-muted" />
      </button>
    );
  }

  return (
    <aside className="lg:sticky lg:top-24 flex flex-col rounded-2xl bg-white/70 backdrop-blur-2xl border border-white/60 shadow-glass overflow-hidden h-[520px]">
      <header className="flex items-center justify-between gap-2 px-4 py-3 border-b border-brand-ink/5">
        <div className="flex items-center gap-2">
          <span className="grid place-items-center w-8 h-8 rounded-lg bg-brand-gradient text-white shadow-brand-glow">
            <Sparkles size={14} />
          </span>
          <div>
            <p className="font-display font-semibold text-sm text-brand-ink">
              AI Coach
            </p>
            <p className="text-[10px] text-emerald-600">● online</p>
          </div>
        </div>
        <Link
          href="/student/coach"
          className="text-brand-muted hover:text-brand-ink transition"
          aria-label="Open full-screen"
        >
          <Maximize2 size={14} />
        </Link>
      </header>

      <div className="flex-1 overflow-y-auto px-4 py-3 space-y-3">
        {messages.map((m, i) => (
          <div
            key={i}
            className={clsx(
              "flex",
              m.role === "user" ? "justify-end" : "justify-start",
            )}
          >
            <div
              className={clsx(
                "max-w-[85%] rounded-2xl px-3.5 py-2.5 text-sm leading-relaxed",
                m.role === "user"
                  ? "bg-brand-primary text-white rounded-br-sm"
                  : "bg-white/70 text-brand-ink border border-brand-ink/5 rounded-bl-sm",
              )}
            >
              {m.text}
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

      {messages.length <= 1 && (
        <div className="px-4 pb-3 flex flex-wrap gap-1.5">
          {STARTER_PROMPTS.map((p) => (
            <button
              key={p}
              onClick={() => send(p)}
              className="text-[11px] px-2.5 py-1 rounded-full bg-brand-primary/10 text-brand-primary border border-brand-primary/20 hover:bg-brand-primary hover:text-white transition"
            >
              {p}
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
          placeholder="Ask me anything…"
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
        Free tier: 15 messages/day ·{" "}
        <Link href="/pricing" className="text-brand-primary underline">
          Upgrade
        </Link>
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
