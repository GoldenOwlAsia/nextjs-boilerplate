# Architecture

Next.js 16 App Router · React 19 · TypeScript (strict) · Tailwind v4 · TanStack Query · axios · nuqs

This document explains **why the folders look like this** and **where new code goes**. Read it once
before your first PR; after that, section 9 is the part you come back to.

---

## 1. The one rule

```text
app  →  features  →  modules  →  shared
```

Dependencies point one way. Never sideways, never backwards.

Everything else in this document is a consequence of that rule.

| Layer       | Owns                                              | Answers                                           |
| ----------- | ------------------------------------------------- | ------------------------------------------------- |
| `app/`      | URLs, layouts, metadata, composition              | "What does this route render?"                    |
| `features/` | User-facing workflows across several domains      | "What can the user accomplish?"                   |
| `modules/`  | One isolated business domain                      | "What business concepts does the system have?"    |
| `shared/`   | Generic infrastructure and UI, incl. shared types | "What would still make sense in another product?" |

The rule is enforced by ESLint (`import/no-restricted-paths`), not by discipline. A violation fails
`pnpm lint`, not code review.

### Why one-way

Two-way dependencies are how a codebase stops being deletable. When `booking` imports `payment` and
`payment` imports `booking`, you can no longer reason about, test, or remove either one alone. The
cost of the rule is occasional duplication and one extra layer of indirection; the benefit is that
every module can be understood, tested, and deleted in isolation. That trade is worth making early —
it is nearly impossible to make later.

---

## 2. Directory map

```text
src/
├── instrumentation.ts          # server boot hook — validates env, wires tracing
│
├── app/                        # routing only — no business logic
│   ├── layout.tsx
│   ├── providers.tsx           # the single client boundary at the root
│   ├── error.tsx               # route error boundary
│   ├── global-error.tsx        # root-layout error boundary
│   ├── not-found.tsx
│   ├── globals.css
│   ├── api/
│   │   ├── health/route.ts     # liveness probe
│   │   └── [...path]/route.ts  # BFF proxy to the backend
│   ├── (public)/page.tsx
│   └── (dashboard)/
│
├── features/                   # workflows that compose modules
│   └── <feature>/
│       ├── components/
│       ├── hooks/
│       ├── services/           # orchestration across modules
│       ├── validators/
│       ├── search-params.ts    # nuqs parsers for this screen
│       └── types.ts
│
├── modules/                    # one folder = one business domain
│   └── <domain>/
│       ├── components/
│       ├── services/
│       │   ├── <domain>.api.ts     # raw HTTP, no React
│       │   └── <domain>.query.ts   # query keys + queryOptions + mutations
│       ├── hydrate/
│       │   └── <domain>.hydrate.ts # server prefetch → dehydrated state
│       ├── hooks/
│       ├── validators/
│       └── types.ts
│
├── shared/                     # zero business knowledge
│   ├── components/
│   │   ├── ui/                 # shadcn primitives (Button, ...)
│   │   └── layout/             # Header, Sidebar, PageShell
│   ├── hooks/
│   ├── lib/                    # api.ts, api.server.ts, query-client.ts,
│   │                           # search-params.ts, form.ts, utils.ts (cn)
│   ├── utils/
│   ├── constants/              # site.ts
│   ├── config/                 # env.ts, env.validate.ts
│   └── types/                  # api.ts, pagination.ts, env.d.ts
│
tests/                          # unit tests, mirroring the src/ tree
├── setup.ts
├── app/
└── shared/
e2e/                            # Playwright specs
```

`src/` is production code only — **no test files live there**. `tests/` mirrors the `src/` tree
(`tests/shared/lib/api.test.ts` covers `src/shared/lib/api.ts`), so the path tells you what a spec
covers, and shipping code is never interleaved with things that never ship. `e2e/` is Playwright's,
at the repo root by convention.

Organize by domain, not by file kind. A top-level `components/` or `services/` folder for the whole
app looks tidy on day one and tells you nothing on day ninety: you can no longer see what the system
does by listing a directory, and every change touches five folders.

---

## 3. `app/` — routing, and nothing else

A `page.tsx` should read like a table of contents. It starts the data and hands it to a component —
which of the two shapes below you use depends on who owns the data afterwards
([data-fetching.md](./data-fetching.md)):

```tsx
// Server-driven data: start the requests, don't await, let them stream.
export default function DashboardPage() {
  const userPromise = getCurrentUser();
  const workspacePromise = getWorkspace();

  return (
    <Suspense fallback={<DashboardSkeleton />}>
      <DashboardScreen userPromise={userPromise} workspacePromise={workspacePromise} />
    </Suspense>
  );
}
```

```tsx
// Client-managed data: prefetch into the query cache instead.
export default async function TripDetailPage({ params }: PageProps<'/trips/[id]'>) {
  const { id } = await params;

  return (
    <HydrationBoundary state={await hydrateTripDetail(id)}>
      <TripBookingScreen tripId={id} />
    </HydrationBoundary>
  );
}
```

What belongs here: route params, `generateMetadata()`, `loading.tsx`, `error.tsx`, `not-found.tsx`,
auth redirects, and kicking off data — as promises or as a prefetch.

What does not: data shaping, business rules, form logic, anything you would want to unit-test.
Pages are the hardest place in the app to test and the easiest to duplicate — keep them thin.

Route groups (`(public)`, `(dashboard)`) exist to give sections different layouts without adding a
URL segment. Use them for layout boundaries, not as a filing system.

---

## 4. `modules/` — business domains

A module is a noun the business uses: `auth`, `user`, `trip`, `booking`, `payment`. It owns
everything about that concept — its API calls, query keys, cache invalidation, validation schemas,
types, and the components that only make sense for it (`TripCard`, `BookingStatusBadge`).

**A module never imports another module.** This is the constraint that keeps domains from fusing.
When you feel the pull:

| Situation                                           | Do this                                                          |
| --------------------------------------------------- | ---------------------------------------------------------------- |
| `booking` needs trip data to render a summary       | The feature fetches from both and passes props down              |
| `booking` needs a _shared concept_ (e.g. `Money`)   | Extract it — `shared/` if generic, a new module if it's a domain |
| `payment` needs to react to a booking being created | The feature orchestrates: create booking, then charge            |
| Two modules keep needing each other                 | They are one domain. Merge them.                                 |

The last row matters: if the boundary keeps fighting you, the boundary is wrong. Redraw it instead of
adding an escape hatch.

A module exposes its public surface through the files above; treat deep imports into another team's
module internals as a smell even where ESLint allows it.

---

## 5. `features/` — use cases

A feature is a verb phrase: `trip-booking`, `trip-search`, `checkout`, `user-dashboard`. It is the
only layer allowed to know that several domains exist at once.

```text
features/trip-booking
  ├─ modules/trip      → read trip details
  ├─ modules/booking   → create the booking
  └─ modules/payment   → charge the card
  └─ its own job: sequencing, rollback, wizard state, the screen itself
```

### The mistake this layer exists to prevent

```text
❌ features/trip/  features/booking/  features/payment/
```

That is just `modules/` with a different name, and it guarantees the same domain gets reimplemented
in the next feature that needs it. If the folder name is a noun, it belongs in `modules/`.

**A feature never imports another feature.** Two features needing the same logic is a signal, not an
inconvenience: business logic goes down into a module, generic UI goes into `shared/`.

---

## 6. `shared/` — the "any product" test

Before putting something in `shared/`, ask: _would this still make sense in a completely different
product?_ `Button`, `useDebounce`, the axios instance, a date formatter — yes. `TripCard`,
`formatBookingStatus` — no, those are `modules/`.

`shared/` importing from `modules/` or `features/` is the single most common way this architecture
rots, because it inverts the dependency arrow and silently makes "generic" code product-specific.
ESLint rejects it.

Current contents worth knowing:

| File                          | Purpose                                                |
| ----------------------------- | ------------------------------------------------------ |
| `shared/config/env.ts`        | The only place that reads `process.env`                |
| `shared/lib/api.ts`           | axios instance + `ApiError`; the transport boundary    |
| `shared/lib/api.server.ts`    | Server client: forwards cookies, absolute base URL     |
| `shared/lib/query-client.ts`  | `QueryClient` factory and defaults (server vs browser) |
| `shared/lib/search-params.ts` | Generic list URL state (`page`, `limit`, `q`, `sort`)  |
| `shared/lib/form.ts`          | Maps `ApiError.details` onto react-hook-form fields    |
| `shared/lib/utils.ts`         | `cn()` — class merging via cnfast, see styling.md      |
| `shared/constants/site.ts`    | Product name/description/URL used by metadata          |

See [data-fetching.md](./data-fetching.md) for how these fit together.

---

## 7. Types

```text
Cross-domain / transport   → src/shared/types/            (ApiResponse, Paginated, env.d.ts)
Domain concept             → modules/<domain>/types.ts
Screen/workflow shape      → features/<feature>/types.ts
Component props            → next to the component
```

Cross-domain types live under `shared/` because that is exactly what they are: code owned by no
business domain, usable by any of them. They inherit the `shared/` rule automatically — a type in
`shared/types/` may not reference a module or feature, and ESLint enforces it through the same zone.
If a type needs `Trip`, it is not a shared type.

One global `types.ts` for the whole app is an anti-pattern — it becomes a dumping ground nobody dares
to delete from, and it couples every domain to every other domain through a single import.

---

## 8. Server vs Client Components

Server by default. `'use client'` is a boundary, not a file annotation: everything imported below it
ships to the browser too.

```text
page.tsx                    Server  — starts requests, composes
└── TripSummary             Server  — awaits its own data, pure render
└── BookingWizard           Client  — useState, event handlers, use(promise)
    └── DatePicker          Client  (inherited)
```

Push the directive to the smallest component that needs interactivity. The common failure is a
`'use client'` at the top of a screen component because one button needs `onClick` — that sends the
entire subtree, and its dependencies, to the client for nothing.

`use(promise)` is a Client Component feature, so the same rule applies to it: pass the promise as
deep as it goes and unwrap it at the leaf, rather than promoting a whole screen to the client to read
one value. A Server Component that renders its own data does not need a promise prop at all — it can
just `await`.

`app/providers.tsx` is the one deliberate exception: it wraps the whole tree because context
providers must be client-side. Keep it to providers only.

---

## 9. Where does this go? — the decision table

| You are adding…                       | Location                                                                      |
| ------------------------------------- | ----------------------------------------------------------------------------- |
| A new URL                             | `app/<segment>/page.tsx`                                                      |
| A business entity + its API/queries   | `modules/<domain>/`                                                           |
| A screen combining 2+ domains         | `features/<feature>/`                                                         |
| A screen for exactly one domain       | `modules/<domain>/components/` — no feature needed                            |
| A generic Button/Input/hook/formatter | `shared/`                                                                     |
| A type used by 2+ domains             | `src/shared/types/`                                                           |
| Logic two modules both need           | A new module (business) or `shared/` (generic)                                |
| Logic two features both need          | A module                                                                      |
| URL state for a list screen           | `features/<feature>/search-params.ts`, built on `shared/lib/search-params.ts` |
| Initial, read-once data for a route   | Promise props + `use()` — no query needed ([why](./data-fetching.md))         |
| Data the client refetches or mutates  | `modules/<domain>/services/*.query.ts` + `hydrate/`                           |
| A one-off helper used in one file     | That file. Don't pre-abstract.                                                |

When two answers look equally right, choose the lower layer only if it is genuinely generic;
otherwise choose the higher one. Promoting code down a layer later is cheap; untangling a
business-specific "utility" out of `shared/` is not.

---

## 10. Enforcement

`eslint.config.mjs` declares the boundaries as `import/no-restricted-paths` zones. They match on
**resolved file paths**, so `@/modules/x` and `../../modules/x` are both caught.

Zones for module/feature isolation are generated by reading `src/modules` and `src/features` at
config load time, so adding `modules/payment` forbids every other module from being imported inside
it without editing any config. Two consequences worth knowing:

- **`import/no-unresolved` is part of the mechanism, not a nicety.** `no-restricted-paths` silently
  skips imports the resolver can't resolve — without the companion rule, a broken alias would
  disable every boundary while lint stayed green. Don't remove one without the other.
- **The zone list is built when ESLint loads its config.** CI is always correct (fresh process), but
  your editor's ESLint server keeps the old list until it restarts — a module folder created five
  minutes ago is unprotected in-editor until then.

```text
src/shared/lib/format.ts
  3:1  error  Unexpected path "@/modules/booking/types" imported in restricted zone.
              shared/ must stay business-agnostic: it cannot import app/, features/ or modules/
```

If a rule blocks you, it is nearly always pointing at a real modelling problem — re-read section 4
before reaching for an eslint-disable. When you do need one, put it on the single import line with a
comment explaining why.
