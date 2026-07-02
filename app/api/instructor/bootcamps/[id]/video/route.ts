/**
 * PATCH /api/instructor/bootcamps/[id]/video
 *
 * Body: { videoId: string; url: string | null }
 *
 * Sets the playback URL on a single lesson video inside the bootcamp.
 * Used by the instructor studio's per-lesson "Paste YouTube / R2 URL"
 * inline form. Ownership-gated — instructors can only touch their own
 * bootcamp; admins go through a different surface.
 *
 * Pass `url: ""` or `null` to clear and revert to the "uploaded soon"
 * placeholder on the student-side player.
 */
import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { z } from "zod";
import { authOptions } from "@/server/auth";
import { requireSameOrigin } from "@/server/lib/csrf";
import { setBootcampVideoUrl } from "@/server/store";
import { logger } from "@/server/lib/logger";

// URL is stored raw and rendered client-side by <source src>. The <video>
// element itself won't execute `javascript:` schemes, but the same URL leaks
// into anchor links / share sheets elsewhere. Restrict to http(s) so a
// hostile instructor can't plant a `javascript:` payload in the field. Empty
// string + null both mean "clear".
const PatchSchema = z.object({
  videoId: z.string().trim().min(1).max(64),
  url: z
    .string()
    .trim()
    .max(2048)
    .refine(
      (v) => v === "" || /^https?:\/\//i.test(v),
      { message: "url must start with http:// or https://" },
    )
    .nullable()
    .optional(),
});

export async function PATCH(
  request: Request,
  { params }: { params: { id: string } },
): Promise<NextResponse> {
  const csrf = requireSameOrigin(request);
  if (csrf) return csrf;
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) {
    return NextResponse.json({ error: "unauthenticated" }, { status: 401 });
  }
  // Admins can use this too — easier for ops to fix a bad URL than dropping
  // into Mongo. Instructors otherwise must own the bootcamp.
  if (session.user.role !== "instructor" && session.user.role !== "admin") {
    return NextResponse.json({ error: "forbidden" }, { status: 403 });
  }

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "invalid JSON" }, { status: 400 });
  }
  const parsed = PatchSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: parsed.error.issues[0]?.message ?? "invalid input" },
      { status: 400 },
    );
  }

  const result = await setBootcampVideoUrl(
    params.id,
    // Admin path: pass admin id but `setBootcampVideoUrl` will still
    // refuse if the bootcamp's instructorId doesn't match. We override
    // by short-circuiting the ownership check for admins via a separate
    // path — but for v1, admins are expected to act through a different
    // route. Keep this strict for now.
    session.user.id,
    parsed.data.videoId,
    parsed.data.url ?? null,
  );

  if (!result.ok) {
    const status =
      result.reason === "not_found" || result.reason === "video_not_found"
        ? 404
        : result.reason === "forbidden"
          ? 403
          : 400;
    return NextResponse.json({ error: result.reason }, { status });
  }

  logger.info(
    {
      bootcampId: params.id,
      videoId: parsed.data.videoId,
      instructorId: session.user.id,
      cleared: !parsed.data.url,
    },
    "instructor.bootcamp.video.url_updated",
  );

  return NextResponse.json({ ok: true });
}
