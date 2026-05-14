import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { updateApplicationStage } from "@/lib/data/store";
import type { Stage } from "@/lib/data/types";

export const runtime = "nodejs";

export async function POST(req: Request, { params }: { params: { id: string } }) {
  const session = await getServerSession(authOptions);
  if (!session || session.user.role === "student") {
    return NextResponse.json({ error: "forbidden" }, { status: 403 });
  }
  const { stage, outcomeNotes } = await req.json();
  const app = updateApplicationStage(params.id, stage as Stage, outcomeNotes);
  if (!app) return NextResponse.json({ error: "not found" }, { status: 404 });
  return NextResponse.json(app);
}
