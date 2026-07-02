import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { z } from "zod";
import { authOptions } from "@/server/auth";
import { requireSameOrigin } from "@/server/lib/csrf";
import { parseBody } from "@/server/lib/validate";
import {
  enrollStudentInBootcamp,
  getBootcampById,
  getSponsorshipById,
  getUserById,
  notify,
  updateSponsorshipStatus,
} from "@/server/store";

export const runtime = "nodejs";

const Input = z.object({ action: z.enum(["accept", "decline"]) });

export async function PATCH(
  req: Request,
  { params }: { params: { id: string } },
) {
  const csrf = requireSameOrigin(req);
  if (csrf) return csrf;
  const session = await getServerSession(authOptions);
  if (!session?.user?.id || session.user.role !== "student") {
    return NextResponse.json({ error: "students only" }, { status: 403 });
  }
  const sp = await getSponsorshipById(params.id);
  if (!sp || sp.studentId !== session.user.id) {
    return NextResponse.json({ error: "not found" }, { status: 404 });
  }
  if (sp.status !== "offered") {
    return NextResponse.json(
      { error: `sponsorship is already ${sp.status}` },
      { status: 409 },
    );
  }
  if (new Date(sp.expiresAt).getTime() < Date.now()) {
    await updateSponsorshipStatus(sp.id, "expired");
    return NextResponse.json(
      { error: "this sponsorship offer has expired" },
      { status: 410 },
    );
  }
  const parsed = await parseBody(req, Input);
  if (!parsed.ok) return parsed.response;
  const body = parsed.data;
  const [student, bc] = await Promise.all([
    getUserById(sp.studentId),
    getBootcampById(sp.bootcampId),
  ]);

  if (body?.action === "accept") {
    await enrollStudentInBootcamp(session.user.id, sp.bootcampId);
    const updated = await updateSponsorshipStatus(sp.id, "accepted");
    await notify({
      userId: sp.recruiterId,
      kind: "sponsorship_accepted",
      priority: "high",
      title: `${student?.name ?? "Candidate"} accepted your sponsorship`,
      body: `Enrolled in ${bc?.title ?? "the bootcamp"} — you'll see progress in the Kanban.`,
      link: "/recruiter/command",
      actorLabel: student?.name,
    });
    return NextResponse.json(updated);
  }
  if (body?.action === "decline") {
    const updated = await updateSponsorshipStatus(sp.id, "declined");
    await notify({
      userId: sp.recruiterId,
      kind: "sponsorship_declined",
      priority: "normal",
      title: `${student?.name ?? "Candidate"} declined your sponsorship`,
      body: `Their slot in ${bc?.title ?? "the bootcamp"} has been released.`,
      link: "/recruiter/command",
      actorLabel: student?.name,
    });
    return NextResponse.json(updated);
  }
  return NextResponse.json({ error: "unknown action" }, { status: 400 });
}
