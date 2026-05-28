import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/server/auth";
import { requireSameOrigin } from "@/server/lib/csrf";
import {
  getUserById,
  updateStudentProfile,
} from "@/server/store";
import type { StudentProfile, Trajectory } from "@/shared/types";

export const runtime = "nodejs";

const ALLOWED_KEYS: Array<keyof StudentProfile> = [
  "alias",
  "contactEmail",
  "contactPhone",
  "trajectory",
  "skills",
  "city",
  "remotePref",
  "history",
  "yearsExperience",
  "searchVisibility",
  "applicationIdentity",
];

const TRAJECTORIES: Trajectory[] = [
  "actively_hunting",
  "casually_exploring",
  "open_to_magic",
];

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
  const body = (await req.json().catch(() => null)) as
    | Partial<StudentProfile>
    | null;
  if (!body || typeof body !== "object") {
    return NextResponse.json({ error: "invalid payload" }, { status: 400 });
  }

  // Filter to allowed keys + validate enum values
  const patch: Partial<StudentProfile> = {};
  for (const key of Object.keys(body) as Array<keyof StudentProfile>) {
    if (!ALLOWED_KEYS.includes(key)) continue;
    (patch as any)[key] = body[key];
  }
  if (patch.trajectory && !TRAJECTORIES.includes(patch.trajectory)) {
    return NextResponse.json(
      { error: "invalid trajectory" },
      { status: 400 },
    );
  }
  if (
    patch.applicationIdentity &&
    !["named", "anonymous"].includes(patch.applicationIdentity)
  ) {
    return NextResponse.json(
      { error: "invalid applicationIdentity" },
      { status: 400 },
    );
  }
  if (
    patch.remotePref &&
    !["remote", "hybrid", "onsite"].includes(patch.remotePref)
  ) {
    return NextResponse.json(
      { error: "invalid remotePref" },
      { status: 400 },
    );
  }
  if (Array.isArray(patch.skills)) {
    patch.skills = patch.skills
      .map((s) => String(s).trim())
      .filter((s) => s.length > 0)
      .slice(0, 30);
  }

  const updated = await updateStudentProfile(session.user.id, patch);
  if (!updated) {
    return NextResponse.json({ error: "not found" }, { status: 404 });
  }
  return NextResponse.json(updated);
}
