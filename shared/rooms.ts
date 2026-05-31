/**
 * Single source of truth for bootcamp "rooms" — the 5 fixed subjects.
 *
 * Drives the student room hubs (/bootcamps/[room]), instructor studio scoping,
 * recruiter lecture library, and all category labels + validation. Add a
 * subject here and it propagates everywhere — nothing else hardcodes the list.
 */
export const ROOMS = [
  {
    id: "ai",
    label: "AI",
    blurb: "Build with generative AI, agents, and applied ML.",
  },
  {
    id: "marketing",
    label: "Marketing",
    blurb: "Growth, performance, brand, and content that converts.",
  },
  {
    id: "sales",
    label: "Sales",
    blurb: "Pipeline, discovery, closing, and B2B GTM.",
  },
  {
    id: "entrepreneurship",
    label: "Entrepreneurship",
    blurb: "Zero-to-one: ideas, MVPs, fundraising, and ops.",
  },
  {
    id: "freelancing",
    label: "Freelancing",
    blurb: "Land clients, price your work, and run solo.",
  },
] as const;

export type BootcampCategory = (typeof ROOMS)[number]["id"];

/** Tuple of room ids — usable directly as a Zod enum / validation list. */
export const ROOM_IDS = ROOMS.map((r) => r.id) as [
  BootcampCategory,
  ...BootcampCategory[],
];

const LABELS = Object.fromEntries(
  ROOMS.map((r) => [r.id, r.label]),
) as Record<BootcampCategory, string>;

/** Human label for a room id. Falls back to the raw id for legacy values. */
export function roomLabel(id: string): string {
  return LABELS[id as BootcampCategory] ?? id;
}

/** Type guard — true if `id` is one of the 5 live rooms. */
export function isRoomId(id: string): id is BootcampCategory {
  return (ROOM_IDS as readonly string[]).includes(id);
}

/** Full room record (id + label + blurb) for a given id, or undefined. */
export function getRoom(id: string) {
  return ROOMS.find((r) => r.id === id);
}
