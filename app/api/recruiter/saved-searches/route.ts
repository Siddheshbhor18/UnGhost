import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/server/auth";
import { requireSameOrigin } from "@/server/lib/csrf";
import {
  createSavedSearch,
  listSavedSearches,
} from "@/server/store";
import type { SavedSearch } from "@/shared/types";

export const runtime = "nodejs";

const FREQS: SavedSearch["alertFrequency"][] = [
  "off",
  "instant",
  "daily",
  "weekly",
];

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
  const body = (await req.json().catch(() => null)) as {
    name: string;
    filtersJson: string;
    alertFrequency: SavedSearch["alertFrequency"];
  } | null;
  if (!body?.name?.trim() || !body.filtersJson) {
    return NextResponse.json(
      { error: "name + filtersJson required" },
      { status: 400 },
    );
  }
  // Bound the stored blob so a client can't persist an arbitrarily large string.
  if (typeof body.filtersJson !== "string" || body.filtersJson.length > 4000) {
    return NextResponse.json({ error: "filtersJson too large" }, { status: 413 });
  }
  if (!FREQS.includes(body.alertFrequency)) {
    return NextResponse.json(
      { error: "invalid alertFrequency" },
      { status: 400 },
    );
  }
  const out = await createSavedSearch({
    recruiterId: session.user.id,
    name: body.name.trim().slice(0, 80),
    filtersJson: body.filtersJson,
    alertFrequency: body.alertFrequency,
  });
  return NextResponse.json(out, { status: 201 });
}
