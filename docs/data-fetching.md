# Data fetching: two paths

Most confusion about data in App Router comes from treating "fetching" as one problem. It is two,
and they have different answers.

```text
                              Backend
                                 ▲
                 ┌───────────────┴───────────────┐
                 │                               │
        Server-driven data                Client-managed state
                 │                               │
      Promise props + use()              TanStack Query
                 │                               │
   initial render, streaming        cache, refetch, mutate, filter
                 └───────────────┬───────────────┘
                                 ▼
                                 UI
```

**Do not route every call through TanStack Query just because it is installed.** A query client
exists to manage _client-side server state_ — cache, staleness, invalidation, retries. If a piece of
data is fetched once on the server and only read on the render that follows, all of that machinery is
overhead you pay for in bundle size and indirection.

| Requirement                                   | Path                                 |
| --------------------------------------------- | ------------------------------------ |
| Initial data for a route                      | Promise props + `use()`              |
| Streaming a slow section into a shell         | Promise props + `use()` + `Suspense` |
| Read-once data (user, workspace, permissions) | Promise props + `use()`              |
| Data a Server Component renders itself        | Plain `await` — no props needed      |
| Client refetch / background refresh           | TanStack Query                       |
| Cache shared between distant components       | TanStack Query                       |
| Invalidation after a mutation                 | TanStack Query                       |
| Pagination, filtering, search                 | TanStack Query (+ nuqs for the URL)  |
| Optimistic updates                            | TanStack Query                       |
| Server-prefetched **and** client-managed      | TanStack Query + `HydrationBoundary` |

The last row is the only case that needs both. Everything above it needs exactly one.

### One owner per piece of data

The failure mode of "use both" is two sources of truth for the same field: a promise prop that never
updates, and a query that does. Pick the owner when you create the data, and if you later need cache
semantics, migrate the whole thing — the change is local (`use(promise)` → `useSuspenseQuery`), which
is precisely why starting with the simpler path is safe.

---

## 1. Path A — Promise props + `use()`

### Start the requests, don't await them

```tsx
// app/(dashboard)/page.tsx  — Server Component
export default function DashboardPage() {
  // No await: three requests leave in the same tick.
  const userPromise = getCurrentUser();
  const workspacePromise = getWorkspace();
  const permissionsPromise = getPermissions();

  return (
    <Suspense fallback={<DashboardSkeleton />}>
      <DashboardScreen
        userPromise={userPromise}
        workspacePromise={workspacePromise}
        permissionsPromise={permissionsPromise}
      />
    </Suspense>
  );
}
```

```tsx
// features/user-dashboard/components/DashboardScreen.tsx
'use client';

import { use } from 'react';

export function DashboardScreen({ userPromise, workspacePromise, permissionsPromise }: Props) {
  const user = use(userPromise);
  const workspace = use(workspacePromise);
  const permissions = use(permissionsPromise);
  // ...
}
```

The page shell renders immediately and the data streams in. Compare with the naive version:

```ts
const user = await getCurrentUser(); //  ─┐
const workspace = await getWorkspace(); // ├─ a waterfall: 3 round trips end to end
const permissions = await getPermissions(); // ─┘
```

`await` in sequence is the single most common performance bug in App Router pages. If the calls are
independent, either pass promises down or `Promise.all` them.

### Independent vs dependent

Parallelism is only available when the requests don't need each other:

```ts
// Independent → parallel
const userPromise = getCurrentUser();
const tripsPromise = getTrips();

// Dependent → the await is real, don't pretend otherwise
const user = await getCurrentUser();
const workspacePromise = getWorkspace(user.workspaceId);
```

When a dependency exists, await the minimum needed to unblock the rest, then go parallel again. If
you find yourself awaiting three levels deep, the backend probably owes you a composite endpoint.

### Where to put `use()`

`use()` forces a Client Component, and a Client Component drags everything it imports into the
bundle. Don't promote a whole screen to `'use client'` for one value:

```text
DashboardScreen        Server   — layout, static sections, passes promises down
├── DashboardHeader    Server
├── DashboardStats     Server   — can just `await` its own data
└── PermissionsPanel   Client   — use(permissionsPromise), because it's interactive
```

Push `use()` to the smallest component that needs the value, and give each streamed section its own
`<Suspense>` boundary — a boundary is what decides how much of the page waits.

### Three things that will bite you

- **A rejected promise nobody reads is an unhandled rejection.** Every promise you pass down must be
  consumed by a `use()` inside a subtree covered by an error boundary (`error.tsx` counts).
- **Errors are redacted in production.** A rejection crossing the server/client boundary reaches the
  browser as an opaque digest, not your `ApiError` with `details`. Server-driven data is fine for
  "something went wrong"; **form flows that need field-level validation errors belong on the client
  path** (TanStack Query), where the error object is real.
- **axios is not deduplicated.** Next dedupes `fetch` inside a render pass; axios has no such magic.
  If two components can create the same request, wrap the fetcher in React's `cache()`:

  ```ts
  export const getCurrentUser = cache(async () => {
    /* ... */
  });
  ```

### Refreshing this data

There is no `invalidate`. The refresh story for server-driven data is `router.refresh()` (or
`revalidatePath` after a Server Action), which re-runs the Server Component and streams new promises
down. If that is not good enough for a screen, that screen wanted TanStack Query.

---

## 2. Calling the API from the server

`*.api.ts` fetchers take an optional client so the same function works on both sides:

```ts
import { type AxiosInstance } from 'axios';

import { api } from '@/shared/lib/api';

export const getTripById = async (id: string, client: AxiosInstance = api): Promise<Trip> => {
  const { data } = await client.get<ApiResponse<Trip>>(`/trips/${id}`);

  return data.data;
};
```

Server callers pass the server client:

```ts
import { cache } from 'react';

import { getServerApi } from '@/shared/lib/api.server';

export const getTrip = cache(async (id: string) => getTripById(id, await getServerApi()));
```

`getServerApi()` (in `shared/lib/api.server.ts`) exists because the browser client is wrong on the
server in two ways:

- **Cookies.** `withCredentials` does nothing during SSR — there is no cookie jar. The server client
  forwards the incoming request's cookies via `next/headers`. Skipping this is the classic "works in
  the browser, 401 during SSR" bug.
- **Base URL.** A relative `/api` has no origin to resolve against on the server, so the server
  client uses `env.serverApiBaseUrl` (`API_BASE_URL`), which must be absolute.

The file imports `server-only`, so an accidental import from a Client Component fails the build
instead of leaking `next/headers` into the bundle.

### The browser goes through a proxy; the server does not

```text
browser  ──►  /api/*  ──►  app/api/[...path]/route.ts  ──►  backend
server   ─────────────────────────────────────────────────►  backend
```

`NEXT_PUBLIC_API_BASE_URL=/api` points the browser at a catch-all route handler that forwards to
`API_BASE_URL`. Three things fall out of that: the backend origin never reaches the browser, cookies
stay first-party (no `SameSite=None`, no token in `localStorage`), and there is no CORS to configure.

The proxy is intentionally boring — `fetch`, not the axios client, because it must not inherit
interceptors that reshape errors. It strips hop-by-hop headers, refuses `..` segments, and refuses a
target whose origin equals the app's own (a self-referential `API_BASE_URL` would otherwise loop
until the process runs out of sockets). Request bodies are buffered rather than streamed; if you
upload large files, switch it to `request.body` with `duplex: 'half'`.

Server-side calls skip the hop entirely: going through your own proxy would burn a request slot on
the same process that is trying to render. Set `API_BASE_URL` to the backend, not to this app.

`/api/health` is a static segment, so it wins over the catch-all and never reaches the backend.

---

## 3. Path B — TanStack Query, three files per module

Each domain splits its data layer the same way. Each file has a different reason to change:

```text
modules/trip/
├── services/
│   ├── trip.api.ts     # what the endpoint is        (changes when the backend changes)
│   └── trip.query.ts   # how it's cached             (changes when UX/caching changes)
└── hydrate/
    └── trip.hydrate.ts # what the server prefetches  (changes when a route changes)
```

### `trip.api.ts` — transport only

No React, no query keys. Plain async functions callable from a test, a script, a route handler, or a
Server Component.

```ts
export const searchTrips = async (
  filters: TripFilters,
  { client = api, signal }: { client?: AxiosInstance; signal?: AbortSignal } = {},
): Promise<Trip[]> => {
  const { data } = await client.get<ApiResponse<Trip[]>>('/trips', { params: filters, signal });

  return data.data;
};
```

Unwrap the `ApiResponse` envelope here. Nothing above this layer should know the backend wraps its
payloads — that detail leaks into 200 components if you let it.

Pass `signal` through on anything user-typed: TanStack Query supplies it, and axios cancels the
in-flight request when the key changes.

### `trip.query.ts` — cache configuration

```ts
import { queryOptions } from '@tanstack/react-query';

export const qkTrip = {
  root: ['qk_trip'] as const,
  list: (filters: TripFilters) => [...qkTrip.root, 'list', filters] as const,
  detail: (id: string) => [...qkTrip.root, 'detail', { id }] as const,
};

export const tripDetailQueryOptions = (id: string) =>
  queryOptions({
    queryKey: qkTrip.detail(id),
    queryFn: () => getTripById(id),
  });

export const tripListQueryOptions = (filters: TripFilters) =>
  queryOptions({
    queryKey: qkTrip.list(filters),
    queryFn: ({ signal }) => searchTrips(filters, { signal }),
    placeholderData: (previous) => previous, // keep the old page visible while paging
  });
```

Export `queryOptions()` objects, not just hooks: the same object is used by the client hook, the
server prefetch, and `queryClient.ensureQueryData` in an event handler. One definition, no drift.

**Query keys are a hierarchy, and the hierarchy is your invalidation API:**

```ts
queryClient.invalidateQueries({ queryKey: qkTrip.root }); // everything trip-related
queryClient.invalidateQueries({ queryKey: qkTrip.detail(id) }); // one trip
```

Domain prefix first, every variable that changes the response in the key, objects serialized
structurally (so `{ id }` is stable regardless of property order). Never build a key inline in a
component.

### Mutations live next to their queries

```ts
export const useCreateBooking = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: createBooking,
    onSuccess: (booking) => {
      queryClient.invalidateQueries({ queryKey: qkBooking.root });
      queryClient.setQueryData(qkBooking.detail(booking.id), booking);
    },
  });
};
```

Invalidate broadly, `setQueryData` narrowly. Optimistic updates earn their complexity for toggles and
reordering; for anything with server-side validation, prefer invalidation plus a pending state — a
rollback racing a refetch is a 2am bug.

---

## 4. Server prefetch and hydration

Use this when data is **fetched on the server and then managed on the client** — the client needs to
refetch it, invalidate it after a mutation, or share it with another component. If it does not, you
want Path A instead; `prefetchQuery` + `dehydrate` + `HydrationBoundary` is three moving parts to
achieve what one promise prop already does.

```ts
// modules/trip/hydrate/trip.hydrate.ts
export const hydrateTripDetail = async (id: string) => {
  const queryClient = getQueryClient();

  await queryClient.prefetchQuery(tripDetailQueryOptions(id));

  return dehydrate(queryClient);
};
```

```tsx
// app/(dashboard)/trips/[id]/page.tsx
export default async function TripDetailPage({ params }: PageProps<'/trips/[id]'>) {
  const { id } = await params;

  return (
    <HydrationBoundary state={await hydrateTripDetail(id)}>
      <TripBookingScreen tripId={id} />
    </HydrationBoundary>
  );
}
```

The client then subscribes with the same options object and renders with data on the first pass:

```tsx
const { data: trip } = useSuspenseQuery(tripDetailQueryOptions(tripId));
```

What goes wrong here:

- **`staleTime: 0`** — the client refetches everything immediately after hydration and you paid for
  the data twice. Our default is 60s; override per query, not globally.
- **Sequential prefetches** — same waterfall as section 1. `await Promise.all([...])`, or don't await
  at all: our `dehydrate` defaults ship pending queries, so a streamed page resumes what the server
  started.
- **A `QueryClient` shared across requests** — user A's cache served to user B. `getQueryClient()`
  returns a fresh client on the server for exactly this reason; never hoist one to a module constant.
- **Prefetching everything** — prefetch what first paint needs. A slower TTFB is worse than a spinner
  in a sidebar.

---

## 5. Errors

Everything thrown out of `shared/lib/api.ts` is an `ApiError` with `status`, `code`, `details`, and
`isClientError`. That single contract is why the retry policy can be written once:

```ts
// shared/lib/query-client.ts — exported so the policy is unit-testable
export const shouldRetryQuery = (failureCount: number, error: unknown): boolean => {
  if (error instanceof ApiError && error.isClientError) return false;

  return failureCount < MAX_RETRIES;
};
```

Retrying a 422 five times is a slower error message. Retry network and 5xx; surface 4xx immediately.
Use `details` for field-level form errors — and remember from section 1 that those survive only on
the client path.

### Forms: zod validates the shape, the server validates the truth

A client schema catches "this isn't an email". Only the backend knows "this email is already taken".
Both need to land on the same input:

```tsx
const form = useForm<SignUpValues>({ resolver: zodResolver(signUpSchema) });

const { mutate } = useMutation({
  mutationFn: signUp,
  onError: (error) => {
    // Returns false when the failure wasn't field-level — then it's your toast.
    if (!applyApiErrorToForm(error, form.setError)) toast.error('Something went wrong');
  },
});
```

`applyApiErrorToForm` (in `shared/lib/form.ts`) turns `ApiError.details` into react-hook-form errors
and focuses the first offending field, the way a native submit would. Without it, server validation
degrades into a generic toast that never tells the user which input to fix — which is the whole
reason `details` exists on `ApiError`.

Schemas live with their domain: `modules/<domain>/validators/` for domain rules,
`features/<feature>/validators/` for a form that only exists on one screen. Derive the TypeScript
type from the schema (`z.infer`) rather than declaring it twice.

---

## 6. URL state with nuqs

Filters, pagination, sort, active tab, open dialog id — these belong in the URL. It costs nothing and
you get shareable links, working back/forward, and state that survives a refresh. `useState` for a
filter is a bug you haven't hit yet.

Define parsers once, use them on both sides:

```ts
// features/trip-search/search-params.ts
import { createLoader, parseAsString } from 'nuqs/server';

import { listSearchParams } from '@/shared/lib/search-params';

export const tripSearchParams = {
  ...listSearchParams, // page, limit, q, sort, order
  destination: parseAsString.withDefault(''),
};

export const loadTripSearchParams = createLoader(tripSearchParams);
```

```tsx
// server: parse, then prefetch exactly what the client will ask for
export default async function TripsPage({ searchParams }: PageProps<'/trips'>) {
  const filters = await loadTripSearchParams(searchParams);

  return (
    <HydrationBoundary state={await hydrateTripList(filters)}>
      <TripSearchScreen />
    </HydrationBoundary>
  );
}
```

```tsx
// client: read and write the same keys
const [filters, setFilters] = useQueryStates(tripSearchParams, { shallow: false });
const { data } = useSuspenseQuery(tripListQueryOptions(filters));
```

- **The parsed search params are the query key.** URL → filters → key → cache. Never keep a second
  copy in `useState`.
- **`shallow: false`** re-runs the Server Component — required when the server prefetches from the
  URL. Leave it default (`true`) for pure client-side filtering; it is much faster.
- **Reset `page` on every filter change**, or the user lands on page 7 of a 2-page result.
- Throttle text inputs with `limitUrlUpdates` rather than debouncing the query — the URL is what
  everything else derives from.
- `NuqsAdapter` is already mounted in `app/providers.tsx`.

Note that filtering and pagination are the clearest signal that a screen belongs on the client path:
the moment the URL drives repeated refetches of the same shape, you want a cache.

---

## 7. Defaults you are inheriting

`shared/lib/query-client.ts`:

| Setting                | Value           | Why                                                      |
| ---------------------- | --------------- | -------------------------------------------------------- |
| `staleTime`            | 60s             | Stops the post-hydration double fetch                    |
| `gcTime`               | 5min            | Back-navigation renders from cache                       |
| `refetchOnWindowFocus` | `false`         | Alt-tabbing is not a user intent to refetch              |
| `retry`                | 2, never on 4xx | Client errors don't improve with repetition              |
| `mutations.retry`      | `false`         | Retrying a non-idempotent write is how you double-charge |
| `shouldDehydrateQuery` | + pending       | Streamed pages resume server-started requests            |

Override per query where the domain calls for it (a live dashboard wants `staleTime: 0` and a
`refetchInterval`); don't loosen the global defaults to fix one screen.

Devtools are mounted in development via `app/providers.tsx` and compile out of production builds.
