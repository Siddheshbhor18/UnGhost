"use client";

import { useEffect, useState } from "react";

/**
 * Returns `false` on the server render and on the first client render, then
 * flips to `true` once the component has hydrated.
 *
 * Use to gate reads from client-only state (localStorage, sessionStorage,
 * window.matchMedia, etc.) so the SSR markup matches the first client render
 * and React doesn't throw a hydration mismatch warning.
 *
 * Five+ cart surfaces (`AddToCartButton`, `NavCartButton`, `CoursePicker`,
 * `RoomCartCTA`, `CourseCheckoutClient`) all need exactly this guard for the
 * persisted Zustand cart store — having one shared hook keeps the pattern
 * uniform and rules out a surface accidentally reading the store without
 * the guard.
 */
export function useHasMounted(): boolean {
  const [mounted, setMounted] = useState(false);
  useEffect(() => setMounted(true), []);
  return mounted;
}
