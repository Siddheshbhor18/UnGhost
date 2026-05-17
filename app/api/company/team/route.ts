import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/server/auth";
import {
  getUserById,
  listCompanyRecruiters,
} from "@/server/store";

export const runtime = "nodejs";

export async function GET() {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id || session.user.role !== "recruiter") {
    return NextResponse.json({ error: "recruiters only" }, { status: 403 });
  }
  const user = await getUserById(session.user.id);
  if (!user?.companyId) {
    return NextResponse.json([], { status: 200 });
  }
  return NextResponse.json(await listCompanyRecruiters(user.companyId));
}
