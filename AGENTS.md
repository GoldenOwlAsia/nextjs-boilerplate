<!-- BEGIN:nextjs-agent-rules -->

# This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` (resolved from this file's directory; in monorepos the `next` package may not be visible from the repo root) before writing any code. Heed deprecation notices.

This block is written and re-added by `next dev` — verify at `node_modules/next/dist/server/lib/generate-agent-files.js`. Removing it from a diff only re-creates the uncommitted change; committing it with your work keeps the tree clean.

<!-- END:nextjs-agent-rules -->

# Project rules

Package manager is **pnpm**. Run `pnpm check` (typecheck + lint + format) before declaring work done.

## Architecture — read [docs/architecture.md](./docs/architecture.md) before adding files

Feature-based layers with a one-way dependency direction, enforced by ESLint
(`import/no-restricted-paths`):

```text
app → features → modules → shared
```

- `src/app/` — routing, layouts, metadata, page composition. No business logic in `page.tsx`.
- `src/modules/<domain>/` — one isolated business domain (`services/*.api.ts`, `services/*.query.ts`,
  `hydrate/*.hydrate.ts`, `components/`, `hooks/`, `validators/`, `types.ts`). **A module never
  imports another module.**
- `src/features/<feature>/` — a user-facing workflow composing several modules. Never duplicate a
  domain here; never import another feature.
- `src/shared/` — generic UI/hooks/lib/utils only, zero business logic, imports nothing from the
  business layers.
- `src/types/` — types shared across domains only; domain types stay in their own layer.

Cross-layer imports use the `@/*` alias; relative imports stay inside the same module/feature.

## Data layer — read [docs/data-fetching.md](./docs/data-fetching.md)

- HTTP goes through `@/shared/lib/api` (axios). It throws `ApiError`; nothing above it may catch
  axios errors. `process.env` is read only in `@/shared/config/env`.
- Per domain: `services/<domain>.api.ts` (transport, no React) → `services/<domain>.query.ts`
  (`qk<Domain>` keys + `queryOptions` + mutation hooks) → `hydrate/<domain>.hydrate.ts` (server
  prefetch + `dehydrate`). Export `queryOptions()` objects, not just hooks, so server and client
  share one definition.
- Query keys are built only in `*.query.ts`, never inline in a component.
- Filters, pagination, sort, tabs → URL via nuqs (`useQueryStates` + `createLoader`), and the parsed
  values are the query key. Not `useState`.
- `getQueryClient()` from `@/shared/lib/query-client`; never hoist a `QueryClient` to a module
  constant on the server.

## Code style

- Server Components by default; add `'use client'` only on the smallest interactive component.
- TypeScript is strict (see [docs/tooling.md](./docs/tooling.md)): no `any`, `import type` for
  type-only imports, index access is `T | undefined`, optional props that accept undefined must say
  `| undefined`.
- Prettier owns formatting — don't hand-format; run `pnpm format`.
