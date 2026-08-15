# nextjs-boilerplate

Next.js 16 (App Router) + React 19 + TypeScript + Tailwind CSS v4, organized with a
**feature-based architecture**.

## Getting started

```bash
pnpm install
pnpm dev
```

Open [http://localhost:3000](http://localhost:3000). The home page lives at
`src/app/(public)/page.tsx`.

## Scripts

```bash
pnpm dev            # dev server (Turbopack)
pnpm build          # production build
pnpm start          # serve the production build

pnpm typecheck      # tsc --noEmit
pnpm lint           # eslint
pnpm lint:fix       # eslint --fix
pnpm format         # prettier --write .
pnpm format:check   # prettier --check .
pnpm check          # typecheck + lint + format:check
```

## Structure

```text
src/
├── app/        routing, layouts, page composition
├── features/   user-facing workflows (compose multiple modules)
├── modules/    isolated business domains
├── shared/     generic UI, hooks, lib, utils, constants, config
├── types/      global shared types
├── styles/
├── tests/
└── e2e/
```

Dependency direction — enforced by ESLint:

```text
app → features → modules → shared
```

## Docs

- [Architecture & project structure](./docs/architecture.md) — layers, module vs feature, TanStack
  Query layout, import rules, Server vs Client Components.
- [Tooling](./docs/tooling.md) — TypeScript strict flags, ESLint boundaries, Prettier.
