/**
 * Zod request-validation helpers for App Router API routes.
 *
 * Usage:
 *
 *   import { z } from "zod";
 *   import { parseBody } from "@/server/lib/validate";
 *
 *   const Input = z.object({ phone: z.string().min(10) });
 *
 *   export async function POST(req: Request) {
 *     const parsed = await parseBody(req, Input);
 *     if (!parsed.ok) return parsed.response;        // 400 with details
 *     const { phone } = parsed.data;                 // fully typed
 *     ...
 *   }
 *
 * The wrapper auto-handles:
 *   - JSON.parse errors (returns 400 "bad_json")
 *   - Schema mismatches (returns 400 with the issue list)
 *   - Unknown extra fields are stripped by default
 *
 * In production the schema `issues` array is suppressed — the client only
 * sees a generic `invalid_input` error so we don't leak field-level schema
 * details to attackers probing the API. In dev the issues are kept for DX.
 */
import { NextResponse } from "next/server";
import type { ZodSchema } from "zod";

const isProd = process.env.NODE_ENV === "production";

export type ParseResult<T> =
  | { ok: true; data: T }
  | { ok: false; response: NextResponse };

function invalidInputResponse(
  errorCode: "invalid_input" | "invalid_query",
  issues: Array<{ path: string; message: string }>,
): NextResponse {
  if (isProd) {
    return NextResponse.json(
      {
        error: errorCode,
        message: "One or more fields failed validation.",
      },
      { status: 400 },
    );
  }
  return NextResponse.json({ error: errorCode, issues }, { status: 400 });
}

/** Parse JSON body against a zod schema. Returns NextResponse on failure. */
export async function parseBody<T>(
  req: Request,
  schema: ZodSchema<T>,
): Promise<ParseResult<T>> {
  let raw: unknown;
  try {
    raw = await req.json();
  } catch {
    return {
      ok: false,
      response: NextResponse.json(
        { error: "bad_json", message: "Request body must be valid JSON." },
        { status: 400 },
      ),
    };
  }
  const result = schema.safeParse(raw);
  if (!result.success) {
    const issues = result.error.issues.map((i) => ({
      path: i.path.join("."),
      message: i.message,
    }));
    return {
      ok: false,
      response: invalidInputResponse("invalid_input", issues),
    };
  }
  return { ok: true, data: result.data };
}

/** Parse a URL ?query against a zod schema. */
export function parseQuery<T>(
  req: Request,
  schema: ZodSchema<T>,
): ParseResult<T> {
  const { searchParams } = new URL(req.url);
  const obj: Record<string, string> = {};
  searchParams.forEach((v, k) => {
    obj[k] = v;
  });
  const result = schema.safeParse(obj);
  if (!result.success) {
    const issues = result.error.issues.map((i) => ({
      path: i.path.join("."),
      message: i.message,
    }));
    return {
      ok: false,
      response: invalidInputResponse("invalid_query", issues),
    };
  }
  return { ok: true, data: result.data };
}
