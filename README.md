# nextjs-boilerplate

Next.js 16 (App Router) · React 19 · TypeScript strict · Tailwind v4 · TanStack Query · axios · nuqs.

Feature-based architecture with layer boundaries enforced by ESLint.

## Getting started

```bash
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
pnpm check          # typecheck + lint + format:check  ← run before pushing
```

## Structure

```text
src/
├── app/        routing, layouts, providers, page composition
├── features/   user-facing workflows (compose multiple modules)
├── modules/    isolated business domains
├── shared/     generic UI, hooks, lib (api, query-client, search-params), config
├── types/      cross-domain types
├── styles/  tests/  e2e/
```

Dependencies point one way, and ESLint enforces it:

```text
app → features → modules → shared
```

## Docs

| Doc                                      | Read it when                                                      |
| ---------------------------------------- | ----------------------------------------------------------------- |
| [Architecture](./docs/architecture.md)   | Deciding where new code goes; module vs feature; Server vs Client |
| [Data fetching](./docs/data-fetching.md) | Writing API calls, queries, mutations, SSR hydration, URL state   |
| [Tooling](./docs/tooling.md)             | TypeScript strict flags, ESLint boundaries, Prettier              |
