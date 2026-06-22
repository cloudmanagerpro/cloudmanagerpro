# syntax=docker/dockerfile:1

# =============================================================================
# CloudManagerPro frontend — multi-stage build (Next.js 14 standalone output)
#   stage 1 (deps):  install node_modules with a clean, reproducible npm ci
#   stage 2 (build): bake NEXT_PUBLIC_API_URL=/api at build time, then build
#   stage 3 (runner): tiny non-root image running the standalone server
#
# IMPORTANT: NEXT_PUBLIC_API_URL is inlined into the client bundle AT BUILD TIME,
# so it MUST be set (to /api for the Caddy-fronted production deployment) BEFORE
# `next build` runs.
# =============================================================================

# ---- Dependencies ---------------------------------------------------------
FROM node:20-alpine AS deps
WORKDIR /app
COPY package.json package-lock.json ./
RUN npm ci

# ---- Build ----------------------------------------------------------------
FROM node:20-alpine AS build
WORKDIR /app

# Same-origin API path behind Caddy. Overridable via build arg if ever needed.
ARG NEXT_PUBLIC_API_URL=/api
ENV NEXT_PUBLIC_API_URL=${NEXT_PUBLIC_API_URL}
ENV NEXT_TELEMETRY_DISABLED=1

COPY --from=deps /app/node_modules ./node_modules
COPY . .
# `output: 'standalone'` does not require a public/ dir, but the runner copies
# one — make sure it exists even if the repo ships without static assets.
RUN mkdir -p public
RUN npm run build

# ---- Runtime --------------------------------------------------------------
FROM node:20-alpine AS runner
WORKDIR /app

ENV NODE_ENV=production
ENV NEXT_TELEMETRY_DISABLED=1
ENV PORT=3000
ENV HOSTNAME=0.0.0.0

# Non-root user for the server process.
RUN addgroup --system --gid 1001 nodejs \
    && adduser --system --uid 1001 --ingroup nodejs nextjs

# Standalone server + its traced node_modules and package.json.
COPY --from=build --chown=nextjs:nodejs /app/.next/standalone ./
# Static assets and public files are NOT bundled into standalone; copy them in.
COPY --from=build --chown=nextjs:nodejs /app/.next/static ./.next/static
COPY --from=build --chown=nextjs:nodejs /app/public ./public

USER nextjs
EXPOSE 3000

# Use 127.0.0.1 (not localhost): the server binds IPv4 0.0.0.0, but busybox wget
# resolves "localhost" to IPv6 ::1 first and does not fall back, so it would fail.
HEALTHCHECK --interval=15s --timeout=5s --start-period=20s --retries=5 \
  CMD wget -q -O /dev/null http://127.0.0.1:3000/ || exit 1

CMD ["node", "server.js"]
