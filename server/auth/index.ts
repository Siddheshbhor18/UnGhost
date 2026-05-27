import type { AuthOptions } from "next-auth";
import CredentialsProvider from "next-auth/providers/credentials";
import GoogleProvider from "next-auth/providers/google";
import {
  getUserByEmail,
  setUserPasswordHash,
  upsertOAuthUser,
} from "@/server/store";
import { hashPassword, verifyPassword } from "@/server/auth/password";
import type { Role } from "@/shared/types";

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
      async authorize(creds) {
        if (!creds?.email || !creds.password) return null;
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

        // Phone-verification gate REMOVED. We dropped MSG91 / SMS OTP from
        // the platform — email is the sole identity factor. Password resets
        // use Resend, signup verifies the email but never the phone.
        // Email-verification is informational, not blocking — UI surfaces a
        // banner after sign-in so the user can click the link any time.

        return {
          id: user.id,
          name: user.name,
          email: user.email,
          image: user.avatarUrl,
          role: user.role,
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

      try {
        const mongoUser = await upsertOAuthUser({
          email,
          name: user.name ?? undefined,
          avatarUrl: user.image ?? undefined,
          oauthProvider: provider,
        });
        // Mutate the user object so jwt({user}) picks these up on first signin.
        (user as any).id = mongoUser.id;
        (user as any).role = mongoUser.role;
        return true;
      } catch (err) {
        // Don't leak DB errors to the OAuth screen — log and refuse.
        // The user sees a generic "could not sign in" and can retry.
        console.error("[auth] OAuth upsert failed", err);
        return false;
      }
    },
    async jwt({ token, user }) {
      if (user) {
        const u = user as any;
        token.id = u.id;
        token.role = u.role;
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
  return "/dashboard";
}
