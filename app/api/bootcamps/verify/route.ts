import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { getBootcampById, markSkillVerified } from "@/lib/data/store";
import { depthScore } from "@/lib/utils/matching";

export const runtime = "nodejs";

export async function POST(req: Request) {
  const session = await getServerSession(authOptions);
  if (!session) return NextResponse.json({ error: "auth" }, { status: 401 });
  const { bootcampId, response } = await req.json();
  const bc = getBootcampById(bootcampId);
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
  markSkillVerified(session.user.id, bc.skill);
  return NextResponse.json({
    passed: true,
    depth: d,
    skill: bc.skill,
    message: `Skill verified: ${bc.skill}. Badge added to your profile.`,
  });
}
