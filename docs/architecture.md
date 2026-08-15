# Architecture & Project Structure

Feature-based architecture for this **Next.js App Router** application (React 19, Tailwind v4,
TanStack Query as the intended data layer).

Four layers, each with one responsibility:

| Layer       | Responsibility                      |
| ----------- | ----------------------------------- |
| `app/`      | Routing and page composition        |
| `features/` | User-facing workflows and use cases |
| `modules/`  | Isolated business domains           |
| `shared/`   | Generic reusable infrastructure/UI  |
| `types/`    | Global shared types                 |

The core rule:

```text
APP  →  FEATURE  →  MODULE  →  SHARED
```

A **module** answers: _"What business domain does the system provide?"_
A **feature** answers: _"What can the user accomplish with those domains?"_

Server Components are the default. Client Components are introduced only where interactivity or
client-side React features are actually needed.

---

## 1. Project structure

```text
src/
│
├── app/                        # routing only
│   ├── layout.tsx
│   ├── providers.tsx           # client providers (QueryClientProvider, theme, ...)
│   ├── globals.css
│   ├── (public)/
│   │   └── page.tsx
│   └── (dashboard)/
│       ├── layout.tsx
│       └── page.tsx
│
├── features/                   # use cases composing multiple domains
│   ├── trip-booking/
│   │   ├── components/
│   │   ├── hooks/
│   │   ├── services/
│   │   ├── validators/
│   │   └── types.ts
│   └── user-dashboard/
│       └── ...
│
├── modules/                    # isolated business domains
│   ├── auth/
│   ├── user/
│   ├── trip/
│   ├── booking/
│   └── payment/
│
├── shared/                     # no business logic
│   ├── components/
│   │   ├── ui/                 # Button, Input, Modal, ...
│   │   └── layout/             # Header, Sidebar, ...
│   ├── hooks/                  # useDebounce, useMediaQuery, ...
│   ├── lib/                    # api.ts, queryClient.ts, auth.ts, cookies.ts
│   ├── utils/
│   ├── constants/
│   └── config/
│
├── types/                      # global types only
│   ├── api.ts
│   ├── pagination.ts
│   └── index.ts
│
├── styles/
├── tests/
└── e2e/
```

Code is organized by feature/domain — never by global type-based folders such as a single
top-level `components/`, `services/`, or `hooks/` for the whole app.

---

## 2. `app/` — routing & page composition

`app/` owns routing, layouts, `loading.tsx`, `error.tsx`, metadata (`generateMetadata()`), and
composing features/modules into pages.

**Business logic never lives in `page.tsx`.** A page resolves route params, triggers server-side
hydration when needed, and renders a feature/module component.

```text
app/(dashboard)/trips/[id]/page.tsx
  → hydrateTripDetail(id)          (modules/trip)
  → <TripBookingScreen id={id} />  (features/trip-booking)
```

Route groups `(public)` / `(dashboard)` split layouts without adding URL segments.

---

## 3. `modules/` — business domains

A module is an isolated business domain: `auth`, `user`, `trip`, `booking`, `payment`.

Each module owns its own components, API calls, query configuration, hydration, hooks, validation
and types:

```text
modules/trip/
├── components/
├── services/
│   ├── trip.api.ts       # raw fetchers
│   └── trip.query.ts     # query keys + query/mutation options
├── hydrate/
│   └── trip.hydrate.ts   # server-side prefetch + dehydrate
├── hooks/
├── validators/
└── types.ts
```

Modules must stay isolated: **a module never imports another module.** If two domains need to work
together, that coordination belongs in a feature.

---

## 4. `features/` — product features / use cases

A feature is a user-facing workflow. Unlike a module, a feature **composes multiple modules**.

```text
features/trip-booking/
        ├── modules/trip      → get trip information
        ├── modules/booking   → create booking
        └── modules/payment   → process payment
        → coordinates the complete booking flow
```

`trip-booking` is not a new business domain — it is a workflow over existing ones.

### Rule: do not duplicate domains inside `features/`

❌ Wrong

```text
features/
├── trip/
├── booking/
└── payment/
```

✅ Correct

```text
modules/               features/
├── trip/              ├── trip-booking/
├── booking/           ├── checkout/
└── payment/           └── trip-search/
```

A feature also never imports another feature. Shared logic between two features belongs in a
module (business) or in `shared/` (generic).

---

## 5. TanStack Query structure

Each module separates raw API calls, query configuration, and server-side hydration.

### `*.api.ts` — raw fetchers only

```ts
export const getTripById = async (id: string) => {
  const response = await api.get(`/trips/${id}`);

  return response.data;
};
```

### `*.query.ts` — query keys, query options, mutation options

```ts
export const qkTrip = {
  root: ['qk_trip'] as const,

  detail: (id: string) => [...qkTrip.root, 'detail', { id }] as const,
};

export const tripDetailQueryOptions = (id: string) =>
  queryOptions({
    queryKey: qkTrip.detail(id),
    queryFn: () => getTripById(id),
  });
```

### `*.hydrate.ts` — server-side prefetch + dehydrate

```ts
export async function hydrateTripDetail(id: string) {
  const queryClient = getQueryClient();

  await queryClient.prefetchQuery(tripDetailQueryOptions(id));

  return dehydrate(queryClient);
}
```

The page then wraps its children in `<HydrationBoundary state={...}>`, so Client Components read
the data from the cache without a second request.

> TanStack Query is not installed yet in this boilerplate. When adding it, put the shared
> `QueryClient` factory in `shared/lib/queryClient.ts` and the provider in `app/providers.tsx`.

---

## 6. `shared/` — reusable code

`shared/` holds everything that no business domain owns: UI primitives (`Button`, `Input`,
`Modal`), layout (`Header`, `Sidebar`), generic hooks (`useDebounce`), the HTTP client, the
`QueryClient` factory, route constants, and generic utilities.

**`shared/` must not contain business-specific logic** and must not import from `app/`,
`features/` or `modules/`.

---

## 7. Types

Two levels:

```text
Global / cross-domain type   → src/types/
Domain-specific type         → modules/<domain>/types.ts
Feature-specific type        → features/<feature>/types.ts
```

```ts
// src/types/api.ts
export type ApiResponse<T> = {
  data: T;
  message?: string;
  error?: string;
};
```

Avoid one large `types.ts` / `interfaces.ts` for the entire application.

---

## 8. Import dependency rules

```text
app       → features, modules, shared
features  → modules, shared
modules   → shared
shared    → shared only
```

Forbidden:

```text
module A  → module B          (and the reverse)
feature A → feature B
shared    → module / feature
module    → feature
any layer → app
```

These rules are **enforced by ESLint** (`import/no-restricted-paths` in `eslint.config.mjs`), on
resolved file paths — so both `@/modules/x` and `../../modules/x` are caught. Zones for
module/feature isolation are generated from the folders that exist on disk, so a new module needs
no config change.

Cross-layer imports use the `@/*` alias; relative imports stay inside the same module/feature.

---

## 9. Server vs Client Components

```text
Page (Server Component)
 ├── Server Component
 ├── Server Component
 └── Client Component   ← only the interactive leaf
```

Add `'use client'` only for `useState` / `useEffect`, event handlers, browser APIs, or interactive
UI. Never make a whole page a Client Component because one small part needs interactivity — push
the directive down to the smallest component that needs it.

---

## 10. Adding something new — quick decision guide

| You are adding…                         | Where it goes                         |
| --------------------------------------- | ------------------------------------- |
| A new URL                               | `app/<segment>/page.tsx`              |
| A new business entity + its API/queries | `modules/<domain>/`                   |
| A multi-domain user flow                | `features/<feature>/`                 |
| A generic button/input/hook/util        | `shared/`                             |
| A type used by 2+ domains               | `src/types/`                          |
| Logic two modules need                  | A new module, or `shared/` if generic |
| Logic two features need                 | A module                              |
