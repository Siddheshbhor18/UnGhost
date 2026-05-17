import type { AuthOptions } from "next-auth";
import CredentialsProvider from "next-auth/providers/credentials";
import GoogleProvider from "next-auth/providers/google";
import LinkedInProvider from "next-auth/providers/linkedin";
import { getUserByEmail, setUserPasswordHash } from "@/server/store";
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

export const authOptions: AuthOptions = {
  secret: process.env.NEXTAUTH_SECRET ?? "noghost-dev-secret-change-in-prod",
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
    ...(process.env.LINKEDIN_CLIENT_ID && process.env.LINKEDIN_CLIENT_SECRET
      ? [
          LinkedInProvider({
            clientId: process.env.LINKEDIN_CLIENT_ID,
            clientSecret: process.env.LINKEDIN_CLIENT_SECRET,
          }),
        ]
      : []),
  ],
  pages: {
    signIn: "/login",
  },
  callbacks: {
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
