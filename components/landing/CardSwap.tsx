"use client";

/**
 * CardSwap — adapted from React Bits' CardSwap component.
 * GSAP-powered card cycling animation: the front card drops out, the rest
 * promote forward, and the dropped card returns to the back of the deck.
 *
 * TypeScript adaptation for Next.js — original source:
 * https://reactbits.dev/components/card-swap
 *
 * @see BootcampCardStack.tsx for the landing-page integration.
 */

import React, {
  Children,
  cloneElement,
  forwardRef,
  isValidElement,
  useEffect,
  useMemo,
  useRef,
} from "react";
import gsap from "gsap";
import "./CardSwap.css";

/* ─── Card child component ────────────────────────────────────────────── */

interface CardProps extends React.HTMLAttributes<HTMLDivElement> {
  customClass?: string;
}

export const Card = forwardRef<HTMLDivElement, CardProps>(
  ({ customClass, className, ...rest }, ref) => (
    <div
      ref={ref}
      {...rest}
      className={`card ${customClass ?? ""} ${className ?? ""}`.trim()}
    />
  ),
);
Card.displayName = "Card";

/* ─── Geometry helpers ────────────────────────────────────────────────── */

interface Slot {
  x: number;
  y: number;
  z: number;
  zIndex: number;
}

function makeSlot(
  i: number,
  distX: number,
  distY: number,
  total: number,
): Slot {
  return {
    x: i * distX,
    y: -i * distY,
    z: -i * distX * 1.5,
    zIndex: total - i,
  };
}

function placeNow(el: HTMLElement, slot: Slot, skew: number): void {
  gsap.set(el, {
    x: slot.x,
    y: slot.y,
    z: slot.z,
    xPercent: -50,
    yPercent: -50,
    skewY: skew,
    transformOrigin: "center center",
    zIndex: slot.zIndex,
    force3D: true,
  });
}

/* ─── Easing presets ──────────────────────────────────────────────────── */

interface AnimConfig {
  ease: string;
  durDrop: number;
  durMove: number;
  durReturn: number;
  promoteOverlap: number;
  returnDelay: number;
}

const LINEAR_CONFIG: AnimConfig = {
  ease: "power2.inOut",
  durDrop: 0.8,
  durMove: 0.8,
  durReturn: 0.8,
  promoteOverlap: 0.5,
  returnDelay: 0.2,
};

/* ─── CardSwap container ──────────────────────────────────────────────── */

interface CardSwapProps {
  /** Width of each card. */
  width?: number | string;
  /** Height of each card. */
  height?: number | string;
  /** X-axis spacing between stacked cards. */
  cardDistance?: number;
  /** Y-axis spacing between stacked cards. */
  verticalDistance?: number;
  /** Milliseconds between automatic swaps. */
  delay?: number;
  /** Pause the cycle on hover. */
  pauseOnHover?: boolean;
  /** Click handler — receives the card's index. */
  onCardClick?: (idx: number) => void;
  /** Skew angle applied to the deck. */
  skewAmount?: number;
  /** Animation flavour. */
  easing?: "linear";
  children: React.ReactNode;
}

export default function CardSwap({
  width = 500,
  height = 400,
  cardDistance = 60,
  verticalDistance = 70,
  delay = 5000,
  pauseOnHover = false,
  onCardClick,
  skewAmount = 6,
  easing = "linear",
  children,
}: CardSwapProps) {
  const config: AnimConfig = useMemo(() => {
    // Scale animation durations down for shorter delays (e.g. 1s delay -> ~0.4s anim)
    const scale = Math.min(1, delay / 3000);
    const baseDur = 0.8 * scale;
    return {
      ease: "power2.inOut",
      durDrop: baseDur,
      durMove: baseDur,
      durReturn: baseDur,
      promoteOverlap: 0.5,
      returnDelay: 0.2,
    };
  }, [easing, delay]);

  const childArr = useMemo(() => Children.toArray(children), [children]);
  const refs = useMemo(
    () => childArr.map(() => React.createRef<HTMLDivElement>()),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [childArr.length],
  );

  const order = useRef<number[]>(
    Array.from({ length: childArr.length }, (_, i) => i),
  );
  const tlRef = useRef<gsap.core.Timeline | null>(null);
  const intervalRef = useRef<ReturnType<typeof setInterval>>();
  const container = useRef<HTMLDivElement>(null);
  const hovered = useRef(false);

  useEffect(() => {
    const total = refs.length;

    // Position every card by its CURRENT slot in `order` (front = slot 0).
    // Used for the initial layout AND to re-sync after the tab regains focus.
    const place = () => {
      order.current.forEach((refIdx, slotPos) => {
        const el = refs[refIdx].current;
        if (el) {
          placeNow(
            el,
            makeSlot(slotPos, cardDistance, verticalDistance, total),
            skewAmount,
          );
        }
      });
    };

    place();

    const swap = () => {
      // Never advance while the tab is backgrounded. GSAP's rAF ticker is
      // frozen there, so rotating `order` and spawning timelines would pile up
      // and all fire at once on return — the cards visibly jump, then snap
      // back on the next tick. Bailing here (plus the visibility handler
      // below) keeps the deck in a clean state across tab switches.
      if (document.hidden || order.current.length < 2) return;

      // Drop any timeline still in flight before starting a new one so tweens
      // can't stack up and fight each other.
      tlRef.current?.kill();

      const [front, ...rest] = order.current;
      // Update order immediately so subsequent ticks get correct front card
      order.current = [...rest, front];

      const elFront = refs[front].current;
      if (!elFront) return;

      const tl = gsap.timeline();
      tlRef.current = tl;

      // Drop the front card out of view
      tl.to(elFront, {
        y: "+=500",
        duration: config.durDrop,
        ease: config.ease,
      });

      // Promote remaining cards forward
      tl.addLabel(
        "promote",
        `-=${config.durDrop * config.promoteOverlap}`,
      );
      rest.forEach((idx, i) => {
        const el = refs[idx].current;
        if (!el) return;
        const slot = makeSlot(i, cardDistance, verticalDistance, refs.length);
        tl.set(el, { zIndex: slot.zIndex }, "promote");
        tl.to(
          el,
          {
            x: slot.x,
            y: slot.y,
            z: slot.z,
            duration: config.durMove,
            ease: config.ease,
          },
          `promote+=${i * 0.1}`,
        );
      });

      // Return the dropped card to the back of the deck
      const backSlot = makeSlot(
        refs.length - 1,
        cardDistance,
        verticalDistance,
        refs.length,
      );
      tl.addLabel(
        "return",
        `promote+=${config.durMove * config.returnDelay}`,
      );
      tl.call(
        () => gsap.set(elFront, { zIndex: backSlot.zIndex }),
        undefined,
        "return",
      );
      tl.to(
        elFront,
        {
          x: backSlot.x,
          y: backSlot.y,
          z: backSlot.z,
          duration: config.durReturn,
          ease: config.ease,
        },
        "return",
      );
    };

    // Do not swap immediately to let the user view the first card
    intervalRef.current = setInterval(swap, delay);

    const node = container.current;

    const pause = () => {
      hovered.current = true;
      tlRef.current?.pause();
      clearInterval(intervalRef.current);
    };
    const resume = () => {
      hovered.current = false;
      if (document.hidden) return;
      tlRef.current?.play();
      clearInterval(intervalRef.current);
      intervalRef.current = setInterval(swap, delay);
    };

    // Tab visibility sync. On hide: stop cycling + freeze the current tween.
    // On show: kill anything mid-flight, snap the whole deck back to its
    // canonical layout, then resume cycling — unless the cursor is still
    // resting on the deck, in which case pauseOnHover keeps it stopped.
    const onVisibility = () => {
      if (document.hidden) {
        clearInterval(intervalRef.current);
        tlRef.current?.pause();
      } else {
        tlRef.current?.kill();
        tlRef.current = null;
        place();
        clearInterval(intervalRef.current);
        if (!(pauseOnHover && hovered.current)) {
          intervalRef.current = setInterval(swap, delay);
        }
      }
    };
    document.addEventListener("visibilitychange", onVisibility);

    if (pauseOnHover && node) {
      node.addEventListener("mouseenter", pause);
      node.addEventListener("mouseleave", resume);
    }

    return () => {
      clearInterval(intervalRef.current);
      document.removeEventListener("visibilitychange", onVisibility);
      if (pauseOnHover && node) {
        node.removeEventListener("mouseenter", pause);
        node.removeEventListener("mouseleave", resume);
      }
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [cardDistance, verticalDistance, delay, pauseOnHover, skewAmount, easing]);

  const rendered = childArr.map((child, i) =>
    isValidElement(child)
      ? cloneElement(child as React.ReactElement<Record<string, unknown>>, {
          key: i,
          ref: refs[i],
          style: {
            width,
            height,
            ...((child.props as Record<string, unknown>).style as Record<string, unknown> ?? {}),
          },
          onClick: (e: React.MouseEvent) => {
            const childOnClick = (child.props as Record<string, unknown>).onClick as
              | ((e: React.MouseEvent) => void)
              | undefined;
            childOnClick?.(e);
            onCardClick?.(i);
          },
        })
      : child,
  );

  return (
    <div
      ref={container}
      className="card-swap-container"
      style={{ width, height }}
    >
      {rendered}
    </div>
  );
}
