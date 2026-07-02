import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { z } from "zod";
import { authOptions } from "@/server/auth";
import { requireSameOrigin } from "@/server/lib/csrf";
import { parseBody } from "@/server/lib/validate";
import { searchCandidates } from "@/server/store";

export const runtime = "nodejs";

// Filters mirror `CandidateSearchFilters`. Explicit bounds stop an attacker
// from sending a mega-array of skills to burn CPU on the JS-side scan, or a
// non-string `query` that would throw in `.split()`. Every field optional —
// the store treats absence as "don't filter on this".
const Input = z.object({
  query: z.string().trim().max(500).optional(),
  skills: z.array(z.string().trim().max(60)).max(20).optional(),
  city: z.string().trim().max(80).optional(),
  remotePref: z.enum(["remote", "hybrid", "onsite"]).optional(),
  minYearsExperience: z.number().int().min(0).max(60).optional(),
  verifiedOnly: z.boolean().optional(),
  topPerformersOnly: z.boolean().optional(),
  trajectory: z
    .enum(["actively_hunting", "casually_exploring", "open_to_magic"])
    .optional(),
});

export async function POST(req: Request) {
  const csrf = requireSameOrigin(req);
  if (csrf) return csrf;
  const session = await getServerSession(authOptions);
  if (!session?.user?.id || session.user.role !== "recruiter") {
    return NextResponse.json({ error: "recruiters only" }, { status: 403 });
  }
  const parsed = await parseBody(req, Input);
  if (!parsed.ok) return parsed.response;
  const results = await searchCandidates(parsed.data);

  // Anonymise PII for cards (recruiter unlocks via InMail).
  const anonymised = results.map((r) => ({
    candidateId: r.user.id,
    score: r.score,
    skillHits: r.skillHits,
    isAnonymous: r.user.profile?.applicationIdentity === "anonymous",
    // Identity revealed only if student opted into named
    publicName:
      r.user.profile?.applicationIdentity === "anonymous"
        ? null
        : r.user.name,
    headline:
      r.user.profile?.history?.[0]?.title ??
      `${r.user.profile?.skills?.[0] ?? "Generalist"} candidate`,
    city: r.user.profile?.city ?? null,
    remotePref: r.user.profile?.remotePref ?? null,
    yearsExperience: r.user.profile?.yearsExperience ?? null,
    trajectory: r.user.profile?.trajectory,
    skills: r.user.profile?.skills?.slice(0, 8) ?? [],
    verifiedSkills: r.user.profile?.verifiedSkills ?? [],
    topPerformer: (r.user.profile?.verifiedSkills?.length ?? 0) >= 2,
  }));
  return NextResponse.json(anonymised);
}
