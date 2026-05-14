"use client";

import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Bot, Send } from "lucide-react";

interface Msg {
  role: "student" | "coach";
  content: string;
}

export function AICoachPanel() {
  const [messages, setMessages] = useState<Msg[]>([
    {
      role: "coach",
      content:
        "I'm your AI Coach. Ask me what to apply for, how to bump your match %, or where things are on this site.",
    },
  ]);
  const [suggestions, setSuggestions] = useState<string[]>([
    "What should I apply for?",
    "Where do I find my missions?",
    "Explain SLAs",
  ]);
  const [input, setInput] = useState("");
  const [busy, setBusy] = useState(false);

  async function send(text: string) {
    if (!text.trim() || busy) return;
    const next: Msg[] = [...messages, { role: "student", content: text }];
    setMessages(next);
    setInput("");
    setBusy(true);
    const res = await fetch("/api/coach", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ history: next }),
    });
    const data = await res.json();
    setMessages([...next, { role: "coach", content: data.message }]);
    setSuggestions(data.suggestions ?? []);
    setBusy(false);
  }

  return (
    <div className="pixel-card flex h-full flex-col">
      <div className="flex items-center gap-2 border-b-2 border-bg-ink px-3 py-3">
        <Bot size={16} className="text-neon-green" />
        <span className="font-pixel text-[10px] text-neon-green">AI COACH</span>
        <span className="ml-auto font-mono text-[9px] text-ink-dim">ONLINE</span>
      </div>
      <div className="flex-1 overflow-y-auto p-3 space-y-3 max-h-[500px]">
        <AnimatePresence initial={false}>
          {messages.map((m, i) => (
            <motion.div
              key={i}
              initial={{ opacity: 0, y: 6 }}
              animate={{ opacity: 1, y: 0 }}
              className={`flex ${m.role === "student" ? "justify-end" : "justify-start"}`}
            >
              <div
                className={`max-w-[85%] border-2 px-3 py-2 font-mono text-xs leading-relaxed ${
                  m.role === "student"
                    ? "border-neon-pink bg-neon-pink/10 text-ink-primary"
                    : "border-neon-green bg-bg-base text-ink-primary"
                }`}
              >
                {m.content}
              </div>
            </motion.div>
          ))}
        </AnimatePresence>
        {busy && (
          <p className="font-mono text-xs text-neon-green cursor-blink">THINKING</p>
        )}
      </div>
      {suggestions.length > 0 && (
        <div className="border-t-2 border-bg-ink px-3 py-2 flex flex-wrap gap-1.5">
          {suggestions.map((s) => (
            <button
              key={s}
              onClick={() => void send(s)}
              className="font-mono text-[10px] border border-bg-ink text-ink-muted px-2 py-1 hover:border-neon-blue hover:text-neon-blue transition-colors"
            >
              {s}
            </button>
          ))}
        </div>
      )}
      <form
        onSubmit={(e) => { e.preventDefault(); void send(input); }}
        className="border-t-2 border-bg-ink p-2 flex gap-2"
      >
        <input
          className="pixel-input flex-1"
          placeholder="Ask the coach…"
          value={input}
          onChange={(e) => setInput(e.target.value)}
          disabled={busy}
        />
        <button
          type="submit"
          className="border-2 border-neon-green bg-neon-green text-black px-3 hover:bg-bg-base hover:text-neon-green transition-colors disabled:opacity-40"
          disabled={busy || !input.trim()}
        >
          <Send size={14} />
        </button>
      </form>
    </div>
  );
}
