This is exactly the kind of thing I would give Claude before a multi-week implementation. It is **not an implementation prompt**. It is **pure context** so Claude understands the product, business decisions, architecture philosophy, constraints, and what it's building before writing a single line of code.

---

# MASTER CONTEXT — unGhost Creator Platform

## 1. Project Overview

You are working on **unGhost**, an AI-powered hiring and career platform built using **Next.js (App Router), TypeScript, MongoDB (Mongoose), TailwindCSS, and Razorpay**.

The platform's core philosophy is:

> **"We don't ghost. We unGhost."**

Unlike traditional job portals, unGhost introduces accountability into hiring through recruiter response SLAs while simultaneously helping students become employable through premium AI-powered bootcamps.

The project follows a **modular monolith architecture**, not microservices.

Your responsibility is to build **one new subsystem** inside the existing codebase.

This subsystem should integrate naturally into the existing architecture without breaking any existing functionality.

---

# 2. What We Are Building

We are **NOT** building a generic affiliate system.

We are **NOT** building a SaaS referral platform.

We are building an **internal Creator Platform** exclusively for unGhost.

Think of it as an internal operating system for managing creators who promote unGhost's Bootcamps.

This subsystem should feel like an internal business product rather than a plugin.

---

# 3. Why This System Exists

The long-term growth strategy of unGhost is creator-led distribution.

Instead of relying entirely on Meta Ads or Google Ads, unGhost wants to grow through trusted creators.

Examples include:

* LinkedIn creators
* Instagram creators
* YouTubers
* Startup founders
* College ambassadors
* Workshop speakers
* Communities
* Agencies
* Career mentors

Each creator introduces students to unGhost through their audience.

Instead of paying creators upfront, unGhost only rewards creators **after actual revenue has been generated**.

This keeps customer acquisition completely performance-based.

---

# 4. The unGhost Business Model

The platform currently has two completely different commercial products.

---

## Product 1 — Job Platform

Students can purchase access to the hiring platform.

Products include:

* ₹149 Job Access
* ₹299 Premium Job Access

These products exist only for user acquisition.

These products NEVER generate creator commissions.

Even if a student purchases them through a creator referral, no reward is created.

However, the creator attribution should still be stored permanently because the student may later purchase a Bootcamp.

---

## Product 2 — Bootcamp Platform

The Bootcamp Platform contains premium educational programs.

Current launch price:

₹4,999 + GST

Examples:

* AI Bootcamp
* Marketing Bootcamp
* Sales Bootcamp
* Entrepreneurship Bootcamp
* Freelancing Bootcamp

These products generate creator commissions.

The referral system must never hardcode product names.

Instead every product exposes

```ts
referralEligible = true
```

Only referral eligible products generate creator rewards.

---

# 5. Creator Philosophy

Creators are **business partners**.

Creators are NOT platform users who discover unGhost.

Creators are manually selected.

Creators cannot sign up themselves.

Every creator is invited by the unGhost team.

The onboarding flow is:

Admin

↓

Create Creator

↓

Assign Commission Agreement

↓

Generate Referral Identity

↓

Send Invitation

↓

Creator Accepts

↓

Creator Sets Password

↓

Creator Dashboard Enabled

---

# 6. Creator Identity

Every creator has exactly ONE permanent referral identity.

Example

```
https://unghost.in/r/abhinav
```

This never changes.

Campaigns are optional.

Campaigns only add tracking.

Examples

```
/r/abhinav?campaign=reel

/r/abhinav?campaign=workshop

/r/abhinav?campaign=podcast
```

Campaigns must never create new referral identities.

Referral identities are permanent.

Referral codes are never reused.

Even if a creator leaves.

---

# 7. Commission Philosophy

Every creator negotiates individually.

There are NO reusable commission plans.

Instead every creator owns one active Commission Agreement.

Examples

Creator A

15%

Creator B

10%

Creator C

₹750 Fixed

Creator D

20%

Supported agreement types

* Percentage
* Fixed Amount

Only one agreement can be active.

Changing commission creates a NEW agreement.

Old agreements become historical.

Historical agreements are never edited.

---

# 8. Reward Philosophy

Creators DO NOT earn money for

* clicks
* visits
* registrations

Creators ONLY earn rewards after an eligible Bootcamp purchase.

Reward creation requires ALL conditions to be true.

1. Student has valid creator attribution.
2. Product is referral eligible.
3. Razorpay payment has been verified.
4. Membership has been activated.
5. Reward does not already exist.

Only then should a reward be created.

---

# 9. Attribution Philosophy

The attribution policy is

**First Valid Attribution Wins**

Flow

Creator

↓

Referral Link

↓

Student Click

↓

Referral Session

↓

Student Signup

↓

Creator Attribution Stored

↓

Future Purchases

Once attribution has been stored on the student account it is permanent.

The referral cookie becomes irrelevant after signup.

Students can belong to exactly one creator.

---

# 10. Financial Philosophy

Financial data must be immutable.

Historical rewards must NEVER change.

When a reward is generated snapshot

* commission type
* commission value
* calculated commission
* bootcamp price
* currency
* order id

Future commission changes must never affect historical rewards.

---

# 11. Credit Ledger Philosophy

Financial balances must never be stored directly.

The ledger is append-only.

Example

```
+₹750

+₹500

-₹500

+₹1000
```

Balance is always derived.

Never update balances directly.

---

# 12. Creator Dashboard

Creators have their own portal.

Features include

Dashboard

Campaigns

Referral Link

Rewards

Payouts

Settings

Timeline

Analytics

The portal should feel like a professional partner dashboard.

---

# 13. Admin Dashboard

The Admin Portal contains a Creator CRM.

Admins can

Create creators

Invite creators

Manage commission agreements

Suspend creators

Create campaigns

Approve rewards

Reject rewards

Process payouts

Search creators

View analytics

View creator timelines

Manage creator lifecycle

---

# 14. Module Architecture

The Creator Module consists of:

```
Creator Platform

├── Creator CRM
├── Creator Profiles
├── Commission Agreements
├── Referral Engine
├── Campaigns
├── Reward Engine
├── Finance
│   ├── Ledger
│   ├── Reward Review
│   └── Payouts
├── Creator Events
├── Notifications
└── Creator Portal
```

---

# 15. Data Ownership

Each module owns its own responsibility.

Creator CRM

Creator profiles

Commission Agreements

Commission configuration

Referral Engine

Referral attribution

Referral cookies

Referral sessions

Reward Engine

Reward creation

Reward snapshots

Finance

Ledger

Payouts

Reward approvals

Notifications

Emails

System notifications

Creator Events

Audit trail

Timeline

Creator Portal

Presentation only

No business logic

---

# 16. Technical Constraints

The system must follow these rules.

• Next.js App Router

• TypeScript Strict Mode

• MongoDB + Mongoose

• Server Actions where appropriate

• Route Handlers where appropriate

• TailwindCSS

• Zod validation

• RBAC

• No any types

• Strong typing everywhere

• Clean folder boundaries

• Reusable services

• Transactions for financial operations

• Razorpay webhook verification

---

# 17. Development Philosophy

This project is a modular monolith.

Do NOT introduce unnecessary enterprise complexity.

Do NOT introduce microservices.

Do NOT introduce Kafka.

Do NOT introduce RabbitMQ.

Do NOT introduce CQRS.

Do NOT introduce Event Sourcing.

Do NOT introduce a distributed Event Bus.

Use simple service boundaries.

Use MongoDB transactions.

Use a creatorEvents collection for auditing.

Prefer readability over cleverness.

Optimize for maintainability.

---

# 18. Business Rules (Constitution)

The following rules can never be violated.

1. One creator has one permanent referral identity.
2. Referral identities are immutable.
3. Referral identities are never reused.
4. One student belongs to one creator.
5. Attribution is permanent after signup.
6. Job products never generate rewards.
7. Bootcamp products may generate rewards.
8. Rewards require verified payment.
9. Rewards require membership activation.
10. One order creates at most one reward.
11. Reward snapshots are immutable.
12. Commission agreements are versioned through replacement, never editing history.
13. Ledger entries are append-only.
14. Creator events are immutable.
15. Payouts never modify historical rewards.
16. Dashboard never owns business logic.
17. Financial correctness always takes priority over convenience.

---

# 19. Coding Expectations

Before writing code:

* Understand the existing architecture.
* Reuse existing authentication.
* Reuse existing user model.
* Reuse existing payment flow.
* Reuse existing RBAC.
* Do not duplicate existing functionality.

When implementing:

* Keep modules cohesive.
* Keep responsibilities isolated.
* Maintain strict typing.
* Use meaningful naming.
* Write production-quality code.
* Avoid overengineering.
* Avoid placeholder implementations.
* Build the subsystem as if it will be maintained for the next five years.

---

## Final Objective

The end result should be a **production-ready Creator Platform** integrated into unGhost that allows the team to:

* Onboard creators.
* Track referral attribution.
* Generate referral rewards only for eligible Bootcamp purchases.
* Manage creator commissions.
* Approve and process payouts.
* Give creators a professional dashboard to track their performance.
* Maintain complete financial correctness and auditability while remaining simple, maintainable, and well-integrated into the existing Next.js monolith.

---

This is the context. Read and understand it completely before making any implementation decisions. Do not start coding until you have analyzed the existing codebase, identified integration points, and confirmed how this subsystem fits into the current architecture.
