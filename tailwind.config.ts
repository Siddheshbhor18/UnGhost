import type { Config } from "tailwindcss";

/**
 * unGhost design system — v2 (editorial).
 * Companion to docs/design-system.md and the design guide DOCX.
 * Old tokens (brand.primary, brand.ink, etc.) kept as aliases so legacy
 * components continue to render during the migration.
 */
const config: Config = {
  darkMode: "class",
  content: [
    "./app/**/*.{ts,tsx}",
    "./components/**/*.{ts,tsx}",
    "./lib/**/*.{ts,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        // ── BRAND (one colour, used with discipline) ──────────────
        brand: {
          50: "#E8F4FE",
          100: "#C5E2FD",
          200: "#9DCEFB",
          300: "#6DB6F9",
          400: "#36A0F7",
          500: "#0191FC",   // canonical brand
          600: "#017FE0",   // hover
          700: "#0168BD",   // pressed
          800: "#004F95",
          900: "#003D75",
          // Legacy aliases — keep so existing pages compile
          primary: "#0191FC",
          secondary: "#3454DA",
          ink: "#1A1816",   // remapped to neutral/900 (was cool blue)
          muted: "#6B6660", // remapped to neutral/500
          light: "#E8F4FE",
          dark: "#003D75",
          subtle: "#9C9690",
        },

        // ── NEUTRAL (warm-grey scale — 90% of every surface) ──────
        neutral: {
          0: "#FFFFFF",
          25: "#FCFCFB",
          50: "#F8F7F5",
          100: "#F2F0EC",
          200: "#E8E5DF",
          300: "#D4D0C8",
          400: "#9C9690",
          500: "#6B6660",
          700: "#3F3B36",
          900: "#1A1816",
          950: "#0A0A0A",
        },

        // ── SEMANTIC (state only, never decorative) ───────────────
        success: {
          DEFAULT: "#0E9F6E",
          light: "#E3F8EC",
        },
        warning: {
          DEFAULT: "#D97706",
          light: "#FFF4E6",
        },
        error: {
          DEFAULT: "#DC2626",
          light: "#FEE7E7",
        },
        info: {
          DEFAULT: "#0284C7",
          light: "#E0F2FE",
        },
        highlight: {
          DEFAULT: "#FCD34D",  // top-10, featured tag
        },

        // ── TIER BADGES (match quality, not state) ────────────────
        tier: {
          A: "#0F4C81",  // deep navy authority
          B: "#0191FC",  // brand blue confidence
          C: "#7A9CC6",  // soft blue-grey stretch
          D: "#FFFFFF",  // long-shot neutral
        },

        // Legacy arcade tokens (kept so old pages compile until removed)
        bg: { base: "#0a0a0f", panel: "#15151f", elev: "#1d1d2b", ink: "#2a2a3d" },
        neon: {
          green: "#39ff14", pink: "#ff2e88", blue: "#00d9ff",
          yellow: "#fff200", red: "#ff003c", purple: "#b14aff", orange: "#ff8c1a",
        },
        ink: { primary: "#f5f5f7", muted: "#a0a0b8", dim: "#6b6b85" },
      },

      // ── TYPOGRAPHY ──────────────────────────────────────────────
      fontFamily: {
        // Display: Bricolage Grotesque (Geist fallback)
        display: ["var(--font-display-brand)", "var(--font-geist-sans)", "system-ui", "sans-serif"],
        // Body / UI
        sans: ["var(--font-geist-sans)", "system-ui", "sans-serif"],
        // Code / data
        mono: ["var(--font-geist-mono)", "ui-monospace", "monospace"],
        // Legacy
        pixel: ["var(--font-press-start)", "monospace"],
      },
      fontSize: {
        // 8-step locked scale — desktop / mobile
        "display-2xl": ["72px", { lineHeight: "1.05", letterSpacing: "-0.02em", fontWeight: "800" }],
        "display-xl":  ["56px", { lineHeight: "1.10", letterSpacing: "-0.018em", fontWeight: "700" }],
        "display-lg":  ["40px", { lineHeight: "1.15", letterSpacing: "-0.015em", fontWeight: "700" }],
        "display-md":  ["32px", { lineHeight: "1.20", letterSpacing: "-0.012em", fontWeight: "600" }],
        "body-lg":     ["20px", { lineHeight: "1.50", letterSpacing: "0",        fontWeight: "400" }],
        "body-md":     ["16px", { lineHeight: "1.55", letterSpacing: "0",        fontWeight: "400" }],
        "body-sm":     ["14px", { lineHeight: "1.50", letterSpacing: "0",        fontWeight: "400" }],
        "body-xs":     ["12px", { lineHeight: "1.40", letterSpacing: "0.01em",   fontWeight: "500" }],
      },
      letterSpacing: {
        tightest: "-0.02em",
        tighter: "-0.015em",
        tight: "-0.01em",
        normal: "0",
        wide: "0.01em",
        wider: "0.03em",
        widest: "0.08em",
      },

      // ── SPACING (8px-base design scale exposed as semantic keys;
      //    we keep Tailwind's default numeric scale for backwards
      //    compatibility with existing pages, and add named aliases
      //    that map to the design-doc token names).
      // Doc token → Tailwind class:
      //   space/1 (4px)   → p-1 / gap-1
      //   space/2 (8px)   → p-2
      //   space/3 (12px)  → p-3
      //   space/4 (16px)  → p-4
      //   space/5 (24px)  → p-6
      //   space/6 (32px)  → p-8
      //   space/7 (48px)  → p-12
      //   space/8 (64px)  → p-16
      //   space/9 (96px)  → p-24
      //   space/10 (128px)→ p-32
      //   space/11 (160px)→ p-40
      spacing: {
        "space-1": "4px",
        "space-2": "8px",
        "space-3": "12px",
        "space-4": "16px",
        "space-5": "24px",
        "space-6": "32px",
        "space-7": "48px",
        "space-8": "64px",
        "space-9": "96px",
        "space-10": "128px",
        "space-11": "160px",
      },

      // ── BORDER RADIUS (8 tokens) ────────────────────────────────
      borderRadius: {
        none: "0",
        sm: "4px",
        md: "8px",
        lg: "12px",
        xl: "16px",
        "2xl": "20px",
        "3xl": "24px",
        full: "9999px",
      },

      // ── ELEVATION (compound shadows — tight + wide layered) ─────
      boxShadow: {
        "elev-0": "none",
        "elev-1":
          "0 1px 2px rgba(10,10,10,0.04), 0 1px 1px rgba(10,10,10,0.03)",
        "elev-2":
          "0 2px 4px rgba(10,10,10,0.04), 0 4px 8px rgba(10,10,10,0.04)",
        "elev-3":
          "0 4px 8px rgba(10,10,10,0.04), 0 12px 24px rgba(10,10,10,0.06)",
        "elev-4":
          "0 8px 16px rgba(10,10,10,0.04), 0 24px 48px rgba(10,10,10,0.08)",
        "elev-5":
          "0 12px 24px rgba(10,10,10,0.06), 0 32px 64px rgba(10,10,10,0.12)",
        "elev-6":
          "0 16px 32px rgba(10,10,10,0.08), 0 48px 96px rgba(10,10,10,0.16)",
        "focus-ring":
          "0 0 0 3px rgba(1,145,252,0.30)",
        "focus-ring-error":
          "0 0 0 3px rgba(220,38,38,0.30)",
        // Legacy aliases — to be removed
        glass: "0 8px 32px rgba(10,10,10,0.06)",
        "glass-lg": "0 24px 64px rgba(10,10,10,0.16)",
        "glass-hover": "0 12px 32px rgba(10,10,10,0.10)",
        "brand-glow": "0 0 32px rgba(1,145,252,0.30)",
        pixel: "4px 4px 0 0 #000",
        "pixel-sm": "2px 2px 0 0 #000",
        "pixel-lg": "6px 6px 0 0 #000",
        glow: "0 0 24px 0 currentColor",
      },

      backdropBlur: {
        xs: "2px",
        glass: "20px",
        "glass-heavy": "40px",
      },

      // ── MOTION ──────────────────────────────────────────────────
      transitionDuration: {
        instant: "100ms",
        fast: "200ms",
        base: "300ms",
        medium: "400ms",
        slow: "600ms",
        signature: "1200ms",
      },
      transitionTimingFunction: {
        "ease-out-soft":   "cubic-bezier(0.16, 1, 0.3, 1)",
        "ease-in-out-soft": "cubic-bezier(0.65, 0, 0.35, 1)",
        "ease-in-sharp":   "cubic-bezier(0.7, 0, 0.84, 0)",
        spring:            "cubic-bezier(0.68, -0.55, 0.265, 1.55)",
      },

      // ── ANIMATIONS ──────────────────────────────────────────────
      animation: {
        "fade-in": "fade-in 300ms cubic-bezier(0.16, 1, 0.3, 1) both",
        "fade-up": "fade-up 400ms cubic-bezier(0.16, 1, 0.3, 1) both",
        "fade-down": "fade-down 400ms cubic-bezier(0.16, 1, 0.3, 1) both",
        "scale-in": "scale-in 300ms cubic-bezier(0.16, 1, 0.3, 1) both",
        "slide-in-right": "slide-in-right 350ms cubic-bezier(0.16, 1, 0.3, 1) both",
        "slide-up-mobile": "slide-up-mobile 400ms cubic-bezier(0.16, 1, 0.3, 1) both",
        "shimmer": "shimmer 1400ms linear infinite",
        "float": "float 3s ease-in-out infinite",
        "pulse-soft": "pulse-soft 2s ease-in-out infinite",
        "shake": "shake 200ms ease-in-out",
        "blob-drift": "blob-drift 18s ease-in-out infinite",
        "blob-drift-slow": "blob-drift 28s ease-in-out infinite",
        scanlines: "scanlines 8s linear infinite",
        flicker: "flicker 4s infinite",
        "rocket-launch": "rocket-launch 0.9s cubic-bezier(.5,-0.3,.6,1.4) forwards",
        ticker: "ticker 30s linear infinite",
        blink: "blink 1.1s steps(2) infinite",
      },
      keyframes: {
        "fade-in": {
          "0%": { opacity: "0" },
          "100%": { opacity: "1" },
        },
        "fade-up": {
          "0%": { opacity: "0", transform: "translateY(12px)" },
          "100%": { opacity: "1", transform: "translateY(0)" },
        },
        "fade-down": {
          "0%": { opacity: "0", transform: "translateY(-12px)" },
          "100%": { opacity: "1", transform: "translateY(0)" },
        },
        "scale-in": {
          "0%": { opacity: "0", transform: "scale(0.96)" },
          "100%": { opacity: "1", transform: "scale(1)" },
        },
        "slide-in-right": {
          "0%": { opacity: "0", transform: "translateX(24px)" },
          "100%": { opacity: "1", transform: "translateX(0)" },
        },
        "slide-up-mobile": {
          "0%": { transform: "translateY(100%)" },
          "100%": { transform: "translateY(0)" },
        },
        shimmer: {
          "0%": { backgroundPosition: "-200% 0" },
          "100%": { backgroundPosition: "200% 0" },
        },
        float: {
          "0%, 100%": { transform: "translateY(0)" },
          "50%": { transform: "translateY(-4px)" },
        },
        "pulse-soft": {
          "0%, 100%": { opacity: "1" },
          "50%": { opacity: "0.6" },
        },
        shake: {
          "0%, 100%": { transform: "translateX(0)" },
          "25%": { transform: "translateX(-4px)" },
          "75%": { transform: "translateX(4px)" },
        },
        "blob-drift": {
          "0%, 100%": { transform: "translate(0,0) scale(1)" },
          "33%": { transform: "translate(40px,-30px) scale(1.08)" },
          "66%": { transform: "translate(-30px,20px) scale(0.95)" },
        },
        scanlines: {
          "0%": { backgroundPosition: "0 0" },
          "100%": { backgroundPosition: "0 100%" },
        },
        flicker: {
          "0%, 18%, 22%, 25%, 53%, 57%, 100%": { opacity: "1" },
          "20%, 24%, 55%": { opacity: "0.85" },
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

      // ── BACKGROUNDS ─────────────────────────────────────────────
      backgroundImage: {
        "brand-gradient": "linear-gradient(135deg, #0191FC 0%, #3454DA 100%)",
        "brand-soft": "linear-gradient(135deg, #E8F4FE 0%, #C5E2FD 100%)",
        "mesh-hero":
          "radial-gradient(800px 600px at 0% 0%, rgba(232,244,254,0.8), transparent 60%), radial-gradient(900px 600px at 100% 0%, rgba(245,236,255,0.6), transparent 60%), radial-gradient(900px 500px at 50% 100%, rgba(232,244,254,0.6), transparent 60%)",
        "shimmer-skeleton":
          "linear-gradient(90deg, transparent 0%, rgba(255,255,255,0.6) 50%, transparent 100%)",
        // Legacy
        "grid-arcade":
          "linear-gradient(rgba(0,217,255,.06) 1px,transparent 1px),linear-gradient(90deg,rgba(0,217,255,.06) 1px,transparent 1px)",
        "scanline-overlay":
          "repeating-linear-gradient(0deg,rgba(255,255,255,.03) 0,rgba(255,255,255,.03) 1px,transparent 1px,transparent 3px)",
      },
      backgroundSize: {
        grid: "32px 32px",
        shimmer: "200% 100%",
      },

      // ── CONTAINER ──────────────────────────────────────────────
      maxWidth: {
        "prose-narrow": "560px",   // forms
        "prose": "720px",          // editorial reading width
        "prose-wide": "920px",     // pull-quote breakout
        "content": "1280px",       // marketing pages
        "content-wide": "1440px",  // dense product pages (dashboards)
      },
    },
  },
  plugins: [],
};

export default config;
