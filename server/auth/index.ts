import type { AuthOptions } from "next-auth";
import CredentialsProvider from "next-auth/providers/credentials";
import GoogleProvider from "next-auth/providers/google";
import {
  getUserByEmail,
  setUserPasswordHash,
  upsertOAuthUser,
} from "@/server/store";
import { hashPassword, verifyPassword } from "@/server/auth/password";
import { rateLimit } from "@/server/lib/rate-limit";
import { clientIpFromHeaders } from "@/server/lib/client-ip";
import { getSessionEpoch } from "@/server/auth/session-epoch";
import { logger } from "@/server/lib/logger";
import type { Role } from "@/shared/types";

/**
 * Pull the caller IP out of the NextAuth request object. NextAuth hands
 * `authorize` a trimmed req with a plain `headers` record (not a web
 * `Headers`), so we read the proxy headers directly. Prefers the trusted,
 * non-spoofable `x-real-ip` (see client-ip.ts) — never the client-controlled
 * leftmost `x-forwarded-for` hop, which would let an attacker rotate the
 * header to bypass the login brute-force throttle below. Falls back to "anon"
 * so the limiter still buckets header-less callers together.
 */
function ipFromAuthReq(req: unknown): string {
  const headers = (req as { headers?: Record<string, string> } | undefined)
    ?.headers;
  return clientIpFromHeaders(
    headers?.["x-real-ip"],
    headers?.["x-forwarded-for"],
  );
}

/**
 * In production we set the secure cookie prefix (`__Secure-`) and force the
 * `Secure` attribute so the browser refuses to transmit the session over HTTP.
 * In dev we drop those so localhost continues to work without TLS.
 */
const isProd = process.env.NODE_ENV === "production";
const sessionCookieName = isProd
  ? "__Secure-next-auth.session-token"
  : "next-auth.session-token";

/**
 * Resolve the JWT signing secret. Hard-fail in production if it's missing
 * — without a real secret, any attacker who knows the previous default
 * literal can forge any user's session JWT. Dev gets a stable fallback so
 * local restarts don't invalidate everyone's session, but that string is
 * NOT acceptable in prod and we'd rather crash on boot than silently
 * accept forged tokens.
 */
function resolveAuthSecret(): string {
  const fromEnv = process.env.NEXTAUTH_SECRET?.trim();
  if (fromEnv) return fromEnv;
  if (isProd) {
    // Throwing here means the process exits before serving any request,
    // which is exactly what we want — visible failure beats silent
    // compromise. Catch this in deploy logs + set the env var.
    throw new Error(
      "FATAL: NEXTAUTH_SECRET is not set. Refusing to start with a known fallback in production. " +
        "Generate one with `openssl rand -base64 32` and set NEXTAUTH_SECRET in your env.",
    );
  }
  // Dev-only stable fallback. Sessions issued with this secret are NOT
  // portable to prod — that's a feature, not a bug.
  return "dev-only-secret-do-not-use-in-prod";
}

export const authOptions: AuthOptions = {
  secret: resolveAuthSecret(),
  session: { strategy: "jwt", maxAge: 60 * 60 * 24 * 30 /* 30 days */ },
  jwt: { maxAge: 60 * 60 * 24 * 30 },
  useSecureCookies: isProd,
  cookies: {
    sessionToken: {
      name: sessionCookieName,
      options: {
        httpOnly: true,
        sameSite: "lax",
        path: "/",
        secure: isProd,
      },
    },
    callbackUrl: {
      name: isProd ? "__Secure-next-auth.callback-url" : "next-auth.callback-url",
      options: { sameSite: "lax", path: "/", secure: isProd },
    },
    csrfToken: {
      name: isProd ? "__Host-next-auth.csrf-token" : "next-auth.csrf-token",
      options: { httpOnly: true, sameSite: "lax", path: "/", secure: isProd },
    },
  },
  providers: [
    CredentialsProvider({
      name: "Credentials",
      credentials: {
        email: { label: "Email", type: "email" },
        password: { label: "Password", type: "password" },
        role: { label: "Role", type: "text" },
      },
      async authorize(creds, req) {
        if (!creds?.email || !creds.password) return null;

        // Brute-force throttle. NextAuth does not rate-limit the credentials
        // callback, so without this the password endpoint is open to
        // unlimited guessing. Two buckets:
        //   • per (ip, email): stops hammering one account.
        //   • per ip: stops credential-stuffing across many accounts.
        // Both count every attempt (success or fail) — legitimate users stay
        // far under the cap; an attacker hits it fast. Throwing surfaces the
        // message on the sign-in form.
        const ip = ipFromAuthReq(req);
        const email = creds.email.toLowerCase();
        // fallbackInProcess: the login throttle must not fail open into an
        // unthrottled guessing oracle if Redis blips — degrade to a
        // per-instance limiter instead.
        const [perAccount, perIp] = await Promise.all([
          rateLimit("login.acct", `${ip}:${email}`, {
            limit: 10,
            windowSec: 300,
            fallbackInProcess: true,
          }),
          rateLimit("login.ip", ip, {
            limit: 50,
            windowSec: 900,
            fallbackInProcess: true,
          }),
        ]);
        if (!perAccount.allowed || !perIp.allowed) {
          logger.warn(
            { ipPrefix: ip.slice(0, 7), bucket: !perAccount.allowed ? "acct" : "ip" },
            "auth.login-rate-limited",
          );
          throw new Error(
            "Too many sign-in attempts. Please wait a few minutes and try again.",
          );
        }

        const user = await getUserByEmail(creds.email);
        if (!user) return null;
        // bcrypt path + legacy-plaintext shim for un-migrated seed rows.
        const { ok, shouldRehash } = await verifyPassword(
          creds.password,
          user.passwordHash,
        );
        if (!ok) return null;
        if (shouldRehash) {
          // Transparent upgrade — never store plaintext after first login.
          const upgraded = await hashPassword(creds.password);
          await setUserPasswordHash(user.id, upgraded).catch(() => {
            /* non-fatal — login still succeeds */
          });
        }

        // Admin-enforced account status gate. Time-bound suspensions auto-lift.
        const status = user.status ?? "active";
        if (status === "banned") {
          throw new Error("Your account has been banned. Contact support.");
        }
        if (status === "suspended") {
          if (
            user.suspendedUntil &&
            new Date(user.suspendedUntil).getTime() > Date.now()
          ) {
            const until = new Date(user.suspendedUntil).toLocaleDateString(
              "en-IN",
            );
            throw new Error(
              `Your account is suspended until ${until}. Reason: ${
                user.suspendedReason ?? "policy violation"
              }`,
            );
          }
        }
        if (status === "soft_deleted") {
          throw new Error(
            "This account is in 30-day deletion grace. Contact support to restore.",
          );
        }

        // Role-tab enforcement (server-side). The sign-in form sends the
        // role tab the visitor picked. If it doesn't match the account's
        // real role, reject HERE — before any session/JWT is issued. The
        // old client-side getSession() check was racy (the cookie is already
        // set by the time it runs) and could be skipped entirely, letting an
        // admin account sign in under the Student tab. This check only ever
        // restricts (it can't grant a role the account doesn't have), so a
        // forged `role` param can't escalate — worst case it matches and is
        // a no-op. We keep the message role-agnostic to avoid revealing that
        // an email belongs to a privileged account.
        const expectedRole =
          typeof creds.role === "string" ? creds.role.trim() : "";
        if (expectedRole && expectedRole !== user.role) {
          logger.warn(
            { ipPrefix: ip.slice(0, 7) },
            "auth.role-tab-mismatch",
          );
          throw new Error(
            "These credentials don't match the selected role. Pick the correct tab and sign in again.",
          );
        }

        // Phone-verification gate REMOVED. We dropped MSG91 / SMS OTP from
        // the platform — email is the sole identity factor. Password resets
        // use Resend, signup verifies the email but never the phone.
        // Email-verification is informational, not blocking — UI surfaces a
        // banner after sign-in so the user can click the link any time.

        // Stamp the token with the user's current revocation epoch so a later
        // ban / suspend / password-reset (which bumps the epoch) invalidates
        // this exact session at the edge.
        // Best-effort — Redis failure falls back to 0 so it never blocks login.
        let epoch = 0;
        try {
          epoch = await getSessionEpoch(user.id);
        } catch {
          /* fail-open — epoch 0 means no revocation check */
        }

        return {
          id: user.id,
          name: user.name,
          email: user.email,
          image: user.avatarUrl,
          role: user.role,
          epoch,
        } as never;
      },
    }),
    ...(process.env.GOOGLE_CLIENT_ID && process.env.GOOGLE_CLIENT_SECRET
      ? [
          GoogleProvider({
            clientId: process.env.GOOGLE_CLIENT_ID,
            clientSecret: process.env.GOOGLE_CLIENT_SECRET,
          }),
        ]
      : []),
  ],
  pages: {
    signIn: "/login",
  },
  callbacks: {
    /**
     * Runs on every sign-in attempt — credentials AND OAuth. For OAuth
     * (Google), the provider hands us a verified email + profile
     * but does NOT create a Mongo row. Without a row, downstream JWT lacks
     * `id`/`role`, and every `/api/student/*` etc. 401s on first OAuth login.
     *
     * We materialise (or fetch existing) the Mongo user here and stuff
     * `id` + `role` back onto the `user` object so the `jwt` callback
     * below sees them on first signin.
     *
     * Credentials path is a no-op — `authorize()` already populated
     * `user.id` + `user.role`. We just pass through.
     */
    async signIn({ user, account }) {
      const provider = account?.provider;
      if (provider !== "google") {
        // Credentials, email-link, etc. — authorize() already set id+role.
        return true;
      }
      // Defensive: an OAuth provider with no email is unusable for us
      // (we key user identity by email). Refuse rather than create a
      // ghost row with a synthesised email — the user would never be
      // able to log in via Credentials and we'd duplicate them on retry.
      const email = user?.email?.trim();
      if (!email) return false;

      // Role intent threaded from the signup screen via a short-lived,
      // first-party cookie set just before the provider redirect. Only ever
      // applied to a BRAND-NEW account (upsertOAuthUser ignores it for
      // existing rows) and recruiter is re-gated to a work-email domain there.
      // Best-effort: any read failure falls back to the default student role,
      // so this can never regress the prior behaviour.
      let requestedRole: Role | undefined;
      try {
        const { cookies } = await import("next/headers");
        const raw = cookies().get("ug_oauth_role")?.value;
        if (raw === "recruiter" || raw === "student") {
          requestedRole = raw;
        }
      } catch {
        /* cookie unreadable in this context — fall back to student default */
      }

      let mongoUser;
      try {
        mongoUser = await upsertOAuthUser({
          email,
          name: user.name ?? undefined,
          avatarUrl: user.image ?? undefined,
          oauthProvider: provider,
          requestedRole,
        });
      } catch (err) {
        logger.error({ err }, "auth.oauth-upsert-failed");
        return false;
      }
      // Mutate the user object so jwt({user}) picks these up on first signin.
      (user as any).id = mongoUser.id;
      (user as any).role = mongoUser.role;
      // Best-effort session epoch — Redis failure must not block sign-in.
      // Falls back to 0 (no revocation) so the user can proceed.
      try {
        (user as any).epoch = await getSessionEpoch(mongoUser.id);
      } catch {
        (user as any).epoch = 0;
      }
      return true;
    },
    async jwt({ token, user }) {
      if (user) {
        const u = user as any;
        token.id = u.id;
        token.role = u.role;
        // Epoch the session was minted at. Edge middleware compares this to the
        // stored epoch and forces re-auth once it moves ahead.
        token.epoch = typeof u.epoch === "number" ? u.epoch : 0;
      }
      return token;
    },
    async session({ session, token }) {
      if (session.user) {
        (session.user as any).id = token.id as string;
        (session.user as any).role = token.role as Role;
      }
      return session;
    },
  },
};

export function rolePath(role: Role): string {
  if (role === "recruiter") return "/recruiter/today";
  if (role === "admin") return "/admin/today";
  if (role === "instructor") return "/instructor/today";
  if (role === "creator") return "/creatordashboard";
  return "/dashboard";
}
