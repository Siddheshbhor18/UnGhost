import {
  AbsoluteFill,
  useCurrentFrame,
  useVideoConfig,
  interpolate,
  spring,
  Easing,
} from "remotion";
import { Check, ShieldCheck, ScanLine } from "lucide-react";

/**
 * GradingComposition — a Remotion animation of the AI grading pass.
 *
 * Story (loops): the scenario answer types in; a focus reticle glides down it
 * line by line, lighting the reasoning it reads and streaming that signal into
 * the matching rubric dimension, whose pip meter fills; a top progress track
 * advances per dimension; the card then recedes into focus as a "Graded" state
 * resolves.
 *
 * Honest by construction (PRODUCT.md #1/#2): a "DEMO" tag, an illustrative
 * sample answer (no fake precise metrics), the real rubric dimensions, and
 * qualitative pip meters rather than invented numeric scores. Single brand
 * blue; type reads the page's own font CSS variables.
 */

export const GRADING_FPS = 30;
export const GRADING_DURATION = 320;
export const GRADING_W = 820;
export const GRADING_H = 600;

const BRAND = "#0191FC";
const BRAND_600 = "#017FE0";
const BRAND_300 = "#6DB6F9";
const INK = "#0A0A0A";
const SUB = "#3F3B36";
const MUTED = "#6B6660";
const BORDER = "rgba(10,10,10,0.08)";
const TRACK = "#E8E5DF";

const DISPLAY =
  'var(--font-display-brand, "Bricolage Grotesque"), var(--font-geist-sans, "Geist"), system-ui, sans-serif';
const SANS = 'var(--font-geist-sans, "Geist"), system-ui, sans-serif';

export const RUBRIC = [
  { label: "Depth", filled: 5 },
  { label: "Evidence", filled: 4 },
  { label: "Trade-offs", filled: 5 },
] as const;
const PIPS = 5;

type Seg = { t: string; h?: number };
const ANSWER: Seg[][] = [
  [{ t: "We chose a " }, { t: "queue-based design", h: 0 }, { t: " so writes" }],
  [{ t: "stay " }, { t: "idempotent under retries", h: 1 }, { t: ", and we" }],
  [{ t: "accept " }, { t: "a little latency for correctness", h: 2 }, { t: "." }],
  [{ t: "The team can trust what the numbers say." }],
];
const LINE_LENS = ANSWER.map((l) => l.reduce((n, s) => n + s.t.length, 0));
const TOTAL_CHARS = LINE_LENS.reduce((a, b) => a + b, 0);

// Frame at which the reticle reaches each highlighted line.
const HI = [88, 126, 164];

// Geometry (composition px)
const CARD = { x: 44, y: 106, w: 372, h: 358 } as const;
const CARD_PAD = 24;
const TEXT_TOP = CARD.y + 72;
const LINE_H = 40;
const RUB = { x: 452, y: 150, w: 324 } as const;
const ROW_H = 100;
const PROG = { x: 44, y: 84, w: 732 } as const;

export function GradingComposition() {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();

  const shell = interpolate(frame, [0, 18], [0, 1], {
    extrapolateRight: "clamp",
  });
  const gridIn = interpolate(frame, [6, 44], [0, 1], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
  });
  const cardSpring = spring({
    frame: Math.max(0, frame - 8),
    fps,
    config: { damping: 20, stiffness: 130 },
    durationInFrames: 32,
  });

  // Typewriter
  const typed = Math.floor(
    interpolate(frame, [18, 82], [0, TOTAL_CHARS], {
      extrapolateLeft: "clamp",
      extrapolateRight: "clamp",
    }),
  );
  const caretOn = frame < 88 && frame % 16 < 8;

  // Focus reticle glide
  const focusActive = frame >= 82 && frame <= 198;
  const reticleTop = interpolate(
    frame,
    [84, 124, 162, 196],
    [TEXT_TOP, TEXT_TOP + LINE_H, TEXT_TOP + 2 * LINE_H, TEXT_TOP + 3 * LINE_H],
    { extrapolateLeft: "clamp", extrapolateRight: "clamp" },
  );
  const reticleFade = interpolate(
    frame,
    [82, 92, 190, 200],
    [0, 1, 1, 0],
    { extrapolateLeft: "clamp", extrapolateRight: "clamp" },
  );

  const readIn = spring({
    frame: Math.max(0, frame - 200),
    fps,
    config: { damping: 13, stiffness: 200 },
    durationInFrames: 16,
  });

  // Overall analysis progress (per completed dimension)
  const doneCount =
    (frame >= HI[0] + 30 ? 1 : 0) +
    (frame >= HI[1] + 30 ? 1 : 0) +
    (frame >= HI[2] + 30 ? 1 : 0);

  const recede = interpolate(frame, [214, 248], [0, 1], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
    easing: Easing.inOut(Easing.ease),
  });
  const gradedIn = spring({
    frame: Math.max(0, frame - 224),
    fps,
    config: { damping: 15, stiffness: 150 },
    durationInFrames: 26,
  });
  const ringP = interpolate(frame, [224, 280], [0, 1], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
  });

  return (
    <AbsoluteFill style={{ backgroundColor: "#FFFFFF", fontFamily: SANS }}>
      <AbsoluteFill
        style={{
          background:
            "radial-gradient(60% 60% at 84% 2%, rgba(1,145,252,0.10), transparent 62%)",
        }}
      />
      <AbsoluteFill
        style={{
          opacity: gridIn * 0.5,
          backgroundImage:
            "radial-gradient(rgba(10,10,10,0.06) 1px, transparent 1px)",
          backgroundSize: "26px 26px",
          maskImage:
            "radial-gradient(85% 85% at 50% 42%, #000 40%, transparent 86%)",
          WebkitMaskImage:
            "radial-gradient(85% 85% at 50% 42%, #000 40%, transparent 86%)",
        }}
      />

      <AbsoluteFill style={{ opacity: shell }}>
        {/* Header */}
        <div
          style={{
            position: "absolute",
            top: 40,
            left: 44,
            display: "flex",
            alignItems: "center",
            gap: 10,
            fontFamily: DISPLAY,
            fontSize: 25,
            fontWeight: 800,
            letterSpacing: "-0.02em",
            color: INK,
          }}
        >
          <ScanLine size={21} color={BRAND} strokeWidth={2.4} />
          Grading in progress
        </div>
        <div
          style={{
            position: "absolute",
            top: 46,
            right: 44,
            fontSize: 13,
            fontWeight: 600,
            letterSpacing: "0.16em",
            textTransform: "uppercase",
            color: MUTED,
            opacity: 0.7,
          }}
        >
          Demo · illustrative
        </div>

        {/* Analysis progress track (3 segments) */}
        <div
          style={{
            position: "absolute",
            left: PROG.x,
            top: PROG.y,
            width: PROG.w,
            display: "flex",
            gap: 8,
          }}
        >
          {RUBRIC.map((_, i) => {
            const seg = spring({
              frame: Math.max(0, frame - (HI[i] + 18)),
              fps,
              config: { damping: 18, stiffness: 160 },
              durationInFrames: 20,
            });
            return (
              <div
                key={i}
                style={{
                  flex: 1,
                  height: 4,
                  borderRadius: 999,
                  background: TRACK,
                  overflow: "hidden",
                }}
              >
                <div
                  style={{
                    height: "100%",
                    width: `${seg * 100}%`,
                    borderRadius: 999,
                    background: `linear-gradient(90deg, ${BRAND}, ${BRAND_600})`,
                  }}
                />
              </div>
            );
          })}
        </div>

        {/* ── Answer card ── */}
        <div
          style={{
            position: "absolute",
            left: CARD.x,
            top: CARD.y,
            width: CARD.w,
            height: CARD.h,
            transform: `translateY(${interpolate(cardSpring, [0, 1], [18, 0])}px) scale(${1 - 0.035 * recede})`,
            transformOrigin: "center left",
            filter: `blur(${3 * recede}px)`,
            opacity: 1 - 0.3 * recede,
            background: "#FFFFFF",
            border: `1px solid ${BORDER}`,
            borderRadius: 20,
            boxShadow: "0 30px 70px -40px rgba(1,86,158,0.4)",
            overflow: "hidden",
          }}
        >
          <div
            style={{
              display: "flex",
              alignItems: "center",
              justifyContent: "space-between",
              padding: `${CARD_PAD}px ${CARD_PAD}px 0`,
            }}
          >
            <span style={{ fontFamily: DISPLAY, fontSize: 16, fontWeight: 700, color: INK }}>
              Scenario answer
            </span>
            <span
              style={{
                width: 26,
                height: 26,
                borderRadius: 999,
                background: BRAND,
                display: "grid",
                placeItems: "center",
                transform: `scale(${interpolate(readIn, [0, 1], [0.5, 1])})`,
                opacity: readIn,
              }}
            >
              <Check size={15} color="#fff" strokeWidth={3} />
            </span>
          </div>

          {/* answer text (typewriter + highlight) */}
          <div
            style={{
              padding: `16px ${CARD_PAD}px`,
              fontFamily: SANS,
              fontSize: 15.5,
              lineHeight: `${LINE_H}px`,
              color: SUB,
            }}
          >
            {ANSWER.map((line, j) => {
              const before = LINE_LENS.slice(0, j).reduce((a, b) => a + b, 0);
              const rev = Math.max(0, Math.min(LINE_LENS[j], typed - before));
              const typingHere =
                typed > before && typed < before + LINE_LENS[j] && frame < 88;
              let acc = 0;
              return (
                <div key={j} style={{ minHeight: LINE_H }}>
                  {line.map((seg, k) => {
                    const start = acc;
                    acc += seg.t.length;
                    const shown = seg.t.slice(0, Math.max(0, Math.min(seg.t.length, rev - start)));
                    if (seg.h === undefined) return <span key={k}>{shown}</span>;
                    const a = interpolate(frame, [HI[seg.h], HI[seg.h] + 12], [0, 1], {
                      extrapolateLeft: "clamp",
                      extrapolateRight: "clamp",
                    });
                    return (
                      <span
                        key={k}
                        style={{
                          background: `rgba(1,145,252,${0.16 * a})`,
                          borderRadius: 4,
                          padding: "1px 3px",
                          boxShadow: `inset 0 -2px 0 rgba(1,145,252,${0.9 * a})`,
                          color: a > 0.5 ? BRAND_600 : SUB,
                          fontWeight: a > 0.5 ? 600 : 400,
                        }}
                      >
                        {shown}
                      </span>
                    );
                  })}
                  {typingHere && (
                    <span
                      style={{
                        display: "inline-block",
                        width: 2,
                        height: 17,
                        marginLeft: 1,
                        transform: "translateY(3px)",
                        background: BRAND,
                        opacity: caretOn ? 1 : 0.15,
                      }}
                    />
                  )}
                </div>
              );
            })}
          </div>

          {/* focus reticle — corner brackets gliding line to line */}
          {focusActive &&
            ([
              { l: CARD_PAD - 6, t: 0, rx: false, ry: false },
              { l: CARD.w - CARD_PAD - 12, t: 0, rx: true, ry: false },
              { l: CARD_PAD - 6, t: LINE_H - 20, rx: false, ry: true },
              { l: CARD.w - CARD_PAD - 12, t: LINE_H - 20, rx: true, ry: true },
            ]).map((c, ci) => (
              <div
                key={ci}
                style={{
                  position: "absolute",
                  left: c.l,
                  top: reticleTop - CARD.y - 6 + c.t,
                  width: 18,
                  height: 18,
                  opacity: reticleFade,
                  borderTop: c.ry ? "none" : `2px solid ${BRAND}`,
                  borderBottom: c.ry ? `2px solid ${BRAND}` : "none",
                  borderLeft: c.rx ? "none" : `2px solid ${BRAND}`,
                  borderRight: c.rx ? `2px solid ${BRAND}` : "none",
                  borderRadius: 3,
                }}
              />
            ))}
        </div>

        {/* ── Data-flow particle streams (highlight -> rubric) ── */}
        {HI.map((hiFrame, i) =>
          Array.from({ length: 6 }).map((_, k) => {
            const p = (frame - (hiFrame + 2 + k * 3)) / 30;
            if (p < 0 || p > 1) return null;
            const e = Easing.out(Easing.cubic)(p);
            const sx = CARD.x + CARD.w - 28;
            const sy = TEXT_TOP + i * LINE_H + 8;
            const tx = RUB.x + 8;
            const ty = RUB.y + i * ROW_H + 40;
            const x = sx + (tx - sx) * e;
            const y = sy + (ty - sy) * e - Math.sin(e * Math.PI) * 20;
            const size = 6 - k * 0.5;
            return (
              <div
                key={`${i}-${k}`}
                style={{
                  position: "absolute",
                  left: x,
                  top: y,
                  width: size,
                  height: size,
                  borderRadius: 999,
                  background: k % 2 ? BRAND_300 : BRAND,
                  boxShadow: `0 0 9px 1px rgba(1,145,252,${0.6 - k * 0.06})`,
                  opacity: Math.sin(p * Math.PI),
                }}
              />
            );
          }),
        )}

        {/* ── Rubric ── */}
        <div style={{ position: "absolute", left: RUB.x, top: RUB.y, width: RUB.w }}>
          {RUBRIC.map((row, i) => {
            const appear = spring({
              frame: Math.max(0, frame - (54 + i * 12)),
              fps,
              config: { damping: 20, stiffness: 130 },
              durationInFrames: 26,
            });
            const flash = interpolate(frame, [HI[i] + 26, HI[i] + 40], [0.5, 0], {
              extrapolateLeft: "clamp",
              extrapolateRight: "clamp",
            });
            let allDone = true;
            const pips = Array.from({ length: PIPS }).map((_, p) => {
              if (p >= row.filled) return 0;
              const v = spring({
                frame: Math.max(0, frame - (HI[i] + 16 + p * 5)),
                fps,
                config: { damping: 12, stiffness: 240 },
                durationInFrames: 12,
              });
              if (v < 0.9) allDone = false;
              return v;
            });
            return (
              <div
                key={row.label}
                style={{
                  marginBottom: ROW_H - 56,
                  opacity: appear,
                  transform: `translateY(${interpolate(appear, [0, 1], [14, 0])}px)`,
                }}
              >
                <div
                  style={{
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "space-between",
                    marginBottom: 11,
                  }}
                >
                  <span style={{ fontFamily: DISPLAY, fontSize: 19, fontWeight: 700, color: INK }}>
                    {row.label}
                  </span>
                  <span
                    style={{
                      width: 22,
                      height: 22,
                      borderRadius: 999,
                      background: allDone ? BRAND : "transparent",
                      border: allDone ? "none" : `2px solid ${TRACK}`,
                      display: "grid",
                      placeItems: "center",
                      boxShadow: allDone
                        ? `0 0 0 ${6 * flash}px rgba(1,145,252,${flash})`
                        : "none",
                    }}
                  >
                    {allDone && <Check size={13} color="#fff" strokeWidth={3} />}
                  </span>
                </div>
                <div style={{ display: "flex", gap: 6 }}>
                  {pips.map((v, p) => (
                    <div
                      key={p}
                      style={{
                        flex: 1,
                        height: 9,
                        borderRadius: 3,
                        background: TRACK,
                        overflow: "hidden",
                      }}
                    >
                      <div
                        style={{
                          height: "100%",
                          width: `${Math.max(0, Math.min(1, v)) * 100}%`,
                          borderRadius: 3,
                          background: `linear-gradient(90deg, ${BRAND}, ${BRAND_600})`,
                        }}
                      />
                    </div>
                  ))}
                </div>
              </div>
            );
          })}
        </div>

        {/* ── Graded resolution ── */}
        <div
          style={{
            position: "absolute",
            left: 44,
            bottom: 36,
            display: "flex",
            alignItems: "center",
            gap: 14,
            transform: `translateY(${interpolate(gradedIn, [0, 1], [16, 0])}px)`,
            opacity: gradedIn,
          }}
        >
          <span style={{ position: "relative", display: "inline-flex" }}>
            <span
              style={{
                position: "absolute",
                inset: -6,
                borderRadius: 999,
                border: `2px solid ${BRAND}`,
                opacity: (1 - ringP) * 0.7,
                transform: `scale(${interpolate(ringP, [0, 1], [0.7, 1.7])})`,
              }}
            />
            <span
              style={{
                display: "inline-flex",
                alignItems: "center",
                gap: 8,
                background: BRAND,
                color: "#fff",
                fontFamily: DISPLAY,
                fontWeight: 700,
                fontSize: 16,
                padding: "9px 17px",
                borderRadius: 999,
              }}
            >
              <ShieldCheck size={16} color="#fff" strokeWidth={2.5} />
              Graded
            </span>
          </span>
          <span style={{ fontFamily: SANS, fontSize: 15, color: MUTED }}>
            {doneCount === 3
              ? "Score and notes shared with the recruiter."
              : "Reading your reasoning\u2026"}
          </span>
        </div>
      </AbsoluteFill>
    </AbsoluteFill>
  );
}
