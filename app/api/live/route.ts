import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { z } from "zod";
import { authOptions } from "@/server/auth";
import { parseBody } from "@/server/lib/validate";
import { requireSameOrigin } from "@/server/lib/csrf";
import {
  createLiveSession,
  getBootcampById,
  listLiveSessionsByInstructor,
  listUpcomingLiveForStudent,
} from "@/server/store";

export const runtime = "nodejs";

const CreateInput = z.object({
  bootcampId: z.string().min(1).max(64),
  title: z.string().min(3).max(200),
  description: z.string().max(2000).optional(),
  startsAt: z.string().datetime(),
  durationMin: z.number().int().min(15).max(240),
});

/** GET — listing. Instructor sees own. Student sees upcoming for enrolled bootcamps. */
export async function GET() {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) {
    return NextResponse.json({ error: "unauthenticated" }, { status: 401 });
  }
  if (session.user.role === "instructor") {
    const sessions = await listLiveSessionsByInstructor(session.user.id);
    return NextResponse.json({ sessions });
  }
  if (session.user.role === "student") {
    const sessions = await listUpcomingLiveForStudent(session.user.id);
    return NextResponse.json({ sessions });
  }
  return NextResponse.json({ error: "forbidden" }, { status: 403 });
}

/** POST — instructor creates a new live session for their bootcamp. */
export async function POST(req: Request) {
  const csrf = requireSameOrigin(req);
  if (csrf) return csrf;
  const session = await getServerSession(authOptions);
  if (!session?.user?.id || session.user.role !== "instructor") {
    return NextResponse.json({ error: "forbidden" }, { status: 403 });
  }
  const parsed = await parseBody(req, CreateInput);
  if (!parsed.ok) return parsed.response;
  const { bootcampId, title, description, startsAt, durationMin } = parsed.data;

  const bootcamp = await getBootcampById(bootcampId);
  if (!bootcamp || bootcamp.instructorId !== session.user.id) {
    return NextResponse.json({ error: "not_owner" }, { status: 403 });
  }
  const created = await createLiveSession({
    bootcampId,
    instructorId: session.user.id,
    title,
    description,
    startsAt,
    durationMin,
  });
  return NextResponse.json(created, { status: 201 });
}
