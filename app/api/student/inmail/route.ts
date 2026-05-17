import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/server/auth";
import { listInMailsByStudent } from "@/server/store";

export const runtime = "nodejs";

export async function GET() {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id || session.user.role !== "student") {
    return NextResponse.json([], { status: 200 });
  }
  return NextResponse.json(await listInMailsByStudent(session.user.id));
}
