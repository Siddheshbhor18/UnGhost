import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/server/auth";
import { getBootcampById, markSkillVerified } from "@/server/store";
import { depthScore } from "@/server/lib/matching";

export const runtime = "nodejs";

export async function POST(req: Request) {
  const session = await getServerSession(authOptions);
  if (!session) return NextResponse.json({ error: "auth" }, { status: 401 });
  const { bootcampId, response } = await req.json();
  const bc = await getBootcampById(bootcampId);
  if (!bc) return NextResponse.json({ error: "not found" }, { status: 404 });
  const d = depthScore(response ?? "");
  if (d < 35) {
    return NextResponse.json({
      passed: false,
      depth: d,
      message:
        "Not deep enough yet. Add concrete examples or trade-offs. Try again with 2-3 more sentences.",
    });
  }
  await markSkillVerified(session.user.id, bc.skill);
  return NextResponse.json({
    passed: true,
    depth: d,
    skill: bc.skill,
    message: `Skill verified: ${bc.skill}. Badge added to your profile.`,
  });
}
