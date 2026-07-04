"use client";

/**
 * GuaranteeClock — the landing page's centerpiece, rebuilt as the thing the
 * copy actually promises: a public clock.
 *
 * Left  = the narrative + an interactive window selector (24/48/72h).
 * Right = a live countdown card. Picking a window drives a depleting brand-blue
 *         dial whose hh:mm:ss ticks by the second, so the SLA-or-slot-returned
 *         mechanic is *shown*, not described (PRODUCT principle #1).
 *
 * Honest by construction: the role is a labeled example (no fake company /
 * candidate / stat), and brand-blue is the single accent — no traffic-light
 * tier colours. Motion is the one animation that earns its place here; under
 * prefers-reduced-motion the clock freezes fully legible and the dial is static.
 */

import { useEffect, useState } from "react";
import { useReducedMotion } from "framer-motion";
import { Undo2 } from "lucide-react";

type Tier = {
  hrs: string;
  label: string;
  totalH: number;
  // A believable mid-window position, so the dial is neither full nor empty.
  startH: number;
  startM: number;
  startS: number;
  desc: string;
};

const TIERS: Tier[] = [
  {
    hrs: "24h",
    label: "Priority",
    totalH: 24,
    startH: 18,
    startM: 24,
    startS: 6,
    desc: "Fast-track roles. A reply within a day, or the slot returns.",
  },
  {
    hrs: "48h",
    label: "Standard",
    totalH: 48,
    startH: 33,
    startM: 17,
    startS: 42,
    desc: "The default commitment. Two business days on a public clock.",
  },
  {
    hrs: "72h",
    label: "Extended",
    totalH: 72,
    startH: 58,
    startM: 3,
    startS: 19,
    desc: "High-volume roles. A longer window, the same hard rule at zero.",
  },
];

const startSeconds = (t: Tier) => t.startH * 3600 + t.startM * 60 + t.startS;

// Dial geometry (viewBox 0 0 200 200).
const R = 78;
const C = 2 * Math.PI * R;

function pad(n: number) {
  return String(n).padStart(2, "0");
}

function formatHMS(total: number) {
  const h = Math.floor(total / 3600);
  const m = Math.floor((total % 3600) / 60);
  const s = total % 60;
  return `${pad(h)}:${pad(m)}:${pad(s)}`;
}

export function GuaranteeClock() {
  const reduce = useReducedMotion();
  const [active, setActive] = useState(1); // 48h Standard is the default commitment
  const tier = TIERS[active];
  const [remaining, setRemaining] = useState(() => startSeconds(TIERS[1]));

  // Reset the clock whenever the recruiter "picks" a different window.
  useEffect(() => {
    setRemaining(startSeconds(TIERS[active]));
  }, [active]);

  // Live tick. The dial is a real clock; under reduced motion it stays still.
  useEffect(() => {
    if (reduce) return;
    const id = setInterval(
      () => setRemaining((r) => (r > 0 ? r - 1 : r)),
      1000,
    );
    return () => clearInterval(id);
  }, [reduce]);

  const total = tier.totalH * 3600;
  const frac = Math.max(0, Math.min(1, remaining / total));
  // Remaining draws as a clockwise arc from 12 o'clock; the head dot is its tip.
  const dashoffset = C * (1 - frac);
  const handAngle = frac * 360;
  const arcTransition = reduce
    ? "none"
    : "stroke-dashoffset 600ms cubic-bezier(0.16,1,0.3,1)";
  const handTransition = reduce
    ? "none"
    : "transform 600ms cubic-bezier(0.16,1,0.3,1)";

  return (
    <div className="grid items-center gap-12 lg:grid-cols-2 lg:gap-16">
      {/* ── Narrative + window selector ─────────────────────────────── */}
      <div>
        <h2 className="font-display text-display-lg font-extrabold tracking-tighter text-neutral-950">
          Reply, or your slot comes back.
        </h2>
        <p className="mt-4 max-w-prose text-body-md leading-relaxed text-neutral-900">
          Every recruiter picks a response window before a role goes live, and
          the clock is public. Miss it and the slot returns automatically. It
          won&apos;t count against the student&apos;s limit.
        </p>

        {/* Segmented window selector — drives the dial on the right. */}
        <div className="mt-8">
          <p className="mb-3 text-body-md font-medium text-neutral-900">
            Pick a window to watch the clock:
          </p>
          <div
            role="group"
            aria-label="Response window"
            className="clk-seg"
            data-active={active}
          >
            <span aria-hidden className="clk-seg-thumb" />
            {TIERS.map((t, i) => (
              <button
                key={t.hrs}
                type="button"
                aria-pressed={active === i}
                onClick={() => setActive(i)}
                className="clk-seg-btn"
              >
                <span className="clk-seg-hrs tnum">{t.hrs}</span>
                <span className="clk-seg-name">{t.label}</span>
              </button>
            ))}
          </div>

          {/* Active-tier description swaps in place. */}
          <p
            key={active}
            className="clk-desc mt-4 max-w-md text-body-sm leading-relaxed text-neutral-600"
          >
            {tier.desc}
          </p>
        </div>
      </div>

      {/* ── The live clock card ─────────────────────────────────────── */}
      <div className="relative">
        {/* Soft brand glow fills the cold negative space behind the card. */}
        <div
          aria-hidden
          className="pointer-events-none absolute -inset-6 -z-10 opacity-70"
          style={{
            background:
              "radial-gradient(60% 55% at 50% 40%, rgba(1,145,252,0.14), transparent 70%)",
          }}
        />

        <div className="mx-auto w-full max-w-md rounded-2xl bg-neutral-0 p-6 shadow-elev-4 ring-1 ring-neutral-200/80 sm:p-8">
          <p className="mb-4 text-[11px] font-medium uppercase tracking-wider text-neutral-900">
            Example scenario
          </p>

          {/* Status row */}
          <div className="flex items-center justify-between gap-3">
            <span className="flex items-center gap-2">
              <span className="clk-live" data-reduce={reduce ? "" : undefined}>
                <span className="clk-live-dot" />
              </span>
              <span className="text-body-sm font-semibold text-neutral-900">
                Frontend Engineer
              </span>
            </span>
            <span className="tnum rounded-full bg-brand-50 px-2.5 py-1 text-[12px] font-semibold tracking-tight text-brand-600">
              {tier.hrs} window
            </span>
          </div>

          {/* Dial */}
          <div className="relative mx-auto my-6 grid aspect-square w-full max-w-[260px] place-items-center">
            <svg
              viewBox="0 0 200 200"
              className="h-full w-full -rotate-90"
              aria-hidden
            >
              {/* Hour ticks — a real dial face. Coordinates are rounded so the
                  server and client render byte-identical strings (raw Math.sin
                  drifts in the last float digit between engines → hydration
                  mismatch). */}
              {Array.from({ length: 12 }).map((_, i) => {
                const a = (i * 30 * Math.PI) / 180;
                const quarter = i % 3 === 0;
                const r1 = quarter ? 90 : 92;
                const r2 = 96;
                const round = (n: number) => Math.round(n * 1000) / 1000;
                return (
                  <line
                    key={i}
                    x1={round(100 + r1 * Math.cos(a))}
                    y1={round(100 + r1 * Math.sin(a))}
                    x2={round(100 + r2 * Math.cos(a))}
                    y2={round(100 + r2 * Math.sin(a))}
                    stroke={quarter ? "#D4D0C8" : "#E8E5DF"}
                    strokeWidth={quarter ? 2.5 : 1.5}
                    strokeLinecap="round"
                  />
                );
              })}

              {/* Track */}
              <circle
                cx="100"
                cy="100"
                r={R}
                fill="none"
                stroke="#E8E5DF"
                strokeWidth="9"
              />
              {/* Remaining arc */}
              <circle
                cx="100"
                cy="100"
                r={R}
                fill="none"
                stroke="#0191FC"
                strokeWidth="9"
                strokeLinecap="round"
                strokeDasharray={C}
                strokeDashoffset={dashoffset}
                style={{
                  transition: arcTransition,
                  filter: "drop-shadow(0 0 6px rgba(1,145,252,0.45))",
                }}
              />
              {/* Leading "hand" dot, anchored to the arc tip (arc starts at
                  3 o'clock in SVG space; the dial's -90 rotation carries dot
                  and arc together). */}
              <g
                style={{
                  transform: `rotate(${handAngle}deg)`,
                  transformOrigin: "100px 100px",
                  transition: handTransition,
                }}
              >
                <circle cx={100 + R} cy="100" r="6" fill="#0191FC" />
                <circle cx={100 + R} cy="100" r="2.5" fill="#fff" />
              </g>
            </svg>

            {/* Center readout — an upright overlay, unaffected by the dial's
                rotation since it is a sibling, not an SVG child. */}
            <div className="absolute inset-0 grid place-items-center">
              <div className="text-center">
                <div
                  key={active}
                  className="clk-num tnum font-display text-[34px] font-extrabold leading-none tracking-tight text-neutral-950 sm:text-[38px]"
                >
                  {formatHMS(remaining)}
                </div>
                <div className="mt-2 text-[11px] font-semibold uppercase tracking-wider text-neutral-900">
                  remaining
                </div>
              </div>
            </div>
          </div>

          {/* Resolve rule */}
          <div className="flex items-center gap-2.5 border-t border-neutral-100 pt-4">
            <span className="grid h-7 w-7 shrink-0 place-items-center rounded-lg bg-brand-50 text-brand-600">
              <Undo2 size={15} />
            </span>
            <p className="text-body-sm leading-snug text-neutral-700">
              If it hits zero, the application slot returns.{" "}
              <span className="text-neutral-900">No charge.</span>
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
