# zero-blog-astro

The public frontend of Zero Stratégie — an Astro 6 site served at
**https://zero-strategie.dev**. Content comes from the Strapi CMS in
[`cms-zero`](https://github.com/zero-strategie/cms-zero), fetched at build time.

Read [`AGENTS.md`](AGENTS.md) before contributing. It is prescriptive: it describes the
architecture this project must converge on, not only what exists today.

## Setup

**pnpm only.** Never run `npm install` or `yarn` here, and never commit a second lockfile.

```sh
pnpm install
cp .env.example .env    # then fill in STRAPI_URL
pnpm dev                # http://localhost:4321
```

`STRAPI_URL` is declared in the `astro:env` schema and is **required**: `pnpm build` fails
without it rather than shipping a site pointed at nothing. It also fails, with an explicit
`StrapiError`, when the CMS cannot be reached.

No CMS at hand? Serve the contract fixtures instead:

```sh
pnpm fixtures                                   # fake Strapi on http://localhost:1338
STRAPI_URL=http://localhost:1338 pnpm build
```

| Command | Purpose |
|---|---|
| `pnpm dev` | Dev server on `http://localhost:4321` |
| `pnpm build` | Production build to `./dist/` |
| `pnpm preview` | Serve the build locally |
| `pnpm check` | Type check (`astro check`) |
| `pnpm lint` | ESLint |
| `pnpm format` / `pnpm format:check` | Prettier |
| `pnpm test` | Build on the fixtures, then `node --test "tests/*.test.mjs"` on `dist/client/` |
| `pnpm build:fixtures` | Production build against the fixtures, no CMS needed |
| `pnpm check:weight` | Weight budgets and zero JS on `dist/client/` |
| `pnpm fixtures` | Fake Strapi serving `test/fixtures/` |

## Rendering

`output` stays `static`. Pages are prerendered; a route opts out with
`export const prerender = false` and a one-line comment saying why. Today the only such route
is `/health`, which the deployment pipeline polls.

The adapter is `@astrojs/node` in standalone mode — pinned to the `10.x` line, which is the
one that matches Astro 6. `11.x` targets Astro 7 and fails at runtime here.

## Deployment

Merging to `main` builds an image, pushes it to GHCR and asks the server to run it. Rollback
lives on the server, in `/opt/zero-front/deploy.sh`, so it behaves the same whether CI or a
human triggers it. The server is provisioned from
[`zero-infra`](https://github.com/zero-strategie/zero-infra) (`roles/front`).

```sh
# build the production image locally, the way CI does
docker build --build-arg STRAPI_URL=https://admin.zero-strategie.dev \
             --secret id=strapi_token,src=<(printf '%s' "$STRAPI_API_TOKEN") \
             -t zero-front:local .
```

The site is **prerendered**, so publishing an article in Strapi changes nothing until this
image is rebuilt. A Strapi webhook posts to `https://zero-strategie.dev/__rebuild`, and the
relay behind it fires a `repository_dispatch` of type `rebuild` at this repository — which is
why this workflow has that trigger.

### Required GitHub configuration

| Kind | Name | Notes |
|---|---|---|
| Secret | `SSH_HOST`, `SSH_USER`, `SSH_PORT` | must match the `zero-infra` inventory |
| Secret | `SSH_PRIVATE_KEY` | its public half is in `deploy_authorized_keys` |
| Secret | `SSH_KNOWN_HOSTS` | `ssh-keyscan -p <port> <host>` |
| Secret | `STRAPI_API_TOKEN` | read-only token, passed as a BuildKit secret |
| Variable | `STRAPI_URL` | `https://admin.zero-strategie.dev` |
| Variable | `FRONT_DOMAIN` | `zero-strategie.dev` |

An `environment: production` must exist in this repository's settings; the deploy job is
attached to it so a required reviewer can be added later without editing the workflow.
