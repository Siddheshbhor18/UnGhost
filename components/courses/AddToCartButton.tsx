"use client";

import { useHasMounted } from "@/components/lib/useHasMounted";
import { Check, Plus } from "lucide-react";
import { Button } from "@/components/ui";
import type { ButtonSize, ButtonVariant } from "@/components/ui";
import { useCourseCart } from "@/components/courses/cartStore";
import type { BootcampCategory } from "@/shared/rooms";

interface Props {
  id: BootcampCategory;
  /** Visual size of the underlying Button. Defaults to "md". */
  size?: ButtonSize;
  /** Stretch the button to its container's width. */
  fullWidth?: boolean;
  /** Variant when the course is NOT in the cart. Defaults to "primary". */
  variant?: ButtonVariant;
  /** Variant when the course IS in the cart. Defaults to "secondary". */
  addedVariant?: ButtonVariant;
  /** Override the default "Add to cart" / "In cart" copy. */
  labels?: { add?: string; added?: string };
  className?: string;
}

/**
 * Single source of truth for the bootcamp course add-to-cart action. Toggles
 * the course in the persisted cart store and reflects its current state the
 * same way on every surface (landing, catalog, room hub, cart picker, etc.).
 *
 * A mounted-guard keeps the persisted (localStorage) cart from causing a
 * hydration mismatch: until mount we render the not-in-cart label, then
 * reconcile to the real state on the client.
 */
export function AddToCartButton({
  id,
  size = "md",
  fullWidth,
  variant = "primary",
  addedVariant = "secondary",
  labels,
  className,
}: Props) {
  const inCart = useCourseCart((s) => s.items.includes(id));
  const toggle = useCourseCart((s) => s.toggle);
  const mounted = useHasMounted();
  const live = mounted && inCart;

  return (
    <Button
      type="button"
      variant={live ? addedVariant : variant}
      size={size}
      fullWidth={fullWidth}
      className={className}
      onClick={() => toggle(id)}
      aria-pressed={live}
      leadingIcon={live ? <Check size={15} /> : <Plus size={15} />}
    >
      {live ? labels?.added ?? "In cart" : labels?.add ?? "Add to cart"}
    </Button>
  );
}
