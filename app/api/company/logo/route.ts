import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/server/auth";
import { requireSameOrigin } from "@/server/lib/csrf";
import { uploadObject, storageMode } from "@/server/integrations/storage";
import { getUserById, getCompanyById, setCompanyLogo } from "@/server/store";
import {
  rateLimit,
  rateLimitResponse,
  identifierFromRequest,
} from "@/server/lib/rate-limit";

export const runtime = "nodejs";

const MAX_FILE_MB = 2;
const ALLOWED_TYPES: Record<string, string> = {
  "image/png": ".png",
  "image/jpeg": ".jpg",
  "image/webp": ".webp",
  "image/svg+xml": ".svg",
};

/**
 * Resolve the authenticated caller to a company they're allowed to brand.
 * Only recruiters who are their company's admin may change the logo.
 */
async function resolveCompanyAdmin(userId: string) {
  const user = await getUserById(userId);
  if (!user || user.role !== "recruiter") {
    return { error: "recruiters only", status: 403 as const };
  }
  if (!user.companyId) {
    return { error: "no_company", status: 400 as const };
  }
  if (!user.isCompanyAdmin) {
    return { error: "company_admin_only", status: 403 as const };
  }
  const company = await getCompanyById(user.companyId);
  if (!company) return { error: "company_not_found", status: 404 as const };
  return { company };
}

export async function POST(req: Request) {
  const csrf = requireSameOrigin(req);
  if (csrf) return csrf;

  const session = await getServerSession(authOptions);
  if (!session?.user?.id) {
    return NextResponse.json({ error: "unauthenticated" }, { status: 401 });
  }

  const rl = await rateLimit("company-logo", identifierFromRequest(req, session.user.id), {
    limit: 10,
    windowSec: 60,
  });
  if (!rl.allowed) return rateLimitResponse(rl);

  const resolved = await resolveCompanyAdmin(session.user.id);
  if ("error" in resolved) {
    return NextResponse.json({ error: resolved.error }, { status: resolved.status });
  }

  const form = await req.formData().catch(() => null);
  const file = form?.get("file");
  if (!(file instanceof File)) {
    return NextResponse.json({ error: "no_file" }, { status: 400 });
  }
  const ext = ALLOWED_TYPES[file.type];
  if (!ext) {
    return NextResponse.json({ error: "unsupported_type" }, { status: 415 });
  }
  if (file.size > MAX_FILE_MB * 1024 * 1024) {
    return NextResponse.json({ error: "file_too_large" }, { status: 413 });
  }

  const body = new Uint8Array(await file.arrayBuffer());
  const { publicUrl, key } = await uploadObject({
    prefix: "logos",
    contentType: file.type,
    filename: `logo${ext}`,
    body,
  });

  // R2 returns a real CDN URL. In mock/dev mode the publicUrl is a `mock://`
  // placeholder that an <img> can't load, so point at the local serve route.
  const logoUrl =
    storageMode() === "mock"
      ? `/api/company/logo/file?key=${encodeURIComponent(key)}`
      : publicUrl;

  await setCompanyLogo(resolved.company.id, logoUrl);

  return NextResponse.json({ ok: true, logoUrl });
}

/** Clear the company logo (revert to the letter-initial fallback). */
export async function DELETE(req: Request) {
  const csrf = requireSameOrigin(req);
  if (csrf) return csrf;

  const session = await getServerSession(authOptions);
  if (!session?.user?.id) {
    return NextResponse.json({ error: "unauthenticated" }, { status: 401 });
  }

  const resolved = await resolveCompanyAdmin(session.user.id);
  if ("error" in resolved) {
    return NextResponse.json({ error: resolved.error }, { status: resolved.status });
  }

  await setCompanyLogo(resolved.company.id, "");
  return NextResponse.json({ ok: true, logoUrl: "" });
}
