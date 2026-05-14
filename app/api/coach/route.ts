import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { getAI } from "@/lib/ai";
import { getUserById } from "@/lib/data/store";

export const runtime = "nodejs";

export async function POST(req: Request) {
  const session = await getServerSession(authOptions);
  const body = await req.json().catch(() => ({}));
  const history = Array.isArray(body.history) ? body.history : [];
  const profile = session?.user?.id
    ? getUserById(session.user.id)?.profile
    : undefined;
  const reply = await getAI().chatCoach(history, profile);
  return NextResponse.json(reply);
}
