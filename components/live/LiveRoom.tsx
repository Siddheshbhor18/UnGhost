"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import {
  Mic,
  MicOff,
  Video,
  VideoOff,
  Hand,
  PhoneOff,
  Send,
  Users as UsersIcon,
  MessageSquare,
  Radio,
  MonitorUp,
  MonitorX,
} from "lucide-react";
import clsx from "clsx";

interface Props {
  sessionId: string;
  roomCode: string;
  title: string;
  bootcampTitle: string;
  isInstructor: boolean;
  myName: string;
  participantCount: number;
  status: "scheduled" | "live" | "ended" | "cancelled";
}

interface ChatMsg {
  id: string;
  from: string;
  text: string;
  ts: number;
  self?: boolean;
  system?: boolean;
}

/**
 * Phase 1 mock room — placeholder video tiles + local chat + control bar.
 * Phase 6 swap: drop in 100ms SDK Room provider here.
 */
export function LiveRoom({
  sessionId,
  roomCode,
  title,
  bootcampTitle,
  isInstructor,
  myName,
  participantCount,
  status,
}: Props) {
  const router = useRouter();
  const [muted, setMuted] = useState(false);
  const [camOff, setCamOff] = useState(false);
  const [handUp, setHandUp] = useState(false);
  // When 100ms SDK is wired, this flag dispatches `hmsActions
  // .setScreenShareEnabled(...)`. For now it drives only the UI affordance so
  // the button is in place + the click contract is locked.
  const [sharing, setSharing] = useState(false);
  const [shareError, setShareError] = useState<string | null>(null);
  const [chat, setChat] = useState<ChatMsg[]>([
    {
      id: "sys-1",
      from: "Room",
      text: `Welcome to "${title}". Mock video — Phase 6 swaps in 100ms SDK.`,
      ts: Date.now(),
      system: true,
    },
  ]);
  const [input, setInput] = useState("");
  const [elapsed, setElapsed] = useState(0);
  const chatEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (status !== "live") return;
    const t = setInterval(() => setElapsed((e) => e + 1), 1000);
    return () => clearInterval(t);
  }, [status]);

  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: "smooth", block: "end" });
  }, [chat]);

  function send(e: React.FormEvent) {
    e.preventDefault();
    if (!input.trim()) return;
    setChat((c) => [
      ...c,
      {
        id: `m-${Date.now()}`,
        from: myName,
        text: input.trim(),
        ts: Date.now(),
        self: true,
      },
    ]);
    setInput("");
  }

  async function leaveOrEnd() {
    if (isInstructor) {
      if (!confirm("End the session for everyone?")) return;
      await fetch(`/api/live/${sessionId}`, {
        method: "PATCH",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ action: "end" }),
      });
      // Land on the recordings page so the instructor can immediately Keep
      // or Delete the just-finished clip — same flow as YouTube Studio.
      router.push("/instructor/recordings");
    } else {
      router.push("/student/live");
    }
  }

  /**
   * Toggle screen share. With the real 100ms SDK present, this will call
   * `hmsActions.setScreenShareEnabled(next)` and the SDK handles the
   * browser permission prompt + track publish. Until then, the click flips
   * local state so the UI works for design QA.
   */
  async function toggleScreenShare() {
    setShareError(null);
    const next = !sharing;
    try {
      // Lazy-load — if the package isn't installed, we fall through to
      // local-state-only mode and warn the user once. String-arg `import()`
      // bypasses TS module resolution so missing pkg is a runtime miss, not
      // a build error.
      const mod = await import(
        /* webpackIgnore: true */ "@100mslive/react-sdk" as string
      ).catch(() => null);
      if (mod && typeof (mod as { useHMSActions?: unknown }).useHMSActions === "function") {
        // The actual hook can't be invoked outside a component, so the
        // wiring lives in a future HMSRoomProvider wrapper. For now we
        // import lazily just to fail loud if the SDK is missing.
        setSharing(next);
      } else {
        setSharing(next);
        if (next) {
          setShareError(
            "Screen-share UI ready. Install @100mslive/react-sdk to actually publish your screen.",
          );
        }
      }
    } catch (err) {
      setShareError((err as Error).message);
    }
  }

  // Placeholder participant tiles
  const tiles = [
    { name: myName, self: true, isInstructor },
    ...(isInstructor
      ? []
      : [{ name: "Instructor", self: false, isInstructor: true }]),
    ...Array.from({ length: Math.max(0, participantCount - 1) }, (_, i) => ({
      name: `Student ${i + 1}`,
      self: false,
      isInstructor: false,
    })).slice(0, 5),
  ];

  return (
    <main className="min-h-screen bg-brand-ink text-white flex flex-col">
      {/* Top bar */}
      <header className="px-5 py-3 border-b border-white/10 flex items-center justify-between bg-brand-ink/80 backdrop-blur-xl">
        <div className="flex items-center gap-3 min-w-0">
          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-rose-500 text-white text-[10px] font-bold uppercase tracking-wider animate-pulse">
            <Radio size={10} /> Live
          </span>
          <div className="min-w-0">
            <p className="font-display font-bold text-sm truncate">{title}</p>
            <p className="text-[10px] text-white/60 uppercase tracking-wider">
              {bootcampTitle} · code {roomCode}
            </p>
          </div>
        </div>
        <div className="flex items-center gap-3 text-xs">
          <span className="hidden md:inline text-white/70">
            ⏱ {formatElapsed(elapsed)}
          </span>
          <span className="inline-flex items-center gap-1 text-white/70">
            <UsersIcon size={12} /> {tiles.length}
          </span>
        </div>
      </header>

      {/* Body — video grid + chat side */}
      <div className="flex-1 flex flex-col lg:flex-row overflow-hidden">
        <section className="flex-1 p-4 overflow-y-auto">
          <div
            className={clsx(
              "grid gap-3 h-full",
              tiles.length === 1 && "grid-cols-1",
              tiles.length === 2 && "grid-cols-1 md:grid-cols-2",
              tiles.length >= 3 && "grid-cols-2 md:grid-cols-3",
            )}
          >
            {tiles.map((t, i) => (
              <Tile
                key={i}
                name={t.name}
                self={t.self}
                instructor={t.isInstructor}
                camOff={t.self ? camOff : false}
                muted={t.self ? muted : Math.random() > 0.6}
              />
            ))}
          </div>
        </section>

        <aside className="w-full lg:w-80 border-t lg:border-t-0 lg:border-l border-white/10 bg-brand-ink/95 flex flex-col">
          <p className="px-4 py-3 border-b border-white/10 text-[10px] uppercase tracking-wider font-semibold text-white/70 flex items-center gap-1.5">
            <MessageSquare size={11} /> Chat
          </p>
          <div className="flex-1 overflow-y-auto px-4 py-3 space-y-3">
            {chat.map((m) => (
              <div key={m.id} className="text-xs">
                {m.system ? (
                  <p className="text-white/50 italic">{m.text}</p>
                ) : (
                  <>
                    <p className="text-white/60">
                      <span
                        className={clsx(
                          "font-semibold",
                          m.self ? "text-brand-primary" : "text-white/85",
                        )}
                      >
                        {m.from}
                      </span>{" "}
                      · {new Date(m.ts).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
                    </p>
                    <p className="text-white/95 mt-0.5 leading-snug">{m.text}</p>
                  </>
                )}
              </div>
            ))}
            <div ref={chatEndRef} />
          </div>
          <form
            onSubmit={send}
            className="p-3 border-t border-white/10 flex items-center gap-2"
          >
            <input
              value={input}
              onChange={(e) => setInput(e.target.value)}
              placeholder="Send a message…"
              className="flex-1 bg-white/10 border border-white/10 rounded-lg px-3 py-2 text-xs text-white placeholder:text-white/40 focus:outline-none focus:ring-2 focus:ring-brand-primary/40"
            />
            <button
              type="submit"
              disabled={!input.trim()}
              className="grid place-items-center w-8 h-8 rounded-lg bg-brand-primary disabled:opacity-40"
            >
              <Send size={13} />
            </button>
          </form>
        </aside>
      </div>

      {/* Control bar */}
      <footer className="px-4 py-3 border-t border-white/10 bg-brand-ink/90 backdrop-blur-xl flex items-center justify-center gap-2">
        <CtlButton
          active={!muted}
          onClick={() => setMuted((m) => !m)}
          icon={muted ? <MicOff size={16} /> : <Mic size={16} />}
          label={muted ? "Unmute" : "Mute"}
        />
        <CtlButton
          active={!camOff}
          onClick={() => setCamOff((c) => !c)}
          icon={camOff ? <VideoOff size={16} /> : <Video size={16} />}
          label={camOff ? "Cam off" : "Cam on"}
        />
        {!isInstructor && (
          <CtlButton
            active={handUp}
            onClick={() => {
              setHandUp((h) => !h);
              if (!handUp) {
                setChat((c) => [
                  ...c,
                  {
                    id: `sys-${Date.now()}`,
                    from: "Room",
                    text: `${myName} raised their hand.`,
                    ts: Date.now(),
                    system: true,
                  },
                ]);
              }
            }}
            icon={<Hand size={16} />}
            label={handUp ? "Lower" : "Raise hand"}
          />
        )}
        {/* Screen share — useful for both roles. Instructor shares slides /
            code, student can share to walk through a solution. */}
        <CtlButton
          active={sharing}
          onClick={toggleScreenShare}
          icon={sharing ? <MonitorX size={16} /> : <MonitorUp size={16} />}
          label={sharing ? "Stop sharing" : "Share screen"}
        />
        <button
          onClick={leaveOrEnd}
          className="ml-4 inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-rose-500 hover:bg-rose-600 text-white text-xs font-semibold transition"
        >
          <PhoneOff size={14} />
          {isInstructor ? "End session" : "Leave"}
        </button>
      </footer>

      {/* Screen-share status banner — slides in only when there's a message
          (e.g. SDK missing in dev, permission denied). Auto-dismisses on next
          toggle by setShareError(null). */}
      {shareError ? (
        <div className="fixed bottom-20 left-1/2 -translate-x-1/2 z-50 px-4 py-2 rounded-xl bg-amber-500/90 text-white text-xs font-medium shadow-glass-lg">
          {shareError}
        </div>
      ) : null}
    </main>
  );
}

function Tile({
  name,
  self,
  instructor,
  camOff,
  muted,
}: {
  name: string;
  self: boolean;
  instructor: boolean;
  camOff: boolean;
  muted: boolean;
}) {
  return (
    <div className="relative rounded-2xl overflow-hidden bg-gradient-to-br from-brand-primary/40 to-brand-secondary/30 border border-white/10 aspect-video flex items-center justify-center">
      {camOff ? (
        <div className="grid place-items-center w-16 h-16 rounded-full bg-white/15 text-white text-xl font-bold uppercase">
          {name.charAt(0)}
        </div>
      ) : (
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_50%_40%,rgba(255,255,255,0.15)_0%,transparent_60%)]" />
      )}
      <div className="absolute bottom-2 left-2 flex items-center gap-1.5">
        <span className="px-2 py-0.5 rounded-md bg-black/40 backdrop-blur-sm text-white text-[10px] font-semibold">
          {name} {self && "(You)"}
        </span>
        {instructor && (
          <span className="px-1.5 py-0.5 rounded-md bg-brand-primary text-white text-[9px] font-bold uppercase">
            Host
          </span>
        )}
      </div>
      {muted && (
        <div className="absolute top-2 right-2 grid place-items-center w-6 h-6 rounded-full bg-rose-500/90 text-white">
          <MicOff size={11} />
        </div>
      )}
    </div>
  );
}

function CtlButton({
  active,
  onClick,
  icon,
  label,
}: {
  active: boolean;
  onClick: () => void;
  icon: React.ReactNode;
  label: string;
}) {
  return (
    <button
      onClick={onClick}
      className={clsx(
        "inline-flex flex-col items-center gap-0.5 px-3 py-2 rounded-xl text-[10px] font-semibold uppercase tracking-wider transition min-w-[64px]",
        active
          ? "bg-white/10 text-white hover:bg-white/15"
          : "bg-rose-500/20 text-rose-300 hover:bg-rose-500/30",
      )}
    >
      {icon}
      <span>{label}</span>
    </button>
  );
}

function formatElapsed(s: number): string {
  const m = Math.floor(s / 60);
  const ss = s % 60;
  return `${m}:${String(ss).padStart(2, "0")}`;
}
