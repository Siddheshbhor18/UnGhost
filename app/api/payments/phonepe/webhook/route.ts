import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { enrollStudentInBootcamp } from "@/lib/data/store";

export const runtime = "nodejs";

// Mock webhook: PhonePe success → enroll student in bootcamp.
export async function POST(req: Request) {
  const session = await getServerSession(authOptions);
  if (!session) return NextResponse.json({ error: "auth" }, { status: 401 });
  const { bootcampId, status } = await req.json();
  if (status !== "SUCCESS") {
    return NextResponse.json({ ok: false });
  }
  const bc = enrollStudentInBootcamp(session.user.id, bootcampId);
  return NextResponse.json({ ok: true, bootcamp: bc });
}
