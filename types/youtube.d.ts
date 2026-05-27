/** Minimal YouTube IFrame API type declarations. */
declare namespace YT {
  interface PlayerOptions {
    height?: string | number;
    width?: string | number;
    videoId?: string;
    playerVars?: Record<string, string | number>;
    events?: {
      onReady?: (event: { target: Player }) => void;
      onStateChange?: (event: { data: number; target: Player }) => void;
      onError?: (event: { data: number }) => void;
    };
  }

  class Player {
    constructor(elementId: string | HTMLElement, options: PlayerOptions);
    destroy(): void;
    playVideo(): void;
    pauseVideo(): void;
    getVideoUrl(): string;
    getCurrentTime(): number;
    getDuration(): number;
  }
}

interface Window {
  YT?: typeof YT & { Player?: typeof YT.Player };
  onYouTubeIframeAPIReady?: (() => void) | null;
}
