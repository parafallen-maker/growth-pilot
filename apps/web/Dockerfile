# syntax=docker/dockerfile:1.7

FROM node:20-alpine AS base
WORKDIR /app

FROM base AS deps
COPY package.json package-lock.json ./
COPY apps/api/package.json apps/api/package.json
COPY apps/web/package.json apps/web/package.json
COPY packages/config/package.json packages/config/package.json
COPY packages/schema/package.json packages/schema/package.json
COPY packages/ui/package.json packages/ui/package.json
RUN npm ci

FROM deps AS builder
ARG NEXT_PUBLIC_API_BASE_URL=/api/v1
ENV NEXT_PRIVATE_STANDALONE=true
ENV NEXT_PUBLIC_API_BASE_URL=${NEXT_PUBLIC_API_BASE_URL}
COPY . .
RUN npm run build --workspace @growthpilot/web

FROM node:20-alpine AS runner
WORKDIR /app
ENV NODE_ENV=production
ENV HOSTNAME=0.0.0.0
ENV PORT=3001
RUN addgroup -S nodejs && adduser -S nextjs -G nodejs
COPY --from=builder --chown=nextjs:nodejs /app/apps/web/.next/standalone /app
COPY --from=builder --chown=nextjs:nodejs /app/apps/web/.next/static /app/apps/web/.next/static
USER nextjs
WORKDIR /app/apps/web
EXPOSE 3001
CMD ["node", "server.js"]
