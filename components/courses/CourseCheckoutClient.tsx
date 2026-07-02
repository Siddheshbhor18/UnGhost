"use client";

import { useEffect } from "react";
import { useHasMounted } from "@/components/lib/useHasMounted";
import Link from "next/link";
import {
  Trash2,
  Sparkles,
  ArrowLeft,
  CheckCircle2,
  ShoppingBag,
} from "lucide-react";
import { Button, EmptyState, SectionLabel, Badge } from "@/components/ui";
import { CheckoutButton } from "@/components/courses/CheckoutButton";
import { CoursePicker } from "@/components/courses/CoursePicker";
import { useCourseCart } from "@/components/courses/cartStore";
import { COURSE_VISUAL } from "@/components/courses/courseVisuals";
import { ROOMS, getRoom, roomLabel, type BootcampCategory } from "@/shared/rooms";
import {
  resolveCart,
  everythingSelection,
  isCourseId,
  COURSE_PRICE_PAISE,
  EVERYTHING_BUNDLE_PAISE,
} from "@/shared/lib/courses";
import { formatPaiseAsINR, computeTotalPaise } from "@/shared/lib/pricing";
import { GST_PERCENT } from "@/shared/types";

interface Props {
  /** A course id from `?course=<id>` to drop into the cart on mount. */
  preselect: BootcampCategory | null;
  /** Render the post-payment thank-you state and empty the cart. */
  success: boolean;
  /** Course ids the buyer already owns (from server, expiry-aware). Auto-
   *  removed from the cart on mount, hidden by the "add more" picker, and
   *  the server's price engine drops them too — so a course they hold can
   *  never be re-purchased even if the cart somehow contains it. */
  ownedCourses?: readonly BootcampCategory[];
  /** Pre-fills the Razorpay modal so the buyer doesn't retype. */
  prefill?: { name?: string; email?: string; contact?: string };
}

/**
 * Bootcamp course cart + checkout. Reads the persisted client cart, resolves it
 * through the bundle engine (free unlocks + ₹11,999 Everything cap), and opens
 * the trusted Razorpay flow. Cart reads are guarded behind a mounted check so
 * the persisted localStorage state never causes a hydration mismatch.
 */
export function CourseCheckoutClient({
  preselect,
  success,
  ownedCourses,
  prefill,
}: Props) {
  const items = useCourseCart((s) => s.items);
  const add = useCourseCart((s) => s.add);
  const remove = useCourseCart((s) => s.remove);
  const setAll = useCourseCart((s) => s.setAll);
  const clear = useCourseCart((s) => s.clear);

  const mounted = useHasMounted();
  const owned = ownedCourses ?? [];

  // Preselect the course passed in the URL (e.g. from a catalog "Buy" button)
  // — unless the buyer already owns it.
  useEffect(() => {
    if (preselect && isCourseId(preselect) && !owned.includes(preselect)) {
      add(preselect);
    }
  }, [preselect, owned, add]);

  // A verified payment lands back here with ?success=1 — clear the cart so the
  // buyer can't accidentally re-check-out the courses they just bought.
  useEffect(() => {
    if (success) clear();
  }, [success, clear]);

  // Drop any owned courses the persisted cart still holds (e.g. they were
  // added before purchase, or restored on a fresh device). Defensive — the
  // server price engine drops them too, but doing it here avoids the buyer
  // seeing an "Owned" row in the cart they can't pay for.
  useEffect(() => {
    if (!mounted || owned.length === 0) return;
    for (const id of owned) {
      if (items.includes(id)) remove(id);
    }
  }, [mounted, owned, items, remove]);

  if (success) return <SuccessState />;
  if (!mounted) return <CartSkeleton />;
  if (items.length === 0) {
    return (
      <EmptyCart
        ownedCourses={owned}
        onAddEverything={() => setAll(everythingSelection())}
      />
    );
  }

  return (
    <CartView
      items={items}
      ownedCourses={owned}
      prefill={prefill}
      onRemove={remove}
      onAddEverything={() => setAll(everythingSelection())}
      onClear={clear}
    />
  );
}

// ── Cart ─────────────────────────────────────────────────────────────────────

function CartView({
  items,
  ownedCourses,
  prefill,
  onRemove,
  onAddEverything,
  onClear,
}: {
  items: BootcampCategory[];
  ownedCourses: readonly BootcampCategory[];
  prefill?: { name?: string; email?: string; contact?: string };
  onRemove: (id: BootcampCategory) => void;
  onAddEverything: () => void;
  onClear: () => void;
}) {
  const resolution = resolveCart(items);
  const anchorSet = new Set(resolution.paidAnchors);
  const selectedSet = new Set(items);
  const { totalInPaise, gstInPaise } = computeTotalPaise({
    priceInPaise: resolution.pricePaise,
    gstPercent: GST_PERCENT,
  });

  // Granted courses in canonical room order (paid anchors + free unlocks).
  const rows = ROOMS.filter((r) => resolution.granted.includes(r.id));

  return (
    <div>
      <CheckoutHeader />

      <div className="grid gap-6 lg:grid-cols-[1fr_360px] items-start">
        {/* Course list */}
        <div className="space-y-3">
          {rows.map((room) => (
            <CourseRow
              key={room.id}
              id={room.id}
              free={!anchorSet.has(room.id)}
              removable={selectedSet.has(room.id)}
              onRemove={() => onRemove(room.id)}
            />
          ))}

          {resolution.granted.length > resolution.paidAnchors.length ? (
            <p className="flex items-center gap-2 px-1 pt-1 text-[13px] text-neutral-500">
              <Sparkles size={13} className="text-amber-500" />
              Free unlocks are included automatically — you&apos;re only charged
              for the {resolution.paidAnchors.length}{" "}
              {resolution.paidAnchors.length === 1 ? "course" : "courses"} above.
            </p>
          ) : null}
        </div>

        {/* Summary */}
        <aside className="lg:sticky lg:top-24 rounded-2xl bg-white p-6 ring-1 ring-black/[0.06] shadow-[0_1px_2px_rgba(0,0,0,0.05),0_24px_50px_-20px_rgba(0,0,0,0.45)]">
          <p className="font-display text-lg font-bold text-neutral-950">
            Order summary
          </p>

          {resolution.isEverything ? (
            <div className="mt-4 flex items-center gap-2.5 rounded-xl bg-brand-50 px-3.5 py-3 ring-1 ring-brand-500/15">
              <span className="grid h-8 w-8 shrink-0 place-items-center rounded-lg bg-brand-gradient text-white shadow-brand-glow">
                <Sparkles size={15} />
              </span>
              <p className="text-[13px] font-medium leading-snug text-brand-ink">
                Everything bundle — all 6 courses for{" "}
                {formatPaiseAsINR(EVERYTHING_BUNDLE_PAISE)}.
              </p>
            </div>
          ) : null}

          <dl className="mt-5 space-y-2.5 text-sm">
            <div className="flex items-center justify-between">
              <dt className="text-neutral-500">
                Subtotal ·{" "}
                {resolution.paidAnchors.length}{" "}
                {resolution.paidAnchors.length === 1 ? "course" : "courses"}
              </dt>
              <dd className="font-semibold tnum text-neutral-900">
                {formatPaiseAsINR(resolution.pricePaise)}
              </dd>
            </div>
            <div className="flex items-center justify-between">
              <dt className="text-neutral-500">GST · {GST_PERCENT}%</dt>
              <dd className="tnum text-neutral-700">
                {formatPaiseAsINR(gstInPaise)}
              </dd>
            </div>
          </dl>

          <div className="mt-4 flex items-baseline justify-between border-t border-neutral-200 pt-4">
            <span className="text-sm font-semibold text-neutral-900">Total</span>
            <span className="font-display text-2xl font-extrabold tnum text-neutral-950">
              {formatPaiseAsINR(totalInPaise)}
            </span>
          </div>

          <div className="mt-5">
            <CheckoutButton
              body={{ kind: "courses", courses: items }}
              description="unGhost courses"
              successUrl="/bootcamps/checkout?success=1"
              label="Buy courses"
              prefill={prefill}
            />
          </div>

          {!resolution.isEverything ? (
            <Button
              variant="secondary"
              fullWidth
              className="mt-3"
              leadingIcon={<Sparkles size={15} />}
              onClick={onAddEverything}
            >
              Add everything · {formatPaiseAsINR(EVERYTHING_BUNDLE_PAISE)}
            </Button>
          ) : null}

          <button
            type="button"
            onClick={onClear}
            className="mt-4 block w-full text-center text-[12.5px] text-neutral-400 transition hover:text-neutral-700"
          >
            Clear cart
          </button>

          <p className="mt-4 text-center text-[11.5px] leading-relaxed text-neutral-400">
            One purchase · 3-month access per course · UPI &amp; cards · all
            sales final.
          </p>
        </aside>
      </div>

      <div className="mt-10">
        <CoursePicker
          hideInCart
          ownedCourses={ownedCourses}
          title="Add more courses"
          description="Stack another room into this order — free unlocks apply automatically and the Everything bundle caps the total at ₹11,999."
        />
      </div>
    </div>
  );
}

function CourseRow({
  id,
  free,
  removable,
  onRemove,
}: {
  id: BootcampCategory;
  free: boolean;
  removable: boolean;
  onRemove: () => void;
}) {
  const v = COURSE_VISUAL[id];
  const Icon = v.icon;
  const blurb = getRoom(id)?.blurb ?? "";
  return (
    <div className="group flex items-center gap-4 rounded-2xl bg-white px-5 py-4 ring-1 ring-black/[0.05] shadow-[0_1px_2px_rgba(0,0,0,0.05),0_18px_40px_-20px_rgba(0,0,0,0.4)] transition-all duration-300 hover:-translate-y-0.5 hover:shadow-[0_1px_2px_rgba(0,0,0,0.05),0_26px_55px_-22px_rgba(0,0,0,0.55)]">
      <div
        className="grid h-12 w-12 shrink-0 place-items-center rounded-xl text-white"
        style={{
          backgroundImage: `linear-gradient(135deg, ${v.from}, ${v.to})`,
          boxShadow: `0 6px 16px rgba(${v.glow},0.4), inset 0 1px 0 rgba(255,255,255,0.35)`,
        }}
      >
        <Icon size={22} />
      </div>

      <div className="min-w-0 flex-1">
        <p className="text-[15px] font-semibold text-neutral-900">
          {roomLabel(id)}
        </p>
        <p className="mt-0.5 truncate text-[12.5px] text-neutral-500">{blurb}</p>
      </div>

      <div className="flex shrink-0 items-center gap-3">
        {free ? (
          <Badge tone="success">Free</Badge>
        ) : (
          <span className="font-display text-[15px] font-bold tnum text-neutral-900">
            {formatPaiseAsINR(COURSE_PRICE_PAISE)}
          </span>
        )}
        {removable ? (
          <button
            type="button"
            onClick={onRemove}
            aria-label={`Remove ${roomLabel(id)}`}
            className="grid h-8 w-8 place-items-center rounded-lg text-neutral-300 transition hover:bg-red-50 hover:text-red-500"
          >
            <Trash2 size={15} />
          </button>
        ) : (
          <span className="h-8 w-8" aria-hidden />
        )}
      </div>
    </div>
  );
}

// ── States ───────────────────────────────────────────────────────────────────

function CheckoutHeader() {
  return (
    <div className="mb-8">
      <Link
        href="/bootcamps"
        className="mb-5 inline-flex items-center gap-1.5 text-body-sm text-neutral-500 transition hover:text-brand-primary"
      >
        <ArrowLeft size={15} /> Back to courses
      </Link>
      <SectionLabel tone="brand" icon={<ShoppingBag size={12} />}>
        Your cart
      </SectionLabel>
      <h1 className="mt-2 font-display text-display-xl font-extrabold tracking-tighter text-neutral-950">
        Bootcamp courses
      </h1>
      <p className="mt-3 max-w-prose text-body-md leading-relaxed text-neutral-500">
        Each course is ₹4,999 for 3 months. Buy AI or GTM and Marketing,
        Sales &amp; Entrepreneurship come free; all six together is the{" "}
        {formatPaiseAsINR(EVERYTHING_BUNDLE_PAISE)} Everything bundle.
      </p>
    </div>
  );
}

function EmptyCart({
  ownedCourses,
  onAddEverything,
}: {
  ownedCourses: readonly BootcampCategory[];
  onAddEverything: () => void;
}) {
  return (
    <div>
      <CheckoutHeader />
      <div className="rounded-2xl bg-white p-6 ring-1 ring-black/[0.05] shadow-[0_1px_2px_rgba(0,0,0,0.05),0_24px_50px_-20px_rgba(0,0,0,0.4)]">
        <EmptyState
          illustration={<ShoppingBag size={34} strokeWidth={1.6} />}
          title="Your cart is empty"
          description="Add a course below to get started — or grab all six at the Everything bundle price."
          action={
            <Button
              variant="primary"
              leadingIcon={<Sparkles size={15} />}
              onClick={onAddEverything}
            >
              Add everything · {formatPaiseAsINR(EVERYTHING_BUNDLE_PAISE)}
            </Button>
          }
        />
        <div className="mt-6 border-t border-neutral-100 pt-6">
          <CoursePicker
            ownedCourses={ownedCourses}
            title="Pick courses"
            description="₹4,999 each · 3 months access. Buying AI or GTM unlocks Marketing, Sales &amp; Entrepreneurship free."
          />
        </div>
      </div>
    </div>
  );
}

function SuccessState() {
  return (
    <div className="mx-auto max-w-xl py-10 text-center">
      <div className="mx-auto grid h-16 w-16 place-items-center rounded-2xl bg-green-50 text-green-600 ring-1 ring-green-500/15">
        <CheckCircle2 size={36} strokeWidth={1.6} />
      </div>
      <h1 className="mt-6 font-display text-display-xl font-extrabold leading-tight tracking-tighter text-neutral-950">
        You&apos;re enrolled.
      </h1>
      <p className="mt-4 text-body-md leading-relaxed text-neutral-500">
        Your courses are unlocked for life. Jump into any room and start with the
        recorded modules, live sessions, and the skill-verify badge.
      </p>
      <div className="mt-8 flex justify-center gap-3">
        <Link href="/bootcamps">
          <Button variant="primary">Go to my courses</Button>
        </Link>
        <Link href="/dashboard">
          <Button variant="secondary">Back to dashboard</Button>
        </Link>
      </div>
      <p className="mt-10 text-body-xs text-neutral-500">
        Receipt sent to your email.
      </p>
    </div>
  );
}

function CartSkeleton() {
  return (
    <div>
      <CheckoutHeader />
      <div className="grid gap-6 lg:grid-cols-[1fr_360px] items-start">
        <div className="space-y-3">
          {[0, 1, 2].map((i) => (
            <div
              key={i}
              className="h-[76px] animate-pulse rounded-2xl bg-neutral-100 ring-1 ring-black/[0.04]"
            />
          ))}
        </div>
        <div className="h-72 animate-pulse rounded-2xl bg-neutral-100 ring-1 ring-black/[0.04]" />
      </div>
    </div>
  );
}
