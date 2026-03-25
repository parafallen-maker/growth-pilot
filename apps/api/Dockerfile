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

FROM base AS production-deps
ENV NODE_ENV=production
COPY package.json package-lock.json ./
COPY apps/api/package.json apps/api/package.json
COPY apps/web/package.json apps/web/package.json
COPY packages/config/package.json packages/config/package.json
COPY packages/schema/package.json packages/schema/package.json
COPY packages/ui/package.json packages/ui/package.json
RUN npm ci --omit=dev --workspace @growthpilot/api --include-workspace-root=false

FROM node:20-alpine AS runner
WORKDIR /app/apps/api
ENV NODE_ENV=production
ENV PORT=3000
RUN mkdir -p /app/apps/api/.data /app/apps/api/.runtime \
  && chown -R node:node /app
COPY --from=production-deps --chown=node:node /app/node_modules /app/node_modules
COPY --from=builder --chown=node:node /app/apps/api/dist ./dist
COPY --from=builder --chown=node:node /app/apps/api/package.json ./package.json
USER node
EXPOSE 3000
CMD ["node", "dist/main.js"]
