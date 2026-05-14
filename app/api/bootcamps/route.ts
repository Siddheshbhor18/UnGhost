import { NextResponse } from "next/server";
import { listBootcamps } from "@/lib/data/store";

export const runtime = "nodejs";

export async function GET() {
  return NextResponse.json(listBootcamps());
}
