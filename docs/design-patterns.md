# Design patterns

The patterns this codebase is built on, and the rules that keep them working. Each entry says where
the pattern lives, what to do, and what goes wrong if you don't. Detail lives in the linked docs;
this file is the index and the checklist.

Two principles sit above every pattern:

- **Guardrail, not goal.** SOLID and DRY are tools for keeping code changeable. Do not add an
  abstraction until a second real use exists; a one-off helper stays in the file that uses it
  ([architecture.md](./architecture.md) §9).
- **Make the wrong thing hard.** Prefer a rule that ESLint, the type system or a boot-time check
  enforces over one that a reviewer has to remember.

---

## 1. Layered architecture with a one-way dependency rule

```text
app  →  features  →  modules  →  shared
```

- **Where:** `src/`, enforced by `import/no-restricted-paths` in `eslint.config.mjs`.
- **Rules:** a module never imports another module; a feature never imports another feature;
  `shared/` imports nothing from the business layers. Cross-layer imports use `@/*`; relative
  imports stay inside one module or feature.
- **Composition happens in `features/`.** When `booking` needs `trip` data, the feature fetches both
  and passes props down — the modules stay unaware of each other.
- **If the boundary keeps fighting you,** the boundary is wrong: merge the two modules or extract the
  shared concept. Do not add an `eslint-disable`.
- **Details:** [architecture.md](./architecture.md).

## 2. Thin routes

- **Where:** `src/app/**/page.tsx`.
- **Rule:** a page reads like a table of contents — params, metadata, redirects, and _starting_ the
  data. No data shaping, business rules or form logic; anything you would unit-test lives in a
  module or feature.

## 3. Server Components by default, smallest client leaf

- **Rule:** add `'use client'` only on the smallest component that needs state, effects or event
  handlers. The directive is a bundle boundary: everything imported below it ships to the browser.
- **Exception:** `app/providers.tsx` is the one deliberate root client boundary; keep it to
  providers only.
- **Details:** [architecture.md](./architecture.md) §8.

## 4. Two data paths, one owner per datum

| Need                                        | Pattern                                              |
| ------------------------------------------- | ---------------------------------------------------- |
| Initial, read-once, server-driven data      | Promise props + `use()` inside `<Suspense>`          |
| Data the client refetches, mutates, filters | TanStack Query (+ `HydrationBoundary` if prefetched) |

- **Rules:** start independent requests without `await` and pass the promises down (sequential
  `await`s for independent calls are a waterfall bug). Never fetch the same field through both
  paths. No `fetch` in `useEffect`.
- **Details:** [data-fetching.md](./data-fetching.md).

## 5. Transport adapter (the only place that knows about axios)

- **Where:** `src/shared/lib/api.ts`, `api.server.ts`.
- **Rules:** every failure leaving `api.ts` is an `ApiError`; nothing above it catches axios
  errors. `*.api.ts` fetchers contain transport only — no React, no caching. Server calls use
  `getServerApi()` (forwards cookies, absolute base URL); wrap server fetchers in React `cache()`
  because axios is not deduplicated like `fetch`.
- **Why:** swapping the HTTP client later is a change to one file.

## 6. Backend-for-frontend proxy

- **Where:** `src/app/api/[...path]/route.ts`.
- **Rule:** the browser calls `/api/*`; the server forwards to the private backend. The backend
  origin stays out of the client and there is no CORS to configure. `API_BASE_URL` must never point
  back at this app.

## 7. Query options factory and key factory

Per domain, three files, each with one job:

```text
services/<domain>.api.ts      transport, no React
services/<domain>.query.ts    qk<Domain> keys + queryOptions + mutation hooks
hydrate/<domain>.hydrate.ts   server prefetch + dehydrate
```

- **Rules:** export `queryOptions()` objects (not only hooks) so the server and the client share one
  definition. Query keys are built only in `*.query.ts` — never an inline `queryKey` or `queryFn` in
  a component. Mutations live next to the queries they invalidate.
- **Details:** [data-fetching.md](./data-fetching.md) §3–4.

## 8. Per-request vs singleton state

- **Where:** `getQueryClient()` in `src/shared/lib/query-client.ts`.
- **Rule:** on the server create a fresh `QueryClient` per request, so no request sees another's
  cache; in the browser keep one lazily created singleton. Never hoist a `QueryClient` to a module
  constant on the server.

## 9. Parse, don't validate

- **Rules:** check external data once, at the boundary, and convert it to a typed internal form —
  no boolean validator followed by `as`. Forms use a zod schema in the owning layer's `validators/`
  with `zodResolver` and react-hook-form. The client validates _shape_; only the server validates
  _truth_, and `applyApiErrorToForm` (`shared/lib/form.ts`) maps its field errors back onto inputs.
- **No `any`;** index access is `T | undefined`; use `import type` for type-only imports.

## 10. Fail fast on configuration

- **Where:** `src/shared/config/env.ts` (the only place that reads `process.env`) and
  `env.validate.ts` (run once at boot from `src/instrumentation.ts`).
- **Rules:** declare a variable in `src/shared/types/env.d.ts`, read it only through
  `@/shared/config/env`, validate it in `env.validate.ts`. A missing variable must stop the process
  at start, not surface as a 500 hours later. Keep `process.env.X` a literal member expression —
  Next.js inlines only that form — and keep zod out of `env.ts` so it stays out of the client bundle.

## 11. URL as state

- **Where:** `shared/lib/search-params.ts` and `features/<feature>/search-params.ts`.
- **Rule:** filters, pagination, sort and tabs live in the URL via nuqs, not `useState`. Export the
  parser map (not just the loader) so the server `createLoader` and the client `useQueryStates` stay
  in sync, and use the parsed values as the query key.

## 12. Composition over modification (UI)

- **Variants, not forks:** components are built with `class-variance-authority`; add a variant
  instead of wrapping or copying a component.
- **shadcn is source, not a dependency:** add with `pnpm ui add <component>` into
  `src/shared/components/ui/` and edit it in place. Keep that folder business-agnostic; domain UI
  belongs to its module.
- **Polymorphism via `asChild`,** not by restyling a `<Link>`.
- **Styling:** no inline styles, ever; compose classes with `cn()` in the fixed concern order; name
  design tokens (`bg-primary`), never raw values (`bg-zinc-50`, hex). Missing token → add it to
  `globals.css`. One component per file.
- **Details:** [styling.md](./styling.md).

## 13. Errors are values at the edges

- Route-level failures use `error.tsx` / `global-error.tsx` / `not-found.tsx`.
- Anything crossing the network arrives as an `ApiError` (pattern 5); callers branch on it, they do
  not inspect axios internals.
- Retry policy lives in one place (`shouldRetryQuery`): 4xx is not retried, network and 5xx are.

## 14. Tests mirror the source tree

- **Rule:** no test files in `src/`. Unit tests in `tests/` mirror the path they cover
  (`tests/shared/lib/api.test.ts` ↔ `src/shared/lib/api.ts`), import explicitly from `vitest` (no
  globals). Playwright specs in `e2e/`. Export a policy function when you need to test it (as
  `shouldRetryQuery` is).

---

## Anti-patterns

| Do not                                                               | Instead                                               |
| -------------------------------------------------------------------- | ----------------------------------------------------- |
| Top-level `components/`, `services/` or `types.ts` for the whole app | Organise by domain under `modules/`                   |
| `features/trip/`, `features/booking/` (noun-named features)          | Those are modules; features are verbs/workflows       |
| `shared/` importing a module or feature                              | Move the code up, or extract the generic part down    |
| A module importing another module                                    | Compose in a feature, or merge the modules            |
| `await` in sequence for independent requests                         | Start all promises, then unwrap with `use()`          |
| `useEffect` + `fetch`                                                | Server fetch, or TanStack Query                       |
| Inline `queryKey` / `queryFn` in a component                         | `qk<Domain>` and `queryOptions` in `*.query.ts`       |
| A module-level `QueryClient` on the server                           | `getQueryClient()`                                    |
| `process.env` outside `shared/config/env.ts`                         | Declare, read via `env`, validate at boot             |
| `style={{…}}`, raw colour values, hand-sorted classes                | `cn()` and design tokens; let Prettier sort           |
| `'use client'` on a whole screen for one button                      | Push the directive down to the button's component     |
| `eslint-disable` to get past a boundary rule                         | Fix the modelling; if truly needed, one line + reason |
| Abstracting before a second use                                      | Keep it in the file; extract on the second real use   |

---

## Adding a new domain — the recipe

1. Create `src/modules/<domain>/` with only the folders you need (`components/`, `services/`,
   `hydrate/`, `hooks/`, `validators/`, `types.ts`). ESLint zones pick the new module up
   automatically; restart your editor's ESLint server so it does too.
2. Write `services/<domain>.api.ts` (transport only), then `services/<domain>.query.ts` (`qk<Domain>`,
   `queryOptions`, mutations), then `hydrate/<domain>.hydrate.ts` if a route prefetches it.
3. Put zod schemas in `validators/` and domain types in `types.ts`.
4. If a screen combines this domain with another, create `features/<workflow>/` — a verb phrase, not
   the domain's name — and compose there.
5. Add the route in `src/app/…/page.tsx`: start the data, render the feature or module component.
6. Add unit tests under `tests/` mirroring the paths, and an e2e spec if a route changed.
7. Run `pnpm check` (and `pnpm test:e2e` for a rendered page) before opening the PR — see
   [git-flow.md](./git-flow.md).
