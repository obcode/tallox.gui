# syntax=docker/dockerfile:1

FROM node:24-alpine AS base
ENV COREPACK_ENABLE_DOWNLOAD_PROMPT=0
RUN corepack enable
WORKDIR /app

FROM base AS builder
ARG APP_VERSION
ENV APP_VERSION=$APP_VERSION
COPY package.json pnpm-lock.yaml pnpm-workspace.yaml .npmrc ./
RUN pnpm install --frozen-lockfile
COPY . .
RUN pnpm run build

# A stage of its own rather than `pnpm prune`: that way the runtime tree comes reproducibly
# from the lockfile. --ignore-scripts, because postinstall hooks are purely for development.
FROM base AS prod-deps
COPY package.json pnpm-lock.yaml pnpm-workspace.yaml .npmrc ./
RUN pnpm install --frozen-lockfile --prod --ignore-scripts

FROM node:24-alpine
WORKDIR /app
ENV NODE_ENV=production
ENV PORT=3000
ENV HOST=0.0.0.0

COPY --from=builder  --chown=node:node /app/build         build/
COPY --from=prod-deps --chown=node:node /app/node_modules node_modules/
COPY --chown=node:node package.json .

USER node
EXPOSE 3000

CMD ["node", "./build"]
