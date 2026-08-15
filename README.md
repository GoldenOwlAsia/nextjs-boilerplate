# nextjs-boilerplate

Next.js 16 (App Router) · React 19 · TypeScript strict · Tailwind v4 · TanStack Query · axios ·
nuqs · zod + react-hook-form.

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

| Doc                                      | Read it when                                                                                            |
| ---------------------------------------- | ------------------------------------------------------------------------------------------------------- |
| [Architecture](./docs/architecture.md)   | Deciding where new code goes; module vs feature; Server vs Client                                       |
| [Data fetching](./docs/data-fetching.md) | Choosing between promise props + `use()` and TanStack Query; API calls, mutations, hydration, URL state |
| [Tooling](./docs/tooling.md)             | TypeScript strict flags, ESLint boundaries, Prettier, testing, CI, env validation                       |
