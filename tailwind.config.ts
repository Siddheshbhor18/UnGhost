import type { Config } from "tailwindcss";

const config: Config = {
  content: [
    "./app/**/*.{ts,tsx}",
    "./components/**/*.{ts,tsx}",
    "./lib/**/*.{ts,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        bg: {
          base: "#0a0a0f",
          panel: "#15151f",
          elev: "#1d1d2b",
          ink: "#2a2a3d",
        },
        neon: {
          green: "#39ff14",
          pink: "#ff2e88",
          blue: "#00d9ff",
          yellow: "#fff200",
          red: "#ff003c",
          purple: "#b14aff",
          orange: "#ff8c1a",
        },
        ink: {
          primary: "#f5f5f7",
          muted: "#a0a0b8",
          dim: "#6b6b85",
        },
      },
      fontFamily: {
        pixel: ["var(--font-press-start)", "monospace"],
        mono: ["var(--font-jetbrains)", "ui-monospace", "monospace"],
        sans: ["var(--font-inter)", "system-ui", "sans-serif"],
      },
      boxShadow: {
        pixel: "4px 4px 0 0 #000",
        "pixel-sm": "2px 2px 0 0 #000",
        "pixel-lg": "6px 6px 0 0 #000",
        "pixel-neon-green": "4px 4px 0 0 #39ff14",
        "pixel-neon-pink": "4px 4px 0 0 #ff2e88",
        "pixel-neon-blue": "4px 4px 0 0 #00d9ff",
        glow: "0 0 24px 0 currentColor",
      },
      animation: {
        scanlines: "scanlines 8s linear infinite",
        flicker: "flicker 4s infinite",
        "pixel-pulse": "pixel-pulse 1.6s ease-in-out infinite",
        "laser-sweep": "laser-sweep 1.6s ease-in-out forwards",
        "rocket-launch": "rocket-launch 0.9s cubic-bezier(.5,-0.3,.6,1.4) forwards",
        "ticker": "ticker 30s linear infinite",
        "blink": "blink 1.1s steps(2) infinite",
      },
      keyframes: {
        scanlines: {
          "0%": { backgroundPosition: "0 0" },
          "100%": { backgroundPosition: "0 100%" },
        },
        flicker: {
          "0%, 18%, 22%, 25%, 53%, 57%, 100%": { opacity: "1" },
          "20%, 24%, 55%": { opacity: "0.85" },
        },
        "pixel-pulse": {
          "0%, 100%": { transform: "translate(0,0)", boxShadow: "4px 4px 0 0 currentColor" },
          "50%": { transform: "translate(-2px,-2px)", boxShadow: "6px 6px 0 0 currentColor" },
        },
        "laser-sweep": {
          "0%": { left: "-10%", opacity: "0" },
          "10%": { opacity: "1" },
          "90%": { opacity: "1" },
          "100%": { left: "110%", opacity: "0" },
        },
        "rocket-launch": {
          "0%": { transform: "translateY(0) rotate(0)", opacity: "1" },
          "60%": { transform: "translateY(-30vh) rotate(-6deg)", opacity: "1" },
          "100%": { transform: "translateY(-120vh) rotate(-12deg)", opacity: "0" },
        },
        ticker: {
          "0%": { transform: "translateX(0)" },
          "100%": { transform: "translateX(-50%)" },
        },
        blink: {
          "0%, 100%": { opacity: "1" },
          "50%": { opacity: "0" },
        },
      },
      backgroundImage: {
        "grid-arcade":
          "linear-gradient(rgba(0,217,255,.06) 1px,transparent 1px),linear-gradient(90deg,rgba(0,217,255,.06) 1px,transparent 1px)",
        "scanline-overlay":
          "repeating-linear-gradient(0deg,rgba(255,255,255,.03) 0,rgba(255,255,255,.03) 1px,transparent 1px,transparent 3px)",
      },
      backgroundSize: {
        grid: "32px 32px",
      },
    },
  },
  plugins: [],
};

export default config;
