import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { z } from "zod";
import { authOptions } from "@/server/auth";
import { requireSameOrigin } from "@/server/lib/csrf";
import { parseBody } from "@/server/lib/validate";
import {
  createBootcamp,
  listBootcampsByInstructor,
} from "@/server/store";
import { ROOM_IDS } from "@/shared/rooms";

export const runtime = "nodejs";

// Instructor-supplied prices reach the checkout / bundle engine after admin
// review, so keep them in a sane paise-safe range at write time. Duration
// weeks + description bounds match the schema in `updateBootcamp`'s EDITABLE
// whitelist for consistency.
const CreateInput = z.object({
  title: z.string().trim().min(3).max(200),
  skill: z.string().trim().min(1).max(80),
  category: z.enum(ROOM_IDS),
  description: z.string().trim().max(10_000).optional(),
  priceINR: z.number().int().min(0).max(99_999).optional(),
  durationWeeks: z.number().int().min(1).max(52).optional(),
});

export async function POST(req: Request) {
  const csrf = requireSameOrigin(req);
  if (csrf) return csrf;
  const session = await getServerSession(authOptions);
  if (!session?.user?.id || session.user.role !== "instructor") {
    return NextResponse.json({ error: "instructors only" }, { status: 403 });
  }
  const parsed = await parseBody(req, CreateInput);
  if (!parsed.ok) return parsed.response;
  const body = parsed.data;
  const bc = await createBootcamp({
    instructorId: session.user.id,
    title: body.title.trim(),
    skill: body.skill.trim(),
    category: body.category,
    description: body.description,
    priceINR: body.priceINR,
    durationWeeks: body.durationWeeks,
  });
  return NextResponse.json(bc, { status: 201 });
}
