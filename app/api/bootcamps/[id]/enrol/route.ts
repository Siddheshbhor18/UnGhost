import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/server/auth";
import {
  enrollStudentInBootcamp,
  getBootcampById,
  getUserById,
} from "@/server/store";
import { effectivePlan, ownsCourse } from "@/server/lib/quota";
import { requireSameOrigin } from "@/server/lib/csrf";

export const runtime = "nodejs";

interface Ctx {
  params: { id: string };
}

/**
 * POST → enrol the authenticated student in a bootcamp.
 *
 * Bootcamp access is per-course (room) ownership:
 *   - owns the course (or grandfathered premium) → enrol immediately
 *   - otherwise → 402; UI sends the buyer to /bootcamps/checkout?course=…
 *
 * Course purchases run through the Razorpay flow (see
 * `/api/payments/razorpay/order` with `kind: "courses"`).
 */
export async function POST(req: Request, { params }: Ctx) {
  const csrf = requireSameOrigin(req);
  if (csrf) return csrf;
  const session = await getServerSession(authOptions);
  if (!session?.user?.id || session.user.role !== "student") {
    return NextResponse.json({ error: "students only" }, { status: 403 });
  }
  const [user, bootcamp] = await Promise.all([
    getUserById(session.user.id),
    getBootcampById(params.id),
  ]);
  if (!user || !bootcamp) {
    return NextResponse.json({ error: "not_found" }, { status: 404 });
  }
  if (bootcamp.status !== "published" && bootcamp.status !== undefined) {
    return NextResponse.json({ error: "bootcamp_not_published" }, { status: 409 });
  }
  if (bootcamp.enrolledStudentIds?.includes(user.id)) {
    return NextResponse.json({ ok: true, alreadyEnrolled: true, bootcamp });
  }

  if (!ownsCourse(user, bootcamp.category)) {
    return NextResponse.json(
      {
        error: "course_required",
        plan: effectivePlan(user),
        courseId: bootcamp.category,
        message:
          "This bootcamp is part of a course you don't own yet. Buy the course to unlock every cohort in it.",
        purchaseUrl: `/bootcamps/checkout?course=${bootcamp.category}`,
      },
      { status: 402 },
    );
  }

  const updated = await enrollStudentInBootcamp(user.id, params.id);
  return NextResponse.json({ ok: true, bootcamp: updated }, { status: 201 });
}
