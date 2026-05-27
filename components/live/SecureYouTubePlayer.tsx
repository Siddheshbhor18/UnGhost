"use client";

/**
 * SecureYouTubePlayer — protected YouTube embed for bootcamp sessions.
 *
 * Security layers (all non-theater, actually effective):
 *   1. Video ID fetched from server at runtime — never in SSR HTML
 *   2. Server enforces enrollment check for paid sessions before returning ID
 *   3. Multi-position rotating watermark (email + UID) — deters screen recording
 *   4. Audit log on every video ID fetch (server-side)
 *   5. Custom fullscreen on container (watermark stays painted)
 *
 * Intentionally NOT included (security theater that hurts UX):
 *   - F12/right-click/keyboard blocking (trivially bypassed, annoys users)
 *   - Click-shield CSS overlays (break player controls)
 *   - fs:0 fullscreen disable (4hr lectures need fullscreen)
 */

import { useCallback, useEffect, useRef, useState } from "react";
import { AlertCircle, Expand, Loader2, Minimize, Lock } from "lucide-react";

interface Props {
  sessionId: string;
  userEmail: string;
  userId: string;
  userName?: string;
  tier?: "free" | "paid";
}

/** Watermark position preset — cycles through these */
const WATERMARK_POSITIONS = [
  { top: "15%", left: "10%", rotate: -8 },
  { top: "60%", left: "55%", rotate: 12 },
  { top: "30%", left: "70%", rotate: -15 },
  { top: "75%", left: "15%", rotate: 6 },
  { top: "45%", left: "35%", rotate: -5 },
] as const;

/** Cycle interval for watermark position (ms) */
const WATERMARK_CYCLE_MS = 45_000;

export function SecureYouTubePlayer({
  sessionId,
  userEmail,
  userId,
  userName,
  tier = "free",
}: Props) {
  const containerRef = useRef<HTMLDivElement>(null);
  const playerRef = useRef<YT.Player | null>(null);
  const [videoId, setVideoId] = useState<string | undefined>(undefined);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [wmIndex, setWmIndex] = useState(0);

  // ── Fetch video ID from server (auth-gated) ──────────────────────
  useEffect(() => {
    let cancelled = false;

    async function fetchVideoId() {
      try {
        const res = await fetch(`/api/live/${sessionId}/video-token`, {
          credentials: "same-origin",
        });
        if (!res.ok) {
          const data = await res.json().catch(() => ({}));
          if (res.status === 403) {
            throw new Error(
              data.reason ?? "You don't have access to this session",
            );
          }
          if (res.status === 404) {
            throw new Error("Session not found or stream not ready");
          }
          throw new Error(data.error ?? "Failed to load video");
        }
        const { videoId: vid } = (await res.json()) as { videoId: string };
        if (!cancelled) {
          setVideoId(vid);
          setLoading(false);
        }
      } catch (e) {
        if (!cancelled) {
          setError(e instanceof Error ? e.message : "Failed to load video");
          setLoading(false);
        }
      }
    }

    void fetchVideoId();
    return () => {
      cancelled = true;
    };
  }, [sessionId]);

  // ── Load YouTube Iframe API ───────────────────────────────────────
  useEffect(() => {
    if (!videoId) return;

    // Only load script once
    if (!document.querySelector('script[src*="youtube.com/iframe_api"]')) {
      const tag = document.createElement("script");
      tag.src = "https://www.youtube.com/iframe_api";
      document.head.appendChild(tag);
    }

    function initPlayer() {
      if (playerRef.current) return;
      playerRef.current = new window.YT.Player("unhost-yt-player", {
        height: "100%",
        width: "100%",
        videoId,
        playerVars: {
          autoplay: 1,
          modestbranding: 1,
          rel: 0,
          controls: 1,
          fs: 1,
          playsinline: 1,
          iv_load_policy: 3, // hide annotations
          origin: window.location.origin,
        },
      });
    }

    if (window.YT?.Player) {
      initPlayer();
    } else {
      const prev = window.onYouTubeIframeAPIReady;
      window.onYouTubeIframeAPIReady = () => {
        prev?.();
        initPlayer();
      };
    }

    return () => {
      playerRef.current?.destroy?.();
      playerRef.current = null;
    };
  }, [videoId]);

  // ── Rotating watermark position ───────────────────────────────────
  useEffect(() => {
    const interval = setInterval(() => {
      setWmIndex((i) => (i + 1) % WATERMARK_POSITIONS.length);
    }, WATERMARK_CYCLE_MS);
    return () => clearInterval(interval);
  }, []);

  // ── Custom fullscreen (container, not iframe — watermark persists) ─
  const toggleFullscreen = useCallback(() => {
    const el = containerRef.current;
    if (!el) return;

    if (document.fullscreenElement) {
      document.exitFullscreen();
    } else {
      el.requestFullscreen().catch(() => {
        /* browser may block without user gesture */
      });
    }
  }, []);

  useEffect(() => {
    function onFsChange() {
      setIsFullscreen(!!document.fullscreenElement);
    }
    document.addEventListener("fullscreenchange", onFsChange);
    return () => document.removeEventListener("fullscreenchange", onFsChange);
  }, []);

  // ── Loading state ─────────────────────────────────────────────────
  if (loading) {
    return (
      <div className="h-full w-full grid place-items-center bg-neutral-950 text-white">
        <div className="text-center">
          <Loader2 size={28} className="mx-auto animate-spin mb-3 opacity-70" />
          <p className="text-sm opacity-70">Loading secure player…</p>
        </div>
      </div>
    );
  }

  // ── Error state ───────────────────────────────────────────────────
  if (error) {
    return (
      <div className="h-full w-full grid place-items-center bg-neutral-950 text-white p-8">
        <div className="text-center max-w-md">
          <div className="mx-auto w-14 h-14 rounded-full bg-rose-500/20 grid place-items-center mb-4">
            {tier === "paid" ? (
              <Lock size={24} className="text-rose-400" />
            ) : (
              <AlertCircle size={24} className="text-rose-400" />
            )}
          </div>
          <h3 className="font-display font-bold text-lg mb-2">
            {tier === "paid" ? "Access restricted" : "Stream unavailable"}
          </h3>
          <p className="text-sm opacity-80 leading-relaxed">{error}</p>
        </div>
      </div>
    );
  }

  const wmPos = WATERMARK_POSITIONS[wmIndex];
  const watermarkText = `${userEmail}\n${userId.slice(0, 8)}`;

  return (
    <div
      ref={containerRef}
      className="relative w-full h-full bg-black"
      style={{ isolation: "isolate" }}
    >
      {/* YouTube player renders here */}
      <div id="unhost-yt-player" className="w-full h-full" />

      {/* ── Watermark layer (multi-position, rotating) ───────────── */}
      {/* Primary watermark */}
      <div
        className="absolute pointer-events-none select-none z-20 transition-all duration-[2000ms] ease-in-out"
        style={{
          top: wmPos.top,
          left: wmPos.left,
          transform: `rotate(${wmPos.rotate}deg)`,
          opacity: 0.08,
          fontSize: "16px",
          fontWeight: 800,
          color: "#ffffff",
          textShadow: "0 0 4px rgba(0,0,0,0.5)",
          whiteSpace: "pre-line",
          lineHeight: 1.4,
          userSelect: "none",
        }}
      >
        {watermarkText}
      </div>

      {/* Secondary watermark (different position — harder to crop both) */}
      <div
        className="absolute pointer-events-none select-none z-20"
        style={{
          top: WATERMARK_POSITIONS[(wmIndex + 2) % WATERMARK_POSITIONS.length].top,
          left: WATERMARK_POSITIONS[(wmIndex + 2) % WATERMARK_POSITIONS.length].left,
          transform: `rotate(${WATERMARK_POSITIONS[(wmIndex + 2) % WATERMARK_POSITIONS.length].rotate + 180}deg)`,
          opacity: 0.05,
          fontSize: "13px",
          fontWeight: 700,
          color: "#ffffff",
          whiteSpace: "pre-line",
          lineHeight: 1.3,
          userSelect: "none",
        }}
      >
        {userEmail}
      </div>

      {/* Corner watermark (always visible, small) */}
      <div
        className="absolute bottom-2 left-2 pointer-events-none select-none z-20"
        style={{
          opacity: 0.06,
          fontSize: "10px",
          fontWeight: 600,
          color: "#ffffff",
          userSelect: "none",
        }}
      >
        {userName ?? userEmail.split("@")[0]} · {userId.slice(0, 8)}
      </div>

      {/* ── Custom fullscreen button ─────────────────────────────── */}
      <button
        onClick={toggleFullscreen}
        className="absolute top-3 right-3 z-30 w-9 h-9 rounded-lg bg-black/50 hover:bg-black/70 text-white grid place-items-center transition opacity-0 hover:opacity-100 focus:opacity-100 group-hover:opacity-100"
        aria-label={isFullscreen ? "Exit fullscreen" : "Enter fullscreen"}
        title={isFullscreen ? "Exit fullscreen" : "Enter fullscreen"}
      >
        {isFullscreen ? <Minimize size={16} /> : <Expand size={16} />}
      </button>
    </div>
  );
}
