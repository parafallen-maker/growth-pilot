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
COPY . .
RUN npm run build --workspace @growthpilot/api

FROM node:20-alpine AS runner
WORKDIR /app
ENV NODE_ENV=production
ENV PORT=3000
RUN mkdir -p /app/.data /app/.runtime   && addgroup -S appgrp && adduser -S appuser -G appgrp
COPY --from=deps --chown=appuser:appgrp /app/node_modules /app/node_modules
COPY --from=builder --chown=appuser:appgrp /app/apps/api/dist/apps/api/src /app/apps/api/dist
COPY --from=builder --chown=appuser:appgrp /app/apps/api/package.json /app/apps/api/package.json
USER appuser
EXPOSE 3000
CMD ["node", "apps/api/dist/main.js"]
