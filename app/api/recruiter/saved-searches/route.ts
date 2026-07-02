import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { z } from "zod";
import { authOptions } from "@/server/auth";
import { requireSameOrigin } from "@/server/lib/csrf";
import { parseBody } from "@/server/lib/validate";
import { createSavedSearch, listSavedSearches } from "@/server/store";

export const runtime = "nodejs";

const Input = z.object({
  name: z.string().trim().min(1).max(80),
  filtersJson: z.string().max(4000),
  alertFrequency: z.enum(["off", "instant", "daily", "weekly"]),
});

export async function GET() {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id || session.user.role !== "recruiter") {
    return NextResponse.json([], { status: 200 });
  }
  return NextResponse.json(await listSavedSearches(session.user.id));
}

export async function POST(req: Request) {
  const csrf = requireSameOrigin(req);
  if (csrf) return csrf;
  const session = await getServerSession(authOptions);
  if (!session?.user?.id || session.user.role !== "recruiter") {
    return NextResponse.json({ error: "recruiters only" }, { status: 403 });
  }
  const parsed = await parseBody(req, Input);
  if (!parsed.ok) return parsed.response;
  const data = parsed.data;
  const out = await createSavedSearch({
    recruiterId: session.user.id,
    name: data.name,
    filtersJson: data.filtersJson,
    alertFrequency: data.alertFrequency,
  });
  return NextResponse.json(out, { status: 201 });
}
