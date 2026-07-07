# unGhost

> India-first hiring platform built around accountability: every recruiter commits to a public response SLA (24/48/72 h) — miss it and the student's application credit is refunded. Bootcamps award Verified Skill badges recruiters can filter on.

Production app at [unghost.in](https://www.unghost.in). One Next.js monolith serving six modules: marketing, students, recruiters, instructors, admin, and the creator/referral platform.

## Tech stack

- **Framework** — Next.js 14 (App Router) · React 18 · TypeScript `strict`
- **Data** — MongoDB Atlas (mongoose) · Upstash Redis · `migrate-mongo` migrations
- **Auth** — NextAuth (JWT, Credentials + Google) with Redis-backed session revocation
- **Payments** — Razorpay Standard Checkout (REST, paise-denominated, idempotent fulfilment)
- **AI** — Groq → Gemini → Claude fallback chain, deterministic mock when keyless
- **UI** — Tailwind CSS · framer-motion · Lenis · React Query · Zustand
- **Observability** — pino structured logs · Sentry (client/server/edge, SHA-tagged releases) · Slack alerts
- **Deploy** — Vercel (`bom1`), cron jobs in `vercel.json`; Dockerfile for self-hosting

## Getting started

```sh
cp .env.example .env.local   # empty vendor keys → in-app mocks; only Mongo is required
npm install
npm run dev                  # http://localhost:3000
npm run seed                 # demo data (idempotent)
```

Every external vendor (AI, email, payments, realtime, storage) sits behind an adapter in `server/integrations/` that falls back to a mock when its env vars are empty — a fresh clone runs without any third-party accounts.

## Scripts

| Command | Purpose |
|---|---|
| `npm run dev` | Dev server (Turbopack) |
| `npm run build` / `start` | Production build / serve |
| `npm run typecheck` / `lint` | `tsc --noEmit` / ESLint (incl. layer-boundary rules) |
| `npm test` | Vitest unit + integration suites |
| `npm run test:e2e` | Playwright (auto-starts a server on port 3100) |
| `npm run migrate:up` / `migrate:status` | Database migrations |
| `npm run seed` | Seed demo data |
| `npm run load:smoke` | k6 smoke load test |

## Repository map

```
app/          # Routes: pages (RSC) + api/ handlers
components/   # Client UI by feature (ui/ = primitive kit)
server/       # Backend: auth/, db/, integrations/, lib/, payments/, store.ts
shared/       # Isomorphic domain logic (pricing, rooms, skills, SLA math)
middleware.ts # Edge: request-id correlation + session-revocation gate
tests/e2e/    # Playwright specs
scripts/      # Seeds, backfills, admin one-offs
docs/         # Engineering documentation (start here)
```

Layering is enforced by ESLint: `app → components/server/shared`, `components → shared`, `server → shared` — never the reverse. Violations fail the build.

## Documentation

The full documentation set lives in [`docs/`](./docs/README.md):

- [Architecture and code structure](./docs/02-architecture-and-code-structure.md) — **new engineers start here**
- [Security review](./docs/11-security-review-report.md) · [Test coverage](./docs/12-test-coverage-report.md) · [Launch readiness](./docs/10-launch-readiness.md)
- Runbooks in [`docs/09-runbooks/`](./docs/09-runbooks)
- Product positioning and brand rules: [PRODUCT.md](./PRODUCT.md)

## Contributing

1. Branch from `main`; CI (`.github/workflows/ci.yml`) runs lint + typecheck + tests + build on every push.
2. Follow the conventions checklist in [docs/02 §14](./docs/02-architecture-and-code-structure.md#14-conventions-checklist).
3. Schema changes ship a reversible migration in the same PR.
4. Update the relevant `docs/*.md` in the same PR — docs are code.
