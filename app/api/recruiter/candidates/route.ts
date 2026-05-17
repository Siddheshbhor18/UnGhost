import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/server/auth";
import {
  searchCandidates,
  type CandidateSearchFilters,
} from "@/server/store";

export const runtime = "nodejs";

export async function POST(req: Request) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id || session.user.role !== "recruiter") {
    return NextResponse.json({ error: "recruiters only" }, { status: 403 });
  }
  const body = (await req.json().catch(() => ({}))) as CandidateSearchFilters;
  const results = await searchCandidates(body);

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
