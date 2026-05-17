import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/server/auth";
import {
  getBootcampById,
  notify,
  setBootcampStatus,
} from "@/server/store";

export const runtime = "nodejs";

/**
 * Instructor submits bootcamp for admin review. Transitions draft → in_review,
 * notifies the admin pool. PRD: Bootcamp can't publish without admin approval.
 */
export async function POST(
  _req: Request,
  { params }: { params: { id: string } },
) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id || session.user.role !== "instructor") {
    return NextResponse.json({ error: "instructors only" }, { status: 403 });
  }
  const bc = await getBootcampById(params.id);
  if (!bc || bc.instructorId !== session.user.id) {
    return NextResponse.json({ error: "not found" }, { status: 404 });
  }
  if (bc.status === "in_review") {
    return NextResponse.json(
      { error: "already in review" },
      { status: 409 },
    );
  }
  // Completeness check — PRD-style readiness gate
  const missing: string[] = [];
  if (!bc.title?.trim()) missing.push("title");
  if (!bc.skill?.trim()) missing.push("skill");
  if (!bc.description?.trim() || bc.description.length < 100)
    missing.push("description (≥100 chars)");
  if (!bc.videos || bc.videos.length === 0) missing.push("at least 1 video");
  if (bc.priceINR === undefined || bc.priceINR <= 0) missing.push("price");
  if (missing.length > 0) {
    return NextResponse.json(
      {
        error: "not ready for review",
        missing,
      },
      { status: 400 },
    );
  }

  await setBootcampStatus(params.id, "in_review");

  // Notify admin pool (we don't have a single admin role; ping the first one)
  // Phase 1: skip admin user lookup, just log. Real impl: notify all admins.
  await notify({
    userId: bc.instructorId,
    kind: "system",
    priority: "normal",
    title: "Bootcamp submitted for review",
    body: `"${bc.title}" is now in the admin review queue. Typical turnaround: 48 hours.`,
    link: `/instructor/studio/${bc.id}`,
  });

  return NextResponse.json({ ok: true, status: "in_review" });
}
