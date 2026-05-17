import { NextResponse } from "next/server";
import { listBootcamps } from "@/server/store";

export const runtime = "nodejs";

export async function GET(req: Request) {
  const url = new URL(req.url);
  const skill = url.searchParams.get("skill");
  const all = await listBootcamps();
  if (skill) {
    const lower = skill.toLowerCase();
    return NextResponse.json(
      all.filter((b) => b.skill.toLowerCase() === lower),
    );
  }
  return NextResponse.json(all);
}
