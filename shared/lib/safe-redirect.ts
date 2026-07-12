/**
 * Same-origin redirect filter for `?next=` query params on auth surfaces.
 *
 * Rejects every open-redirect vector phishers chain through auth flows:
 *   - Full URLs / protocol-relative `//evil.com`
 *   - Backslash-smuggled `/\evil.com`
 *   - `javascript:` / `data:` / `vbscript:` schemes (caught by the
 *     "must start with /" gate)
 *   - Whitespace and ASCII control characters used to fool URL parsers
 *
 * Only returns the input when it is a single-leading-slash absolute path
 * on this origin. Otherwise returns `null` so the caller can fall back to
 * the role's default destination.
 *
 * Used by both `/login` and `/signup`; kept here so the two doors share one
 * predicate (and one test surface).
 */
export function safeNext(next: string | null | undefined): string | null {
  if (!next) return null;
  if (typeof next !== "string") return null;
  if (!next.startsWith("/")) return null;
  if (next.startsWith("//") || next.startsWith("/\\")) return null;
  if (/[\x00-\x1f\s]/.test(next)) return null;
  return next;
}

/**
 * Roles a visitor may pick via `?role=` on the signup wizard.
 *
 * `RolePicker` in the signup variant only exposes student + recruiter cards;
 * instructor + admin accounts are provisioned by ops, not by self-serve.
 * Accepting an unsupported role from the URL would leave the wizard in a
 * broken state (no card matches the initial role, server rejects on submit),
 * so the URL allowlist mirrors what the picker can render.
 *
 * Kept here next to `safeNext` because both gate untrusted URL inputs to
 * the auth surfaces and are tested as a unit.
 */
export type SignupRoleId = "student" | "recruiter";

const SIGNUP_ROLES: Record<SignupRoleId, true> = {
  student: true,
  recruiter: true,
};

/**
 * Resolve a raw `?role=` URL param into a valid signup role, falling back to
 * `student` for anything outside the allowlist (including `null`, the empty
 * string, `admin`, `instructor`, or arbitrary garbage).
 */
export function resolveSignupRole(raw: string | null | undefined): SignupRoleId {
  if (typeof raw !== "string") return "student";
  return (SIGNUP_ROLES as Record<string, true>)[raw] ? (raw as SignupRoleId) : "student";
}

/**
 * Roles a visitor may arrive with via `?role=` on the /login door.
 *
 * Unlike signup (student + recruiter self-serve only), login must accept all
 * four roles: the dedicated `/instructor` and `/admin` entry points redirect
 * here with `?role=instructor` / `?role=admin` so the card can lock itself to
 * that single provisioned role instead of exposing it as a public tab.
 */
export type LoginRoleId = "student" | "recruiter" | "instructor" | "admin";

const LOGIN_ROLES: Record<LoginRoleId, true> = {
  student: true,
  recruiter: true,
  instructor: true,
  admin: true,
};

/**
 * Resolve a raw `?role=` URL param into a valid login role, falling back to
 * `student` for anything outside the allowlist (including `null`, the empty
 * string, or arbitrary garbage).
 */
export function resolveLoginRole(raw: string | null | undefined): LoginRoleId {
  if (typeof raw !== "string") return "student";
  return (LOGIN_ROLES as Record<string, true>)[raw] ? (raw as LoginRoleId) : "student";
}
