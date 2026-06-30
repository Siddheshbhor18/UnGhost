# Vercel from the terminal — quick reference

One-time setup, then everything below works from this directory.

## One-time setup

```bash
bash scripts/vercel-link.sh
```

Authenticates you (browser-based) and links this checkout to your Vercel
project. Creates `.vercel/project.json` (gitignored, account-specific —
carries your `orgId` + `projectId`).

If `vercel` isn't installed: `npm i -g vercel`.

## Razorpay go-live in one command

```bash
bash scripts/vercel-razorpay-setup.sh
```

Prompts (silently — values never echo) for the 3 Razorpay strings and
pushes the 4 env vars (`RAZORPAY_KEY_ID`, `RAZORPAY_KEY_SECRET`,
`NEXT_PUBLIC_RAZORPAY_KEY_ID`, `RAZORPAY_WEBHOOK_SECRET`) into Vercel
Production scope. Then you redeploy.

## Everyday operations

| Task | Command |
|---|---|
| List all env vars (with scope) | `npm run vercel:env:ls` |
| Pull production env to local `.env.production` for inspection | `npm run vercel:env:pull` |
| Add a single env var (interactive) | `npm run vercel:env:add -- <NAME> production` |
| Remove an env var | `vercel env rm <NAME> production` |
| Tail production logs | `npm run vercel:logs` |
| Deploy preview (current branch) | `npm run vercel:deploy` |
| Deploy production | `npm run vercel:deploy:prod` |
| List recent deployments | `vercel ls` |
| Promote a past deploy back to prod (rollback) | `vercel promote <deploy-url>` |
| Open the project in browser | `vercel open` |
| Inspect a deployment | `vercel inspect <deploy-url>` |
| Who am I logged in as | `vercel whoami` |
| Switch teams | `vercel switch` |

## Rollback in 30 seconds

```bash
# List the last 5 prod deploys
vercel ls --prod | head

# Promote a known-good past deploy back to prod
vercel promote <https://...-xxxx.vercel.app>
```

## Common gotchas

- **Env changes don't auto-redeploy.** After `vercel env add`, you must
  redeploy (`npm run vercel:deploy:prod` or push a commit).
- **`.vercel/project.json` is per-user.** Never commit it. Each dev runs
  `vercel link` once.
- **Vercel CLI version drift.** Add `vercel` as a devDep if multiple devs
  need lockstep behavior. We don't right now (global install is fine).
- **`vercel env pull`** writes to `.env.local` by default — DO NOT let that
  overwrite your existing dev secrets. The npm script targets
  `.env.production` (read-only inspection file; also gitignored).

## Security notes

- `scripts/vercel-razorpay-setup.sh` reads each secret with `read -rs` so
  they never appear in shell history or terminal output.
- Secrets are piped to `vercel env add` via stdin, never as CLI args
  (which would show up in `ps`).
- The script `unset`s the locals immediately after pushing.
- If you ever paste a secret as a CLI arg by accident, regenerate it.
