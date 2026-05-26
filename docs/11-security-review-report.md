# Core Platform Security Audit & Vulnerability Review

This report provides a comprehensive, senior-level security review of the UnGhost codebase. It evaluates the current security posture, architecture designs, data compliance, and DevOps infrastructure. 

---

## 1. Authentication & Session Management

### 🔑 NextAuth & Credential Validation
- **Secure Configuration**: NextAuth is configured using `strategy: "jwt"` with robust secure cookies (`__Secure-` and `__Host-` prefixes) that block transmission over unencrypted HTTP channels in production.
- **Fail-Fast Secrets**: In production (`process.env.NODE_ENV === "production"`), the app immediately throws a fatal exception during boot if `NEXTAUTH_SECRET` is missing. This prevents running with fallback default literals that would permit session forging.
- **Suspend/Ban Gates**: During credential verification, explicit account status checks (`banned`, `suspended`, and `soft_deleted`) are executed at the authentication layer before JWT tokens are issued. Suspended accounts display human-readable lock-out deadlines and reasons.

### 🛡️ Brute-Force & OTP Lockout
- **Rate-Limiting**: Essential identity endpoints (`/api/auth/reset-password`, `/api/email/forgot-password`, and `/api/upload/presign`) are wrapped in Redis-backed sliding-window rate limiters.
- **Cryptographically Secure Tokens**: Password-reset tokens are generated as 32-byte cryptographically secure random hex strings (`crypto.randomBytes(32)`). They are stored in Redis with a strict 1-hour time-to-live (TTL) and are immediately deleted upon one-shot consumption to prevent replay attacks.

---

## 2. Access Control & Authorization (RBAC)

- **Layered Gating**: The system enforces role-based access control (RBAC) across three roles: `student`, `recruiter`, and `admin`. Role checking occurs early at both the HTTP boundary (controllers) and the database operations layer.
- **Sponsorship & InMail Validation**: Recruiter sponsorship and InMail credit callbacks verify that the `recruiterId` associated with the active `orderId` matches the authenticated `session.user.id` exactly, safely preventing cross-user account tampering.

---

## 3. Data Protection & Compliance (DPDP Act)

- **Data Portability (DPDP § 11)**: The `/api/account/export` endpoint allows users to download structural JSON formats of all database records linked to their account.
- **Right to Erasure (DPDP § 13)**: Hard-deletes trigger a safe deletion routine. Crucially, calling delete automatically issues an AWS SigV4 `DELETE` request to **Cloudflare R2** to purge raw physical uploads (avatars, resume PDFs) from storage, rather than just removing references in MongoDB.

---

## 4. API Safety & Injection Defenses

### 🛡️ Cross-Site Request Forgery (CSRF)
- State-mutating routes (API writes, uploads, joins) are strictly wrapped in the `requireSameOrigin` checker (`server/lib/csrf.ts`). This checks that `Origin` or `Referer` headers match the verified domain host (or custom Cloudflare wildcards), rejecting malicious third-party cross-site submissions with a `403 Forbidden`.

### 💉 Injection Defenses (SQL & NoSQL)
- **Parameterized Mongoose Queries**: All database lookups are routed through Mongoose models using clean parameters or Zod validations.
- **Regex Protection**: Dynamic regex queries (such as looking up users by email) wrap inputs in a strict escape utility (`escapeRegex`):
  ```typescript
  function escapeRegex(s: string) {
    return s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  }
  ```
  This fully mitigates NoSQL injection vectors via malicious regex characters (e.g. `.*`).

### 📦 Input Validation & Object Keys
- State-mutating route handlers enforce strict Zod schemas (`parseBody`) at the API boundary, immediately stripping undeclared properties to prevent object injection or mass-assignment vulnerabilities.
- Uploaded object keys in Cloudflare R2 are assigned unique, non-predictable 8-byte hex prefixes (`crypto.randomBytes(8)`). This blocks path traversal and enumeration attacks on user-uploaded resumes.

---

## 5. Observability & Logging Leakage (PII Redaction)

- Pino structured logging (`server/lib/logger.ts`) enforces strict redaction policies:
  ```typescript
  redact: {
    paths: [
      "password",
      "passwordHash",
      "*.password",
      "*.passwordHash",
      "req.headers.authorization",
      "req.headers.cookie",
      "creds.password",
      "body.password",
      "body.token",
    ],
    censor: "[REDACTED]",
  }
  ```
  This guarantees that sensitive credential payloads, auth headers, cookies, and tokens are never written to standard outputs or indexed in external ELK/Datadog logs.

---

## 6. Identified Risks & Vulnerability Report

While the platform is highly secure, the following configurations represent potential risks:

### ⚠️ Risk 1: Mock Mode Silent Fallback in Production (Severity: MEDIUM)
* **Description**: If production environment variables (`UPSTASH_REDIS_REST_URL` or `UPSTASH_REDIS_REST_TOKEN`) are missing, the Redis client silently falls back to a process-local `mockClient` in-memory Map. 
* **Security Risk**: If this occurs in production, rate-limiting, OTP codes, brute-force lockouts, and payment idempotency states will be isolated to process memory. Under a multi-container horizontal scale, rate limiters would be completely bypassed, and logins/OTPs would fail across requests due to split-brain memory states.
* **Proposed Fix**: Add a fail-fast startup assertion that throws a fatal error in production mode if Upstash credentials are missing.

### ⚠️ Risk 2: Hardcoded Secrets in Local Configuration Example (Severity: LOW)
* **Description**: `.env.example` documents standard fallback values for developers. While standard, developers might occasionally deploy these template values to production.
* **Proposed Fix**: Enforce strict compile-time checks in `next.config.mjs` or server startup files to reject any production builds carrying known template secrets.

### ⚠️ Risk 3: Lack of Rate Limiting on standard GET endpoints (Severity: LOW)
* **Description**: While POST/PATCH mutation API endpoints are strictly rate-limited, standard public view requests (`GET /`) rely on simple CDN caches rather than endpoint-specific IP rate limiters.
* **Proposed Fix**: Apply global Cloudflare Page Rules/WAF rate-limits on the frontend proxy layer to absorb massive bot scraping.
