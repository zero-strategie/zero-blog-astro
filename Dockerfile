# syntax=docker/dockerfile:1

# Generic, portable image: no assumptions about the host. Runs locally, on the
# VPS, or on any PaaS that accepts a Dockerfile.
#
# The site is PRERENDERED, so the build is where content is fetched from
# Strapi. That is why STRAPI_URL is a build argument and not only a runtime
# variable: a container started with a different STRAPI_URL still serves the
# pages baked in here. Publishing an article means rebuilding this image.

ARG NODE_VERSION=22-alpine

FROM node:${NODE_VERSION} AS base
# pnpm only — never npm or yarn in this repository. corepack resolves the exact
# version pinned in package.json#packageManager.
RUN corepack enable
ENV PNPM_HOME=/pnpm
WORKDIR /opt/app

# --- deps: everything needed to build ---------------------------------------
FROM base AS deps
COPY package.json pnpm-lock.yaml ./
RUN --mount=type=cache,id=pnpm-store,target=/pnpm/store \
    pnpm install --frozen-lockfile

# --- prod-deps: what the runtime actually needs ------------------------------
# A separate resolution rather than pruning the build tree: pnpm's node_modules
# is a symlink farm into the store, and a pruned copy of it does not survive a
# COPY --from between stages.
FROM base AS prod-deps
COPY package.json pnpm-lock.yaml ./
RUN --mount=type=cache,id=pnpm-store,target=/pnpm/store \
    pnpm install --frozen-lockfile --prod

# --- build: prerender the site ----------------------------------------------
FROM deps AS build
COPY . .
ENV NODE_ENV=production
# Public origin of the CMS, validated by the astro:env schema. Not a secret.
ARG STRAPI_URL
# The token IS a secret, so it arrives through a BuildKit secret mount instead
# of an ARG: nothing lands in a layer or in `docker history`.
RUN --mount=type=secret,id=strapi_token \
    STRAPI_API_TOKEN="$(cat /run/secrets/strapi_token 2>/dev/null || true)" \
    pnpm build

# --- runtime -----------------------------------------------------------------
FROM base AS runtime
ENV NODE_ENV=production
# @astrojs/node standalone reads these; compose overrides them from .env.
ENV HOST=0.0.0.0
ENV PORT=4321

# Ownership is set during COPY. A `chown -R` afterwards would rewrite every
# file's metadata and duplicate node_modules into a new layer.
COPY --chown=node:node package.json ./
COPY --chown=node:node --from=prod-deps /opt/app/node_modules ./node_modules
COPY --chown=node:node --from=build /opt/app/dist ./dist

# Never run as root.
USER node

EXPOSE 4321

# /health answers 204 once the server is genuinely serving. Uses node rather
# than curl so no extra package is needed in the runtime image.
#
# /health, not /_health as on the CMS: Astro excludes every route whose file
# name starts with an underscore, so the endpoint could never be reached.
HEALTHCHECK --interval=30s --timeout=5s --start-period=15s --retries=5 \
  CMD node -e "require('http').get('http://127.0.0.1:'+(process.env.PORT||4321)+'/health',r=>process.exit(r.statusCode===204?0:1)).on('error',()=>process.exit(1))"

CMD ["node", "./dist/server/entry.mjs"]
