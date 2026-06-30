"use client";

import { create } from "zustand";
import { persist } from "zustand/middleware";
import type { BootcampCategory } from "@/shared/rooms";
import { isCourseId } from "@/shared/lib/courses";

/**
 * Client cart of bootcamp **course** ids (rooms), persisted to localStorage so
 * it survives navigation across the landing + student surfaces. Pricing and the
 * free-unlock set are always derived from `resolveCart(items)` at display +
 * checkout time — this store only holds the user's raw selection.
 */
interface CourseCartState {
  items: BootcampCategory[];
  add: (id: BootcampCategory) => void;
  remove: (id: BootcampCategory) => void;
  toggle: (id: BootcampCategory) => void;
  setAll: (ids: BootcampCategory[]) => void;
  clear: () => void;
}

export const useCourseCart = create<CourseCartState>()(
  persist(
    (set, get) => ({
      items: [],
      add: (id) =>
        set((s) => (s.items.includes(id) ? s : { items: [...s.items, id] })),
      remove: (id) => set((s) => ({ items: s.items.filter((x) => x !== id) })),
      toggle: (id) =>
        get().items.includes(id) ? get().remove(id) : get().add(id),
      setAll: (ids) => set({ items: ids.filter(isCourseId) }),
      clear: () => set({ items: [] }),
    }),
    { name: "ug_course_cart" },
  ),
);
