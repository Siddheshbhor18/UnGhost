# NoGhost.com

> Stop being a ghost. Start being a hire.

A full-stack hiring platform with **4 modules** (Students, Recruiters, Bootcamps, Admin/Teachers) built in a **Retro Arcade** aesthetic. Mock-everything-first; swap to real Claude / MongoDB / PhonePe by changing one adapter each.

## Tech Stack

- **Framework**: Next.js 14 (App Router) · TypeScript (strict)
- **Style**: Tailwind CSS · Framer Motion · `Press Start 2P` + `JetBrains Mono`
- **State**: React Query · Zustand
- **Auth**: NextAuth.js (credentials + Google + LinkedIn placeholders)
- **AI**: Claude (`@anthropic-ai/sdk`, `claude-opus-4-7`, adaptive thinking) with deterministic mock fallback
- **Data**: In-memory store backed by JSON seed files (swap to Mongo Atlas later)
- **Payments**: Mock PhonePe (UPI / Card / Netbanking) with simulated webhook

## Run

```sh
cp .env.example .env.local
# (optional) drop in ANTHROPIC_API_KEY for real Claude — otherwise mock kicks in
npm install
npm run dev
```

Visit <http://localhost:3000>.

## Demo Accounts (password is always `demo`)

| Role | Email |
|---|---|
| Student | `alice@demo.test`, `bharat@demo.test`, `chitra@demo.test`, `devraj@demo.test`, `esha@demo.test` |
| Recruiter | `hr@stark.test`, `hr@quanta.test`, `hr@lumen.test` |
| Admin (teacher) | `root@noghost.test`, `kaira@noghost.test` (2FA: `000000`) |

## Walk Through

1. `/` — Landing with hero, search, live stats, mission preview, magic widget
2. Drop a PDF on the Magic Widget → laser scan → onboarding with AI-parsed profile
3. `/login` → sign in as a student → `/dashboard` (3-column terminal: Active Missions · Matchmaker Feed · AI Coach)
4. Click any mission → `/missions/[id]` (skill delta, gauntlet preview, SLA promise)
5. `/missions/[id]/assess` → write your gauntlet response → depth indicator → submit → rocket animation
6. Sign in as recruiter at `/recruiter/login` → `/recruiter/command` (kanban) or `/recruiter/deploy` (post a mission with AI JD parsing)
7. Sign in as admin at `/admin/login` (2FA `000000`) → sidebar with **Overview · Students · Recruiters · Bootcamps · Placements · Telemetry · Campaigns**
8. `/bootcamps` → pick a bootcamp → enroll via PhonePe drawer → unlock player → skill-verify gate awards a `Verified Skill` badge

## Architecture

```
app/                        # Next.js App Router
  page.tsx                  # Landing
  login/, onboarding/       # Auth flow
  dashboard/                # Student terminal
  missions/[id]/, /assess/  # Mission brief + gauntlet
  bootcamps/, bootcamp/[id]/# Education
  recruiter/                # B2B
  admin/                    # Teacher panel (sidebar layout)
  api/                      # Serverless routes — parse-resume, match, coach, jobs, etc.
components/
  arcade/                   # Visual language: PixelButton, CRTOverlay, RocketLaunch, LaserScan, …
  candidate/                # MagicWidget, MissionTimeline, MatchmakerFeed, AICoachPanel, SkillDelta
  recruiter/                # KanbanBoard with action drawer
  admin/                    # AdminSidebar, StudentRoster, SkillHeatmap
  shared/                   # Navbar, PhonePeDrawer, Providers
lib/
  ai/                       # Adapter pattern — mock + claude (opus-4-7)
  data/                     # In-memory store + JSON seeds + domain types
  auth.ts                   # NextAuth config + role-based redirect
  utils/                    # sla countdown · matching · cn helper
```

## Swap Mock → Real

| Mock | Real |
|---|---|
| `lib/ai/mock.ts` | Set `ANTHROPIC_API_KEY` → `claudeAdapter` auto-activates |
| `lib/data/store.ts` (in-memory) | Replace function bodies with Mongo Atlas calls; keep public signatures |
| `app/api/payments/phonepe/*` | Implement signed `/pg/v1/pay` POST + verify webhook signature |
| Google / LinkedIn OAuth | Add `*_CLIENT_ID` / `*_CLIENT_SECRET` to `.env.local` |

## Notes

- Seed JSON lives in `lib/data/seeds/*.json` — edit freely for demos
- All routes are SSR; Next.js App Router with route groups for layout boundaries
- The admin panel sidebar uses `text-ink-primary` defaults to stay readable on data-dense screens
- The dev server preserves the in-memory store across HMR by stashing it on `globalThis`
