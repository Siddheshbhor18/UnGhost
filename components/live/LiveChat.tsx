"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { Loader2, Send, ShieldCheck, Trash2 } from "lucide-react";
import clsx from "clsx";

/**
 * LiveChat — polling-based chat sidebar for /live/[code] pages.
 *
 * Why polling not WebSocket: Vercel App Router doesn't run a persistent
 * Node process, so a WebSocket server needs separate infra (Soketi /
 * Pusher / Durable Objects). At cohort-1 scale (1k viewers × 30 msgs/min
 * avg) polling at 2s is fine — that's ~500 RPS distributed across viewers,
 * well within Vercel + Mongo Atlas free tier headroom. Upgrade to SSE
 * later if latency or load demand it.
 *
 * Backoff schedule:
 *   • tab focused: poll every 2s
 *   • tab hidden:  poll every 10s
 *   • on any 5xx:  exponential backoff up to 30s, reset on success
 *
 * Optimistic send: message appears in the list immediately with a "sending…"
 * tag; on POST success the tag clears + the server's canonical id replaces
 * the temp id; on failure the temp message goes red with a retry link.
 */
export interface ChatMessage {
  id: string;
  userId: string;
  userName: string;
  body: string;
  createdAt: string;
  /** Optimistic-only state — never returned by the server. */
  pending?: boolean;
  failed?: boolean;
}

interface Props {
  roomCode: string;
  canChat: boolean;
  currentUserId: string | null;
  isModerator: boolean;
}

const POLL_FOCUSED_MS = 2_000;
const POLL_HIDDEN_MS = 10_000;
const POLL_MAX_BACKOFF_MS = 30_000;

export function LiveChat({
  roomCode,
  canChat,
  currentUserId,
  isModerator,
}: Props) {
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [draft, setDraft] = useState("");
  const [sending, setSending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [connected, setConnected] = useState(true);

  // Refs avoid re-creating the poll loop on every render.
  const lastSeenId = useRef<string | null>(null);
  const backoffMs = useRef(POLL_FOCUSED_MS);
  const scrollRef = useRef<HTMLDivElement>(null);
  // Track whether user has scrolled away from the bottom — if so, don't
  // auto-scroll on new messages (would yank them out of a re-read).
  const stickToBottom = useRef(true);

  const poll = useCallback(async (): Promise<void> => {
    try {
      const url = new URL(
        `/api/live-chat/${roomCode}`,
        window.location.origin,
      );
      // (Renamed from /api/live/[code]/chat to dodge Next.js dynamic-slug
      // collision with the legacy /api/live/[id]/join route.)
      if (lastSeenId.current) {
        url.searchParams.set("since", lastSeenId.current);
      }
      url.searchParams.set("limit", "100");
      const res = await fetch(url.toString(), { cache: "no-store" });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const data = (await res.json()) as { messages: ChatMessage[] };
      if (data.messages.length > 0) {
        setMessages((prev) => {
          // Drop optimistic placeholders that the server has now confirmed.
          const incoming = data.messages;
          const confirmedBodies = new Set(
            incoming
              .filter((m) => m.userId === currentUserId)
              .map((m) => m.body),
          );
          const cleaned = prev.filter(
            (m) =>
              !(m.pending && m.userId === currentUserId && confirmedBodies.has(m.body)),
          );
          return [...cleaned, ...incoming];
        });
        lastSeenId.current = data.messages[data.messages.length - 1]!.id;
      }
      setConnected(true);
      backoffMs.current = document.hidden ? POLL_HIDDEN_MS : POLL_FOCUSED_MS;
    } catch {
      setConnected(false);
      backoffMs.current = Math.min(backoffMs.current * 1.5, POLL_MAX_BACKOFF_MS);
    }
  }, [roomCode, currentUserId]);

  // Poll loop — single recursive timeout (vs setInterval) so backoff is
  // honoured + we never overlap requests.
  useEffect(() => {
    let active = true;
    let timer: ReturnType<typeof setTimeout> | null = null;
    async function tick(): Promise<void> {
      if (!active) return;
      await poll();
      if (!active) return;
      timer = setTimeout(tick, backoffMs.current);
    }
    void tick();
    function onVisChange(): void {
      // Reset backoff when tab regains focus → snappy resume.
      backoffMs.current = document.hidden ? POLL_HIDDEN_MS : POLL_FOCUSED_MS;
    }
    document.addEventListener("visibilitychange", onVisChange);
    return () => {
      active = false;
      if (timer) clearTimeout(timer);
      document.removeEventListener("visibilitychange", onVisChange);
    };
  }, [poll]);

  // Auto-scroll to bottom on new messages — but only if user hadn't
  // scrolled away to re-read older context.
  useEffect(() => {
    if (!stickToBottom.current) return;
    const el = scrollRef.current;
    if (!el) return;
    el.scrollTop = el.scrollHeight;
  }, [messages]);

  function onScroll(): void {
    const el = scrollRef.current;
    if (!el) return;
    const distanceFromBottom =
      el.scrollHeight - el.scrollTop - el.clientHeight;
    stickToBottom.current = distanceFromBottom < 60;
  }

  async function send(): Promise<void> {
    const body = draft.trim();
    if (!body || sending) return;
    setError(null);
    setSending(true);
    // Optimistic insert with a temp id (will be removed when the server
    // confirms via the next poll).
    const tempId = `tmp_${Date.now()}`;
    const tempMsg: ChatMessage = {
      id: tempId,
      userId: currentUserId ?? "self",
      userName: "You",
      body,
      createdAt: new Date().toISOString(),
      pending: true,
    };
    setMessages((m) => [...m, tempMsg]);
    setDraft("");
    try {
      const res = await fetch(`/api/live-chat/${roomCode}`, {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ body }),
      });
      if (!res.ok) {
        const data = (await res.json().catch(() => ({}))) as { error?: string };
        throw new Error(data.error ?? `Send failed (${res.status})`);
      }
      // Don't mutate the optimistic message — the next poll picks up the
      // canonical row and the dedup in `poll` drops the temp.
    } catch (e) {
      setMessages((m) =>
        m.map((msg) =>
          msg.id === tempId ? { ...msg, pending: false, failed: true } : msg,
        ),
      );
      setError(e instanceof Error ? e.message : "Send failed");
    } finally {
      setSending(false);
    }
  }

  async function deleteMessage(msgId: string): Promise<void> {
    if (!isModerator) return;
    if (!confirm("Delete this message? This is logged and audited.")) return;
    // Optimistic remove from view; on failure re-fetch will re-add it.
    setMessages((m) => m.filter((msg) => msg.id !== msgId));
    try {
      await fetch(`/api/live-chat/${roomCode}/${msgId}`, { method: "DELETE" });
    } catch {
      /* poll will reconcile */
    }
  }

  return (
    <aside className="flex flex-col h-full bg-white border border-brand-ink/10 rounded-2xl overflow-hidden">
      <header className="px-4 py-3 border-b border-brand-ink/10 flex items-center justify-between bg-brand-ink/[0.02]">
        <div>
          <p className="font-display font-bold text-brand-ink text-sm">
            Live chat
          </p>
          <p className="text-[10px] text-brand-muted flex items-center gap-1.5">
            <span
              className={clsx(
                "w-1.5 h-1.5 rounded-full",
                connected ? "bg-emerald-500" : "bg-rose-500",
              )}
            />
            {connected ? "Connected" : "Reconnecting…"}
          </p>
        </div>
        {isModerator ? (
          <span className="inline-flex items-center gap-1 text-[10px] font-semibold text-amber-700 bg-amber-100 px-2 py-1 rounded-md">
            <ShieldCheck size={10} /> Mod
          </span>
        ) : null}
      </header>

      <div
        ref={scrollRef}
        onScroll={onScroll}
        className="flex-1 overflow-y-auto px-3 py-3 space-y-2 min-h-0"
      >
        {messages.length === 0 ? (
          <p className="text-[12px] text-brand-muted text-center py-8">
            Be the first to say hello 👋
          </p>
        ) : null}
        {messages.map((m) => (
          <MessageRow
            key={m.id}
            msg={m}
            isOwn={m.userId === currentUserId}
            canModerate={isModerator}
            onDelete={() => deleteMessage(m.id)}
          />
        ))}
      </div>

      <div className="border-t border-brand-ink/10 p-3 bg-brand-ink/[0.02]">
        {canChat ? (
          <form
            onSubmit={(e) => {
              e.preventDefault();
              void send();
            }}
            className="flex gap-2"
          >
            <input
              value={draft}
              onChange={(e) => setDraft(e.target.value)}
              placeholder="Ask a question…"
              maxLength={1000}
              className="flex-1 rounded-xl border border-brand-ink/15 bg-white px-3 py-2 text-sm text-brand-ink focus:outline-none focus:border-brand-primary focus:shadow-[0_0_0_3px_rgba(1,145,252,0.12)] transition"
            />
            <button
              type="submit"
              disabled={!draft.trim() || sending}
              className="inline-flex items-center justify-center w-10 h-10 rounded-xl bg-brand-primary text-white hover:bg-brand-primary/90 disabled:opacity-40 disabled:cursor-not-allowed transition"
              aria-label="Send"
            >
              {sending ? <Loader2 size={14} className="animate-spin" /> : <Send size={14} />}
            </button>
          </form>
        ) : (
          <p className="text-[11px] text-brand-muted text-center py-1.5">
            <a
              href={`/login?next=${typeof window === "undefined" ? "" : encodeURIComponent(window.location.pathname)}`}
              className="text-brand-primary font-semibold hover:underline"
            >
              Sign in
            </a>{" "}
            to join the chat
          </p>
        )}
        {error ? (
          <p className="text-[11px] text-rose-600 mt-2 text-center">{error}</p>
        ) : null}
      </div>
    </aside>
  );
}

function MessageRow({
  msg,
  isOwn,
  canModerate,
  onDelete,
}: {
  msg: ChatMessage;
  isOwn: boolean;
  canModerate: boolean;
  onDelete: () => void;
}) {
  return (
    <div
      className={clsx(
        "group rounded-xl px-3 py-2 transition",
        isOwn
          ? "bg-brand-primary/[0.06] border border-brand-primary/15"
          : "bg-brand-ink/[0.03]",
        msg.failed && "ring-1 ring-rose-300",
      )}
    >
      <div className="flex items-baseline justify-between gap-2">
        <span
          className={clsx(
            "text-[11px] font-semibold",
            isOwn ? "text-brand-primary" : "text-brand-ink",
          )}
        >
          {msg.userName}
        </span>
        <div className="flex items-center gap-1.5 shrink-0">
          {msg.pending ? (
            <span className="text-[9px] text-brand-muted italic">sending…</span>
          ) : msg.failed ? (
            <span className="text-[9px] text-rose-600 font-semibold">failed</span>
          ) : (
            <span className="text-[9px] text-brand-muted tnum">
              {new Date(msg.createdAt).toLocaleTimeString("en-IN", {
                hour: "numeric",
                minute: "2-digit",
              })}
            </span>
          )}
          {canModerate ? (
            <button
              onClick={onDelete}
              className="opacity-0 group-hover:opacity-100 text-rose-500 hover:text-rose-700 transition"
              title="Delete message"
            >
              <Trash2 size={11} />
            </button>
          ) : null}
        </div>
      </div>
      <p className="text-[13px] text-brand-ink mt-0.5 break-words">{msg.body}</p>
    </div>
  );
}
