"use client";

/**
 * InstructorRoomPanel — instructor-only controls inside /live/[code].
 *
 *   • Paste YouTube URL/ID to wire up the stream (sets youtubeVideoId).
 *   • End session button. Optionally capture a recording URL on end.
 *
 * Render conditionally from the server page when the viewer is the
 * session's instructor. Hidden for students + viewers.
 */

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Loader2, Radio, StopCircle } from "lucide-react";

interface Props {
  sessionId: string;
  currentYoutubeVideoId?: string | null;
  status?: string;
}

export function InstructorRoomPanel({
  sessionId,
  currentYoutubeVideoId,
  status,
}: Props) {
  const router = useRouter();
  const [urlInput, setUrlInput] = useState(currentYoutubeVideoId ?? "");
  const [recordingInput, setRecordingInput] = useState("");
  const [busy, setBusy] = useState<null | "stream" | "end">(null);
  const [err, setErr] = useState<string | null>(null);

  const isEnded = status === "ended" || status === "cancelled";

  async function saveStream() {
    if (!urlInput.trim()) return;
    setBusy("stream");
    setErr(null);
    try {
      const res = await fetch(`/api/live/${sessionId}`, {
        method: "PATCH",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          action: "setStream",
          youtubeVideoId: urlInput.trim(),
        }),
      });
      const data = await res.json();
      if (!res.ok) {
        setErr(data.error ?? "Failed to set stream");
        return;
      }
      router.refresh();
    } finally {
      setBusy(null);
    }
  }

  async function endSession() {
    if (!confirm("End the session for everyone?")) return;
    setBusy("end");
    setErr(null);
    try {
      const res = await fetch(`/api/live/${sessionId}`, {
        method: "PATCH",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          action: "end",
          recordingUrl: recordingInput.trim() || undefined,
        }),
      });
      const data = await res.json();
      if (!res.ok) {
        setErr(data.error ?? "Failed to end");
        return;
      }
      router.refresh();
    } finally {
      setBusy(null);
    }
  }

  if (isEnded) return null;

  return (
    <div className="mb-3 rounded-2xl border border-amber-300/40 bg-amber-50/80 p-4">
      <p className="text-[10px] uppercase tracking-widest font-semibold text-amber-800 mb-2 inline-flex items-center gap-1.5">
        <Radio size={11} /> Instructor controls
      </p>

      <div className="grid sm:grid-cols-[1fr_auto] gap-2 items-start">
        <div>
          <label className="text-[11px] font-semibold text-amber-900 mb-1 block">
            YouTube Live URL or video ID
          </label>
          <input
            value={urlInput}
            onChange={(e) => setUrlInput(e.target.value)}
            placeholder="https://www.youtube.com/watch?v=… or 11-char ID"
            className="w-full rounded-lg border border-amber-300/60 bg-white px-3 py-2 text-sm font-mono"
          />
          <p className="text-[10px] text-amber-700 mt-1">
            Stream from YouTube Studio / OBS first, then paste the link here.
            Students see the embed immediately.
          </p>
        </div>
        <button
          onClick={saveStream}
          disabled={busy !== null || !urlInput.trim()}
          className="self-end inline-flex items-center gap-1.5 rounded-lg bg-amber-600 text-white px-4 py-2 text-sm font-semibold hover:bg-amber-700 disabled:opacity-50"
        >
          {busy === "stream" ? (
            <Loader2 size={13} className="animate-spin" />
          ) : null}
          {currentYoutubeVideoId ? "Update" : "Go live"}
        </button>
      </div>

      <div className="mt-4 pt-3 border-t border-amber-300/50">
        <label className="text-[11px] font-semibold text-amber-900 mb-1 block">
          Optional · recording URL (for after the session)
        </label>
        <div className="grid sm:grid-cols-[1fr_auto] gap-2 items-start">
          <input
            value={recordingInput}
            onChange={(e) => setRecordingInput(e.target.value)}
            placeholder="https://www.youtube.com/watch?v=… (defaults to live ID)"
            className="w-full rounded-lg border border-amber-300/60 bg-white px-3 py-2 text-sm font-mono"
          />
          <button
            onClick={endSession}
            disabled={busy !== null}
            className="inline-flex items-center gap-1.5 rounded-lg bg-rose-600 text-white px-4 py-2 text-sm font-semibold hover:bg-rose-700 disabled:opacity-50"
          >
            {busy === "end" ? (
              <Loader2 size={13} className="animate-spin" />
            ) : (
              <StopCircle size={13} />
            )}
            End session
          </button>
        </div>
      </div>

      {err ? (
        <p className="text-[12px] text-rose-700 mt-2 font-semibold">{err}</p>
      ) : null}
    </div>
  );
}
