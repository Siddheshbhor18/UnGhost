import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { z } from "zod";
import { authOptions } from "@/server/auth";
import { requireSameOrigin } from "@/server/lib/csrf";
import { parseBody } from "@/server/lib/validate";
import {
  getUserById,
  updateStudentProfile,
} from "@/server/store";
import type { StudentProfile } from "@/shared/types";

export const runtime = "nodejs";

// Zod schema replaces the previous hand-rolled `ALLOWED_KEYS` allowlist. The
// old flow filtered unknown keys but left string sizes unbounded, so a
// hostile client could still store megabytes into `alias` / `city` /
// `history[].impact`. Every field here is optional; `.strict()` refuses any
// field the client tries to sneak past our editable list.
//
// `HistoryEntry` (shared/types) requires `id`, `startDate`, `endDate` and
// `impact`, so the schema below matches those. `id` is client-generated on
// the profile editor and re-used on subsequent edits.
const HistoryItem = z.object({
  id: z.string().min(1).max(64),
  title: z.string().trim().min(1).max(120),
  company: z.string().trim().min(1).max(120),
  startDate: z.string().trim().max(30),
  endDate: z.string().trim().max(30),
  impact: z.string().trim().max(500),
});

const PatchInput = z
  .object({
    alias: z.string().trim().max(80).optional(),
    contactEmail: z
      .string()
      .trim()
      .max(254)
      .email()
      .or(z.literal(""))
      .optional(),
    contactPhone: z.string().trim().max(20).optional(),
    trajectory: z
      .enum(["actively_hunting", "casually_exploring", "open_to_magic"])
      .optional(),
    skills: z.array(z.string().trim().max(60)).max(30).optional(),
    city: z.string().trim().max(80).optional(),
    remotePref: z.enum(["remote", "hybrid", "onsite"]).optional(),
    history: z.array(HistoryItem).max(20).optional(),
    yearsExperience: z.number().int().min(0).max(60).optional(),
    searchVisibility: z.boolean().optional(),
    applicationIdentity: z.enum(["named", "anonymous"]).optional(),
  })
  .strict();

export async function GET() {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }
  const user = await getUserById(session.user.id);
  if (!user) return NextResponse.json({ error: "not found" }, { status: 404 });
  return NextResponse.json(user);
}

export async function PATCH(req: Request) {
  const csrf = requireSameOrigin(req);
  if (csrf) return csrf;
  const session = await getServerSession(authOptions);
  if (!session?.user?.id || session.user.role !== "student") {
    return NextResponse.json({ error: "students only" }, { status: 403 });
  }
  const parsed = await parseBody(req, PatchInput);
  if (!parsed.ok) return parsed.response;

  // Drop empty-string skill chips that survived trimming.
  const patch: Partial<StudentProfile> = { ...parsed.data };
  if (parsed.data.skills) {
    patch.skills = parsed.data.skills.filter((s) => s.length > 0);
  }

  const updated = await updateStudentProfile(session.user.id, patch);
  if (!updated) {
    return NextResponse.json({ error: "not found" }, { status: 404 });
  }
  return NextResponse.json(updated);
}
