import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/server/auth";
import { getUserById } from "@/server/store";

export const runtime = "nodejs";

/**
 * GET /api/auth/verify-status
 *
 * Tiny session-scoped probe for the soft email-verification banner. Returns
 * the CURRENT verified flag straight from the store (not the 30-day JWT, which
 * would go stale the moment the user verifies). Anonymous callers get a flat
 * `{ authenticated: false }` so the client banner can no-op without leaking
 * anything. No-store: verification state changes mid-session.
 */
export async function GET() {
  const session = await getServerSession(authOptions);
  const id = (session?.user as { id?: string } | undefined)?.id;
  if (!id) {
    return NextResponse.json(
      { authenticated: false },
      { headers: { "cache-control": "no-store" } },
    );
  }
  const user = await getUserById(id);
  if (!user) {
    return NextResponse.json(
      { authenticated: false },
      { headers: { "cache-control": "no-store" } },
    );
  }
  return NextResponse.json(
    {
      authenticated: true,
      emailVerified: !!user.emailVerified,
      email: user.email,
    },
    { headers: { "cache-control": "no-store" } },
  );
}
