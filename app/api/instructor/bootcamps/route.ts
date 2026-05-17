import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/server/auth";
import {
  createBootcamp,
  listBootcampsByInstructor,
} from "@/server/store";
import type { Bootcamp } from "@/shared/types";

export const runtime = "nodejs";

const CATEGORIES: Bootcamp["category"][] = [
  "ai",
  "data_science",
  "marketing",
  "finance",
  "sales",
];

export async function GET() {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id || session.user.role !== "instructor") {
    return NextResponse.json({ error: "forbidden" }, { status: 403 });
  }
  return NextResponse.json(await listBootcampsByInstructor(session.user.id));
}

interface CreateBody {
  title: string;
  skill: string;
  category: Bootcamp["category"];
  description?: string;
  priceINR?: number;
  durationWeeks?: number;
}

export async function POST(req: Request) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id || session.user.role !== "instructor") {
    return NextResponse.json({ error: "instructors only" }, { status: 403 });
  }
  const body = (await req.json().catch(() => null)) as CreateBody | null;
  if (!body?.title?.trim() || !body.skill?.trim() || !body.category) {
    return NextResponse.json(
      { error: "title, skill, category required" },
      { status: 400 },
    );
  }
  if (!CATEGORIES.includes(body.category)) {
    return NextResponse.json(
      { error: "invalid category" },
      { status: 400 },
    );
  }
  const bc = await createBootcamp({
    instructorId: session.user.id,
    title: body.title.trim(),
    skill: body.skill.trim(),
    category: body.category,
    description: body.description,
    priceINR: body.priceINR,
    durationWeeks: body.durationWeeks,
  });
  return NextResponse.json(bc, { status: 201 });
}
