# unGhost — Production Readiness Documentation

This folder contains the full production-readiness plan for unGhost.com. Read these documents before shipping new features, onboarding new engineers, or talking to investors.

## Audience

- **Founders / product** — read [01](./01-current-state-and-gaps.md) and [07](./07-roadmap.md).
- **New engineers** — read [02](./02-architecture-and-code-structure.md) and [03](./03-design-system.md) first.
- **DevOps / SRE** — read [04](./04-cloudflare-deployment.md), [05](./05-cicd-pipeline.md), [06](./06-operations-monitoring.md).
- **Investors / due-diligence** — read [01](./01-current-state-and-gaps.md) and [07](./07-roadmap.md).

## Table of contents

| # | Document | Purpose |
|---|---|---|
| 01 | [Current state and gaps](./01-current-state-and-gaps.md) | Honest assessment: what is built, what is missing, prototype vs production scorecard |
| 02 | [Architecture and code structure](./02-architecture-and-code-structure.md) | Monolith decision, target folder layout, naming, ESLint boundaries, contribution guide |
| 03 | [Design system](./03-design-system.md) | How design tokens work, how to swap to a new design guide, accessibility standards |
| 04 | [Cloudflare deployment](./04-cloudflare-deployment.md) | Cloudflare Containers setup, supporting services (Atlas, Redis, R2, Sentry), DNS, secrets |
| 05 | [CI/CD pipeline](./05-cicd-pipeline.md) | GitHub Actions, environments, PR previews, migrations, rollback |
| 06 | [Operations and monitoring](./06-operations-monitoring.md) | Logging, alerts, on-call, runbooks, incident response, SLAs |
| 07 | [8-week hardening roadmap](./07-roadmap.md) | Week-by-week plan to take the app from prototype to production-ready |

## How to keep this updated

- Treat docs as code. Update them in the same PR as code changes.
- Each doc has a `Last reviewed` date at the top — bump it on every meaningful edit.
- Use Architecture Decision Records (ADRs) in `docs/adr/` for any reversible-but-significant choice.
- Run a quarterly doc audit: open a PR labelled `docs:audit` reviewing every doc for staleness.

## Conventions used in these docs

- File paths are absolute from the repo root: `app/login/page.tsx`.
- Commands assume macOS or Linux shell.
- Environment variable names are `UPPER_SNAKE_CASE`.
- "Phase 1" means current prototype state. "Phase 2" means after the 8-week hardening. "Phase 3" means future features.
- Code snippets are runnable unless explicitly marked `// example`.
