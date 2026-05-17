# syntax=docker/dockerfile:1.7
# unGhost production image.
#
# Multi-stage:
#   1. deps   — only package.json + lock so npm install is cached
#   2. build  — full source compile (next build --output standalone)
#   3. runtime — alpine + non-root user, copies only .next/standalone
#
# Built image ~180MB. Health endpoint at /api/health.
ARG NODE_VERSION=20

# ── 1. deps ────────────────────────────────────────────────────────────────
FROM node:${NODE_VERSION}-alpine AS deps
WORKDIR /app
RUN apk add --no-cache libc6-compat
COPY package.json package-lock.json ./
RUN npm ci --omit=optional

# ── 2. build ──────────────────────────────────────────────────────────────
FROM node:${NODE_VERSION}-alpine AS build
WORKDIR /app
ENV NEXT_TELEMETRY_DISABLED=1
COPY --from=deps /app/node_modules ./node_modules
COPY . .
# Build-time version stamp — overridden in CI with the actual git SHA.
ARG APP_VERSION=local
ENV NEXT_PUBLIC_APP_VERSION=${APP_VERSION}
RUN npm run build

# ── 3. runtime ────────────────────────────────────────────────────────────
FROM node:${NODE_VERSION}-alpine AS runtime
WORKDIR /app
ENV NODE_ENV=production \
    NEXT_TELEMETRY_DISABLED=1 \
    PORT=3000 \
    HOSTNAME=0.0.0.0

RUN addgroup -g 1001 -S nodejs && \
    adduser  -S -G nodejs -u 1001 nextjs

COPY --from=build --chown=nextjs:nodejs /app/.next/standalone ./
COPY --from=build --chown=nextjs:nodejs /app/.next/static     ./.next/static
COPY --from=build --chown=nextjs:nodejs /app/public           ./public

USER nextjs
EXPOSE 3000

HEALTHCHECK --interval=15s --timeout=4s --start-period=20s --retries=3 \
  CMD wget -qO- http://127.0.0.1:3000/api/health || exit 1

CMD ["node", "server.js"]
