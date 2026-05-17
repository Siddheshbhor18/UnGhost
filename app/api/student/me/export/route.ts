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
} from "@/server/store";

export const runtime = "nodejs";

/**
 * DPDP-style data export. Returns a JSON bundle of everything the platform
 * stores about the user. Real impl per PRD: queue a job, generate within 30
 * days, email a signed-URL link with a 30-day expiry. Phase 1 returns inline.
 */
export async function GET() {
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
  const bundle = {
    exportedAt: new Date().toISOString(),
    dpdpVersion: "1.0",
    dataResidency: "ap-south-1 · Mumbai",
    user,
    applications,
    sponsorships,
    inmails,
    threads,
    notifications,
  };
  return new NextResponse(JSON.stringify(bundle, null, 2), {
    headers: {
      "content-type": "application/json",
      "content-disposition": `attachment; filename="unghost-data-${uid}.json"`,
    },
  });
}
