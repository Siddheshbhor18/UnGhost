"use client";

/**
 * InstructorsStory — the scroll-driven "meet the instructors" narrative shown
 * at /instructors.
 *
 * Structure:
 *   1. Void hero (black + brand-blue key light): headline copy on the left, a
 *      3D coverflow carousel of the instructors on the right.
 *   2. Three instructor panels that reveal on scroll (portrait first, then the
 *      copy staggers in). Panels alternate sides for rhythm; the first panel
 *      puts the portrait on the right, per the brief. On mobile every panel
 *      stacks portrait-over-copy.
 *   3. Featured-speaker spotlight (reuses <FeaturedSpeaker />, Abhinav Ranka).
 *   4. Final "Enroll now" CTA band.
 *
 * Motion is gated behind prefers-reduced-motion: reduced users get the fully
 * visible layout with no entrance animation (content is never hidden behind a
 * transition that might not fire). A portrait falls back to a monogram tile
 * when its `image` is null in shared/instructors.ts.
 */
import Image from "next/image";
import Link from "next/link";
import { motion, useReducedMotion, type Variants } from "framer-motion";
import { ArrowRight, Check, GraduationCap, ImageIcon } from "lucide-react";
import clsx from "clsx";
import { INSTRUCTORS, type Instructor } from "@/shared/instructors";
import { roomLabel } from "@/shared/rooms";
import { FeaturedSpeaker } from "@/components/landing/FeaturedSpeaker";
import { useEffect, useState } from "react";

/** Signup deep-link that lands the new user on the bootcamp catalog. */
const ENROLL_HREF = "/signup?next=/bootcamps";

const EASE_OUT: readonly [number, number, number, number] = [0.16, 1, 0.3, 1];

const PORTRAIT_REVEAL: Variants = {
  hidden: { opacity: 0, y: 36, scale: 0.96 },
  show: {
    opacity: 1,
    y: 0,
    scale: 1,
    transition: { duration: 0.8, ease: EASE_OUT },
  },
};

const COPY_CONTAINER: Variants = {
  hidden: {},
  show: { transition: { staggerChildren: 0.08, delayChildren: 0.18 } },
};

const COPY_ITEM: Variants = {
  hidden: { opacity: 0, y: 22 },
  show: { opacity: 1, y: 0, transition: { duration: 0.6, ease: EASE_OUT } },
};

/** Two-letter monogram from a full name (first + last initial). */
function initialsOf(name: string): string {
  const parts = name.trim().split(/\s+/);
  const first = parts[0]?.[0] ?? "";
  const last = parts.length > 1 ? (parts[parts.length - 1]?.[0] ?? "") : "";
  return (first + last).toUpperCase();
}

export function InstructorsStory(): React.ReactElement {
  const reduce = useReducedMotion() ?? false;

  return (
    <main className="relative min-h-[100dvh] bg-neutral-25">
      <InstructorsHero reduce={reduce} />

      <div>
        {INSTRUCTORS.map((instructor, index) => (
          <InstructorPanel
            key={instructor.id}
            instructor={instructor}
            index={index}
            reduce={reduce}
          />
        ))}
      </div>

      <FeaturedSpeakerSection reduce={reduce} />

      <EnrollBand reduce={reduce} />
    </main>
  );
}

/* ─── Hero ──────────────────────────────────────────────────────────────── */

function InstructorsHero({ reduce }: { reduce: boolean }): React.ReactElement {
  const initial = reduce ? "show" : "hidden";
  return (
    <section
      className="relative text-white"
      style={{
        background:
          "radial-gradient(ellipse 110% 75% at 50% -15%, rgba(1,145,252,0.18) 0%, rgba(1,145,252,0.05) 32%, transparent 55%), #000000",
      }}
    >
      <div className="mx-auto grid max-w-content items-center gap-10 px-4 pt-28 pb-16 md:pt-36 md:pb-24 lg:grid-cols-2 lg:gap-8">
        {/* Copy */}
        <motion.div
          variants={COPY_CONTAINER}
          initial={initial}
          animate="show"
          className="max-w-xl"
        >
          <motion.p
            variants={COPY_ITEM}
            className="text-body-sm font-semibold text-brand-300"
          >
            Meet your instructors
          </motion.p>
          <motion.h1
            variants={COPY_ITEM}
            className="mt-3 font-display text-display-xl font-extrabold tracking-tighter text-white text-balance"
          >
            Taught by people who&rsquo;ve{" "}
            <span className="text-brand-400">done the work.</span>
          </motion.h1>
          <motion.p
            variants={COPY_ITEM}
            className="mt-5 max-w-prose text-body-lg leading-relaxed text-neutral-300 text-pretty"
          >
            No academics reading slides. Every unGhost bootcamp is run by an
            operator who has shipped the thing they teach. Scroll to meet the
            three building your next skill, then enrol and start.
          </motion.p>
          <motion.div variants={COPY_ITEM} className="mt-8">
            <Link href={ENROLL_HREF} className="btn btn-primary btn-lg">
              Enroll now
              <ArrowRight size={16} />
            </Link>
          </motion.div>
        </motion.div>

        {/* Auto-cycling card deck of the instructors */}
        <motion.div
          initial={reduce ? { opacity: 1 } : { opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ duration: 0.8, ease: EASE_OUT, delay: reduce ? 0 : 0.35 }}
          className="relative h-[400px] overflow-hidden sm:h-[460px] lg:h-[520px]"
        >
          <InstructorDeck reduce={reduce} />
        </motion.div>
      </div>
    </section>
  );
}

/* ─── Hero card carousel (3D coverflow) ─────────────────────────────────── */

/** Dark-glass chrome shared by every carousel card. */
const DECK_CARD_STYLE: React.CSSProperties = {
  background: "#0B0F17",
  border: "1px solid rgba(255,255,255,0.12)",
  borderRadius: 16,
  padding: 0,
  overflow: "hidden",
  boxShadow: "0 30px 90px -24px rgba(0,0,0,0.85)",
};

const CARD_W = 264;
const CARD_H = 344;
const SIDE_X = 152; // horizontal push for the flanking cards
const SIDE_ROT = 34; // Y-rotation (deg) for the flanking cards
const CYCLE_MS = 3600;

/**
 * 3D coverflow: the active instructor sits centred and face-on; the other two
 * angle back on each side. Auto-advances (pauses on hover), and any card or dot
 * is clickable to bring it to the front. Reduced motion snaps instantly and
 * stops the auto-advance.
 */
function InstructorDeck({ reduce }: { reduce: boolean }): React.ReactElement {
  const count = INSTRUCTORS.length;
  const [active, setActive] = useState(0);
  const [paused, setPaused] = useState(false);

  useEffect(() => {
    if (reduce || paused) return;
    const timer = setInterval(
      () => setActive((a) => (a + 1) % count),
      CYCLE_MS,
    );
    return () => clearInterval(timer);
  }, [reduce, paused, count]);

  return (
    <div
      className="absolute inset-0 flex flex-col items-center justify-center gap-5"
      onMouseEnter={() => setPaused(true)}
      onMouseLeave={() => setPaused(false)}
    >
      <div
        className="relative w-full flex-1 origin-center scale-[0.6] sm:scale-75 lg:scale-100"
        style={{ perspective: 1200 }}
      >
        {INSTRUCTORS.map((instructor, i) => {
          const rel = (((i - active) % count) + count) % count;
          const isCenter = rel === 0;
          const side = rel === 1 ? 1 : rel === count - 1 ? -1 : 0;
          return (
            <motion.button
              type="button"
              key={instructor.id}
              onClick={() => setActive(i)}
              aria-label={`Show ${instructor.name}`}
              aria-current={isCenter}
              tabIndex={isCenter ? -1 : 0}
              className="absolute left-1/2 top-1/2 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-400 focus-visible:ring-offset-2 focus-visible:ring-offset-black"
              style={{
                width: CARD_W,
                height: CARD_H,
                marginLeft: -CARD_W / 2,
                marginTop: -CARD_H / 2,
                transformStyle: "preserve-3d",
                zIndex: isCenter ? 30 : 10,
                cursor: isCenter ? "default" : "pointer",
                ...DECK_CARD_STYLE,
              }}
              initial={false}
              animate={{
                x: side * SIDE_X,
                rotateY: -side * SIDE_ROT,
                scale: isCenter ? 1 : 0.82,
                opacity: isCenter ? 1 : 0.5,
              }}
              transition={reduce ? { duration: 0 } : { duration: 0.7, ease: EASE_OUT }}
            >
              <InstructorCardBody instructor={instructor} />
            </motion.button>
          );
        })}
      </div>

      <div className="flex items-center justify-center gap-2">
        {INSTRUCTORS.map((instructor, i) => (
          <button
            key={instructor.id}
            type="button"
            onClick={() => setActive(i)}
            aria-label={`Show ${instructor.name}`}
            aria-current={i === active}
            className={clsx(
              "h-2 rounded-full transition-all duration-300",
              i === active
                ? "w-6 bg-brand-400"
                : "w-2 bg-white/30 hover:bg-white/60",
            )}
          />
        ))}
      </div>
    </div>
  );
}

function InstructorCardBody({
  instructor,
}: {
  instructor: Instructor;
}): React.ReactElement {
  return (
    <div className="flex h-full w-full flex-col">
      <div className="relative h-[58%] w-full overflow-hidden bg-neutral-900">
        {instructor.image ? (
          <Image
            src={instructor.image}
            alt={`${instructor.name}, ${instructor.role}`}
            fill
            sizes="320px"
            className="object-cover object-top"
          />
        ) : (
          <div className="grid h-full w-full place-items-center bg-gradient-to-br from-brand-500/25 to-neutral-900">
            <span className="font-display text-6xl font-extrabold text-brand-300/40">
              {initialsOf(instructor.name)}
            </span>
          </div>
        )}
        <div
          aria-hidden
          className="absolute inset-x-0 bottom-0 h-16"
          style={{ background: "linear-gradient(to top, #0B0F17, transparent)" }}
        />
      </div>
      <div className="flex flex-1 flex-col px-4 pb-4 pt-2">
        <p className="font-display text-lg font-bold leading-tight tracking-tight text-white">
          {instructor.name}
        </p>
        <p className="mt-1 text-[12px] leading-snug text-neutral-400">
          {instructor.role}
        </p>
        <div className="mt-auto flex flex-wrap gap-1.5 pt-3">
          {instructor.teaches.slice(0, 3).map((category) => (
            <span
              key={category}
              className="rounded-full bg-brand-500/15 px-2 py-0.5 text-[11px] font-semibold text-brand-300 ring-1 ring-brand-400/25"
            >
              {roomLabel(category)}
            </span>
          ))}
        </div>
      </div>
    </div>
  );
}

/* ─── Instructor panel ──────────────────────────────────────────────────── */

function InstructorPanel({
  instructor,
  index,
  reduce,
}: {
  instructor: Instructor;
  index: number;
  reduce: boolean;
}): React.ReactElement {
  // First panel (index 0) puts the portrait on the right, then alternate.
  const portraitRight = index % 2 === 0;
  const initial = reduce ? "show" : "hidden";
  const headingId = `instructor-${instructor.id}`;

  return (
    <section
      aria-labelledby={headingId}
      className="border-t border-neutral-200/70 py-16 first:border-t-0 md:py-24"
    >
      <div className="mx-auto grid max-w-content items-center gap-10 px-4 lg:grid-cols-2 lg:gap-16">
        {/* Portrait */}
        <motion.div
          variants={PORTRAIT_REVEAL}
          initial={initial}
          whileInView="show"
          viewport={{ once: true, amount: 0.3 }}
          className={clsx(portraitRight ? "lg:order-2" : "lg:order-1")}
        >
          <InstructorPortrait instructor={instructor} />
        </motion.div>

        {/* Copy */}
        <motion.div
          variants={COPY_CONTAINER}
          initial={initial}
          whileInView="show"
          viewport={{ once: true, amount: 0.2 }}
          className={clsx(portraitRight ? "lg:order-1" : "lg:order-2")}
        >
          <motion.p
            variants={COPY_ITEM}
            className="text-body-sm font-semibold text-brand-700 tnum"
          >
            Instructor {index + 1} of {INSTRUCTORS.length}
          </motion.p>
          <motion.h2
            variants={COPY_ITEM}
            id={headingId}
            className="mt-2 font-display text-display-lg font-extrabold tracking-tight text-neutral-950 text-balance"
          >
            {instructor.name}
          </motion.h2>
          <motion.p
            variants={COPY_ITEM}
            className="mt-1 text-body-md font-medium text-neutral-700"
          >
            {instructor.role}
          </motion.p>

          <motion.p
            variants={COPY_ITEM}
            className="mt-5 max-w-prose text-body-lg font-medium leading-relaxed text-neutral-950 text-pretty"
          >
            {instructor.tagline}
          </motion.p>

          <motion.div variants={COPY_ITEM} className="mt-5 flex flex-wrap gap-2">
            {instructor.teaches.map((category) => (
              <span
                key={category}
                className="inline-flex items-center gap-1.5 rounded-full bg-brand-50 px-3 py-1 text-body-xs font-semibold text-brand-700 ring-1 ring-brand-100"
              >
                <GraduationCap size={12} strokeWidth={2.2} />
                {roomLabel(category)}
              </span>
            ))}
          </motion.div>

          <motion.div
            variants={COPY_ITEM}
            className="mt-5 max-w-prose space-y-3 text-body-md leading-relaxed text-neutral-900"
          >
            {instructor.bio.map((paragraph, i) => (
              <p key={i}>{paragraph}</p>
            ))}
          </motion.div>

          <motion.ul variants={COPY_ITEM} className="mt-5 space-y-2">
            {instructor.highlights.map((highlight) => (
              <li
                key={highlight}
                className="flex items-start gap-2.5 text-body-md text-neutral-900"
              >
                <Check
                  size={18}
                  strokeWidth={2.4}
                  className="mt-0.5 shrink-0 text-brand-600"
                  aria-hidden
                />
                <span>{highlight}</span>
              </li>
            ))}
          </motion.ul>

          <motion.div variants={COPY_ITEM} className="mt-7">
            <Link href={ENROLL_HREF} className="btn btn-primary btn-md">
              Enroll now
              <ArrowRight size={14} />
            </Link>
          </motion.div>
        </motion.div>
      </div>
    </section>
  );
}

/* ─── Portrait (monogram placeholder until a real asset lands) ──────────── */

function InstructorPortrait({
  instructor,
}: {
  instructor: Instructor;
}): React.ReactElement {
  const frame =
    "relative mx-auto aspect-[4/5] w-full max-w-md overflow-hidden rounded-2xl ring-1 ring-neutral-200 shadow-elev-3 lg:mx-0";

  if (instructor.image) {
    return (
      <div className={frame}>
        <Image
          src={instructor.image}
          alt={`${instructor.name}, ${instructor.role}`}
          fill
          sizes="(max-width: 1024px) 100vw, 40vw"
          className="object-cover"
        />
      </div>
    );
  }

  return (
    <div
      className={clsx(frame, "bg-gradient-to-br from-brand-50 to-neutral-100")}
      role="img"
      aria-label={`Portrait of ${instructor.name} coming soon`}
    >
      <div
        aria-hidden
        className="absolute inset-0"
        style={{
          background:
            "radial-gradient(62% 55% at 32% 26%, rgba(1,145,252,0.16), transparent 70%)",
        }}
      />
      <div aria-hidden className="absolute inset-0 grid place-items-center">
        <span className="select-none font-display text-[112px] font-extrabold leading-none tracking-tighter text-brand-500/20">
          {initialsOf(instructor.name)}
        </span>
      </div>
      <div className="absolute bottom-3 left-3 inline-flex items-center gap-1.5 rounded-full bg-neutral-950/70 px-2.5 py-1 text-[11px] font-medium text-white backdrop-blur">
        <ImageIcon size={11} strokeWidth={2.2} aria-hidden />
        Portrait coming soon
      </div>
    </div>
  );
}

/* ─── Featured speaker ──────────────────────────────────────────────────── */

function FeaturedSpeakerSection({
  reduce,
}: {
  reduce: boolean;
}): React.ReactElement {
  const initial = reduce ? "show" : "hidden";
  return (
    <section
      aria-labelledby="featured-speaker"
      className="border-t border-neutral-200/70 py-16 md:py-24"
    >
      <div className="mx-auto max-w-content px-4">
        <motion.div
          variants={COPY_CONTAINER}
          initial={initial}
          whileInView="show"
          viewport={{ once: true, amount: 0.2 }}
          className="mb-10 max-w-2xl"
        >
          <motion.h2
            variants={COPY_ITEM}
            id="featured-speaker"
            className="font-display text-display-lg font-extrabold tracking-tight text-neutral-950 text-balance"
          >
            Learn from the people the industry looks up to.
          </motion.h2>
          <motion.p
            variants={COPY_ITEM}
            className="mt-4 max-w-prose text-body-md leading-relaxed text-neutral-700 text-pretty"
          >
            Alongside your core instructors, unGhost runs live sessions with
            leaders who have built at scale.
          </motion.p>
        </motion.div>

        <FeaturedSpeaker />
      </div>
    </section>
  );
}

/* ─── Final CTA band ────────────────────────────────────────────────────── */

function EnrollBand({ reduce }: { reduce: boolean }): React.ReactElement {
  const initial = reduce ? "show" : "hidden";
  return (
    <section className="px-4 pb-24 pt-8">
      <motion.div
        variants={COPY_CONTAINER}
        initial={initial}
        whileInView="show"
        viewport={{ once: true, amount: 0.3 }}
        className="relative mx-auto max-w-content overflow-hidden rounded-3xl bg-neutral-950 px-6 py-16 text-center md:px-16 md:py-24"
      >
        <div
          aria-hidden
          className="pointer-events-none absolute inset-0"
          style={{
            background:
              "radial-gradient(60% 80% at 50% 0%, rgba(1,145,252,0.35), transparent 70%)",
          }}
        />
        <div className="relative">
          <motion.h2
            variants={COPY_ITEM}
            className="mx-auto max-w-2xl font-display text-display-lg font-extrabold tracking-tight text-white text-balance"
          >
            Ready to learn from them?
          </motion.h2>
          <motion.p
            variants={COPY_ITEM}
            className="mx-auto mt-4 max-w-prose text-body-lg leading-relaxed text-neutral-300 text-pretty"
          >
            Create your account, pick a bootcamp, and start with a
            certification waiting at the finish.
          </motion.p>
          <motion.div
            variants={COPY_ITEM}
            className="mt-9 flex flex-wrap items-center justify-center gap-3"
          >
            <Link href={ENROLL_HREF} className="btn btn-primary btn-xl">
              Enroll now
              <ArrowRight size={18} />
            </Link>
            <Link
              href="/bootcamps"
              className="btn btn-xl border-white/25 bg-white/10 text-white backdrop-blur transition-colors hover:bg-white/20"
            >
              Explore bootcamps
            </Link>
          </motion.div>
        </div>
      </motion.div>
    </section>
  );
}
