import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/server/auth";
import { cached } from "@/server/lib/cache";
import { SkillModel } from "@/server/db/models";
import { normalizeSkill } from "@/shared/skills";

export const runtime = "nodejs";

interface TaxRow {
  id: string;
  canonicalName: string;
  aliases: string[];
}

/**
 * GET /api/skills/search?q=  — canonical skill typeahead.
 *
 * The taxonomy is tiny (~hundreds of rows), so we cache the whole list and
 * filter/rank in JS rather than query per keystroke. Logged-in only.
 */
export async function GET(req: Request) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) return NextResponse.json([]);

  const all = await cached<TaxRow[]>("skills:all", 300, async () => {
    const docs = await SkillModel.find({})
      .select("_id canonicalName aliases")
      .lean();
    return docs.map((d) => {
      const x = d as { _id: unknown; canonicalName?: string; aliases?: string[] };
      return {
        id: String(x._id),
        canonicalName: x.canonicalName ?? String(x._id),
        aliases: (x.aliases ?? []).map(String),
      };
    });
  });

  const q = normalizeSkill(new URL(req.url).searchParams.get("q") ?? "");
  if (!q) {
    return NextResponse.json(
      all.slice(0, 20).map((s) => ({ id: s.id, canonicalName: s.canonicalName })),
    );
  }

  const ranked = all
    .map((s) => {
      const name = normalizeSkill(s.canonicalName);
      let score = -1;
      if (s.id === q || name === q) score = 100;
      else if (s.id.startsWith(q) || name.startsWith(q)) score = 80;
      else if (s.id.includes(q) || name.includes(q)) score = 50;
      else if (s.aliases.some((a) => normalizeSkill(a).includes(q))) score = 40;
      return { s, score };
    })
    .filter((x) => x.score >= 0)
    .sort((a, b) => b.score - a.score)
    .slice(0, 10)
    .map((x) => ({ id: x.s.id, canonicalName: x.s.canonicalName }));

  return NextResponse.json(ranked);
}
