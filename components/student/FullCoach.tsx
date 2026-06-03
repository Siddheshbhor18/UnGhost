"use client";

import { useState, useRef, useEffect } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import {
  Send,
  Sparkles,
  Paperclip,
  Heart,
  Target,
  Zap,
  Compass,
  Plus,
  Trash2,
  History,
} from "lucide-react";
import clsx from "clsx";
import type { AICoachConversation, CoachPersona } from "@/shared/types";

interface Msg {
  role: "user" | "assistant";
  text: string;
}

const STARTERS = [
  "Analyse my profile gaps",
  "Help me prep for a system design interview",
  "Compare my active applications",
  "Recommend a bootcamp",
  "Draft a follow-up message",
];

const PERSONAS: Array<{
  id: CoachPersona;
  label: string;
  icon: React.ReactNode;
  tagline: string;
}> = [
  { id: "balanced", label: "Balanced", icon: <Sparkles size={11} />, tagline: "Friendly + structured" },
  { id: "encouraging", label: "Encouraging", icon: <Heart size={11} />, tagline: "Warm, celebrates progress" },
  { id: "direct", label: "Direct", icon: <Zap size={11} />, tagline: "No fluff" },
  { id: "strategic", label: "Strategic", icon: <Compass size={11} />, tagline: "Long-term roadmaps" },
];

interface Props {
  studentFirstName: string;
  initialPersona?: CoachPersona;
  initialConversations?: AICoachConversation[];
}

export function FullCoach({
  studentFirstName,
  initialPersona = "balanced",
  initialConversations = [],
}: Props) {
  const [input, setInput] = useState("");
  const [busy, setBusy] = useState(false);
  const [persona, setPersona] = useState<CoachPersona>(initialPersona);
  const [conversations, setConversations] =
    useState<AICoachConversation[]>(initialConversations);
  const [activeId, setActiveId] = useState<string | undefined>(undefined);
  const [messages, setMessages] = useState<Msg[]>([
    {
      role: "assistant",
      text: `Hey ${studentFirstName}. Pick a starter below or ask me anything — career strategy, prep, drafting, gap analysis. I'll remember this for next time.`,
    },
  ]);
  const bottomRef = useRef<HTMLDivElement>(null);
  const router = useRouter();
  const searchParams = useSearchParams();

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth", block: "end" });
  }, [messages, busy]);

  // URL-param entry point: /student/coach?prompt=<text> auto-sends the prompt
  // on first mount. Used by:
  //   • the sidebar Quick Actions on /student/coach
  //   • deep-links from dashboard widgets + emails ("ask Coach about …")
  // The prompt is consumed once + the param is scrubbed from the URL so a
  // browser-back doesn't re-trigger the send.
  const hasAutosent = useRef(false);
  useEffect(() => {
    if (hasAutosent.current) return;
    const initialPrompt = searchParams?.get("prompt");
    if (!initialPrompt) return;
    hasAutosent.current = true;
    // Strip the param from the URL before firing so a refresh doesn't loop.
    router.replace("/student/coach", { scroll: false });
    // Defer to the next tick so initial messages state is mounted.
    void Promise.resolve().then(() => send(initialPrompt));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  async function loadConvo(id: string) {
    setActiveId(id);
    const res = await fetch(`/api/coach?id=${id}`);
    if (!res.ok) return;
    const convo = (await res.json()) as AICoachConversation;
    setMessages(
      convo.messages.map((m) => ({
        role: m.role === "student" ? "user" : "assistant",
        text: m.content,
      })),
    );
  }

  function startNew() {
    setActiveId(undefined);
    setMessages([
      {
        role: "assistant",
        text: `Fresh chat, ${studentFirstName}. What's on your mind?`,
      },
    ]);
  }

  async function changePersona(p: CoachPersona) {
    setPersona(p);
    await fetch("/api/coach", {
      method: "PATCH",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ persona: p }),
    });
  }

  async function removeConvo(id: string, e: React.MouseEvent) {
    e.stopPropagation();
    if (!confirm("Delete this chat?")) return;
    await fetch(`/api/coach?id=${id}`, { method: "DELETE" });
    setConversations((c) => c.filter((x) => x.id !== id));
    if (activeId === id) startNew();
  }

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
          conversationId: activeId,
          persona,
          history: next.map((m) => ({
            role: m.role === "user" ? "user" : "assistant",
            content: m.text,
          })),
        }),
      });
      const data = await res.json();
      const reply =
        typeof data === "string"
          ? data
          : data.message ?? data.text ?? data.reply ?? "Got it. Let me think more.";
      const newConvoId = data.conversationId as string | undefined;
      if (newConvoId && newConvoId !== activeId) {
        setActiveId(newConvoId);
        // Refresh conversation list
        const list = await fetch("/api/coach").then((r) => r.json());
        setConversations(list.conversations ?? []);
      }
      setMessages([...next, { role: "assistant", text: reply }]);
    } catch {
      setMessages([
        ...next,
        { role: "assistant", text: "Connection wobbled. Try again." },
      ]);
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="grid lg:grid-cols-[260px_1fr] gap-4 h-full">
      {/* Sidebar — conversations */}
      <aside className="space-y-3 lg:max-h-[calc(100vh-260px)] overflow-y-auto pr-1">
        <button
          onClick={startNew}
          className="btn-brand w-full justify-center text-sm"
        >
          <Plus size={14} /> New chat
        </button>

        {/* Persona switcher */}
        <div className="rounded-2xl bg-white/60 border border-white/60 p-3">
          <p className="text-[10px] uppercase tracking-wider text-brand-muted font-semibold mb-2">
            Coach voice
          </p>
          <div className="space-y-1">
            {PERSONAS.map((p) => (
              <button
                key={p.id}
                onClick={() => changePersona(p.id)}
                className={clsx(
                  "w-full flex items-center gap-2 px-2 py-1.5 rounded-lg text-xs transition",
                  persona === p.id
                    ? "bg-brand-primary text-white shadow-brand-glow"
                    : "text-brand-ink/85 hover:bg-brand-primary/5",
                )}
              >
                <span
                  className={clsx(
                    persona === p.id ? "text-white" : "text-brand-primary",
                  )}
                >
                  {p.icon}
                </span>
                <span className="font-semibold">{p.label}</span>
                <span
                  className={clsx(
                    "ml-auto text-[10px]",
                    persona === p.id
                      ? "text-white/80"
                      : "text-brand-muted",
                  )}
                >
                  {p.tagline}
                </span>
              </button>
            ))}
          </div>
        </div>

        <div>
          <p className="text-[10px] uppercase tracking-wider text-brand-muted font-semibold px-1 mb-2">
            Recent ({conversations.length})
          </p>
          {conversations.length === 0 ? (
            <p className="text-xs text-brand-muted px-1">
              No saved chats yet. Send a message to start one.
            </p>
          ) : (
            <div className="space-y-1.5">
              {conversations.map((c) => (
                <div
                  key={c.id}
                  onClick={() => loadConvo(c.id)}
                  className={clsx(
                    "group w-full text-left rounded-xl p-2.5 border cursor-pointer transition",
                    activeId === c.id
                      ? "bg-brand-primary/10 border-brand-primary/30"
                      : "bg-white/50 border-white/60 hover:bg-white/70",
                  )}
                >
                  <div className="flex items-start justify-between gap-2">
                    <div className="min-w-0 flex-1">
                      <p className="font-display text-xs font-semibold text-brand-ink line-clamp-1">
                        {c.title}
                      </p>
                      <p className="text-[10px] text-brand-muted line-clamp-1 mt-0.5">
                        {c.preview}
                      </p>
                      <p className="text-[9px] text-brand-muted/70 mt-1 flex items-center gap-1">
                        <History size={8} />
                        {timeAgo(c.updatedAt)}
                      </p>
                    </div>
                    <button
                      onClick={(e) => removeConvo(c.id, e)}
                      className="opacity-0 group-hover:opacity-100 text-rose-500 hover:text-rose-700 transition"
                      aria-label="Delete chat"
                    >
                      <Trash2 size={12} />
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </aside>

      {/* Chat panel */}
      <div className="flex flex-col rounded-3xl bg-white/70 backdrop-blur-2xl border border-white/60 shadow-glass overflow-hidden h-full min-h-[70vh]">
        <div className="px-5 py-3 border-b border-brand-ink/5 flex items-center gap-2 bg-white/50">
          <span className="grid place-items-center w-7 h-7 rounded-lg bg-brand-gradient text-white">
            {PERSONAS.find((p) => p.id === persona)?.icon}
          </span>
          <div className="min-w-0">
            <p className="text-xs font-semibold text-brand-ink">
              Voice: {PERSONAS.find((p) => p.id === persona)?.label}
            </p>
            <p className="text-[10px] text-brand-muted">
              {PERSONAS.find((p) => p.id === persona)?.tagline} · remembers across sessions
            </p>
          </div>
        </div>

        <div className="flex-1 overflow-y-auto px-6 py-5 space-y-4">
          {messages.map((m, i) => (
            <div
              key={i}
              className={clsx(
                "flex",
                m.role === "user" ? "justify-end" : "justify-start",
              )}
            >
              {m.role === "assistant" && (
                <div className="grid place-items-center w-9 h-9 rounded-xl bg-brand-gradient text-white shadow-brand-glow mr-3 shrink-0">
                  <Sparkles size={16} />
                </div>
              )}
              <div
                className={clsx(
                  "max-w-[78%] rounded-3xl px-4 py-3 text-sm leading-relaxed whitespace-pre-wrap",
                  m.role === "user"
                    ? "bg-brand-primary text-white rounded-br-md"
                    : "bg-white/80 text-brand-ink border border-brand-ink/5 rounded-bl-md",
                )}
              >
                {m.text}
              </div>
            </div>
          ))}
          {busy && (
            <div className="flex justify-start items-start">
              <div className="grid place-items-center w-9 h-9 rounded-xl bg-brand-gradient text-white shadow-brand-glow mr-3">
                <Sparkles size={16} />
              </div>
              <div className="rounded-3xl bg-white/80 border border-brand-ink/5 px-4 py-3">
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
          <div className="px-6 pb-4 flex flex-wrap gap-2">
            {STARTERS.map((p) => (
              <button
                key={p}
                onClick={() => send(p)}
                className="text-xs px-3 py-1.5 rounded-full bg-brand-primary/10 text-brand-primary border border-brand-primary/20 hover:bg-brand-primary hover:text-white transition flex items-center gap-1.5"
              >
                <Target size={10} /> {p}
              </button>
            ))}
          </div>
        )}

        <form
          onSubmit={(e) => {
            e.preventDefault();
            send(input);
          }}
          className="px-5 py-4 border-t border-brand-ink/5 bg-white/60 backdrop-blur-xl"
        >
          <div className="flex items-end gap-2">
            <button
              type="button"
              className="grid place-items-center w-10 h-10 rounded-xl bg-white/60 border border-brand-ink/10 text-brand-muted hover:text-brand-primary hover:border-brand-primary transition"
            >
              <Paperclip size={14} />
            </button>
            <textarea
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter" && !e.shiftKey) {
                  e.preventDefault();
                  send(input);
                }
              }}
              placeholder="Ask me anything…  (Enter to send · Shift+Enter for new line)"
              rows={1}
              className="flex-1 resize-none bg-white/60 border border-brand-ink/10 rounded-xl px-4 py-2.5 text-sm text-brand-ink placeholder:text-brand-muted focus:outline-none focus:ring-2 focus:ring-brand-primary/30 focus:border-brand-primary max-h-32"
            />
            <button
              type="submit"
              disabled={!input.trim() || busy}
              className="grid place-items-center w-10 h-10 rounded-xl bg-brand-gradient text-white shadow-brand-glow disabled:opacity-40 disabled:shadow-none transition"
            >
              <Send size={14} />
            </button>
          </div>
          <p className="text-[10px] text-brand-muted mt-2">
            Included with Premium · AI Coach cannot leak assessment answers or
            recruiter identities.
          </p>
        </form>
      </div>
    </div>
  );
}

function timeAgo(iso: string): string {
  const diff = Date.now() - new Date(iso).getTime();
  const m = Math.floor(diff / 60000);
  if (m < 1) return "just now";
  if (m < 60) return `${m}m ago`;
  const h = Math.floor(m / 60);
  if (h < 24) return `${h}h ago`;
  const d = Math.floor(h / 24);
  if (d < 7) return `${d}d ago`;
  return `${Math.floor(d / 7)}w ago`;
}

function Dot({ delay }: { delay: string }) {
  return (
    <span
      className="w-1.5 h-1.5 rounded-full bg-brand-muted/60 animate-bounce"
      style={{ animationDelay: delay }}
    />
  );
}
