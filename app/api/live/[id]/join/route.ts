/**
 * GET /api/live/[id]/join — masked egress for external-platform sessions.
 *
 * External sessions (Zoho Meet, Google Meet, …) keep their meeting link
 * server-side (`externalJoinUrl` is `select: false` in the schema; the only
 * reader is `getExternalJoinTarget`). Students never see the URL in the DOM
 * or any API body — the card's CTA is a plain top-level navigation to this
 * route, which authenticates, enforces the paid-tier enrolment gate, records
 * attendance, and answers with a 302.
 *
 * Failure paths redirect to friendly surfaces (this is a navigation, not an
 * XHR): login for anonymous users, the bootcamp paywall for the unenrolled.
 * No response — success or failure — ever carries the external URL in its
 * body, and the only Location it appears in is the final authorised 302.
 */
import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/server/auth";
import {
  getExternalJoinTarget,
  recordExternalSessionJoin,
} from "@/server/store";
import { withRateLimit } from "@/server/lib/with-rate-limit";
import { withApiErrorTracking } from "@/server/lib/api-error";
import { connectMongo } from "@/server/db/mongo";
import { UserModel } from "@/server/db/models";
import { logger } from "@/server/lib/logger";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

interface Ctx {
  params: { id: string };
}

interface UserProfileEnrolments {
  profile?: { enrolledBootcamps?: string[] };
}

function redirectTo(req: Request, path: string): NextResponse {
  return NextResponse.redirect(new URL(path, req.url), 302);
}

async function handler(req: Request, { params }: Ctx): Promise<Response> {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) {
    // Top-level navigation: bounce through login and re-enter this route.
    // `safeNext` on the login page accepts same-origin absolute paths.
    return redirectTo(
      req,
      `/login?next=${encodeURIComponent(`/api/live/${params.id}/join`)}`,
    );
  }

  // The enrolment doc is only consulted on the paid-student path, but firing
  // it alongside the session read costs one wasted indexed point-read at
  // worst and saves a serial DB round-trip on the common student join.
  const [target, joiner] = await Promise.all([
    getExternalJoinTarget(params.id),
    session.user.role === "student"
      ? connectMongo().then(
          () =>
            UserModel.findById(session.user.id)
              .select("profile.enrolledBootcamps")
              .lean() as Promise<UserProfileEnrolments | null>,
        )
      : Promise.resolve(null),
  ]);
  if (!target) {
    return NextResponse.json({ error: "not_found" }, { status: 404 });
  }
  if (target.sessionType !== "external") {
    return NextResponse.json(
      { error: "not_external_session" },
      { status: 400 },
    );
  }

  const fallback = target.bootcampId
    ? `/bootcamp/${target.bootcampId}`
    : "/student/live";

  // Ended/cancelled sessions: the card is stale — land the student back on
  // the bootcamp page where the recording will surface as a lesson.
  if (target.status !== "scheduled" && target.status !== "live") {
    return redirectTo(req, fallback);
  }

  // Paid sessions are deny-by-default: ONLY the owning instructor, an
  // admin, or an enrolled student may pass. Everyone else — including
  // recruiters, creators, and OTHER instructors — lands on the paywall.
  // (Stricter than playback-token's student-only check on purpose: this
  // route hands out the raw meeting URL, not a scoped playback token.)
  // Enrolment reads *bootcamp enrolment*, never registeredStudentIds —
  // registration is open to any logged-in user and must not unlock paid
  // content.
  const isOwner = session.user.id === target.instructorId;
  const isAdmin = session.user.role === "admin";
  if (target.tier === "paid" && target.bootcampId && !isOwner && !isAdmin) {
    const enrolled = joiner?.profile?.enrolledBootcamps ?? [];
    const isEnrolledStudent =
      session.user.role === "student" && enrolled.includes(target.bootcampId);
    if (!isEnrolledStudent) {
      // Ineligible callers land on the paywall — never the meeting URL.
      return redirectTo(req, fallback);
    }
  }

  if (!target.externalJoinUrl) {
    // Data-integrity guard: external sessions are created with a link, but
    // never 500 on a bad document — send the student somewhere useful.
    logger.warn(
      { sessionId: params.id },
      "live.external.join_url_missing",
    );
    return redirectTo(req, fallback);
  }

  // Attendance only for students — instructors/admins previewing their own
  // session shouldn't inflate the attended list.
  if (session.user.role === "student") {
    await recordExternalSessionJoin(params.id, session.user.id);
  }

  // Never log the URL itself — it's the secret this route exists to protect.
  logger.info(
    { sessionId: params.id, userId: session.user.id },
    "live.external.join",
  );

  return NextResponse.redirect(target.externalJoinUrl, 302);
}

export const GET = withRateLimit(
  { bucket: "live.join", limit: 10, windowSec: 300, by: "user" },
  withApiErrorTracking(handler),
);
