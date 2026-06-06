import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/server/auth";
import { requireSameOrigin } from "@/server/lib/csrf";
import {
  getBootcampById,
  listAdminUserIds,
  notify,
  setBootcampStatus,
} from "@/server/store";
import { logger } from "@/server/lib/logger";

export const runtime = "nodejs";

/**
 * Instructor submits bootcamp for admin review. Transitions draft → in_review,
 * notifies the admin pool. PRD: Bootcamp can't publish without admin approval.
 */
export async function POST(
  _req: Request,
  { params }: { params: { id: string } },
) {
  const csrf = requireSameOrigin(_req);
  if (csrf) return csrf;
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

  // Confirm to the instructor.
  await notify({
    userId: bc.instructorId,
    kind: "system",
    priority: "normal",
    title: "Bootcamp submitted for review",
    body: `"${bc.title}" is now in the admin review queue. Typical turnaround: 48 hours.`,
    link: `/instructor/studio/${bc.id}`,
  });

  // Fan out to every admin so the review queue gets eyes promptly. If there
  // are zero admins (early dev DB), we log a warning so it can be fixed.
  const admins = await listAdminUserIds();
  if (admins.length === 0) {
    logger.warn(
      { bootcampId: bc.id },
      "bootcamp.submit-no-admins-to-notify",
    );
  }
  await Promise.all(
    admins.map((adminId) =>
      notify({
        userId: adminId,
        kind: "system",
        priority: "high",
        title: "New bootcamp awaiting review",
        body: `${bc.title} by instructor ${bc.instructorId} — ${bc.skill}.`,
        link: `/admin/bootcamps`,
        actionRequired: true,
      }),
    ),
  );

  return NextResponse.json({
    ok: true,
    status: "in_review",
    adminsNotified: admins.length,
  });
}
