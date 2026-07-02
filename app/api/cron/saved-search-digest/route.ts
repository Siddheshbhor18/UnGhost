import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/server/auth";
import {
  findMatchingCandidatesForSavedSearch,
  getUserById,
  listSavedSearchesByFrequency,
  touchSavedSearchLastRun,
} from "@/server/store";
import {
  sendSavedSearchDigest,
  type SavedSearchDigestMatch,
} from "@/server/integrations/email";
import { withApiErrorTracking } from "@/server/lib/api-error";
import { hasCronBearer } from "@/server/lib/cron-auth";
import { logger } from "@/server/lib/logger";

/**
 * Saved-search weekly digest.
 *
 * Fulfills the recruiter-facing promise on /recruiter/saved-searches: any
 * saved search with alertFrequency === "weekly" gets one email per recruiter
 * per Monday listing new candidates that have appeared in the last 7 days.
 *
 * Scheduled via vercel.json (`0 9 * * 1` = Mondays 9 AM UTC = 2:30 PM IST,
 * a sane recruiter-readable time). Authorisation matches the other crons:
 * Vercel cron uses CRON_SECRET bearer, an admin can also trigger manually.
 */
async function isAuthorised(req: Request): Promise<boolean> {
  if (hasCronBearer(req)) return true;
  const session = await getServerSession(authOptions);
  return session?.user?.role === "admin";
}

const SEVEN_DAYS_MS = 7 * 24 * 60 * 60 * 1000;

async function handler(req: Request) {
  if (!(await isAuthorised(req))) {
    return NextResponse.json({ error: "forbidden" }, { status: 403 });
  }

  const nowIso = new Date().toISOString();
  const sinceIso = new Date(Date.now() - SEVEN_DAYS_MS).toISOString();

  const weeklySearches = await listSavedSearchesByFrequency("weekly");

  // Group searches → matches → recruiter so multiple saved searches collapse
  // into a single digest email per recruiter.
  type PerRecruiter = {
    matches: SavedSearchDigestMatch[];
    touchedIds: string[];
  };
  const perRecruiter = new Map<string, PerRecruiter>();

  let skipped = 0;
  for (const ss of weeklySearches) {
    const matches = await findMatchingCandidatesForSavedSearch(ss, sinceIso);
    if (matches.length === 0) {
      skipped += 1;
      continue;
    }
    const bucket = perRecruiter.get(ss.recruiterId) ?? {
      matches: [],
      touchedIds: [],
    };
    for (const m of matches) {
      const skillBits = m.skillHits.length
        ? m.skillHits.slice(0, 3).join(", ")
        : (m.user.profile?.skills?.slice(0, 3).join(", ") ?? "");
      const city = m.user.profile?.city ? ` · ${m.user.profile.city}` : "";
      bucket.matches.push({
        savedSearchName: ss.name,
        jobOrCandidateLabel: m.user.name || m.user.email,
        link: `/recruiter/candidates/${m.user.id}`,
        summary: `${skillBits}${city}`.trim() || "New candidate match",
      });
    }
    bucket.touchedIds.push(ss.id);
    perRecruiter.set(ss.recruiterId, bucket);
  }

  let sent = 0;
  let errors = 0;
  for (const [recruiterId, bucket] of perRecruiter.entries()) {
    const recruiter = await getUserById(recruiterId);
    if (!recruiter?.email) {
      errors += 1;
      continue;
    }
    const res = await sendSavedSearchDigest(recruiter.email, {
      name: recruiter.name || "there",
      matches: bucket.matches,
    });
    if (res.ok) {
      sent += 1;
      // Only stamp lastRunAt once we've successfully shipped the digest.
      for (const id of bucket.touchedIds) {
        await touchSavedSearchLastRun(id, nowIso);
      }
    } else {
      errors += 1;
      logger.warn(
        { recruiterId, error: res.error },
        "cron.saved-search-digest.send_failed",
      );
    }
  }

  logger.info(
    {
      weeklySearches: weeklySearches.length,
      recruiters: perRecruiter.size,
      sent,
      skipped,
      errors,
    },
    "cron.saved-search-digest",
  );

  return NextResponse.json({ ok: true, sent, skipped, errors });
}

export const POST = withApiErrorTracking(handler);
export const GET = handler;
