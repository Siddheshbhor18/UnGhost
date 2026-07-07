# unGhost — Production Readiness Documentation

This folder contains the full production-readiness plan for unGhost.com. Read these documents before shipping new features, onboarding new engineers, or talking to investors.

## Audience

- **New engineers** — read [02 — Architecture and code structure](./02-architecture-and-code-structure.md) first, then the root [README](../README.md).
- **DevOps / SRE** — read [08 — Cloudflare bootstrap](./08-cloudflare-bootstrap.md), [10 — Launch readiness](./10-launch-readiness.md), and the [runbooks](./09-runbooks).
- **Security / due-diligence** — read [11 — Security review](./11-security-review-report.md) and [12 — Test coverage](./12-test-coverage-report.md).

## Table of contents

| # | Document | Purpose |
|---|---|---|
| 02 | [Architecture and code structure](./02-architecture-and-code-structure.md) | Codebase reference: layering, folder map, API conventions, data/auth/payments, testing, deploy |
| 08 | [Cloudflare bootstrap](./08-cloudflare-bootstrap.md) | R2 / Stream account setup and secrets |
| 09 | [Runbooks](./09-runbooks) | Operational procedures for on-call |
| 10 | [Launch readiness](./10-launch-readiness.md) | Pre-launch checklist and sign-off |
| 11 | [Security audit and vulnerability review](./11-security-review-report.md) | In-depth security analysis, DPDP compliance review, and identified risks |
| 12 | [Testing and coverage report](./12-test-coverage-report.md) | Testing architecture overview, current coverage, and coverage expansion roadmap |

Numbers 01, 03–07 (current-state assessment, design system, deployment, CI/CD pipeline, operations, roadmap) are reserved but not yet written; until then their subjects are covered in brief inside doc 02 and the root README.

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
