"use client";

import { useCallback, useEffect, useRef, useState } from "react";

interface Props {
  sessionId: string;
}

const REFRESH_INTERVAL_MS = 50 * 60 * 1000; // 50 min (token valid 60 min)

export function CloudflarePlayer({ sessionId }: Props) {
  const [playbackUrl, setPlaybackUrl] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const fetchToken = useCallback(async () => {
    try {
      const res = await fetch(`/api/live/${sessionId}/playback-token`);
      if (!res.ok) {
        const data = (await res.json().catch(() => ({}))) as {
          error?: string;
        };
        if (data.error === "not_enrolled") {
          setError("You must be enrolled in this bootcamp to watch.");
          return;
        }
        throw new Error(data.error ?? `HTTP ${res.status}`);
      }
      const data = (await res.json()) as { playbackUrl: string };
      setPlaybackUrl(data.playbackUrl);
      setError(null);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to load stream");
    } finally {
      setLoading(false);
    }
  }, [sessionId]);

  useEffect(() => {
    void fetchToken();
    timerRef.current = setInterval(() => void fetchToken(), REFRESH_INTERVAL_MS);
    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
    };
  }, [fetchToken]);

  if (loading) {
    return (
      <div className="h-full w-full grid place-items-center bg-brand-ink/95">
        <div className="text-center text-white">
          <div className="mx-auto w-8 h-8 border-2 border-white/30 border-t-white rounded-full animate-spin mb-3" />
          <p className="text-sm opacity-80">Loading stream…</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="h-full w-full grid place-items-center bg-brand-ink/95 text-white text-center p-8">
        <div>
          <div className="mx-auto w-16 h-16 rounded-full bg-white/10 grid place-items-center mb-4">
            <span className="text-3xl">⚠</span>
          </div>
          <p className="text-sm opacity-90">{error}</p>
        </div>
      </div>
    );
  }

  if (!playbackUrl) return null;

  return (
    <iframe
      src={playbackUrl}
      title="Live stream"
      allow="autoplay; encrypted-media; picture-in-picture; fullscreen"
      allowFullScreen
      className="w-full h-full border-0"
    />
  );
}
