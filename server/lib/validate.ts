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
 * Never returns raw zod messages to the client in production — Phase 1 keeps
 * them for DX; replace with a generic message in Sprint D Day 1.
 */
import { NextResponse } from "next/server";
import type { ZodSchema } from "zod";

export type ParseResult<T> =
  | { ok: true; data: T }
  | { ok: false; response: NextResponse };

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
    return {
      ok: false,
      response: NextResponse.json(
        {
          error: "invalid_input",
          issues: result.error.issues.map((i) => ({
            path: i.path.join("."),
            message: i.message,
          })),
        },
        { status: 400 },
      ),
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
    return {
      ok: false,
      response: NextResponse.json(
        {
          error: "invalid_query",
          issues: result.error.issues.map((i) => ({
            path: i.path.join("."),
            message: i.message,
          })),
        },
        { status: 400 },
      ),
    };
  }
  return { ok: true, data: result.data };
}
