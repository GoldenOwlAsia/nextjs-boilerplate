<!-- BEGIN:nextjs-agent-rules -->

# This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` (resolved from this file's directory; in monorepos the `next` package may not be visible from the repo root) before writing any code. Heed deprecation notices.

This block is written and re-added by `next dev` — verify at `node_modules/next/dist/server/lib/generate-agent-files.js`. Removing it from a diff only re-creates the uncommitted change; committing it with your work keeps the tree clean.

<!-- END:nextjs-agent-rules -->

# Project rules

Package manager is **pnpm**, Node **22** (`.nvmrc` — the unit suite does not run on Node 20). Run
`pnpm check` (typecheck + lint + format + unit tests) before declaring work done; `pnpm test:e2e` when
you touched routing or a rendered page.

Tests **never** go in `src/`. Unit tests live in `tests/`, mirroring the source tree
(`tests/shared/lib/api.test.ts` covers `src/shared/lib/api.ts`), with explicit imports from `vitest`
(no globals); Playwright specs in `e2e/`. Env vars are declared in `src/shared/types/env.d.ts`, read
via `@/shared/config/env`, and validated at boot in `@/shared/config/env.validate`.

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
- `src/shared/` — generic UI/hooks/lib/utils/types only, zero business logic, imports nothing from
  the business layers.
- `src/shared/types/` — cross-domain types only (there is no top-level `src/types/`); domain types
  stay in `modules/<domain>/types.ts` or `features/<feature>/types.ts`.

Cross-layer imports use the `@/*` alias; relative imports stay inside the same module/feature.

## Data layer — read [docs/data-fetching.md](./docs/data-fetching.md)

**Pick the path before writing the fetch.** Not every call belongs in TanStack Query:

- Initial, read-once, server-driven data → start the promises in the Server Component **without
  `await`**, pass them as props, unwrap with `use()` in the smallest Client Component, wrap in
  `<Suspense>`. Sequential `await`s for independent requests are a waterfall bug.
- Data the client refetches, invalidates after a mutation, paginates or filters → TanStack Query
  (+ `HydrationBoundary` when the server prefetches it).
- One owner per piece of data — never both paths for the same field.

- HTTP goes through `@/shared/lib/api` (axios). It throws `ApiError`; nothing above it may catch
  axios errors. `process.env` is read only in `@/shared/config/env`.
- Server-side calls use `getServerApi()` from `@/shared/lib/api.server` (forwards cookies, absolute
  base URL). `*.api.ts` fetchers take an optional client param; wrap server fetchers in React
  `cache()` — axios is not deduped like `fetch`.
- The browser reaches the backend through `app/api/[...path]` (BFF proxy); the server calls it
  directly. Don't point `API_BASE_URL` at this app.
- Forms: zod schema in the owning layer's `validators/`, `zodResolver` + react-hook-form, and
  `applyApiErrorToForm` from `@/shared/lib/form` for server-side field errors.
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

- **No inline styles, ever.** No `style={{...}}` on DOM elements or components — ESLint rejects it.
  Use Tailwind classes, or `globals.css` for genuinely global rules.
- Server Components by default; add `'use client'` only on the smallest interactive component.
- TypeScript is strict (see [docs/tooling.md](./docs/tooling.md)): no `any`, `import type` for
  type-only imports, index access is `T | undefined`, optional props that accept undefined must say
  `| undefined`.
- Prettier owns formatting — don't hand-format; run `pnpm format`.
