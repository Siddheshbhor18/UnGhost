/**
 * GET /api/instructor/grading
 *
 * Returns the auth'd instructor's submission queue across all bootcamps
 * they own. Query params:
 *   reviewed=true|false   filter by review status (default: both)
 *   bootcampId=<id>       scope to one bootcamp
 *
 * Used by the /instructor/grading list page. The page itself is a server
 * component that calls the store helper directly, so this endpoint is
 * primarily for the client-side refresh after an override lands.
 */
import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/server/auth";
import { listInstructorSubmissions } from "@/server/store";

export const runtime = "nodejs";

export async function GET(request: Request): Promise<NextResponse> {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) {
    return NextResponse.json({ error: "unauthenticated" }, { status: 401 });
  }
  if (session.user.role !== "instructor") {
    return NextResponse.json({ error: "forbidden" }, { status: 403 });
  }
  const url = new URL(request.url);
  const reviewedParam = url.searchParams.get("reviewed");
  const reviewed =
    reviewedParam === "true"
      ? true
      : reviewedParam === "false"
        ? false
        : undefined;
  const bootcampId = url.searchParams.get("bootcampId") ?? undefined;
  const rows = await listInstructorSubmissions(session.user.id, {
    reviewed,
    bootcampId,
  });
  return NextResponse.json({ rows });
}
