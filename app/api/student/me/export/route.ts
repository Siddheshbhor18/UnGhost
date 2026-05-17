import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/server/auth";
import {
  getUserById,
  listApplicationsByStudent,
  listInMailsByStudent,
  listMessageThreadsForUser,
  listNotifications,
  listSponsorshipsByStudent,
  writeAuditLog,
} from "@/server/store";
import { withApiErrorTracking } from "@/server/lib/api-error";
import { withRateLimit } from "@/server/lib/with-rate-limit";

export const runtime = "nodejs";

/**
 * GET /api/student/me/export
 *
 * DPDP-style data export. Returns a JSON bundle of everything the platform
 * stores about the user — direct download.
 *
 * Audit-logged: every export creates an `account.exported` audit row so we
 * can prove compliance to regulators and detect abuse.
 *
 * Rate-limited at 5 / 24h / user. Real prod for >1MB profiles will move to
 * Inngest + R2 + signed URL but inline is fine for launch (median profile
 * fits in ~50KB).
 */
async function handler(_req: Request) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }
  const uid = session.user.id;
  const [user, applications, sponsorships, inmails, threads, notifications] =
    await Promise.all([
      getUserById(uid),
      listApplicationsByStudent(uid),
      listSponsorshipsByStudent(uid),
      listInMailsByStudent(uid),
      listMessageThreadsForUser(uid),
      listNotifications(uid, { limit: 500 }),
    ]);
  if (!user) {
    return NextResponse.json({ error: "not_found" }, { status: 404 });
  }

  // Strip the password hash — never leaves the DB.
  const safeUser = { ...user, passwordHash: "[redacted]" };

  const bundle = {
    exportedAt: new Date().toISOString(),
    dpdpVersion: "1.0",
    dataResidency: "ap-south-1 · Mumbai",
    user: safeUser,
    applications,
    sponsorships,
    inmails,
    threads,
    notifications,
  };

  await writeAuditLog({
    actorId: uid,
    actorRole: (user.role as "student" | "recruiter") ?? "student",
    action: "account.exported",
    targetType: "user",
    targetId: uid,
    summary: `DPDP export · ${applications.length} apps · ${threads.length} threads`,
  });

  return new NextResponse(JSON.stringify(bundle, null, 2), {
    headers: {
      "content-type": "application/json",
      "content-disposition": `attachment; filename="unghost-data-${uid}.json"`,
    },
  });
}

export const GET = withRateLimit(
  { bucket: "dpdp.export", limit: 5, windowSec: 86400, by: "user" },
  withApiErrorTracking(handler),
);
