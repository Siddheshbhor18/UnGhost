"use client";

import { useEffect, useRef, useState } from "react";
import { useSession } from "next-auth/react";
import {
  CheckCheck,
  Loader2,
  MessageCircle,
  Send,
  Sparkles,
} from "lucide-react";
import clsx from "clsx";
import { GlassButton } from "@/components/glass";
import type {
  Message,
  MessageThread as MessageThreadType,
} from "@/shared/types";

interface Props {
  /** Pre-fetched thread, or null for lazy load via applicationId/inmailId. */
  thread?: MessageThreadType | null;
  /** Application context to bootstrap (used by /student/applications/[id]). */
  applicationId?: string;
  /** InMail context to bootstrap (used after a student accepts an InMail). */
  inmailId?: string;
  /** Override role; otherwise derived from session. */
  selfRole?: "student" | "recruiter";
  /** Override self id; otherwise derived from session. */
  selfId?: string;
}

const POLL_MS = 6_000;

function timeOf(iso: string) {
  return new Date(iso).toLocaleTimeString("en-IN", {
    hour: "2-digit",
    minute: "2-digit",
  });
}

export function MessageThread({
  thread: initialThread,
  applicationId,
  inmailId,
  selfRole: roleOverride,
  selfId: idOverride,
}: Props) {
  const { data: session } = useSession();
  const selfRole: "student" | "recruiter" =
    roleOverride ??
    (session?.user?.role === "recruiter" ? "recruiter" : "student");
  const selfId = idOverride ?? session?.user?.id ?? "";
  const [thread, setThread] = useState<MessageThreadType | null>(
    initialThread ?? null,
  );
  const [messages, setMessages] = useState<Message[]>([]);
  const [bootstrapped, setBootstrapped] = useState(!!initialThread);
  const [input, setInput] = useState("");
  const [sending, setSending] = useState(false);
  const [drafting, setDrafting] = useState(false);
  const bottomRef = useRef<HTMLDivElement>(null);

  // ── Bootstrap: lazy-create thread on mount if not provided ──────
  useEffect(() => {
    if (bootstrapped) return;
    async function init() {
      const res = await fetch("/api/threads", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ applicationId, inmailId }),
      });
      if (!res.ok) return;
      const t: MessageThreadType = await res.json();
      setThread(t);
      setBootstrapped(true);
    }
    init();
  }, [applicationId, inmailId, bootstrapped]);

  // ── Initial fetch + polling ─────────────────────────────────────
  useEffect(() => {
    if (!thread) return;
    let cancelled = false;
    async function poll() {
      try {
        const since = messages.length
          ? messages[messages.length - 1].createdAt
          : undefined;
        const url = since
          ? `/api/threads/${thread!.id}/messages?since=${encodeURIComponent(since)}`
          : `/api/threads/${thread!.id}/messages`;
        const res = await fetch(url, { cache: "no-store" });
        if (!res.ok) return;
        const data: { thread: MessageThreadType; messages: Message[] } =
          await res.json();
        if (cancelled) return;
        if (data.messages.length > 0) {
          if (since) {
            setMessages((prev) => [...prev, ...data.messages]);
          } else {
            setMessages(data.messages);
          }
        } else if (!since) {
          setMessages([]);
        }
        setThread(data.thread);
      } catch {
        /* ignore */
      }
    }
    poll();
    const t = setInterval(poll, POLL_MS);
    return () => {
      cancelled = true;
      clearInterval(t);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [thread?.id]);

  // ── Scroll to bottom on new messages ────────────────────────────
  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth", block: "end" });
  }, [messages.length]);

  async function send() {
    if (!input.trim() || !thread || sending) return;
    setSending(true);
    const optimistic: Message = {
      id: `tmp_${Date.now()}`,
      threadId: thread.id,
      senderId: selfId,
      senderRole: selfRole,
      body: input.trim(),
      createdAt: new Date().toISOString(),
      readBy: [selfId],
    };
    setMessages((prev) => [...prev, optimistic]);
    const draft = input.trim();
    setInput("");
    try {
      const res = await fetch(`/api/threads/${thread.id}/messages`, {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ body: draft }),
      });
      if (res.ok) {
        const real: Message = await res.json();
        setMessages((prev) =>
          prev.map((m) => (m.id === optimistic.id ? real : m)),
        );
      } else {
        // Rollback on error
        setMessages((prev) => prev.filter((m) => m.id !== optimistic.id));
        setInput(draft);
      }
    } finally {
      setSending(false);
    }
  }

  async function aiDraft(intent?: string) {
    if (!thread || drafting) return;
    setDrafting(true);
    try {
      const res = await fetch(`/api/threads/draft`, {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ threadId: thread.id, intent }),
      });
      if (res.ok) {
        const data: { draft: string } = await res.json();
        setInput(data.draft);
      }
    } finally {
      setDrafting(false);
    }
  }

  if (!thread) {
    return (
      <div className="flex items-center justify-center py-10 text-brand-muted">
        <Loader2 size={18} className="animate-spin mr-2" />
        Opening chat…
      </div>
    );
  }

  const draftIntents =
    selfRole === "recruiter"
      ? ["schedule_interview", "decline", "follow_up"]
      : ["follow_up", "negotiate_offer"];

  return (
    <div className="flex flex-col h-[520px] rounded-2xl bg-white/70 backdrop-blur-2xl border border-white/60 shadow-glass overflow-hidden">
      <header className="px-4 py-3 border-b border-brand-ink/5 flex items-center gap-2">
        <div className="grid place-items-center w-8 h-8 rounded-lg bg-brand-gradient text-white shadow-brand-glow">
          <MessageCircle size={14} />
        </div>
        <div className="min-w-0 flex-1">
          <p className="font-display font-semibold text-sm text-brand-ink line-clamp-1">
            {thread.jobTitle ?? "Conversation"}
          </p>
          <p className="text-[10px] text-brand-muted">
            with {thread.companyName} ·{" "}
            <span className="text-emerald-600">● live</span>
          </p>
        </div>
      </header>

      {/* Messages */}
      <div className="flex-1 overflow-y-auto px-4 py-3 space-y-2.5">
        {messages.length === 0 ? (
          <div className="text-center py-10 text-sm text-brand-muted">
            Start the conversation — your first reply opens the thread on both
            sides.
          </div>
        ) : (
          messages.map((m, i) => {
            const isSelf = m.senderId === selfId;
            const prev = i > 0 ? messages[i - 1] : null;
            const showHeader = !prev || prev.senderId !== m.senderId;
            return (
              <div
                key={m.id}
                className={clsx(
                  "flex",
                  isSelf ? "justify-end" : "justify-start",
                )}
              >
                <div className={clsx("max-w-[85%]", isSelf && "text-right")}>
                  {showHeader && (
                    <p className="text-[10px] uppercase tracking-wider text-brand-muted mb-0.5 px-1">
                      {isSelf
                        ? "You"
                        : m.senderRole === "recruiter"
                        ? "Recruiter"
                        : "Candidate"}{" "}
                      · {timeOf(m.createdAt)}
                    </p>
                  )}
                  <div
                    className={clsx(
                      "rounded-2xl px-3.5 py-2.5 text-sm leading-relaxed whitespace-pre-wrap",
                      isSelf
                        ? "bg-brand-primary text-white rounded-br-sm"
                        : "bg-white/80 text-brand-ink border border-brand-ink/5 rounded-bl-sm",
                    )}
                  >
                    {m.body}
                  </div>
                  {isSelf && m.readBy.length > 1 && (
                    <p className="text-[10px] text-brand-muted mt-0.5 inline-flex items-center gap-0.5 px-1">
                      <CheckCheck
                        size={10}
                        className="text-brand-primary"
                      />{" "}
                      Read
                    </p>
                  )}
                </div>
              </div>
            );
          })
        )}
        <div ref={bottomRef} />
      </div>

      {/* AI draft chips */}
      <div className="px-3 pt-2 flex flex-wrap gap-1.5 border-t border-brand-ink/5">
        {draftIntents.map((i) => (
          <button
            key={i}
            onClick={() => aiDraft(i)}
            disabled={drafting}
            className="text-[11px] px-2.5 py-1 rounded-full bg-brand-primary/10 text-brand-primary border border-brand-primary/20 hover:bg-brand-primary hover:text-white transition disabled:opacity-50"
          >
            <Sparkles size={9} className="inline mr-1" />
            {i.replace(/_/g, " ")}
          </button>
        ))}
      </div>

      <form
        onSubmit={(e) => {
          e.preventDefault();
          send();
        }}
        className="px-3 py-3 border-t border-brand-ink/5 flex items-end gap-2"
      >
        <textarea
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter" && !e.shiftKey) {
              e.preventDefault();
              send();
            }
          }}
          rows={2}
          placeholder="Type your message… (Enter to send · Shift+Enter for newline)"
          className="flex-1 bg-white/60 border border-brand-ink/10 rounded-xl px-3 py-2 text-sm text-brand-ink resize-none focus:outline-none focus:ring-2 focus:ring-brand-primary/30 focus:border-brand-primary leading-relaxed"
        />
        <GlassButton
          type="submit"
          variant="brand"
          size="md"
          disabled={!input.trim() || sending}
        >
          {sending ? (
            <Loader2 size={14} className="animate-spin" />
          ) : (
            <Send size={14} />
          )}
        </GlassButton>
      </form>
    </div>
  );
}
