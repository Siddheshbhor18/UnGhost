"use client";

import { Plus } from "lucide-react";
import { useHasMounted } from "@/components/lib/useHasMounted";
import { SectionLabel } from "@/components/ui";
import { AddToCartButton } from "@/components/courses/AddToCartButton";
import { COURSE_VISUAL } from "@/components/courses/courseVisuals";
import { useCourseCart } from "@/components/courses/cartStore";
import { ROOMS, type BootcampCategory } from "@/shared/rooms";
import { COURSE_PRICE_PAISE } from "@/shared/lib/courses";
import { formatPaiseAsINR } from "@/shared/lib/pricing";
import { visiblePickerCourses } from "@/components/courses/pickerFilter";

interface Props {
  /** When true, hide courses already in the cart. Use on the populated cart's
   *  "Add more courses" section so we surface only what's actually addable. */
  hideInCart?: boolean;
  /** Course ids the buyer already owns — always filtered out of the grid so
   *  we never offer an "Add" button for a course they hold. Pass from the
   *  parent server shell (cart page / catalog) where the grant list lives. */
  ownedCourses?: readonly BootcampCategory[];
  /** Optional eyebrow label rendered above the grid. */
  title?: string;
  /** Optional supporting copy under the title. */
  description?: string;
}


/**
 * Grid of bootcamp course cards with per-row add-to-cart toggles. Drives
 * the cart page's in-place "add more courses" experience (both the empty
 * state and the populated cart) so buyers never have to leave checkout to
 * grow their order.
 *
 * Visual identity (icon + gradient) is sourced from `COURSE_VISUAL` — the
 * same record used by the cart row + checkout summary — so every surface
 * paints a given course identically.
 */
export function CoursePicker({
  hideInCart,
  ownedCourses,
  title,
  description,
}: Props) {
  const items = useCourseCart((s) => s.items);
  const mounted = useHasMounted();
  const visible = visiblePickerCourses(
    items,
    hideInCart === true,
    mounted,
    ownedCourses,
  );

  if (visible.length === 0) return null;

  return (
    <section>
      {title ? (
        <SectionLabel tone="brand" icon={<Plus size={12} />}>
          {title}
        </SectionLabel>
      ) : null}
      {description ? (
        <p className="mt-2 max-w-prose text-body-sm leading-relaxed text-neutral-500">
          {description}
        </p>
      ) : null}
      <div
        className={[
          title || description ? "mt-4" : "",
          "grid gap-3 sm:grid-cols-2",
        ]
          .filter(Boolean)
          .join(" ")}
      >
        {visible.map((room) => (
          <PickerRow
            key={room.id}
            id={room.id}
            label={room.label}
            blurb={room.blurb}
          />
        ))}
      </div>
    </section>
  );
}

function PickerRow({
  id,
  label,
  blurb,
}: {
  id: BootcampCategory;
  label: string;
  blurb: string;
}) {
  const v = COURSE_VISUAL[id];
  const Icon = v.icon;
  return (
    <div className="flex items-center gap-4 rounded-2xl bg-white p-4 ring-1 ring-black/[0.05] shadow-[0_1px_2px_rgba(0,0,0,0.05),0_18px_40px_-22px_rgba(0,0,0,0.4)] transition-all duration-300 hover:-translate-y-0.5 hover:shadow-[0_1px_2px_rgba(0,0,0,0.05),0_22px_45px_-22px_rgba(0,0,0,0.55)]">
      <div
        className="grid h-11 w-11 shrink-0 place-items-center rounded-xl text-white"
        style={{
          backgroundImage: `linear-gradient(135deg, ${v.from}, ${v.to})`,
          boxShadow: `0 6px 14px rgba(${v.glow},0.35), inset 0 1px 0 rgba(255,255,255,0.35)`,
        }}
      >
        <Icon size={20} />
      </div>
      <div className="min-w-0 flex-1">
        <p className="truncate text-[14px] font-semibold text-neutral-900">
          {label}
        </p>
        <p className="truncate text-[12px] text-neutral-500">{blurb}</p>
      </div>
      <div className="flex shrink-0 items-center gap-3">
        <span className="hidden font-display text-[14px] font-bold tnum text-neutral-900 sm:inline">
          {formatPaiseAsINR(COURSE_PRICE_PAISE)}
        </span>
        <AddToCartButton
          id={id}
          size="sm"
          labels={{ add: "Add", added: "Added" }}
        />
      </div>
    </div>
  );
}
