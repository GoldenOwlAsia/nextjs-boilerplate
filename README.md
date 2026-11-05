# nextjs-boilerplate

Next.js 16 (App Router) · React 19 · TypeScript strict · Tailwind v4 · TanStack Query · axios ·
nuqs · zod + react-hook-form · shadcn/ui + cnfast.

Feature-based architecture with layer boundaries enforced by ESLint, a BFF proxy route, boot-time env
validation, security headers, unit + e2e tests, and CI.

## Getting started

Requires **Node 22** (`.nvmrc`) and pnpm 10.

```bash
nvm use
pnpm install
cp .env.example .env.local
pnpm dev
```

Open [http://localhost:3000](http://localhost:3000). The home page is `src/app/(public)/page.tsx`.

## Setup with an AI agent

Hand this README to a coding agent and say "set up this repo". The agent should run the steps below
in order, stop at the first failure, and fix the cause rather than skip the step. Every step has a
check; do not continue until it passes.

1. **Read the rules first.** Read `AGENTS.md` (project rules, authoritative) and the four files in
   `docs/`. `AGENTS.md` also tells you to read `node_modules/next/dist/docs/` before writing Next.js
   code — this is Next.js 16, not the version in your training data.
2. **Node 22.** Required version is in `.nvmrc` (currently 22.23.4, a security-patched release;
   `engines` enforces `>=22.23.4`). Node 20 is end of life and the unit suite does not run on it.
   - Run `nvm install && nvm use` (or `fnm use` / `mise install`).
   - Check: `node -v` prints the version in `.nvmrc`.
3. **pnpm 10.** `packageManager` pins the exact version. Run `corepack enable` (or
   `npm i -g pnpm@10`). Check: `pnpm -v` starts with `10`. Use pnpm only — never npm or yarn.
4. **Install.** `pnpm install --frozen-lockfile`. Check: exits 0 and `pnpm-lock.yaml` is unchanged
   (`git status` shows no lockfile diff). Do not approve postinstall builds for `sharp` or
   `unrs-resolver`; `pnpm-workspace.yaml` ignores them on purpose.
5. **Environment.** `cp .env.example .env.local`, then set the three variables. Never commit
   `.env.local`; never read env vars outside `src/shared/config/env.ts`.

   | Variable                   | Meaning                                                                         |
   | -------------------------- | ------------------------------------------------------------------------------- |
   | `NEXT_PUBLIC_SITE_URL`     | Canonical origin of this app (`http://localhost:3000` locally)                  |
   | `NEXT_PUBLIC_API_BASE_URL` | Base URL the browser calls. Keep `/api` to go through the BFF proxy             |
   | `API_BASE_URL`             | Absolute backend origin used by the server. Must **not** point back at this app |

   Ask the user for the real `API_BASE_URL`; if they have no backend yet, keep the placeholder (pages
   that do not call the API still work). Check: the app boots without an env validation error.

6. **Browsers for e2e.** `pnpm exec playwright install chromium`. On Linux CI add `--with-deps`.
7. **Verify the toolchain.** `pnpm check` (typecheck + lint + format + unit tests). Check: exits 0. On
   a fresh clone `pnpm typecheck` runs `next typegen` first — that is intended.
8. **Run it.** `pnpm dev`, then open <http://localhost:3000>. Check: the home page renders and the
   terminal shows no errors. Stop the server when done.
9. **Optional full check.** `pnpm build && pnpm test:e2e` (the e2e run builds and starts the app
   itself).

Common failures:

| Symptom                                          | Cause and fix                                                             |
| ------------------------------------------------ | ------------------------------------------------------------------------- |
| Unit tests crash on startup, `markAsUncloneable` | Running Node 20. Switch to the `.nvmrc` version                           |
| `Cannot find name 'LayoutProps'`                 | Ran `tsc` directly. Use `pnpm typecheck`, which runs `next typegen` first |
| Env validation error at boot                     | A variable from step 5 is missing or `API_BASE_URL` points at this app    |
| `pnpm install` rewrites the lockfile             | Wrong pnpm major. Use pnpm 10                                             |
| Playwright says the browser is missing           | Run step 6                                                                |

Before making changes, follow `AGENTS.md`: run `pnpm check` before declaring work done, and put
tests in `tests/` (never in `src/`).

## Scripts

```bash
pnpm dev            # dev server (Turbopack)
pnpm build          # production build
pnpm start          # serve the production build

pnpm typecheck      # tsc --noEmit
pnpm lint           # eslint
pnpm lint:fix       # eslint --fix
pnpm format         # prettier --write .
pnpm test           # vitest (unit)
pnpm test:watch     # vitest watch
pnpm test:e2e       # playwright (builds + starts the app itself)

pnpm check          # typecheck + lint + format + unit tests  ← run before pushing
```

First e2e run needs the browser once: `pnpm exec playwright install chromium`.

## Structure

```text
src/
├── instrumentation.ts   server boot hook (env validation, tracing)
├── app/                 routing, layouts, providers, error/not-found, api/ (BFF proxy)
├── features/            user-facing workflows (compose multiple modules)
├── modules/             isolated business domains
└── shared/              generic UI, hooks, lib (api, query-client, search-params, form),
                         config, constants, cross-domain types

tests/                   unit tests, mirroring the src/ tree (src/ holds no test files)
e2e/                     Playwright specs
```

Dependencies point one way, and ESLint enforces it:

```text
app → features → modules → shared
```

## Docs

| Doc                                          | Read it when                                                                                            |
| -------------------------------------------- | ------------------------------------------------------------------------------------------------------- |
| [Architecture](./docs/architecture.md)       | Deciding where new code goes; module vs feature; Server vs Client                                       |
| [Data fetching](./docs/data-fetching.md)     | Choosing between promise props + `use()` and TanStack Query; API calls, mutations, hydration, URL state |
| [Styling](./docs/styling.md)                 | Writing any UI: `cn()`, class grouping, design tokens, shadcn/ui                                        |
| [Tooling](./docs/tooling.md)                 | TypeScript strict flags, ESLint boundaries, Prettier, testing, CI, env validation                       |
| [Design patterns](./docs/design-patterns.md) | Patterns the code must follow, anti-patterns, recipe for adding a domain                                |
| [Git flow](./docs/git-flow.md)               | Branch and commit naming, PR rules, CI gates, rules for AI agents                                       |
