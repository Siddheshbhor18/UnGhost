"use client";

import { useMemo } from "react";
import { Film, PlayCircle } from "lucide-react";

interface VideoPlayerProps {
  url?: string | null;
  posterUrl?: string;
  title?: string;
}

/**
 * Pulls an 11-char YouTube video ID out of any common YouTube URL shape:
 *  - https://www.youtube.com/watch?v=ID
 *  - https://youtu.be/ID
 *  - https://www.youtube.com/embed/ID
 *  - https://www.youtube-nocookie.com/embed/ID
 *  - https://www.youtube.com/shorts/ID
 * Returns null when the URL is not a YouTube URL we recognise.
 */
function extractYouTubeId(raw: string): string | null {
  try {
    const u = new URL(raw);
    const host = u.hostname.replace(/^www\./, "");
    if (host === "youtu.be") {
      const id = u.pathname.slice(1).split("/")[0];
      return /^[\w-]{11}$/.test(id) ? id : null;
    }
    if (
      host === "youtube.com" ||
      host === "m.youtube.com" ||
      host === "youtube-nocookie.com"
    ) {
      const v = u.searchParams.get("v");
      if (v && /^[\w-]{11}$/.test(v)) return v;
      // /embed/ID, /shorts/ID, /v/ID
      const parts = u.pathname.split("/").filter(Boolean);
      const idx = parts.findIndex((p) =>
        ["embed", "shorts", "v"].includes(p),
      );
      if (idx >= 0 && parts[idx + 1] && /^[\w-]{11}$/.test(parts[idx + 1])) {
        return parts[idx + 1];
      }
    }
    return null;
  } catch {
    return null;
  }
}

export function VideoPlayer({ url, posterUrl, title }: VideoPlayerProps) {
  const youtubeId = useMemo(
    () => (url ? extractYouTubeId(url) : null),
    [url],
  );

  // No source yet — show pending placeholder matching live-session pattern.
  if (!url) {
    return (
      <div className="relative aspect-video rounded-2xl overflow-hidden bg-brand-ink/95">
        <div className="absolute inset-0 grid place-items-center text-white text-center p-8">
          <div>
            <div className="mx-auto w-16 h-16 rounded-full bg-white/10 grid place-items-center mb-4">
              <Film size={28} className="text-white/80" />
            </div>
            <p className="text-[10px] uppercase tracking-widest font-semibold opacity-70 mb-1">
              Lesson uploaded soon
            </p>
            <h2 className="font-display font-bold text-xl mb-2">
              Recording will be posted here soon
            </h2>
            <p className="text-sm opacity-80 max-w-sm mx-auto">
              The instructor is still finalising this lesson&apos;s video.
              Check back shortly.
            </p>
          </div>
        </div>
      </div>
    );
  }

  if (youtubeId) {
    const src = `https://www.youtube-nocookie.com/embed/${youtubeId}?modestbranding=1&rel=0&controls=1&playsinline=1`;
    return (
      <div className="relative aspect-video rounded-2xl overflow-hidden bg-brand-ink/95">
        <iframe
          src={src}
          title={title ?? "Lesson video"}
          loading="lazy"
          allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
          allowFullScreen
          referrerPolicy="strict-origin-when-cross-origin"
          className="absolute inset-0 w-full h-full border-0"
        />
      </div>
    );
  }

  // HLS (.m3u8) plays natively on Safari + iOS, which covers most of the
  // Indian mobile audience. For Chrome/Firefox HLS in production, swap to
  // hls.js (mse-based) and feed the source through <video>.attachSource.
  const isHls = /\.m3u8(?:\?|$)/i.test(url);
  const inferredType = isHls
    ? "application/vnd.apple.mpegurl"
    : /\.mp4(?:\?|$)/i.test(url)
    ? "video/mp4"
    : /\.webm(?:\?|$)/i.test(url)
    ? "video/webm"
    : undefined;

  return (
    <div className="relative aspect-video rounded-2xl overflow-hidden bg-brand-ink/95">
      <video
        controls
        playsInline
        preload="metadata"
        poster={posterUrl || undefined}
        className="absolute inset-0 w-full h-full bg-brand-ink"
      >
        <source src={url} {...(inferredType ? { type: inferredType } : {})} />
        <div className="absolute inset-0 grid place-items-center text-white">
          <div className="text-center">
            <PlayCircle size={32} className="mx-auto mb-2 opacity-70" />
            <p className="text-sm opacity-80">
              Your browser can&apos;t play this format.
            </p>
            <a
              href={url}
              target="_blank"
              rel="noopener noreferrer"
              className="text-xs underline opacity-90"
            >
              Open in a new tab
            </a>
          </div>
        </div>
      </video>
    </div>
  );
}
