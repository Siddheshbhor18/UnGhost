import type { BootcampCategory } from "@/shared/rooms";

/**
 * Photographic thumbnail per bootcamp room, served from /public.
 *
 * Only rooms with a real asset are listed; anything absent falls back to the
 * gradient thumbnail the cards paint by default. Currently empty — no course
 * photography has shipped yet. Drop a PNG in /public and add its entry here
 * to give a room a real thumbnail everywhere the cards render one.
 */
export const COURSE_THUMBNAIL: Partial<Record<BootcampCategory, string>> = {};
