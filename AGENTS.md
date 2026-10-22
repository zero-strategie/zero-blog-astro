# AGENTS.md — `zero-blog-astro`

Instructions for AI agents and contributors working in this repository.
Read this file **before** touching any code. It is prescriptive: it describes the
architecture this project must converge on, not only what exists today.

---

## 1. Project & scope

`zero-blog-astro` is the **public frontend** of the Zero Stratégie blog. It is an
**Astro 6.4.7** application whose content comes from a separate Strapi CMS.

| | |
|---|---|
| Repository | `git@github.com:zero-strategie/zero-blog-astro.git` |
| Runtime | Node `>=22.12.0` |
| Package manager | **pnpm** (only `pnpm-lock.yaml` exists) |
| Dev server | `http://localhost:4321` |
| Sibling repo | `../cms-zero` — Strapi 5.48, **npm**, Node `>=20 <=24`, API on `:1337` |

> The two repos have different package managers and only overlap on Node **22.12–24.x**.
> Use that range for both.

**This repo owns:** routing, layout, styling, SEO/OG markup, accessibility, RSS, sitemap,
and the client that talks to Strapi.

**This repo does not own:** the content model, business rules, or authorization. If a change
requires new fields or new logic, it belongs in `cms-zero`.

### Current state — read this before assuming

This repository is still the Astro `blog` starter as far as **content** goes: it is loaded
from local Markdown/MDX in `src/content/blog/` via the `glob()` loader, and
**there is no Strapi integration at all** — no API client, no repositories, no mappers.

What has been built is the **delivery pipeline**, not the application: a real `site`, the
`@astrojs/node` adapter (10.x — the line that matches Astro 6), the `astro:env` schema, a
`/health` endpoint, a Dockerfile, a `.env.example` and a GitHub Actions workflow that builds,
pushes to GHCR and deploys. There are still no `devDependencies` — no TypeScript, no linter.
Tests exist: `node:test` files in `tests/` that assert on the built `dist/client/` (§7).

Do not read the existing files as project conventions — they are template output.
§4 and §5 below define the target architecture. Building the Strapi integration means
building it as described here, not bolting `fetch` calls into pages.

### Data contract with the CMS

Consumed from `api::*` on the Strapi side:

| Type | Kind | Localised | Notes |
|---|---|---|---|
| `article` | collection | **yes** | The **only** type with draft & publish. `title` (required, max 120), `description` (max 160), `slug` (required, unique), `cover`, `author` (m:1), `category` (m:1), `blocks` (dynamic zone) |
| `author` | collection | **no** | `name` (required), `avatar`, `email` |
| `category` | collection | **yes** | `name` (required), `slug` (required, unique), `description` |
| `about` | single | **yes** | `title` (required), `blocks` |
| `global` | single | **yes** | `siteName`, `siteDescription`, `favicon` (**not** localised), `defaultSeo` (`metaTitle` ≤60, `metaDescription` ≤160, `shareImage`) |

**Internationalisation.** The CMS default locale is **`fr`**. `article`, `category`, `about`
and `global` are localised; `author` is not.

- Every request for a localised type takes a **`locale` parameter** —
  `GET /api/articles?locale=fr`. Omitting it returns the default locale only, not all
  locales. The client must send it explicitly rather than relying on the default.
- Localised entries expose a **`localizations`** relation to their siblings in other locales
  — the basis for a future language switcher and for `hreflang` tags.
- Locale belongs in the repository layer (§4.5), not in pages. When routing becomes
  multilingual, the locale is a route parameter mapped to the query parameter in one place.

`blocks` is a dynamic zone over `shared.media`, `shared.quote`, `shared.rich-text`,
`shared.slider`. Each entry carries a `__component` discriminator.

Two things that will bite you if you assume otherwise:

- **`shared.rich-text.body` is Markdown** (`richtext`), **not** the Strapi Blocks JSON AST.
  Render it with a Markdown renderer.
- **Media URLs from Strapi are relative** (`/uploads/...`). Confirmed against the running
  CMS: the local upload provider stores relative paths and the CMS `server.url` setting does
  **not** rewrite them. Prefix them with `STRAPI_URL` in exactly one place (§4.5), never
  inline in a template. If the CMS later moves uploads to object storage, the provider will
  start returning absolute URLs and this prefixing must become conditional.

---

## 2. Setup & commands

### Package manager

**pnpm only.** Never run `npm install` or `yarn` here, and never commit a second lockfile.
(The sibling CMS repo uses npm — do not carry habits across.)

```bash
pnpm install
```

### Scripts

| Command | Purpose |
|---|---|
| `pnpm dev` | Dev server on `http://localhost:4321` |
| `pnpm build` then `node ./dist/server/entry.mjs` | Run the standalone server the container runs |
| `pnpm build` | Production build to `./dist/` |
| `pnpm test` | `pnpm build`, then `node --test "tests/*.test.mjs"` on `dist/client/` |
| `pnpm check:weight` | Budgets on `dist/client/` (see §7); exit code 1 on any overrun |
| `pnpm preview` | Serve the build locally |
| `pnpm astro ...` | Astro CLI passthrough |

### Environment variables

There is no `.env` yet. When adding the Strapi integration, declare variables through the
**`astro:env` schema** in `astro.config.mjs` — do not read `import.meta.env` ad hoc.
The schema validates at build time and enforces the client/server boundary.

| Name | Context | Access | Purpose |
|---|---|---|---|
| `STRAPI_URL` | `server` | `public` | Base origin of the CMS (e.g. `http://localhost:1337`) |
| `STRAPI_API_TOKEN` | `server` | **`secret`** | Read-only API token, declared `optional` until a route actually needs it. **Never** `client`, never `PUBLIC_`-prefixed |

```js
// astro.config.mjs
env: {
  schema: {
    STRAPI_URL: envField.string({ context: 'server', access: 'public' }),
    STRAPI_API_TOKEN: envField.string({ context: 'server', access: 'secret' }),
  },
}
```

Add `.env` to `.gitignore` and ship a `.env.example` with placeholder values.

---

## 3. Code map

```
zero-blog-astro/
├── astro.config.mjs          site, node adapter, astro:env schema, integrations, fonts
├── Dockerfile                Multi-stage build; the prerender happens here
├── .env.example              Every variable the astro:env schema declares
├── tsconfig.json             extends astro/tsconfigs/strict
├── public/                   Served verbatim: favicon, og-default.png (target: robots.txt)
├── scripts/                  Out-of-build tooling: check-weight.mjs, lib/ (dist, tokens, contrast,
│                             weight), og-default generator (see scripts/README.md)
├── tests/                    node:test files (*.test.mjs) asserting on dist/client/
└── src/
    ├── assets/               Images + the single Fraunces woff2 (src/assets/fonts/)
    ├── components/           .astro presentational components
    ├── layouts/              Page shells
    ├── pages/                File-based routes
    ├── content/blog/         Local Markdown/MDX (legacy — superseded by Strapi)
    ├── content.config.ts     Content collection schemas
    ├── consts.ts             SITE_TITLE, SITE_DESCRIPTION (placeholders)
    └── styles/
        ├── tokens.css        The only file with literal colors: palette, dark mode, font stack
        └── global.css        Global stylesheet, system fallback @font-face, built on the tokens
```

### Current routes

| Route | File | Source |
|---|---|---|
| `/` | `src/pages/index.astro` | static |
| `/about` | `src/pages/about.astro` | static |
| `/blog` | `src/pages/blog/index.astro` | `getCollection('blog')` |
| `/blog/[...slug]` | `src/pages/blog/[...slug].astro` | `getStaticPaths()` |
| `/rubriques/[slug]` | `src/pages/rubriques/[slug].astro` | `getStaticPaths()` over `CATEGORIES` |
| `/404` | `src/pages/404.astro` | static |
| `/rss.xml` | `src/pages/rss.xml.js` | `getCollection('blog')` |
| `/sitemap-index.xml` | — | `@astrojs/sitemap` |
| `/health` | `src/pages/health.ts` | on demand — 204, polled by the deployment pipeline |

### Target structure — where new code goes

```
src/
├── lib/
│   ├── strapi/
│   │   ├── client.ts         THE ONLY place fetch() touches Strapi
│   │   ├── query.ts          Query-string builder (filters, populate, pagination)
│   │   ├── populate.ts       Named populate constants per use case
│   │   ├── article.ts        Repository: getArticles, getArticleBySlug, ...
│   │   ├── category.ts       Repository
│   │   └── global.ts         Repository (site-wide settings)
│   ├── mappers/              Strapi DTO → domain model
│   └── url.ts                mediaUrl(), articleHref() — no hardcoded paths anywhere else
├── types/
│   ├── strapi.ts             Raw API response shapes (envelopes, DTOs)
│   └── domain.ts             Article, Author, Category, Block — what the UI consumes
├── layouts/Layout.astro      Base document shell (currently missing)
└── components/blocks/        One component per shared.* block + index.ts registry
```

### Naming conventions

- Components and layouts: `PascalCase.astro`.
- Modules under `lib/`, `types/`, `utils/`: `kebab-case.ts`.
- Pages: `kebab-case.astro`, matching the public URL.
- Domain types: singular `PascalCase` (`Article`, not `ArticleType` or `IArticle`).
- Block components: `<BlockName>.astro` keyed in the registry by the Strapi `__component`
  string (`shared.rich-text` → `RichText.astro`).

---

## 4. Architecture doctrine

Astro makes it very easy to put a `fetch`, a data transform, and 200 lines of markup in one
`.astro` file. The rules below exist to prevent exactly that.

### 4.1 Rendering strategy — hybrid

**Target: hybrid.** Prerender by default, render on demand only where genuinely needed.

Note that `output: 'hybrid'` **no longer exists** in Astro 5+. Hybrid is achieved by:

1. keeping `output: 'static'` (the default),
2. **adding an adapter** (e.g. `@astrojs/node` in standalone mode) — this is a prerequisite,
3. setting `export const prerender = false` on the individual routes that must be dynamic.

| Route kind | Mode | Why |
|---|---|---|
| Home, blog index, article pages, about | **prerendered** | Content changes on publish, not per request. Fastest, cheapest, most cacheable. |
| Draft preview (`/preview/[slug]`) | `prerender = false` | Must read unpublished Strapi content per request, using the secret token |
| Search / filtered listings | `prerender = false` | Query is per request |

**Rule:** a route is prerendered unless you can state, in one sentence, why its output
differs per request. Write that sentence in a comment above `export const prerender = false`.

Prerendered content is refreshed by rebuilding. Trigger the rebuild from a **Strapi
webhook** on publish — do not switch a page to SSR merely to get fresher content.

### 4.2 SRP — Single Responsibility Principle

**Each file has one reason to change.**

| Layer | Sole responsibility | Must never |
|---|---|---|
| `pages/*.astro` | Route: fetch via a repository, pass props to components | Contain `fetch`, transform DTOs, or hold layout markup |
| `layouts/*.astro` | Document/page shell | Fetch data |
| `components/*.astro` | Render the props it is given | Fetch data, know about Strapi |
| `lib/strapi/client.ts` | HTTP transport + error normalization | Know about any specific content type |
| `lib/strapi/<entity>.ts` | One repository per content type | Know about HTTP details or markup |
| `lib/mappers/` | DTO → domain model | Fetch, or render |

❌ **Wrong** — a page doing transport, transformation and presentation:

```astro
---
const res = await fetch(`${import.meta.env.STRAPI_URL}/api/articles?populate=*`);
const json = await res.json();
const articles = json.data.map((a) => ({ ...a, cover: 'http://localhost:1337' + a.cover.url }));
---
<h1>Blog</h1>
{articles.map((a) => <article>…40 lines of markup…</article>)}
```

Four responsibilities, a hardcoded origin, `populate=*`, and no error handling.

✅ **Right:**

```astro
---
import Layout from '../../layouts/Layout.astro';
import ArticleCard from '../../components/ArticleCard.astro';
import { getArticles } from '../../lib/strapi/article';

const articles = await getArticles({ page: 1 });
---
<Layout title="Blog">
  <ul>{articles.map((article) => <li><ArticleCard {article} /></li>)}</ul>
</Layout>
```

**Counter-example already in the repo:** `BaseHead.astro` conflates three responsibilities —
it imports the global stylesheet, preloads fonts, and emits every SEO/OG meta tag. Global CSS
should not ship as a side effect of a `<head>` component.

### 4.3 OCP — Open/Closed Principle

**Adding a Strapi block must not mean editing existing code.**

Render dynamic zones through a **component registry** keyed by `__component`:

✅

```ts
// src/components/blocks/index.ts
import Media from './Media.astro';
import Quote from './Quote.astro';
import RichText from './RichText.astro';
import Slider from './Slider.astro';

export const blockRegistry = {
  'shared.media': Media,
  'shared.quote': Quote,
  'shared.rich-text': RichText,
  'shared.slider': Slider,
} as const;
```

```astro
---
import { blockRegistry } from './blocks';
const { blocks } = Astro.props;
---
{blocks.map((block) => {
  const Block = blockRegistry[block.__component];
  return Block ? <Block {...block} /> : null; // unknown block degrades, never crashes
})}
```

❌ A growing `{block.__component === 'shared.quote' ? <Quote …/> : block.__component === …}`
chain in `[...slug].astro`. Every new CMS block would then modify a page that already works.

A new block type becomes: one new component file + one registry line. Nothing else changes.

### 4.4 ISP — Interface Segregation Principle

**Components receive what they need, not everything that exists.**

❌ `<ArticleCard article={article} />` where the card needs only a title, a date, a slug and
a cover — but the prop type demands a full `Article` including `blocks` and `author.email`.

✅ Either a narrow prop interface:

```ts
interface Props {
  title: string;
  description: string;
  slug: string;
  pubDate: Date;
  cover?: ImageRef;
}
```

…or an explicit narrow type (`ArticleSummary` vs `ArticleDetail`) in `src/types/domain.ts`.
This pairs with §4.7: the list query populates less than the detail query, so a summary
component that demands `blocks` forces the API to over-fetch.

The same applies to repositories: prefer `getArticlesByCategory(slug)` over
`getArticles({ category?, published?, withBlocks?, withAuthor?, ... })`.

### 4.5 DIP — Dependency Inversion Principle

**Pages depend on repositories and domain types, never on Strapi's wire format.**

```
pages / components  →  domain model (src/types/domain.ts)
                            ↑
                       lib/mappers/         ← the only code that knows the Strapi envelope
                            ↑
                   lib/strapi/<entity>.ts   ← repositories
                            ↑
                    lib/strapi/client.ts    ← the only fetch()
```

Rules:

- **`fetch` to Strapi appears in exactly one file:** `src/lib/strapi/client.ts`. It owns the
  base URL, the `Authorization` header, timeouts, and error normalization. Grepping
  `fetch(` in `src/pages/` or `src/components/` must return nothing.
- **The `data` / `attributes` envelope never leaves `lib/`.** Mappers strip it. A template
  that writes `article.data.attributes.title` is a DIP violation and will break on the next
  Strapi response-shape change.
- **Media URL prefixing lives in `lib/url.ts`** (`mediaUrl(path)`), not inline in templates.
- **Internal hrefs come from helpers** (`articleHref(slug)`), not from repeated template
  literals. The current code already duplicates `/blog/${post.id}/` between
  `blog/index.astro` and `rss.xml.js`.

The test: replacing Strapi with another CMS should touch `src/lib/strapi/` and
`src/lib/mappers/` — and nothing else.

### 4.6 LSP — Liskov Substitution Principle

**Interchangeable components must be genuinely interchangeable.**

Every block component in the registry (§4.3) must accept the same prop contract — the block
object itself — and render safely with any optional field missing. The renderer picks a
component by string key and cannot special-case one of them; if `Slider.astro` needs a prop
the others do not receive, the registry breaks.

Likewise, every repository function returns a domain model or throws — never sometimes a
model, sometimes `null`, sometimes a raw envelope. Pick one contract per function and hold it.

### 4.7 KISS — Keep It Simple

- **`.astro` first.** Ship zero JavaScript by default. Add a framework island **only** for
  genuine client-side interactivity, and use the narrowest directive (`client:visible` over
  `client:load`). There are currently no framework components at all — keep it that way
  unless a real need appears.
- **No state manager, no data-fetching library, no caching layer.** Astro's build already
  fetches once per build; adding a cache in front of it is complexity with no payoff.
- **Let the CMS do the filtering.** Use Strapi query params rather than fetching everything
  and filtering in JS.
- **Populate deliberately.** `ARTICLE_LIST_POPULATE` (cover, category) is not
  `ARTICLE_DETAIL_POPULATE` (cover, author.avatar, category, blocks). Never ship
  `populate=*` — it drags every relation and every image format over the wire.
- **Do not abstract until it repeats.** The third occurrence justifies the helper, not the first.

### 4.8 CLEAN — Clean code rules

- **No `any`.** The repo currently has zero occurrences — keep that record. Type the Strapi
  responses in `src/types/strapi.ts`, and validate at the boundary (Zod is already available
  transitively via Astro) if the shape is not guaranteed.
- **No hardcoded URLs or user-facing strings in components.** Today's offenders:
  `https://example.com` in `astro.config.mjs`, the Astro social links duplicated in
  `Header.astro` and `Footer.astro`, `"Your name here"` in `Footer.astro`, `lang="en"` in
  three files, `'en-us'` in `FormattedDate.astro`. Site-wide values come from the Strapi
  `global` single type or from `src/consts.ts`.
- **No duplicated document shell.** The `<!doctype html><html><head>…<body>` skeleton is
  currently copy-pasted across `index.astro`, `blog/index.astro` and `BlogPost.astro` — and
  `BlogPost.astro` is even missing the doctype. Extract `src/layouts/Layout.astro` and let
  every page use it.
- **No duplicated markup.** The three-icon social SVG block is byte-identical in
  `Header.astro` and `Footer.astro` (~60 lines each). Extract `SocialLinks.astro`.
- **Every component declares typed `Props`.** Follow `BaseHead.astro`'s
  `interface Props { … }` pattern. No untyped `Astro.props` destructuring.
- **TypeScript everywhere.** `src/pages/rss.xml.js` is the only JS file; new endpoints are
  `.ts` with a typed `APIContext`.
- **Handle failure explicitly.** A CMS fetch can fail. Decide per route: fail the build (for
  prerendered pages — a missing article should break the build, not ship an empty page) or
  return a 404/500 (for on-demand routes). Never render a silently empty page.
- **Consistent formatting.** `src/` uses **tabs**; JSON configs use 2 spaces. Keep it until
  Prettier lands (§7), then let Prettier decide.

---

## 5. Workflows

### 5.1 Add a page

1. Create `src/pages/<route>.astro`. The file path is the URL.
2. Wrap the content in `Layout.astro` — never re-declare `<html>`/`<head>`/`<body>`.
3. Fetch through a repository in the frontmatter; never `fetch` directly.
4. Decide prerender vs on-demand (§4.1) and default to prerendered.
5. Pass a real `title` and `description` to the layout so SEO/OG meta are correct.

### 5.2 Add a component

1. `src/components/PascalCase.astro`, with a typed `interface Props`.
2. Presentational only — props in, markup out. No data fetching.
3. Scoped `<style>` inside the component; only genuinely global rules go in `global.css`.
4. Make it a framework island **only** if it needs client-side JS, and justify the directive.

### 5.3 Consume a new Strapi endpoint

The order matters — follow it exactly:

1. **Type the wire shape** in `src/types/strapi.ts` (the raw envelope and DTO).
2. **Type the domain model** in `src/types/domain.ts` (what the UI actually needs).
3. **Add a populate constant** in `src/lib/strapi/populate.ts` for this use case.
4. **Add a repository function** in `src/lib/strapi/<entity>.ts`, calling the shared client.
5. **Add a mapper** in `src/lib/mappers/` — DTO → domain, applying `mediaUrl()` to media paths.
6. **Use it in the page.** The page imports only the repository function and the domain type.

If a step feels skippable, it is the step that will leak the Strapi envelope into a template.

### 5.4 Add a Strapi dynamic-zone block

1. The block must exist in `cms-zero` first (`src/components/shared/<name>.json`, registered
   in the `blocks` dynamic zone of `article` **and** `about`).
2. Create `src/components/blocks/<Name>.astro`, accepting the block object as props.
3. Add one line to `blockRegistry` in `src/components/blocks/index.ts`.
4. Extend the block union type in `src/types/domain.ts`.
5. Change nothing else. If you had to edit a page, §4.3 was violated.

### 5.5 Choose prerender vs on-demand

Default is prerendered. Set `export const prerender = false` only with a one-line comment
stating why the output differs per request. Adding the first on-demand route requires
installing an adapter — do that in its own change, not buried in a feature.

### 5.6 Fix the SEO chain

1. Set a real `site` in `astro.config.mjs`. `Astro.site` feeds canonical URLs,
   `@astrojs/sitemap` and `@astrojs/rss`; while it is `https://example.com`, **all** SEO
   output is wrong.
2. Source `siteName` / `siteDescription` / `defaultSeo` from the Strapi `global` single type
   instead of `src/consts.ts`.
3. Give each page a distinct OG image — `BaseHead.astro` currently defaults every page to
   `blog-placeholder-1.jpg`.
4. Add `public/robots.txt` pointing at the sitemap.

---

## 6. Guardrails — never do these

- **Never call `fetch` to Strapi outside `src/lib/strapi/`.** No exceptions, not "just this once".
- **Never expose `STRAPI_API_TOKEN` to the client.** It is a `secret`/`server` variable. Never
  prefix it with `PUBLIC_`, never reference it in a component that ships to the browser, and
  never pass it through a client island's props.
- **Never leak the raw `data` / `attributes` envelope into a template.** Map it in `lib/`.
- **Never hardcode the CMS origin.** It comes from `STRAPI_URL`, through `lib/url.ts`.
- **Never commit `.env`.** Ship `.env.example` with placeholders.
- **Never deploy with `site: 'https://example.com'`.** Canonical URLs, sitemap and RSS all
  derive from it.
- **Never use `populate=*`.** Use a named populate constant.
- **Never introduce npm or yarn here**, and never commit a second lockfile.
- **Never re-declare the document shell** in a page once `Layout.astro` exists.
- **Never add a framework integration** (React/Vue/Svelte) without a concrete interactivity
  requirement — it changes the whole build and bundle profile.
- **Never push directly to `main`.** Branch, then open a PR.
- **Never change the expected Strapi shape unilaterally** — the contract lives in `cms-zero`.

---

## 7. Quality gates

A change is done when all of the following pass.

**Available today:**

```bash
pnpm test             # pnpm build + node --test "tests/*.test.mjs"
pnpm check:weight     # budgets on dist/client/
```

Tests are plain `node:test` files in `tests/` (`.mjs`, JSDoc for types), written TDD
(red test seen before the code). Prefer assertions on `dist/client/` through
`scripts/lib/dist.mjs`. **No test imports a `.ts` file**: Node < 22.18 cannot load them, so
logic under test lives in `.mjs` modules (enforced by `tests/no-ts-import.test.mjs`).
Do not add another test framework.

Budgets enforced by `pnpm check:weight` (1 KB = 1 024 bytes):

| Budget | Limit |
|---|---|
| CSS (linked + inline) per page | ≤ 15 KB |
| Home page, images excluded | ≤ 100 KB |
| Webfonts | one only (Fraunces woff2), ≤ 50 KB |
| Client JavaScript | none: no `<script`, no `on…=` attribute, no `javascript:`, no `.js`/`.mjs` file |

Literal colors only in `src/styles/tokens.css`.

`public/og-default.png` is generated, not drawn: `scripts/og-default.svg` is regenerated with
fonttools **outside the project** (nothing in `package.json`), then rasterised with sharp.
Only the PNG is served. Commands in `scripts/README.md`.

**To be set up (currently missing — there are no `devDependencies` at all; treat as required
work, not optional):**

| Gate | Setup | Command |
|---|---|---|
| Type check | `pnpm add -D typescript @astrojs/check` | `pnpm check` → `astro check` |
| Lint | `pnpm add -D eslint eslint-plugin-astro typescript-eslint` | `pnpm lint` |
| Format | `pnpm add -D prettier prettier-plugin-astro` | `pnpm format` — settles the tabs/spaces inconsistency |
| E2E (optional) | `pnpm add -D @playwright/test` | Critical routes: `/`, `/blog`, an article page |

Until those exist, `pnpm test` plus a manual check in the browser is the verification.
Say so explicitly rather than claiming something is tested when only the build ran.

---

## 8. Known debt

Facts about the current repository. These are **not** conventions to imitate.

1. **No Strapi integration whatsoever.** All content is local Markdown/MDX. The entire §4
   architecture is still to be built — and it must now be built **locale-aware** from the
   start, since the CMS has i18n enabled (see §1).
2. ~~`site: 'https://example.com'`~~ — **fixed**, now `https://zero-strategie.dev`.
3. **No `devDependencies`** — TypeScript is not installed, so `astro check` cannot run.
   No linter, no formatter. CI, Docker and the adapter now exist; the CI's only
   gate is `pnpm build` (it does not run `pnpm test` nor `pnpm check:weight` yet).
4. ~~`package.json` has an empty `"name"`~~ — **fixed**, and `packageManager` is now pinned so
   corepack resolves the same pnpm locally, in CI and in the image.
5. **`tsconfig.json` sets `strictNullChecks: true`** redundantly — the `astro/tsconfigs/strict`
   preset already implies it.
6. **`src/pages/rss.xml.js` is untyped JS** and spreads `...post.data` into feed items,
   silently pushing an `ImageMetadata` object into the XML.
7. **`Astro.site` is used unguarded** in `BaseHead.astro` and `context.site` in `rss.xml.js`;
   both misbehave if `site` is unset — currently masked only by the placeholder value.
8. **No base layout.** The document shell is duplicated across three files; `BlogPost.astro`
   is missing its `<!doctype html>`.
9. **The social SVG block is duplicated verbatim** between `Header.astro` and `Footer.astro`.
10. **`Header.astro` uses `color: var(--black)`** — an invalid color value. The token is a
    bare RGB triple (`--black: 15, 18, 25`) meant to be consumed as `rgb(var(--black))`, so
    the declaration is silently dropped.
11. **Layout widths are hardcoded in three places** (`720px` in `global.css`, `960px` in
    `blog/index.astro`, `720px` in `BlogPost.astro`) and the `720px` breakpoint is repeated
    in four files.
12. **Accessibility gaps** — no skip-to-content link, no `<nav aria-label>`, `alt=""` on all
    hero images including blog index cards (announcing content images as decorative),
    `target="_blank"` without `rel="noopener noreferrer"` (6 occurrences), no JSON-LD.
13. ~~Missing files~~ — `src/pages/404.astro` and `.env.example` exist now. Still missing:
    `public/robots.txt`.
14. ~~No dark mode~~ — **fixed**: `tokens.css` handles `prefers-color-scheme: dark`.
15. ~~`README.md` is the stock Astro starter README~~ — **fixed**; it now documents setup,
    the rendering strategy and the deployment contract.
