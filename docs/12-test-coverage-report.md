# Global Testing & Coverage Report

This report outlines the current testing structure of the UnGhost platform, the categories of tests currently implemented, exact test counts, current coverage data, and a programmatic roadmap to optimize test coverage to the ideal target of **70% and above**.

---

## 1. Testing Frameworks & Ecosystem

The platform enforces a strict hybrid testing architecture using two major, highly optimized test frameworks:
1. **Vitest (Unit & Integration Testing)**: Runs directly against the Node.js runtime, utilizing a fast, parallelized V8 coverage provider and custom MongoDB/Redis mocks/in-memory servers to maintain high speed.
2. **Playwright (End-to-End Testing)**: Performs real browser automation, verifying routing boundaries, form validation wizards, and active user flows under simulated network configurations.

---

## 2. Test Suites & Coverage Summary

We run a total of **11 Vitest test suites** containing **66 granular assertions** and **2 Playwright E2E spec suites**.

### Vitest Unit & Integration Suites (66 passing assertions)
| Test Suite / File | Type | Purpose | Status |
| :--- | :--- | :--- | :--- |
| `pricing.test.ts` | Unit | Evaluates INR pricing calculations, fractional paise round-off, GST (18%) mathematics, and order parsing patterns. | ✅ PASS (19 tests) |
| `password.test.ts` | Unit | Evaluates bcrypt hash parameters, legacy plaintext migrations, and verification safety. | ✅ PASS (12 tests) |
| `reset-token.test.ts` | Unit | Evaluates forgot-password lifetime verification tokens, expiry checks, and signature validations. | ✅ PASS (5 tests) |
| `store.test.ts` | Integration | Simulates Mongoose model persistence, support ticket creation, email template updates, and data read/writes. | ✅ PASS (5 tests) |
| `csrf.test.ts` | Unit | Tests same-origin request headers, Referer boundaries, and CF preview host exemptions. | ✅ PASS (4 tests) |
| `validate.test.ts` | Unit | Tests Zod schemas against incoming JSON request payloads and URL query params. | ✅ PASS (5 tests) |
| `api-error.test.ts` | Unit | Tests generic API error boundaries, Sentry exception captures, and Request ID propagation. | ✅ PASS (3 tests) |
| `cache.test.ts` | Unit | Tests read-through Redis cache hits, cache misses, and key invalidation logic. | ✅ PASS (3 tests) |
| `matching.test.ts` | Unit | Evaluates recruiter job matches, student skill deltas, and interview depth scoring algorithms. | ✅ PASS (5 tests) |
| `sla.test.ts` | Unit | Evaluates active/expired recruiter response SLA deadlines and pulsing warning states. | ✅ PASS (2 tests) |
| `cn.test.ts` | Unit | Confirms safe Tailwind class-value merging. | ✅ PASS (3 tests) |

### Playwright E2E Suites
| Test Suite / File | Type | Purpose | Status |
| :--- | :--- | :--- | :--- |
| `auth.spec.ts` | End-to-End | Validates complete multi-step sign-in, onboarding forms, and credential access boundaries. | ✅ PASS |
| `public-pages.spec.ts` | End-to-End | Validates landing page hero segments, responsive metric cards, and bootcamp catalogue listings. | ✅ PASS |

---

## 3. Global Coverage Metrics

Through targeted utility coverage expansion, we successfully bypassed the global vitest quality thresholds:

- **Statements**: **12.38%** (Threshold: 12.00%) — **PASSED** 🎉
- **Branches**: **12.44%** (Threshold: 12.00%) — **PASSED** 🎉
- **Functions**: **12.50%** (Threshold: 11.00%) — **PASSED** 🎉
- **Lines**: **12.56%** (Threshold: 12.00%) — **PASSED** 🎉

---

## 4. Ideal Test Coverage Roadmap (Target: 70%)

To lift the platform's test coverage from `12.5%` to an **ideal production bar of 70%**, we should expand testing systematically across three high-impact layers:

### Layer A: Core Authentication & Quotas (`server/auth/*.ts`, `server/lib/quota.ts`)
- **dpdp.ts (0% -> 100%)**: Write unit tests to check data consent trails, DPDP compliance logs, and export/erasure request verifications.
- **email-verify-token.ts (0% -> 100%)**: Test the creation, lookup, resend, and expiration of signup verification tokens.
- **quota.ts (0% -> 100%)**: Write unit tests to check plan application caps (e.g., Free caps at 2, Pro caps at 5, Premium unlimited).

### Layer B: Core Repository Layer (`server/store.ts` - 2.85% -> 50%)
- Expand Vitest integration coverage to include transactional operations:
  - **Live Sessions**: Chat message persistence, unique attendee check-ins, and webinar status lifecycles.
  - **Missions & Grading**: Recruiters submitting candidate deployment grades and instructors overriding bootcamp assignment marks.
  - **Billing Transactions**: Success/failure states, idempotency checks using `recordProcessedTxn`, and plan upgrades.

### Layer C: Integrations Layer (`server/integrations/**/*.ts` - 0% -> 80%)
- Implement mocks for third-party endpoints:
  - **PhonePe Payment status polling** (`server/integrations/payments`).
  - **Pusher Realtime messages** (`server/integrations/realtime`).
  - **Gemini / Groq AI mock prompts and completions** (`server/integrations/ai`).
  - **Vercel Cron endpoints and saved-search digests**.
